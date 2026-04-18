import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Crown } from "lucide-react";
import {
  LEGEND_TITLES,
  LEGEND_CATEGORIES,
  evaluateTitles,
  titleById,
  buildTitleRumor,
} from "@/data/legendTitles";

const NO_TITLE_VALUE = "__none__";

/**
 * Legend Tracker panel — forum styling. Reads each party character's
 * character_stats + achievements, evaluates the title catalog, and
 * shows earned / unearned titles with progress bars. Per-character
 * active-title selector writes to character.active_title. Newly
 * earned titles auto-post a pending rumor to the Rumor Board for
 * GM approval.
 */
export default function LegendTrackerView({
  campaignId, user, isGM, partyCharacters = [],
}) {
  const queryClient = useQueryClient();
  const [selectedCharacterId, setSelectedCharacterId] = React.useState(null);

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
            content: buildTitleRumor(selected, meta),
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
      queryClient.invalidateQueries({ queryKey: ["worldLoreRumorsAll", campaignId] });
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
      <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-10 text-center text-slate-500 text-sm italic">
        No characters in this campaign yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3 flex-wrap">
        <Crown className="w-5 h-5 text-[#37F2D1]" />
        <h2 className="text-xl font-bold text-white">Legend Tracker</h2>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-slate-400 uppercase tracking-widest">Viewing</label>
          <Select value={selectedCharacterId || ""} onValueChange={setSelectedCharacterId}>
            <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white h-9 text-sm min-w-[180px]">
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
        <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-widest">Active Title</h3>
              <p className="text-2xl text-[#37F2D1] font-bold mt-1">
                {selected.name}{" "}
                <span className="text-[#37F2D1]">{selected.active_title || ""}</span>
                {!selected.active_title && (
                  <span className="text-slate-500 text-base italic font-normal">— no title set</span>
                )}
              </p>
            </div>
            {canEditActive && (
              <Select
                value={selected.active_title || NO_TITLE_VALUE}
                onValueChange={(v) => setActive.mutate(v === NO_TITLE_VALUE ? "" : v)}
              >
                <SelectTrigger className="w-64 bg-[#0f1219] border-slate-700 text-white h-9 text-sm">
                  <SelectValue placeholder="Choose a title..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TITLE_VALUE}>No title</SelectItem>
                  {LEGEND_TITLES.filter((t) => earnedIds.has(t.id)).map((t) => (
                    <SelectItem key={t.id} value={t.title}>
                      {t.icon} {selected.name} {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <StatsSummary stats={stats} />
        </div>
      )}

      {LEGEND_CATEGORIES.map((cat) => {
        const titles = LEGEND_TITLES.filter((t) => t.category === cat.id);
        if (titles.length === 0) return null;
        return (
          <section key={cat.id}>
            <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3">{cat.label}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {titles.map((title) => {
                const earned = earnedIds.has(title.id);
                const prog = title.progress({ stats, achievements }) || { current: 0, target: 1 };
                const pct = prog.target
                  ? Math.min(100, Math.round((Number(prog.current || 0) / Number(prog.target)) * 100))
                  : 0;
                return (
                  <article
                    key={title.id}
                    className={`bg-[#1a1f2e] border rounded-lg p-4 ${
                      earned
                        ? "border-[#37F2D1]/50 shadow-[0_0_16px_rgba(55,242,209,0.1)]"
                        : "border-slate-700/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{title.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold ${earned ? "text-[#37F2D1]" : "text-slate-500"}`}>
                          {title.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{title.description}</div>
                      </div>
                      {earned && (
                        <span className="text-[#37F2D1] text-xs font-bold uppercase tracking-wider">
                          Earned
                        </span>
                      )}
                    </div>
                    {!earned && (
                      <div className="mt-3">
                        <div className="w-full bg-slate-700/30 rounded-full h-1.5">
                          <div
                            className="bg-[#37F2D1]/50 h-1.5 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {prog.current}/{prog.target} · {Math.round(pct)}% complete
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StatsSummary({ stats }) {
  const cells = [
    { label: "Damage dealt",     value: stats?.total_damage_dealt || 0 },
    { label: "Healing done",     value: stats?.total_healing_done || 0 },
    { label: "Kills",            value: stats?.kills || stats?.total_kills || 0 },
    { label: "Nat 20s",          value: stats?.nat_20s || 0 },
    { label: "Nat 1s",           value: stats?.nat_1s || 0 },
    { label: "Times downed",     value: stats?.times_downed || 0 },
  ];
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4">
      {cells.map((c) => (
        <div key={c.label} className="bg-[#0f1219] border border-slate-700 rounded p-2 text-center">
          <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{c.label}</div>
          <div className="text-white font-bold text-sm">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
