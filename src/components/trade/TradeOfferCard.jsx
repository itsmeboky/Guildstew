import React, { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Handshake, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { logCombatEvent } from "@/utils/combatLog";
import { trackEvent } from "@/utils/analytics";

const CURRENCY_KEYS = ["pp", "gp", "ep", "sp", "cp"];

/**
 * Render a single trade offer row. The viewing-character prop lets
 * the card decide which buttons to show:
 *   - Incoming pending → Accept / Decline
 *   - Outgoing pending → Cancel
 *   - Resolved         → read-only status badge
 *
 * Accepting runs the actual inventory + currency transfer inside a
 * mutation so both character rows update atomically (we still fall
 * back to best-effort rollback on partial failure).
 */
export default function TradeOfferCard({
  offer,
  viewingCharacterId,
  characterMap,
  campaignId,
}) {
  const queryClient = useQueryClient();
  const sender = characterMap?.[offer.sender_character_id];
  const receiver = characterMap?.[offer.receiver_character_id];
  const iAmSender = viewingCharacterId === offer.sender_character_id;
  const iAmReceiver = viewingCharacterId === offer.receiver_character_id;

  const statusBadge = useMemo(() => {
    switch (offer.status) {
      case "accepted":  return { text: "Accepted", className: "bg-green-500 text-white hover:bg-green-500" };
      case "declined":  return { text: "Declined", className: "bg-red-500 text-white hover:bg-red-500" };
      case "cancelled": return { text: "Cancelled", className: "bg-slate-500 text-white hover:bg-slate-500" };
      default:          return { text: "Pending",  className: "bg-amber-500 text-black hover:bg-amber-500" };
    }
  }, [offer.status]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      // Merge offer items into the receiver's inventory and vice
      // versa. Items are identified by id; if two items share the
      // same id (e.g. stacked potions) we bump the quantity.
      if (!sender || !receiver) throw new Error("Character data missing — cannot execute trade.");
      const senderInv = Array.isArray(sender.inventory) ? [...sender.inventory] : [];
      const receiverInv = Array.isArray(receiver.inventory) ? [...receiver.inventory] : [];
      const senderCurrency = { ...(sender.currency || {}) };
      const receiverCurrency = { ...(receiver.currency || {}) };

      // Remove offered items from sender, add to receiver.
      const senderAfter = removeItems(senderInv, offer.sender_items);
      const receiverAfter = addItems(receiverInv, offer.sender_items);
      // Remove requested items from receiver, add to sender.
      const receiverAfter2 = removeItems(receiverAfter, offer.receiver_items);
      const senderAfter2 = addItems(senderAfter, offer.receiver_items);
      // Currency — subtract offered, add received.
      for (const k of CURRENCY_KEYS) {
        const off = Number(offer.sender_currency?.[k] || 0);
        const req = Number(offer.receiver_currency?.[k] || 0);
        senderCurrency[k] = Math.max(0, Number(senderCurrency[k] || 0) - off + req);
        receiverCurrency[k] = Math.max(0, Number(receiverCurrency[k] || 0) + off - req);
      }

      await base44.entities.Character.update(sender.id, {
        inventory: senderAfter2,
        currency: senderCurrency,
      });
      await base44.entities.Character.update(receiver.id, {
        inventory: receiverAfter2,
        currency: receiverCurrency,
      });
      await base44.entities.TradeOffer.update(offer.id, { status: "accepted" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tradeOffers", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaignCharacters", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaignPlayers", campaignId] });
      trackEvent(receiver?.user_id || sender?.user_id, 'trade_completed', {
        campaign_id: campaignId,
        offer_id: offer.id,
        sender_character_id: offer.sender_character_id,
        receiver_character_id: offer.receiver_character_id,
      });
      toast.success("Trade accepted!");
      if (campaignId) {
        const summary = summarizeTrade(offer);
        logCombatEvent(
          campaignId,
          `${sender?.name || "Player"} traded with ${receiver?.name || "player"}${summary ? `: ${summary}` : ""}`,
          {
            event: "trade_completed",
            category: "trade",
            actor: sender?.name,
            target: receiver?.name,
            summary,
          },
        );
      }
    },
    onError: (err) => toast.error(err?.message || "Trade failed"),
  });

  const declineMutation = useMutation({
    mutationFn: () => base44.entities.TradeOffer.update(offer.id, { status: "declined" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tradeOffers", campaignId] });
      toast("Trade declined");
    },
    onError: (err) => toast.error(err?.message || "Failed to decline"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => base44.entities.TradeOffer.update(offer.id, { status: "cancelled" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tradeOffers", campaignId] });
      toast("Trade cancelled");
    },
    onError: (err) => toast.error(err?.message || "Failed to cancel"),
  });

  return (
    <div className="bg-[#050816] border border-[#1e293b] rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <Handshake className="w-4 h-4 text-[#37F2D1]" />
        <span className="text-sm font-bold truncate">
          {sender?.name || "Sender"} <ArrowRight className="inline w-3 h-3 text-slate-500 mx-0.5" /> {receiver?.name || "Receiver"}
        </span>
        <Badge className={`ml-auto ${statusBadge.className}`}>{statusBadge.text}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-green-400 font-bold mb-1">Offers</div>
          <TradeList items={offer.sender_items} currency={offer.sender_currency} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#FF5722] font-bold mb-1">Requests</div>
          <TradeList items={offer.receiver_items} currency={offer.receiver_currency} />
        </div>
      </div>

      {offer.message && (
        <p className="text-[11px] text-slate-400 italic mt-2 whitespace-pre-wrap">"{offer.message}"</p>
      )}

      {offer.status === "pending" && (
        <div className="flex gap-2 mt-3">
          {iAmReceiver && (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-500 text-white flex-1"
                disabled={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate()}
              >
                <Check className="w-3 h-3 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-400 border-red-500/50 hover:bg-red-500/10 flex-1"
                disabled={declineMutation.isPending}
                onClick={() => declineMutation.mutate()}
              >
                <X className="w-3 h-3 mr-1" />
                Decline
              </Button>
            </>
          )}
          {iAmSender && (
            <Button
              size="sm"
              variant="outline"
              className="text-slate-400 border-slate-600 hover:bg-slate-700"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Cancel trade
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function TradeList({ items, currency }) {
  const safeItems = Array.isArray(items) ? items : [];
  const coins = currency && typeof currency === "object"
    ? CURRENCY_KEYS.filter((k) => Number(currency[k] || 0) > 0).map((k) => `${currency[k]} ${k.toUpperCase()}`)
    : [];
  if (safeItems.length === 0 && coins.length === 0) {
    return <p className="text-[11px] text-slate-500 italic">Nothing.</p>;
  }
  return (
    <ul className="space-y-0.5">
      {safeItems.map((it, i) => (
        <li key={i} className="truncate">• {it?.name || "Item"}{it?.quantity > 1 ? ` x${it.quantity}` : ""}</li>
      ))}
      {coins.length > 0 && (
        <li className="text-[#fbbf24]">💰 {coins.join(", ")}</li>
      )}
    </ul>
  );
}

// --- helpers ---

function removeItems(inventory, offerItems) {
  if (!Array.isArray(offerItems) || offerItems.length === 0) return [...inventory];
  const next = [...inventory];
  for (const offered of offerItems) {
    // Match by id first, then by name as a fallback for older rows.
    const idx = next.findIndex((it) => (it?.id && offered?.id && it.id === offered.id) || (!offered?.id && it?.name === offered?.name));
    if (idx === -1) continue;
    const target = next[idx];
    const offeredQty = Number(offered?.quantity || 1);
    const currentQty = Number(target?.quantity || 1);
    if (currentQty > offeredQty) {
      next[idx] = { ...target, quantity: currentQty - offeredQty };
    } else {
      next.splice(idx, 1);
    }
  }
  return next;
}

function addItems(inventory, offerItems) {
  if (!Array.isArray(offerItems) || offerItems.length === 0) return [...inventory];
  const next = [...inventory];
  for (const offered of offerItems) {
    const idx = next.findIndex((it) => (it?.id && offered?.id && it.id === offered.id) || (!offered?.id && it?.name === offered?.name));
    const offeredQty = Number(offered?.quantity || 1);
    if (idx === -1) {
      next.push({ ...offered, quantity: offeredQty });
    } else {
      next[idx] = { ...next[idx], quantity: Number(next[idx]?.quantity || 1) + offeredQty };
    }
  }
  return next;
}

function summarizeTrade(offer) {
  const parts = [];
  const s = Array.isArray(offer.sender_items) ? offer.sender_items.length : 0;
  const r = Array.isArray(offer.receiver_items) ? offer.receiver_items.length : 0;
  if (s > 0) parts.push(`${s} item${s === 1 ? "" : "s"} sent`);
  if (r > 0) parts.push(`${r} item${r === 1 ? "" : "s"} received`);
  const coinsS = CURRENCY_KEYS.reduce((sum, k) => sum + Number(offer.sender_currency?.[k] || 0), 0);
  const coinsR = CURRENCY_KEYS.reduce((sum, k) => sum + Number(offer.receiver_currency?.[k] || 0), 0);
  if (coinsS > 0) parts.push("coin sent");
  if (coinsR > 0) parts.push("coin received");
  return parts.join(", ");
}
