import React, { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone, Dices } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

/**
 * GM picker for "Call for Initiative" or "Call for DC Check".
 *
 * One component, two modes — drives which fields render and which
 * combat_data key the call writes to. Targets list is "all
 * checked by default" with a master "All players" toggle, plus
 * individual checkboxes per player.
 *
 * Writes:
 *   mode='initiative' → combat_data.initiative_call = { active, modifier, selected_user_ids, responses: {} }
 *   mode='dc_check'   → combat_data.dc_check_call   = { active, modifier, selected_user_ids, check_type, ability, dc, responses: {} }
 *
 * The arena auto-opens via the existing refresh-resilience effect
 * once `active === true`. Closing this picker after a successful
 * call dismisses the picker but leaves the arena open.
 */
const MODIFIER_OPTIONS = [
  { value: 'normal',       label: 'Normal' },
  { value: 'advantage',    label: 'Advantage' },
  { value: 'disadvantage', label: 'Disadvantage' },
];

const ABILITY_OPTIONS = [
  // Ability scores
  { value: 'strength',     label: 'Strength' },
  { value: 'dexterity',    label: 'Dexterity' },
  { value: 'constitution', label: 'Constitution' },
  { value: 'intelligence', label: 'Intelligence' },
  { value: 'wisdom',       label: 'Wisdom' },
  { value: 'charisma',     label: 'Charisma' },
  // Common skills (governing ability resolved at roll time)
  { value: 'perception',   label: 'Perception (Wis)' },
  { value: 'insight',      label: 'Insight (Wis)' },
  { value: 'stealth',      label: 'Stealth (Dex)' },
  { value: 'acrobatics',   label: 'Acrobatics (Dex)' },
  { value: 'athletics',    label: 'Athletics (Str)' },
  { value: 'arcana',       label: 'Arcana (Int)' },
  { value: 'investigation',label: 'Investigation (Int)' },
  { value: 'persuasion',   label: 'Persuasion (Cha)' },
  { value: 'deception',    label: 'Deception (Cha)' },
];

export default function CallRollPicker({
  open, onClose, mode, campaign, campaignId, players = [],
}) {
  const queryClient = useQueryClient();
  const [modifier, setModifier] = useState('normal');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  // dc_check-only fields
  const [checkType, setCheckType] = useState('skill');
  const [ability, setAbility] = useState('perception');
  const [dc, setDc] = useState(15);

  // Default selection = every player. Reseeds when the picker opens.
  useEffect(() => {
    if (!open) return;
    setSelectedUserIds(players.map((p) => p.user_id).filter(Boolean));
    setModifier('normal');
    if (mode === 'dc_check') {
      setCheckType('skill');
      setAbility('perception');
      setDc(15);
    }
  }, [open, mode, players]);

  const allSelected = useMemo(() => {
    if (players.length === 0) return false;
    return players.every((p) => selectedUserIds.includes(p.user_id));
  }, [players, selectedUserIds]);

  const toggleAll = (checked) => {
    setSelectedUserIds(checked ? players.map((p) => p.user_id).filter(Boolean) : []);
  };
  const toggleOne = (uid, checked) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(uid); else next.delete(uid);
      return Array.from(next);
    });
  };

  const sendCall = useMutation({
    mutationFn: async () => {
      if (selectedUserIds.length === 0) throw new Error('Select at least one player.');
      const callKey = mode === 'initiative' ? 'initiative_call' : 'dc_check_call';
      const payload = mode === 'initiative'
        ? {
            active: true,
            called_at: new Date().toISOString(),
            modifier,
            selected_user_ids: selectedUserIds,
            responses: {},
          }
        : {
            active: true,
            called_at: new Date().toISOString(),
            modifier,
            selected_user_ids: selectedUserIds,
            check_type: checkType,
            ability,
            dc: Number(dc) || 15,
            responses: {},
          };
      const next = {
        ...(campaign?.combat_data || {}),
        [callKey]: payload,
      };
      await base44.entities.Campaign.update(campaignId, { combat_data: next });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      onClose();
    },
    onError: (err) => toast.error(err?.message || "Couldn't send the call."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-[#1a1f2e] border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#37F2D1]" />
            {mode === 'initiative' ? 'Call for Initiative' : 'Call for DC Check'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {mode === 'dc_check' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-widest text-slate-400">Check type</Label>
                  <div className="flex gap-3 mt-1">
                    {[['skill', 'Skill'], ['saving_throw', 'Save']].map(([v, label]) => (
                      <label key={v} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          checked={checkType === v}
                          onChange={() => setCheckType(v)}
                          className="accent-[#37F2D1]"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest text-slate-400">DC</Label>
                  <Input
                    type="number"
                    min={1}
                    max={40}
                    value={dc}
                    onChange={(e) => setDc(e.target.value)}
                    className="bg-[#0f1219] border-slate-700 text-white mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-slate-400">Ability / Skill</Label>
                <Select value={ability} onValueChange={setAbility}>
                  <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white max-h-72">
                    {ABILITY_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label className="text-xs uppercase tracking-widest text-slate-400">Modifier</Label>
            <Select value={modifier} onValueChange={setModifier}>
              <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
                {MODIFIER_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-slate-400">Players to roll</Label>
            <div className="mt-2 bg-[#0f1219] border border-slate-700 rounded-lg p-2 space-y-1">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer p-1">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => toggleAll(!!v)}
                />
                <span className="font-bold">All players</span>
              </label>
              <div className="border-t border-slate-700/50 pt-1">
                {players.length === 0 ? (
                  <p className="text-xs text-slate-500 italic px-2 py-1">No players in this campaign.</p>
                ) : (
                  players.map((p) => (
                    <label key={p.user_id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer p-1">
                      <Checkbox
                        checked={selectedUserIds.includes(p.user_id)}
                        onCheckedChange={(v) => toggleOne(p.user_id, !!v)}
                      />
                      <span className="truncate">
                        {p.character?.name || p.username || 'Player'}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => sendCall.mutate()}
            disabled={sendCall.isPending || selectedUserIds.length === 0}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Dices className="w-4 h-4 mr-1" />
            {sendCall.isPending ? 'Sending…' : 'Send to players'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
