import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { createReply, isAdminEmail } from "@/lib/forumsClient";
import { CREAM } from "@/pages/Forums";

/**
 * Reply composer at the bottom of a thread.
 *
 * Uses a bare textarea + button rather than the shadcn Textarea so
 * the cream-theme styling stays consistent inside the creamsicle
 * page. `is_dev_reply` is auto-set when the author is an admin.
 */
export default function ReplyForm({ thread }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const post = useMutation({
    mutationFn: async () => {
      if (!content.trim()) throw new Error("Write something before posting.");
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
      <textarea
        rows={5}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Markdown supported (headings, bold, italic, links, code, lists)."
        className="w-full rounded-md border text-sm p-2 outline-none font-mono leading-relaxed"
        style={{
          backgroundColor: CREAM.pageBg,
          color: CREAM.textPrimary,
          borderColor: CREAM.cardBorder,
        }}
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => post.mutate()}
          disabled={post.isPending || !content.trim()}
          className="text-sm font-black px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: CREAM.accent, color: "#FFF8F3" }}
        >
          {post.isPending ? "Posting…" : "Post Reply"}
        </button>
      </div>
    </div>
  );
}
