import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Flame, Store, Wallet, Coins, Award, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { getWalletBalance } from "@/lib/spiceWallet";
import {
  getMyListings, getMySalesLedger, calcEarnings,
  getMyCashoutRequests, requestCashout, estimateCashout,
} from "@/lib/tavernCreator";
import {
  MIN_CASHOUT, CREATOR_SPLITS, formatSpice,
} from "@/config/spiceConfig";
import { CATEGORY_LABEL } from "@/config/tavernCategories";
import { createPageUrl } from "@/utils";

/**
 * Creator Dashboard.
 *
 * One scroll combining:
 *   - Earnings summary (total, this month, wallet, available for cashout)
 *   - My listings table (edit links, revenue each)
 *   - Sales ledger (every sale / fee / cashout / refund)
 *   - Cashout form with Stripe-fee breakdown
 *
 * Everything reads from tables seeded by Part 2's purchase flow and
 * Part 1's ledger so no extra bookkeeping is needed.
 */
export default function CreatorDashboard() {
  const { user } = useAuth();
  const sub = useSubscription();
  const queryClient = useQueryClient();

  const { data: wallet } = useQuery({
    queryKey: ["spiceWallet", user?.id],
    queryFn: () => getWalletBalance(user.id),
    enabled: !!user?.id,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["creatorListings", user?.id],
    queryFn: () => getMyListings(user.id),
    enabled: !!user?.id,
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["creatorLedger", user?.id],
    queryFn: () => getMySalesLedger(user.id, { limit: 100 }),
    enabled: !!user?.id,
  });

  const { data: earnings = { total: 0, thisMonth: 0 } } = useQuery({
    queryKey: ["creatorEarnings", user?.id],
    queryFn: () => calcEarnings(user.id),
    enabled: !!user?.id,
  });

  const { data: cashouts = [] } = useQuery({
    queryKey: ["creatorCashouts", user?.id],
    queryFn: () => getMyCashoutRequests(user.id),
    enabled: !!user?.id,
  });

  const perItemRevenue = useMemo(() => {
    // Aggregate `sale_earning` rows by reference_id (which is the
    // tavern_items.id the sale was for).
    const map = new Map();
    for (const row of ledger) {
      if (row.transaction_type !== "sale_earning") continue;
      if (!row.reference_id) continue;
      map.set(row.reference_id, (map.get(row.reference_id) || 0) + (row.amount || 0));
    }
    return map;
  }, [ledger]);

  const split = CREATOR_SPLITS[sub.tier] || CREATOR_SPLITS.free;
  const balance = wallet?.balance || 0;
  const availableCashout = Math.max(0, balance);
  const eligible = availableCashout >= MIN_CASHOUT;

  const [cashoutInput, setCashoutInput] = useState(MIN_CASHOUT);
  const cashoutAmount = Math.max(0, Math.min(availableCashout, Number(cashoutInput) || 0));
  const estimate = estimateCashout(cashoutAmount);

  const cashoutMut = useMutation({
    mutationFn: async () => {
      const r = await requestCashout(user.id, cashoutAmount);
      if (!r.success) throw new Error(r.reason || "Cashout failed");
      return r;
    },
    onSuccess: () => {
      toast.success("Cashout requested — we'll review it shortly.");
      queryClient.invalidateQueries({ queryKey: ["spiceWallet", user.id] });
      queryClient.invalidateQueries({ queryKey: ["creatorCashouts", user.id] });
    },
    onError: (err) => toast.error(err?.message || "Cashout failed"),
  });

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-amber-200 flex items-center gap-3">
              <Award className="w-7 h-7 text-amber-400" />
              Creator Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Earnings, listings, sales history, and cashout.
            </p>
          </div>
          <Link to={createPageUrl("TheTavern")}>
            <Button variant="outline" className="border-amber-500/40 text-amber-200">
              <Store className="w-4 h-4 mr-1" /> Back to the Tavern
            </Button>
          </Link>
        </div>

        {/* Earnings summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Earned" icon={TrendingUp} value={formatSpice(earnings.total)} hint={`~$${(earnings.total / 250).toFixed(2)} USD lifetime`} />
          <StatCard label="This Month"   icon={Coins}       value={formatSpice(earnings.thisMonth)} hint={`~$${(earnings.thisMonth / 250).toFixed(2)} USD`} />
          <StatCard label="Wallet"       icon={Wallet}      value={formatSpice(balance)} hint={`~$${(balance / 250).toFixed(2)} USD`} />
          <StatCard
            label="Cashout"
            icon={Flame}
            value={eligible ? formatSpice(availableCashout) : `${formatSpice(MIN_CASHOUT - availableCashout)} to go`}
            hint={eligible ? "Available now" : `Need ${formatSpice(MIN_CASHOUT)} minimum`}
            warn={!eligible}
          />
        </div>

        <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-4">
          <p className="text-xs text-slate-400">
            Your tier: <span className="text-white font-bold">{(sub.tier || "free").toUpperCase()}</span> — you keep{" "}
            <span className="text-emerald-300 font-bold">{split[1]}%</span> of each sale. Guildstew keeps {split[0]}%.
          </p>
        </div>

        {/* My listings */}
        <section>
          <h2 className="text-lg font-black text-white mb-3">My Listings ({listings.length})</h2>
          {listings.length === 0 ? (
            <p className="text-sm text-slate-500 italic">You haven't listed anything yet. Head to the Tavern and pick “Sell on Tavern”.</p>
          ) : (
            <div className="bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0b1220] text-slate-400 text-[11px] uppercase tracking-widest">
                  <tr>
                    <th className="text-left px-3 py-2">Item</th>
                    <th className="text-left px-3 py-2">Category</th>
                    <th className="text-left px-3 py-2">Price</th>
                    <th className="text-left px-3 py-2">Sold</th>
                    <th className="text-left px-3 py-2">Revenue</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((i) => (
                    <tr key={i.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {i.preview_image_url
                            ? <img src={i.preview_image_url} alt="" className="w-10 h-10 rounded object-cover" />
                            : <div className="w-10 h-10 rounded bg-[#050816] border border-slate-700" />}
                          <p className="text-white font-bold">{i.name}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-400">{CATEGORY_LABEL[i.category] || i.category}</td>
                      <td className="px-3 py-2 text-amber-200">
                        <span className="inline-flex items-center gap-1"><Flame className="w-3 h-3 text-amber-400" />{formatSpice(i.price)}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-300">{i.purchase_count || 0}</td>
                      <td className="px-3 py-2 text-emerald-300">
                        {formatSpice(perItemRevenue.get(i.id) || 0)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-bold uppercase rounded px-2 py-0.5 ${
                          i.status === "active" ? "bg-emerald-900/40 text-emerald-300" :
                          i.status === "pending" ? "bg-amber-900/40 text-amber-300" :
                          i.status === "removed" ? "bg-red-900/40 text-red-300" :
                          "bg-slate-800 text-slate-400"
                        }`}>
                          {i.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Sales history */}
        <section>
          <h2 className="text-lg font-black text-white mb-3">Sales & Earnings History</h2>
          {ledger.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No sales yet.</p>
          ) : (
            <div className="bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden">
              <ul className="divide-y divide-slate-800">
                {ledger.slice(0, 50).map((t) => {
                  const positive = t.amount > 0;
                  return (
                    <li key={t.id} className="px-3 py-2 text-sm flex items-center justify-between">
                      <div>
                        <p className="text-slate-300">{t.description || t.transaction_type}</p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(t.created_at).toLocaleString()} · {t.transaction_type}
                        </p>
                      </div>
                      <span className={`font-bold font-mono ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                        {positive ? "+" : ""}{formatSpice(t.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* Cashout */}
        <section>
          <h2 className="text-lg font-black text-white mb-3">Request Cashout</h2>
          <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-4 space-y-3">
            {!eligible && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5" />
                <p className="text-[11px] text-amber-100">
                  You need at least {formatSpice(MIN_CASHOUT)} Spice ($50) to request a cashout.
                  Current wallet: {formatSpice(balance)} Spice.
                </p>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-300 mb-1 block">Cashout Amount (Spice)</label>
              <Input
                type="number"
                min={MIN_CASHOUT}
                step="50"
                max={availableCashout}
                value={cashoutInput}
                onChange={(e) => setCashoutInput(e.target.value)}
                disabled={!eligible}
                className="bg-[#050816] border-slate-700 text-white"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Minimum {formatSpice(MIN_CASHOUT)} · Maximum {formatSpice(availableCashout)}
              </p>
            </div>

            <div className="bg-[#050816] border border-slate-800 rounded p-3 text-sm">
              <Row label="Cashout" value={`${formatSpice(cashoutAmount)} Spice`} />
              <Row label="Gross payout" value={`$${estimate.gross.toFixed(2)}`} />
              <Row label="Processing fee (~2.9% + $0.30)" value={`-$${estimate.fee.toFixed(2)}`} muted />
              <div className="border-t border-slate-700/60 mt-2 pt-2">
                <Row label="Net payout" value={`$${estimate.net.toFixed(2)}`} bold />
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                The Stripe processing fee is deducted from your payout — industry standard for creator marketplaces.
              </p>
            </div>

            <Button
              onClick={() => cashoutMut.mutate()}
              disabled={!eligible || cashoutAmount < MIN_CASHOUT || cashoutMut.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold disabled:opacity-50"
            >
              {cashoutMut.isPending ? "Submitting…" : "Request Payout"}
            </Button>
          </div>

          {cashouts.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">
                Recent Cashouts
              </h3>
              <ul className="divide-y divide-slate-800 bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden">
                {cashouts.map((c) => (
                  <li key={c.id} className="px-3 py-2 text-sm flex items-center justify-between">
                    <div>
                      <p className="text-slate-300">
                        {formatSpice(c.spice_amount)} Spice → ${Number(c.usd_amount).toFixed(2)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase rounded px-2 py-0.5 ${
                      c.status === "pending"    ? "bg-amber-900/40 text-amber-300" :
                      c.status === "processing" ? "bg-blue-900/40 text-blue-300" :
                      c.status === "completed"  ? "bg-emerald-900/40 text-emerald-300" :
                      c.status === "rejected"   ? "bg-red-900/40 text-red-300" :
                      "bg-slate-800 text-slate-400"
                    }`}>
                      {c.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, icon: Icon, value, hint, warn }) {
  return (
    <div className={`bg-[#1E2430] border rounded-lg p-4 ${warn ? "border-amber-500/40" : "border-slate-700"}`}>
      <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </p>
      <p className={`text-2xl font-black mt-1 ${warn ? "text-amber-200" : "text-amber-200"}`}>
        {value}
      </p>
      <p className="text-[10px] text-slate-500 mt-1">{hint}</p>
    </div>
  );
}

function Row({ label, value, muted, bold }) {
  return (
    <div className={`flex items-center justify-between py-0.5 ${muted ? "text-slate-500" : "text-slate-300"} ${bold ? "font-bold text-white" : ""}`}>
      <span className="text-[12px]">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
