import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/**
 * Two-pane scratch pad. Left: a list of saved notes stored as an
 * array on campaigns.gm_quick_notes. Right: editor for the note in
 * focus. Saving optionally promotes the note into a
 * WorldLoreEntry (tagged with the chosen category) or a Party
 * Note (world_lore_entries with category='party_notes' and the
 * chosen visibility) so scratch notes can graduate to real
 * campaign content in one click.
 */
const WORLD_LORE_CATEGORIES = [
  { value: "regions",   label: "Regions & Maps" },
  { value: "political", label: "Politics & Factions" },
  { value: "religions", label: "Deities & Religion" },
  { value: "history",   label: "History & Timeline" },
  { value: "artifacts", label: "Artifacts & Relics" },
];

const EMPTY_NOTE = {
  id: null,
  title: "",
  content: "",
  category: "",
  saveTarget: "quick_only",
  visibility: "gm_only",
};

function makeId() {
  return `qn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function QuickNotesContent({ campaignId, campaign, user }) {
  const queryClient = useQueryClient();
  const savedNotes = useMemo(
    () => Array.isArray(campaign?.gm_quick_notes) ? campaign.gm_quick_notes : [],
    [campaign?.gm_quick_notes],
  );

  const [draft, setDraft] = useState(EMPTY_NOTE);

  useEffect(() => {
    if (draft.id && !savedNotes.find((n) => n.id === draft.id)) {
      setDraft(EMPTY_NOTE);
    }
  }, [savedNotes, draft.id]);

  const updateDraft = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const id = draft.id || makeId();
      const record = {
        id,
        title: draft.title.trim(),
        content: draft.content.trim(),
        category: draft.category || null,
        saveTarget: draft.saveTarget,
        visibility: draft.visibility,
        updated_at: new Date().toISOString(),
      };
      const nextList = draft.id
        ? savedNotes.map((n) => (n.id === id ? record : n))
        : [record, ...savedNotes];

      await base44.entities.Campaign.update(campaignId, { gm_quick_notes: nextList });

      if (draft.saveTarget?.startsWith("world_lore_")) {
        const category = draft.saveTarget.replace("world_lore_", "");
        await base44.entities.WorldLoreEntry.create({
          campaign_id: campaignId,
          title: record.title || "Untitled",
          content: record.content,
          category,
          visibility: "public",
          created_by: user?.id || null,
        });
      } else if (draft.saveTarget === "party_note") {
        await base44.entities.WorldLoreEntry.create({
          campaign_id: campaignId,
          title: record.title || "Untitled Party Note",
          content: record.content,
          category: "party_notes",
          visibility: record.visibility || "gm_only",
          created_by: user?.id || null,
        });
      }
      return record;
    },
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      setDraft({ ...EMPTY_NOTE, ...record });
      toast.success(
        draft.saveTarget === "quick_only" || !draft.saveTarget
          ? "Note saved."
          : "Note saved and copied to the selected destination.",
      );
    },
    onError: (err) => toast.error(err?.message || "Couldn't save note."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const next = savedNotes.filter((n) => n.id !== id);
      await base44.entities.Campaign.update(campaignId, { gm_quick_notes: next });
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      if (draft.id === id) setDraft(EMPTY_NOTE);
      toast.success("Note deleted.");
    },
    onError: (err) => toast.error(err?.message || "Couldn't delete note."),
  });

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r border-slate-700/50 overflow-y-auto p-4 flex flex-col">
        <Button
          onClick={() => setDraft(EMPTY_NOTE)}
          className="w-full mb-4 bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Plus className="w-4 h-4 mr-1" /> New Note
        </Button>
        {savedNotes.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No saved notes yet.</p>
        ) : (
          <ul className="divide-y divide-slate-700/30 bg-[#1a1f2e] border border-slate-700/40 rounded-lg overflow-hidden">
            {savedNotes.map((note) => {
              const active = draft.id === note.id;
              return (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => setDraft({
                      id: note.id,
                      title: note.title || "",
                      content: note.content || "",
                      category: note.category || "",
                      saveTarget: note.saveTarget || "quick_only",
                      visibility: note.visibility || "gm_only",
                    })}
                    className={`w-full text-left p-3 transition-colors ${
                      active ? "bg-[#252b3d] border-l-2 border-l-[#37F2D1]" : "hover:bg-[#252b3d]"
                    }`}
                  >
                    <p className="text-sm text-white font-semibold truncate">
                      {note.title || "Untitled"}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-2">{note.content?.slice(0, 120)}</p>
                    {note.category && (
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                        {note.category}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex gap-3 mb-3 flex-shrink-0 flex-wrap">
          <Input
            value={draft.title}
            onChange={(e) => updateDraft({ title: e.target.value })}
            placeholder="Note title…"
            className="flex-1 min-w-[200px] bg-[#0f1219] border-slate-700 text-white"
          />

          <Select value={draft.saveTarget} onValueChange={(v) => updateDraft({ saveTarget: v })}>
            <SelectTrigger className="w-56 flex-shrink-0 bg-[#0f1219] border-slate-700 text-white text-xs">
              <SelectValue placeholder="Save to…" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
              <SelectItem value="quick_only">Quick Notes only</SelectItem>
              {WORLD_LORE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={`world_lore_${c.value}`}>
                  → World Lore: {c.label}
                </SelectItem>
              ))}
              <SelectItem value="party_note">→ Adventuring Party Note</SelectItem>
            </SelectContent>
          </Select>

          {draft.saveTarget === "party_note" && (
            <Select value={draft.visibility} onValueChange={(v) => updateDraft({ visibility: v })}>
              <SelectTrigger className="w-36 flex-shrink-0 bg-[#0f1219] border-slate-700 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
                <SelectItem value="gm_only">🔒 GM Only</SelectItem>
                <SelectItem value="public">🌍 Public</SelectItem>
                <SelectItem value="selected">👁️ Selected</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <textarea
          value={draft.content}
          onChange={(e) => updateDraft({ content: e.target.value })}
          placeholder="Write your note…"
          className="flex-1 bg-[#0f1219] border border-slate-700 rounded-lg p-4 text-white text-sm resize-none mb-3 min-h-0"
        />

        <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !draft.content.trim()}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Save className="w-4 h-4 mr-1" />
            {saveMutation.isPending ? "Saving…" : "Save Note"}
          </Button>

          {draft.id && (
            <Button
              variant="outline"
              onClick={() => confirm("Delete this note?") && deleteMutation.mutate(draft.id)}
              className="text-red-400 border-red-700 hover:bg-red-950/30 text-xs ml-auto"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
