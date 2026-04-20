import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame, AlertTriangle } from "lucide-react";
import { getWalletBalance, getGuildWalletBalance } from "@/lib/spiceWallet";
import { purchaseItem } from "@/lib/tavernClient";
import { formatSpice, applyDiscount } from "@/config/spiceConfig";

/**
 * Purchase confirmation dialog.
 *
 * Shows the item preview, original + discounted price, and a
 * Personal / Guild wallet radio. Guild wallet is only offered when
 * the buyer is in a guild. If the guild wallet is
 * `spending_restricted` and the buyer isn't the leader, the Guild
 * option is disabled with an explanatory note — the underlying RPC
 * will reject it anyway, but short-circuiting gives a clearer UX.
 *
 * On confirm we call the same `purchaseItem` used elsewhere; all the
 * invariants (discount, split, ledger) stay in one place.
 */
export default function PurchaseConfirmDialog({
  open,
  onClose,
  item,
  buyer,
  buyerTier,
  guildOwnerId,
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const [walletChoice, setWalletChoice] = useState("personal");

  const { data: wallet } = useQuery({
    queryKey: ["spiceWallet", buyer?.id],
    queryFn: () => getWalletBalance(buyer.id),
    enabled: !!buyer?.id && open,
  });

  const { data: guildWallet } = useQuery({
    queryKey: ["guildSpiceWallet", guildOwnerId],
    queryFn: () => getGuildWalletBalance(guildOwnerId),
    enabled: !!guildOwnerId && open,
  });

  React.useEffect(() => {
    if (open) setWalletChoice("personal");
  }, [open, item?.id]);

  if (!item || !open) return null;

  const discounted = applyDiscount(item.price, buyerTier);
  const hasDiscount = discounted < item.price;

  const guildRestricted =
    guildWallet?.spending_restricted && buyer?.id !== guildOwnerId;

  const personalBalance = wallet?.balance || 0;
  const guildBalance = guildWallet?.balance || 0;

  const canAffordPersonal = personalBalance >= discounted;
  const canAffordGuild = !!guildOwnerId && guildBalance >= discounted && !guildRestricted;

  const activeCanAfford = walletChoice === "guild" ? canAffordGuild : canAffordPersonal;
  const activeBalance = walletChoice === "guild" ? guildBalance : personalBalance;

  const confirm = useMutation({
    mutationFn: async () => {
      const r = await purchaseItem({
        item,
        buyerUserId: buyer.id,
        buyerTier,
        guildId: walletChoice === "guild" ? guildOwnerId : null,
      });
      if (!r.success) throw new Error(r.reason || "Purchase failed");
      return r;
    },
    onSuccess: () => {
      toast.success(`Purchased ${item.name}!`);
      queryClient.invalidateQueries({ queryKey: ["spiceWallet", buyer.id] });
      queryClient.invalidateQueries({ queryKey: ["guildSpiceWallet", guildOwnerId] });
      queryClient.invalidateQueries({ queryKey: ["tavernEntitlements", buyer.id] });
      queryClient.invalidateQueries({ queryKey: ["tavernItems"] });
      queryClient.invalidateQueries({ queryKey: ["tavernItem", item.id] });
      onSuccess?.();
      onClose?.();
    },
    onError: (err) => toast.error(err?.message || "Purchase failed"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Purchase</DialogTitle>
          <DialogDescription className="text-slate-400">
            Review the cost and pick which wallet to spend from.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 bg-[#050816] border border-slate-700 rounded-lg p-3">
          {item.preview_image_url ? (
            <img src={item.preview_image_url} alt="" className="w-14 h-14 rounded object-cover" />
          ) : (
            <div className="w-14 h-14 rounded bg-slate-800" />
          )}
          <div>
            <p className="text-white font-bold text-sm">{item.name}</p>
            <p className="text-[11px] text-slate-400">{item.category?.replace(/_/g, " ")}</p>
            <p className="text-amber-200 font-black text-base flex items-center gap-1 mt-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              {formatSpice(discounted)}
              {hasDiscount && (
                <span className="text-[10px] text-slate-500 line-through ml-1">
                  {formatSpice(item.price)}
                </span>
              )}
              <span className="text-[10px] text-slate-500 ml-1">~${(discounted / 250).toFixed(2)}</span>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Pay from</p>

          <WalletOption
            id="personal"
            active={walletChoice === "personal"}
            onClick={() => setWalletChoice("personal")}
            label="Personal Wallet"
            balance={personalBalance}
            accent="amber"
            disabled={false}
            note={!canAffordPersonal ? "Insufficient Spice" : null}
          />

          {guildOwnerId && (
            <WalletOption
              id="guild"
              active={walletChoice === "guild"}
              onClick={() => !guildRestricted && setWalletChoice("guild")}
              label="Guild Wallet"
              balance={guildBalance}
              accent="purple"
              disabled={guildRestricted}
              note={
                guildRestricted
                  ? "Restricted — only the guild leader can spend"
                  : !canAffordGuild
                  ? "Insufficient Guild Spice"
                  : "All guild members will have access"
              }
            />
          )}
        </div>

        {!activeCanAfford && (
          <div className="bg-rose-500/10 border border-rose-500/40 rounded-lg p-2 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-300 mt-0.5 shrink-0" />
            <p className="text-[11px] text-rose-100">
              Selected wallet has {formatSpice(activeBalance)} Spice. You need {formatSpice(discounted)}.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => confirm.mutate()}
            disabled={confirm.isPending || !activeCanAfford}
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold disabled:opacity-50"
          >
            {confirm.isPending ? "Processing…" : `Confirm Purchase — ${formatSpice(discounted)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WalletOption({ active, onClick, label, balance, accent, disabled, note }) {
  const activeCls = accent === "purple"
    ? "border-purple-400 bg-purple-500/10"
    : "border-amber-400 bg-amber-500/10";
  const flameColor = accent === "purple" ? "text-purple-400" : "text-amber-400";
  const textColor = accent === "purple" ? "text-purple-200" : "text-amber-200";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left rounded-lg border-2 p-3 transition-colors ${
        active ? activeCls : "border-slate-700 bg-[#050816] hover:border-slate-500"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">{label}</p>
          {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
        </div>
        <p className={`text-base font-black ${textColor} flex items-center gap-1`}>
          <Flame className={`w-3.5 h-3.5 ${flameColor}`} />
          {formatSpice(balance)}
        </p>
      </div>
    </button>
  );
}
