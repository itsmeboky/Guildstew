import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/AuthContext";
import { createThread, isAdminEmail } from "@/lib/forumsClient";

/**
 * New Thread dialog.
 *
 * Called from the category view. Posting in a dev-only category
 * stamps `is_dev_post` true when the author is an admin.
 * Category-view already hides the "New Thread" button for
 * non-admins on dev-only categories, but we re-check here as a
 * belt-and-suspenders guard.
 */
export default function NewThreadDialog({ open, onClose, category }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  React.useEffect(() => {
    if (open) { setTitle(""); setContent(""); }
  }, [open]);

  const isAdmin = isAdminEmail(user?.email);
  const blocked = !!category?.is_dev_only && !isAdmin;

  const post = useMutation({
    mutationFn: async () => {
      if (blocked) throw new Error("Only admins can post in this category.");
      if (!title.trim()) throw new Error("Title is required.");
      if (!content.trim()) throw new Error("Content is required.");
      return createThread({
        category_id: category.id,
        author_id: user.id,
        title: title.trim(),
        content,
        is_dev_post: isAdmin,
      });
    },
    onSuccess: (thread) => {
      toast.success("Thread posted");
      queryClient.invalidateQueries({ queryKey: ["forumThreads", category.id] });
      queryClient.invalidateQueries({ queryKey: ["forumCategoryStats"] });
      onClose?.();
      if (thread?.slug) navigate(`/forums/${category.slug}/${thread.slug}`);
    },
    onError: (err) => toast.error(err?.message || "Post failed"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle>New Thread · {category?.name}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Markdown supported (headings, bold, italic, links, code, lists).
          </DialogDescription>
        </DialogHeader>

        {blocked && (
          <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded p-2">
            Only the Guildstew team can post in this category.
          </p>
        )}

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's this thread about?"
              className="bg-[#050816] border-slate-700 text-white mt-1"
              disabled={blocked}
            />
          </div>
          <div>
            <Label className="text-xs">Content (Markdown)</Label>
            <Textarea
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-[#050816] border-slate-700 text-white mt-1 font-mono text-xs leading-relaxed"
              placeholder="Share your thoughts, questions, or story."
              disabled={blocked}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => post.mutate()}
            disabled={post.isPending || blocked}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            {post.isPending ? "Posting…" : "Post Thread"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
