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
 *
 * Late-joiner admit (added in #10b): a "Pending Re-Entry" section
 * surfaces players who are ready (in ready_player_ids) but haven't
 * been admitted to the active session (not in
 * active_session_players). The Admit button appends them to
 * active_session_players, which causes the player's lobby
 * auto-redirect to fire on their next refresh and they enter the
 * play view. Also clears them from disconnected_players so the
 * disconnect indicator drops on the GM side.
 */
export default function GMSidebarPlayers({ campaignId, campaign, allUserProfiles = [], characters = [], disconnectedPlayers = [] }) {
  const queryClient = useQueryClient();
  const disconnectedIds = new Set(disconnectedPlayers.map((p) => p.id));
  const playerIds = Array.isArray(campaign?.player_ids) ? campaign.player_ids : [];

  // Late-joiners: ready_player_ids - active_session_players. Only
  // meaningful while the session is active (otherwise everyone
  // who's ready joins via Resume Session normally).
  const readySet = new Set(Array.isArray(campaign?.ready_player_ids) ? campaign.ready_player_ids : []);
  const activeSet = new Set(Array.isArray(campaign?.active_session_players) ? campaign.active_session_players : []);
  const pendingReentryIds = campaign?.session_active
    ? [...readySet].filter((uid) => !activeSet.has(uid))
    : [];

  const admitMutation = useMutation({
    mutationFn: async (userId) => {
      // Re-fetch latest active_session_players so we don't clobber
      // a concurrent admit/kick. Append the user, drop them from
      // disconnected_players, write back.
      const fresh = await base44.entities.Campaign.filter({ id: campaignId }).then((r) => r?.[0]);
      const current = Array.isArray(fresh?.active_session_players) ? fresh.active_session_players : [];
      const disconnected = Array.isArray(fresh?.disconnected_players) ? fresh.disconnected_players : [];
      await base44.entities.Campaign.update(campaignId, {
        active_session_players: current.includes(userId) ? current : [...current, userId],
        disconnected_players: disconnected.filter((id) => id !== userId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      toast.success("Player admitted to the session.");
    },
    onError: (err) => toast.error(err?.message || "Couldn't admit the player."),
  });

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

  // Empty state: only show when there are also no late-joiners
  // pending. Otherwise the panel still has work to surface.
  if (playerIds.length === 0 && pendingReentryIds.length === 0) {
    return <p className="text-slate-500 text-xs italic">No players in this campaign yet.</p>;
  }

  const lookupName = (uid) => {
    const profile = allUserProfiles.find((p) => p.user_id === uid);
    const character = (characters || []).find(
      (c) => c.user_id === uid || c.created_by === profile?.email,
    );
    return playerDisplayName({ character, profile, asGM: true });
  };

  return (
    <div className="space-y-4">
      {playerIds.length > 0 && (
        <div>
          <h3 className="text-white font-semibold text-sm mb-3">Players</h3>
          <ul className="divide-y divide-slate-700/30">
            {playerIds.map((uid) => {
              const name = lookupName(uid);
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
      )}

      {pendingReentryIds.length > 0 && (
        <div>
          <h3 className="text-[#37F2D1] font-semibold text-sm mb-2 flex items-center gap-2">
            Pending Re-Entry
            <span className="text-xs font-normal text-slate-400">({pendingReentryIds.length})</span>
          </h3>
          <p className="text-xs text-slate-400 mb-2">
            These players are ready and waiting for you to admit them to the session.
          </p>
          <ul className="divide-y divide-slate-700/30 bg-[#37F2D1]/5 border border-[#37F2D1]/20 rounded-lg">
            {pendingReentryIds.map((uid) => {
              const name = lookupName(uid);
              return (
                <li key={uid} className="flex items-center justify-between py-2 px-2 gap-2">
                  <span className="text-sm text-slate-200 truncate">{name}</span>
                  <button
                    type="button"
                    onClick={() => admitMutation.mutate(uid)}
                    disabled={admitMutation.isPending}
                    className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] disabled:opacity-50"
                  >
                    Admit
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
