import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { SPICE_BUNDLES, formatSpice } from "@/config/spiceConfig";
import { getWalletBalance, addSpice } from "@/lib/spiceWallet";
import { useAuth } from "@/lib/AuthContext";

/**
 * Tavern → Buy Spice.
 *
 * Bundle picker + Stripe Checkout handoff. The real Stripe call lands
 * in the billing Edge Function (same pattern the subscription flow
 * uses); until that endpoint exists this dialog simulates the
 * purchase by crediting the wallet directly when the user hits
 * Purchase. The credit path is still the real one — `addSpice()`
 * writes to the ledger — so everything downstream of the purchase
 * works now and only the Stripe hop needs swapping in later.
 */
export default function BuySpiceDialog({ open, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(SPICE_BUNDLES[2].id);

  const { data: wallet } = useQuery({
    queryKey: ["spiceWallet", user?.id],
    queryFn: () => getWalletBalance(user.id),
    enabled: !!user?.id && open,
  });

  const selected = SPICE_BUNDLES.find((b) => b.id === selectedId) || SPICE_BUNDLES[0];

  const purchase = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sign in to purchase Spice.");

      // TODO(stripe): replace this simulated credit with a real
      // Stripe Checkout session. Flow once wired:
      //   1. POST bundle.id to the billing Edge Function
      //   2. redirect the browser to the returned checkout URL
      //   3. on return (success), webhook credits Spice + logs txn
      // Until then we credit locally so the rest of the Tavern loop
      // (buying items, earning splits) is exercisable end-to-end.
      const newBalance = await addSpice(
        user.id,
        selected.spice,
        "purchase",
        `Purchased ${selected.label} ($${selected.price.toFixed(2)})`,
      );

      // Separately bump lifetime_purchased since add_spice only
      // tracks lifetime_earned.
      try {
        const { supabase } = await import("@/api/supabaseClient");
        const { data: current } = await supabase
          .from("spice_wallets")
          .select("lifetime_purchased")
          .eq("user_id", user.id)
          .maybeSingle();
        await supabase
          .from("spice_wallets")
          .update({
            lifetime_purchased: (current?.lifetime_purchased || 0) + selected.spice,
          })
          .eq("user_id", user.id);
      } catch { /* non-fatal — lifetime_purchased is analytics only */ }

      return newBalance;
    },
    onSuccess: (newBalance) => {
      queryClient.invalidateQueries({ queryKey: ["spiceWallet", user?.id] });
      toast.success(`Purchased! New balance: ${formatSpice(newBalance)} Spice`);
      onClose?.();
    },
    onError: (err) => toast.error(err?.message || "Purchase failed."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SpiceIcon size={20} color="#fbbf24" />
            Buy Spice
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Spice is the Tavern's cosmetic currency. Never expires. Spend it on themes, portraits, dice, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between bg-[#050816] border border-amber-600/30 rounded-lg px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-amber-400/70 font-bold">Current Balance</p>
            <p className="text-2xl font-black text-amber-200 flex items-center gap-2">
              <SpiceIcon size={20} color="#fbbf24" />
              {formatSpice(wallet?.balance || 0)}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 text-right">
            $1 USD = 250 Spice<br />No expiry
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {SPICE_BUNDLES.map((bundle) => {
            const isSelected = bundle.id === selectedId;
            return (
              <button
                key={bundle.id}
                type="button"
                onClick={() => setSelectedId(bundle.id)}
                className={`text-left rounded-lg border-2 p-4 transition-colors relative ${
                  isSelected
                    ? "bg-[#37F2D1]/5 border-[#37F2D1]"
                    : "bg-[#050816] border-slate-700 hover:border-slate-500"
                }`}
              >
                {bundle.badge && (
                  <span className="absolute -top-2 right-3 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500 text-amber-950">
                    {bundle.badge}
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <SpiceIcon size={16} color="#fbbf24" />
                  <span className="text-lg font-black text-amber-200">
                    {formatSpice(bundle.spice)}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Spice</p>
                {bundle.bonus > 0 && (
                  <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> +{formatSpice(bundle.bonus)} bonus
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <p className="text-sm font-bold text-white">${bundle.price.toFixed(2)}</p>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-500 italic text-center mt-1">
          Unspent Spice can be refunded through Stripe. Spent Spice cannot.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => purchase.mutate()}
            disabled={purchase.isPending || !user?.id}
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold disabled:opacity-50"
          >
            {purchase.isPending
              ? "Processing…"
              : `Purchase — $${selected.price.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
