import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Save, X } from "lucide-react";

/**
 * Directional relationships. One row in `character_relationships`
 * per (from_character_id, to_character_id) pair — Character A's
 * entry for Character B is independent of B's entry for A. Only
 * the owning player (or the GM) sees or edits this tab; the
 * containing panel already hides the tab for everyone else via
 * `canSeeRelationships`.
 *
 * Each row carries a type + description + two 0..100 meters
 * (affinity, trust) that render as progress bars. The bars update
 * live when the edit form's sliders move; saving upserts on
 * (from_character_id, to_character_id) so the operation is
 * idempotent.
 */

const TYPES = [
  { value: "ally",     label: "Ally",     cls: "bg-blue-900/30 text-blue-400 border-blue-800/40" },
  { value: "friend",   label: "Friend",   cls: "bg-emerald-900/30 text-emerald-400 border-emerald-800/40" },
  { value: "rival",    label: "Rival",    cls: "bg-amber-900/30 text-amber-400 border-amber-800/40" },
  { value: "enemy",    label: "Enemy",    cls: "bg-red-900/30 text-red-400 border-red-800/40" },
  { value: "romantic", label: "Romantic", cls: "bg-pink-900/30 text-pink-400 border-pink-800/40" },
  { value: "family",   label: "Family",   cls: "bg-blue-900/30 text-blue-400 border-blue-800/40" },
  { value: "mentor",   label: "Mentor",   cls: "bg-purple-900/30 text-purple-400 border-purple-800/40" },
  { value: "student",  label: "Student",  cls: "bg-sky-900/30 text-sky-400 border-sky-800/40" },
  { value: "neutral",  label: "Neutral",  cls: "bg-slate-700 text-slate-300 border-slate-600/40" },
  { value: "unknown",  label: "Unknown",  cls: "bg-slate-700 text-slate-300 border-slate-600/40" },
];
const TYPE_MAP = Object.fromEntries(TYPES.map((t) => [t.value, t]));

