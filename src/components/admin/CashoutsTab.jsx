import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listPendingCashouts, listAllCashouts, markCashoutStatus, rejectCashout,
  estimateCashout,
} from "@/lib/tavernCreator";
import { formatSpice } from "@/config/spiceConfig";
import { Flame, Check, X, Clock } from "lucide-react";
import { supabase } from "@/api/supabaseClient";

/**
 * Admin → Cashouts.
 *
 * Pending / processing requests at the top, then a full history feed.
 * Approve → stamps status 'completed' (actual payout is handled off-
 * platform). Reject → marks 'rejected' and refunds the Spice.
 */
export default function CashoutsTab() {
  const queryClient = useQueryClient();
  const [notesById, setNotesById] = useState({});

  const { data: pending = [] } = useQuery({
    queryKey: ["adminCashoutsPending"],
    queryFn: listPendingCashouts,
  });

  const { data: all = [] } = useQuery({
    queryKey: ["adminCashoutsAll"],
    queryFn: () => listAllCashouts({ limit: 200 }),
  });

  const userIds = useMemo(
    () => Array.from(new Set([...pending, ...all].map((r) => r.user_id))),
    [pending, all],
  );
  const { data: users = [] } = useQuery({
    queryKey: ["adminCashoutUsers", userIds.sort().join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username, full_name")
        .in("user_id", userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
  });
  const userLabel = (id) => {
    const p = users.find((u) => u.user_id === id);
    return p?.username || p?.full_name || id.slice(0, 8);
  };

  const approve = useMutation({
    mutationFn: async (request) => markCashoutStatus(request.id, "completed", { notes: notesById[request.id] || null }),
    onSuccess: () => {
      toast.success("Cashout approved");
      queryClient.invalidateQueries({ queryKey: ["adminCashoutsPending"] });
      queryClient.invalidateQueries({ queryKey: ["adminCashoutsAll"] });
    },
  });

  const markProcessing = useMutation({
    mutationFn: async (request) => markCashoutStatus(request.id, "processing", { notes: notesById[request.id] || null }),
    onSuccess: () => {
      toast.success("Marked processing");
      queryClient.invalidateQueries({ queryKey: ["adminCashoutsPending"] });
      queryClient.invalidateQueries({ queryKey: ["adminCashoutsAll"] });
    },
  });

  const reject = useMutation({
    mutationFn: async (request) => rejectCashout(request, { notes: notesById[request.id] || "" }),
    onSuccess: () => {
      toast.success("Cashout rejected — Spice refunded");
      queryClient.invalidateQueries({ queryKey: ["adminCashoutsPending"] });
      queryClient.invalidateQueries({ queryKey: ["adminCashoutsAll"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Cashouts</h2>
        <p className="text-xs text-slate-500">
          Pending {pending.length} · {all.length} total requests. Approving here does not trigger
          a Stripe payout — that happens in the external payout tool.
        </p>
      </div>

      <section>
        <h3 className="text-sm font-black uppercase tracking-widest text-amber-300 mb-2">
          Pending
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No pending cashouts.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => {
              const est = estimateCashout(r.spice_amount);
              return (
                <div key={r.id} className="bg-[#1E2430] border border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-white font-bold">
                        {userLabel(r.user_id)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Requested {new Date(r.created_at).toLocaleString()}
                      </p>
                      <p className="mt-2 text-sm text-slate-300 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-amber-200 font-bold">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          {formatSpice(r.spice_amount)} Spice
                        </span>
                        <span className="text-slate-500">·</span>
                        <span>Gross ${Number(r.usd_amount).toFixed(2)}</span>
                        <span className="text-slate-500">·</span>
                        <span>Fee ~${est.fee.toFixed(2)}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-emerald-300 font-bold">Net ~${est.net.toFixed(2)}</span>
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest rounded px-2 py-0.5 bg-amber-900/40 text-amber-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {r.status}
                    </span>
                  </div>

                  <div className="mt-3">
                    <Input
                      value={notesById[r.id] || ""}
                      onChange={(e) => setNotesById((n) => ({ ...n, [r.id]: e.target.value }))}
                      placeholder="Admin notes (optional)"
                      className="bg-[#050816] border-slate-700 text-white text-xs"
                    />
                  </div>

                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => markProcessing.mutate(r)}
                      variant="outline"
                      className="border-blue-500/50 text-blue-300"
                    >
                      Mark Processing
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approve.mutate(r)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold"
                    >
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (confirm(`Reject + refund ${formatSpice(r.spice_amount)} Spice?`)) {
                          reject.mutate(r);
                        }
                      }}
                      variant="outline"
                      className="border-red-500/50 text-red-400"
                    >
                      <X className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">
          History
        </h3>
        <div className="bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0b1220] text-slate-400 text-[11px] uppercase tracking-widest">
              <tr>
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Spice</th>
                <th className="text-left px-3 py-2">USD</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Requested</th>
                <th className="text-left px-3 py-2">Processed</th>
              </tr>
            </thead>
            <tbody>
              {all.map((r) => (
                <tr key={r.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-white">{userLabel(r.user_id)}</td>
                  <td className="px-3 py-2 text-amber-200">{formatSpice(r.spice_amount)}</td>
                  <td className="px-3 py-2 text-slate-300">${Number(r.usd_amount).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] font-bold uppercase rounded px-2 py-0.5 ${
                      r.status === "pending"    ? "bg-amber-900/40 text-amber-300" :
                      r.status === "processing" ? "bg-blue-900/40 text-blue-300" :
                      r.status === "completed"  ? "bg-emerald-900/40 text-emerald-300" :
                      r.status === "rejected"   ? "bg-red-900/40 text-red-300" :
                      "bg-slate-800 text-slate-400"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">
                    {r.processed_at ? new Date(r.processed_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {all.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500 py-10">
                    No cashout history yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
