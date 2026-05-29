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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Edit3, Trash2, Palette, Lock, ExternalLink,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";

/**
 * Admin → Artists & Attributions.
 *
 * CRUD over public.artist_attributions, mirroring the FAQ tab pattern.
 * Two groups by `category`:
 *   - studio_artist : team / contributor credits (freely managed).
 *   - asset_credit  : legally-required CC-BY 3.0 icon credits. Rows
 *                     flagged is_protected are editable but the delete
 *                     button is disabled here; the DB trigger is the
 *                     backstop.
 */
const CATEGORIES = [
  { value: "studio_artist", label: "Studio Artist" },
  { value: "asset_credit", label: "Asset Credit" },
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

export default function AttributionsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ["adminArtistAttributions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("artist_attributions")
        .select("*")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      return data || [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adminArtistAttributions"] });
    queryClient.invalidateQueries({ queryKey: ["artistAttributions"] });
  };

  const save = useMutation({
    mutationFn: async (row) => {
      // updated_at is handled by the DB trigger; don't send it.
      const payload = {
        name: row.name,
        role: row.role || null,
        category: row.category,
        portfolio_url: row.portfolio_url || null,
        contact: row.contact || null,
        credit_note: row.credit_note || null,
        source: row.source || null,
        source_url: row.source_url || null,
        license: row.license || null,
        license_url: row.license_url || null,
        sort_order: Number(row.sort_order) || 0,
      };
      if (row.id) {
        const { error } = await supabase.from("artist_attributions").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("artist_attributions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (err) => toast.error(err?.message || "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("artist_attributions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (err) => toast.error(err?.message || "Delete failed"),
  });

  const byCategory = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category).push(r);
    }
    return map;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#37F2D1]" /> Artists & Attributions
          </h2>
          <p className="text-xs text-slate-500">
            {rows.length} entries. Studio artists are freely managed; protected asset
            credits (CC-BY) can be edited but not deleted.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Plus className="w-3 h-3 mr-1" /> New Entry
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-slate-500 italic text-center py-12">No attributions yet.</p>
      ) : (
        CATEGORIES.map(({ value: cat, label }) => {
          const list = byCategory.get(cat) || [];
          if (list.length === 0) return null;
          return (
            <section key={cat}>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">
                {label} ({list.length})
              </p>
              <div className="bg-[#1E2430] border border-slate-700 rounded-lg divide-y divide-slate-800">
                {list.map((r) => (
                  <div key={r.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold flex items-center gap-1.5">
                        {r.is_protected && <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                        {r.name}
                        {r.role && <span className="text-slate-400 font-normal text-xs">· {r.role}</span>}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {r.credit_note || r.portfolio_url || r.contact || r.source || "—"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={r.is_protected}
                        title={r.is_protected ? "Protected legal credit — cannot be deleted" : "Delete"}
                        onClick={() => { if (confirm(`Delete "${r.name}"?`)) del.mutate(r.id); }}
                        className="border-red-500/50 text-red-400 disabled:opacity-40"
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
        <AttributionEditor
          row={editing}
          defaultSortOrder={(rows.at(-1)?.sort_order || 0) + 1}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(row) => save.mutate(row)}
        />
      )}
    </div>
  );
}

function AttributionEditor({ row, defaultSortOrder, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    name: row?.name || "",
    role: row?.role || "",
    category: row?.category || "studio_artist",
    portfolio_url: row?.portfolio_url || "",
    contact: row?.contact || "",
    credit_note: row?.credit_note || "",
    source: row?.source || "",
    source_url: row?.source_url || "",
    license: row?.license || "",
    license_url: row?.license_url || "",
    sort_order: row?.sort_order ?? defaultSortOrder,
  }));
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    onSave(row?.id ? { ...form, id: row.id } : form);
    onClose?.();
  };

  const field = (key, label, { type = "text", placeholder = "" } = {}) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={form[key]}
        onChange={(e) => set({ [key]: e.target.value })}
        placeholder={placeholder}
        className="bg-[#050816] border-slate-700 text-white mt-1"
      />
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row?.id ? "Edit Attribution" : "New Attribution"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {row?.is_protected && (
            <p className="text-[11px] text-amber-300 bg-amber-900/30 border border-amber-700/40 rounded px-2 py-1.5 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Protected legal credit — editable, but cannot be deleted.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {field("name", "Name", { placeholder: "Lorc" })}
            {field("role", "Role", { placeholder: "Artist" })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => set({ category: v })}>
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {field("sort_order", "Sort order", { type: "number" })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {field("portfolio_url", "Portfolio URL", { placeholder: "https://…" })}
            {field("contact", "Contact", { placeholder: "email / handle" })}
          </div>
          <div>
            <Label className="text-xs">Credit note</Label>
            <Textarea
              rows={3}
              value={form.credit_note}
              onChange={(e) => set({ credit_note: e.target.value })}
              placeholder="Which assets this credit covers…"
              className="bg-[#050816] border-slate-700 text-white mt-1 text-xs leading-relaxed"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {field("source", "Source", { placeholder: "game-icons.net" })}
            {field("source_url", "Source URL", { placeholder: "https://…" })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {field("license", "License", { placeholder: "CC BY 3.0" })}
            {field("license_url", "License URL", { placeholder: "https://…" })}
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
