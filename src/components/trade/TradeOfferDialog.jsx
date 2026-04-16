import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Handshake } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { logCombatEvent } from "@/utils/combatLog";

const CURRENCY_KEYS = ["pp", "gp", "ep", "sp", "cp"];
const CURRENCY_LABELS = { pp: "PP", gp: "GP", ep: "EP", sp: "SP", cp: "CP" };

/**
 * Trade Offer creation dialog.
 *
 * Props:
 *   open, onClose
 *   campaignId
 *   myCharacter     — sender's character row (with inventory + currency)
 *   targetCharacter — receiver's character row
 *   senderUserId    — auth user id, stored as trade_offers.added_by
 *                     equivalent (we use sender_user_id) so we can
 *                     tell cancel vs decline permissions later.
 */
export default function TradeOfferDialog({
  open,
  onClose,
  campaignId,
  myCharacter,
  targetCharacter,
  senderUserId,
}) {
  const queryClient = useQueryClient();

  const [offerItemIds, setOfferItemIds] = useState([]);
  const [requestItemIds, setRequestItemIds] = useState([]);
  const [offerCurrency, setOfferCurrency] = useState({ pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 });
  const [requestCurrency, setRequestCurrency] = useState({ pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 });
  const [message, setMessage] = useState("");

  // Reset whenever the dialog re-opens so a cancelled draft doesn't
  // bleed into the next trade.
  useEffect(() => {
    if (!open) return;
    setOfferItemIds([]);
    setRequestItemIds([]);
    setOfferCurrency({ pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 });
    setRequestCurrency({ pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 });
    setMessage("");
  }, [open, myCharacter?.id, targetCharacter?.id]);

  // Indexed inventories — the picker list renders in key order; a
  // trade offer snapshots the full item row so the original owners
  // can't change mid-flight and break the swap.
  const myInventory = useMemo(
    () => indexInventory(myCharacter?.inventory),
    [myCharacter?.inventory],
  );
  const targetInventory = useMemo(
    () => indexInventory(targetCharacter?.inventory),
    [targetCharacter?.inventory],
  );

  const toggle = (list, setList, id) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!myCharacter?.id || !targetCharacter?.id) {
        throw new Error("Both characters must be selected");
      }
      const offerItems = offerItemIds.map((id) => myInventory.items[id]).filter(Boolean);
      const requestItems = requestItemIds.map((id) => targetInventory.items[id]).filter(Boolean);
      // Skip empty trades — at least one side of the deal has to
      // contain something.
      const hasOffer = offerItems.length > 0 || anyCurrency(offerCurrency);
      const hasRequest = requestItems.length > 0 || anyCurrency(requestCurrency);
      if (!hasOffer && !hasRequest) {
        throw new Error("Add at least one item or some coin to the trade.");
      }

      return base44.entities.TradeOffer.create({
        campaign_id: campaignId,
        sender_character_id: myCharacter.id,
        receiver_character_id: targetCharacter.id,
        sender_user_id: senderUserId || null,
        sender_items: offerItems,
        receiver_items: requestItems,
        sender_currency: offerCurrency,
        receiver_currency: requestCurrency,
        status: "pending",
        message: message.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tradeOffers", campaignId] });
      toast.success(`Trade offer sent to ${targetCharacter?.name || "player"}`);
      if (campaignId) {
        logCombatEvent(campaignId, `${myCharacter?.name} sent a trade offer to ${targetCharacter?.name}.`, {
          event: "trade_offered",
          category: "trade",
          actor: myCharacter?.name,
          target: targetCharacter?.name,
        });
      }
      onClose?.();
    },
    onError: (err) => toast.error(err?.message || "Failed to send trade"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-[#37F2D1]" />
            Trade — {myCharacter?.name || "You"} → {targetCharacter?.name || "Them"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* --- You Offer --- */}
          <TradeSide
            title="You Offer"
            accent="#22c55e"
            inventory={myInventory}
            selectedIds={offerItemIds}
            onToggle={(id) => toggle(offerItemIds, setOfferItemIds, id)}
            currency={offerCurrency}
            maxCurrency={myCharacter?.currency}
            onCurrencyChange={setOfferCurrency}
          />

          {/* --- You Request --- */}
          <TradeSide
            title="You Request"
            accent="#FF5722"
            inventory={targetInventory}
            selectedIds={requestItemIds}
            onToggle={(id) => toggle(requestItemIds, setRequestItemIds, id)}
            currency={requestCurrency}
            maxCurrency={targetCharacter?.currency}
            onCurrencyChange={setRequestCurrency}
          />
        </div>

        <div className="mt-3">
          <Label className="text-xs text-slate-300 font-semibold mb-1 block">Message (optional)</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a note for the receiver…"
            rows={2}
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </div>

        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            {sendMutation.isPending ? "Sending…" : "Send Trade Offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TradeSide({ title, accent, inventory, selectedIds, onToggle, currency, maxCurrency, onCurrencyChange }) {
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-3">
      <h3 className="text-xs font-black uppercase tracking-[0.22em] mb-2" style={{ color: accent }}>
        {title}
      </h3>

      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Items</div>
      {inventory.list.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic mb-2">Inventory is empty.</p>
      ) : (
        <div className="max-h-40 overflow-y-auto custom-scrollbar mb-3 space-y-1">
          {inventory.list.map(({ id, item }) => {
            const selected = selectedIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => onToggle(id)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1 rounded border transition-colors ${
                  selected
                    ? "bg-[#37F2D1]/15 border-[#37F2D1] text-white"
                    : "bg-[#050816] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
                }`}
              >
                {item?.image_url ? (
                  <img src={item.image_url} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded bg-[#37F2D1]/20 flex-shrink-0" />
                )}
                <span className="text-xs flex-1 truncate">{item?.name || "Item"}</span>
                {item?.quantity > 1 && (
                  <span className="text-[10px] text-slate-400">x{item.quantity}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Currency</div>
      <div className="grid grid-cols-5 gap-1.5">
        {CURRENCY_KEYS.map((k) => {
          const max = Number(maxCurrency?.[k] || 0);
          return (
            <div key={k}>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                {CURRENCY_LABELS[k]}
              </Label>
              <Input
                type="number"
                min={0}
                max={max}
                value={currency[k] ?? 0}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(max, Number(e.target.value) || 0));
                  onCurrencyChange({ ...currency, [k]: v });
                }}
                className="bg-[#050816] border-slate-700 text-white text-xs h-8"
              />
              <div className="text-[9px] text-slate-500 text-center mt-0.5">/{max}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function indexInventory(raw) {
  if (!Array.isArray(raw)) return { list: [], items: {} };
  const items = {};
  const list = [];
  raw.forEach((item, idx) => {
    const id = item?.id || `${item?.name || "item"}-${idx}`;
    items[id] = { ...item };
    list.push({ id, item: items[id] });
  });
  return { list, items };
}

function anyCurrency(c) {
  if (!c) return false;
  return CURRENCY_KEYS.some((k) => Number(c[k] || 0) > 0);
}
