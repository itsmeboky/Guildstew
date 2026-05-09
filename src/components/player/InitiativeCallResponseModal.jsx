import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dices, Megaphone } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { abilityModifier } from "@/components/dnd5e/dnd5eRules";

/**
 * Player-side response to the GM's Call for Initiative.
 *
 * Pops automatically when:
 *   - combat_data.initiative_call?.active === true, AND
 *   - the player hasn't yet written a response under their own user_id
 *
 * Click Roll → rolls d20, applies the player's character's DEX mod,
 * persists to combat_data.initiative_call.responses[user_id]. Modal
 * stays mounted to display the "waiting on others…" state once the
 * roll has landed but before the GM accepts.
 *
 * Modifier semantics for Phase-3 commit 1:
 *   The GM-set modifier (normal / advantage / disadvantage) is shown
 *   on the prompt as a label only. The actual dual-d20 dice math +
 *   visual treatment lands in the Phase-3 commit-3 polish hotfix per
 *   Boky's option-C call. For now the player rolls a normal d20 — the
 *   GM can re-call with adjusted modifier if the roll math matters.
 */
export default function InitiativeCallResponseModal({
  campaign, campaignId, user, myCharacter,
}) {
  const queryClient = useQueryClient();
  const [rolling, setRolling] = useState(false);

  const call = campaign?.combat_data?.initiative_call;
  const isCalling = !!call?.active;
  const myResponse = isCalling && user?.id ? call?.responses?.[user.id] : null;
  // Modal stays open from the moment the call starts until the GM
  // either accepts (clears initiative_call) or cancels. The "waiting
  // on others" state shows after the player has rolled.
  const open = isCalling;

  const submitRoll = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not signed in.");
      const dex = myCharacter?.attributes?.dex || 10;
      const mod = abilityModifier(dex);
      const raw = Math.floor(Math.random() * 20) + 1;
      const total = raw + mod;

      // Re-read the campaign from the cache so we don't clobber a
      // sibling player's concurrently-arriving response. Spread the
      // existing responses, drop ours in.
      const latest = queryClient.getQueryData(['campaign', campaignId]) || campaign;
      const latestCall = latest?.combat_data?.initiative_call;
      if (!latestCall?.active) {
        // GM cancelled between render and submit — quietly bail.
        return;
      }
      const nextResponses = {
        ...(latestCall.responses || {}),
        [user.id]: {
          roll: raw,
          mod,
          total,
          rolled_at: new Date().toISOString(),
        },
      };
      const nextCombatData = {
        ...(latest?.combat_data || {}),
        initiative_call: { ...latestCall, responses: nextResponses },
      };
      await base44.entities.Campaign.update(campaignId, { combat_data: nextCombatData });
    },
    onMutate: () => setRolling(true),
    onSettled: () => setRolling(false),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] }),
    onError: (err) => toast.error(err?.message || "Couldn't submit your roll."),
  });

  if (!open) return null;

  const modifier = call?.modifier || 'normal';
  const modifierLabel = modifier === 'advantage'
    ? 'Advantage'
    : modifier === 'disadvantage'
      ? 'Disadvantage'
      : 'Normal';

  return (
    <Dialog open={open} onOpenChange={() => { /* GM-controlled — players can't dismiss */ }}>
      <DialogContent
        className="bg-[#1a1f2e] border-slate-700 text-white max-w-sm"
        // Player can't escape the call by closing the modal — the GM
        // owns when this clears. Suppress the close button + dismiss
        // affordances on the dialog primitive.
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#37F2D1]" />
            GM is calling for initiative
          </DialogTitle>
        </DialogHeader>

        <div className="py-3 space-y-3">
          <p className="text-xs uppercase tracking-widest text-slate-400">
            Modifier: <span className="text-[#37F2D1] font-bold">{modifierLabel}</span>
          </p>
          {myResponse ? (
            <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-3 text-sm">
              <p className="font-bold text-emerald-300">
                You rolled {myResponse.total}
              </p>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                ({myResponse.roll}{(myResponse.mod || 0) >= 0 ? ' + ' : ' − '}{Math.abs(myResponse.mod || 0)})
              </p>
              <p className="text-xs text-slate-400 mt-2 italic">
                Waiting on the GM to lock initiative…
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-300">
              Roll a d20. Your character&apos;s DEX modifier is applied
              automatically. The GM accepts everyone&apos;s rolls together.
            </p>
          )}
        </div>

        <DialogFooter>
          {!myResponse && (
            <Button
              onClick={() => submitRoll.mutate()}
              disabled={rolling || submitRoll.isPending || !myCharacter}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold w-full"
            >
              <Dices className="w-4 h-4 mr-1" />
              {rolling ? 'Rolling…' : 'Roll Initiative'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
