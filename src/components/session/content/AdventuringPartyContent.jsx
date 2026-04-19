import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Swords, Package, Heart, Dog, ScrollText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CharacterTab     from "@/components/party/CharacterTab";
import SpellsTab        from "@/components/party/SpellsTab";
import InventoryTab     from "@/components/party/InventoryTab";
import RelationshipsTab from "@/components/party/RelationshipsTab";
import CompanionTab     from "@/components/party/CompanionTab";
import PlayerNotesTab   from "@/components/party/PlayerNotesTab";
import {
  isUserGM, ownsCharacter, canSeeRelationships,
} from "@/components/party/partyPermissions";

/**
 * Adventuring Party panel rendered inside the session modal. Mirrors
 * the full-page /AdventuringParty view: two columns, the party
 * member list on the left (portrait, name, race/class/level), and a
 * tabbed detail pane on the right (Character, Spells, Inventory,
 * Relationships, Companion, Player Notes). All tab bodies reuse
 * the components under `src/components/party/*` so the modal view
 * and the standalone page stay in lockstep.
 */
export default function AdventuringPartyContent({ campaignId, campaign }) {
  const { user } = useAuth();
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);

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

  const playerCharacters = useMemo(
    () => (characters || []).filter((c) => c.name),
    [characters],
  );

  const selected = useMemo(
    () => playerCharacters.find((c) => c.id === selectedCharacterId) || null,
    [playerCharacters, selectedCharacterId],
  );
  const ownsTarget = ownsCharacter(selected, user);
  const viewerContext = { isGM, ownsTarget, viewerUserId: user?.id };
  const showRelationships = canSeeRelationships(viewerContext);

  return (
    <div className="h-full flex min-h-0">
      {/* Left — party member list */}
      <aside className="w-72 flex-shrink-0 border-r border-[#1e293b] bg-[#050816] overflow-y-auto p-3">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
          Party ({playerCharacters.length})
        </div>
        {playerCharacters.length === 0 ? (
          <p className="text-xs text-slate-500 italic px-1">
            No characters in this campaign yet.
          </p>
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
  );
}

function PartyRow({ character, selected, onClick }) {
  const level = character.level || character?.stats?.level || 1;
  const className = [character.race || character?.stats?.race,
                     character.class || character?.stats?.class]
    .filter(Boolean).join(" · ");
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
            className={`w-12 h-12 rounded-lg object-cover object-top flex-shrink-0 border ${
              selected ? "border-[#37F2D1]" : "border-slate-700"
            }`}
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-800 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold truncate ${selected ? "text-[#37F2D1]" : "text-[#37F2D1]/80"}`}>
            {character.name}
            {character.active_title && (
              <span className="text-[#37F2D1]/70 ml-1 font-normal">{character.active_title}</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            Lvl {level}{className ? ` ${className}` : ""}
          </div>
        </div>
      </button>
    </li>
  );
}
