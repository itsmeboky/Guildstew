import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Edit3, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Home,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";

/**
 * Admin → Homepage.
 *
 * Manages everything that's admin-editable on the public Home page:
 *   - Hero banner carousel (`homepage_banners` table)
 *   - Newest Game Pack / Top Selling tile content (`site_config`)
 *
 * Game-pack controls live in HomepageGamePackEditor (step 3).
 */
export default function HomepageTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <Home className="w-5 h-5 text-[#37F2D1]" /> Homepage
        </h2>
        <p className="text-xs text-slate-500">
          Hero carousel and the content cards on the marketing homepage.
        </p>
      </div>

      <HeroBannersSection />
      <GamePackConfigSection />
    </div>
  );
}

// ─────────────────────────── Hero banners ──────────────────────────
function HeroBannersSection() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data: banners = [] } = useQuery({
    queryKey: ["adminHomepageBanners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("homepage_banners")
        .select("*")
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adminHomepageBanners"] });
    queryClient.invalidateQueries({ queryKey: ["homepageBanners"] });
  };

  const save = useMutation({
    mutationFn: async (row) => {
      if (row.id) {
        const { error } = await supabase.from("homepage_banners").update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("homepage_banners").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (err) => { console.error("Save banner", err); toast.error(`Failed to save: ${err?.message || err}`); },
  });

  const del = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("homepage_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (err) => { console.error("Delete banner", err); toast.error(`Failed to delete: ${err?.message || err}`); },
  });

  const move = useMutation({
    mutationFn: async ({ id, delta }) => {
      const target = banners.find((b) => b.id === id);
      if (!target) return;
      const idx = banners.indexOf(target);
      const swap = banners[idx + delta];
      if (!swap) return;
      const [a, b] = await Promise.all([
        supabase.from("homepage_banners").update({ sort_order: swap.sort_order }).eq("id", target.id),
        supabase.from("homepage_banners").update({ sort_order: target.sort_order }).eq("id", swap.id),
      ]);
      if (a?.error) throw a.error;
      if (b?.error) throw b.error;
    },
    onSuccess: invalidate,
    onError: (err) => { console.error("Reorder banners", err); toast.error(`Failed to reorder: ${err?.message || err}`); },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, value }) => {
      const { error } = await supabase.from("homepage_banners").update({ is_active: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => toast.error(`Failed to save: ${err?.message || err}`),
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-black text-white">Hero carousel</h3>
          <p className="text-xs text-slate-500">{banners.length} banner{banners.length === 1 ? "" : "s"} · top of homepage.</p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Plus className="w-3 h-3 mr-1" /> New Banner
        </Button>
      </div>

      {banners.length === 0 ? (
        <p className="text-slate-500 italic text-center py-8 bg-[#1E2430] border border-slate-700 rounded-lg">
          No banners yet. Uploads are pulled to the homepage carousel as soon as you mark them active.
        </p>
      ) : (
        <div className="bg-[#1E2430] border border-slate-700 rounded-lg divide-y divide-slate-800">
          {banners.map((b, i) => (
            <div key={b.id} className="p-3 flex items-center gap-3">
              <div className="w-20 h-12 rounded overflow-hidden bg-[#050816] border border-slate-700 flex-shrink-0">
                {b.image_url ? (
                  <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-slate-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{b.title || "(no title)"}</p>
                {b.subtitle && <p className="text-[11px] text-slate-500 truncate">{b.subtitle}</p>}
                {b.link_url && (
                  <p className="text-[10px] text-[#37F2D1] truncate">→ {b.link_url}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                  <Switch checked={!!b.is_active} onCheckedChange={(v) => toggle.mutate({ id: b.id, value: v })} />
                  Active
                </label>
                <Button size="sm" variant="outline" disabled={i === 0} onClick={() => move.mutate({ id: b.id, delta: -1 })}>
                  <ArrowUp className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" disabled={i === banners.length - 1} onClick={() => move.mutate({ id: b.id, delta: 1 })}>
                  <ArrowDown className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                  <Edit3 className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { if (confirm("Delete this banner?")) del.mutate(b.id); }}
                  className="border-red-500/50 text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <BannerEditor
          row={editing}
          defaultSortOrder={(banners.at(-1)?.sort_order || 0) + 1}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(row) => save.mutate(row)}
        />
      )}
    </section>
  );
}

function BannerEditor({ row, defaultSortOrder, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    image_url: row?.image_url || "",
    title: row?.title || "",
    subtitle: row?.subtitle || "",
    link_url: row?.link_url || "",
    sort_order: row?.sort_order ?? defaultSortOrder,
    is_active: row?.is_active !== false,
  }));
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    if (!form.image_url.trim()) { toast.error("Image URL required."); return; }
    const payload = {
      image_url: form.image_url.trim(),
      title: form.title.trim() || null,
      subtitle: form.subtitle.trim() || null,
      link_url: form.link_url.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: !!form.is_active,
    };
    onSave(row?.id ? { ...payload, id: row.id } : payload);
    onClose?.();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle>{row?.id ? "Edit Banner" : "New Banner"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Image URL">
            <Input value={form.image_url} onChange={(e) => set({ image_url: e.target.value })} className="bg-[#050816] border-slate-700 text-white" placeholder="https://…" />
            {form.image_url && (
              <img src={form.image_url} alt="" className="mt-2 w-full h-36 rounded object-cover border border-slate-700" />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Title (optional)">
              <Input value={form.title} onChange={(e) => set({ title: e.target.value })} className="bg-[#050816] border-slate-700 text-white" />
            </Field>
            <Field label="Subtitle (optional)">
              <Input value={form.subtitle} onChange={(e) => set({ subtitle: e.target.value })} className="bg-[#050816] border-slate-700 text-white" />
            </Field>
          </div>
          <Field label="Click-through link (optional)">
            <Input value={form.link_url} onChange={(e) => set({ link_url: e.target.value })} className="bg-[#050816] border-slate-700 text-white" placeholder="https://… or /some-route" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Sort order">
              <Input type="number" value={form.sort_order} onChange={(e) => set({ sort_order: e.target.value })} className="bg-[#050816] border-slate-700 text-white" />
            </Field>
            <div className="flex items-end justify-between bg-[#050816] border border-slate-700 rounded p-2">
              <Label className="text-xs">Active</Label>
              <Switch checked={!!form.is_active} onCheckedChange={(v) => set({ is_active: v })} />
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

// ─────────────────── Homepage Game-Pack cards (step 3) ──────────────
function GamePackConfigSection() {
  const queryClient = useQueryClient();

  const { data: config = {} } = useQuery({
    queryKey: ["adminSiteConfig"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_config")
        .select("*")
        .in("key", ["homepage_newest_gamepack", "homepage_top_selling"]);
      const map = {};
      for (const row of data || []) map[row.key] = row.value || {};
      return map;
    },
  });

  const saveKey = useMutation({
    mutationFn: async ({ key, value }) => {
      const { error } = await supabase
        .from("site_config")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      queryClient.invalidateQueries({ queryKey: ["adminSiteConfig"] });
      queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
    },
    onError: (err) => { console.error("Save site_config", err); toast.error(`Failed to save: ${err?.message || err}`); },
  });

  return (
    <section>
      <div className="mb-3">
        <h3 className="text-lg font-black text-white">Homepage cards</h3>
        <p className="text-xs text-slate-500">Controls what shows in the "Newest Game Pack" and "Top Selling" tiles.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GamePackEditor
          label="Newest Game Pack"
          value={config.homepage_newest_gamepack}
          onSave={(value) => saveKey.mutate({ key: "homepage_newest_gamepack", value })}
        />
        <GamePackEditor
          label="Top Selling"
          value={config.homepage_top_selling}
          onSave={(value) => saveKey.mutate({ key: "homepage_top_selling", value })}
        />
      </div>
    </section>
  );
}

function GamePackEditor({ label, value, onSave }) {
  const [form, setForm] = useState(() => ({
    name: value?.name || "",
    image: value?.image || "",
    description: value?.description || "",
    link_url: value?.link_url || "",
  }));

  React.useEffect(() => {
    setForm({
      name: value?.name || "",
      image: value?.image || "",
      description: value?.description || "",
      link_url: value?.link_url || "",
    });
  }, [value?.name, value?.image, value?.description, value?.link_url]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const save = () => onSave({
    name: form.name.trim() || null,
    image: form.image.trim() || null,
    description: form.description.trim() || null,
    link_url: form.link_url.trim() || null,
  });

  return (
    <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-4 space-y-3">
      <p className="text-[10px] uppercase tracking-widest font-black text-[#37F2D1]">{label}</p>
      <Field label="Name">
        <Input value={form.name} onChange={(e) => set({ name: e.target.value })} className="bg-[#050816] border-slate-700 text-white" />
      </Field>
      <Field label="Image URL">
        <Input value={form.image} onChange={(e) => set({ image: e.target.value })} className="bg-[#050816] border-slate-700 text-white" placeholder="https://…" />
        {form.image && <img src={form.image} alt="" className="mt-2 w-full h-24 rounded object-cover border border-slate-700" />}
      </Field>
      <Field label="Description">
        <Input value={form.description} onChange={(e) => set({ description: e.target.value })} className="bg-[#050816] border-slate-700 text-white" />
      </Field>
      <Field label="Click-through link (optional)">
        <Input value={form.link_url} onChange={(e) => set({ link_url: e.target.value })} className="bg-[#050816] border-slate-700 text-white" placeholder="/tavern or https://…" />
      </Field>
      <Button onClick={save} className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">Save</Button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs text-slate-300 mb-1 block">{label}</Label>
      {children}
    </div>
  );
}
