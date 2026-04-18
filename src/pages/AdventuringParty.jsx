import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Swords, Package, Heart, Dog, ScrollText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import CharacterTab from "@/components/party/CharacterTab";
import SpellsTab from "@/components/party/SpellsTab";
import InventoryTab from "@/components/party/InventoryTab";
import RelationshipsTab from "@/components/party/RelationshipsTab";
import CompanionTab from "@/components/party/CompanionTab";
import PlayerNotesTab from "@/components/party/PlayerNotesTab";
import { isUserGM, ownsCharacter, canSeeRelationships } from "@/components/party/partyPermissions";

/**
 * Two-column panel listing every player character in the campaign on
 * the left with a tabbed detail view on the right. Reachable from
 * both the GM sidebar and the player-mode sidebar. The only
 * difference between the two entry points is what the viewer can see
 * in the Relationships / Player Notes tabs — see `partyPermissions`.
 */
export default function AdventuringParty() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("id");

  const [selectedCharacterId, setSelectedCharacterId] = useState(null);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then((c) => c[0]),
    enabled: !!campaignId,
  });

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

  const { data: npcs = [] } = useQuery({
    queryKey: ["campaignNPCs", campaignId],
    queryFn: () => base44.entities.CampaignNPC.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: [],
  });

  const isGM = isUserGM(campaign, user?.id);

  // Only player characters — NPCs show up in the Relationships picker
  // but not as selectable rows on the left. Ghost / stray rows with
  // no name get filtered out so the list is clean.
  const playerCharacters = useMemo(() => {
    return (characters || []).filter((c) => c.name);
  }, [characters]);

  const selected = useMemo(
    () => playerCharacters.find((c) => c.id === selectedCharacterId) || null,
    [playerCharacters, selectedCharacterId],
  );
  const ownsTarget = ownsCharacter(selected, user);
  const viewerContext = { isGM, ownsTarget, viewerUserId: user?.id };
  const showRelationships = canSeeRelationships(viewerContext);

  const backToSession = () => {
    if (!campaignId) {
      navigate(-1);
      return;
    }
    const target = isGM ? "CampaignGMPanel" : "CampaignPlayerPanel";
    navigate(createPageUrl(target) + `?id=${campaignId}`);
  };

  return (
    <div className="h-screen w-screen bg-[#020617] text-white flex flex-col overflow-hidden">
      <header className="flex items-center gap-3 px-6 py-3 border-b border-[#1e293b] bg-[#050816] flex-shrink-0">
        <Button
          onClick={backToSession}
          variant="outline"
          size="sm"
          className="text-[#37F2D1] border-[#37F2D1]/60 hover:bg-[#37F2D1]/10 hover:text-[#37F2D1]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Session
        </Button>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#37F2D1]" />
          <h1 className="text-xl font-bold">Adventuring Party</h1>
          {campaign?.title && (
            <span className="text-xs text-slate-500">· {campaign.title}</span>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        {/* Left — party member list */}
        <aside className="w-[26%] min-w-[240px] max-w-[360px] border-r border-[#1e293b] bg-[#050816] overflow-y-auto">
          <div className="p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
              Party ({playerCharacters.length})
            </div>
            {playerCharacters.length === 0 ? (
              <p className="text-xs text-slate-500 italic px-1">No characters in this campaign yet.</p>
            ) : (
              <ul className="space-y-1">
                {playerCharacters.map((c) => (
                  <PartyRow
                    key={c.id}
                    character={c}
                    selected={c.id === selectedCharacterId}
                    onClick={() => setSelectedCharacterId(c.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Right — detail pane */}
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Select a player to view their character details.
            </div>
          ) : (
            <Tabs defaultValue="character" className="flex flex-col h-full">
              <TabsList className="mx-6 mt-4 bg-[#0b1220] border border-[#1e293b] flex-shrink-0 flex-wrap h-auto justify-start">
                <TabsTrigger value="character" className="data-[state=active]:bg-[#37F2D1]/15 data-[state=active]:text-[#37F2D1]">
                  <Users className="w-3.5 h-3.5 mr-1" /> Character
                </TabsTrigger>
                <TabsTrigger value="spells" className="data-[state=active]:bg-[#37F2D1]/15 data-[state=active]:text-[#37F2D1]">
                  <Swords className="w-3.5 h-3.5 mr-1" /> Spells
                </TabsTrigger>
                <TabsTrigger value="inventory" className="data-[state=active]:bg-[#37F2D1]/15 data-[state=active]:text-[#37F2D1]">
                  <Package className="w-3.5 h-3.5 mr-1" /> Inventory
                </TabsTrigger>
                {showRelationships && (
                  <TabsTrigger value="relationships" className="data-[state=active]:bg-[#37F2D1]/15 data-[state=active]:text-[#37F2D1]">
                    <Heart className="w-3.5 h-3.5 mr-1" /> Relationships
                  </TabsTrigger>
                )}
                <TabsTrigger value="companion" className="data-[state=active]:bg-[#37F2D1]/15 data-[state=active]:text-[#37F2D1]">
                  <Dog className="w-3.5 h-3.5 mr-1" /> Companion
                </TabsTrigger>
                <TabsTrigger value="notes" className="data-[state=active]:bg-[#37F2D1]/15 data-[state=active]:text-[#37F2D1]">
                  <ScrollText className="w-3.5 h-3.5 mr-1" /> Player Notes
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-3">
                <TabsContent value="character" className="mt-0">
                  <CharacterTab character={selected} />
                </TabsContent>
                <TabsContent value="spells" className="mt-0">
                  <SpellsTab character={selected} />
                </TabsContent>
                <TabsContent value="inventory" className="mt-0">
                  <InventoryTab character={selected} />
                </TabsContent>
                {showRelationships && (
                  <TabsContent value="relationships" className="mt-0">
                    <RelationshipsTab
                      character={selected}
                      partyCharacters={playerCharacters}
                      npcs={npcs}
                      profiles={profiles}
                      viewer={viewerContext}
                    />
                  </TabsContent>
                )}
                <TabsContent value="companion" className="mt-0">
                  <CompanionTab
                    character={selected}
                    canEdit={isGM || ownsTarget}
                  />
                </TabsContent>
                <TabsContent value="notes" className="mt-0">
                  <PlayerNotesTab
                    character={selected}
                    viewer={viewerContext}
                  />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
}

function PartyRow({ character, selected, onClick }) {
  const level = character.level || 1;
  const className = [character.race, character.class].filter(Boolean).join(" · ");
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors border ${
          selected
            ? "bg-[#37F2D1]/10 border-[#37F2D1]/60"
            : "border-transparent hover:bg-[#0b1220] hover:border-[#1e293b]"
        }`}
      >
        {character.avatar_url ? (
          <img
            src={character.avatar_url}
            alt=""
            className={`w-12 h-12 rounded-lg object-cover flex-shrink-0 border ${
              selected ? "border-[#37F2D1]" : "border-slate-700"
            }`}
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-800 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold truncate ${selected ? "text-[#37F2D1]" : "text-[#37F2D1]/80"}`}>
            {character.name}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            Lvl {level} {className}
          </div>
        </div>
      </button>
    </li>
  );
}
