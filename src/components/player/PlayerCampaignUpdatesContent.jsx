import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Send, Trash2, Pencil, Pin, PinOff, CheckCircle2, X, Megaphone, Check, Reply,
} from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/utils/timeAgo";

/**
 * Player-side Campaign Updates section. Lists GM-posted updates,
 * threaded comments under each. Player can post / edit / delete
 * own comments. GM moderation toolkit (visible only when
 * currentUser.id === campaign.game_master_id): edit any comment,
 * soft-delete, pin/unpin, mark thread resolved.
 *
 * Bubble badge backing: the parent CampaignPlayerPanel computes
 * unread = updates - reads and passes the count via the sidebar's
 * sectionBadges prop. When this section opens, we mark all
 * currently-displayed updates as read by upserting into
 * campaign_update_reads.
 */
export default function PlayerCampaignUpdatesContent({
  campaignId,
  campaign,
  user,
  allUserProfiles = [],
}) {
  const queryClient = useQueryClient();
  const isGM = !!campaign?.game_master_id && campaign.game_master_id === user?.id;

  const profilesById = useMemo(() => {
    const m = new Map();
    for (const p of allUserProfiles) m.set(p.user_id, p);
    return m;
  }, [allUserProfiles]);

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["campaignUpdates", campaignId],
    queryFn: () => base44.entities.CampaignUpdate.filter(
      { campaign_id: campaignId },
      "-created_at",
    ),
    enabled: !!campaignId,
    initialData: [],
  });

  // Mark all loaded updates as read for the current user. Fires
  // once per mount + once per `updates` length change so newly
  // arrived updates are auto-read while the section is open.
  useEffect(() => {
    if (!user?.id || !updates.length) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = updates.map((u) => ({
          user_id: user.id,
          campaign_update_id: u.id,
          read_at: new Date().toISOString(),
        }));
        // upsert ignores duplicates via the composite PK.
        await supabase
          .from("campaign_update_reads")
          .upsert(rows, { onConflict: "user_id,campaign_update_id", ignoreDuplicates: true });
        if (!cancelled) {
          queryClient.invalidateQueries({ queryKey: ["campaignUpdateReads", campaignId, user.id] });
        }
      } catch (err) {
        // Non-fatal — bubble badge will catch up on next refetch.
        console.warn("[campaign-updates] mark-read upsert failed:", err?.message || err);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, updates.length, campaignId, queryClient]);

  if (isLoading) {
    return <p className="text-slate-400 text-sm">Loading updates…</p>;
  }
  if (updates.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No campaign updates yet.</p>
        <p className="text-xs mt-1">When your GM posts an update, it'll show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {updates.map((update) => (
        <CampaignUpdateCard
          key={update.id}
          update={update}
          user={user}
          isGM={isGM}
          profilesById={profilesById}
        />
      ))}
    </div>
  );
}

