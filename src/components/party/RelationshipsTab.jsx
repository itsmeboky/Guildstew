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
import { Save, Trash2 } from "lucide-react";

/**
 * Directional relationships. One row in `character_relationships`
 * per (from_character_id, to_character_id) pair — Character A's
 * entry for Character B is independent of B's entry for A. Only
 * the owning player (or the GM) sees or edits this tab; the
 * containing panel already hides the tab for everyone else via
 * `canSeeRelationships`.
 *
 * The UI renders one card per OTHER party member with a
 * relationship-type select, a freeform description, and inline
 * Save. Saves upsert on (from, to) so editing is idempotent.
 */

const TYPES = [
  { value: "ally",     label: "Ally",     cls: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  { value: "friend",   label: "Friend",   cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  { value: "rival",    label: "Rival",    cls: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  { value: "enemy",    label: "Enemy",    cls: "bg-red-500/20 text-red-300 border-red-500/40" },
  { value: "romantic", label: "Romantic", cls: "bg-pink-500/20 text-pink-300 border-pink-500/40" },
  { value: "family",   label: "Family",   cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { value: "mentor",   label: "Mentor",   cls: "bg-violet-500/20 text-violet-300 border-violet-500/40" },
  { value: "student",  label: "Student",  cls: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
  { value: "neutral",  label: "Neutral",  cls: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
  { value: "unknown",  label: "Unknown",  cls: "bg-slate-700/40 text-slate-400 border-slate-600/40" },
];
const TYPE_MAP = Object.fromEntries(TYPES.map((t) => [t.value, t]));

export default function RelationshipsTab({ character, partyCharacters = [], viewer }) {
  const queryClient = useQueryClient();
  const canEdit = !!(viewer?.isGM || viewer?.ownsTarget);

  // Load every relationship row whose `from` is this character.
  // B's feelings about A live on B's own row, not here.
  const { data: rows = [] } = useQuery({
    queryKey: ["relationships", character?.id],
    queryFn: () => base44.entities.CharacterRelationship
      .filter({ from_character_id: character.id })
      .catch(() => []),
    enabled: !!character?.id,
    initialData: [],
  });

  // One target card per OTHER party member; merge any stored row.
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
    mutationFn: async ({ toCharacterId, type, description }) => {
      const { data, error } = await supabase
        .from("character_relationships")
        .upsert(
          {
            campaign_id: character.campaign_id,
            from_character_id: character.id,
            to_character_id: toCharacterId,
            relationship_type: type,
            description: description || null,
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

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        {canEdit
          ? "Your character's view of the party. Only you and the GM see this list. A→B and B→A are independent."
          : "GM-only view."}
      </p>

      {targets.length === 0 ? (
        <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-8 text-center text-slate-500 text-sm">
          No other party members to describe yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {targets.map((t) => (
            <RelationshipCard
              key={t.id}
              target={t}
              canEdit={canEdit}
              isSaving={saveMutation.isPending}
              onSave={(type, description) => saveMutation.mutate({
                toCharacterId: t.id, type, description,
              })}
              onClear={(id) => {
                if (confirm("Clear this relationship?")) clearMutation.mutate(id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RelationshipCard({ target, canEdit, isSaving, onSave, onClear }) {
  const existing = target.relationship;
  const [type, setType] = useState(existing?.relationship_type || "neutral");
  const [description, setDescription] = useState(existing?.description || "");
  const dirty =
    type !== (existing?.relationship_type || "neutral")
    || description !== (existing?.description || "");
  const typeStyle = TYPE_MAP[type] || TYPE_MAP.neutral;

  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-3">
      <div className="flex items-start gap-3">
        {target.avatar_url ? (
          <img src={target.avatar_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-800 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-bold text-white truncate">{target.name}</div>
            <Badge variant="outline" className={`text-[10px] ${typeStyle.cls}`}>
              {typeStyle.label}
            </Badge>
          </div>
          {(target.race || target.cls) && (
            <div className="text-[10px] text-slate-400 truncate">
              {[target.race, target.cls].filter(Boolean).join(" · ")}
            </div>
          )}

          <div className="mt-3 space-y-2">
            <Select value={type} onValueChange={setType} disabled={!canEdit}>
              <SelectTrigger className="bg-[#050816] border-slate-700 text-white h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="How does your character feel about this person?"
              disabled={!canEdit}
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
            {canEdit && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onSave(type, description.trim())}
                  disabled={isSaving || !dirty}
                  className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold disabled:opacity-50"
                >
                  <Save className="w-3 h-3 mr-1" />
                  {isSaving ? "Saving…" : "Save"}
                </Button>
                {existing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onClear(existing.id)}
                    className="text-red-400 border-red-700 hover:bg-red-950/30 text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Clear
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
