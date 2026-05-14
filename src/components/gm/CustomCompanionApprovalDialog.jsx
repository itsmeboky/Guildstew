import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, ChevronRight, PawPrint, X as XIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const CREATURE_TYPES = ["Beast", "Humanoid", "Fey", "Fiend", "Celestial", "Dragon", "Elemental", "Monstrosity", "Ooze", "Plant", "Undead", "Construct"];
const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];

const BLANK_STATS = {
  creature_type: "Beast",
  size: "Medium",
  ac: 12,
  hp: 10,
  speed: 30,
  fly: "",
  swim: "",
  climb: "",
  str: 10, dex: 10, con: 10, int: 6, wis: 10, cha: 6,
  actions: "",
  special: "",
};

/**
 * GM-side pending-approval notification + stat editor for custom
 * companions. Surfaces automatically when the GM opens the campaign
 * if any player character has a companion flagged
 * needs_gm_approval: true, walks through them one at a time, and
 * writes the GM's stats back onto that character's companions array.
 *
 * Data source: we read characters from the parent's already-cached
 * useQuery; the save path updates the Character row and invalidates
 * `campaignCharacters` so the sheet re-reads the fresh JSONB.
 */
export default function CustomCompanionApprovalDialog({
  characters = [],
  campaignId,
  isGM,
}) {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [stats, setStats] = useState(BLANK_STATS);

  // Pending rows from the companions TABLE (party-panel additions).
  // Run alongside the JSONB-shape pending entries the characters prop
  // already exposes — both feed the same queue below.
  const { data: pendingTableRows = [] } = useQuery({
    queryKey: ["pendingCompanions", campaignId],
    queryFn: () => base44.entities.Companion
      .filter({ campaign_id: campaignId, approval_status: "pending" })
      .catch(() => []),
    enabled: !!isGM && !!campaignId,
    refetchInterval: 10000,
  });

  // Compute the pending queue. Each entry points at the underlying
  // row so the save knows where to write — either a JSONB index on a
  // Character row or a companion row id.
  const pending = useMemo(() => {
    const rows = [];

    for (const char of characters || []) {
      const comps = Array.isArray(char.companions) ? char.companions : [];
      comps.forEach((comp, idx) => {
        const key = `jsonb:${char.id}:${idx}`;
        if (comp?.needs_gm_approval && !dismissed.has(key)) {
          rows.push({
            key,
            source: "jsonb",
            characterId: char.id,
            characterName: char.name || "Unnamed",
            playerName: char.created_by || "",
            companionIndex: idx,
            companion: comp,
            companions: comps,
          });
        }
      });
    }

    for (const row of pendingTableRows) {
      const key = `table:${row.id}`;
      if (dismissed.has(key)) continue;
      const ownerChar = (characters || []).find((c) => c.id === row.character_id);
      rows.push({
        key,
        source: "table",
        rowId: row.id,
        characterId: row.character_id,
        characterName: ownerChar?.name || "Unnamed",
        playerName: ownerChar?.created_by || "",
        companion: {
          name: row.name,
          image: row.image_url,
          description: row.description || "",
          creature_type: row.type || "Beast",
          ac: row.stats?.ac,
          hp: row.hp_max ?? row.hp_current,
          speed: row.stats?.speed,
        },
        tableRow: row,
      });
    }

    return rows;
  }, [characters, pendingTableRows, dismissed]);

  // Load the current companion's existing stats into the form
  // whenever the editor opens on a new entry.
  useEffect(() => {
    if (!editing) return;
    const comp = editing.companion || {};
    setStats({
      creature_type: capitalize(comp.creature_type) || BLANK_STATS.creature_type,
      size: comp.size || BLANK_STATS.size,
      ac: comp.ac ?? BLANK_STATS.ac,
      hp: comp.hp ?? BLANK_STATS.hp,
      speed: comp.speed ?? BLANK_STATS.speed,
      fly: comp.fly ?? "",
      swim: comp.swim ?? "",
      climb: comp.climb ?? "",
      str: comp.abilities?.str ?? BLANK_STATS.str,
      dex: comp.abilities?.dex ?? BLANK_STATS.dex,
      con: comp.abilities?.con ?? BLANK_STATS.con,
      int: comp.abilities?.int ?? BLANK_STATS.int,
      wis: comp.abilities?.wis ?? BLANK_STATS.wis,
      cha: comp.abilities?.cha ?? BLANK_STATS.cha,
      actions: comp.actions || "",
      special: comp.special || "",
    });
  }, [editing]);

  const approveRow = useMutation({
    mutationFn: async ({ rowId, key }) => {
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.Companion.update(rowId, {
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: me?.id || null,
      });
      return key;
    },
    onSuccess: (key) => {
      toast.success("Companion approved.");
      setDismissed((prev) => new Set(prev).add(key));
      queryClient.invalidateQueries({ queryKey: ["pendingCompanions", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaignCompanions", campaignId] });
    },
    onError: (err) => {
      console.error("Approve companion", err);
      toast.error(`Couldn't approve: ${err?.message || err}`);
    },
  });

  const rejectRow = useMutation({
    mutationFn: async ({ rowId, key }) => {
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.Companion.update(rowId, {
        approval_status: "rejected",
        approved_at: new Date().toISOString(),
        approved_by: me?.id || null,
      });
      return key;
    },
    onSuccess: (key) => {
      toast.success("Companion rejected.");
      setDismissed((prev) => new Set(prev).add(key));
      queryClient.invalidateQueries({ queryKey: ["pendingCompanions", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaignCompanions", campaignId] });
    },
    onError: (err) => {
      console.error("Reject companion", err);
      toast.error(`Couldn't reject: ${err?.message || err}`);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("No companion in editor.");
      const nextCompanion = {
        ...editing.companion,
        is_custom: true,
        needs_gm_approval: false,
        creature_type: (stats.creature_type || "").toLowerCase(),
        size: stats.size,
        ac: toNum(stats.ac),
        hp: toNum(stats.hp),
        speed: toNum(stats.speed),
        fly: stats.fly === "" ? null : toNum(stats.fly),
        swim: stats.swim === "" ? null : toNum(stats.swim),
        climb: stats.climb === "" ? null : toNum(stats.climb),
        abilities: {
          str: toNum(stats.str), dex: toNum(stats.dex), con: toNum(stats.con),
          int: toNum(stats.int), wis: toNum(stats.wis), cha: toNum(stats.cha),
        },
        actions: stats.actions || null,
        special: stats.special || null,
        gm_approved_at: new Date().toISOString(),
      };
      const newCompanions = [...editing.companions];
      newCompanions[editing.companionIndex] = nextCompanion;
      await base44.entities.Character.update(editing.characterId, { companions: newCompanions });
    },
    onSuccess: () => {
      toast.success("Companion stats saved — ready for combat.");
      setDismissed((prev) => new Set(prev).add(editing.key));
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["campaignCharacters", campaignId] });
    },
    onError: (err) => {
      console.error("Custom companion save", err);
      toast.error(`Couldn't save: ${err?.message || err}`);
    },
  });

  if (!isGM || pending.length === 0) return null;
  const head = pending[0];

  return (
    <>
      {/* Initial notification popup — only shows before the GM
          opens the editor. Lists the queue and lets them jump in. */}
      {!editing && (
        <Dialog open onOpenChange={(o) => { if (!o) setDismissed(new Set(pending.map((p) => p.key))); }}>
          <DialogContent className="bg-[#1E2430] border border-amber-500/40 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PawPrint className="w-5 h-5 text-amber-300" />
                Custom companions need approval
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                {pending.length === 1
                  ? `${head.characterName} has a custom companion awaiting your approval.`
                  : `${pending.length} custom companions are awaiting your approval before they can enter active play.`}
              </p>
              <ul className="space-y-2">
                {pending.map((p) => (
                  <li
                    key={p.key}
                    className="flex items-center gap-3 bg-[#050816] border border-slate-700 rounded-lg p-2"
                  >
                    <div className="w-10 h-10 rounded overflow-hidden bg-[#1E2430] border border-slate-700 flex-shrink-0">
                      {p.companion.image ? (
                        <img src={p.companion.image} alt="" className="w-full h-full object-cover object-top" />
                      ) : (
                        <PawPrint className="w-full h-full p-2 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {p.companion.name || "Unnamed"}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        for {p.characterName}
                      </p>
                      {p.companion.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                          {p.companion.description}
                        </p>
                      )}
                    </div>
                    {p.source === "table" ? (
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          onClick={() => approveRow.mutate({ rowId: p.rowId, key: p.key })}
                          disabled={approveRow.isPending || rejectRow.isPending}
                          className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold"
                        >
                          <Check className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectRow.mutate({ rowId: p.rowId, key: p.key })}
                          disabled={approveRow.isPending || rejectRow.isPending}
                          className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                        >
                          <XIcon className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setEditing(p)}
                        className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold"
                      >
                        Implement <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="bg-amber-500/10 border border-amber-400/40 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-100 leading-relaxed">
                  Until approved, these companions stay out of the party UI and can't take combat actions.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDismissed(new Set(pending.map((p) => p.key)))}
              >
                Remind me later
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Stat editor — opens via "Implement" on a row above. */}
      {editing && (
        <Dialog open onOpenChange={(o) => { if (!o) setEditing(null); }}>
          <DialogContent className="bg-[#1E2430] border border-amber-500/40 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PawPrint className="w-5 h-5 text-amber-300" />
                Stats for {editing.companion.name || "Custom Companion"}
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-start gap-3 bg-[#050816] border border-slate-700 rounded-lg p-3">
              <div className="w-16 h-16 rounded overflow-hidden bg-[#1E2430] border border-slate-700 flex-shrink-0">
                {editing.companion.image ? (
                  <img src={editing.companion.image} alt="" className="w-full h-full object-cover object-top" />
                ) : (
                  <PawPrint className="w-full h-full p-3 text-slate-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">
                  {editing.companion.name || "Unnamed"}
                </p>
                <p className="text-[11px] text-slate-500">
                  Companion of {editing.characterName}
                </p>
                {editing.companion.description && (
                  <p className="text-[11px] text-slate-300 italic mt-1">
                    "{editing.companion.description}"
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <Field label="Creature Type">
                <Select value={stats.creature_type} onValueChange={(v) => setStats((s) => ({ ...s, creature_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CREATURE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Size">
                <Select value={stats.size} onValueChange={(v) => setStats((s) => ({ ...s, size: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Armor Class">
                <NumberInput value={stats.ac} onChange={(v) => setStats((s) => ({ ...s, ac: v }))} />
              </Field>
              <Field label="Hit Points">
                <NumberInput value={stats.hp} onChange={(v) => setStats((s) => ({ ...s, hp: v }))} />
              </Field>
              <Field label="Speed (ft)">
                <NumberInput value={stats.speed} onChange={(v) => setStats((s) => ({ ...s, speed: v }))} />
              </Field>
              <Field label="Fly (ft, blank = none)">
                <NumberInput value={stats.fly} onChange={(v) => setStats((s) => ({ ...s, fly: v }))} allowBlank />
              </Field>
              <Field label="Swim (ft, blank = none)">
                <NumberInput value={stats.swim} onChange={(v) => setStats((s) => ({ ...s, swim: v }))} allowBlank />
              </Field>
              <Field label="Climb (ft, blank = none)">
                <NumberInput value={stats.climb} onChange={(v) => setStats((s) => ({ ...s, climb: v }))} allowBlank />
              </Field>
            </div>

            <div className="mt-4">
              <Label className="text-xs text-slate-300 uppercase tracking-widest block mb-2">Ability Scores</Label>
              <div className="grid grid-cols-6 gap-2">
                {["str", "dex", "con", "int", "wis", "cha"].map((ab) => (
                  <div key={ab}>
                    <Label className="text-[10px] uppercase text-slate-500">{ab.toUpperCase()}</Label>
                    <NumberInput
                      value={stats[ab]}
                      onChange={(v) => setStats((s) => ({ ...s, [ab]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Field label="Actions" className="mt-4">
              <Textarea
                value={stats.actions}
                onChange={(e) => setStats((s) => ({ ...s, actions: e.target.value }))}
                placeholder="e.g. Bite: +4 to hit, 1d6+2 piercing. Pack Tactics: advantage when an ally is within 5 ft. of the target."
                rows={3}
                className="bg-[#050816] border-slate-700 text-white"
              />
            </Field>
            <Field label="Special Abilities" className="mt-2">
              <Textarea
                value={stats.special}
                onChange={(e) => setStats((s) => ({ ...s, special: e.target.value }))}
                placeholder="e.g. Keen Hearing. Darkvision 60 ft."
                rows={2}
                className="bg-[#050816] border-slate-700 text-white"
              />
            </Field>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold"
              >
                <Check className="w-4 h-4 mr-1" />
                {save.isPending ? "Saving…" : "Approve & Save Stats"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <Label className="text-[11px] uppercase tracking-widest text-slate-400 block mb-1">{label}</Label>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, allowBlank = false }) {
  return (
    <Input
      type="number"
      value={value === null || value === undefined ? "" : value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "" && allowBlank) return onChange("");
        const n = Number(raw);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      className="bg-[#050816] border-slate-700 text-white h-9"
    />
  );
}

function toNum(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function capitalize(s) {
  if (!s || typeof s !== "string") return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
