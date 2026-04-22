import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ban, Plus, Trash2, Wand2, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listCampaignBans, addBan, removeBan, applyBanPreset,
  BAN_TYPES, BAN_TYPE_LABELS, BAN_PRESETS,
} from "@/lib/campaignBans";

/**
 * GM-only ban list editor rendered inside campaign settings.
 *
 * Each ban type has its own tab. Within a tab the GM can type a
 * name + optional reason and add it to the list; existing bans
 * render as removable chips grouped by type. Quick-ban presets
 * one-shot insert common lists (no flying races, no silvery barbs,
 * no wish/simulacrum).
 *
 * All writes go through lib/campaignBans so RLS (gm_manages_bans
 * in the migration) is the authoritative gate.
 */
export default function BanListEditor({ campaignId }) {
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState("spell");

  const { data: bans = [] } = useQuery({
    queryKey: ["campaignBans", campaignId],
    queryFn: () => listCampaignBans(campaignId),
    enabled: !!campaignId,
  });

  const counts = useMemo(() => {
    const c = Object.fromEntries(BAN_TYPES.map((t) => [t, 0]));
    for (const b of bans) if (c[b.ban_type] != null) c[b.ban_type] += 1;
    return c;
  }, [bans]);

  const totalsLine = BAN_TYPES
    .map((t) => `${counts[t]} ${BAN_TYPE_LABELS[t].plural.toLowerCase()}`)
    .join(", ") + " banned";

  const add = useMutation({
    mutationFn: (row) => addBan({ campaignId, ...row }),
    onSuccess: () => {
      toast.success("Ban added");
      queryClient.invalidateQueries({ queryKey: ["campaignBans", campaignId] });
    },
    onError: (err) => { console.error(err); toast.error(err?.message || "Couldn't add ban"); },
  });

  const remove = useMutation({
    mutationFn: (id) => removeBan(id),
    onSuccess: () => {
      toast.success("Ban removed");
      queryClient.invalidateQueries({ queryKey: ["campaignBans", campaignId] });
    },
    onError: (err) => { console.error(err); toast.error(err?.message || "Couldn't remove"); },
  });

  const runPreset = useMutation({
    mutationFn: (presetKey) => applyBanPreset(campaignId, presetKey),
    onSuccess: (added) => {
      toast.success(added > 0 ? `Added ${added} ban${added === 1 ? "" : "s"}.` : "Preset ran — nothing new added.");
      queryClient.invalidateQueries({ queryKey: ["campaignBans", campaignId] });
    },
    onError: (err) => { console.error(err); toast.error(err?.message || "Couldn't apply preset"); },
  });

  const forType = bans.filter((b) => b.ban_type === activeType);

  return (
    <div className="bg-[#2A3441] rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Ban className="w-6 h-6 text-rose-300" />
          Content Restrictions
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Ban specific spells, races, classes, features, or items from
          this campaign. Applicants see restrictions on the preview
          screen; characters with banned content can't be submitted.
        </p>
        <p className="text-xs text-slate-500 mt-1">{totalsLine}.</p>
      </div>

      {/* Quick presets */}
      <div className="bg-[#050816] border border-amber-500/30 rounded-lg p-3">
        <p className="text-[11px] uppercase tracking-widest text-amber-300 font-bold flex items-center gap-1 mb-2">
          <Wand2 className="w-3 h-3" /> Quick Ban Presets
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(BAN_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (confirm(`${preset.label}\n\n${preset.description}\n\nApply now?`)) {
                  runPreset.mutate(key);
                }
              }}
              disabled={runPreset.isPending}
              className="text-[11px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/40 text-amber-100 rounded px-2 py-1 font-bold disabled:opacity-50"
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-1.5">
        {BAN_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveType(t)}
            className={`text-[11px] uppercase tracking-widest font-bold px-3 py-1.5 rounded border ${
              activeType === t
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-[#050816] text-slate-300 border-slate-700 hover:border-slate-500"
            }`}
          >
            {BAN_TYPE_LABELS[t].plural} ({counts[t]})
          </button>
        ))}
      </div>

      {/* Add form */}
      <AddBanForm
        campaignId={campaignId}
        activeType={activeType}
        onAdd={(row) => add.mutate(row)}
        submitting={add.isPending}
      />

      {/* List */}
      {forType.length === 0 ? (
        <p className="text-xs text-slate-500 italic">
          No {BAN_TYPE_LABELS[activeType].plural.toLowerCase()} banned yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {forType.map((b) => (
            <li
              key={b.id}
              className="bg-[#050816] border border-rose-500/30 rounded-lg p-3 flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <Ban className="w-3.5 h-3.5 text-rose-300" />
                  {b.banned_name}
                </p>
                {b.reason && (
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{b.reason}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Remove ban on "${b.banned_name}"?`)) remove.mutate(b.id);
                }}
                disabled={remove.isPending}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddBanForm({ campaignId, activeType, onAdd, submitting }) {
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Pick a name to ban.");
      return;
    }
    onAdd({ ban_type: activeType, banned_name: trimmed, reason });
    setName("");
    setReason("");
  };

  return (
    <div className="bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-2">
      <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
        Add {BAN_TYPE_LABELS[activeType].singular}
      </p>
      <div className="flex flex-col md:flex-row gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholderFor(activeType)}
          className="bg-[#1E2430] border-slate-700 text-white text-sm md:flex-1"
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="bg-[#1E2430] border-slate-700 text-white text-sm md:flex-1"
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
        <Button
          onClick={submit}
          disabled={submitting}
          className="bg-rose-500 hover:bg-rose-400 text-white font-bold"
        >
          <Plus className="w-4 h-4 mr-1" /> Ban
        </Button>
      </div>
    </div>
  );
}

function placeholderFor(type) {
  switch (type) {
    case "spell":    return "Silvery Barbs";
    case "race":     return "Aarakocra";
    case "class":    return "Artificer";
    case "subclass": return "Twilight Domain";
    case "feature":  return "Lucky feat";
    case "item":     return "Deck of Many Things";
    default:         return "Name";
  }
}
