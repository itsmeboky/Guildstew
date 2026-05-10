import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignWorldLore from "@/pages/CampaignWorldLore";
import LegendTrackerView from "@/components/worldLore/LegendTrackerView";
import { isUserGM } from "@/components/party/partyPermissions";

/**
 * Player-side Campaign Archives. Two tabs:
 *   - World Lore: the existing CampaignWorldLore page in `embedded`
 *     mode. It already wraps each entry's body in GatedEntryView so
 *     knowledge gates, language tiers, and Cant/Druidic annotations
 *     all behave for players. No new gating to add here.
 *   - Legend Tracker: the existing LegendTrackerView. Its auto-grant
 *     logic runs on view + writes pending rumors to the Rumor Board
 *     for GM approval.
 *
 * GM moderation surfaces (per-section player-posting toggles, post
 * approval queue) are out of scope for the player sidebar parity
 * build — they belong on the GM side. The data layer (status column
 * on world_lore_entries, settings.world_lore_player_posting) already
 * exists or is harmless to defer until that GM UI lands.
 */
export default function PlayerCampaignArchivesContent({ campaignId, campaign }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("world_lore");
  const isGM = isUserGM(campaign, user?.id);

  const { data: characters = [] } = useQuery({
    queryKey: ["campaignCharacters", campaignId],
    queryFn: () => base44.entities.Character.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: [],
  });
  const partyCharacters = (characters || []).filter((c) => c.name);

  return (
    <div className="h-full flex flex-col min-h-0">
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
        <TabsList className="mx-6 mt-4 bg-[#0b1220] border border-[#1e293b] flex-shrink-0 justify-start">
          <TabsTrigger value="world_lore" className="data-[state=active]:bg-[#37F2D1]/15 data-[state=active]:text-[#37F2D1]">
            <Globe className="w-3.5 h-3.5 mr-1" /> World Lore
          </TabsTrigger>
          <TabsTrigger value="legend_tracker" className="data-[state=active]:bg-[#37F2D1]/15 data-[state=active]:text-[#37F2D1]">
            <Crown className="w-3.5 h-3.5 mr-1" /> Legend Tracker
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="world_lore" className="h-full mt-0 data-[state=inactive]:hidden">
            <div className="h-full overflow-hidden">
              <CampaignWorldLore embedded campaignId={campaignId} />
            </div>
          </TabsContent>
          <TabsContent value="legend_tracker" className="h-full mt-0 data-[state=inactive]:hidden">
            <div className="h-full overflow-y-auto p-6">
              <LegendTrackerView
                campaignId={campaignId}
                user={user}
                isGM={isGM}
                partyCharacters={partyCharacters}
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
