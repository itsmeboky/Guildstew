import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { safeText } from "@/utils/safeRender";

/**
 * Tier 3 §B3 — Sentient Item Conflict.
 *
 * The DMG resolves a wielder/item conflict as a contested CHA check.
 * This dialog runs the contest interactively: both sides roll a d20,
 * each adds their CHA mod, higher total wins. On a tie the wielder
 * keeps control. The dialog renders the item's conflict triggers as
 * a reminder of when the GM should initiate the contest.
 *
 * Props:
 *   open       — boolean
 *   onClose    — close handler
 *   item       — the sentient item ({ name, sentience: { ... } })
 *   wielder    — character carrying it; reads attributes.cha
 *                or stats.charisma so character-sheet shapes work
 *   onResolve  — optional callback; receives { winner, itemRoll, wielderRoll }
 */
export default function SentientConflictDialog({ open, onClose, item, wielder, onResolve }) {
  const [itemRoll, setItemRoll] = useState(null);
  const [wielderRoll, setWielderRoll] = useState(null);
  const [resolved, setResolved] = useState(null);

  const sentience = item?.sentience || {};
  const itemChaScore = Number(sentience.charisma) || 10;
  const itemChaMod = Math.floor((itemChaScore - 10) / 2);
  const wielderChaScore =
    Number(wielder?.attributes?.cha)
    || Number(wielder?.stats?.charisma)
    || Number(wielder?.charisma)
    || 10;
  const wielderChaMod = Math.floor((wielderChaScore - 10) / 2);
  const triggers = Array.isArray(sentience.conflict?.trigger_conditions)
    ? sentience.conflict.trigger_conditions
    : [];
  const onLoss = sentience.conflict?.on_loss || "";

  const rollD20 = () => Math.floor(Math.random() * 20) + 1;

  const handleRoll = () => {
    const a = rollD20();
    const b = rollD20();
    const itemTotal = a + itemChaMod;
    const wielderTotal = b + wielderChaMod;
    const winner = itemTotal > wielderTotal ? "item" : "wielder";
    setItemRoll({ raw: a, total: itemTotal });
    setWielderRoll({ raw: b, total: wielderTotal });
    setResolved({ winner, itemTotal, wielderTotal });
    onResolve?.({ winner, itemRoll: { raw: a, total: itemTotal }, wielderRoll: { raw: b, total: wielderTotal } });
  };

  const handleClose = () => {
    setItemRoll(null);
    setWielderRoll(null);
    setResolved(null);
    onClose?.();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="bg-gradient-to-br from-[#0b1430] to-[#050816] border-2 border-cyan-500/60 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-cyan-300">
            <Sparkles className="w-5 h-5" />
            Sentient Item Conflict — {safeText(item.name) || "Unnamed"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-[#050816] border border-cyan-500/30 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold mb-1">
              Conflict triggers
            </div>
            {triggers.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No structured triggers — the GM decides when conflict starts.</p>
            ) : (
              <ul className="text-sm text-slate-200 list-disc list-inside space-y-0.5">
                {triggers.map((t, i) => (<li key={i}>{safeText(t)}</li>))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0b1430] border-2 border-cyan-500/50 rounded-lg p-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold">Item</div>
              <div className="text-2xl font-black text-cyan-100 mt-1">
                CHA {itemChaScore} <span className="text-sm text-cyan-300">({itemChaMod >= 0 ? "+" : ""}{itemChaMod})</span>
              </div>
              {itemRoll && (
                <div className="mt-2 text-sm">
                  <div className="text-cyan-200">d20 = {itemRoll.raw}</div>
                  <div className="text-2xl font-black text-cyan-100">{itemRoll.total}</div>
                </div>
              )}
            </div>
            <div className="bg-[#1a0a14] border-2 border-rose-500/50 rounded-lg p-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-rose-300 font-bold">Wielder</div>
              <div className="text-xs text-slate-400 truncate">{wielder?.name || "Wielder"}</div>
              <div className="text-2xl font-black text-rose-100 mt-1">
                CHA {wielderChaScore} <span className="text-sm text-rose-300">({wielderChaMod >= 0 ? "+" : ""}{wielderChaMod})</span>
              </div>
              {wielderRoll && (
                <div className="mt-2 text-sm">
                  <div className="text-rose-200">d20 = {wielderRoll.raw}</div>
                  <div className="text-2xl font-black text-rose-100">{wielderRoll.total}</div>
                </div>
              )}
            </div>
          </div>

          {resolved && (
            <div className={`rounded-lg p-3 border-2 ${resolved.winner === "item" ? "bg-cyan-900/30 border-cyan-400" : "bg-rose-900/30 border-rose-400"}`}>
              <div className="text-sm font-black uppercase tracking-widest text-white mb-1">
                {resolved.winner === "item" ? "Item wins the contest" : "Wielder retains control"}
              </div>
              {resolved.winner === "item" && onLoss && (
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{onLoss}</p>
              )}
              {resolved.winner === "wielder" && (
                <p className="text-xs text-slate-400">The item's will is suppressed for now.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {resolved ? "Close" : "Cancel"}
          </Button>
          {!resolved && (
            <Button
              onClick={handleRoll}
              className="bg-cyan-500 hover:bg-cyan-400 text-[#050816] font-black"
            >
              Roll Contested CHA
            </Button>
          )}
          {resolved && (
            <Button
              variant="outline"
              onClick={() => { setItemRoll(null); setWielderRoll(null); setResolved(null); }}
              className="border-cyan-500 text-cyan-300"
            >
              Re-roll
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
