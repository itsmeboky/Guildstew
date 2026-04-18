import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { filterByVisibility } from "@/utils/worldLoreVisibility";
import { timeAgo } from "@/utils/timeAgo";

/**
 * Forum-style landing for the World Lore page. Renders an
 * entry-count + comment-count + last-activity card per category.
 * Clicking a card switches the parent's `category` state — parent
 * handles the route.
 */
export default function CategoryLandingCards({
  campaignId,
  categories,
  user,
  isGM,
  isMole,
  profilesById,
  onSelectCategory,
}) {
  const { data: entries = [] } = useQuery({
    queryKey: ["worldLoreEntriesAll", campaignId],
    queryFn: () => base44.entities.WorldLoreEntry
      .filter({ campaign_id: campaignId })
      .catch(() => []),
    enabled: !!campaignId,
    initialData: [],
  });

  const { data: rumors = [] } = useQuery({
    queryKey: ["worldLoreRumorsAll", campaignId],
    queryFn: () => base44.entities.WorldLoreRumor
      .filter({ campaign_id: campaignId })
      .catch(() => []),
    enabled: !!campaignId,
    initialData: [],
  });

  const { data: allComments = [] } = useQuery({
    queryKey: ["worldLoreCommentsAll", campaignId],
    queryFn: async () => {
      const ids = entries.map((e) => e.id);
      if (ids.length === 0) return [];
      const lists = await Promise.all(ids.map((id) =>
        base44.entities.WorldLoreComment.filter({ entry_id: id }).catch(() => [])
      ));
      return lists.flat();
    },
    enabled: entries.length > 0,
    initialData: [],
  });

  const visibleEntries = useMemo(
    () => filterByVisibility(entries, { userId: user?.id, isGM, isMole }),
    [entries, user?.id, isGM, isMole],
  );

  // Rumor visibility mirrors the RumorBoardView rules — players see
  // approved + role-appropriate rumors only.
  const visibleRumors = useMemo(() => {
    if (isGM) return rumors;
    return rumors.filter((r) => {
      if (r.is_approved === false) return false;
      if (r.mole_accessible && !isMole) return false;
      return true;
    });
  }, [rumors, isGM, isMole]);

  const statsByCategory = useMemo(() => {
    const map = new Map();
    for (const cat of categories) {
      map.set(cat.key, { entries: [], comments: 0 });
    }
    for (const entry of visibleEntries) {
      const bucket = map.get(entry.category);
      if (bucket) bucket.entries.push(entry);
    }
    // Comments count based on comment.entry_id resolving back to a
    // visible entry's category.
    const entryToCategory = new Map(visibleEntries.map((e) => [e.id, e.category]));
    for (const c of allComments) {
      const cat = entryToCategory.get(c.entry_id);
      if (cat && map.has(cat)) map.get(cat).comments += 1;
    }
    // Rumor board counts rumors as entries instead of lore rows.
    if (map.has("rumors")) {
      map.get("rumors").entries = visibleRumors.slice().sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
      );
    }
    return map;
  }, [categories, visibleEntries, visibleRumors, allComments]);

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const stats = statsByCategory.get(cat.key) || { entries: [], comments: 0 };
        const last = stats.entries?.[0] || null;
        const author = last
          ? profilesById?.get(last.created_by || last.author_id) || {}
          : null;
        const Icon = cat.icon;
        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => onSelectCategory(cat.key)}
            className="w-full text-left bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-6 hover:border-[#37F2D1]/30 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Icon className="w-5 h-5 text-[#37F2D1]" />
                  <h2 className="text-xl font-bold text-white">{cat.label}</h2>
                </div>
                {cat.subtitle && (
                  <p className="text-sm text-[#37F2D1] uppercase tracking-wider mb-2">{cat.subtitle}</p>
                )}
                {cat.description && (
                  <p className="text-slate-400 text-sm">{cat.description}</p>
                )}
                {last ? (
                  <div className="flex items-center gap-2 mt-4">
                    {author?.avatar_url ? (
                      <img src={author.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-700" />
                    )}
                    <span className="text-xs text-slate-500">
                      <span className="text-[#37F2D1]">{author?.username || "GM"}</span>{" "}
                      added <span className="text-white">{last.title || "a rumor"}</span>
                    </span>
                    <span className="text-xs text-slate-600">{timeAgo(last.created_at)}</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 italic mt-4">No entries yet</div>
                )}
              </div>

              <div className="flex gap-8 text-center">
                <div>
                  <div className="text-xl font-bold text-[#37F2D1]">{stats.entries.length}</div>
                  <div className="text-xs text-slate-500 uppercase">{cat.key === "rumors" ? "Rumors" : "Entries"}</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-300">{stats.comments || 0}</div>
                  <div className="text-xs text-slate-500 uppercase">Comments</div>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
