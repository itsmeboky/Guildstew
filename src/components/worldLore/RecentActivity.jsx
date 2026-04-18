import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { filterByVisibility } from "@/utils/worldLoreVisibility";
import { timeAgo } from "@/utils/timeAgo";

const CATEGORY_LABELS = {
  regions:    "Regions & Maps",
  political:  "Politics & Factions",
  religions:  "Deities & Religion",
  history:    "History & Timeline",
  artifacts:  "Artifacts & Relics",
};

/**
 * "Recent Activity" rail shown on the World Lore landing page.
 * Pulls the 10 newest WorldLoreEntry rows across every category
 * for this campaign, filters them through the same visibility rules
 * that gate the list views, and renders compact one-liners the GM /
 * player can click to jump into the entry's category.
 */
export default function RecentActivity({
  campaignId, user, isGM, isMole, profilesById, onOpenCategory,
}) {
  const { data: recent = [] } = useQuery({
    queryKey: ["worldLoreRecent", campaignId],
    queryFn: () => base44.entities.WorldLoreEntry
      .filter({ campaign_id: campaignId }, "-created_at", 25)
      .catch(() => []),
    enabled: !!campaignId,
    initialData: [],
  });

  const visible = useMemo(() => {
    const filtered = filterByVisibility(recent, { userId: user?.id, isGM, isMole });
    return filtered.slice(0, 10);
  }, [recent, user?.id, isGM, isMole]);

  if (visible.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
      <div className="space-y-2">
        {visible.map((entry) => {
          const author = profilesById?.get(entry.created_by || entry.author_id) || {};
          const categoryLabel = CATEGORY_LABELS[entry.category] || entry.category;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onOpenCategory?.(entry.category)}
              className="w-full text-left flex items-center gap-3 p-3 bg-[#1a1f2e] border border-slate-700/50 rounded-lg hover:border-[#37F2D1]/30 cursor-pointer transition-colors"
            >
              {author?.avatar_url ? (
                <img src={author.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-[#37F2D1]">{author?.username || "GM"}</span>
                  <span className="text-xs text-slate-500">added to</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                    {categoryLabel}
                  </span>
                </div>
                <span className="text-sm text-white truncate block">{entry.title || "Untitled"}</span>
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">
                {timeAgo(entry.created_at)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
