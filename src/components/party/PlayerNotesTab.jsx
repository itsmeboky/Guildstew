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
import { Lock, Users, Crown, Pencil, Trash2, Plus, X, Save, Upload } from "lucide-react";
import { uploadFile } from "@/utils/uploadFile";
import { canSeeNote } from "./partyPermissions";
import { timeAgo, formatDate } from "@/utils/timeAgo";
import SketchCanvas from "@/components/shared/SketchCanvas";

const VISIBILITY = [
  { value: "private",  label: "Private",  icon: Lock,  cls: "bg-red-900/30 text-red-400 border-red-800/30",          hint: "Only you and the GM." },
  { value: "party",    label: "Party",    icon: Users, cls: "bg-emerald-900/30 text-emerald-400 border-emerald-800/30", hint: "Every party member can read." },
  { value: "gm_only",  label: "GM Only",  icon: Crown, cls: "bg-amber-900/30 text-amber-400 border-amber-800/30",     hint: "Only the GM sees this." },
];
const VIS_MAP = Object.fromEntries(VISIBILITY.map((v) => [v.value, v]));

function uid() {
  return `note_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Forum-style notes. Each note renders as a post: character portrait
 * as author avatar, timestamp, visibility pill, body, optional
 * attached image. The Adventuring Party panel's equivalent of a
 * thread list.
 */
export default function PlayerNotesTab({ character, viewer }) {
  const queryClient = useQueryClient();
  const canEdit = !!(viewer?.isGM || viewer?.ownsTarget);
  const allNotes = Array.isArray(character?.player_notes) ? character.player_notes : [];

  const notes = useMemo(() => {
    const filtered = allNotes.filter((n) => canSeeNote(n, viewer));
    return filtered.slice().sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    );
  }, [allNotes, viewer]);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const writeMutation = useMutation({
    mutationFn: async (next) => base44.entities.Character.update(character.id, { player_notes: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignCharacters", character.campaign_id] });
    },
    onError: (err) => toast.error(err?.message || "Couldn't save that note."),
  });

  const persist = (next) => writeMutation.mutate(next);

  const addOne = (entry) => {
    persist([...allNotes, { id: uid(), created_at: new Date().toISOString(), ...entry }]);
    setAdding(false);
  };
  const updateOne = (id, patch) => {
    persist(allNotes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    setEditingId(null);
  };
  const removeOne = (id) => {
    if (!confirm("Delete this note?")) return;
    persist(allNotes.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-3">
      {canEdit && !adding && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {viewer?.isGM
              ? "GM view — every note is visible, including private and GM-only."
              : viewer?.ownsTarget
                ? "Your private scratchpad. Set visibility per note to share with the party or flag for the GM."
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
          onSave={addOne}
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
              onSave={(patch) => updateOne(note.id, patch)}
            />
          ) : (
            <NotePost
              key={note.id}
              character={character}
              note={note}
              canEdit={canEdit}
              onEdit={() => setEditingId(note.id)}
              onRemove={() => removeOne(note.id)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function NotePost({ character, note, canEdit, onEdit, onRemove }) {
  const vis = VIS_MAP[note.visibility] || VIS_MAP.private;
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
  const [visibility, setVisibility] = useState(initial?.visibility || "private");
  const [imageUrl, setImageUrl] = useState(initial?.image_url || "");
  const [uploading, setUploading] = useState(false);

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

  const handleSave = () => {
    if (!title.trim()) { toast.error("Give the note a title."); return; }
    onSave({
      title: title.trim(),
      content: content.trim(),
      visibility,
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
