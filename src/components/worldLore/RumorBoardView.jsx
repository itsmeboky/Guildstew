import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, Save, X, Check, MessageSquare, AlertTriangle,
} from "lucide-react";

const STATUS_STYLES = {
  unverified: { label: "Unverified",        cls: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
  verified:   { label: "Verified ✅",        cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  debunked:   { label: "Debunked ❌",        cls: "bg-red-500/20 text-red-300 border-red-500/40" },
};

export default function RumorBoardView({ campaignId, user, isGM, isMole }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);

  const { data: rumors = [] } = useQuery({
    queryKey: ["worldLoreRumors", campaignId],
    queryFn: () => base44.entities.WorldLoreRumor.filter(
      { campaign_id: campaignId },
      "-created_at",
    ).catch(() => []),
    enabled: !!campaignId,
    initialData: [],
  });

  // Players see only approved rumors + mole-accessible ones if they
  // are moles. GMs see everything including unapproved auto-generated
  // title rumors waiting for sign-off.
  const visibleRumors = useMemo(() => {
    if (isGM) return rumors;
    return rumors.filter((r) => {
      if (r.is_approved === false) return false;
      if (r.mole_accessible && !isMole) return false;
      return true;
    });
  }, [rumors, isGM, isMole]);

  const writeMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.id) return base44.entities.WorldLoreRumor.update(payload.id, payload);
      return base44.entities.WorldLoreRumor.create({
        ...payload,
        campaign_id: campaignId,
        created_by: user?.id,
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worldLoreRumors", campaignId] });
      setEditingId(null);
      setAdding(false);
      toast.success("Rumor saved.");
    },
    onError: (err) => toast.error(err?.message || "Save failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorldLoreRumor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worldLoreRumors", campaignId] });
      toast.success("Rumor removed.");
    },
    onError: (err) => toast.error(err?.message || "Delete failed."),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#37F2D1]" />
          <h2 className="text-xl font-bold text-white">Rumor Board</h2>
          <span className="text-xs text-slate-500">
            {visibleRumors.length} rumor{visibleRumors.length === 1 ? "" : "s"}
          </span>
        </div>
        {isGM && !adding && (
          <Button
            onClick={() => setAdding(true)}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> New Rumor
          </Button>
        )}
      </header>

      {isGM && adding && (
        <RumorForm
          saving={writeMutation.isPending}
          onCancel={() => setAdding(false)}
          onSave={(payload) => writeMutation.mutate(payload)}
        />
      )}

      {visibleRumors.length === 0 && !adding && (
        <div className="bg-[#0f1219] border border-slate-700 rounded-xl p-10 text-center text-slate-500 text-sm italic">
          No rumors to show.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleRumors.map((rumor) =>
          editingId === rumor.id ? (
            <RumorForm
              key={rumor.id}
              initial={rumor}
              saving={writeMutation.isPending}
              onCancel={() => setEditingId(null)}
              onSave={(payload) => writeMutation.mutate({ ...payload, id: rumor.id })}
            />
          ) : (
            <RumorCard
              key={rumor.id}
              rumor={rumor}
              isGM={isGM}
              onEdit={() => setEditingId(rumor.id)}
              onDelete={() => {
                if (confirm("Remove this rumor?")) deleteMutation.mutate(rumor.id);
              }}
              onApprove={() => writeMutation.mutate({ id: rumor.id, is_approved: true })}
            />
          ),
        )}
      </div>
    </div>
  );
}

function RumorCard({ rumor, isGM, onEdit, onDelete, onApprove }) {
  const status = STATUS_STYLES[rumor.status] || STATUS_STYLES.unverified;
  return (
    <article className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-5 shadow-inner">
      <div className="flex items-start gap-3">
        <MessageSquare className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="outline" className={`text-[10px] ${status.cls}`}>{status.label}</Badge>
            {rumor.mole_accessible && (
              <Badge variant="outline" className="text-[10px] border-purple-500/40 text-purple-300">
                🔒 Mole
              </Badge>
            )}
            {isGM && rumor.is_approved === false && (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                ⏳ Pending
              </Badge>
            )}
            {isGM && typeof rumor.is_true === "boolean" && (
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  rumor.is_true
                    ? "bg-emerald-900/30 text-emerald-400 border-emerald-800/30"
                    : "bg-red-900/30 text-red-400 border-red-800/30"
                }`}
              >
                GM: {rumor.is_true ? "TRUE" : "FALSE"}
              </Badge>
            )}
          </div>
          <blockquote className="text-sm text-slate-200 italic leading-relaxed">
            “{rumor.content}”
          </blockquote>
          {rumor.source && (
            <p className="text-[11px] text-slate-500 mt-2">
              Source: <span className="text-slate-400 italic">{rumor.source}</span>
            </p>
          )}
          {isGM && (
            <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-700">
              {rumor.is_approved === false && (
                <Button size="sm" variant="outline" onClick={onApprove} className="text-emerald-300 border-emerald-700">
              <Check className="w-3 h-3 mr-1" /> Approve
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onEdit} className="text-slate-300">
            <Pencil className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete} className="text-red-400 border-red-700">
            <Trash2 className="w-3 h-3 mr-1" /> Delete
          </Button>
        </div>
      )}
        </div>
      </div>
    </article>
  );
}

function RumorForm({ initial, saving, onCancel, onSave }) {
  const [content, setContent] = useState(initial?.content || "");
  const [source, setSource] = useState(initial?.source || "");
  const [isTrue, setIsTrue] = useState(initial?.is_true ?? false);
  const [moleAccessible, setMoleAccessible] = useState(!!initial?.mole_accessible);
  const [status, setStatus] = useState(initial?.status || "unverified");

  const save = () => {
    if (!content.trim()) { toast.error("Write the rumor first."); return; }
    onSave({
      content: content.trim(),
      source: source.trim() || null,
      is_true: !!isTrue,
      mole_accessible: !!moleAccessible,
      status,
      // Auto-approve when a GM edits manually — only auto-generated
      // entries from Legend Tracker come in as is_approved = false.
      is_approved: true,
    });
  };

  return (
    <div className="bg-[#0f1219] border border-[#37F2D1]/40 rounded-xl p-4 space-y-3 md:col-span-2">
      <div>
        <Label className="text-xs text-slate-300">Rumor content</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Whispered at the inn: ..."
          className="bg-[#050816] border-slate-600 text-white placeholder:text-slate-500 mt-1"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-300">Source NPC</Label>
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. A drunk sailor at the docks"
            className="bg-[#050816] border-slate-600 text-white placeholder:text-slate-500 mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-300">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-[#050816] border-slate-600 text-white mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unverified">Unverified</SelectItem>
              <SelectItem value="verified">Verified ✅</SelectItem>
              <SelectItem value="debunked">Debunked ❌</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <Checkbox checked={isTrue} onCheckedChange={(v) => setIsTrue(!!v)} />
          <span>Rumor is true <span className="text-slate-500">(GM-only knowledge)</span></span>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <Checkbox checked={moleAccessible} onCheckedChange={(v) => setMoleAccessible(!!v)} />
          <span>Visible to moles only</span>
        </label>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button
          onClick={save}
          disabled={saving}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save Rumor"}
        </Button>
      </div>
    </div>
  );
}
