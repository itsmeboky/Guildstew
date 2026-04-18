import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Search, Pencil, Trash2, Save, X, Upload,
} from "lucide-react";
import { uploadFile } from "@/utils/uploadFile";
import {
  filterByVisibility,
  stripHtml,
  VISIBILITY_OPTIONS,
  visibilityBadge,
} from "@/utils/worldLoreVisibility";

/**
 * One shared layout used by Regions, Politics, Deities, History, and
 * Artifacts. The outer page supplies:
 *   - categoryKey: the value written to entry.category
 *   - emptyLabel: copy shown when no entries exist
 *   - metadataFields: an array of `{ key, label, type, options? }`
 *     that drives the "category-specific fields" block on the edit
 *     form. The values land in entry.metadata[key].
 *   - renderList (optional): replaces the default left-column list
 *     (History's timeline uses this when no entry is selected).
 *
 * All reads / writes go through the shared WorldLoreEntry entity.
 */
export default function EntryCategoryView({
  campaignId,
  campaign,
  user,
  isGM,
  isMole,
  partyPlayers = [],
  categoryKey,
  emptyLabel,
  metadataFields = [],
  renderList,
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [editingMode, setEditingMode] = useState(null); // "new" | "edit" | null
  const [search, setSearch] = useState("");

  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ["worldLoreEntries", campaignId, categoryKey],
    queryFn: () => base44.entities.WorldLoreEntry.filter({
      campaign_id: campaignId,
      category: categoryKey,
    }, "-created_at"),
    enabled: !!campaignId && !!categoryKey,
    initialData: [],
  });

  const visibleEntries = useMemo(
    () => filterByVisibility(allEntries, { userId: user?.id, isGM, isMole }),
    [allEntries, user?.id, isGM, isMole],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visibleEntries;
    return visibleEntries.filter((e) =>
      (e.title || "").toLowerCase().includes(q)
      || stripHtml(e.content).toLowerCase().includes(q),
    );
  }, [visibleEntries, search]);

  const selected = useMemo(
    () => visibleEntries.find((e) => e.id === selectedId) || null,
    [visibleEntries, selectedId],
  );

  const writeMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.id) {
        return base44.entities.WorldLoreEntry.update(payload.id, payload);
      }
      return base44.entities.WorldLoreEntry.create({
        ...payload,
        campaign_id: campaignId,
        category: categoryKey,
        created_by: user?.id,
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["worldLoreEntries", campaignId, categoryKey] });
      setEditingMode(null);
      if (row?.id) setSelectedId(row.id);
      toast.success("Entry saved.");
    },
    onError: (err) => toast.error(err?.message || "Save failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorldLoreEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worldLoreEntries", campaignId, categoryKey] });
      setSelectedId(null);
      toast.success("Entry deleted.");
    },
    onError: (err) => toast.error(err?.message || "Delete failed."),
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,30%),minmax(0,1fr)] gap-4 min-h-[calc(100vh-240px)]">
      <aside className="bg-[#0f1219] border border-slate-700 rounded-xl p-3 flex flex-col">
        <div className="relative mb-2">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-7 bg-[#050816] border-slate-600 text-white placeholder:text-slate-500 h-9 text-sm"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500 italic p-4 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 italic p-4 text-center">{emptyLabel || "No entries yet."}</p>
        ) : renderList ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {renderList({
              entries: filtered,
              selectedId,
              onSelect: setSelectedId,
            })}
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
            {filtered.map((entry) => (
              <EntryListRow
                key={entry.id}
                entry={entry}
                selected={selectedId === entry.id}
                onClick={() => setSelectedId(entry.id)}
              />
            ))}
          </ul>
        )}

        {isGM && (
          <Button
            onClick={() => { setSelectedId(null); setEditingMode("new"); }}
            className="mt-2 bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> New Entry
          </Button>
        )}
      </aside>

      <section className="bg-[#0f1219] border border-slate-700 rounded-xl p-5 overflow-y-auto">
        {editingMode ? (
          <EntryForm
            initial={editingMode === "edit" ? selected : null}
            metadataFields={metadataFields}
            partyPlayers={partyPlayers}
            saving={writeMutation.isPending}
            onCancel={() => setEditingMode(null)}
            onSave={(payload) => writeMutation.mutate(payload)}
          />
        ) : !selected ? (
          <EmptySelectionPane label={emptyLabel} />
        ) : (
          <EntryDetailPane
            entry={selected}
            metadataFields={metadataFields}
            canEdit={isGM}
            onEdit={() => setEditingMode("edit")}
            onDelete={() => {
              if (confirm(`Delete "${selected.title}"?`)) deleteMutation.mutate(selected.id);
            }}
          />
        )}
      </section>
    </div>
  );
}

