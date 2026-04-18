import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Map, Swords, Church, ScrollText, Gem, MessageSquare, Castle, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import EntryCategoryView from "@/components/worldLore/EntryCategoryView";
import RumorBoardView from "@/components/worldLore/RumorBoardView";
import LegendTrackerView from "@/components/worldLore/LegendTrackerView";
import GuildHallPanel from "@/components/worldLore/GuildHallPanel";
import { stripHtml } from "@/utils/worldLoreVisibility";

// v2 feature — removed from v1 (cosmology, flora, myth, calendar,
// magic/grimoire, technology/recipes, player diary). Their sub-
// components stay on disk but are not imported by this orchestrator.

/**
 * Eight focused categories, everything else moved out of the nav.
 * The first five share the EntryCategoryView layout; History layers
 * a timeline over the same list; Rumors, Guild Hall, and Legend
 * Tracker each render their own specialty view.
 */
const CATEGORIES = [
  { key: "regions",    label: "Regions & Maps",      icon: Map },
  { key: "political",  label: "Politics & Factions", icon: Swords },
  { key: "religions",  label: "Deities & Religion",  icon: Church },
  { key: "history",    label: "History & Timeline",  icon: ScrollText },
  { key: "artifacts",  label: "Artifacts & Relics",  icon: Gem },
  { key: "rumors",     label: "Rumor Board",         icon: MessageSquare },
  { key: "guild_hall", label: "Guild Hall",          icon: Castle },
  { key: "legend",     label: "Legend Tracker",      icon: Crown },
];

// Per-category metadata fields that drive the "category-specific
// fields" block in the shared edit form.
const METADATA = {
  regions: [
    { key: "location_type", label: "Location type", type: "select",
      options: ["City", "Town", "Village", "Wilderness", "Dungeon", "Ruin", "Plane", "Other"] },
    { key: "population",    label: "Population",    type: "text" },
  ],
  political: [
    { key: "leader",        label: "Leader" },
    { key: "alignment",     label: "Alignment", type: "select",
      options: ["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"] },
    { key: "status",        label: "Status", type: "select",
      options: ["active","disbanded","secret"] },
  ],
  religions: [
    { key: "domain",        label: "Domain" },
    { key: "alignment",     label: "Alignment", type: "select",
      options: ["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"] },
    { key: "sect",          label: "Associated sect" },
  ],
  history: [
    { key: "year",          label: "Year / number", type: "number" },
    { key: "era",           label: "Era" },
  ],
  artifacts: [
    { key: "rarity",        label: "Rarity", type: "select",
      options: ["Common","Uncommon","Rare","Very Rare","Legendary","Artifact"] },
    { key: "current_holder",label: "Current holder" },
    { key: "status",        label: "Status", type: "select",
      options: ["lost","found","destroyed","unknown"] },
  ],
};

const EMPTY_COPY = {
  regions:   "No regions charted yet.",
  political: "No political groups recorded yet.",
  religions: "No deities in the pantheon yet.",
  history:   "No historical events recorded yet.",
  artifacts: "No artifacts catalogued yet.",
};

export default function CampaignWorldLore() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("id");
  const initialCategory = params.get("category") || "regions";
  const [category, setCategory] = useState(
    CATEGORIES.some((c) => c.key === initialCategory) ? initialCategory : "regions",
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
      };
    });
  }, [campaign?.player_ids, profiles]);

  const partyCharacters = useMemo(() => characters.filter((c) => c.name), [characters]);

  const backToCampaign = () => {
    if (!campaignId) { navigate(-1); return; }
    navigate(createPageUrl("CampaignGMPanel") + `?id=${campaignId}`);
  };

  const entryView = (key) => (
    <EntryCategoryView
      campaignId={campaignId}
      campaign={campaign}
      user={user}
      isGM={isGM}
      isMole={isMole}
      partyPlayers={partyPlayers}
      categoryKey={key}
      emptyLabel={EMPTY_COPY[key]}
      metadataFields={METADATA[key] || []}
      renderList={key === "history" ? historyTimelineRenderer : undefined}
    />
  );

  return (
    <div className="min-h-screen bg-[#0f1219] text-white">
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

      <nav className="px-6 border-b border-slate-800 bg-[#050816] overflow-x-auto">
        <div className="flex items-center gap-1">
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

      <main className="p-6">
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
          />
        )}
        {category === "guild_hall" && (
          <div className="bg-[#0f1219] border border-slate-700 rounded-xl p-4">
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
 * sorted by metadata.year ascending. Same click-to-select behaviour
 * as the default list, so the right-hand detail pane shows the
 * same entry detail view.
 */
function historyTimelineRenderer({ entries, selectedId, onSelect }) {
  const sorted = [...entries].sort((a, b) => {
    const ay = Number(a?.metadata?.year);
    const by = Number(b?.metadata?.year);
    if (Number.isFinite(ay) && Number.isFinite(by)) return ay - by;
    if (Number.isFinite(ay)) return -1;
    if (Number.isFinite(by)) return 1;
    return String(a?.metadata?.era || "").localeCompare(String(b?.metadata?.era || ""));
  });
  return (
    <div className="relative border-l-2 border-[#37F2D1]/30 ml-2 space-y-6 py-2">
      {sorted.map((entry) => {
        const active = entry.id === selectedId;
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry.id)}
            className="relative pl-6 text-left w-full group"
          >
            <span
              className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
                active
                  ? "bg-[#37F2D1] border-[#37F2D1]"
                  : "bg-[#050816] border-[#37F2D1] group-hover:bg-[#37F2D1]/40"
              }`}
            />
            <div className="text-[11px] uppercase tracking-widest text-[#37F2D1] font-bold">
              {entry?.metadata?.era || entry?.metadata?.year || "Undated"}
            </div>
            <div className={`text-sm font-bold ${active ? "text-[#37F2D1]" : "text-white"}`}>
              {entry.title}
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
              {stripHtml(entry.content)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
