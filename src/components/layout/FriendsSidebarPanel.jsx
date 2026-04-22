import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Crown, Users } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { listGuildMembers } from "@/api/billingClient";
import { createPageUrl } from "@/utils";
import StatusDot from "@/components/presence/StatusDot";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Compact people-roster for the sidebar.
 *
 * Two modes, picked automatically:
 *   - Guild member: shows up to 5 fellow members (owner first), labeled
 *     "<Owner>'s Guild".
 *   - Otherwise:    shows the user's first 5 accepted friends.
 *
 * Each avatar is a 32px circle with a corner status dot, the user's
 * favorite_class icon underneath, and a hover tooltip with name +
 * display_title + tagline so the row feels alive without taking up
 * a full panel of vertical space.
 */
export default function FriendsSidebarPanel({ user, friendIds = [], sub }) {
  const guildOwnerId = sub?.guildOwnerId || (sub?.isGuildOwner ? user?.id : null);
  const inGuild = !!guildOwnerId;

  const { data: guildRows = [] } = useQuery({
    queryKey: ["sidebarGuildMembers", guildOwnerId],
    queryFn: () => listGuildMembers(guildOwnerId),
    enabled: inGuild,
  });

  const memberIds = useMemo(() => {
    const ids = new Set();
    if (guildOwnerId) ids.add(guildOwnerId);
    for (const row of guildRows) {
      if (row.user_id) ids.add(row.user_id);
    }
    return Array.from(ids);
  }, [guildRows, guildOwnerId]);

  // The set we actually want to render. Guild members trump friends so
  // a player who's both in a guild AND has friends sees their guild.
  const targetIds = inGuild ? memberIds.slice(0, 5) : friendIds.slice(0, 5);

  const { data: profiles = [] } = useQuery({
    queryKey: ["sidebarRosterProfiles", inGuild, targetIds.sort().join(",")],
    queryFn: async () => {
      if (targetIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username, full_name, avatar_url, status, last_seen_at, favorite_class, favorite_class_icon, tagline, display_title")
        .in("user_id", targetIds);
      return data || [];
    },
    enabled: targetIds.length > 0,
  });

  // Preserve the requested order (owner first for guilds, then by
  // friendship recency for friends-mode).
  const ordered = useMemo(() => {
    const byId = new Map(profiles.map((p) => [p.user_id, p]));
    return targetIds.map((id) => byId.get(id)).filter(Boolean);
  }, [profiles, targetIds]);

  if (ordered.length === 0) return null;

  const guildOwner = inGuild ? ordered.find((p) => p.user_id === guildOwnerId) : null;
  const guildLabel = guildOwner
    ? `${guildOwner.username || guildOwner.full_name || "Your"}'s Guild`
    : "Your Guild";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="px-2 pt-1">
        {inGuild ? (
          <p className="text-[10px] uppercase tracking-widest text-amber-300/80 px-1 mb-1.5 flex items-center gap-1">
            <Crown className="w-3 h-3" /> {guildLabel}
          </p>
        ) : (
          <p className="text-[10px] uppercase tracking-widest text-slate-500 px-1 mb-1.5 flex items-center gap-1">
            <Users className="w-3 h-3" /> Friends
          </p>
        )}

        <div className="grid grid-cols-5 gap-1.5">
          {ordered.map((p) => (
            <RosterAvatar key={p.user_id} profile={p} isOwner={inGuild && p.user_id === guildOwnerId} />
          ))}
        </div>

        <Link
          to={createPageUrl("Friends")}
          className="block text-[11px] text-[#37F2D1] hover:text-white transition-colors mt-2 px-1"
        >
          See all friends →
        </Link>
      </div>
    </TooltipProvider>
  );
}

function RosterAvatar({ profile, isOwner }) {
  const name = profile.username || profile.full_name || "Unknown";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={`${createPageUrl("UserProfile")}?id=${profile.user_id}`}
          className="flex flex-col items-center group"
        >
          <span className="relative inline-block">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full object-cover object-top border border-slate-700 group-hover:border-[#37F2D1] transition-colors"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200 border border-slate-700 group-hover:border-[#37F2D1] transition-colors">
                {name[0].toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5">
              <StatusDot profile={profile} size="sm" border="#1E2430" />
            </span>
            {isOwner && (
              <Crown
                className="absolute -top-1 -right-1 w-3 h-3 text-amber-400 drop-shadow"
                fill="currentColor"
              />
            )}
          </span>
          <span className="h-3 mt-0.5 flex items-center justify-center">
            {profile.favorite_class_icon ? (
              <img
                src={profile.favorite_class_icon}
                alt={profile.favorite_class || ""}
                className="w-3 h-3 object-contain opacity-80 group-hover:opacity-100"
              />
            ) : (
              <span className="block w-3 h-3" />
            )}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="bg-[#0b1220] border border-slate-700 text-white px-3 py-2 max-w-[220px]"
      >
        <p className="font-bold text-sm leading-tight">{name}</p>
        {profile.display_title && (
          <p className="text-[11px] text-[#37F2D1] uppercase tracking-widest mt-0.5">
            {profile.display_title}
          </p>
        )}
        {profile.tagline && (
          <p className="text-[11px] text-slate-300 italic mt-1 line-clamp-3">
            "{profile.tagline}"
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
