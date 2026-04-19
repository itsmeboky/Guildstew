import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Lock, Users, Eye, Pencil, Trash2, Plus, X, Save, Upload } from "lucide-react";
import { uploadFile } from "@/utils/uploadFile";
import { canSeeNote } from "./partyPermissions";
import { timeAgo, formatDate } from "@/utils/timeAgo";
import SketchCanvas from "@/components/shared/SketchCanvas";

const VISIBILITY = [
  { value: "gm_only",  label: "GM Only", icon: Lock,  cls: "bg-amber-900/30 text-amber-400 border-amber-800/30",     hint: "Only the GM sees this." },
  { value: "public",   label: "Party",   icon: Users, cls: "bg-emerald-900/30 text-emerald-400 border-emerald-800/30", hint: "Every party member can read." },
  { value: "selected", label: "Selected", icon: Eye,  cls: "bg-blue-900/30 text-blue-400 border-blue-800/30",          hint: "Pick specific players below." },
];
const VIS_MAP = Object.fromEntries(VISIBILITY.map((v) => [v.value, v]));

/**
 * Forum-style notes. Each note renders as a post: character portrait
 * as author avatar, timestamp, visibility pill, body, optional
 * attached image. Persists to `player_notes` — one row per note,
 * scoped to a character. Visibility is gm_only / public / selected
 * with an optional per-user allow-list when the author picks
 * "selected players".
 */
export default function PlayerNotesTab({ character, viewer }) {
  const queryClient = useQueryClient();
  const canEdit = !!(viewer?.isGM || viewer?.ownsTarget);

  const { data: allNotes = [] } = useQuery({
    queryKey: ["playerNotes", character?.id],
    queryFn: () => base44.entities.PlayerNote
      .filter({ character_id: character.id })
      .catch(() => []),
    enabled: !!character?.id,
    initialData: [],
  });

  const notes = useMemo(() => {
    const filtered = allNotes.filter((n) => canSeeNote(n, viewer));
    return filtered.slice().sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    );
  }, [allNotes, viewer]);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["playerNotes", character?.id] });
  };

  const addMutation = useMutation({
    mutationFn: (entry) => base44.entities.PlayerNote.create({
      campaign_id: character.campaign_id,
      character_id: character.id,
      author_id: viewer?.viewerUserId || null,
      title: entry.title,
      content: entry.content,
      visibility: entry.visibility,
      visible_to_players: entry.visible_to_players || [],
      image_url: entry.image_url || null,
    }),
    onSuccess: () => { invalidate(); setAdding(false); toast.success("Note saved."); },
    onError: (err) => toast.error(err?.message || "Couldn't save that note."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }) => base44.entities.PlayerNote.update(id, patch),
    onSuccess: () => { invalidate(); setEditingId(null); toast.success("Note updated."); },
    onError: (err) => toast.error(err?.message || "Couldn't update that note."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PlayerNote.delete(id),
    onSuccess: () => { invalidate(); toast.success("Note deleted."); },
    onError: (err) => toast.error(err?.message || "Couldn't delete that note."),
  });

  return (
    <div className="space-y-3">
      {canEdit && !adding && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {viewer?.isGM
              ? "GM view — every note is visible, including selected-only and GM-only."
              : viewer?.ownsTarget
                ? "Your scratchpad. Choose visibility per note to share with the party, a few players, or flag for the GM."
                : "Party-visible notes only."}
          </p>
          <Button
            onClick={() => setAdding(true)}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> New Note
          </Button>
        </div>
      )}

      {adding && (
        <NoteForm
          character={character}
          onCancel={() => setAdding(false)}
          onSave={(entry) => addMutation.mutate(entry)}
        />
      )}

      {notes.length === 0 && !adding && (
        <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-10 text-center text-slate-500 text-sm italic">
          No notes to show here.
        </div>
      )}

      <div className="space-y-3">
        {notes.map((note) =>
          editingId === note.id ? (
            <NoteForm
              key={note.id}
              character={character}
              initial={note}
              onCancel={() => setEditingId(null)}
              onSave={(patch) => updateMutation.mutate({ id: note.id, patch })}
            />
          ) : (
            <NotePost
              key={note.id}
              character={character}
              note={note}
              canEdit={canEdit}
              onEdit={() => setEditingId(note.id)}
              onRemove={() => {
                if (confirm("Delete this note?")) deleteMutation.mutate(note.id);
              }}
            />
          ),
        )}
      </div>
    </div>
  );
}

