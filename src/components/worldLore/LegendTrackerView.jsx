import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Crown, Trophy, Check, Lock } from "lucide-react";
import { LEGEND_TITLES, evaluateTitles, titleById } from "@/data/legendTitles";

/**
 * Legend Tracker panel. Reads each party character's `character_stats`
 * + `achievements` rows, evaluates the canonical title catalogue,
 * shows earned / unearned titles with progress bars, and lets each
 * player (or the GM) pick an active title. When a new title is
 * earned and it wasn't in `character.earned_titles` before, we
 * auto-generate a pending rumor so the GM can approve it for the
 * board.
 */
export default function LegendTrackerView({
  campaignId, campaign, user, isGM, partyCharacters = [],
}) {
  const queryClient = useQueryClient();
  const [selectedCharacterId, setSelectedCharacterId] = React.useState(null);

  // Default to the viewer's own character if they have one; GMs with
  // no character fall back to the first party member.
  React.useEffect(() => {
    if (selectedCharacterId) return;
    if (partyCharacters.length === 0) return;
    const mine = partyCharacters.find((c) => c.user_id === user?.id);
    setSelectedCharacterId((mine || partyCharacters[0])?.id || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyCharacters, user?.id]);

  const selected = partyCharacters.find((c) => c.id === selectedCharacterId) || null;
  const ownsCharacter = !!selected && selected.user_id === user?.id;
  const canEditActive = isGM || ownsCharacter;

  const { data: statsRows = [] } = useQuery({
    queryKey: ["characterStats", selected?.id, campaignId],
    queryFn: () => base44.entities.CharacterStat.filter({
      character_id: selected.id,
      campaign_id: campaignId,
    }).catch(() => []),
    enabled: !!selected?.id && !!campaignId,
    initialData: [],
  });
  const stats = statsRows[0] || {};

  const { data: achievements = [] } = useQuery({
    queryKey: ["achievementsForTitles", selected?.user_id],
    queryFn: () => base44.entities.Achievement.filter({ user_id: selected.user_id }).catch(() => []),
    enabled: !!selected?.user_id,
    initialData: [],
  });

  const earnedIds = useMemo(
    () => new Set(evaluateTitles({ stats, achievements })),
    [stats, achievements],
  );

  const persistedEarned = useMemo(
    () => new Set(Array.isArray(selected?.earned_titles) ? selected.earned_titles : []),
    [selected],
  );

  const newlyEarned = useMemo(
    () => Array.from(earnedIds).filter((id) => !persistedEarned.has(id)),
    [earnedIds, persistedEarned],
  );

  // Persist the earned-titles set + post auto-rumors when a character
  // first meets a title's condition. Runs in the background whenever
  // the evaluation delta is non-empty.
  const autoRumorMutation = useMutation({
    mutationFn: async () => {
      if (!selected || newlyEarned.length === 0) return;
      const updatedEarned = Array.from(new Set([...persistedEarned, ...newlyEarned]));
      await base44.entities.Character.update(selected.id, { earned_titles: updatedEarned }).catch(() => {});
      for (const id of newlyEarned) {
        const meta = titleById(id);
        if (!meta) continue;
        try {
          await base44.entities.WorldLoreRumor.create({
            campaign_id: campaignId,
            content: `Word has spread of ${selected.name} ${meta.title}. ${meta.rumorFlavor || ""}`.trim(),
            source: "Town gossip",
            is_true: true,
            status: "unverified",
            is_auto_generated: true,
            is_approved: false,
            created_by: user?.id,
            created_at: new Date().toISOString(),
          });
        } catch (err) {
          console.error("Auto-rumor failed:", err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignCharacters", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["worldLoreRumors", campaignId] });
    },
  });

  React.useEffect(() => {
    if (newlyEarned.length > 0 && (isGM || ownsCharacter)) {
      autoRumorMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newlyEarned.length, selected?.id]);

  const setActive = useMutation({
    mutationFn: async (titleText) =>
      base44.entities.Character.update(selected.id, { active_title: titleText || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignCharacters", campaignId] });
      toast.success("Active title updated.");
    },
    onError: (err) => toast.error(err?.message || "Couldn't set title."),
  });

  if (partyCharacters.length === 0) {
    return (
      <div className="bg-[#0f1219] border border-slate-700 rounded-xl p-10 text-center text-slate-500 text-sm italic">
        No characters in this campaign yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3 flex-wrap">
        <Crown className="w-5 h-5 text-[#37F2D1]" />
        <h2 className="text-xl font-bold text-white">Legend Tracker</h2>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-slate-400 uppercase tracking-widest">Viewing</label>
          <Select value={selectedCharacterId || ""} onValueChange={setSelectedCharacterId}>
            <SelectTrigger className="bg-[#050816] border-slate-600 text-white h-9 text-sm min-w-[180px]">
              <SelectValue placeholder="Pick a character" />
            </SelectTrigger>
            <SelectContent>
              {partyCharacters.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {selected && (
        <div className="bg-[#1a1f2e] border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            {selected.avatar_url ? (
              <img src={selected.avatar_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-slate-800" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold text-white">
                {selected.name}{' '}
                {selected.active_title && (
                  <span className="text-[#37F2D1]">{selected.active_title}</span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                Level {selected.level || 1} · {[selected.race, selected.class].filter(Boolean).join(" · ")}
              </div>
            </div>
            {canEditActive && (
              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase tracking-widest text-slate-400">Active title</label>
                <Select
                  value={selected.active_title || "none"}
                  onValueChange={(v) => setActive.mutate(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="bg-[#050816] border-slate-600 text-white h-8 text-xs min-w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {LEGEND_TITLES.filter((t) => earnedIds.has(t.id)).map((t) => (
                      <SelectItem key={t.id} value={t.title}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <StatsSummary stats={stats} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {LEGEND_TITLES.map((title) => (
          <TitleCard
            key={title.id}
            title={title}
            earned={earnedIds.has(title.id)}
            progress={title.progress({ stats, achievements })}
          />
        ))}
      </div>
    </div>
  );
}

function TitleCard({ title, earned, progress }) {
  const pct = progress?.target
    ? Math.min(100, Math.round((Number(progress.current || 0) / Number(progress.target)) * 100))
    : 0;
  return (
    <article
      className={`bg-[#0f1219] border rounded-xl p-3 ${
        earned ? "border-[#37F2D1]/60 shadow-[0_0_16px_rgba(55,242,209,0.15)]" : "border-slate-700 opacity-80"
      }`}
    >
      <div className="flex items-center gap-2">
        {earned ? (
          <Trophy className="w-4 h-4 text-[#37F2D1]" />
        ) : (
          <Lock className="w-4 h-4 text-slate-500" />
        )}
        <div className={`text-sm font-bold ${earned ? "text-[#37F2D1]" : "text-slate-300"}`}>
          {title.title}
        </div>
        <Badge variant="outline" className="ml-auto text-[10px] border-slate-600 text-slate-400">
          {title.category}
        </Badge>
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{title.description}</p>
      {!earned && progress?.target ? (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Progress</span>
            <span>{progress.current}/{progress.target}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 mt-0.5 overflow-hidden">
            <div className="h-full rounded-full bg-[#37F2D1]/60" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : earned ? (
        <div className="flex items-center gap-1 text-[11px] text-emerald-300 mt-2">
          <Check className="w-3 h-3" /> Earned
        </div>
      ) : null}
    </article>
  );
}

function StatsSummary({ stats }) {
  const cells = [
    { label: "Damage dealt",    value: stats?.total_damage_dealt || 0 },
    { label: "Healing done",    value: stats?.total_healing_done || 0 },
    { label: "Kills",           value: stats?.kills || stats?.total_kills || 0 },
    { label: "Nat 20s",         value: stats?.nat_20s || 0 },
    { label: "Nat 1s",          value: stats?.nat_1s || 0 },
    { label: "Times downed",    value: stats?.times_downed || 0 },
  ];
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {cells.map((c) => (
        <div key={c.label} className="bg-[#050816] border border-slate-700 rounded p-2 text-center">
          <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{c.label}</div>
          <div className="text-white font-bold text-sm">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
