import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dices, Megaphone } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { abilityModifier } from "@/components/dnd5e/dnd5eRules";
import { readCombatQueue } from "@/utils/combatQueue";
import { initClassResources } from "@/components/combat/classResources";
import { logCombatEvent } from "@/utils/combatLog";
import { normalizeHp } from "@/components/combat/hpColor";

/**
 * GM-side "Call for Initiative" modal.
 *
 * Distinct from the existing "Roll for Initiative" auto-roll button
 * (which stays for solo testing / one-shot scenes / quick scenarios).
 * This flow asks every player to roll their own initiative
 * simultaneously while the GM watches a tracker fill in. When all
 * players have responded, the GM clicks Accept; monsters roll
 * privately at that point, the combined order is sorted, and combat
 * proceeds from the initiative stage.
 *
 * State lives on `campaign.combat_data.initiative_call`:
 *   {
 *     active: boolean,
 *     called_at: timestamptz,
 *     modifier: 'normal' | 'advantage' | 'disadvantage',
 *     responses: { [user_id]: { roll, total, rolled_at } }
 *   }
 *
 * Modifier semantics for THIS commit (Phase 3 commit 1):
 *   - The modifier value is persisted and shown on the player-side
 *     prompt, but the dual-d20 dice-roll math + green/red glow visual
 *     described in the original spec lands in a separate polish
 *     hotfix per Boky's option-C call. For now, the player rolls a
 *     normal d20 + DEX mod regardless of modifier; the modifier is a
 *     UI label only. Phase 3 commit 3 will wire the math.
 */
const MODIFIER_OPTIONS = [
  { value: 'normal',       label: 'Normal' },
  { value: 'advantage',    label: 'Advantage' },
  { value: 'disadvantage', label: 'Disadvantage' },
];

