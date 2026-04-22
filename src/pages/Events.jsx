import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ExternalLink, Trophy, Sparkles, Users, Hammer } from "lucide-react";
import { supabase } from "@/api/supabaseClient";

/**
 * /events
 *
 * Published community events from the `community_events` table.
 * Admins manage this list from Admin → Community Events.
 */
const TYPE_META = {
  community: { label: "Community", icon: Users,    accent: "#37F2D1" },
  contest:   { label: "Contest",   icon: Trophy,   accent: "#fbbf24" },
  game_jam:  { label: "Game Jam",  icon: Hammer,   accent: "#a855f7" },
  spotlight: { label: "Spotlight", icon: Sparkles, accent: "#f8a47c" },
};

export default function Events() {
  const { data: events = [] } = useQuery({
    queryKey: ["communityEvents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_events")
        .select("*")
        .eq("is_published", true)
        .order("start_date", { ascending: false });
      return data || [];
    },
  });

  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.start_date).getTime() >= now);
  const past = events.filter((e) => new Date(e.start_date).getTime() < now);

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Calendar className="w-7 h-7 text-[#37F2D1]" />
            Community Events
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Contests, game jams, featured creators, and gatherings.
          </p>
        </div>

        {events.length === 0 && (
          <p className="text-center text-slate-500 italic py-20">
            No events scheduled yet. Check back soon.
          </p>
        )}

        {upcoming.length > 0 && (
          <section>
            <h2 className="text-lg font-black text-white mb-3">Upcoming</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-lg font-black text-slate-400 mb-3">Past</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {past.map((e) => <EventCard key={e.id} event={e} muted />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function EventCard({ event, muted }) {
  const meta = TYPE_META[event.event_type] || TYPE_META.community;
  const Icon = meta.icon;
  const hasLink = !!event.link_url;

  const body = (
    <div
      className={`bg-[#1E2430] border rounded-lg overflow-hidden h-full transition-all ${
        muted ? "opacity-70" : "hover:-translate-y-0.5 hover:shadow-lg"
      }`}
      style={{ borderColor: muted ? "#2a3441" : `${meta.accent}55` }}
    >
      {event.image_url && (
        <div className="h-36 bg-[#050816] overflow-hidden">
          <img src={event.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
            style={{ backgroundColor: `${meta.accent}22`, color: meta.accent, border: `1px solid ${meta.accent}55` }}
          >
            <Icon className="w-3 h-3" /> {meta.label}
          </span>
        </div>
        <h3 className="text-lg font-black text-white">{event.title}</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {new Date(event.start_date).toLocaleString(undefined, {
            month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
          })}
          {event.end_date && ` → ${new Date(event.end_date).toLocaleDateString()}`}
        </p>
        {event.description && (
          <p className="text-sm text-slate-300 mt-2 line-clamp-3">{event.description}</p>
        )}
        {hasLink && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#37F2D1] mt-3">
            Learn more <ExternalLink className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );

  return hasLink ? (
    <a href={event.link_url} target="_blank" rel="noopener noreferrer" className="block">
      {body}
    </a>
  ) : body;
}
