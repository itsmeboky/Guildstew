import React, { useState } from "react";
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
import { Plus, Edit3, Trash2, Sparkles, Rocket } from "lucide-react";
import { supabase } from "@/api/supabaseClient";

/**
 * Admin → Versions.
 *
 * Changelog rows live in `version_history`. The latest row drives the
 * homepage "Version History" card (Step 6) and the merged "Latest
 * Updates" feed (Step 7). Rich changelog body is authored in Markdown
 * for the same reasons as the Blog tab.
 */
export default function VersionsTab() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState({ open: false, row: null });

  const { data: versions = [] } = useQuery({
    queryKey: ["adminVersions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("version_history")
        .select("*")
        .order("release_date", { ascending: false });
      return data || [];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["adminVersions"] });

  const saveRow = useMutation({
    mutationFn: async (row) => {
      if (row.id) {
        const { error } = await supabase.from("version_history").update(row).eq("id", row.id);
        if (error) throw error;
        return row.id;
      }
      const { data, error } = await supabase.from("version_history").insert(row).select().maybeSingle();
      if (error) throw error;
      return data?.id;
    },
    onSuccess: () => { toast.success("Version posted"); invalidate(); },
    onError: (err) => toast.error(err?.message || "Save failed"),
  });

  const deleteRow = useMutation({
    mutationFn: async (id) => {
      await supabase.from("version_history").delete().eq("id", id);
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Rocket className="w-5 h-5 text-amber-400" /> Version History
          </h2>
          <p className="text-xs text-slate-500">
            {versions.length} release{versions.length === 1 ? "" : "s"} · {versions.filter((v) => v.is_major).length} major
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setEditor({ open: true, row: null })}
          className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold"
        >
          <Plus className="w-3 h-3 mr-1" /> New Version
        </Button>
      </div>

      <div className="bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0b1220] text-slate-400 text-[11px] uppercase tracking-widest">
            <tr>
              <th className="text-left px-3 py-2">Version</th>
              <th className="text-left px-3 py-2">Title</th>
              <th className="text-left px-3 py-2">Released</th>
              <th className="text-left px-3 py-2">Major</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-slate-500 py-10">No versions posted yet.</td></tr>
            ) : (
              versions.map((v) => (
                <tr key={v.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">
                    <span className="font-mono font-bold text-amber-200">{v.version}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div>
                      <p className="text-white font-bold">{v.title}</p>
                      {v.description && <p className="text-[11px] text-slate-500 line-clamp-1">{v.description}</p>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-400">
                    {v.release_date ? new Date(v.release_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {v.is_major && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-900/40 text-amber-300">
                        <Sparkles className="w-3 h-3" /> Major
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditor({ open: true, row: v })}>
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { if (confirm(`Delete ${v.version}?`)) deleteRow.mutate(v.id); }}
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

      <VersionEditor
        open={editor.open}
        row={editor.row}
        onClose={() => setEditor({ open: false, row: null })}
        onSave={(row) => saveRow.mutate(row)}
      />
    </div>
  );
}

function VersionEditor({ open, row, onClose, onSave }) {
  const [form, setForm] = useState(() => initForm(row));

  React.useEffect(() => { if (open) setForm(initForm(row)); }, [open, row?.id]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = () => {
    if (!form.version.trim()) { toast.error("Version is required"); return; }
    if (!form.title.trim()) { toast.error("Title is required"); return; }

    const payload = {
      ...(row?.id ? { id: row.id } : {}),
      version: form.version.trim(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      full_notes: form.full_notes || null,
      release_date: form.release_date,
      is_major: !!form.is_major,
    };
    onSave(payload);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row?.id ? "Edit Version" : "New Version"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Short description shows on the homepage Version History card. Full notes show on the changelog page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-[140px,1fr] gap-2">
            <div>
              <Label className="text-xs">Version</Label>
              <Input
                value={form.version}
                onChange={(e) => set({ version: e.target.value })}
                placeholder="v2.5.0"
                className="bg-[#050816] border-slate-700 text-white mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="The Brewery Update"
                className="bg-[#050816] border-slate-700 text-white mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Short Description (homepage card)</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              className="bg-[#050816] border-slate-700 text-white mt-1"
              placeholder="One or two sentences teasing what's in the release."
            />
          </div>

          <div>
            <Label className="text-xs">Full Release Notes (Markdown)</Label>
            <Textarea
              rows={14}
              value={form.full_notes}
              onChange={(e) => set({ full_notes: e.target.value })}
              className="bg-[#050816] border-slate-700 text-white mt-1 font-mono text-xs leading-relaxed"
              placeholder="## New\n- …\n\n## Fixes\n- …"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Release Date</Label>
              <Input
                type="date"
                value={form.release_date}
                onChange={(e) => set({ release_date: e.target.value })}
                className="bg-[#050816] border-slate-700 text-white mt-1"
              />
            </div>
            <div className="flex items-end justify-between bg-[#050816] border border-slate-700 rounded p-2">
              <Label className="text-xs text-slate-300">Major release</Label>
              <Switch checked={!!form.is_major} onCheckedChange={(v) => set({ is_major: v })} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold">
            {row?.id ? "Save" : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initForm(row) {
  return {
    version: row?.version || "",
    title: row?.title || "",
    description: row?.description || "",
    full_notes: row?.full_notes || "",
    release_date: row?.release_date || new Date().toISOString().slice(0, 10),
    is_major: !!row?.is_major,
  };
}
