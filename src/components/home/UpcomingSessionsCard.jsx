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
  // For each campaign we resolve an "effective" next-session
  // timestamp. The GM-set explicit `next_session_time` wins; if
  // that's not set we fall back to computing the next occurrence
  // of the campaign's recurring `session_day` / `session_time`
  // schedule. Campaigns with neither are excluded.
  const upcoming = useMemo(() => {
    const now = Date.now();
    return campaigns
      .map((c) => {
        const explicit = c.next_session_time
          ? new Date(c.next_session_time).getTime()
          : NaN;
        const computed = Number.isFinite(explicit) && explicit > now
          ? explicit
          : nextRecurringOccurrenceMs(c.session_day, c.session_time);
        return { campaign: c, when: computed };
      })
      .filter((row) => Number.isFinite(row.when) && row.when > now)
      .sort((a, b) => a.when - b.when)
      .slice(0, 4);
  }, [campaigns]);

  return (
    <div className="col-span-4 rounded-3xl p-5 h-[320px] flex flex-col relative overflow-hidden">
      <div className="theme-homepage-card absolute inset-0" />
      <div className="relative z-10 flex flex-col h-full">
        <h3 className="text-xl font-bold text-white mb-3 text-center flex items-center justify-center gap-1.5">
          <Calendar className="w-4 h-4 text-yellow-300" />
          Upcoming Sessions
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
            {upcoming.map(({ campaign: c, when }) => (
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
                  <span className="truncate">{formatScheduled(when)}</span>
                </div>
                <p className="text-[10px] font-semibold text-[#FF5722] mt-0.5">
                  {formatCountdown(when)}
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
 * "Fri 7:00 PM" / "Mar 4 · 7:00 PM" formatting. Accepts an ms
 * timestamp (resolved earlier from either next_session_time or the
 * recurring session_day / session_time fallback). Uses the local
 * timezone so the player sees the time their own clock shows when
 * the session starts.
 */
function formatScheduled(ms) {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
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
function formatCountdown(ms) {
  if (!Number.isFinite(ms)) return "";
  const diffMs = ms - Date.now();
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

/**
 * Computes the next occurrence (as ms epoch) of a recurring
 * weekly session. `sessionDay` is a full day name from the
 * canonical list ("Sunday".."Saturday") set in
 * CampaignSettingsStep.jsx. `sessionTime` is a 24-hour "HH:MM"
 * string (the storage format documented in
 * src/utils/sessionTime.js). Returns NaN when either input is
 * missing or unparseable so the caller's Number.isFinite check
 * filters the row out cleanly.
 *
 * If today is the right weekday and the time is still in the
 * future, the next occurrence is today. Otherwise it advances to
 * the next weekly slot (1-7 days ahead).
 */
const DAY_NAME_TO_INDEX = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

function nextRecurringOccurrenceMs(sessionDay, sessionTime) {
  if (!sessionDay || !sessionTime) return NaN;
  const targetDow = DAY_NAME_TO_INDEX[sessionDay];
  if (targetDow == null) return NaN;
  const m = String(sessionTime).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return NaN;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh > 23 || mm > 59) return NaN;
  const now = new Date();
  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);
  const todayDow = now.getDay();
  let daysAhead = (targetDow - todayDow + 7) % 7;
  if (daysAhead === 0 && target.getTime() <= now.getTime()) daysAhead = 7;
  target.setDate(target.getDate() + daysAhead);
  return target.getTime();
}
