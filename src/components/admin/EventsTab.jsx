import React, { useState } from "react";
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
import { Plus, Edit3, Trash2, Calendar } from "lucide-react";
import { supabase } from "@/api/supabaseClient";

/**
 * Admin → Community Events.
 *
 * CRUD over `community_events`. The public /events page pulls from
 * the same table.
 */
const TYPES = [
  { value: "community", label: "Community" },
  { value: "contest",   label: "Contest" },
  { value: "game_jam",  label: "Game Jam" },
  { value: "spotlight", label: "Creator Spotlight" },
];
const TYPE_LABEL = TYPES.reduce((acc, t) => { acc[t.value] = t.label; return acc; }, {});

export default function EventsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["adminEvents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_events")
        .select("*")
        .order("start_date", { ascending: false });
      return data || [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adminEvents"] });
    queryClient.invalidateQueries({ queryKey: ["communityEvents"] });
  };

  const save = useMutation({
    mutationFn: async (row) => {
      if (row.id) {
        const { error } = await supabase.from("community_events").update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("community_events").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (err) => { console.error("Save event", err); toast.error(`Failed to save: ${err?.message || err}`); },
  });

  const del = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("community_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (err) => { console.error("Delete event", err); toast.error(`Failed to delete: ${err?.message || err}`); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#37F2D1]" /> Community Events
          </h2>
          <p className="text-xs text-slate-500">{events.length} event{events.length === 1 ? "" : "s"} · shown on /events.</p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Plus className="w-3 h-3 mr-1" /> New Event
        </Button>
      </div>

      {events.length === 0 ? (
        <p className="text-slate-500 italic text-center py-12">No events yet.</p>
      ) : (
        <div className="bg-[#1E2430] border border-slate-700 rounded-lg divide-y divide-slate-800">
          {events.map((e) => (
            <div key={e.id} className="p-3 flex items-center gap-3">
              {e.image_url ? (
                <img src={e.image_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded bg-[#050816] border border-slate-700 flex-shrink-0 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-slate-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold flex items-center gap-2 flex-wrap">
                  {e.title}
                  <span className="text-[9px] font-bold uppercase tracking-widest rounded px-1.5 py-0.5 bg-[#050816] border border-slate-700 text-[#37F2D1]">
                    {TYPE_LABEL[e.event_type] || e.event_type}
                  </span>
                  {!e.is_published && (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-900/40 text-amber-300 rounded px-2 py-0.5">Draft</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500">
                  {new Date(e.start_date).toLocaleDateString()}
                  {e.end_date && ` — ${new Date(e.end_date).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(e)}>
                  <Edit3 className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { if (confirm(`Delete "${e.title}"?`)) del.mutate(e.id); }}
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
        <EventEditor
          row={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(row) => save.mutate(row)}
        />
      )}
    </div>
  );
}

function EventEditor({ row, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    title: row?.title || "",
    description: row?.description || "",
    event_type: row?.event_type || "community",
    start_date: toLocalInput(row?.start_date) || toLocalInput(new Date().toISOString()),
    end_date: toLocalInput(row?.end_date) || "",
    image_url: row?.image_url || "",
    link_url: row?.link_url || "",
    is_published: row?.is_published !== false,
  }));
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    if (!form.title.trim()) { toast.error("Title required."); return; }
    if (!form.start_date) { toast.error("Start date required."); return; }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_type: form.event_type,
      start_date: new Date(form.start_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      image_url: form.image_url.trim() || null,
      link_url: form.link_url.trim() || null,
      is_published: !!form.is_published,
    };
    onSave(row?.id ? { ...payload, id: row.id } : payload);
    onClose?.();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row?.id ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => set({ title: e.target.value })} className="bg-[#050816] border-slate-700 text-white" />
          </Field>
          <Field label="Description">
            <Textarea rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} className="bg-[#050816] border-slate-700 text-white" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type">
              <Select value={form.event_type} onValueChange={(v) => set({ event_type: v })}>
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end justify-between bg-[#050816] border border-slate-700 rounded p-2">
              <Label className="text-xs">Published</Label>
              <Switch checked={!!form.is_published} onCheckedChange={(v) => set({ is_published: v })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Start date/time">
              <Input type="datetime-local" value={form.start_date} onChange={(e) => set({ start_date: e.target.value })} className="bg-[#050816] border-slate-700 text-white" />
            </Field>
            <Field label="End date/time (optional)">
              <Input type="datetime-local" value={form.end_date} onChange={(e) => set({ end_date: e.target.value })} className="bg-[#050816] border-slate-700 text-white" />
            </Field>
          </div>
          <Field label="Image URL (optional)">
            <Input value={form.image_url} onChange={(e) => set({ image_url: e.target.value })} className="bg-[#050816] border-slate-700 text-white" placeholder="https://…" />
          </Field>
          <Field label="External link (optional)">
            <Input value={form.link_url} onChange={(e) => set({ link_url: e.target.value })} className="bg-[#050816] border-slate-700 text-white" placeholder="https://…" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

// <input type="datetime-local"> wants `YYYY-MM-DDTHH:mm`. Convert
// from ISO strings stored in the DB so editing existing events
// round-trips correctly.
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