export default function RelationshipsTab({ character, partyCharacters = [], viewer }) {
  const queryClient = useQueryClient();
  const canEdit = !!(viewer?.isGM || viewer?.ownsTarget);

  const { data: rows = [] } = useQuery({
    queryKey: ["relationships", character?.id],
    queryFn: () => base44.entities.CharacterRelationship
      .filter({ from_character_id: character.id })
      .catch(() => []),
    enabled: !!character?.id,
    initialData: [],
  });

  // Card per other party member, with any existing row attached.
  const targets = useMemo(() => {
    const mine = new Map(rows.map((r) => [r.to_character_id, r]));
    return partyCharacters
      .filter((c) => c.id !== character?.id)
      .map((c) => ({
        id: c.id,
        name: c.name || "Unnamed",
        avatar_url: c.avatar_url || c.profile_avatar_url || null,
        race: c.race || c?.stats?.race,
        cls:  c.class || c?.stats?.class,
        relationship: mine.get(c.id) || null,
      }));
  }, [partyCharacters, character?.id, rows]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["relationships", character?.id] });
  };

  const saveMutation = useMutation({
    mutationFn: async (patch) => {
      const { data, error } = await supabase
        .from("character_relationships")
        .upsert(
          {
            campaign_id: character.campaign_id,
            from_character_id: character.id,
            to_character_id: patch.toCharacterId,
            relationship_type: patch.type,
            description: patch.description || null,
            affinity: Number.isFinite(patch.affinity) ? patch.affinity : 50,
            trust:    Number.isFinite(patch.trust)    ? patch.trust    : 50,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "from_character_id,to_character_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Relationship saved."); },
    onError: (err) => toast.error(err?.message || "Couldn't save that relationship."),
  });

  const clearMutation = useMutation({
    mutationFn: (id) => base44.entities.CharacterRelationship.delete(id),
    onSuccess: () => { invalidate(); toast.success("Relationship cleared."); },
    onError: (err) => toast.error(err?.message || "Couldn't clear that relationship."),
  });

  const [editingTargetId, setEditingTargetId] = useState(null);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        {canEdit
          ? "Your character's view of the party. A→B and B→A are independent."
          : "GM-only view."}
      </p>

      {targets.length === 0 ? (
        <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-8 text-center text-slate-500 text-sm">
          No other party members to describe yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {targets.map((t) => {
            const isEditing = editingTargetId === t.id;
            if (isEditing && canEdit) {
              return (
                <RelationshipEditor
                  key={t.id}
                  target={t}
                  isSaving={saveMutation.isPending}
                  onSave={(entry) => {
                    saveMutation.mutate({ toCharacterId: t.id, ...entry });
                    setEditingTargetId(null);
                  }}
                  onCancel={() => setEditingTargetId(null)}
                />
              );
            }
            return (
              <RelationshipCard
                key={t.id}
                target={t}
                canEdit={canEdit}
                onEdit={() => setEditingTargetId(t.id)}
                onClear={(id) => {
                  if (confirm("Clear this relationship?")) clearMutation.mutate(id);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function RelationshipCard({ target, canEdit, onEdit, onClear }) {
  const rel = target.relationship;
  const type = rel?.relationship_type || "neutral";
  const typeStyle = TYPE_MAP[type] || TYPE_MAP.neutral;
  const affinity = rel?.affinity ?? 50;
  const trust    = rel?.trust    ?? 50;

  return (
    <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {target.avatar_url ? (
            <img
              src={target.avatar_url}
              alt=""
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-700 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <h4 className="text-white font-bold truncate">{target.name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className={`text-[10px] capitalize ${typeStyle.cls}`}>
                {typeStyle.label}
              </Badge>
              {(target.race || target.cls) && (
                <span className="text-[10px] text-slate-500 truncate">
                  {[target.race, target.cls].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {rel && (
              <button
                type="button"
                onClick={() => onClear(rel.id)}
                className="p-1.5 text-slate-400 hover:text-red-400"
                title="Clear"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <Bar label="Affinity" value={affinity} />
      <Bar label="Trust"    value={trust} />

      {rel?.description && (
        <p className="text-sm text-slate-400 mt-2 whitespace-pre-wrap">{rel.description}</p>
      )}

      {!rel && (
        <p className="text-xs text-slate-500 italic mt-2">
          Not described yet.{canEdit ? " Edit to set affinity, trust, and a note." : ""}
        </p>
      )}
    </div>
  );
}

function Bar({ label, value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-[#37F2D1]">{pct}%</span>
      </div>
      <div className="w-full bg-slate-700/30 rounded-full h-2">
        <div
          className="bg-[#37F2D1] h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RelationshipEditor({ target, isSaving, onSave, onCancel }) {
  const existing = target.relationship;
  const [type, setType] = useState(existing?.relationship_type || "neutral");
  const [affinity, setAffinity] = useState(existing?.affinity ?? 50);
  const [trust, setTrust]       = useState(existing?.trust    ?? 50);
  const [description, setDescription] = useState(existing?.description || "");

  return (
    <div className="bg-[#1a1f2e] border border-[#37F2D1]/40 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-3">
        {target.avatar_url ? (
          <img
            src={target.avatar_url}
            alt=""
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0" />
        )}
        <h4 className="text-white font-bold">{target.name}</h4>
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">Relationship Type</label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.filter((t) => t.value !== "unknown").map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">Affinity: {affinity}%</label>
        <input
          type="range"
          min="0"
          max="100"
          value={affinity}
          onChange={(e) => setAffinity(parseInt(e.target.value, 10))}
          className="w-full accent-[#37F2D1]"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">Trust: {trust}%</label>
        <input
          type="range"
          min="0"
          max="100"
          value={trust}
          onChange={(e) => setTrust(parseInt(e.target.value, 10))}
          className="w-full accent-[#37F2D1]"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="How does your character feel about this person?"
          className="w-full bg-[#0f1219] border border-slate-700 rounded-lg p-3 text-white text-sm resize-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onSave({
            type,
            affinity,
            trust,
            description: description.trim(),
          })}
          disabled={isSaving}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Save className="w-3 h-3 mr-1" />
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