export default function CallForInitiativeModal({
  open, onClose, campaign, campaignId, players = [], characters = [],
}) {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState('configure'); // configure | tracking
  const [modifier, setModifier] = useState('normal');

  const initiativeCall = campaign?.combat_data?.initiative_call || null;
  const isCalling = !!initiativeCall?.active;
  const responses = initiativeCall?.responses || {};

  // Snap stage to whatever the persistent state says — opening the
  // modal mid-call jumps straight to the tracker.
  React.useEffect(() => {
    if (!open) return;
    setStage(isCalling ? 'tracking' : 'configure');
    if (isCalling && initiativeCall?.modifier) {
      setModifier(initiativeCall.modifier);
    }
  }, [open, isCalling, initiativeCall?.modifier]);

  const startCall = useMutation({
    mutationFn: async () => {
      const next = {
        ...(campaign?.combat_data || {}),
        initiative_call: {
          active: true,
          called_at: new Date().toISOString(),
          modifier,
          responses: {},
        },
      };
      await base44.entities.Campaign.update(campaignId, { combat_data: next });
      logCombatEvent(campaignId, `GM calls for initiative (${modifier === 'normal' ? 'normal' : modifier}).`, {
        event: 'initiative_called', category: 'initiative', modifier,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      setStage('tracking');
    },
    onError: (err) => toast.error(err?.message || "Couldn't start the call."),
  });

  const cancelCall = useMutation({
    mutationFn: async () => {
      const next = { ...(campaign?.combat_data || {}) };
      delete next.initiative_call;
      await base44.entities.Campaign.update(campaignId, { combat_data: next });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      onClose();
    },
    onError: (err) => toast.error(err?.message || "Couldn't cancel."),
  });

  const respondedUserIds = useMemo(
    () => new Set(Object.keys(responses).filter((uid) => responses[uid])),
    [responses],
  );
  const allResponded = players.length > 0 && players.every((p) => respondedUserIds.has(p.user_id));

  const accept = useMutation({
    mutationFn: async () => {
      const rollD20 = (mod) => {
        const raw = Math.floor(Math.random() * 20) + 1;
        return { raw, mod, total: raw + mod };
      };

      // 1. Player combatants — pull totals from initiative_call.responses
      //    (player rolled their own d20). Look up the character row
      //    for HP / faction context.
      const playerCombatants = players.map((p) => {
        const char = p.character || characters.find((c) => c.user_id === p.user_id || c.created_by === p.email);
        const dex = char?.attributes?.dex || 10;
        const mod = abilityModifier(dex);
        const resp = responses[p.user_id] || {};
        const raw = typeof resp.roll === 'number' ? resp.roll : (Math.floor(Math.random() * 20) + 1);
        const total = typeof resp.total === 'number' ? resp.total : (raw + mod);
        const hp = normalizeHp(char);
        return {
          id: `player-${p.user_id}`,
          name: char?.name || p.username,
          avatar: char?.profile_avatar_url || char?.avatar_url || char?.image_url || p.avatar_url,
          bloodied_avatar_url: char?.bloodied_avatar_url || null,
          dexMod: mod,
          type: 'player',
          initiative: total,
          initiativeRoll: raw,
          initiativeMod: mod,
          uniqueId: `player-${p.user_id}`,
          hit_points: hp,
          faction: 'player',
          originalFaction: 'player',
          charmDuration: null,
        };
      });

      // 2. Monsters / NPCs — GM rolls each privately right now.
      const queuedCombatants = readCombatQueue(campaignId);
      const monsterCombatants = queuedCombatants.map((m) => {
        const stats = m.stats || m;
        const dex = stats.dex || stats.attributes?.dex || 10;
        const mod = abilityModifier(dex);
        const roll = rollD20(mod);
        const hp = normalizeHp(m);
        return {
          id: `monster-${m.queueId}`,
          name: m.name,
          avatar: m.image_url || m.avatar_url,
          dexMod: mod,
          type: 'monster',
          initiative: roll.total,
          initiativeRoll: roll.raw,
          initiativeMod: roll.mod,
          uniqueId: `monster-${m.queueId}`,
          initiative_rolled: true,
          hit_points: hp,
          faction: m.faction || 'enemy',
          originalFaction: m.originalFaction || m.faction || 'enemy',
          charmDuration: m.charmDuration ?? null,
        };
      });

      // 3. Combine + sort high → low (random tie-break).
      const allCombatants = [...playerCombatants, ...monsterCombatants].sort((a, b) => {
        if (b.initiative !== a.initiative) return b.initiative - a.initiative;
        return Math.random() - 0.5;
      });

      // 4. classResources init for every combatant — same shape the
      //    auto-roll path uses so downstream class-ability buttons
      //    have something to read.
      const initialResources = {};
      allCombatants.forEach((c) => {
        const key = c.uniqueId || c.id;
        if (c.type === 'player' || c.class) {
          const charData = characters.find((ch) => ch.id === key || ch.name === c.name) || c;
          initialResources[key] = initClassResources({ ...charData, ...c });
        }
      });

      // 5. Persist — clear initiative_call, set the order, mark
      //    combat active. Stage stays at 'initiative' so the GM can
      //    review + drag-arrange before locking with End Turn / Fight.
      const nextCombatData = {
        stage: 'initiative',
        order: allCombatants,
        rolls: {},
        currentTurnIndex: 0,
        round: 1,
        classResources: initialResources,
      };
      await base44.entities.Campaign.update(campaignId, {
        combat_active: true,
        combat_data: nextCombatData,
      });

      logCombatEvent(campaignId, '⚔️ Combat started! (Called initiative.)', {
        event: 'combat_started', category: 'initiative',
      });
      allCombatants.forEach((c) => {
        const sign = (c.initiativeMod || 0) >= 0 ? '+' : '−';
        const absMod = Math.abs(c.initiativeMod || 0);
        logCombatEvent(
          campaignId,
          `${c.name} rolls initiative: ${c.initiative} (${c.initiativeRoll} ${sign} ${absMod})`,
          {
            event: 'initiative_roll',
            category: 'initiative',
            actor: c.name,
            roll: c.initiative,
          },
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      onClose();
      toast.success("Initiative locked in.");
    },
    onError: (err) => toast.error(err?.message || "Couldn't accept the rolls."),
  });

  const playerNameFor = (uid) => {
    const p = players.find((x) => x.user_id === uid);
    if (!p) return `Player ${String(uid).slice(0, 4)}`;
    return p.character?.name || p.username || `Player ${String(uid).slice(0, 4)}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-[#1a1f2e] border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#37F2D1]" />
            Call for Initiative
          </DialogTitle>
        </DialogHeader>

        {stage === 'configure' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-300">
              Sends a roll request to every player. Monsters roll
              privately when you accept. Auto-roll button is still
              available for solo / quick scenes.
            </p>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-slate-400">Modifier</label>
              <Select value={modifier} onValueChange={setModifier}>
                <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
                  {MODIFIER_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                Adv/Dis dice math + visual treatment ships in the
                Phase-3 commit-3 polish hotfix; this commit persists
                the modifier so the player prompt can display it.
              </p>
            </div>
          </div>
        )}

        {stage === 'tracking' && (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
              <span>Modifier: {initiativeCall?.modifier || modifier}</span>
              <span>{respondedUserIds.size} / {players.length}</span>
            </div>
            <ul className="space-y-1.5 max-h-64 overflow-y-auto">
              {players.map((p) => {
                const resp = responses[p.user_id];
                return (
                  <li
                    key={p.user_id}
                    className={`flex items-center justify-between p-2 rounded-lg border ${resp ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-[#0f1219] border-slate-700/50'}`}
                  >
                    <span className="text-sm text-white truncate">{playerNameFor(p.user_id)}</span>
                    {resp ? (
                      <span className="text-xs text-emerald-300 font-bold">
                        rolled {resp.total} ({resp.roll}{(resp.mod || 0) >= 0 ? ' + ' : ' − '}{Math.abs(resp.mod || 0)})
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 italic">rolling…</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <DialogFooter className="gap-2">
          {stage === 'configure' ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={() => startCall.mutate()}
                disabled={startCall.isPending || players.length === 0}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
              >
                <Dices className="w-4 h-4 mr-1" />
                {startCall.isPending ? 'Calling…' : 'Send to players'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => cancelCall.mutate()}
                disabled={cancelCall.isPending}
              >
                Cancel call
              </Button>
              <Button
                onClick={() => accept.mutate()}
                disabled={!allResponded || accept.isPending}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold disabled:opacity-50"
              >
                {accept.isPending ? 'Accepting…' : 'Accept initiative'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
