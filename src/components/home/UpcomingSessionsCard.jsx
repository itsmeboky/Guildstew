import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Upcoming Sessions — campaigns the current user participates in,
 * sorted by their next scheduled session. Replaces the previous
 * "Newest Game Pack" widget at the home page bottom row.
 *
 * Data:
 *   - campaigns table, filtered to those where the user is GM or
 *     in player_ids
 *   - `next_session_time` ISO timestamp on the campaign row drives
 *     sort + future-only filtering
 *
 * No new tables. The shape lives in src/pages/CampaignSettings.jsx
 * already (updateSessionMutation writes next_session_time +
 * session_reminders_enabled). Recurring session_day / session_time
 * strings ALSO exist on campaigns but aren't authoritative for
 * "next scheduled" — next_session_time is the GM-set ISO point
 * the reminder system already keys off, so we use it here too.
 *
 * Click a session → opens that campaign's main view.
 */
export default function UpcomingSessionsCard({ user }) {
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["upcomingSessions:campaigns", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const all = await base44.entities.Campaign.list("-updated_date");
      return (all || []).filter(
        (c) => c.game_master_id === user.id || c.player_ids?.includes(user.id),
      );
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Filter to future-scheduled, sort by soonest, cap at 4.
  const upcoming = useMemo(() => {
    const now = Date.now();
    return campaigns
      .filter((c) => {
        const t = c.next_session_time;
        if (!t) return false;
        const ms = new Date(t).getTime();
        return Number.isFinite(ms) && ms > now;
      })
      .sort(
        (a, b) =>
          new Date(a.next_session_time).getTime() -
          new Date(b.next_session_time).getTime(),
      )
      .slice(0, 4);
  }, [campaigns]);

  return (
    <div className="col-span-2 rounded-3xl p-5 h-[320px] flex flex-col relative overflow-hidden">
      <div className="theme-homepage-card absolute inset-0" />
      <div className="relative z-10 flex flex-col h-full">
        <h3 className="text-xl font-bold text-white mb-3 text-center flex items-center justify-center gap-1.5">
          <Calendar className="w-4 h-4 text-yellow-300" />
          Upcoming
        </h3>

        {isLoading ? (
          <UpcomingSessionsSkeleton />
        ) : upcoming.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
            <Calendar className="w-7 h-7 text-white/40 mb-2" />
            <p className="text-white/80 text-xs leading-snug mb-2">
              No upcoming sessions scheduled.
            </p>
            <p className="text-[11px] text-white/60 leading-snug">
              Time to plan your next adventure!
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
            {upcoming.map((c) => (
              <Link
                key={c.id}
                to={createPageUrl("CampaignView") + `?id=${c.id}`}
                className="block bg-white/95 hover:bg-white rounded-xl px-2.5 py-2 transition-colors group"
              >
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-[#FF5722]">
                  {c.title || c.name || "Untitled Campaign"}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-600">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{formatScheduled(c.next_session_time)}</span>
                </div>
                <p className="text-[10px] font-semibold text-[#FF5722] mt-0.5">
                  {formatCountdown(c.next_session_time)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UpcomingSessionsSkeleton() {
  return (
    <div className="flex-1 space-y-2 pr-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white/80 rounded-xl px-2.5 py-2 space-y-1.5">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/**
 * "Fri 7:00 PM" / "Mar 4 · 7:00 PM" formatting. Uses the local
 * timezone so the player sees the time their own clock shows when
 * the session starts.
 */
function formatScheduled(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const datePart = d.toLocaleDateString(undefined, {
    weekday: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    month: "short",
    day: "numeric",
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

/**
 * "in 2 hours" / "in 3 days" / "starting soon" countdown. Caps at
 * "in N days" — anything further out shows the actual date in
 * formatScheduled above.
 */
function formatCountdown(iso) {
  if (!iso) return "";
  const diffMs = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(diffMs)) return "";
  if (diffMs <= 0) return "starting now";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) {
    if (minutes < 15) return "starting soon";
    return `in ${minutes} min`;
  }
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(diffMs / 86_400_000);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
