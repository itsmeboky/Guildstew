import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Party overview for the in-session modal. Same layout as the
 * old sidebar party panel, just with more room — portrait, name,
 * race / class / level subline, HP bar, connection dot.
 */
export default function AdventuringPartyContent({
  campaignId, campaign, allUserProfiles = [], disconnectedPlayers = [],
}) {
  const { data: characters = [] } = useQuery({
    queryKey: ["campaignCharacters", campaignId],
    queryFn: () => base44.entities.Character.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: [],
  });

  const disconnectedIds = new Set(disconnectedPlayers.map((p) => p.id));
  const playerIds = Array.isArray(campaign?.player_ids) ? campaign.player_ids : [];

  if (playerIds.length === 0) {
    return (
      <div className="p-6 h-full flex items-center justify-center text-slate-500 italic">
        No players in this campaign yet.
      </div>
    );
  }

  const rows = playerIds.map((uid) => {
    const profile = allUserProfiles.find((p) => p.user_id === uid);
    const character = characters.find((c) => c.user_id === uid || c.created_by === profile?.email);
    const stats = character?.stats || {};
    const hp = character?.hit_points || stats.hit_points || {};
    const current = Number(hp.current ?? hp.max ?? 0);
    const max = Number(hp.max ?? 0);
    const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0;
    return {
      uid,
      name: character?.name || profile?.username || profile?.email || "Player",
      subline: [stats.race, stats.class, stats.level ? `Lvl ${stats.level}` : null]
        .filter(Boolean).join(" • "),
      avatar: character?.profile_avatar_url || character?.avatar_url || profile?.avatar_url,
      current, max, pct,
      disconnected: disconnectedIds.has(uid),
    };
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((row) => (
          <div
            key={row.uid}
            className="bg-[#1a1f2e] border border-slate-700/40 rounded-lg p-4 flex items-center gap-4"
          >
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
              {row.avatar ? (
                <img src={row.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg font-bold">
                  {row.name.charAt(0)}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a1f2e] ${
                  row.disconnected ? "bg-red-400" : "bg-emerald-400"
                }`}
                title={row.disconnected ? "Disconnected" : "Connected"}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-semibold truncate">{row.name}</p>
              {row.subline && (
                <p className="text-xs text-slate-400 truncate">{row.subline}</p>
              )}
              {row.max > 0 ? (
                <div className="mt-2">
                  <div className="h-2 bg-slate-700 rounded overflow-hidden">
                    <div
                      className={`h-full ${row.pct > 50 ? "bg-emerald-500" : row.pct > 25 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{row.current} / {row.max} HP</p>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 italic mt-1">No HP recorded</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
