import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban, Package } from "lucide-react";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { supabase } from "@/api/supabaseClient";
import { getGuildWalletBalance } from "@/lib/spiceWallet";
import { formatSpice } from "@/config/spiceConfig";

/**
 * Shared-Spice treasury strip for the Guild Hall.
 *
 * Pulls the wallet row (balance + lifetime + spending_restricted flag),
 * the most recent ledger entries, and the guild-funded Tavern buys.
 * Leader-only write operations (spending toggle) live in the settings
 * dialog — this panel is read-only for everyone.
 */
export default function GuildTreasury({ guildOwnerId }) {
  const { data: wallet } = useQuery({
    queryKey: ["guildSpiceWallet", guildOwnerId],
    queryFn: () => getGuildWalletBalance(guildOwnerId),
    enabled: !!guildOwnerId,
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["guildLedger", guildOwnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("spice_transactions")
        .select("id, amount, balance_after, transaction_type, description, created_at")
        .eq("guild_id", guildOwnerId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!guildOwnerId,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["guildPurchases", guildOwnerId],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("tavern_purchases")
        .select("item_id, purchased_at, price_paid")
        .eq("guild_id", guildOwnerId)
        .order("purchased_at", { ascending: false })
        .limit(12);
      if (!rows?.length) return [];
      const ids = rows.map((r) => r.item_id);
      const { data: items } = await supabase
        .from("tavern_items")
        .select("id, name, preview_image_url, category")
        .in("id", ids);
      return rows.map((r) => ({
        ...r,
        item: (items || []).find((i) => i.id === r.item_id),
      }));
    },
    enabled: !!guildOwnerId,
  });

  return (
    <section>
      <h2
        className="text-xl font-black text-amber-200 mb-4 flex items-center gap-2"
        style={{ fontFamily: "'Cinzel', 'Cream', Georgia, serif" }}
      >
        <SpiceIcon size={20} color="#fbbf24" /> Guild Treasury
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-[320px,1fr] gap-4">
        {/* Balance + restriction notice */}
        <div
          className="rounded-lg p-5"
          style={{
            backgroundColor: "#0b1324",
            border: "1px solid rgba(245,158,11,0.45)",
            boxShadow: "0 0 16px rgba(245,158,11,0.12)",
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300 font-black flex items-center gap-1.5">
            <SpiceIcon size={12} color="currentColor" /> Shared Balance
          </p>
          <p className="text-4xl font-black text-amber-200 mt-1 flex items-center gap-2">
            <SpiceIcon size={28} color="#fbbf24" />
            {formatSpice(wallet?.balance || 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Lifetime: {formatSpice(wallet?.lifetime_total || 0)} Spice
          </p>
          {wallet?.spending_restricted ? (
            <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded p-2 text-[11px] text-amber-100 flex items-start gap-2">
              <Ban className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Guild spending is <strong>restricted</strong> — only the Guild Leader can spend from the shared wallet.
              </span>
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-emerald-300/80">
              All members can spend from the guild wallet.
            </p>
          )}
        </div>

        {/* Recent transactions */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">
            Recent Transactions
          </p>
          {ledger.length === 0 ? (
            <p className="text-sm text-slate-500 italic bg-[#0b1324] border border-slate-800 rounded p-3">
              No transactions yet. Guild stipend arrives automatically each month.
            </p>
          ) : (
            <ul className="bg-[#0b1324] border border-slate-800 rounded-lg divide-y divide-slate-800">
              {ledger.map((t) => (
                <li key={t.id} className="px-3 py-2 text-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-200 truncate">{t.description || t.transaction_type}</p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(t.created_at).toLocaleString()} · {t.transaction_type}
                    </p>
                  </div>
                  <span
                    className={`font-black font-mono text-sm flex-shrink-0 ${
                      t.amount > 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {t.amount > 0 ? "+" : ""}
                    {formatSpice(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Guild-funded Tavern purchases */}
      <div className="mt-5">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">
          Guild Purchases
        </p>
        {purchases.length === 0 ? (
          <p className="text-sm text-slate-500 italic bg-[#0b1324] border border-slate-800 rounded p-3">
            Nothing bought with guild Spice yet. Select "Guild Wallet" in the Tavern to unlock a cosmetic for everyone.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {purchases.map((p) => (
              <div key={`${p.item_id}-${p.purchased_at}`} className="bg-[#0b1324] border border-slate-800 rounded-lg p-3">
                {p.item?.preview_image_url ? (
                  <img
                    src={p.item.preview_image_url}
                    alt=""
                    className="w-full h-20 rounded object-cover border border-slate-800"
                  />
                ) : (
                  <div className="w-full h-20 rounded bg-[#050816] border border-slate-800 flex items-center justify-center">
                    <Package className="w-6 h-6 text-slate-700" />
                  </div>
                )}
                <p className="text-xs font-black text-white line-clamp-1 mt-2">
                  {p.item?.name || "Unknown item"}
                </p>
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  {p.item?.category} · <SpiceIcon size={10} color="#fbbf24" /> {formatSpice(p.price_paid)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
