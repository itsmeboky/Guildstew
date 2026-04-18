import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus, X, Save } from "lucide-react";

const TYPES = [
  { value: "friend",   label: "Friend",   cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  { value: "ally",     label: "Ally",     cls: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  { value: "rival",    label: "Rival",    cls: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  { value: "enemy",    label: "Enemy",    cls: "bg-red-500/20 text-red-300 border-red-500/40" },
  { value: "romantic", label: "Romantic", cls: "bg-pink-500/20 text-pink-300 border-pink-500/40" },
  { value: "neutral",  label: "Neutral",  cls: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
];
const TYPE_MAP = Object.fromEntries(TYPES.map((t) => [t.value, t]));

function uid() {
  return `rel_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Directional relationships table. Each character row carries its own
 * `relationships` JSON array — Character A's entry for Character B is
 * independent of B's entry for A. Only the owning player (or the GM)
 * can edit; other players don't even see this tab by construction in
 * AdventuringParty.jsx.
 */
export default function RelationshipsTab({ character, partyCharacters = [], npcs = [], viewer }) {
  const queryClient = useQueryClient();
  const canEdit = !!(viewer?.isGM || viewer?.ownsTarget);
  const relationships = Array.isArray(character?.relationships) ? character.relationships : [];

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const targetChoices = useMemo(() => {
    const existing = new Set(relationships.map((r) => r.target_id));
    const players = partyCharacters
      .filter((c) => c.id !== character?.id && !existing.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, type: "player" }));
    const npcRows = (npcs || [])
      .filter((n) => !existing.has(n.id))
      .map((n) => ({ id: n.id, name: n.name, type: "npc" }));
    return [...players, ...npcRows];
  }, [partyCharacters, npcs, character?.id, relationships]);

  const writeMutation = useMutation({
    mutationFn: async (next) => base44.entities.Character.update(character.id, { relationships: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignCharacters", character.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ["campaign", character.campaign_id] });
    },
    onError: (err) => toast.error(err?.message || "Couldn't save that relationship."),
  });

  const persist = (nextList) => writeMutation.mutate(nextList);

  const addRelationship = (entry) => {
    const next = [...relationships, { id: uid(), ...entry }];
    persist(next);
    setAdding(false);
  };
  const updateRelationship = (id, patch) => {
    const next = relationships.map((r) => (r.id === id ? { ...r, ...patch } : r));
    persist(next);
    setEditingId(null);
  };
  const removeRelationship = (id) => {
    if (!confirm("Remove this relationship?")) return;
    persist(relationships.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {canEdit
            ? "Your character's view of the party. Only you and the GM can see this list."
            : "GM-only view."}
        </p>
        {canEdit && !adding && (
          <Button
            size="sm"
            onClick={() => setAdding(true)}
            disabled={targetChoices.length === 0}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Relationship
          </Button>
        )}
      </div>

      {adding && (
        <RelationshipForm
          targets={targetChoices}
          onCancel={() => setAdding(false)}
          onSave={addRelationship}
        />
      )}

      {relationships.length === 0 && !adding && (
        <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-8 text-center text-slate-500 text-sm">
          No relationships tracked yet.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {relationships.map((r) =>
          editingId === r.id ? (
            <RelationshipForm
              key={r.id}
              value={r}
              targets={[{ id: r.target_id, name: r.target_name, type: r.target_type }]}
              lockedTarget
              onCancel={() => setEditingId(null)}
              onSave={(entry) => updateRelationship(r.id, entry)}
            />
          ) : (
            <RelationshipCard
              key={r.id}
              relationship={r}
              partyCharacters={partyCharacters}
              npcs={npcs}
              canEdit={canEdit}
              onEdit={() => setEditingId(r.id)}
              onRemove={() => removeRelationship(r.id)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function RelationshipCard({ relationship: r, partyCharacters, npcs, canEdit, onEdit, onRemove }) {
  const typeStyle = TYPE_MAP[r.relationship_type] || TYPE_MAP.neutral;
  const match = r.target_type === "player"
    ? partyCharacters.find((c) => c.id === r.target_id)
    : npcs.find((n) => n.id === r.target_id);
  const portrait = match?.avatar_url || match?.portrait_url || null;
  const name = r.target_name || match?.name || "Unknown";

  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-3">
      <div className="flex items-start gap-3">
        {portrait ? (
          <img src={portrait} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-800 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-bold text-white truncate">{name}</div>
            <Badge variant="outline" className={`text-[10px] ${typeStyle.cls}`}>{typeStyle.label}</Badge>
            {r.target_type === "npc" && (
              <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">NPC</Badge>
            )}
          </div>

          <Bar label="Affinity" value={r.affinity} color="#37F2D1" />
          <Bar label="Trust" value={r.trust} color="#22c55e" />

          {r.description && (
            <p className="text-xs text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">{r.description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-col gap-1">
            <button onClick={onEdit} className="p-1 rounded hover:bg-[#1e293b] text-slate-300" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onRemove} className="p-1 rounded hover:bg-red-500/20 text-red-400" title="Remove">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Bar({ label, value, color }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-400">
        <span>{label}</span>
        <span className="text-white font-bold">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#1e293b] overflow-hidden mt-0.5">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function RelationshipForm({ value, targets = [], lockedTarget = false, onSave, onCancel }) {
  const initialTarget = value?.target_id || targets[0]?.id || "";
  const [targetId, setTargetId] = useState(initialTarget);
  const [type, setType] = useState(value?.relationship_type || "neutral");
  const [affinity, setAffinity] = useState(value?.affinity ?? 50);
  const [trust, setTrust] = useState(value?.trust ?? 50);
  const [description, setDescription] = useState(value?.description || "");

  const handleSave = () => {
    const target = targets.find((t) => t.id === targetId);
    if (!target) {
      toast.error("Pick someone to describe the relationship with.");
      return;
    }
    onSave({
      target_id: target.id,
      target_name: target.name,
      target_type: target.type,
      relationship_type: type,
      affinity: Number(affinity),
      trust: Number(trust),
      description: description.trim(),
    });
  };

  return (
    <div className="bg-[#0b1220] border border-[#37F2D1]/40 rounded-xl p-3 space-y-2 col-span-1 md:col-span-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-slate-400">Target</Label>
          <Select value={targetId} onValueChange={setTargetId} disabled={lockedTarget}>
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white h-9 text-xs">
              <SelectValue placeholder="Pick a party member or NPC" />
            </SelectTrigger>
            <SelectContent>
              {targets.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} {t.type === "npc" ? "· NPC" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-slate-400">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <RangeField label="Affinity" value={affinity} onChange={setAffinity} />
        <RangeField label="Trust" value={trust} onChange={setTrust} />
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-widest text-slate-400">Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="How does your character feel about this person?"
          className="bg-[#050816] border-slate-700 text-white text-xs"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Save className="w-3 h-3 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

function RangeField({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-400">
        <span>{label}</span>
        <span className="text-white font-bold">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#37F2D1]"
      />
    </div>
  );
}
