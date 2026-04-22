import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { playerDisplayName } from "@/utils/displayName";

/**
 * Adventuring Party panel inside the GM sidebar. Compact list of
 * the party's characters — portrait, name, HP bar, and a simple
 * connection dot fed by campaign.disconnected_players.
 */
export default function GMSidebarPartyPanel({ campaignId, campaign, allUserProfiles = [], disconnectedPlayers = [] }) {
  const { data: characters = [] } = useQuery({
    queryKey: ["campaignCharacters", campaignId],
    queryFn: () => base44.entities.Character.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: [],
  });

  const disconnectedIds = new Set(disconnectedPlayers.map((p) => p.id));
  const playerIds = Array.isArray(campaign?.player_ids) ? campaign.player_ids : [];

  const rows = playerIds.map((uid) => {
    const profile = allUserProfiles.find((p) => p.user_id === uid);
    const character = characters.find((c) => c.user_id === uid || c.created_by === profile?.email);
    const hp = character?.hit_points || {};
    const current = Number(hp.current ?? hp.max ?? 0);
    const max = Number(hp.max ?? 0);
    const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0;
    return {
      uid,
      name: playerDisplayName({ character, profile, asGM: true }),
      avatar: character?.profile_avatar_url || character?.avatar_url || profile?.avatar_url,
      current, max, pct,
      disconnected: disconnectedIds.has(uid),
    };
  });

  if (rows.length === 0) {
    return <p className="text-slate-500 text-xs italic">No players in this campaign yet.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.uid} className="bg-[#0f1219] border border-slate-700/40 rounded-lg p-2 flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
            {row.avatar ? (
              <img src={row.avatar} alt="" className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm font-bold">
                {row.name.charAt(0)}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[#0f1219] ${
                row.disconnected ? "bg-red-400" : "bg-emerald-400"
              }`}
              title={row.disconnected ? "Disconnected" : "Connected"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-semibold truncate">{row.name}</p>
            {row.max > 0 ? (
              <>
                <div className="h-1.5 bg-slate-700 rounded overflow-hidden mt-1">
                  <div
                    className={`h-full ${row.pct > 50 ? "bg-emerald-500" : row.pct > 25 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{row.current} / {row.max} HP</p>
              </>
            ) : (
              <p className="text-[10px] text-slate-500 italic">No HP recorded</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
