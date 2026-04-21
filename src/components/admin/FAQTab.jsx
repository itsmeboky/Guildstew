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
  Plus, Edit3, Trash2, ArrowUp, ArrowDown, HelpCircle,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";

/**
 * Admin → FAQ.
 *
 * Simple CRUD + reorder via neighbor-swap sort_order on category.
 * Markdown answers render through the same helper the public page
 * uses.
 */
const CATEGORIES = [
  "getting_started", "campaigns", "characters", "combat",
  "brewery", "tavern", "billing", "technical",
];

export default function FAQTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ["adminFaqEntries"],
    queryFn: async () => {
      const { data } = await supabase
        .from("faq_entries")
        .select("*")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adminFaqEntries"] });
    queryClient.invalidateQueries({ queryKey: ["faqEntries"] });
  };

  const save = useMutation({
    mutationFn: async (row) => {
      const payload = { ...row, updated_at: new Date().toISOString() };
      if (row.id) {
        const { error } = await supabase.from("faq_entries").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faq_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (err) => toast.error(err?.message || "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id) => {
      await supabase.from("faq_entries").delete().eq("id", id);
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
  });

  const move = useMutation({
    mutationFn: async ({ id, delta }) => {
      const target = entries.find((e) => e.id === id);
      if (!target) return;
      const same = entries.filter((e) => e.category === target.category);
      const idx = same.indexOf(target);
      const swap = same[idx + delta];
      if (!swap) return;
      const [a, b] = await Promise.all([
        supabase.from("faq_entries").update({ sort_order: swap.sort_order }).eq("id", target.id),
        supabase.from("faq_entries").update({ sort_order: target.sort_order }).eq("id", swap.id),
      ]);
      if (a?.error) throw a.error;
      if (b?.error) throw b.error;
    },
    onSuccess: invalidate,
    onError: (err) => { console.error("Reorder FAQ", err); toast.error(`Failed to reorder: ${err?.message || err}`); },
  });

  const byCategory = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      if (!map.has(e.category)) map.set(e.category, []);
      map.get(e.category).push(e);
    }
    return map;
  }, [entries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#37F2D1]" /> FAQ
          </h2>
          <p className="text-xs text-slate-500">{entries.length} entries across {byCategory.size} categories.</p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Plus className="w-3 h-3 mr-1" /> New Entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-slate-500 italic text-center py-12">No FAQ entries yet.</p>
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
                {list.map((e, i) => (
                  <div key={e.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold">{e.question}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{e.answer}</p>
                    </div>
                    {!e.is_published && (
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-900/40 text-amber-300 rounded px-2 py-0.5">
                        Draft
                      </span>
                    )}
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" disabled={i === 0} onClick={() => move.mutate({ id: e.id, delta: -1 })}>
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" disabled={i === list.length - 1} onClick={() => move.mutate({ id: e.id, delta: 1 })}>
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(e)}>
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { if (confirm("Delete this entry?")) del.mutate(e.id); }}
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
        <FAQEditor
          row={editing}
          defaultSortOrder={(entries.at(-1)?.sort_order || 0) + 1}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(row) => save.mutate(row)}
        />
      )}
    </div>
  );
}

function FAQEditor({ row, defaultSortOrder, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    question: row?.question || "",
    answer: row?.answer || "",
    category: row?.category || "getting_started",
    sort_order: row?.sort_order ?? defaultSortOrder,
    is_published: row?.is_published ?? true,
  }));
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Question and answer are required.");
      return;
    }
    onSave(row?.id ? { ...form, id: row.id } : form);
    onClose?.();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row?.id ? "Edit FAQ Entry" : "New FAQ Entry"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Question</Label>
            <Input value={form.question} onChange={(e) => set({ question: e.target.value })} className="bg-[#050816] border-slate-700 text-white mt-1" />
          </div>
          <div>
            <Label className="text-xs">Answer (Markdown)</Label>
            <Textarea
              rows={8}
              value={form.answer}
              onChange={(e) => set({ answer: e.target.value })}
              className="bg-[#050816] border-slate-700 text-white mt-1 font-mono text-xs leading-relaxed"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => set({ category: v })}>
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
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