function CampaignUpdateCard({ update, user, isGM, profilesById }) {
  const author = profilesById.get(update.created_by) || {};
  return (
    <article className="bg-[#151922] border border-slate-800 rounded-xl overflow-hidden">
      {update.image_url && (
        <img src={update.image_url} alt="" className="w-full h-48 object-cover" />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-xl font-bold text-white">{update.title}</h3>
          {update.is_pinned && (
            <span className="text-xs uppercase tracking-wider text-[#37F2D1] font-bold flex items-center gap-1">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <span>{author.username || "GM"}</span>
          <span>·</span>
          <span>{timeAgo(update.created_at || update.created_date)}</span>
        </div>
        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed mb-4">
          {update.content}
        </p>
        <CommentThread
          updateId={update.id}
          user={user}
          isGM={isGM}
          profilesById={profilesById}
        />
      </div>
    </article>
  );
}

function CommentThread({ updateId, user, isGM, profilesById }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState("");
  const [replyParentId, setReplyParentId] = useState(null);
  const [replyBody, setReplyBody] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: ["campaignUpdateComments", updateId],
    queryFn: () => base44.entities.CampaignUpdateComment.filter(
      { campaign_update_id: updateId },
      "created_at",
    ).catch(() => []),
    enabled: !!updateId,
    initialData: [],
  });

  // Top-level comments: pinned first, then chronological. Replies
  // (parent_comment_id set) get bucketed under their parent so the
  // render flattens to one indent tier — a reply to a reply hoists
  // up to the original parent's bucket so the thread doesn't
  // waterfall off the right edge.
  const { sorted, repliesByParent } = useMemo(() => {
    const byId = new Map(comments.map((c) => [c.id, c]));
    const top = [];
    const replies = new Map();
    for (const c of comments) {
      if (!c.parent_comment_id) { top.push(c); continue; }
      let rootId = c.parent_comment_id;
      const parent = byId.get(rootId);
      if (parent?.parent_comment_id) rootId = parent.parent_comment_id;
      if (!replies.has(rootId)) replies.set(rootId, []);
      replies.get(rootId).push(c);
    }
    top.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(a.created_at) - new Date(b.created_at);
    });
    for (const arr of replies.values()) {
      arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    return { sorted: top, repliesByParent: replies };
  }, [comments]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["campaignUpdateComments", updateId] });

  const create = useMutation({
    mutationFn: ({ text, parent_comment_id = null }) => base44.entities.CampaignUpdateComment.create({
      campaign_update_id: updateId,
      user_id: user?.id,
      body: text,
      parent_comment_id,
    }),
    onSuccess: () => {
      invalidate();
      setBody("");
      setReplyBody("");
      setReplyParentId(null);
    },
    onError: (err) => toast.error(err?.message || "Couldn't post comment."),
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => base44.entities.CampaignUpdateComment.update(id, { body }),
    onSuccess: () => { invalidate(); setEditingId(null); setEditBody(""); },
    onError: (err) => toast.error(err?.message || "Couldn't save edit."),
  });

  const softDelete = useMutation({
    mutationFn: (id) => base44.entities.CampaignUpdateComment.update(id, {
      is_deleted: true,
      deleted_by: user?.id,
    }),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err?.message || "Delete failed."),
  });

  const togglePin = useMutation({
    mutationFn: ({ id, next }) => base44.entities.CampaignUpdateComment.update(id, { is_pinned: next }),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err?.message || "Pin toggle failed."),
  });

  const toggleResolve = useMutation({
    mutationFn: ({ id, next }) => base44.entities.CampaignUpdateComment.update(id, { is_resolved: next }),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err?.message || "Resolve toggle failed."),
  });

  const send = () => {
    const text = body.trim();
    if (!text) return;
    create.mutate({ text });
  };

  const sendReply = (parentId) => {
    const text = replyBody.trim();
    if (!text) return;
    create.mutate({ text, parent_comment_id: parentId });
  };

  const beginEdit = (c) => {
    setEditingId(c.id);
    setEditBody(c.body);
  };

  const saveEdit = () => {
    const text = editBody.trim();
    if (!text || !editingId) return;
    update.mutate({ id: editingId, body: text });
  };

  const viewerProfile = profilesById?.get?.(user?.id) || {};

  return (
    <div className="space-y-3 mt-2 pt-4 border-t border-slate-800/60">
      {sorted.flatMap((top) => {
        const replies = repliesByParent.get(top.id) || [];
        const items = [top, ...replies];
        const out = items.map((c) => {
        const isReply = !!c.parent_comment_id;
        const author = profilesById?.get?.(c.user_id) || {};
        const canEdit = isGM || c.user_id === user?.id;
        const canDelete = isGM || c.user_id === user?.id;
        const isEditing = editingId === c.id;

        // Soft-deleted: show placeholder, hide actions, keep thread spot.
        if (c.is_deleted) {
          return (
            <div
              key={c.id}
              className={`bg-[#0f1219] border border-slate-800/30 rounded-lg p-3 italic text-xs text-slate-600 ${isReply ? "ml-12" : "ml-8"}`}
            >
              [comment deleted]
            </div>
          );
        }

        return (
          <div
            key={c.id}
            className={`bg-[#151922] border rounded-lg p-4 ${isReply ? "ml-12" : "ml-8"} ${
              c.is_pinned ? "border-[#37F2D1]/40" : "border-slate-800/50"
            } ${c.is_resolved ? "opacity-60" : ""}`}
          >
            <div className="flex items-start gap-3">
              {author.avatar_url ? (
                <img src={author.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-[#37F2D1] font-semibold">
                    {author.username || "Unknown"}
                  </span>
                  {c.is_pinned && (
                    <span className="text-[10px] uppercase tracking-wider text-[#37F2D1]/80 font-bold flex items-center gap-0.5">
                      <Pin className="w-3 h-3" /> Pinned
                    </span>
                  )}
                  {c.is_resolved && (
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Resolved
                    </span>
                  )}
                  <span className="text-xs text-slate-600">{timeAgo(c.created_at)}</span>
                  {c.updated_at && c.updated_at !== c.created_at && (
                    <span className="text-[10px] text-slate-700">(edited)</span>
                  )}
                </div>
                {isEditing ? (
                  <div className="mt-2">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full bg-[#0f1219] border border-slate-700 rounded px-3 py-2 text-sm text-white"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={saveEdit} disabled={!editBody.trim() || update.isPending}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditBody(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                )}
              </div>
              {!isEditing && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!isReply && (
                    <button
                      onClick={() => {
                        setReplyParentId(replyParentId === c.id ? null : c.id);
                        setReplyBody("");
                      }}
                      className="text-slate-500 hover:text-[#37F2D1] p-1 rounded"
                      title={replyParentId === c.id ? "Cancel reply" : "Reply"}
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => beginEdit(c)}
                      className="text-slate-500 hover:text-[#37F2D1] p-1 rounded"
                      title="Edit comment"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isGM && (
                    <>
                      <button
                        onClick={() => togglePin.mutate({ id: c.id, next: !c.is_pinned })}
                        className="text-slate-500 hover:text-[#37F2D1] p-1 rounded"
                        title={c.is_pinned ? "Unpin" : "Pin to top"}
                      >
                        {c.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => toggleResolve.mutate({ id: c.id, next: !c.is_resolved })}
                        className="text-slate-500 hover:text-[#37F2D1] p-1 rounded"
                        title={c.is_resolved ? "Unmark resolved" : "Mark resolved"}
                      >
                        {c.is_resolved ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => {
                        if (confirm("Delete this comment?")) softDelete.mutate(c.id);
                      }}
                      className="text-slate-500 hover:text-red-400 p-1 rounded"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
        });
        if (replyParentId === top.id) {
          out.push(
            <div key={`reply-composer-${top.id}`} className="flex gap-3 ml-12">
              {viewerProfile.avatar_url ? (
                <img src={viewerProfile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" />
              )}
              <div className="flex-1 flex gap-2">
                <input
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(top.id); } }}
                  placeholder="Reply…"
                  autoFocus
                  className="flex-1 bg-[#0f1219] border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#37F2D1]"
                />
                <Button
                  size="sm"
                  onClick={() => sendReply(top.id)}
                  disabled={!replyBody.trim() || create.isPending}
                  className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-bold"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        }
        return out;
      })}

      <div className="flex gap-3 ml-8 mt-3">
        {viewerProfile.avatar_url ? (
          <img src={viewerProfile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" />
        )}
        <div className="flex-1 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Add a comment..."
            className="flex-1 bg-[#0f1219] border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#37F2D1]"
          />
          <Button
            size="sm"
            onClick={send}
            disabled={!body.trim() || create.isPending}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-bold"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
