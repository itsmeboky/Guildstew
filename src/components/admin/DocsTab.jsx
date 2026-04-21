import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Edit3, Trash2, BookOpen,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";

const CATEGORIES = [
  "getting_started", "campaigns", "characters", "combat",
  "homebrew", "brewery", "tavern", "guild", "admin",
];

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "page";
}

/**
 * Admin → Documentation.
 *
 * CRUD for `documentation_pages`. Slug is auto-generated from title
 * on create (editable); nothing reorders content across categories,
 * so we just use the sort_order column client-side (admin edits the
 * number directly).
 */
export default function DocsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data: pages = [] } = useQuery({
    queryKey: ["adminDocPages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documentation_pages")
        .select("*")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adminDocPages"] });
    queryClient.invalidateQueries({ queryKey: ["docPages"] });
  };

  const save = useMutation({
    mutationFn: async (row) => {
      const payload = { ...row, updated_at: new Date().toISOString() };
      if (row.id) {
        const { error } = await supabase.from("documentation_pages").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("documentation_pages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (err) => toast.error(err?.message || "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id) => {
      await supabase.from("documentation_pages").delete().eq("id", id);
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
  });

  const byCategory = useMemo(() => {
    const map = new Map();
    for (const p of pages) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category).push(p);
    }
    return map;
  }, [pages]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#37F2D1]" /> Documentation
          </h2>
          <p className="text-xs text-slate-500">{pages.length} pages across {byCategory.size} categories.</p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Plus className="w-3 h-3 mr-1" /> New Page
        </Button>
      </div>

      {pages.length === 0 ? (
        <p className="text-slate-500 italic text-center py-12">No documentation pages yet.</p>
      ) : (
        CATEGORIES.map((cat) => {
          const list = byCategory.get(cat) || [];
          if (list.length === 0) return null;
          return (
            <section key={cat}>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">
                {cat.replace(/_/g, " ")}
              </p>
              <div className="bg-[#1E2430] border border-slate-700 rounded-lg divide-y divide-slate-800">
                {list.map((p) => (
                  <div key={p.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold">{p.title}</p>
                      <p className="text-[11px] text-slate-500 font-mono">/docs?slug={p.slug}</p>
                    </div>
                    {!p.is_published && (
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-900/40 text-amber-300 rounded px-2 py-0.5">
                        Draft
                      </span>
                    )}
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { if (confirm("Delete this page?")) del.mutate(p.id); }}
                        className="border-red-500/50 text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}

      {(editing || creating) && (
        <DocEditor
          row={editing}
          defaultSortOrder={(pages.at(-1)?.sort_order || 0) + 1}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(row) => save.mutate(row)}
        />
      )}
    </div>
  );
}

function DocEditor({ row, defaultSortOrder, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    title: row?.title || "",
    slug: row?.slug || "",
    content: row?.content || "",
    category: row?.category || "getting_started",
    sort_order: row?.sort_order ?? defaultSortOrder,
    is_published: row?.is_published ?? true,
  }));
  const [slugTouched, setSlugTouched] = useState(!!row?.slug);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onTitle = (v) => {
    set({ title: v, ...(slugTouched ? {} : { slug: slugify(v) }) });
  };

  const submit = () => {
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      toast.error("Title, slug, and content are required.");
      return;
    }
    onSave(row?.id ? { ...form, id: row.id } : form);
    onClose?.();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row?.id ? "Edit Doc Page" : "New Doc Page"}</DialogTitle>
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
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Content (Markdown)</Label>
            <Textarea
              rows={16}
              value={form.content}
              onChange={(e) => set({ content: e.target.value })}
              className="bg-[#050816] border-slate-700 text-white mt-1 font-mono text-xs leading-relaxed"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Sort order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => set({ sort_order: Number(e.target.value) || 0 })}
                className="bg-[#050816] border-slate-700 text-white mt-1"
              />
            </div>
            <div className="flex items-end justify-between bg-[#050816] border border-slate-700 rounded p-2">
              <Label className="text-xs">Published</Label>
              <Switch checked={!!form.is_published} onCheckedChange={(v) => set({ is_published: v })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
