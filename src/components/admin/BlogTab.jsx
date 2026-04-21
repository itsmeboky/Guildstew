import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Plus, Edit3, Trash2, Eye, Star, FileText, CheckSquare, Square,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

/**
 * Admin → Blog.
 *
 * Drafts + published posts live in `blog_posts`. This surface is the
 * only write path for the table — the homepage Blog card and the
 * `/blog/:slug` detail page both read from here.
 *
 * "Rich text editor" is intentionally the existing Textarea with a
 * markdown hint — pulling in a dedicated editor (TipTap / Lexical)
 * would bloat the bundle and slow every admin load for a surface
 * that admins touch occasionally. Markdown coverage (headings, bold,
 * italic, links, code blocks, images) is enough for the first pass.
 */

const CATEGORIES = [
  { value: "tutorial",     label: "Tutorial" },
  { value: "article",      label: "Article" },
  { value: "announcement", label: "Announcement" },
  { value: "patch_notes",  label: "Patch Notes" },
  { value: "community",    label: "Community" },
];

const CATEGORY_LABEL = CATEGORIES.reduce((acc, c) => { acc[c.value] = c.label; return acc; }, {});

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export default function BlogTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editor, setEditor] = useState({ open: false, post: null });
  const [selected, setSelected] = useState(new Set());

  const { data: posts = [] } = useQuery({
    queryKey: ["adminBlogPosts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (statusFilter === "published" && !p.is_published) return false;
      if (statusFilter === "draft" && p.is_published) return false;
      if (statusFilter === "featured" && !p.is_featured) return false;
      if (q) {
        const hay = `${p.title || ""} ${p.summary || ""} ${(p.tags || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [posts, search, statusFilter]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["adminBlogPosts"] });

  const savePost = useMutation({
    mutationFn: async (row) => {
      const payload = { ...row, updated_at: new Date().toISOString() };
      if (row.id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", row.id);
        if (error) throw error;
        return row.id;
      }
      const insert = {
        ...payload,
        author_id: user?.id || null,
        author_name: user?.username || user?.full_name || user?.email || null,
      };
      const { data, error } = await supabase.from("blog_posts").insert(insert).select().maybeSingle();
      if (error) throw error;
      return data?.id;
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (err) => toast.error(err?.message || "Save failed"),
  });

  const setPublish = useMutation({
    mutationFn: async ({ id, publish }) => {
      const patch = publish
        ? { is_published: true, published_at: new Date().toISOString() }
        : { is_published: false };
      const { error } = await supabase.from("blog_posts").update(patch).eq("id", id);
      if (error) throw error;
      return publish;
    },
    onSuccess: (publish) => {
      toast.success(publish ? "Post published" : "Post unpublished");
      invalidate();
    },
    onError: (err) => { console.error("Publish blog post", err); toast.error(`Failed to save: ${err?.message || err}`); },
  });

  const setFeatured = useMutation({
    mutationFn: async ({ id, value }) => {
      const { error } = await supabase.from("blog_posts").update({ is_featured: value }).eq("id", id);
      if (error) throw error;
      return value;
    },
    onSuccess: (value) => { toast.success(value ? "Featured" : "Unfeatured"); invalidate(); },
    onError: (err) => { console.error("Feature blog post", err); toast.error(`Failed to save: ${err?.message || err}`); },
  });

  const deletePost = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (err) => { console.error("Delete blog post", err); toast.error(`Failed to delete: ${err?.message || err}`); },
  });

  const toggleSelected = (id) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulk = async (action) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      const run = (patch) => supabase.from("blog_posts").update(patch).in("id", ids);
      let res;
      if (action === "publish") {
        res = await run({ is_published: true, published_at: new Date().toISOString() });
      } else if (action === "unpublish") {
        res = await run({ is_published: false });
      } else if (action === "feature") {
        res = await run({ is_featured: true });
      } else if (action === "unfeature") {
        res = await run({ is_featured: false });
      }
      if (res?.error) throw res.error;
      toast.success(`${ids.length} post${ids.length === 1 ? "" : "s"} updated`);
      setSelected(new Set());
      invalidate();
    } catch (err) {
      console.error("Bulk update", err);
      toast.error(`Failed to save: ${err?.message || err}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#37F2D1]" /> Blog
          </h2>
          <p className="text-xs text-slate-500">
            {posts.length} total · {posts.filter((p) => p.is_published).length} published · {posts.filter((p) => p.is_featured).length} featured
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#0b1220] border-slate-700 text-white h-8 w-64"
              placeholder="Search title / tags…"
            />
          </div>
          {["all", "published", "draft", "featured"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`text-[11px] uppercase tracking-widest font-bold px-3 py-1 rounded-full border ${
                statusFilter === s
                  ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                  : "bg-[#0b1220] text-slate-400 border-slate-700 hover:border-slate-500"
              }`}
            >
              {s}
            </button>
          ))}
          <Button
            size="sm"
            onClick={() => setEditor({ open: true, post: null })}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Plus className="w-3 h-3 mr-1" /> New Post
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulk("publish")}>Publish</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("unpublish")}>Unpublish</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("feature")}>Feature</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("unfeature")}>Unfeature</Button>
          <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className="bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0b1220] text-slate-400 text-[11px] uppercase tracking-widest">
            <tr>
              <th className="text-left px-3 py-2 w-8"></th>
              <th className="text-left px-3 py-2">Title</th>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Published</th>
              <th className="text-left px-3 py-2">Views</th>
              <th className="text-center px-3 py-2">Featured</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-slate-500 py-10">No posts match this filter.</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => toggleSelected(p.id)} className="text-slate-400 hover:text-white">
                      {selected.has(p.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {p.cover_image_url
                        ? <img src={p.cover_image_url} alt="" className="w-10 h-10 rounded object-cover" />
                        : <div className="w-10 h-10 rounded bg-[#050816] border border-slate-700" />}
                      <div>
                        <p className="text-white font-bold">{p.title}</p>
                        <p className="text-[10px] text-slate-500">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#050816] border border-slate-700 text-slate-300">
                      {CATEGORY_LABEL[p.category] || p.category}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] font-bold uppercase rounded px-2 py-0.5 ${
                      p.is_published ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-300"
                    }`}>
                      {p.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-400">
                    {p.published_at ? new Date(p.published_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {p.view_count || 0}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button type="button" onClick={() => setFeatured.mutate({ id: p.id, value: !p.is_featured })}>
                      <Star className={`w-4 h-4 ${p.is_featured ? "text-amber-400 fill-amber-400" : "text-slate-600"}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditor({ open: true, post: p })}>
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      {p.is_published
                        ? <Button size="sm" variant="outline" onClick={() => setPublish.mutate({ id: p.id, publish: false })}>Unpub.</Button>
                        : <Button size="sm" variant="outline" onClick={() => setPublish.mutate({ id: p.id, publish: true })}>Publish</Button>}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { if (confirm(`Delete "${p.title}"?`)) deletePost.mutate(p.id); }}
                        className="border-red-500/50 text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BlogEditor
        open={editor.open}
        post={editor.post}
        onClose={() => setEditor({ open: false, post: null })}
        onSave={(row) => savePost.mutate(row)}
      />
    </div>
  );
}

