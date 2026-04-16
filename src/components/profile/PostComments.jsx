import React, { useState } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Inline comment list + input rendered under each post card.
 *
 * Props:
 *   post            — the posts row; comments live on `post.comments`
 *                     as a JSONB array of { id, user_id, username,
 *                     avatar_url, content, created_at }.
 *   currentUser     — the viewing user (from the parent's useQuery).
 *   onAddComment    — called with the trimmed new comment text.
 *   onDeleteComment — called with a comment id. Only surfaced when
 *                     the current user authored the comment or owns
 *                     the post.
 *   adding          — boolean; lets the parent disable the submit
 *                     button while the mutation is in flight.
 */
export default function PostComments({ post, currentUser, onAddComment, onDeleteComment, adding = false }) {
  const comments = Array.isArray(post?.comments) ? post.comments : [];
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onAddComment?.(text);
    setDraft("");
    setOpen(true);
  };

  const canDelete = (c) =>
    currentUser?.id && (c.user_id === currentUser.id || post.profile_user_id === currentUser.id);

  return (
    <div className="pt-2 border-t border-gray-700/40 mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-gray-400 hover:text-[#37F2D1] transition-colors text-sm"
      >
        <MessageCircle className="w-5 h-5" />
        <span>{comments.length}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {comments.length === 0 ? (
            <p className="text-xs text-gray-500 italic">Be the first to comment.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id || c.created_at} className="flex items-start gap-2 bg-[#0f1419] border border-gray-700/40 rounded-lg p-2">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#37F2D1]/20 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                    {(c.username || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">{c.username || "Unknown"}</span>
                    <span className="text-[10px] text-gray-500 flex-shrink-0">
                      {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
                    </span>
                    {canDelete(c) && onDeleteComment && (
                      <button
                        type="button"
                        onClick={() => onDeleteComment(c.id)}
                        className="ml-auto text-gray-500 hover:text-red-400"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap mt-0.5">{c.content}</p>
                </div>
              </div>
            ))
          )}

          {currentUser?.id && (
            <div className="flex items-center gap-2 pt-1">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder="Write a comment…"
                className="bg-[#2A3441] border-gray-700 text-white text-sm"
              />
              <button
                type="button"
                onClick={submit}
                disabled={adding || !draft.trim()}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] disabled:opacity-40 disabled:cursor-not-allowed text-[#050816] font-bold px-3 py-2 rounded-lg flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                Post
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