function NotePost({ character, note, canEdit, onEdit, onRemove }) {
  const vis = VIS_MAP[note.visibility] || VIS_MAP.gm_only;
  return (
    <article className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-6">
      <header className="flex items-start gap-4 mb-4">
        {character?.avatar_url ? (
          <img src={character.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-700 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[#37F2D1] font-semibold">{character?.name || "Unknown"}</div>
          <div className="text-xs text-slate-500">
            {note.created_at ? `${formatDate(note.created_at)} · ${timeAgo(note.created_at)}` : ""}
          </div>
          <h2 className="text-lg font-bold text-white mt-1">{note.title || "Untitled"}</h2>
        </div>
        <Badge variant="outline" className={`text-[10px] ${vis.cls}`}>
          <vis.icon className="w-3 h-3 mr-1" /> {vis.label}
        </Badge>
      </header>

      {note.content && (
        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>
      )}

      {note.image_url && (
        <img
          src={note.image_url}
          alt=""
          className="mt-4 rounded-lg border border-slate-700 max-h-80 object-cover"
        />
      )}

      {canEdit && (
        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-700/50">
          <Button variant="ghost" size="sm" onClick={onEdit} className="text-slate-300 hover:text-white">
            <Pencil className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </div>
      )}
    </article>
  );
}

function NoteForm({ character, initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [visibility, setVisibility] = useState(initial?.visibility || "gm_only");
  const [visibleTo, setVisibleTo] = useState(
    Array.isArray(initial?.visible_to_players) ? initial.visible_to_players : [],
  );
  const [imageUrl, setImageUrl] = useState(initial?.image_url || "");
  const [uploading, setUploading] = useState(false);

  // Pull other party characters so the GM / owner can pick who to
  // share a "selected" note with. No perfect list here without
  // drilling a prop down, so we load the campaign's characters
  // lazily via a useQuery mirroring what AdventuringParty already
  // caches.
  const { data: partyPlayers = [] } = useQuery({
    queryKey: ["partyPlayersForSelect", character?.campaign_id],
    queryFn: async () => {
      const rows = await base44.entities.Character
        .filter({ campaign_id: character.campaign_id })
        .catch(() => []);
      const withUsers = (rows || []).filter((c) => c.user_id && c.user_id !== character?.user_id);
      return withUsers.map((c) => ({ user_id: c.user_id, name: c.name || "Player" }));
    },
    enabled: !!character?.campaign_id,
    initialData: [],
  });

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "campaign-assets", "notes");
      setImageUrl(file_url);
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleVisibleTo = (userId, on) => {
    setVisibleTo((prev) => {
      const set = new Set(prev);
      if (on) set.add(userId); else set.delete(userId);
      return Array.from(set);
    });
  };

  const handleSave = () => {
    if (!title.trim()) { toast.error("Give the note a title."); return; }
    onSave({
      title: title.trim(),
      content: content.trim(),
      visibility,
      visible_to_players: visibility === "selected" ? visibleTo : [],
      image_url: imageUrl || null,
    });
  };

  return (
    <div className="bg-[#1a1f2e] border border-[#37F2D1]/40 rounded-lg p-6 space-y-3">
      <div>
        <Label className="text-sm text-slate-300">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-[#0f1219] border-slate-600 text-white mt-1"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-300">Content</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="bg-[#0f1219] border-slate-600 text-white mt-1"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-300">Visibility</Label>
        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.label} — <span className="text-slate-500">{v.hint}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {visibility === "selected" && (
          <div className="mt-2 bg-[#0f1219] border border-slate-700 rounded p-2">
            {partyPlayers.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                No other party members with user profiles to pick from.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {partyPlayers.map((p) => (
                  <label key={p.user_id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <Checkbox
                      checked={visibleTo.includes(p.user_id)}
                      onCheckedChange={(v) => toggleVisibleTo(p.user_id, !!v)}
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div>
        <Label className="text-sm text-slate-300">Image (optional)</Label>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-16 h-16 rounded object-cover border border-slate-700" />
          ) : (
            <div className="w-16 h-16 rounded bg-slate-800 border border-slate-700" />
          )}
          <label className="inline-flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer bg-[#0f1219] border border-slate-600 px-2 py-1.5 rounded hover:border-[#37F2D1]">
            <Upload className="w-3 h-3" />
            {uploading ? "Uploading…" : imageUrl ? "Replace" : "Upload"}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0])}
              disabled={uploading} />
          </label>
          <SketchCanvas campaignId={character?.campaign_id} onSave={(url) => setImageUrl(url)} />
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="text-[11px] text-red-400 hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-700/50">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Save className="w-4 h-4 mr-1" /> Save Note
        </Button>
      </div>
    </div>
  );
}