function BlogEditor({ open, post, onClose, onSave }) {
  const [form, setForm] = useState(() => initForm(post));
  const [slugTouched, setSlugTouched] = useState(false);

  React.useEffect(() => {
    if (open) {
      setForm(initForm(post));
      setSlugTouched(!!post?.slug);
    }
  }, [open, post?.id]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onTitle = (v) => {
    set({ title: v, ...(slugTouched ? {} : { slug: slugify(v) }) });
  };

  const save = (publish) => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.slug.trim()) { toast.error("Slug is required"); return; }
    if (!form.content.trim()) { toast.error("Content is required"); return; }

    const row = {
      ...(post?.id ? { id: post.id } : {}),
      title: form.title.trim(),
      slug: form.slug.trim(),
      category: form.category,
      summary: form.summary.trim() || null,
      content: form.content,
      cover_image_url: form.cover_image_url.trim() || null,
      tags: form.tags,
      is_featured: form.is_featured,
    };
    if (publish === true) {
      row.is_published = true;
      row.published_at = new Date().toISOString();
    } else if (publish === false) {
      row.is_published = false;
    } else if (!post?.id) {
      // First save, no explicit action → keep as draft.
      row.is_published = false;
    }

    onSave(row);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post?.id ? "Edit Post" : "New Post"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Markdown is supported in Content (headings, bold, italic, links, code, images).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={form.title} onChange={(e) => onTitle(e.target.value)} className="bg-[#050816] border-slate-700 text-white mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }}
                className="bg-[#050816] border-slate-700 text-white mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => set({ category: v })}>
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Summary (shown on homepage card, 1–3 sentences)</Label>
            <Textarea rows={2} value={form.summary} onChange={(e) => set({ summary: e.target.value })} className="bg-[#050816] border-slate-700 text-white mt-1" />
          </div>
          <div>
            <Label className="text-xs">Content (Markdown)</Label>
            <Textarea
              rows={14}
              value={form.content}
              onChange={(e) => set({ content: e.target.value })}
              className="bg-[#050816] border-slate-700 text-white mt-1 font-mono text-xs leading-relaxed"
              placeholder="# Heading\n\nBody paragraph. **bold**, *italic*, [link](https://…), `code`, ![alt](image-url)"
            />
          </div>
          <div>
            <Label className="text-xs">Cover Image URL</Label>
            <Input value={form.cover_image_url} onChange={(e) => set({ cover_image_url: e.target.value })} className="bg-[#050816] border-slate-700 text-white mt-1" placeholder="https://…" />
          </div>
          <div>
            <Label className="text-xs">Tags (comma-separated)</Label>
            <Input
              value={form.tags.join(", ")}
              onChange={(e) => set({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
              className="bg-[#050816] border-slate-700 text-white mt-1"
              placeholder="tutorial, combat, dm-tips"
            />
          </div>
          <div className="flex items-center justify-between bg-[#050816] border border-slate-700 rounded p-2">
            <Label className="text-xs text-slate-300">Featured (pinned to top)</Label>
            <Switch checked={!!form.is_featured} onCheckedChange={(v) => set({ is_featured: v })} />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => save(false)}>Save as Draft</Button>
          {post?.is_published && (
            <Button variant="outline" onClick={() => save(false)} className="border-amber-500/50 text-amber-300">
              Unpublish
            </Button>
          )}
          <Button onClick={() => save(true)} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">
            {post?.is_published ? "Update (stay published)" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initForm(post) {
  return {
    title: post?.title || "",
    slug: post?.slug || "",
    category: post?.category || "article",
    summary: post?.summary || "",
    content: post?.content || "",
    cover_image_url: post?.cover_image_url || "",
    tags: Array.isArray(post?.tags) ? post.tags : [],
    is_featured: !!post?.is_featured,
  };
}
