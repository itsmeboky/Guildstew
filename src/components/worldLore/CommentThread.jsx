import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Send, Trash2, Reply } from "lucide-react";
import { timeAgo } from "@/utils/timeAgo";

/**
 * Threaded comments for a world-lore entry. Reads
 * WorldLoreComment rows keyed by entry_id. Anyone who can see the
 * entry can post a comment; only the comment's author or the GM
 * can delete it. Replies are one level deep — a reply to a reply
 * still files under the original parent so the indent stays at one
 * tier and the thread doesn't waterfall off the right edge.
 */
export default function CommentThread({
  entryId, user, isGM, profilesById,
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [replyParentId, setReplyParentId] = useState(null);
  const [replyBody, setReplyBody] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: ["worldLoreComments", entryId],
    queryFn: () => base44.entities.WorldLoreComment
      .filter({ entry_id: entryId }, "created_at")
      .catch(() => []),
    enabled: !!entryId,
    initialData: [],
  });

  // Group replies under their parent. One level deep — if a reply
  // somehow got a parent_comment_id pointing at another reply, hoist
  // it up to the original top-level parent so the render never nests
  // beyond two tiers.
  const { topLevel, repliesByParent } = useMemo(() => {
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
    return { topLevel: top, repliesByParent: replies };
  }, [comments]);

  const createMutation = useMutation({
    mutationFn: ({ content, parent_comment_id = null }) => base44.entities.WorldLoreComment.create({
      entry_id: entryId,
      author_id: user?.id || null,
      content,
      parent_comment_id,
      created_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worldLoreComments", entryId] });
      setBody("");
      setReplyBody("");
      setReplyParentId(null);
    },
    onError: (err) => toast.error(err?.message || "Couldn't post comment."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorldLoreComment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["worldLoreComments", entryId] }),
    onError: (err) => toast.error(err?.message || "Delete failed."),
  });

  const viewerProfile = profilesById?.get?.(user?.id) || {};

  const send = () => {
    const text = body.trim();
    if (!text) return;
    createMutation.mutate({ content: text });
  };

  const sendReply = (parentId) => {
    const text = replyBody.trim();
    if (!text) return;
    createMutation.mutate({ content: text, parent_comment_id: parentId });
  };

  const renderComment = (c, { isReply = false } = {}) => {
    const author = profilesById?.get?.(c.author_id) || {};
    const canDelete = isGM || c.author_id === user?.id;
    return (
      <div
        key={c.id}
        className={`bg-[#151922] border border-slate-800/50 rounded-lg p-4 ${isReply ? "ml-12" : "ml-8"}`}
      >
        <div className="flex items-start gap-3">
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#37F2D1] font-semibold">
                {author.username || "Unknown"}
              </span>
              <span className="text-xs text-slate-600">{timeAgo(c.created_at)}</span>
            </div>
            <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">{c.content}</p>
            {!isReply && (
              <button
                type="button"
                onClick={() => {
                  setReplyParentId(replyParentId === c.id ? null : c.id);
                  setReplyBody("");
                }}
                className="text-xs text-slate-500 hover:text-[#37F2D1] mt-2 inline-flex items-center gap-1"
              >
                <Reply className="w-3 h-3" /> {replyParentId === c.id ? "Cancel" : "Reply"}
              </button>
            )}
          </div>
          {canDelete && (
            <button
              onClick={() => {
                if (confirm("Delete this comment?")) deleteMutation.mutate(c.id);
              }}
              className="text-slate-500 hover:text-red-400 p-1 rounded"
              title="Delete comment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 mt-4">
      {topLevel.map((c) => (
        <React.Fragment key={c.id}>
          {renderComment(c)}
          {(repliesByParent.get(c.id) || []).map((r) => renderComment(r, { isReply: true }))}
          {replyParentId === c.id && (
            <div className="flex gap-3 ml-12">
              {viewerProfile.avatar_url ? (
                <img src={viewerProfile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" />
              )}
              <div className="flex-1 flex gap-2">
                <input
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendReply(c.id); } }}
                  placeholder="Reply…"
                  autoFocus
                  className="flex-1 bg-[#0f1219] border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#37F2D1]"
                />
                <Button
                  size="sm"
                  onClick={() => sendReply(c.id)}
                  disabled={!replyBody.trim() || createMutation.isPending}
                  className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-bold"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </React.Fragment>
      ))}

      <div className="flex gap-3 ml-8 mt-4">
        {viewerProfile.avatar_url ? (
          <img src={viewerProfile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" />
        )}
        <div className="flex-1 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
            placeholder="Add a comment..."
            className="flex-1 bg-[#0f1219] border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#37F2D1]"
          />
          <Button
            size="sm"
            onClick={send}
            disabled={!body.trim() || createMutation.isPending}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-bold"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