function EntryListRow({ entry, selected, onClick }) {
  const badge = visibilityBadge(entry.visibility);
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
          selected
            ? "bg-[#37F2D1]/10 border-[#37F2D1]/60"
            : "bg-[#050816] border-slate-700 hover:border-slate-500"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold truncate flex-1 ${selected ? "text-[#37F2D1]" : "text-white"}`}>
            {entry.title || "Untitled"}
          </span>
          <Badge variant="outline" className={`text-[9px] ${badge.cls}`}>{badge.label}</Badge>
        </div>
        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
          {stripHtml(entry.content)}
        </p>
      </button>
    </li>
  );
}

function EmptySelectionPane({ label }) {
  return (
    <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
      {label || "Select an entry to view its details."}
    </div>
  );
}

function EntryDetailPane({ entry, metadataFields, canEdit, onEdit, onDelete }) {
  const badge = visibilityBadge(entry.visibility);
  return (
    <article className="space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">{entry.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`text-[10px] ${badge.cls}`}>{badge.label}</Badge>
            {entry.subcategory && (
              <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
                {entry.subcategory}
              </Badge>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onEdit} className="text-slate-300">
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={onDelete} className="text-red-400 border-red-700">
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          </div>
        )}
      </header>

      {entry.image_url && (
        <img src={entry.image_url} alt="" className="w-full max-h-80 object-cover rounded-lg border border-slate-700" />
      )}

      {metadataFields.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {metadataFields.map((field) => {
            const val = entry?.metadata?.[field.key];
            if (!val && val !== 0) return null;
            return (
              <div key={field.key} className="bg-[#050816] border border-slate-700 rounded-lg p-2">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{field.label}</div>
                <div className="text-sm text-white font-semibold">{String(val)}</div>
              </div>
            );
          })}
        </div>
      )}

      {entry.content ? (
        <div
          className="text-sm text-slate-300 leading-relaxed prose prose-invert max-w-none"
          // The rich-text editor persists HTML — render it directly.
          // Inputs are GM-authored so the XSS surface is low; long
          // term we could run it through DOMPurify.
          dangerouslySetInnerHTML={{ __html: entry.content }}
        />
      ) : (
        <p className="text-sm text-slate-500 italic">No description yet.</p>
      )}
    </article>
  );
}

function EntryForm({ initial, metadataFields, partyPlayers, saving, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [visibility, setVisibility] = useState(initial?.visibility || "public");
  const [visibleTo, setVisibleTo] = useState(
    Array.isArray(initial?.visible_to_players) ? initial.visible_to_players : [],
  );
  const [metadata, setMetadata] = useState(initial?.metadata || {});
  const [imageUrl, setImageUrl] = useState(initial?.image_url || "");
  const [uploading, setUploading] = useState(false);

  const setMeta = (key, value) => setMetadata((m) => ({ ...m, [key]: value }));

  const togglePlayer = (id) => {
    setVisibleTo((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "campaign-assets", "worldlore");
      setImageUrl(file_url);
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!title.trim()) { toast.error("Give it a title."); return; }
    onSave({
      id: initial?.id,
      title: title.trim(),
      content,
      visibility,
      visible_to_players: visibility === "selected" ? visibleTo : [],
      metadata,
      image_url: imageUrl || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          {initial?.id ? "Edit Entry" : "New Entry"}
        </h2>
      </div>

      <div>
        <Label className="text-xs text-slate-300">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-[#050816] border-slate-600 text-white mt-1"
        />
      </div>

      <div>
        <Label className="text-xs text-slate-300">Content</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="Supports plain text or raw HTML from your editor of choice."
          className="bg-[#050816] border-slate-600 text-white placeholder:text-slate-500 mt-1"
        />
      </div>

      <div>
        <Label className="text-xs text-slate-300">Image (optional)</Label>
        <div className="flex items-center gap-3 mt-1">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-20 h-20 rounded object-cover border border-slate-700" />
          ) : (
            <div className="w-20 h-20 rounded bg-slate-800 border border-slate-700" />
          )}
          <label className="inline-flex items-center gap-1 text-xs text-slate-300 cursor-pointer bg-[#050816] border border-slate-600 px-2 py-1.5 rounded hover:border-[#37F2D1]">
            <Upload className="w-3 h-3" />
            {uploading ? "Uploading…" : imageUrl ? "Replace" : "Upload"}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0])}
              disabled={uploading} />
          </label>
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

      {metadataFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#050816] border border-slate-700 rounded-lg p-3">
          {metadataFields.map((field) => (
            <MetadataField
              key={field.key}
              field={field}
              value={metadata[field.key] ?? ""}
              onChange={(v) => setMeta(field.key, v)}
            />
          ))}
        </div>
      )}

      <div className="bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-2">
        <Label className="text-xs text-slate-300">Visibility</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {VISIBILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setVisibility(opt.value)}
              className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                visibility === opt.value
                  ? "bg-[#37F2D1]/15 border-[#37F2D1]/60 text-[#37F2D1]"
                  : "bg-[#0b1220] border-slate-600 text-slate-300 hover:border-slate-400"
              }`}
            >
              <div className="font-semibold">{opt.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{opt.hint}</div>
            </button>
          ))}
        </div>

        {visibility === "selected" && (
          <div className="pt-1">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
              Select players
            </div>
            {partyPlayers.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">No players in this campaign yet.</p>
            ) : (
              <ul className="space-y-1">
                {partyPlayers.map((p) => (
                  <li key={p.user_id} className="flex items-center gap-2 text-xs text-slate-300">
                    <Checkbox
                      checked={visibleTo.includes(p.user_id)}
                      onCheckedChange={() => togglePlayer(p.user_id)}
                    />
                    <span>{p.username || p.email || p.user_id}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[10px] text-slate-500 italic mt-1">
              Any player flagged as a mole in Campaign Settings also sees selected-visibility entries.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save Entry"}
        </Button>
      </div>
    </div>
  );
}

function MetadataField({ field, value, onChange }) {
  const { key, label, type = "text", options = [] } = field;
  if (type === "select") {
    return (
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-slate-400">{label}</Label>
        <Select value={String(value || "")} onValueChange={onChange}>
          <SelectTrigger className="bg-[#0b1220] border-slate-600 text-white h-9 text-xs mt-1">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-widest text-slate-400">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type === "number" ? "number" : "text"}
        className="bg-[#0b1220] border-slate-600 text-white h-9 text-xs mt-1"
      />
    </div>
  );
}
