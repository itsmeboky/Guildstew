import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus, Search, Pencil, Trash2, ArrowLeft, Pin, Lock, Eye, Edit,
} from "lucide-react";
import {
  filterByVisibility,
  stripHtml,
} from "@/utils/worldLoreVisibility";
import { timeAgo, formatDate } from "@/utils/timeAgo";
import { templateById } from "@/data/worldLoreTemplates";
import EntryForm from "./EntryForm";
import GatedEntryView from "./GatedEntryView";
import CommentThread from "./CommentThread";

/**
 * Forum-style shared view for the five entry-based categories.
 * State machine:
 *   list    — default thread list
 *   detail  — forum post + comments for the selected entry
 *   new     — empty form
 *   edit    — form prefilled with the selected entry
 */
export default function EntryCategoryView({
  campaignId,
  user,
  isGM,
  isMole,
  partyPlayers = [],
  profiles = [],
  categoryKey,
  emptyLabel,
  metadataFields = [],
  renderList,
  campaign,
  viewerCharacter,
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ["worldLoreEntries", campaignId, categoryKey],
    queryFn: () => base44.entities.WorldLoreEntry
      .filter({ campaign_id: campaignId, category: categoryKey }, "-created_at")
      .catch(() => []),
    enabled: !!campaignId && !!categoryKey,
    initialData: [],
  });

  // Comment counts per entry — one query, grouped client-side.
  const { data: allComments = [] } = useQuery({
    queryKey: ["worldLoreCommentCounts", campaignId, categoryKey],
    queryFn: async () => {
      const entryIds = allEntries.map((e) => e.id);
      if (entryIds.length === 0) return [];
      // WorldLoreComment.filter doesn't support "in" natively — grab
      // everything for the campaign's entries and count client-side.
      const lists = await Promise.all(entryIds.map((id) =>
        base44.entities.WorldLoreComment.filter({ entry_id: id }).catch(() => [])
      ));
      return lists.flat();
    },
    enabled: allEntries.length > 0,
    initialData: [],
  });
  const commentsByEntry = useMemo(() => {
    const m = new Map();
    for (const c of allComments) {
      m.set(c.entry_id, (m.get(c.entry_id) || 0) + 1);
    }
    return m;
  }, [allComments]);

  const profilesById = useMemo(() => {
    const m = new Map();
    for (const p of profiles) m.set(p.user_id, p);
    if (user?.id) m.set(user.id, { ...(m.get(user.id) || {}), ...user });
    return m;
  }, [profiles, user]);

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

  // Pinned entries sort first, then by newest.
  const ordered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (!!a.is_pinned !== !!b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [filtered]);

  const selected = useMemo(
    () => visibleEntries.find((e) => e.id === selectedId) || null,
    [visibleEntries, selectedId],
  );

  const writeMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.id) return base44.entities.WorldLoreEntry.update(payload.id, payload);
      return base44.entities.WorldLoreEntry.create({
        ...payload,
        campaign_id: campaignId,
        category: categoryKey,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["worldLoreEntries", campaignId, categoryKey] });
      queryClient.invalidateQueries({ queryKey: ["worldLoreEntriesAll", campaignId] });
      setMode(row?.id ? "detail" : "list");
      if (row?.id) setSelectedId(row.id);
      toast.success("Entry saved.");
    },
    onError: (err) => toast.error(err?.message || "Save failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorldLoreEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worldLoreEntries", campaignId, categoryKey] });
      queryClient.invalidateQueries({ queryKey: ["worldLoreEntriesAll", campaignId] });
      setSelectedId(null);
      setMode("list");
      toast.success("Entry deleted.");
    },
    onError: (err) => toast.error(err?.message || "Delete failed."),
  });

  // ─── NEW / EDIT ──────────────────────────────────────────────────
  if (mode === "new" || mode === "edit") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setMode(selected ? "detail" : "list")}
          className="text-xs text-slate-400 hover:text-[#37F2D1] flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" /> {selected ? "Back to entry" : "Back to list"}
        </button>
        <EntryForm
          initial={mode === "edit" ? selected : null}
          categoryKey={categoryKey}
          categoryMetadataFields={metadataFields}
          partyPlayers={partyPlayers}
          campaignId={campaignId}
          saving={writeMutation.isPending}
          onCancel={() => setMode(selected ? "detail" : "list")}
          onSave={(payload) => writeMutation.mutate(payload)}
        />
      </div>
    );
  }

  // ─── DETAIL ──────────────────────────────────────────────────────
  if (mode === "detail" && selected) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => { setMode("list"); setSelectedId(null); }}
          className="text-xs text-slate-400 hover:text-[#37F2D1] flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" /> Back to list
        </button>

        <EntryDetail
          entry={selected}
          profilesById={profilesById}
          metadataFields={metadataFields}
          isGM={isGM}
          campaign={campaign}
          character={viewerCharacter}
          onEdit={() => setMode("edit")}
          onDelete={() => {
            if (confirm(`Delete "${selected.title}"?`)) deleteMutation.mutate(selected.id);
          }}
        />

        <CommentThread
          entryId={selected.id}
          user={user}
          isGM={isGM}
          profilesById={profilesById}
        />
      </div>
    );
  }

  // ─── LIST ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries…"
            className="pl-7 bg-[#0f1219] border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>
        {isGM && (
          <Button
            onClick={() => { setSelectedId(null); setMode("new"); }}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> New Entry
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500 italic text-center py-12">Loading entries…</div>
      ) : ordered.length === 0 ? (
        <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-10 text-center text-slate-500 text-sm italic">
          {emptyLabel || "No entries yet."}
        </div>
      ) : renderList ? (
        renderList({
          entries: ordered,
          profilesById,
          commentsByEntry,
          onSelect: (id) => { setSelectedId(id); setMode("detail"); },
        })
      ) : (
        <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg divide-y divide-slate-700/30">
          {ordered.map((entry) => (
            <ForumRow
              key={entry.id}
              entry={entry}
              authorProfile={profilesById.get(entry.created_by)}
              commentCount={commentsByEntry.get(entry.id) || 0}
              onClick={() => { setSelectedId(entry.id); setMode("detail"); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ForumRow({ entry, authorProfile, commentCount, onClick }) {
  const preview = stripHtml(entry.content).slice(0, 140);
  const template = templateById(entry.template_type);
  return (
    <div
      onClick={onClick}
      className="flex items-center p-4 hover:bg-[#252b3d] transition-colors cursor-pointer"
    >
      {entry.is_pinned && <Pin className="w-4 h-4 text-[#37F2D1] mr-3 flex-shrink-0" />}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-semibold truncate">{entry.title}</span>
          {entry.visibility === "gm_only"  && <Lock className="w-3 h-3 text-red-400" title="GM only" />}
          {entry.visibility === "selected" && <Eye  className="w-3 h-3 text-amber-400" title="Selected players" />}
          {template && template.id !== "freeform" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 uppercase tracking-wider">
              {template.label}
            </span>
          )}
        </div>
        {preview && (
          <div className="text-sm text-slate-400 truncate mt-0.5">
            {preview}{stripHtml(entry.content).length > 140 ? "…" : ""}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mx-6 flex-shrink-0">
        {authorProfile?.avatar_url ? (
          <img src={authorProfile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-700" />
        )}
        <div className="text-right">
          <div className="text-xs text-[#37F2D1]">{authorProfile?.username || "GM"}</div>
          <div className="text-xs text-slate-500">{timeAgo(entry.created_at)}</div>
        </div>
      </div>

      <div className="text-center flex-shrink-0 w-16">
        <div className="text-sm font-bold text-slate-300">{commentCount}</div>
        <div className="text-xs text-slate-500">replies</div>
      </div>
    </div>
  );
}

function EntryDetail({ entry, profilesById, metadataFields, isGM, campaign, character, onEdit, onDelete }) {
  const author = profilesById.get(entry.created_by) || {};
  const template = templateById(entry.template_type);
  const structuredMetadataKeys = template.fields?.map((f) => f.key) || [];

  // Render the entry body through the gated-view wrapper. It
  // handles skill/ability locks, language comprehension tiers, and
  // Thieves' Cant / Druidic annotations. GMs pass through unblocked.
  const renderBody = () => (
    <>
      {template.id !== "freeform" && structuredMetadataKeys.length > 0 && (
        <div className="space-y-3 mb-5">
          {template.fields.map((field) => {
            const val = entry?.metadata?.[field.key];
            if (!val) return null;
            if (field.type === "image") {
              return (
                <div key={field.key}>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">{field.label}</div>
                  <img src={val} alt="" className="max-h-80 rounded-lg border border-slate-700" />
                </div>
              );
            }
            return (
              <div key={field.key} className="bg-[#0f1219] border border-slate-700 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">{field.label}</div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{val}</p>
              </div>
            );
          })}
        </div>
      )}

      {template.id === "freeform" && entry.content && (
        <div
          className="prose prose-invert max-w-none text-slate-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: entry.content }}
        />
      )}
    </>
  );

  return (
    <article className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-6">
      <header className="flex items-start gap-4 mb-6">
        {author.avatar_url ? (
          <img src={author.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-700 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[#37F2D1] font-semibold">{author.username || "GM"}</div>
          <div className="text-xs text-slate-500">{formatDate(entry.created_at)}</div>
          <h1 className="text-2xl font-bold text-white mt-2">{entry.title}</h1>
        </div>
        <VisibilityPill visibility={entry.visibility} />
      </header>

      {/* Category-level metadata (e.g., Region type, Faction alignment) */}
      {metadataFields.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-5">
          {metadataFields.map((field) => {
            const val = entry?.metadata?.[field.key];
            if (!val && val !== 0) return null;
            return (
              <div key={field.key} className="bg-[#0f1219] border border-slate-700 rounded-lg p-2">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{field.label}</div>
                <div className="text-sm text-white font-semibold">{String(val)}</div>
              </div>
            );
          })}
        </div>
      )}

      <GatedEntryView
        entry={entry}
        character={character}
        campaign={campaign}
        isGM={isGM}
        renderBody={renderBody}
      />

      {entry.image_url && (
        <img
          src={entry.image_url}
          alt=""
          className="mt-6 rounded-lg border border-slate-700 max-h-96 object-cover w-full"
        />
      )}

      {Array.isArray(entry.images) && entry.images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mt-6">
          {entry.images.map((img, idx) => (
            <img
              key={`${img}-${idx}`}
              src={img}
              alt=""
              className="rounded-lg border border-slate-700 w-full object-cover max-h-80"
            />
          ))}
        </div>
      )}

      {isGM && (
        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-700/50">
          <Button variant="ghost" size="sm" onClick={onEdit} className="text-slate-300 hover:text-white">
            <Pencil className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </div>
      )}
    </article>
  );
}

function VisibilityPill({ visibility }) {
  if (visibility === "gm_only") {
    return (
      <span className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 border border-red-800/30">
        GM Only
      </span>
    );
  }
  if (visibility === "selected") {
    return (
      <span className="text-xs px-2 py-1 rounded bg-amber-900/30 text-amber-400 border border-amber-800/30">
        Limited
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-1 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-800/30">
      Public
    </span>
  );
}
