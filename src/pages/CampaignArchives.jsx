import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Users, Package, Skull, Sparkles, BookOpen, Globe,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Campaign Archives hub. A 2-column grid of category cards — five
 * compendium tabs (NPCs, Items, Monsters, Spells, Class Features)
 * that live inside Archives, plus a World Lore shortcut that links
 * straight to the standalone World Lore page. Every card navigates
 * on click; there is no inline tab content on this page.
 */
const SECTIONS = [
  { key: "npcs",           label: "NPCs",           icon: Users,    page: "CampaignNPCs",      description: "Non-player characters in this campaign." },
  { key: "items",          label: "Items",          icon: Package,  page: "CampaignItems",     description: "SRD equipment, magic items, and homebrew gear." },
  { key: "monsters",       label: "Monsters",       icon: Skull,    page: "CampaignMonsters",  description: "Bestiary of encountered and homebrew creatures." },
  { key: "spells",         label: "Spells",         icon: Sparkles, page: "CampaignSpells",    description: "SRD spells and homebrew magic." },
  { key: "class_features", label: "Class Features", icon: BookOpen, page: "CampaignAbilities", description: "Class abilities organized by class." },
  { key: "world_lore",     label: "World Lore",     icon: Globe,    page: "CampaignWorldLore", description: "GM-created world history, factions, and lore." },
];

export default function CampaignArchives() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get("id");
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then((c) => c[0]),
    enabled: !!campaignId,
  });

  const isGM = user?.id === campaign?.game_master_id
    || campaign?.co_dm_ids?.includes(user?.id);

  if (!campaign) {
    return <div className="p-8 text-white">Loading…</div>;
  }

  const navigateToSection = (section) => {
    navigate(createPageUrl(section.page) + `?id=${campaignId}`);
  };

  return (
    <div
      className="min-h-screen p-8 relative"
      style={{
        backgroundImage: campaign.archives_background_url
          ? `url(${campaign.archives_background_url})`
          : "linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {campaign.archives_background_url && (
        <div className="absolute inset-0 bg-black/50" />
      )}
      <div className="max-w-4xl mx-auto relative z-10">
        {/* If a session is active, Archives is the one page a GM is
            allowed to leave the session for — so the back button
            goes straight to the GMPanel. Otherwise this is just a
            lobby-level compendium and we point back to the
            canonical campaign home: CampaignGMPanel for GMs (both
            render inside Layout's isCampaignGMMode shell so the
            persistent campaign nav bar stays visible), and
            CampaignPanel for players (isCampaignLobbyMode). The
            old CampaignView route rendered its own sidebar outside
            the Layout shell, which looked "broken" relative to
            Archives — we don't send anyone there from here. */}
        <Button
          onClick={() => {
            if (campaign?.session_active) {
              navigate(createPageUrl("GMPanel") + `?id=${campaignId}`);
            } else {
              navigate(createPageUrl(isGM ? "CampaignGMPanel" : "CampaignPanel") + `?id=${campaignId}`);
            }
          }}
          variant="ghost"
          className="mb-8 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {campaign?.session_active ? "Back to Session" : "Back to Campaign"}
        </Button>

        <h1 className="text-3xl font-bold text-white mb-6">Campaign Archives</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => navigateToSection(section)}
                className="text-left bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-6 hover:border-[#37F2D1]/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-6 h-6 text-[#37F2D1]" />
                  <h2 className="text-lg font-bold text-white">{section.label}</h2>
                </div>
                <p className="text-sm text-slate-400">{section.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
