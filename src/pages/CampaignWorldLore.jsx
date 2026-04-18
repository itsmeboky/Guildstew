import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Map as MapIcon, Swords, Church, ScrollText, Gem, MessageSquare, Castle, Crown, Home } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import EntryCategoryView from "@/components/worldLore/EntryCategoryView";
import CategoryLandingCards from "@/components/worldLore/CategoryLandingCards";
import RecentActivity from "@/components/worldLore/RecentActivity";
import RumorBoardView from "@/components/worldLore/RumorBoardView";
import LegendTrackerView from "@/components/worldLore/LegendTrackerView";
import GuildHallPanel from "@/components/worldLore/GuildHallPanel";
import { stripHtml } from "@/utils/worldLoreVisibility";

// v2 features removed: Cosmology, Flora, Myth, Calendar,
// Magic/Grimoire, Technology/Recipes, Player Diary. Their sub-
// components stay on disk but are not imported by this orchestrator.

const CATEGORIES = [
  { key: "regions",    label: "Regions & Maps",      subtitle: "Locations & Geography",    description: "Cities, wilderness, dungeons, and the maps that connect them.",                      icon: MapIcon },
  { key: "political",  label: "Politics & Factions", subtitle: "Power & Allegiance",       description: "Guilds, courts, secret societies, and who sits on whose throne.",                     icon: Swords },
  { key: "religions",  label: "Deities & Religion",  subtitle: "Gods & Faith",             description: "Pantheons, temples, and the sects that carry their banners.",                         icon: Church },
  { key: "history",    label: "History & Timeline",  subtitle: "Chronicle of the World",   description: "Events in chronological order — from the first flame to last week.",                  icon: ScrollText },
  { key: "artifacts",  label: "Artifacts & Relics",  subtitle: "Items of Legend",          description: "Swords with names, crowns with curses, and everything in between.",                   icon: Gem },
  { key: "rumors",     label: "Rumor Board",         subtitle: "Whispers in the Tavern",   description: "Story hooks, half-truths, and gossip only the GM knows is real.",                     icon: MessageSquare },
  { key: "guild_hall", label: "Guild Hall",          subtitle: "Headquarters & Upgrades",  description: "Spend gold, upgrade rooms, and unlock gameplay bonuses for the party.",              icon: Castle },
  { key: "legend",     label: "Legend Tracker",      subtitle: "Titles & Reputation",      description: "Titles earned through play — your character, their legend, written in deeds.",        icon: Crown },
];

// Category-level metadata fields that render on top of any template
// fields inside the shared entry form.
const METADATA = {
  regions: [
    { key: "location_type", label: "Location type", type: "select",
      options: ["City", "Town", "Village", "Wilderness", "Dungeon", "Landmark", "Other"] },
    { key: "population",    label: "Population",    type: "text" },
  ],
  political: [
    { key: "leader",    label: "Leader" },
    { key: "alignment", label: "Alignment", type: "select",
      options: ["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"] },
    { key: "status",    label: "Status", type: "select",
      options: ["Active","Disbanded","Secret"] },
  ],
  religions: [
    { key: "domain",    label: "Domain" },
    { key: "alignment", label: "Alignment", type: "select",
      options: ["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"] },
    { key: "sect",      label: "Associated sect" },
  ],
  history: [
    { key: "year",      label: "Year / number", type: "number" },
    { key: "era",       label: "Era" },
  ],
  artifacts: [
    { key: "rarity",          label: "Rarity", type: "select",
      options: ["Common","Uncommon","Rare","Very Rare","Legendary","Artifact"] },
    { key: "current_holder",  label: "Current holder" },
    { key: "status",          label: "Status", type: "select",
      options: ["Lost","Found","Destroyed","Hidden"] },
  ],
};

const EMPTY_COPY = {
  regions:   "No regions charted yet.",
  political: "No political groups recorded yet.",
  religions: "No deities in the pantheon yet.",
  history:   "No historical events recorded yet.",
  artifacts: "No artifacts catalogued yet.",
};

