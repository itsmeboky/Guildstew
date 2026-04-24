import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Crown, Users as UsersIcon, Dice6, Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import { displayName } from "@/utils/displayName";

const SYSTEM_LABELS = {
  dnd5e: "D&D 5e",
  dnd: "D&D 5e",
  pathfinder: "Pathfinder",
  pf2e: "Pathfinder 2e",
  cairn: "Cairn",
  custom: "Custom",
};

/**
 * Active-Campaigns strip for the Guild Hall.
 *
 * Pulls every campaign where any guild member is in `player_ids` or
 * is `game_master_id`. Each card links to the campaign if the viewer
 * is also a member; non-members see the card as read-only.
 */
export default function GuildActiveCampaigns({ memberIds = [], viewerId }) {
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["guildCampaigns", memberIds.sort().join(",")],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      // Two-branch query: GM'd by a member OR player_ids contains a
      // member. `cs` (contains) against a JSONB array works because
      // campaigns.player_ids stores text ids.
      const ors = memberIds
        .map((id) => `game_master_id.eq.${id},player_ids.cs.["${id}"]`)
        .join(",");
      const { data } = await supabase
        .from("campaigns")
        .select(
          "id, name, game_master_id, co_dm_ids, player_ids, game_system, status, last_session_ended_at, updated_at",
        )
        .or(ors)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(12);
      return data || [];
    },
    enabled: memberIds.length > 0,
  });

  const gmIds = useMemo(() => {
    const ids = new Set();
    for (const c of campaigns) if (c.game_master_id) ids.add(c.game_master_id);
    return Array.from(ids);
  }, [campaigns]);

  const { data: gmProfiles = [] } = useQuery({
    queryKey: ["guildCampaignGMProfiles", gmIds.sort().join(",")],
    queryFn: async () => {
      if (gmIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username, full_name")
        .in("user_id", gmIds);
      return data || [];
    },
    enabled: gmIds.length > 0,
  });
  const gmById = useMemo(() => {
    const map = new Map();
    for (const p of gmProfiles) map.set(p.user_id, p);
    return map;
  }, [gmProfiles]);

  return (
    <section>
      <h2
        className="text-xl font-black text-amber-200 mb-4"
        style={{ fontFamily: "'Cinzel', 'Cream', Georgia, serif" }}
      >
        Active Campaigns
      </h2>

      {isLoading && campaigns.length === 0 ? (
        <p className="text-sm text-slate-500 italic">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-sm text-slate-500 italic">
          No active campaigns yet — when a guild member starts or joins one it shows up here.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              gm={gmById.get(c.game_master_id)}
              viewerIsMember={
                !!viewerId && (
                  c.game_master_id === viewerId ||
                  (c.co_dm_ids || []).includes(viewerId) ||
                  (c.player_ids || []).includes(viewerId)
                )
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CampaignCard({ campaign, gm, viewerIsMember }) {
  const gmName = gm ? displayName(gm, { fallback: "Game Master" }) : "Game Master";
  const systemLabel = SYSTEM_LABELS[campaign.game_system] || campaign.game_system || "Custom";
  const playerCount = (campaign.player_ids || []).length;
  const lastSession = campaign.last_session_ended_at
    ? new Date(campaign.last_session_ended_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No sessions yet";

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-black text-white truncate">{campaign.name || "Untitled Campaign"}</p>
        <StatusPill status={campaign.status} />
      </div>
      <p className="text-[11px] text-amber-200/80 mt-1 flex items-center gap-1 truncate">
        <Crown className="w-3 h-3 flex-shrink-0" /> {gmName}
      </p>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
        <span className="inline-flex items-center gap-1">
          <Dice6 className="w-3 h-3" /> {systemLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <UsersIcon className="w-3 h-3" /> {playerCount} {playerCount === 1 ? "player" : "players"}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarIcon className="w-3 h-3" /> {lastSession}
        </span>
      </div>
      {viewerIsMember && (
        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#37F2D1]">
          View campaign <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </>
  );

  const cardClass =
    "rounded-lg p-3 border border-slate-700 bg-[#0b1324] transition-colors";
  if (viewerIsMember) {
    return (
      <Link
        to={createPageUrl("CampaignPanel") + `?id=${campaign.id}`}
        className={`${cardClass} hover:border-amber-500/60 hover:shadow-[0_0_14px_rgba(245,158,11,0.15)] block`}
      >
        {inner}
      </Link>
    );
  }
  return <div className={cardClass}>{inner}</div>;
}

function StatusPill({ status }) {
  const meta = {
    active: { color: "#34d399", bg: "rgba(16,185,129,0.18)" },
    planning: { color: "#fbbf24", bg: "rgba(245,158,11,0.18)" },
    paused: { color: "#94a3b8", bg: "rgba(100,116,139,0.25)" },
    completed: { color: "#38bdf8", bg: "rgba(56,189,248,0.18)" },
  };
  const key = status || "active";
  const m = meta[key] || meta.active;
  return (
    <span
      className="text-[9px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 flex-shrink-0"
      style={{ color: m.color, backgroundColor: m.bg, border: `1px solid ${m.color}55` }}
    >
      {key}
    </span>
  );
}
