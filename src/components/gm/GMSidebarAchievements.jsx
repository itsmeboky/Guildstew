import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/**
 * Grant-an-achievement panel inside the GM sidebar. Pick a player,
 * pick an achievement from the campaign's library (or the global
 * list), write an Achievement row. The player's dashboard
 * Achievement feed picks it up on its next poll.
 *
 * Titles are mentioned here because players earn them
 * automatically through play — this panel only exposes the note,
 * not a grant button, so the GM doesn't accidentally clobber the
 * auto-earn rules.
 */
export default function GMSidebarAchievements({ campaignId, campaign, allUserProfiles = [] }) {
  const queryClient = useQueryClient();
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const playerIds = Array.isArray(campaign?.player_ids) ? campaign.player_ids : [];

  // Pull any achievement definitions the GM has seeded for this
  // campaign. Fall back to a tiny default list so the UI still
  // renders something to grant before the achievement store lands.
  const { data: achievements = [] } = useQuery({
    queryKey: ["achievementCatalog", campaignId],
    queryFn: async () => {
      try {
        const rows = await base44.entities.Achievement.filter({ campaign_id: campaignId });
        return Array.isArray(rows) ? rows : [];
      } catch { return []; }
    },
    staleTime: 60_000,
    initialData: [],
  });

  const catalog = achievements.length > 0 ? achievements : DEFAULT_ACHIEVEMENTS;

  const grant = useMutation({
    mutationFn: ({ userId, achievement }) => base44.entities.Achievement.create({
      user_id: userId,
      campaign_id: campaignId,
      achievement_id: achievement.id || achievement.key || achievement.name,
      name: achievement.name,
      description: achievement.description || null,
      granted_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievementCatalog", campaignId] });
      toast.success("Achievement granted.");
    },
    onError: (err) => toast.error(err?.message || "Grant failed."),
  });

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        Grant Achievement / Title
      </h3>

      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Player</label>
        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
          <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white">
            <SelectValue placeholder="Select a player…" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
            {playerIds.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500 italic">
                No players in this campaign yet.
              </div>
            ) : (
              playerIds.map((uid) => {
                const profile = allUserProfiles.find((p) => p.user_id === uid);
                return (
                  <SelectItem key={uid} value={uid}>
                    {profile?.username || profile?.email || uid}
                  </SelectItem>
                );
              })
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs text-slate-400 uppercase tracking-wider">Achievements</h4>
        {catalog.map((a) => (
          <div
            key={a.id || a.key || a.name}
            className="flex items-start gap-2 p-2 bg-[#0f1219] rounded border border-slate-700/30"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">{a.name}</p>
              {a.description && (
                <p className="text-xs text-slate-400 line-clamp-2">{a.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => grant.mutate({ userId: selectedPlayer, achievement: a })}
              disabled={!selectedPlayer || grant.isPending}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] text-xs font-bold px-2.5 py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              Grant
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs text-slate-400 uppercase tracking-wider">Titles</h4>
        <p className="text-xs text-slate-500">
          Titles are earned automatically through gameplay. Manual title granting
          coming in a future update.
        </p>
      </div>
    </div>
  );
}

// Lightweight fallback catalog so the panel always has something to
// grant. Replaced as soon as the achievement store is seeded for a
// campaign.
const DEFAULT_ACHIEVEMENTS = [
  { id: "first-kill",     name: "First Blood",       description: "Land the first killing blow of the session." },
  { id: "perfect-save",   name: "Unshakable",        description: "Succeed on five saving throws in a single combat." },
  { id: "big-spender",    name: "Big Spender",       description: "Spend 1,000 gp in one shopping trip." },
  { id: "natural-twenty", name: "Fate Favoured",     description: "Roll a natural 20 at a critical moment." },
  { id: "lore-keeper",    name: "Lore Keeper",       description: "Discover a major World Lore secret." },
];