export default function CampaignWorldLore({ embedded = false, campaignId: campaignIdOverride } = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const campaignId = campaignIdOverride ?? params.get("id");
  const initialCategory = params.get("category") || null;
  // null = landing page; otherwise one of the CATEGORIES keys.
  const [category, setCategory] = useState(
    CATEGORIES.some((c) => c.key === initialCategory) ? initialCategory : null,
  );

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then((r) => r[0]),
    enabled: !!campaignId,
  });

  const isGM = !!campaign && (
    campaign.game_master_id === user?.id
    || (Array.isArray(campaign.co_dm_ids) && campaign.co_dm_ids.includes(user?.id))
  );
  const isMole = !!campaign && campaign.mole_player_id === user?.id;

  const { data: characters = [] } = useQuery({
    queryKey: ["campaignCharacters", campaignId],
    queryFn: () => base44.entities.Character.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: [],
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["allUserProfiles"],
    queryFn: () => base44.entities.UserProfile.list(),
    initialData: [],
  });

  const partyPlayers = useMemo(() => {
    if (!campaign?.player_ids) return [];
    return campaign.player_ids.map((id) => {
      const profile = profiles.find((p) => p.user_id === id);
      return {
        user_id: id,
        username: profile?.username || null,
        email: profile?.email || null,
        avatar_url: profile?.avatar_url || null,
      };
    });
  }, [campaign?.player_ids, profiles]);

  const profilesById = useMemo(() => {
    const m = new Map();
    for (const p of profiles) m.set(p.user_id, p);
    if (user?.id) {
      m.set(user.id, { ...(m.get(user.id) || {}), ...user });
    }
    return m;
  }, [profiles, user]);

  const partyCharacters = useMemo(() => characters.filter((c) => c.name), [characters]);

  const backToCampaign = () => {
    if (!campaignId) { navigate(-1); return; }
    navigate(createPageUrl("CampaignGMPanel") + `?id=${campaignId}`);
  };

  const entryView = (key) => (
    <EntryCategoryView
      campaignId={campaignId}
      user={user}
      isGM={isGM}
      isMole={isMole}
      partyPlayers={partyPlayers}
      profiles={profiles}
      categoryKey={key}
      emptyLabel={EMPTY_COPY[key]}
      metadataFields={METADATA[key] || []}
      renderList={key === "history" ? historyTimelineRenderer : undefined}
    />
  );

  return (
    <div className={`${embedded ? "h-full overflow-y-auto" : "min-h-screen"} bg-[#0f1219] text-white`}>
      {!embedded && (
        <header className="px-6 py-4 border-b border-slate-800 bg-[#050816] flex items-center gap-3">
          <Button
            onClick={backToCampaign}
            variant="outline"
            size="sm"
            className="text-[#37F2D1] border-[#37F2D1]/60 hover:bg-[#37F2D1]/10 hover:text-[#37F2D1]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Campaign
          </Button>
          <h1 className="text-xl font-bold">World Lore</h1>
          {campaign?.title && <span className="text-xs text-slate-500">· {campaign.title}</span>}
        </header>
      )}

      <nav className="px-6 border-b border-slate-800 bg-[#050816] overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              category === null
                ? "border-[#37F2D1] text-[#37F2D1]"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Home className="w-4 h-4" /> Overview
          </button>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = category === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? "border-[#37F2D1] text-[#37F2D1]"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {c.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="p-6 max-w-6xl mx-auto">
        {category === null && (
          <>
            <CategoryLandingCards
              campaignId={campaignId}
              categories={CATEGORIES}
              user={user}
              isGM={isGM}
              isMole={isMole}
              profilesById={profilesById}
              onSelectCategory={setCategory}
            />
            <RecentActivity
              campaignId={campaignId}
              user={user}
              isGM={isGM}
              isMole={isMole}
              profilesById={profilesById}
              onOpenCategory={setCategory}
            />
          </>
        )}
        {category === "regions"    && entryView("regions")}
        {category === "political"  && entryView("political")}
        {category === "religions"  && entryView("religions")}
        {category === "history"    && entryView("history")}
        {category === "artifacts"  && entryView("artifacts")}
        {category === "rumors" && (
          <RumorBoardView
            campaignId={campaignId}
            user={user}
            isGM={isGM}
            isMole={isMole}
            partyCharacters={partyCharacters}
          />
        )}
        {category === "guild_hall" && (
          <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-6">
            <GuildHallPanel campaignId={campaignId} campaign={campaign} isGM={isGM} />
          </div>
        )}
        {category === "legend" && (
          <LegendTrackerView
            campaignId={campaignId}
            campaign={campaign}
            user={user}
            isGM={isGM}
            partyCharacters={partyCharacters}
          />
        )}
      </main>
    </div>
  );
}

/**
 * History's list renderer — shows entries as a vertical timeline
 * sorted by metadata.year ascending. Clicking a dot opens the same
 * forum-style detail view as other categories.
 */
function historyTimelineRenderer({ entries, onSelect }) {
  const sorted = [...entries].sort((a, b) => {
    const ay = Number(a?.metadata?.year);
    const by = Number(b?.metadata?.year);
    if (Number.isFinite(ay) && Number.isFinite(by)) return ay - by;
    if (Number.isFinite(ay)) return -1;
    if (Number.isFinite(by)) return 1;
    return String(a?.metadata?.era || "").localeCompare(String(b?.metadata?.era || ""));
  });
  return (
    <div className="relative border-l-2 border-[#37F2D1]/30 ml-4 space-y-6 py-2">
      {sorted.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onSelect(entry.id)}
          className="relative pl-8 cursor-pointer hover:bg-[#252b3d]/30 p-4 rounded-r-lg transition-colors text-left w-full"
        >
          <div className="absolute -left-[9px] top-4 w-4 h-4 rounded-full bg-[#37F2D1] border-2 border-[#0f1219]" />
          <div className="text-sm text-[#37F2D1] font-semibold">
            {entry?.metadata?.era || entry?.metadata?.year || "Unknown Date"}
          </div>
          <div className="text-white font-semibold mt-1">{entry.title}</div>
          <div className="text-slate-400 text-sm line-clamp-2 mt-1">{stripHtml(entry.content)}</div>
        </button>
      ))}
    </div>
  );
}
