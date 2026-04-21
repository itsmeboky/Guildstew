import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Pin, Lock, Trash2, Shield, Check, MessageSquare, Folder, Edit3,
  ArrowUp, ArrowDown, Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/api/supabaseClient";

/**
 * Admin → Forums.
 *
 * Two sub-panels: Threads (pin / lock / dev / delete / mark solution
 * on replies) and Categories (add / edit / reorder / delete).
 *
 * Moderator writes run through the `admins_manage_forum_*` RLS
 * policies added in the migration.
 */
export default function ForumsTab() {
  const [panel, setPanel] = useState("threads");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#37F2D1]" /> Forums
          </h2>
          <p className="text-xs text-slate-500">Moderate threads, replies, and categories.</p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { id: "threads", label: "Threads & Replies" },
            { id: "categories", label: "Categories" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPanel(p.id)}
              className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                panel === p.id
                  ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                  : "bg-[#0b1220] text-slate-400 border-slate-700 hover:border-slate-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {panel === "threads" ? <ThreadsPanel /> : <CategoriesPanel />}
    </div>
  );
}

function ThreadsPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [threadForReplies, setThreadForReplies] = useState(null);

  const { data: threads = [] } = useQuery({
    queryKey: ["adminForumThreads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("forum_threads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => (t.title || "").toLowerCase().includes(q));
  }, [threads, search]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["adminForumThreads"] });

  const patch = useMutation({
    mutationFn: async ({ id, patch }) => {
      const { error } = await supabase.from("forum_threads").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Thread updated"); invalidate(); },
    onError: (err) => { console.error("Update thread", err); toast.error(`Failed to save: ${err?.message || err}`); },
  });

  const deleteThread = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("forum_threads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Thread deleted"); invalidate(); },
    onError: (err) => { console.error("Delete thread", err); toast.error(`Failed to delete: ${err?.message || err}`); },
  });

  return (
    <div className="space-y-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search thread titles…"
        className="bg-[#0b1220] border-slate-700 text-white h-8 max-w-md"
      />

      <div className="bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0b1220] text-slate-400 text-[11px] uppercase tracking-widest">
            <tr>
              <th className="text-left px-3 py-2">Thread</th>
              <th className="text-center px-3 py-2">Pinned</th>
              <th className="text-center px-3 py-2">Locked</th>
              <th className="text-center px-3 py-2">Dev</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-slate-500 py-10">No threads.</td></tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">
                    <p className="text-white font-bold">{t.title}</p>
                    <p className="text-[10px] text-slate-500">
                      /{t.slug} · {t.reply_count || 0} replies · {t.view_count || 0} views
                    </p>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Switch
                      checked={!!t.is_pinned}
                      onCheckedChange={(v) => patch.mutate({ id: t.id, patch: { is_pinned: v } })}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Switch
                      checked={!!t.is_locked}
                      onCheckedChange={(v) => patch.mutate({ id: t.id, patch: { is_locked: v } })}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Switch
                      checked={!!t.is_dev_post}
                      onCheckedChange={(v) => patch.mutate({ id: t.id, patch: { is_dev_post: v } })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setThreadForReplies(t)}
                        title="Manage replies"
                      >
                        <Shield className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Delete "${t.title}" and all its replies?`)) {
                            deleteThread.mutate(t.id);
                          }
                        }}
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

      {threadForReplies && (
        <RepliesPanel
          thread={threadForReplies}
          onClose={() => setThreadForReplies(null)}
        />
      )}
    </div>
  );
}

function RepliesPanel({ thread, onClose }) {
  const queryClient = useQueryClient();
  const { data: replies = [] } = useQuery({
    queryKey: ["adminForumReplies", thread.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("forum_replies")
        .select("*")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const patch = useMutation({
    mutationFn: async ({ id, patch }) => {
      const { error } = await supabase.from("forum_replies").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reply updated");
      queryClient.invalidateQueries({ queryKey: ["adminForumReplies", thread.id] });
      queryClient.invalidateQueries({ queryKey: ["forumReplies", thread.id] });
    },
    onError: (err) => { console.error("Update reply", err); toast.error(`Failed to save: ${err?.message || err}`); },
  });

  const del = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("forum_replies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reply deleted");
      queryClient.invalidateQueries({ queryKey: ["adminForumReplies", thread.id] });
      queryClient.invalidateQueries({ queryKey: ["forumReplies", thread.id] });
    },
    onError: (err) => { console.error("Delete reply", err); toast.error(`Failed to delete: ${err?.message || err}`); },
  });

  return (
    <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-[#37F2D1]">
          Replies · {thread.title}
        </p>
        <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
      </div>
      {replies.length === 0 ? (
        <p className="text-slate-500 italic text-xs">No replies.</p>
      ) : (
        replies.map((r) => (
          <div key={r.id} className="bg-[#050816] border border-slate-800 rounded p-2 text-xs">
            <p className="text-slate-300 whitespace-pre-wrap line-clamp-3">{r.content}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <label className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                <Switch
                  checked={!!r.is_dev_reply}
                  onCheckedChange={(v) => patch.mutate({ id: r.id, patch: { is_dev_reply: v } })}
                />
                Dev reply
              </label>
              <label className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                <Switch
                  checked={!!r.is_solution}
                  onCheckedChange={(v) => patch.mutate({ id: r.id, patch: { is_solution: v } })}
                />
                <Check className="w-3 h-3" /> Solution
              </label>
              <span className="text-[10px] text-slate-500 ml-auto">
                {new Date(r.created_at).toLocaleString()}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { if (confirm("Delete this reply?")) del.mutate(r.id); }}
                className="border-red-500/50 text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CategoriesPanel() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["adminForumCategories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("forum_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adminForumCategories"] });
    queryClient.invalidateQueries({ queryKey: ["forumCategories"] });
  };

  const save = useMutation({
    mutationFn: async (row) => {
      if (row.id) {
        const { error } = await supabase
          .from("forum_categories")
          .update(row)
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("forum_categories").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (err) => toast.error(err?.message || "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("forum_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (err) => { console.error("Delete category", err); toast.error(`Failed to delete: ${err?.message || err}`); },
  });

  const move = useMutation({
    mutationFn: async ({ id, delta }) => {
      const target = categories.find((c) => c.id === id);
      if (!target) return;
      const idx = categories.indexOf(target);
      const swap = categories[idx + delta];
      if (!swap) return;
      const [a, b] = await Promise.all([
        supabase.from("forum_categories").update({ sort_order: swap.sort_order }).eq("id", target.id),
        supabase.from("forum_categories").update({ sort_order: target.sort_order }).eq("id", swap.id),
      ]);
      if (a?.error) throw a.error;
      if (b?.error) throw b.error;
    },
    onSuccess: invalidate,
    onError: (err) => { console.error("Reorder categories", err); toast.error(`Failed to reorder: ${err?.message || err}`); },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Plus className="w-3 h-3 mr-1" /> New Category
        </Button>
      </div>

      <div className="bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0b1220] text-slate-400 text-[11px] uppercase tracking-widest">
            <tr>
              <th className="text-left px-3 py-2">Order</th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Slug</th>
              <th className="text-center px-3 py-2">Dev-only</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c.id} className="border-t border-slate-800">
                <td className="px-3 py-2">
                  <div className="inline-flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={i === 0}
                      onClick={() => move.mutate({ id: c.id, delta: -1 })}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={i === categories.length - 1}
                      onClick={() => move.mutate({ id: c.id, delta: 1 })}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: c.color || "#f8a47c" }}>
                      <Folder className="w-3 h-3 text-[#0b1220]" />
                    </div>
                    <p className="text-white font-bold">{c.name}</p>
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-400 font-mono text-xs">/{c.slug}</td>
                <td className="px-3 py-2 text-center">
                  {c.is_dev_only && <Shield className="w-3 h-3 mx-auto text-amber-300" />}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`Delete "${c.name}"? This fails if the category still has threads — delete those first.`)) {
                          del.mutate(c.id);
                        }
                      }}
                      className="border-red-500/50 text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <CategoryEditor
          row={editing}
          categories={categories}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(row) => save.mutate(row)}
        />
      )}
    </div>
  );
}

function CategoryEditor({ row, categories, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    name: row?.name || "",
    description: row?.description || "",
    slug: row?.slug || "",
    icon: row?.icon || "MessageCircle",
    color: row?.color || "#f8a47c",
    is_dev_only: !!row?.is_dev_only,
  }));
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Name and slug required");
      return;
    }
    const payload = {
      ...form,
      slug: form.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""),
    };
    if (row?.id) {
      payload.id = row.id;
    } else {
      payload.sort_order = (categories.at(-1)?.sort_order || 0) + 1;
    }
    onSave(payload);
    onClose?.();
  };

  return (
    <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-[#37F2D1]">
          {row?.id ? "Edit" : "New"} Category
        </p>
        <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Name</Label>
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} className="bg-[#050816] border-slate-700 text-white mt-1" />
        </div>
        <div>
          <Label className="text-xs">Slug</Label>
          <Input value={form.slug} onChange={(e) => set({ slug: e.target.value })} className="bg-[#050816] border-slate-700 text-white mt-1 font-mono text-xs" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <Input value={form.description} onChange={(e) => set({ description: e.target.value })} className="bg-[#050816] border-slate-700 text-white mt-1" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Icon (lucide name)</Label>
          <Input value={form.icon} onChange={(e) => set({ icon: e.target.value })} className="bg-[#050816] border-slate-700 text-white mt-1" />
        </div>
        <div>
          <Label className="text-xs">Color</Label>
          <Input type="color" value={form.color} onChange={(e) => set({ color: e.target.value })} className="bg-[#050816] border-slate-700 text-white mt-1 h-9" />
        </div>
        <div className="flex items-end justify-between bg-[#050816] border border-slate-700 rounded p-2">
          <Label className="text-xs">Dev-only</Label>
          <Switch checked={!!form.is_dev_only} onCheckedChange={(v) => set({ is_dev_only: v })} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">
          Save
        </Button>
      </div>
    </div>
  );
}
