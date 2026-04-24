import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { ACHIEVEMENT_DEFINITIONS } from "@/data/achievementDefinitions";
import { displayName } from "@/utils/displayName";

// Placeholder roster for empty-state — the Hall should feel seeded
// even in a brand-new guild so members know what to aim for.
const PLACEHOLDER_ACHIEVEMENTS = [
  { icon: "🎉", title: "First Campaign Completed", description: "Wrap your first campaign as a guild." },
  { icon: "🎲", title: "100 Dice Rolled",          description: "Roll 100 dice across all members." },
  { icon: "👑", title: "First Character to Level 20", description: "Reach the peak with any guild member." },
];

const RARITY = {
  common:    { color: "#cbd5f5", bg: "rgba(100,116,139,0.22)" },
  uncommon:  { color: "#6ee7b7", bg: "rgba(16,185,129,0.18)" },
  rare:      { color: "#93c5fd", bg: "rgba(59,130,246,0.18)" },
  epic:      { color: "#c4b5fd", bg: "rgba(139,92,246,0.18)" },
  legendary: { color: "#fbbf24", bg: "rgba(245,158,11,0.22)" },
};

/**
 * Achievements earned by the guild's members.
 *
 * Pulls every `achievements` row for the member id set, joins the
 * display metadata from ACHIEVEMENT_DEFINITIONS, and shows who
 * earned what and when. When the guild has zero earnings, falls
 * back to a seed row of example achievements so the section still
 * communicates intent.
 */
export default function GuildAchievements({ memberIds = [], profilesById = new Map() }) {
  const { data: earned = [], isLoading } = useQuery({
    queryKey: ["guildAchievements", memberIds.sort().join(",")],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data } = await supabase
        .from("achievements")
        .select("id, user_id, achievement_key, earned_at, created_at")
        .in("user_id", memberIds)
        .order("earned_at", { ascending: false, nullsFirst: false })
        .limit(30);
      return data || [];
    },
    enabled: memberIds.length > 0,
  });

  const enriched = useMemo(
    () =>
      earned.map((row) => {
        const def = ACHIEVEMENT_DEFINITIONS[row.achievement_key] || {};
        return {
          ...row,
          title: def.title || row.achievement_key || "Achievement",
          description: def.description || "",
          icon: def.icon || "🏆",
          rarity: def.rarity || "common",
        };
      }),
    [earned],
  );

  return (
    <section>
      <h2
        className="text-xl font-black text-amber-200 mb-4 flex items-center gap-2"
        style={{ fontFamily: "'Cinzel', 'Cream', Georgia, serif" }}
      >
        <Trophy className="w-5 h-5" /> Achievements
      </h2>

      {isLoading ? (
        <p className="text-sm text-slate-500 italic">Tallying deeds…</p>
      ) : enriched.length === 0 ? (
        <EmptyAchievements />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {enriched.map((a) => {
            const profile = profilesById.get(a.user_id);
            const earnerName = profile ? displayName(profile, { fallback: "A guildmate" }) : "A guildmate";
            const rarity = RARITY[a.rarity] || RARITY.common;
            const when = a.earned_at || a.created_at;
            const whenLabel = when
              ? new Date(when).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
              : "";
            return (
              <div
                key={a.id}
                className="rounded-lg p-3 flex items-start gap-3"
                style={{
                  backgroundColor: "#0b1324",
                  border: `1px solid ${rarity.color}55`,
                  boxShadow: `0 0 12px ${rarity.bg}`,
                }}
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: rarity.bg }}
                >
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-white truncate">{a.title}</p>
                    <span
                      className="text-[9px] font-black uppercase tracking-widest rounded-full px-1.5 py-0.5 flex-shrink-0"
                      style={{ color: rarity.color, backgroundColor: rarity.bg }}
                    >
                      {a.rarity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Earned by <span className="text-amber-200 font-bold">{earnerName}</span>
                    {whenLabel ? ` · ${whenLabel}` : ""}
                  </p>
                  {a.description && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{a.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyAchievements() {
  return (
    <div>
      <p className="text-xs text-slate-400 italic mb-3">
        <Sparkles className="w-3 h-3 inline-block mr-1 text-amber-300" />
        No feats earned yet. Here's what to chase:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PLACEHOLDER_ACHIEVEMENTS.map((a) => (
          <div
            key={a.title}
            className="rounded-lg border border-dashed border-amber-500/30 bg-[#0b1324]/60 p-3 flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-xl">
              {a.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-amber-100 truncate">{a.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{a.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
