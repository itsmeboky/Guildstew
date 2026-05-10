import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { createReply, isAdminEmail } from "@/lib/forumsClient";
import { CREAM } from "@/pages/Forums";
import ForumRichTextEditor from "@/components/forums/ForumRichTextEditor";

/**
 * Reply composer at the bottom of a thread.
 *
 * Wraps the shared ForumRichTextEditor (Quill) so replies have the
 * same formatting + image-embed capabilities as new threads.
 * `is_dev_reply` is auto-set when the author is an admin.
 */
export default function ReplyForm({ thread }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const isContentEmpty = (html) =>
    !html
      ?.replace(/<[^>]*>/g, "")
      .replace(/&nbsp;|&amp;|&lt;|&gt;/g, " ")
      .trim();

  const post = useMutation({
    mutationFn: async () => {
      if (isContentEmpty(content)) throw new Error("Write something before posting.");
      return createReply({
        thread_id: thread.id,
        author_id: user.id,
        content,
        is_dev_reply: isAdminEmail(user?.email),
      });
    },
    onSuccess: () => {
      setContent("");
      toast.success("Reply posted");
      queryClient.invalidateQueries({ queryKey: ["forumReplies", thread.id] });
      queryClient.invalidateQueries({ queryKey: ["forumThread"] });
      queryClient.invalidateQueries({ queryKey: ["forumCategoryStats"] });
    },
    onError: (err) => toast.error(err?.message || "Reply failed"),
  });

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: CREAM.card, borderColor: CREAM.cardBorder }}
    >
      <p className="text-xs uppercase tracking-widest font-black mb-2" style={{ color: CREAM.textMuted }}>
        Reply
      </p>
      <div className="forum-quill-cream">
        <ForumRichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Share your reply — toolbar for formatting, paste a screenshot to embed an image."
          minHeight={140}
        />
      </div>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => post.mutate()}
          disabled={post.isPending || isContentEmpty(content)}
          className="text-sm font-black px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: CREAM.accent, color: "#FFF8F3" }}
        >
          {post.isPending ? "Posting…" : "Post Reply"}
        </button>
      </div>
    </div>
  );
}
