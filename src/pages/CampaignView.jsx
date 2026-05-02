import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Play, UserPlus, UserCog, Megaphone, BookOpen, BarChart3, Settings,
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { validateInstalledMods } from "@/lib/modEngine";
import { supabase } from "@/api/supabaseClient";

/**
 * Campaign Home — the lobby players and GMs see when they're NOT
 * in an active session. Replaces the old card-based archives
 * layout (NPCs / Items / Maps / World Lore / Homebrew tiles) that
 * used to live on this page; Campaign Archives is now a page of
 * its own and doesn't belong on the lobby.
 *
 * The layout: a campaign sidebar with quick links, a hero banner
 * with campaign name, a "Start Session" button (GM only), and a
 * grid of current players. No End Session button here — End
 * Session lives inside the GM Panel.
 */
export default function CampaignView() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then((r) => r?.[0]),
    enabled: !!campaignId,
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUserProfiles = [] } = useQuery({
    queryKey: ["allUserProfiles"],
    queryFn: () => base44.entities.UserProfile.list(),
    staleTime: 60_000,
  });

  const { data: characters = [] } = useQuery({
    queryKey: ["campaignCharacters", campaignId],
    queryFn: () => base44.entities.Character.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: [],
  });

  const isGM = !!campaign
    && (campaign.game_master_id === user?.id
        || (Array.isArray(campaign.co_dm_ids) && campaign.co_dm_ids.includes(user?.id)));

  const startSession = useMutation({
    mutationFn: async () => {
      // Brewery mod gate — block session start when any installed mod
      // has validation errors. Brings up a blocking toast that lists
      // the broken mod count; the GM opens Campaign Settings to fix
      // them via the BreweryModsPanel.
      const modErrors = await validateInstalledMods(campaignId);
      if (modErrors.length > 0) {
        const names = modErrors.map((m) => m.mod_name).join(", ");
        throw new Error(
          `${modErrors.length} mod(s) have errors: ${names}. Open Campaign Settings → House Rules → Brewery Mods to disable or uninstall them.`,
        );
      }
      return base44.entities.Campaign.update(campaignId, {
        session_active: true,
        session_started_at: new Date().toISOString(),
        active_session_players: campaign?.player_ids || [],
        disconnected_players: [],
        is_session_active: true,
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      // Tavern rumor prompt — if the guild hall owns the Tavern
      // (tier 2) or Grand Tavern (tier 3), surface a nudge for the
      // GM to drop 1 or 2 rumors onto the Rumor Board this session.
      // Auto-generation waits on the Next.js API route; until then
      // the toast has an action that jumps to the Rumor Board tab
      // so the GM can author them by hand.
      try {
        const { data: halls } = await supabase
          .from("guild_halls")
          .select("upgrades")
          .eq("campaign_id", campaignId);
        const upgrades = Array.isArray(halls?.[0]?.upgrades) ? halls[0].upgrades : [];
        const rumorCount = upgrades.includes("grand_tavern")
          ? 2
          : upgrades.includes("tavern") ? 1 : 0;
        if (rumorCount > 0) {
          toast.info(
            `Your Tavern generates ${rumorCount} rumor${rumorCount === 1 ? "" : "s"} this session. Add them to the Rumor Board?`,
            {
              duration: 10000,
              action: {
                label: "Open Rumor Board",
                onClick: () =>
                  navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=rumors`),
              },
            },
          );
        }
      } catch (err) {
        console.warn("tavern rumor prompt skipped:", err?.message || err);
      }
      navigate(createPageUrl("GMPanel") + `?id=${campaignId}`);
    },
    onError: (err) => toast.error(err?.message || "Couldn't start session."),
  });

  const handleStartSession = async () => {
    setStarting(true);
    try { await startSession.mutateAsync(); }
    finally { setStarting(false); }
  };

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1219] text-slate-400">
        Loading campaign…
      </div>
    );
  }

  const playerIds = Array.isArray(campaign.player_ids) ? campaign.player_ids : [];
  const playerRows = playerIds.map((uid) => {
    const profile = allUserProfiles.find((p) => p.user_id === uid);
    const character = characters.find((c) => c.user_id === uid || c.created_by === profile?.email);
    return {
      id: uid,
      username: profile?.username || profile?.email || "Player",
      avatar_url: profile?.avatar_url || character?.profile_avatar_url || character?.avatar_url,
      character_name: character?.name || null,
    };
  });

  const sidebarLinks = [
    { label: "Invite Players",      page: "CampaignInvite",     Icon: UserPlus,  primary: true },
    { label: "Player Management",   page: "CampaignPlayers",    Icon: UserCog },
    { label: "Campaign Updates",    page: "CampaignUpdates",    Icon: Megaphone },
    { label: "Campaign Archives",   page: "CampaignArchives",   Icon: BookOpen },
    { label: "Campaign Statistics", page: "CampaignStatistics", Icon: BarChart3 },
    { label: "Campaign Settings",   page: "CampaignSettings",   Icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-[#0f1219] text-white">
      <aside className="w-64 flex-shrink-0 bg-[#1a1f2e] border-r border-slate-700/50 flex flex-col">
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {sidebarLinks.map(({ label, page, Icon, primary }) => (
            <button
              key={page}
              type="button"
              onClick={() => navigate(createPageUrl(page) + `?id=${campaignId}`)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                primary
                  ? "bg-[#37F2D1] text-[#050816] font-bold hover:bg-[#2dd9bd]"
                  : "text-slate-300 hover:text-[#37F2D1] hover:bg-[#0f1219]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col items-center p-8">
        <div className="relative w-full max-w-3xl h-64 rounded-lg overflow-hidden mb-6">
          {campaign.cover_image_url || campaign.banner_url || campaign.image_url ? (
            <img
              src={campaign.cover_image_url || campaign.banner_url || campaign.image_url}
              alt=""
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a1f2e] via-[#2A3441] to-[#050816]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-left">
            <p className="text-sm text-slate-300">Currently Playing</p>
            <h1 className="text-3xl font-bold text-white">{campaign?.name || campaign?.title}</h1>
          </div>
        </div>

        {isGM && (
          <div className="flex gap-3 mb-8">
            <Button
              onClick={handleStartSession}
              disabled={starting}
              className="bg-white text-black hover:bg-slate-200 px-8 py-3 text-lg"
            >
              <Play className="w-4 h-4 mr-2" />
              {starting ? "Starting…" : "Start Session"}
            </Button>
          </div>
        )}

        {playerRows.length > 0 ? (
          <div className="w-full max-w-3xl">
            <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-3">Players</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {playerRows.map((player) => (
                <div
                  key={player.id}
                  className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-4 text-center"
                >
                  {player.avatar_url ? (
                    <img
                      src={player.avatar_url}
                      alt=""
                      className="w-16 h-16 rounded-full mx-auto mb-2 object-cover object-top"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-slate-700 flex items-center justify-center text-slate-300 font-bold">
                      {player.username?.charAt(0) || "?"}
                    </div>
                  )}
                  <p className="text-sm text-white font-semibold truncate">{player.username}</p>
                  <p className="text-xs text-slate-400 truncate">{player.character_name || "No character"}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-slate-500">No players yet. Invite some players to join!</p>
        )}
      </main>
    </div>
  );
}
