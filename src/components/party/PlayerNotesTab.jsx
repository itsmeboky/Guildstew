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
import { Lock, Users, Crown, Pencil, Trash2, Plus, X, Save } from "lucide-react";
import { canSeeNote } from "./partyPermissions";

const VISIBILITY = [
  { value: "private",  label: "Private",  icon: Lock,  cls: "bg-red-500/20 text-red-300 border-red-500/40",     hint: "Only you and the GM" },
  { value: "party",    label: "Party",    icon: Users, cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", hint: "Every party member can read" },
  { value: "gm_only",  label: "GM Only",  icon: Crown, cls: "bg-amber-500/20 text-amber-300 border-amber-500/40", hint: "Only the GM sees this" },
];
const VIS_MAP = Object.fromEntries(VISIBILITY.map((v) => [v.value, v]));

function uid() {
  return `note_${Math.random().toString(36).slice(2, 10)}`;
}

export default function PlayerNotesTab({ character, viewer }) {
  const queryClient = useQueryClient();
  const canEdit = !!(viewer?.isGM || viewer?.ownsTarget);
  const allNotes = Array.isArray(character?.player_notes) ? character.player_notes : [];

  const notes = useMemo(() => {
    const filtered = allNotes.filter((n) => canSeeNote(n, viewer));
    return filtered.slice().sort((a, b) => {
      const at = new Date(a.created_at || 0).getTime();
      const bt = new Date(b.created_at || 0).getTime();
      return bt - at;
    });
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

  const addOne = (entry) => { persist([...allNotes, { id: uid(), created_at: new Date().toISOString(), ...entry }]); setAdding(false); };
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
              ? "Viewing every note (GM sees private + GM-only notes)."
              : viewer?.ownsTarget
                ? "Your private scratchpad. Set visibility per note to share with the party or flag for the GM."
                : "Party-visible notes only."}
          </p>
          <Button
            size="sm"
            onClick={() => setAdding(true)}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Note
          </Button>
        </div>
      )}

      {adding && (
        <NoteForm onCancel={() => setAdding(false)} onSave={addOne} />
      )}

      {notes.length === 0 && !adding && (
        <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-8 text-center text-slate-500 text-sm">
          No notes to show here.
        </div>
      )}

      <div className="space-y-2">
        {notes.map((note) =>
          editingId === note.id ? (
            <NoteForm
              key={note.id}
              value={note}
              onCancel={() => setEditingId(null)}
              onSave={(entry) => updateOne(note.id, entry)}
            />
          ) : (
            <NoteCard
              key={note.id}
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

function NoteCard({ note, canEdit, onEdit, onRemove }) {
  const vis = VIS_MAP[note.visibility] || VIS_MAP.private;
  const Icon = vis.icon;
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-bold text-white truncate">{note.title || "Untitled"}</div>
            <Badge variant="outline" className={`text-[10px] ${vis.cls}`}>
              <Icon className="w-3 h-3 mr-1" /> {vis.label}
            </Badge>
            {note.created_at && (
              <span className="text-[10px] text-slate-500 ml-auto">{new Date(note.created_at).toLocaleString()}</span>
            )}
          </div>
          {note.content && (
            <p className="text-xs text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">{note.content}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1 rounded hover:bg-[#1e293b] text-slate-300" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onRemove} className="p-1 rounded hover:bg-red-500/20 text-red-400" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteForm({ value, onSave, onCancel }) {
  const [title, setTitle] = useState(value?.title || "");
  const [content, setContent] = useState(value?.content || "");
  const [visibility, setVisibility] = useState(value?.visibility || "private");

  const handleSave = () => {
    if (!title.trim()) { toast.error("Give the note a title."); return; }
    onSave({
      title: title.trim(),
      content: content.trim(),
      visibility,
    });
  };

  return (
    <div className="bg-[#0b1220] border border-[#37F2D1]/40 rounded-xl p-3 space-y-2">
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-slate-400">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-[#050816] border-slate-700 text-white h-9 text-xs" />
      </div>
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-slate-400">Content</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="bg-[#050816] border-slate-700 text-white text-xs"
        />
      </div>
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-slate-400">Visibility</Label>
        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger className="bg-[#050816] border-slate-700 text-white h-9 text-xs">
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
