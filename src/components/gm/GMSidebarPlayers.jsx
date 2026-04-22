import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { playerDisplayName } from "@/utils/displayName";

/**
 * Player Management panel inside the GM sidebar. Lists every
 * player_id currently on the campaign alongside a connection dot
 * derived from campaign.disconnected_players. The Kick button
 * removes the player from player_ids (+ releases any session lock
 * they have on a character for this campaign) so the GM can boot
 * someone without ending the session.
 */
export default function GMSidebarPlayers({ campaignId, campaign, allUserProfiles = [], characters = [], disconnectedPlayers = [] }) {
  const queryClient = useQueryClient();
  const disconnectedIds = new Set(disconnectedPlayers.map((p) => p.id));
  const playerIds = Array.isArray(campaign?.player_ids) ? campaign.player_ids : [];

  const kickMutation = useMutation({
    mutationFn: async (userId) => {
      const updated = playerIds.filter((id) => id !== userId);
      const disconnected = (campaign?.disconnected_players || []).filter((id) => id !== userId);
      await base44.entities.Campaign.update(campaignId, {
        player_ids: updated,
        disconnected_players: disconnected,
      });
      // Release any character lock the player holds on this campaign.
      try {
        const chars = await base44.entities.Character.filter({
          user_id: userId,
          campaign_id: campaignId,
        });
        await Promise.all(
          (chars || []).map((c) =>
            base44.entities.Character.update(c.id, { active_session_id: null }).catch(() => {}),
          ),
        );
      } catch { /* ignore */ }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      toast.success("Player removed from session.");
    },
    onError: (err) => toast.error(err?.message || "Kick failed."),
  });

  if (playerIds.length === 0) {
    return <p className="text-slate-500 text-xs italic">No players in this campaign yet.</p>;
  }

  return (
    <div>
      <h3 className="text-white font-semibold text-sm mb-3">Players</h3>
      <ul className="divide-y divide-slate-700/30">
        {playerIds.map((uid) => {
          const profile = allUserProfiles.find((p) => p.user_id === uid);
          // GM panel — show "Character (username)" so the GM can map
          // each player to their PC at a glance. Falls back to the
          // username when the player hasn't built a character yet.
          const character = (characters || []).find(
            (c) => c.user_id === uid || c.created_by === profile?.email,
          );
          const name = playerDisplayName({ character, profile, asGM: true });
          const disconnected = disconnectedIds.has(uid);
          return (
            <li key={uid} className="flex items-center justify-between py-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${disconnected ? "bg-red-400" : "bg-emerald-400"}`}
                  title={disconnected ? "Disconnected" : "Connected"}
                />
                <span className="text-sm text-slate-300 truncate">{name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Kick ${name} from the session?`)) kickMutation.mutate(uid);
                }}
                disabled={kickMutation.isPending}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-950/30 disabled:opacity-50"
              >
                Kick
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
