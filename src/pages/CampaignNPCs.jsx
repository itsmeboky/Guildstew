import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Upload, ArrowLeft, Copy, Edit, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import QuickCreateDialog from "@/components/characterCreator/QuickCreateDialog";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { calculateAbilityModifier, calculateMaxHP, calculateProficiencyBonus, calculatePassivePerception, getSpeed, calculateAC } from "@/components/dnd5e/characterCalculations";
import {
  characterPayloadFromNpc,
} from "@/components/dnd5e/characterMapping";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CampaignNPCs() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const navigate = useNavigate();
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [editingNPC, setEditingNPC] = useState(null);
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const queryClient = useQueryClient();

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then(c => c[0]),
    enabled: !!campaignId
  });

  const { data: npcs } = useQuery({
    queryKey: ['campaignNPCs', campaignId],
    queryFn: () => base44.entities.CampaignNPC.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: []
  });

  const getNpcStats = (npc) => {
    if (!npc) return {};
    // Prefer stats object, but support older flat NPCs as fallback
    return npc.stats || npc;
  };

  const filteredNPCs = npcs.filter(npc => {
    const stats = getNpcStats(npc);
    const q = searchQuery.toLowerCase();
    return (
      npc.name?.toLowerCase().includes(q) ||
      stats.race?.toLowerCase().includes(q) ||
      stats.class?.toLowerCase().includes(q)
    );
  });

  const createNPCMutation = useMutation({
    mutationFn: (data) => base44.entities.CampaignNPC.create({ ...data, campaign_id: campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignNPCs', campaignId] });
      setEditingNPC(null);
    }
  });

  const updateNPCMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CampaignNPC.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignNPCs', campaignId] });
      setSelectedNPC(null);
      setEditingNPC(null);
    }
  });

  const deleteNPCMutation = useMutation({
    mutationFn: (id) => base44.entities.CampaignNPC.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignNPCs', campaignId] });
      setSelectedNPC(null);
    }
  });

  const copyToLibraryMutation = useMutation({
    mutationFn: async (npc) => {
      const characterData = characterPayloadFromNpc(npc);
      return base44.entities.Character.create(characterData);
    },
    onSuccess: () => {
      toast.success("NPC copied to Character Library!");
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    }
  });

  const handleCreateNew = () => {
    setShowCreationDialog(true);
  };

  const handleCreationMethodSelect = (method) => {
    setShowCreationDialog(false);
    if (method === 'quick' || method === 'ai') {
      setShowQuickCreate(true);
    } else if (method === 'full') {
      navigate(createPageUrl("CharacterCreator") + `?campaignId=${campaignId}&returnTo=CampaignNPCs`);
    }
  };

  const handleCharacterCreated = async (characterData) => {
    // Reuse build stats helper for consistency (requires converting flat char data if needed, but handleCharacterCreated receives roughly correct shape)
    // We'll just build the stats object manually here to match the new schema logic perfectly for quick create
    const level = parseInt(characterData.level || 1);
    const attributes = characterData.attributes || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const profBonus = calculateProficiencyBonus(level);
    const maxHP = calculateMaxHP(characterData.class, level, attributes.con);
    const ac = characterData.armor_class || calculateAC(attributes.dex);
    const initiative = calculateAbilityModifier(attributes.dex);
    const speed = characterData.speed || getSpeed(characterData.race);
    const wisMod = calculateAbilityModifier(attributes.wis);
    const isPerceptionProficient = characterData.skills?.["Perception"];
    const passive_perception = 10 + wisMod + (isPerceptionProficient ? profBonus : 0);

    const stats = {
      name: characterData.name,
      race: characterData.race,
      subrace: characterData.subrace,
      class: characterData.class,
      subclass: characterData.subclass,
      background: characterData.background,
      level,
      alignment: characterData.alignment,
      avatar_url: characterData.avatar_url,
      profile_avatar_url: characterData.profile_avatar_url,
      avatar_position: characterData.avatar_position,
      avatar_zoom: characterData.avatar_zoom,
      profile_position: characterData.profile_position,
      profile_zoom: characterData.profile_zoom,
      attributes,
      hit_points: { max: maxHP, current: maxHP, temporary: 0 },
      armor_class: ac,
      initiative,
      speed,
      proficiency_bonus: profBonus,
      passive_perception,
      skills: characterData.skills,
      saving_throws: characterData.saving_throws,
      languages: characterData.languages,
      proficiencies: characterData.proficiencies,
      features: characterData.features,
      feature_choices: characterData.feature_choices,
      multiclasses: characterData.multiclasses,
      spells: characterData.spells,
      equipment: characterData.equipment,
      currency: characterData.currency,
      description: characterData.description || "",
      personality: characterData.personality,
      appearance: characterData.appearance,
      expertise: characterData.expertise,
      inventory: characterData.inventory
    };

    const npcData = {
      campaign_id: campaignId,
      name: characterData.name,
      description: characterData.description || "",
      avatar_url: characterData.profile_avatar_url || characterData.avatar_url,
      stats,
      abilities: characterData.features || [],
      inventory: characterData.inventory || [],
      notes: ""
    };
    
    await createNPCMutation.mutateAsync(npcData);
    setShowQuickCreate(false);
    toast.success("NPC created!");
  };

  const handleSave = () => {
    if (editingNPC.id) {
      updateNPCMutation.mutate({ id: editingNPC.id, data: editingNPC });
    } else {
      createNPCMutation.mutate(editingNPC);
    }
  };

  const handleImageUpload = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditingNPC({ ...editingNPC, avatar_url: file_url });
  };

  const getAbilityMod = (score) => {
    if (!score) return 0;
    return calculateAbilityModifier(score);
  };

  const formatModifier = (mod) => {
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: campaign?.npcs_image_url 
            ? `url(${campaign.npcs_image_url})`
            : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {campaign?.npcs_image_url && (
          <div className="absolute inset-0 bg-black/50" />
        )}
      </div>
      
      <div className="h-screen flex flex-col overflow-hidden p-6 relative z-10">
        <header className="flex items-center justify-between gap-3 mb-4 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate(createPageUrl("CampaignGMPanel") + `?id=${campaignId}`)}
              variant="outline"
              size="sm"
              className="text-[#37F2D1] border-[#37F2D1]/60 hover:bg-[#37F2D1]/10 hover:text-[#37F2D1]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Campaign
            </Button>
            <h1 className="text-2xl font-bold text-white">NPCs</h1>
          </div>
          <Button onClick={handleCreateNew} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-bold">
            <Plus className="w-4 h-4 mr-2" /> New NPC
          </Button>
        </header>

        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
          {/* Left: NPC detail — owns its own scroll. */}
          <div className="w-1/2 overflow-y-auto border border-slate-700/50 rounded-lg bg-[#1a1f2e]">
              {selectedNPC ? (() => {
                const stats = getNpcStats(selectedNPC);
                return (
                <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-8 border border-cyan-400/30 relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#37F2D1]/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                  
                  <div className="flex items-start justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-xl bg-[#1E2430] overflow-hidden border-2 border-[#37F2D1] shadow-lg shadow-[#37F2D1]/20">
                        {selectedNPC.avatar_url || stats.profile_avatar_url || stats.avatar_url ? (
                          <img src={selectedNPC.avatar_url || stats.profile_avatar_url || stats.avatar_url} alt={selectedNPC.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">?</div>
                        )}
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-white">{selectedNPC.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[#37F2D1] font-semibold">Level {stats.level || 1}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-300">{stats.race} {stats.class}</span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">{stats.background} • {stats.alignment}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => copyToLibraryMutation.mutate(selectedNPC)} 
                        size="sm"
                        variant="ghost"
                        className="text-gray-300 hover:text-[#37F2D1] hover:bg-[#37F2D1]/10"
                        disabled={copyToLibraryMutation.isPending}
                        title="Copy to Character Library"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        onClick={() => navigate(createPageUrl("CharacterCreator") + `?edit=${selectedNPC.id}&campaignId=${campaignId}&returnTo=CampaignNPCs`)}
                        size="sm"
                        variant="ghost"
                        className="text-gray-300 hover:text-white hover:bg-white/10"
                        title="Edit NPC"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        onClick={() => {
                          if(confirm('Delete this NPC?')) deleteNPCMutation.mutate(selectedNPC.id);
                        }} 
                        size="sm"
                        variant="ghost"
                        className="text-gray-300 hover:text-red-400 hover:bg-red-500/10"
                        title="Delete NPC"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Tabs defaultValue="stats" className="w-full relative z-10">
                    <TabsList className="bg-[#1E2430] border border-gray-700 mb-6 p-1 h-auto flex-wrap justify-start">
                      <TabsTrigger value="stats" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">Stats</TabsTrigger>
                      <TabsTrigger value="skills" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">Skills</TabsTrigger>
                      {(selectedNPC.spells?.cantrips?.length > 0 || selectedNPC.spells?.level1?.length > 0) && (
                        <TabsTrigger value="spells" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">Spells</TabsTrigger>
                      )}
                      <TabsTrigger value="features" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">Features</TabsTrigger>
                      <TabsTrigger value="inventory" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">Inventory</TabsTrigger>
                      <TabsTrigger value="notes" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">Notes</TabsTrigger>
                    </TabsList>

                    <TabsContent value="stats" className="space-y-6 animate-in fade-in duration-300">
                      {/* Core Stats */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-[#1E2430] rounded-xl p-4 text-center border border-gray-700/50">
                          <div className="text-2xl font-bold text-[#FF5722]">{stats.armor_class || 10}</div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Armor Class</div>
                        </div>
                        <div className="bg-[#1E2430] rounded-xl p-4 text-center border border-gray-700/50">
                          <div className="text-2xl font-bold text-[#37F2D1]">
                            {(stats.hit_points?.current ?? stats.hit_points?.max ?? 0)}/{stats.hit_points?.max || 0}
                          </div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Hit Points</div>
                        </div>
                        <div className="bg-[#1E2430] rounded-xl p-4 text-center border border-gray-700/50">
                          <div className="text-2xl font-bold text-white">{formatModifier(stats.initiative || 0)}</div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Initiative</div>
                        </div>
                        <div className="bg-[#1E2430] rounded-xl p-4 text-center border border-gray-700/50">
                          <div className="text-2xl font-bold text-white">{stats.speed || 30} ft</div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Speed</div>
                        </div>
                      </div>

                      {/* Attributes */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {Object.entries(stats.attributes || {}).map(([key, value]) => (
                          <div key={key} className="bg-[#1E2430] rounded-lg p-3 text-center border border-gray-700/50">
                            <div className="text-xs text-gray-500 uppercase mb-1">{key}</div>
                            <div className="text-xl font-bold text-white">{value}</div>
                            <div className="text-xs text-[#37F2D1]">{formatModifier(getAbilityMod(value))}</div>
                          </div>
                        ))}
                      </div>

                      {/* Saving Throws */}
                      {stats.saving_throws && Object.entries(stats.saving_throws).filter(([_, proficient]) => proficient).length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Saving Throws</h3>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.saving_throws).filter(([_, proficient]) => proficient).map(([ability]) => {
                              const abilityScore = stats.attributes?.[ability] || 10;
                              const mod = getAbilityMod(abilityScore) + (stats.proficiency_bonus || 2);
                              return (
                                <div key={ability} className="px-3 py-1.5 bg-[#1E2430] rounded border border-gray-700 flex items-center gap-2">
                                  <span className="text-xs text-gray-400 uppercase">{ability}</span>
                                  <span className="text-sm font-bold text-[#37F2D1]">{formatModifier(mod)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="skills" className="animate-in fade-in duration-300">
                      <div className="grid grid-cols-2 gap-3">
                        {stats.skills && Object.entries(stats.skills)
                          .filter(([_, proficient]) => proficient)
                          .map(([skill]) => {
                            const abilityMap = {
                              "Acrobatics": "dex", "Animal Handling": "wis", "Arcana": "int",
                              "Athletics": "str", "Deception": "cha", "History": "int",
                              "Insight": "wis", "Intimidation": "cha", "Investigation": "int",
                              "Medicine": "wis", "Nature": "int", "Perception": "wis",
                              "Performance": "cha", "Persuasion": "cha", "Religion": "int",
                              "Sleight of Hand": "dex", "Stealth": "dex", "Survival": "wis"
                            };
                            const ability = abilityMap[skill];
                            const abilityScore = stats.attributes?.[ability] || 10;
                            const isExpertise = stats.expertise?.includes(skill);
                            const mod = getAbilityMod(abilityScore) + (stats.proficiency_bonus || 2) * (isExpertise ? 2 : 1);
                            
                            return (
                              <div key={skill} className="flex items-center justify-between bg-[#1E2430] rounded-lg p-3 border border-gray-700/50">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-300">{skill}</span>
                                  {isExpertise && <span className="text-[#FF5722] text-[10px] border border-[#FF5722] px-1 rounded">EXP</span>}
                                </div>
                                <span className="font-bold text-[#37F2D1]">{formatModifier(mod)}</span>
                              </div>
                            );
                          })}
                        {(!stats.skills || Object.entries(stats.skills).filter(([_, p]) => p).length === 0) && (
                          <p className="col-span-2 text-gray-500 text-center py-8">No proficient skills.</p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="spells" className="animate-in fade-in duration-300">
                      <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-6">
                        {['cantrips', 'level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9'].map(levelKey => {
                          const spells = stats.spells?.[levelKey];
                          if (!spells || spells.length === 0) return null;

                          const levelLabel = levelKey === 'cantrips' ? 'Cantrips' : 
                                             levelKey === 'level1' ? '1st Level Spells' :
                                             levelKey === 'level2' ? '2nd Level Spells' :
                                             levelKey === 'level3' ? '3rd Level Spells' :
                                             `${levelKey.replace('level', '')}th Level Spells`;

                          return (
                            <div key={levelKey}>
                              <h3 className="text-sm font-semibold text-[#37F2D1] mb-3 uppercase tracking-wider sticky top-0 bg-[#2A3441]/95 backdrop-blur-sm py-2 z-10">{levelLabel}</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {spells.map((spell, idx) => (
                                  <div key={idx} className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50 hover:border-[#37F2D1]/50 transition-colors">
                                    <div className="font-bold text-white">{spell.name || spell}</div>
                                    {spell.description && <div className="text-xs text-gray-400 mt-1 line-clamp-2">{spell.description}</div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {(!stats.spells || Object.values(stats.spells).every(arr => !arr || arr.length === 0)) && (
                          <p className="text-center text-gray-500 py-8">No spells known.</p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="features" className="animate-in fade-in duration-300">
                      <div className="space-y-3">
                        {stats.features?.map((feature, idx) => (
                          <div key={idx} className="bg-[#1E2430] rounded-lg p-4 border border-gray-700/50">
                            <div className="flex items-baseline justify-between mb-1">
                              <div className="font-bold text-[#37F2D1]">{feature.name}</div>
                              {feature.source && <div className="text-xs text-gray-500">{feature.source}</div>}
                            </div>
                            <div className="text-sm text-gray-300 leading-relaxed">{feature.description}</div>
                          </div>
                        ))}
                        {(!stats.features || stats.features.length === 0) && (
                          <p className="text-gray-500 text-center py-8">No features or traits.</p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="inventory" className="animate-in fade-in duration-300 space-y-6">
                      {stats.equipment?.weapons?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Weapons</h3>
                          <div className="space-y-2">
                            {stats.equipment.weapons.map((weapon, idx) => (
                              <div key={idx} className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50 flex justify-between items-center">
                                <span className="font-semibold text-white">{weapon.name}</span>
                                <Badge variant="outline" className="text-gray-300 border-gray-600">{weapon.damage}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Equipment & Items</h3>
                        <div className="space-y-2">
                          {/* Fallback to top-level inventory if stats.inventory is empty, although mapping should handle it */}
                          {(stats.inventory?.length > 0 ? stats.inventory : selectedNPC.inventory)?.map((item, idx) => (
                            <div key={idx} className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50 flex justify-between items-center">
                              <span className="text-gray-300">{item.name}</span>
                              <span className="text-xs text-gray-500">x{item.quantity || 1}</span>
                            </div>
                          ))}
                          {(!stats.inventory && !selectedNPC.inventory || (stats.inventory?.length === 0 && selectedNPC.inventory?.length === 0)) && (
                            <p className="text-gray-500 text-sm italic">Inventory is empty.</p>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="notes" className="animate-in fade-in duration-300">
                      <div className="bg-[#1E2430] rounded-xl p-6 border border-gray-700/50 min-h-[200px]">
                        <div 
                          className="prose prose-invert max-w-none prose-sm"
                          dangerouslySetInnerHTML={{ __html: selectedNPC.notes || '<p class="text-gray-500 italic">No GM notes added.</p>' }}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                );
              })() : (
                <div className="flex flex-col items-center justify-center text-center h-full min-h-[400px] p-12">
                  <div className="w-20 h-20 bg-[#1E2430] rounded-full flex items-center justify-center mb-4 border-2 border-gray-700 border-dashed">
                    <Search className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Select an NPC</h3>
                  <p className="text-gray-400 max-w-md">
                    Pick an NPC from the list on the right to view their details, stats, and notes.
                  </p>
                </div>
              )}
          </div>

          {/* Right: search + NPC list, own scroll. */}
          <div className="w-1/2 flex flex-col overflow-hidden min-h-0">
            <div className="flex-shrink-0 mb-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search NPCs…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#1E2430] border-gray-700 text-white pl-9"
              />
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {filteredNPCs.length > 0 ? (
                <ul className="divide-y divide-slate-700/30 bg-[#1a1f2e] border border-slate-700/50 rounded-lg overflow-hidden">
                  {filteredNPCs.map((npc) => {
                    const stats = getNpcStats(npc);
                    const imgUrl = npc.avatar_url || stats.profile_avatar_url || stats.avatar_url;
                    const active = selectedNPC?.id === npc.id;
                    const subLine = [stats.race, stats.class, stats.level ? `Lvl ${stats.level}` : null]
                      .filter(Boolean).join(" • ") || npc.faction || npc.location || "—";
                    const isAlive = npc.is_alive !== false;
                    return (
                      <li key={npc.id}>
                        <button
                          type="button"
                          onClick={() => { setSelectedNPC(npc); setEditingNPC(null); }}
                          className={`w-full text-left flex items-center gap-3 p-3 transition-colors ${
                            active
                              ? "bg-[#252b3d] border-l-2 border-l-[#37F2D1]"
                              : "hover:bg-[#252b3d]"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-[#0f1419] overflow-hidden flex-shrink-0 border border-gray-600">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={npc.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.parentElement.className =
                                    "w-10 h-10 rounded-full bg-slate-700 flex-shrink-0";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500">
                                {npc.name?.charAt(0) || "?"}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold truncate ${active ? "text-[#37F2D1]" : "text-white"}`}>
                              {npc.name}
                            </div>
                            <div className="text-xs text-slate-400 truncate">{subLine}</div>
                          </div>
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              isAlive ? "bg-emerald-400" : "bg-red-400"
                            }`}
                            title={isAlive ? "Alive" : "Deceased"}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-12 text-center">
                  <p className="text-sm text-slate-500 italic">No NPCs match.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Creation Method Dialog */}
      <Dialog open={showCreationDialog} onOpenChange={setShowCreationDialog}>
        <DialogContent className="bg-[#1E2430] border-[#2A3441] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-4">Create New NPC</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-400 text-center mb-6">Choose how you want to create your NPC</p>
            
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => handleCreationMethodSelect('full')}
                className="bg-[#2A3441] hover:bg-[#2A3441]/80 rounded-xl p-6 border-2 border-[#37F2D1]/30 hover:border-[#37F2D1] transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">📝</div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Full Character Creator</h3>
                    <p className="text-white/60 text-sm">Complete control over every stat, skill, spell, and detail</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleCreationMethodSelect('quick')}
                className="bg-[#2A3441] hover:bg-[#2A3441]/80 rounded-xl p-6 border-2 border-[#37F2D1]/30 hover:border-[#37F2D1] transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">⚡</div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Quick Pick</h3>
                    <p className="text-white/60 text-sm">Choose race, class, and background - AI generates the rest</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleCreationMethodSelect('ai')}
                className="bg-[#2A3441] hover:bg-[#2A3441]/80 rounded-xl p-6 border-2 border-[#FF5722]/30 hover:border-[#FF5722] transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">✨</div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">AI Generate</h3>
                    <p className="text-white/60 text-sm">Describe your NPC and let AI create everything</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Create Dialog */}
      <QuickCreateDialog
        open={showQuickCreate}
        onClose={() => setShowQuickCreate(false)}
        onCharacterCreated={handleCharacterCreated}
      />
    </>
  );
}