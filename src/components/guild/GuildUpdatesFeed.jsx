import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ScrollText } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";

/**
 * Aggregated campaign-updates feed for the Guild Hall.
 *
 * Pulls the latest 20 campaign_updates rows where the campaign belongs
 * to any guild member (as GM or player). Shows campaign-name badge,
 * update title/excerpt, and timestamp. Falls back to a friendly
 * placeholder when the guild hasn't logged anything yet.
 */
export default function GuildUpdatesFeed({ memberIds = [] }) {
  // Step 1 — look up the campaigns tied to the guild so we can scope
  // the update query to only their rows. Re-uses the same rows the
  // Active Campaigns section pulls but at a different query key to
  // avoid fighting its cache shape.
  const { data: guildCampaigns = [] } = useQuery({
    queryKey: ["guildFeedCampaigns", memberIds.sort().join(",")],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const ors = memberIds
        .map((id) => `game_master_id.eq.${id},player_ids.cs.["${id}"]`)
        .join(",");
      const { data } = await supabase
        .from("campaigns")
        .select("id, name")
        .or(ors);
      return data || [];
    },
    enabled: memberIds.length > 0,
  });

  const campaignIds = useMemo(() => guildCampaigns.map((c) => c.id), [guildCampaigns]);
  const campaignNameById = useMemo(() => {
    const map = new Map();
    for (const c of guildCampaigns) map.set(c.id, c.name);
    return map;
  }, [guildCampaigns]);

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["guildUpdatesFeed", campaignIds.sort().join(",")],
    queryFn: async () => {
      if (campaignIds.length === 0) return [];
      const { data } = await supabase
        .from("campaign_updates")
        .select("id, campaign_id, title, content, created_date, created_at")
        .in("campaign_id", campaignIds)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: campaignIds.length > 0,
  });

  return (
    <section>
      <h2
        className="text-xl font-black text-amber-200 mb-4 flex items-center gap-2"
        style={{ fontFamily: "'Cinzel', 'Cream', Georgia, serif" }}
      >
        <ScrollText className="w-5 h-5" /> Campaign Updates
      </h2>

      {isLoading ? (
        <p className="text-sm text-slate-500 italic">Gathering tales…</p>
      ) : updates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-amber-500/30 bg-[#0b1324]/60 p-6 text-center">
          <ScrollText className="w-8 h-8 text-amber-400/70 mx-auto mb-2" />
          <p className="text-sm text-amber-100/80">
            Campaign updates will appear here as your guild adventures together.
          </p>
        </div>
      ) : (
        <ul className="rounded-lg border border-slate-700 bg-[#0b1324] divide-y divide-slate-800 max-h-[480px] overflow-y-auto custom-scrollbar">
          {updates.map((u) => (
            <FeedItem
              key={u.id}
              update={u}
              campaignName={campaignNameById.get(u.campaign_id) || "Campaign"}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FeedItem({ update, campaignName }) {
  const when = update.created_at || update.created_date;
  const whenLabel = when
    ? new Date(when).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  const excerpt = (update.content || "").replace(/\s+/g, " ").trim().slice(0, 180);

  return (
    <li className="px-4 py-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={createPageUrl("CampaignUpdates") + `?id=${update.campaign_id}`}
          className="inline-block text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 border border-amber-500/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 transition-colors truncate max-w-[60%]"
        >
          {campaignName}
        </Link>
        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">{whenLabel}</span>
      </div>
      {update.title && <p className="text-sm font-bold text-white truncate">{update.title}</p>}
      {excerpt && (
        <p className="text-[12px] text-slate-300 leading-relaxed line-clamp-3">{excerpt}</p>
      )}
    </li>
  );
}
