import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, User, Shield, Heart, Zap, Eye, Footprints, Swords, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CreateCharacterDialog from "@/components/characters/CreateCharacterDialog";
import { useDisplayName } from "@/hooks/useDisplayName";
import { useSheetModifications } from "@/hooks/useSheetModifications";
import SheetModSections from "@/components/homebrew/SheetModSections";
import { supabase } from "@/api/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  classFeatureDescriptions,
  languageDescriptions,
  invocationDescriptions,
  alignmentDescriptions,
  subclassDescriptions,
  pactBoonDescriptions,
  fightingStyleDescriptions
} from "@/components/dnd5e/featureDescriptions";
import CompanionCard from "@/components/characters/CompanionCard";
import SpellHoverCard from "@/components/spells/SpellHoverCard";
import { classHitDice } from "@/components/dnd5e/characterCalculations";
import { spellDetails, spellIcons } from "@/components/dnd5e/spellData";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { abilityModifier } from '@/components/dnd5e/dnd5eRules';
import { safeText } from "@/utils/safeRender";

const skillAbilityMap = {
  "Athletics": "Str",
  "Acrobatics": "Dex", "Sleight of Hand": "Dex", "Stealth": "Dex",
  "Arcana": "Int", "History": "Int", "Investigation": "Int", "Nature": "Int", "Religion": "Int",
  "Animal Handling": "Wis", "Insight": "Wis", "Medicine": "Wis", "Perception": "Wis", "Survival": "Wis",
  "Deception": "Cha", "Intimidation": "Cha", "Performance": "Cha", "Persuasion": "Cha"
};

const skillAbilityKeys = {
  "Athletics": "str",
  "Acrobatics": "dex", "Sleight of Hand": "dex", "Stealth": "dex",
  "Arcana": "int", "History": "int", "Investigation": "int", "Nature": "int", "Religion": "int",
  "Animal Handling": "wis", "Insight": "wis", "Medicine": "wis", "Perception": "wis", "Survival": "wis",
  "Deception": "cha", "Intimidation": "cha", "Performance": "cha", "Persuasion": "cha"
};

const allSkills = [
  "Athletics",
  "Acrobatics", "Sleight of Hand", "Stealth",
  "Arcana", "History", "Investigation", "Nature", "Religion",
  "Animal Handling", "Insight", "Medicine", "Perception", "Survival",
  "Deception", "Intimidation", "Performance", "Persuasion"
];

const backgroundInfo = {
  "Acolyte": { feature: "Shelter of the Faithful", description: "You command the respect of those who share your faith, and you can perform religious ceremonies. You and your companions can receive free healing and care at temples, shrines, or other established presences of your faith." },
  "Charlatan": { feature: "False Identity", description: "You have created a second identity with documentation, established acquaintances, and disguises that allow you to assume that persona." },
  "Criminal": { feature: "Criminal Contact", description: "You have a reliable contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact." },
  "Entertainer": { feature: "By Popular Demand", description: "You can always find a place to perform, where you receive free lodging and food of a modest or comfortable standard." },
  "Folk Hero": { feature: "Rustic Hospitality", description: "Since you come from the ranks of the common folk, you fit in among them with ease. You can find a place to hide, rest, or recuperate among other commoners." },
  "Guild Artisan": { feature: "Guild Membership", description: "As an established member of a guild, you can rely on certain benefits that membership provides. Your fellow guild members will provide you with lodging and food if necessary." },
  "Hermit": { feature: "Discovery", description: "The quiet seclusion of your extended hermitage gave you access to a unique and powerful discovery." },
  "Noble": { feature: "Position of Privilege", description: "Thanks to your noble birth, people are inclined to think the best of you. You are welcome in high society, and people assume you have the right to be wherever you are." },
  "Outlander": { feature: "Wanderer", description: "You have an excellent memory for maps and geography, and you can always recall the general layout of terrain, settlements, and other features around you." },
  "Sage": { feature: "Researcher", description: "When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it." },
  "Sailor": { feature: "Ship's Passage", description: "When you need to, you can secure free passage on a sailing ship for yourself and your adventuring companions." },
  "Soldier": { feature: "Military Rank", description: "You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence." },
  "Urchin": { feature: "City Secrets", description: "You know the secret patterns and flow to cities and can find passages through the urban sprawl that others would miss. You can move through cities twice as fast as normal." }
};

const raceInfo = {
  "Dragonborn": { creatureType: "Humanoid", size: "Medium", features: ["Breath Weapon", "Damage Resistance", "Darkvision"] },
  "Elf": { creatureType: "Humanoid", size: "Medium", features: ["Darkvision", "Fey Ancestry", "Trance"] },
  "Dwarf": { creatureType: "Humanoid", size: "Medium", features: ["Darkvision", "Dwarven Resilience", "Stonecunning"] },
  "Human": { creatureType: "Humanoid", size: "Medium", features: ["Versatile", "Extra Skill"] },
  "Halfling": { creatureType: "Humanoid", size: "Small", features: ["Lucky", "Brave", "Nimble"] },
  "Tiefling": { creatureType: "Humanoid", size: "Medium", features: ["Darkvision", "Hellish Resistance", "Infernal Legacy"] },
  "Half-Elf": { creatureType: "Humanoid", size: "Medium", features: ["Darkvision", "Fey Ancestry", "Skill Versatility"] },
  "Half-Orc": { creatureType: "Humanoid", size: "Medium", features: ["Darkvision", "Relentless Endurance", "Savage Attacks"] },
  "Gnome": { creatureType: "Humanoid", size: "Small", features: ["Darkvision", "Gnome Cunning"] }
};

const featureDescriptions = {
  "Breath Weapon": "Use your action to exhale destructive energy based on your draconic ancestry. Each creature in the area must make a saving throw, taking 2d6 damage on a failed save and half on a success.",
  "Damage Resistance": "You have resistance to the damage type associated with your draconic ancestry.",
  "Darkvision": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
  "Fey Ancestry": "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
  "Trance": "Elves don't need to sleep. Instead, they meditate deeply, remaining semiconscious, for 4 hours a day.",
  "Dwarven Resilience": "You have advantage on saving throws against poison, and you have resistance against poison damage.",
  "Stonecunning": "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check.",
  "Versatile": "You gain a +1 bonus to all ability scores.",
  "Extra Skill": "You gain proficiency in one skill of your choice.",
  "Lucky": "When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.",
  "Brave": "You have advantage on saving throws against being frightened.",
  "Nimble": "You can move through the space of any creature that is of a size larger than yours.",
  "Hellish Resistance": "You have resistance to fire damage.",
  "Infernal Legacy": "You know the thaumaturgy cantrip. When you reach 3rd level, you can cast hellish rebuke once per long rest. When you reach 5th level, you can cast darkness once per long rest.",
  "Skill Versatility": "You gain proficiency in two skills of your choice.",
  "Relentless Endurance": "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can't use this feature again until you finish a long rest.",
  "Savage Attacks": "When you score a critical hit with a melee weapon attack, you can roll one of the weapon's damage dice one additional time and add it to the extra damage of the critical hit.",
  "Gnome Cunning": "You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic."
};

const classFeatureNames = {
  "Barbarian": ["Rage", "Unarmored Defense", "Reckless Attack", "Danger Sense"],
  "Bard": ["Spellcasting", "Bardic Inspiration", "Jack of All Trades", "Song of Rest"],
  "Cleric": ["Spellcasting", "Divine Domain", "Channel Divinity"],
  "Druid": ["Druidic", "Spellcasting", "Wild Shape"],
  "Fighter": ["Fighting Style", "Second Wind", "Action Surge"],
  "Monk": ["Unarmored Defense", "Martial Arts", "Ki", "Unarmored Movement"],
  "Paladin": ["Divine Sense", "Lay on Hands", "Divine Smite"],
  "Ranger": ["Favored Enemy", "Natural Explorer", "Spellcasting"],
  "Rogue": ["Expertise", "Sneak Attack", "Thieves' Cant", "Cunning Action"],
  "Sorcerer": ["Spellcasting", "Sorcerous Origin", "Font of Magic", "Metamagic"],
  "Warlock": ["Otherworldly Patron", "Pact Magic", "Eldritch Invocations", "Pact Boon"],
  "Wizard": ["Spellcasting", "Arcane Recovery", "Arcane Tradition"]
};

const statDescriptions = {
  "Armor Class": "Your Armor Class (AC) represents how hard you are to hit in combat. Higher AC means attacks are less likely to land.",
  "Initiative": "Your Initiative bonus determines your place in the turn order during combat. Higher initiative means you act sooner.",
  "Speed": "Your Speed is the distance you can move on your turn in feet. Most characters can move 30 feet per turn.",
  "Hit Points": "Hit Points (HP) represent your health and vitality. When you reach 0 HP, you fall unconscious and begin making death saving throws.",
  "Hit Dice": "Hit Dice are used to recover hit points during short rests. You have a number of Hit Dice equal to your character level.",
  "Proficiency Bonus": "Your Proficiency Bonus is added to attack rolls, ability checks, and saving throws you're proficient in. It increases as you level up.",
  "Passive Perception": "Your Passive Perception is used when the DM wants to secretly determine if you notice something. It equals 10 + your Wisdom (Perception) modifier."
};

export default function CharacterLibrary() {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [hoveredCharacterId, setHoveredCharacterId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("stats");
  // Resolves renameable labels against the selected character's
  // campaign mods, so a campaign with an installed reskin (HP →
  // Wounds, STR → Might, etc.) shows the renamed labels on the
  // sheet instead of the SRD defaults.
  const display = useDisplayName({ campaignId: selectedCharacter?.campaign_id });
  const sheetMods = useSheetModifications(selectedCharacter?.campaign_id);
  // Persist mod_data edits directly to the character row. The
  // stats blob keeps a mod_data slot so custom-section state
  // doesn't collide with core stats (hit points, attributes, etc).
  const saveModData = async (nextModData) => {
    if (!selectedCharacter?.id) return;
    const nextStats = { ...(selectedCharacter.stats || {}), mod_data: nextModData };
    const { error } = await supabase
      .from("characters")
      .update({ stats: nextStats })
      .eq("id", selectedCharacter.id);
    if (error) { console.warn("mod_data save failed:", error.message); return; }
    setSelectedCharacter((c) => (c ? { ...c, stats: nextStats } : c));
  };
  const [hoveredItem, setHoveredItem] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    initialData: null
  });

  const { data: characters, isLoading: charactersLoading } = useQuery({
    queryKey: ['allCharacters'],
    queryFn: () => base44.entities.Character.filter({ created_by: user?.email }, '-last_played'),
    enabled: !!user,
    initialData: []
  });

  const deleteCharacterMutation = useMutation({
    mutationFn: (id) => base44.entities.Character.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCharacters'] });
      if (selectedCharacter?.id === characterToDelete?.id) {
        setSelectedCharacter(characters[0] || null);
      }
      setDeleteDialogOpen(false);
      setCharacterToDelete(null);
    }
  });

  React.useEffect(() => {
    if (characters.length > 0 && !selectedCharacter) {
      setSelectedCharacter(characters[0]);
    }
  }, [characters, selectedCharacter]);

  // handleEditClick and handleDeleteClick are now inlined for the right panel buttons
  // and removed from the left panel character card logic.

  const calculateModifier = (score) => {
    const mod = abilityModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const getModifierValue = (score) => {
    return abilityModifier(score);
  };

  const getSavingThrowModifier = (abilityKey) => {
    if (!selectedCharacter?.attributes) return "+0";
    const baseMod = getModifierValue(selectedCharacter.attributes[abilityKey]);
    const profBonus = selectedCharacter.proficiency_bonus || 2;

    const savingThrows = selectedCharacter.saving_throws || {};
    const isProficient = savingThrows[abilityKey];

    const totalMod = isProficient ? baseMod + profBonus : baseMod;
    return totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;
  };

  const getSkillModifier = (skillName) => {
    if (!selectedCharacter?.attributes) return "+0";
    
    const abilityKey = skillAbilityKeys[skillName];
    const baseMod = getModifierValue(selectedCharacter.attributes[abilityKey]);
    const profBonus = selectedCharacter.proficiency_bonus || 2;
    
    const skills = selectedCharacter.skills || {};
    const expertise = selectedCharacter.expertise || [];
    
    const isProficient = skills[skillName];
    const hasExpertise = expertise.includes(skillName);
    
    let totalMod = baseMod;
    if (hasExpertise) {
      totalMod += (profBonus * 2);
    } else if (isProficient) {
      totalMod += profBonus;
    }
    
    return totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;
  };

  const classInfo = selectedCharacter ? raceInfo[selectedCharacter.race] : null;
  const bgInfo = selectedCharacter ? backgroundInfo[selectedCharacter.background] : null;

  return (
    <div
      className="min-h-screen flex relative"
      style={{
        backgroundImage: 'url(https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/767199510_ezgif2.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-white/30" />

      {/* Left Sidebar - Character List */}
      <div className="w-[420px] p-6 flex flex-col relative z-10" style={{
        background: 'linear-gradient(to right, rgba(30, 36, 48, 0.7), rgba(30, 36, 48, 0.95))'
      }}>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">Character Library</h2>
          <div className="w-16 h-0.5 bg-[#FF5722] mx-auto mt-2" />
        </div>

        <div className="flex-1 overflow-y-auto mb-6 px-2" style={{ paddingTop: '25px' }}>
          {charactersLoading && characters.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {characters.map((character) => {
              return (
                <div
                  key={character.id}
                  className="relative group cursor-pointer"
                  onClick={() => setSelectedCharacter(character)}
                >
                  <div
                    className={`aspect-square rounded-lg overflow-hidden transition-all ${
                      selectedCharacter?.id === character.id
                        ? 'ring-4 ring-[#37F2D1]'
                        : 'ring-2 ring-gray-600 hover:ring-[#FF5722]'
                    }`}
                  >
                    {(character.profile_avatar_url || character.avatar_url) ? (
                      <img
                        src={character.profile_avatar_url || character.avatar_url}
                        alt={character.name}
                        className="w-full h-full"
                        style={{
                          objectFit: 'cover',
                          // Default to "top" so tall portraits keep the face in
                          // frame instead of anchoring to the midsection. A
                          // character-specific profile_position still wins
                          // through the transform below.
                          objectPosition: 'top',
                          transform: character.profile_position && character.profile_zoom
                            ? `translate(${character.profile_position.x}px, ${character.profile_position.y}px) scale(${character.profile_zoom})`
                            : 'none',
                          transformOrigin: 'center center'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1E2430] flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        <button
          onClick={() => setCreateDialogOpen(true)}
          className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create New
        </button>
      </div>

      {/* Center - Character Portrait */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        {selectedCharacter ? (
          <div
            className="w-full h-full bg-top bg-cover rounded-2xl shadow-2xl"
            style={{
              // Avatar falls through to a dark gradient if the
              // character has no portrait — no more via.placeholder
              // hits that were failing in dev.
              backgroundImage: selectedCharacter.avatar_url
                ? `url(${selectedCharacter.avatar_url})`
                : 'linear-gradient(135deg, #1a1f2e 0%, #2A3441 50%, #050816 100%)',
              maxWidth: '600px'
            }}
          />
        ) : (
          <div className="text-gray-500 text-xl">Select a character to view</div>
        )}
      </div>

      {/* Right Panel - Character Details */}
      {selectedCharacter && (
        <div className="w-[500px] p-6 overflow-y-auto relative z-10 overflow-x-hidden" style={{
          background: 'linear-gradient(to left, rgba(30, 36, 48, 0.7), rgba(30, 36, 48, 0.95))'
        }}>
          <div className="mb-6">
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-3xl font-bold text-[#FF5722] flex-1">
                {selectedCharacter.name}
                {selectedCharacter.active_title && (
                  <span className="text-[#37F2D1] ml-2 font-bold text-2xl align-middle">
                    {selectedCharacter.active_title}
                  </span>
                )}
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(createPageUrl("CharacterCreator") + `?edit=${selectedCharacter.id}`);
                  }}
                  className="p-2 bg-[#37F2D1] hover:bg-[#2dd9bd] rounded-lg transition-colors"
                  title="Edit Character"
                >
                  <Edit className="w-4 h-4 text-[#1E2430]" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCharacterToDelete(selectedCharacter);
                    setDeleteDialogOpen(true);
                  }}
                  className="p-2 bg-[#FF5722] hover:bg-[#FF6B3D] rounded-lg transition-colors"
                  title="Delete Character"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            <p className="text-gray-300 text-lg mb-3 flex items-center gap-2 flex-wrap">
              <span>
                Level {selectedCharacter.level} {selectedCharacter.race || ''} {selectedCharacter.class}
              </span>
              {Array.isArray(selectedCharacter.mod_dependencies)
                && selectedCharacter.mod_dependencies.some((d) => d?.mod_type === "race") && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#050816] bg-[#37F2D1] rounded px-1.5 py-0.5">
                  <Sparkles className="w-3 h-3" /> Brewery Race
                </span>
              )}
              {Array.isArray(selectedCharacter.mod_dependencies)
                && selectedCharacter.mod_dependencies.some((d) => d?.mod_type === "class") && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#050816] bg-[#37F2D1] rounded px-1.5 py-0.5">
                  <Sparkles className="w-3 h-3" /> Brewery Class
                </span>
              )}
              {selectedCharacter.campaign_origin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest rounded px-1.5 py-0.5 bg-violet-500/15 text-violet-200 border border-violet-400/40">
                  <Sparkles className="w-3 h-3" /> Built for {selectedCharacter.campaign_origin}
                </span>
              )}
            </p>
            {selectedCharacter.tags && selectedCharacter.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedCharacter.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-[#1E2430] text-white">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="bg-[#1E2430] rounded-lg p-4 max-h-32 overflow-y-auto">
              <p className="text-gray-400 text-sm leading-relaxed">
                {selectedCharacter.description || "No biography available."}
              </p>
            </div>
          </div>

          {/* Companions Section — reads characterData.companions (the
              shape written by CompanionPicker / the GM approval
              editor). Falls back to the legacy companion_* fields for
              characters created before the picker existed. Pending
              custom companions render with an amber "Pending GM
              Approval" badge via CompanionCard. */}
          {(() => {
            const companions = Array.isArray(selectedCharacter.companions)
              ? selectedCharacter.companions
              : [];
            const legacy = companions.length === 0 && (selectedCharacter.companion_name || selectedCharacter.companion_image)
              ? [{
                  name: selectedCharacter.companion_name,
                  image: selectedCharacter.companion_image,
                  background: selectedCharacter.companion_background,
                }]
              : [];
            const list = companions.length > 0 ? companions : legacy;
            if (list.length === 0) return null;
            return (
              <div className="mb-6 bg-[#1E2430]/70 rounded-lg p-4 border border-[#5B4B9E]/30 space-y-3">
                <h2 className="text-lg font-bold text-[#5B4B9E]">Companions</h2>
                {list.map((comp, i) => (
                  <CompanionCard key={comp?.id || i} companion={comp} />
                ))}
              </div>
            );
          })()}

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b-2 border-gray-600">
            {['Stats', 'Skills', 'Spells', 'Background', 'Inventory'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`pb-3 px-1 font-bold text-base transition-colors ${
                  activeTab === tab.toLowerCase()
                    ? 'text-[#FF5722] border-b-4 border-[#FF5722]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              {/* Brewery sheet-mod sections anchored at 'sidebar'
                  — rendered at the top of the stats tab so they
                  sit alongside the primary readouts. */}
              <SheetModSections
                sections={sheetMods.add_sections}
                position="sidebar"
                character={selectedCharacter}
                onChange={saveModData}
              />

              {/* Combat Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <div
                  className="bg-gradient-to-br from-[#2A3441] to-[#1E2430] rounded-xl p-4 text-center border border-[#37F2D1]/30 cursor-help relative"
                  onMouseEnter={() => setHoveredItem('ac')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Shield className="w-5 h-5 text-[#37F2D1] mx-auto mb-1" />
                  <div className="text-xs text-gray-400 mb-1 uppercase">{display("term", "Armor Class")}</div>
                  <div className="text-3xl font-bold text-white">{selectedCharacter.armor_class || 10}</div>
                  {hoveredItem === 'ac' && (
                    <div className="absolute z-50 right-0 top-full mt-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border-2 border-[#37F2D1]">
                      {statDescriptions["Armor Class"]}
                    </div>
                  )}
                </div>

                <div
                  className="bg-gradient-to-br from-[#2A3441] to-[#1E2430] rounded-xl p-4 text-center border border-[#FF5722]/30 cursor-help relative"
                  onMouseEnter={() => setHoveredItem('initiative')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Zap className="w-5 h-5 text-[#FF5722] mx-auto mb-1" />
                  <div className="text-xs text-gray-400 mb-1 uppercase">{display("term", "Initiative")}</div>
                  <div className="text-3xl font-bold text-white">{calculateModifier(selectedCharacter.attributes?.dex || 10)}</div>
                  {hoveredItem === 'initiative' && (
                    <div className="absolute z-50 right-0 top-full mt-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border-2 border-[#FF5722]">
                      {statDescriptions["Initiative"]}
                    </div>
                  )}
                </div>

                <div
                  className="bg-gradient-to-br from-[#2A3441] to-[#1E2430] rounded-xl p-4 text-center border border-gray-600 cursor-help relative"
                  onMouseEnter={() => setHoveredItem('speed')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Footprints className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <div className="text-xs text-gray-400 mb-1">SPEED</div>
                  <div className="text-3xl font-bold text-white">{selectedCharacter.speed || 30}</div>
                  <div className="text-xs text-gray-500">ft.</div>
                  {hoveredItem === 'speed' && (
                    <div className="absolute z-50 right-0 top-full mt-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border-2 border-gray-600">
                      {statDescriptions["Speed"]}
                    </div>
                  )}
                </div>
              </div>

              {/* HP and Hit Dice Row */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="bg-gradient-to-br from-[#2A3441] to-[#1E2430] rounded-xl p-4 text-center border border-red-500/30 cursor-help relative"
                  onMouseEnter={() => setHoveredItem('hp')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                  <div className="text-xs text-gray-400 mb-1 uppercase">{display("term", "Hit Points")}</div>
                  <div className="text-4xl font-bold text-white">{selectedCharacter.hit_points?.max || 10}</div>
                  {hoveredItem === 'hp' && (
                    <div className="absolute z-50 right-0 top-full mt-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border-2 border-red-500">
                      {statDescriptions["Hit Points"]}
                    </div>
                  )}
                </div>

                <div
                  className="bg-gradient-to-br from-[#2A3441] to-[#1E2430] rounded-xl p-4 text-center border border-gray-600 cursor-help relative"
                  onMouseEnter={() => setHoveredItem('hitdice')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div className="text-xs text-gray-400 mb-1">HIT DICE</div>
                  <div className="text-4xl font-bold text-white">1d{classHitDice[selectedCharacter.class] || 8}</div>
                  {hoveredItem === 'hitdice' && (
                    <div className="absolute z-50 right-0 top-full mt-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border-2 border-gray-600">
                      {statDescriptions["Hit Dice"]}
                    </div>
                  )}
                </div>
              </div>

              {/* Ability Scores */}
              <div className="bg-[#1E2430]/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-sm font-bold text-[#FFC6AA] mb-3 uppercase">Ability Scores</h3>
                <div className="grid grid-cols-3 gap-3">
                  {selectedCharacter.attributes && Object.entries(selectedCharacter.attributes).map(([key, value]) => {
                    const savingThrows = selectedCharacter.saving_throws || {};
                    const isProficient = savingThrows[key];
                    return (
                      <div
                        key={key}
                        className={`bg-[#2A3441] rounded-lg p-3 border ${isProficient ? 'border-yellow-400' : 'border-gray-700'} cursor-help relative`}
                        onMouseEnter={() => setHoveredItem(`ability-${key}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <div className="text-xs text-gray-400 uppercase text-center mb-1">{display("abbreviation", key)}</div>
                        <div className="text-2xl font-bold text-[#FF5722] text-center">
                          {calculateModifier(value)}
                        </div>
                        <div className="text-sm text-gray-300 text-center bg-[#1E2430] rounded-full w-10 h-10 flex items-center justify-center mx-auto mt-2">
                          {value}
                        </div>
                        {isProficient && (
                          <div className="text-center mt-2">
                            <div className="text-xs text-yellow-400 font-semibold">Save {getSavingThrowModifier(key)}</div>
                          </div>
                        )}
                        {hoveredItem === `ability-${key}` && (
                          <div className="absolute z-50 right-0 top-full mt-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-48 shadow-xl border-2 border-[#FF5722]">
                            <div className="font-bold mb-1">{display("ability", key)} ({display("abbreviation", key)})</div>
                            <div>Base modifier: {calculateModifier(value)}</div>
                            {isProficient && <div className="text-yellow-400 mt-1">Proficient in saving throws</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Proficiency & Perception */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="bg-gradient-to-br from-[#2A3441] to-[#1E2430] rounded-xl p-4 text-center border border-yellow-400 cursor-help relative"
                  onMouseEnter={() => setHoveredItem('proficiency')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div className="text-xs text-gray-400 mb-1">PROFICIENCY</div>
                  <div className="text-4xl font-bold text-yellow-400">
                    +{selectedCharacter.proficiency_bonus || 2}
                  </div>
                  {hoveredItem === 'proficiency' && (
                    <div className="absolute z-50 right-0 top-full mt-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border-2 border-yellow-400">
                      {statDescriptions["Proficiency Bonus"]}
                    </div>
                  )}
                </div>

                <div
                  className="bg-gradient-to-br from-[#2A3441] to-[#1E2430] rounded-xl p-4 text-center border border-gray-600 cursor-help relative"
                  onMouseEnter={() => setHoveredItem('perception')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Eye className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <div className="text-xs text-gray-400 mb-1">PASSIVE PERCEPTION</div>
                  <div className="text-4xl font-bold text-white">
                    {selectedCharacter.passive_perception || 10}
                  </div>
                  {hoveredItem === 'perception' && (
                    <div className="absolute z-50 left-0 bottom-full mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border-2 border-gray-600">
                      {statDescriptions["Passive Perception"]}
                    </div>
                  )}
                </div>
              </div>

              <Button className="w-full bg-[#FF5722] hover:bg-[#FF6B3D] text-white font-bold text-xl py-6 rounded-2xl">
                PLAY
              </Button>
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (() => {
            // Effective skill list for this character = SRD skills
            // minus anything sheet_mods strip, plus anything they add.
            // Added skills know their governing ability so the
            // existing modifier path works without special-casing.
            const removeSet = new Set(sheetMods.remove_skills || []);
            const baseSkills = allSkills.filter((s) => !removeSet.has(s));
            const addedSkills = (sheetMods.add_skills || [])
              .map((s) => (typeof s === "string" ? { name: s } : s))
              .filter((s) => s?.name);
            const effectiveSkills = [
              ...baseSkills.map((name) => ({ name, isBase: true })),
              ...addedSkills.map((s) => ({
                name: s.name,
                ability: s.ability,
                description: s.description,
                isBase: false,
              })),
            ];
            const renameMap = sheetMods.rename_skills || {};
            return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {effectiveSkills.map(({ name: skillName, ability, description, isBase }) => {
                  const skills = selectedCharacter.skills || {};
                  const expertise = selectedCharacter.expertise || [];
                  const isProficient = skills[skillName];
                  const hasExpertise = expertise.includes(skillName);
                  const labelOverride = renameMap[skillName];
                  const displayLabel = labelOverride || skillName;

                  const modifier = isBase
                    ? getSkillModifier(skillName)
                    : (() => {
                        // Added skills use their declared ability
                        // score to compute the base check modifier.
                        const abilKey = ability || "int";
                        const score = selectedCharacter.attributes?.[abilKey] ?? 10;
                        const mod = Math.floor((score - 10) / 2);
                        return mod >= 0 ? `+${mod}` : `${mod}`;
                      })();

                  return (
                    <div
                      key={skillName}
                      className="bg-gradient-to-r from-[#2A3441] to-[#1E2430] rounded-lg p-2 border border-gray-700 flex items-center gap-2 cursor-help relative transition-all hover:border-[#FF5722]"
                      onMouseEnter={() => setHoveredItem(`skill-${skillName}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {hasExpertise ? (
                          <div className="w-3 h-3 bg-yellow-400 rounded-sm flex items-center justify-center">
                            <span className="text-[#1E2430] text-xs font-bold">★</span>
                          </div>
                        ) : isProficient ? (
                          <div className="w-3 h-3 bg-[#37F2D1] rounded-sm flex items-center justify-center">
                            <span className="text-[#1E2430] text-xs font-bold">✓</span>
                          </div>
                        ) : (
                          <div className="w-3 h-3 border border-gray-600 rounded-sm flex-shrink-0" />
                        )}
                      </div>

                      <div className="text-xl font-bold w-11 text-center flex-shrink-0 text-white">
                        {modifier}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate text-white">
                          {displayLabel}
                        </div>
                        <div className="text-xs text-gray-500">
                          ({isBase ? skillAbilityMap[skillName] : (ability || "int").toUpperCase()})
                        </div>
                      </div>

                      {hoveredItem === `skill-${skillName}` && (
                        <div className="absolute z-50 right-0 top-full mt-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border-2 border-[#37F2D1]">
                          <div className="font-bold mb-2 text-[#37F2D1]">{displayLabel}</div>
                          <div className="space-y-1">
                            <div>Base Ability: {skillAbilityMap[skillName]} ({calculateModifier(selectedCharacter.attributes?.[skillAbilityKeys[skillName]] || 10)})</div>
                            {isProficient && <div className="text-white">Proficiency: +{selectedCharacter.proficiency_bonus || 2}</div>}
                            {hasExpertise && <div className="text-yellow-400">Expertise: +{selectedCharacter.proficiency_bonus || 2} (×2)</div>}
                            <div className="pt-2 border-t border-gray-700">Total Modifier: <span className="text-[#37F2D1] font-bold">{modifier}</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Brewery sheet-mod sections anchored at 'after_skills'. */}
              <SheetModSections
                sections={sheetMods.add_sections}
                position="after_skills"
                character={selectedCharacter}
                onChange={saveModData}
              />

              {/* Active training — only shown when the character
                  has an in-flight training row. Progress bar +
                  week count mirror the Guild Hall panel so the
                  player can see the same data from their sheet. */}
              {selectedCharacter.training_progress?.current_training && (() => {
                const tp = selectedCharacter.training_progress;
                const done = Number(tp.weeks_completed) || 0;
                const need = Number(tp.weeks_required)  || 1;
                const pct  = Math.min(100, Math.round((done / need) * 100));
                return (
                  <div className="bg-[#1E2430]/50 rounded-xl p-4 border border-[#37F2D1]/40 mt-4">
                    <h3 className="text-sm font-bold text-[#37F2D1] mb-2 uppercase tracking-wide">
                      Training: {tp.current_training}
                    </h3>
                    <div className="text-xs text-white/70 mb-2">
                      {done} / {need} weeks · {pct}%
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-[#37F2D1] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })()}

              {/* Tool Proficiencies */}
              {selectedCharacter.proficiencies?.tools && selectedCharacter.proficiencies.tools.length > 0 && (
                <div className="bg-[#1E2430]/50 rounded-xl p-4 border border-gray-700 mt-4">
                  <h3 className="text-sm font-bold text-[#FFC6AA] mb-3 uppercase">Tool Proficiencies</h3>
                  <div className="space-y-2">
                    {selectedCharacter.proficiencies.tools.map((tool, idx) => (
                      <div
                        key={idx}
                        className="relative cursor-help"
                        onMouseEnter={() => setHoveredItem(`tool-${idx}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <div className="bg-gradient-to-r from-[#2A3441] to-[#1E2430] rounded-lg p-2 border border-[#37F2D1] flex items-center gap-2">
                          <div className="w-3 h-3 bg-[#37F2D1] rounded-sm flex items-center justify-center flex-shrink-0">
                            <span className="text-[#1E2430] text-xs font-bold">✓</span>
                          </div>
                          <div className="text-white font-semibold text-sm">{tool}</div>
                        </div>
                        {hoveredItem === `tool-${idx}` && (
                          <div className="absolute z-50 right-0 top-full mt-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border-2 border-[#37F2D1]">
                            <div className="font-bold mb-1 text-[#37F2D1]">{tool}</div>
                            <div>You can add your proficiency bonus (+{selectedCharacter.proficiency_bonus || 2}) when making ability checks using this tool.</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brewery sheet-mod sections anchored at
                  'after_proficiencies' — renders below the tool
                  proficiency grid. */}
              <SheetModSections
                sections={sheetMods.add_sections}
                position="after_proficiencies"
                character={selectedCharacter}
                onChange={saveModData}
              />

              {/* Brewery proficiency categories added by sheet
                  mods (Vehicles / Firearms / etc). Each renders
                  as a group with its items as read-only chips. */}
              {sheetMods.add_proficiency_categories.map((cat, ci) => (
                <div
                  key={(cat.name || "cat") + "-" + ci}
                  className="bg-[#1E2430]/50 rounded-xl p-4 border border-gray-700 mt-4"
                >
                  <h3 className="text-sm font-bold text-[#FFC6AA] mb-3 uppercase">
                    {cat.name || "Extra Proficiencies"}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(cat.items || []).map((item, ii) => (
                      <span
                        key={item + "-" + ii}
                        className="bg-[#2A3441] border border-[#37F2D1]/30 text-white text-xs font-semibold px-2 py-1 rounded"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {/* Brewery sheet-mod sections anchored at 'after_features'. */}
              <SheetModSections
                sections={sheetMods.add_sections}
                position="after_features"
                character={selectedCharacter}
                onChange={saveModData}
              />
            </div>
            );
          })()}

          {/* Spells Tab */}
          {activeTab === 'spells' && (
            <div className="space-y-4">
              {selectedCharacter.spells && Object.keys(selectedCharacter.spells).some(key => Array.isArray(selectedCharacter.spells[key]) && selectedCharacter.spells[key].length > 0) ? (
                <>
                  {/* Spellcasting Stats */}
                  <div className="bg-[#1E2430]/50 rounded-xl p-4 border border-gray-700">
                    <h3 className="text-sm font-bold text-[#FFC6AA] mb-3 uppercase">Spellcasting</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-[#2A3441] to-[#1E2430] rounded-lg p-3 text-center border border-[#37F2D1]/30">
                        <div className="text-xs text-gray-400 mb-1">SPELL ATTACK</div>
                        <div className="text-3xl font-bold text-[#37F2D1]">
                          {`+${(selectedCharacter.proficiency_bonus || 2) + getModifierValue(selectedCharacter.attributes?.cha || 10)}`}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-[#2A3441] to-[#1E2430] rounded-lg p-3 text-center border border-[#FF5722]/30">
                        <div className="text-xs text-gray-400 mb-1">SPELL SAVE DC</div>
                        <div className="text-3xl font-bold text-[#FF5722]">
                          {8 + (selectedCharacter.proficiency_bonus || 2) + getModifierValue(selectedCharacter.attributes?.cha || 10)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Spells by Level */}
                  <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {['cantrips', 'level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9'].map(levelKey => {
                      const spells = selectedCharacter.spells[levelKey];
                      if (!spells || spells.length === 0) return null;

                      const levelLabel = levelKey === 'cantrips' ? 'Cantrips' :
                                         levelKey === 'level1' ? '1st Level Spells' :
                                         levelKey === 'level2' ? '2nd Level Spells' :
                                         levelKey === 'level3' ? '3rd Level Spells' :
                                         `${levelKey.replace('level', '')}th Level Spells`;
                      
                      const borderColor = levelKey === 'cantrips' ? 'border-[#37F2D1]' : 'border-[#FF5722]';
                      const titleColor = levelKey === 'cantrips' ? 'text-[#37F2D1]' : 'text-[#FF5722]';

                      return (
                        <div key={levelKey} className="bg-[#1E2430]/50 rounded-xl p-4 border border-gray-700">
                          <h3 className="text-sm font-bold text-[#FFC6AA] mb-3 uppercase">{levelLabel}</h3>
                          <div className="space-y-2">
                            {spells.map((spell, idx) => {
                              const details = spellDetails[spell];
                              // Project the local spellDetails shape (camelCase
                              // legacy keys) into the snake_case shape the
                              // shared SpellHoverCard renders.
                              const tooltipSpell = details
                                ? {
                                    name: spell,
                                    level: levelKey === 'cantrips' ? 0 : Number(details.level) || Number(levelKey.replace('level','')) || 0,
                                    school: details.school,
                                    casting_time: details.castingTime,
                                    range: details.range,
                                    duration: details.duration,
                                    components: details.components,
                                    description: details.description,
                                  }
                                : { name: spell, level: levelKey === 'cantrips' ? 0 : Number(levelKey.replace('level','')) || 0 };
                              return (
                                <SpellHoverCard key={idx} spell={tooltipSpell}>
                                  <div
                                    className={`bg-gradient-to-r from-[#2A3441] to-[#1E2430] rounded-lg p-3 border border-gray-700 hover:${borderColor} transition-all cursor-help`}
                                  >
                                    <div className="flex items-center gap-3">
                                      {spellIcons[spell] && (
                                        <img
                                          src={spellIcons[spell]}
                                          alt={spell}
                                          className={`w-10 h-10 rounded-lg object-cover border-2 ${borderColor}/30`}
                                        />
                                      )}
                                      <div className="flex-1">
                                        <div className="font-bold text-white text-sm mb-1">{spell}</div>
                                        <div className="text-xs text-gray-400">
                                          {details ? `${details.school} • ${details.castingTime}` : levelLabel}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </SpellHoverCard>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <style>{`
                    .custom-scrollbar::-webkit-scrollbar {
                      width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                      background: rgba(30, 36, 48, 0.5);
                      border-radius: 3px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                      background: rgba(55, 242, 209, 0.2);
                      border-radius: 3px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                      background: rgba(55, 242, 209, 0.4);
                    }
                  `}</style>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">✨</div>
                  <p>No spells prepared</p>
                </div>
              )}
            </div>
          )}

          {/* Background Tab */}
          {activeTab === 'background' && (
            <div className="space-y-6">
              {/* Background */}
              <div>
                <h3 className="text-2xl font-bold text-[#FFC6AA] mb-3 uppercase">
                  {selectedCharacter.background || "Unknown"}
                </h3>
                <div className="space-y-2">
                  <div
                    className="relative cursor-help"
                    onMouseEnter={() => setHoveredItem('alignment')}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <span className="text-[#37F2D1] font-semibold">Alignment:</span>
                    <span className="text-white ml-2">{selectedCharacter.alignment}</span>
                    {hoveredItem === 'alignment' && alignmentDescriptions[selectedCharacter.alignment] && (
                      <div className="absolute z-50 left-0 top-full mt-2 bg-[#1E2430] text-white p-4 rounded-lg text-sm w-96 shadow-xl border-2 border-[#FF5722]">
                        <div className="font-bold mb-2 text-[#FF5722]">{selectedCharacter.alignment}</div>
                        <div className="text-white">{alignmentDescriptions[selectedCharacter.alignment]}</div>
                      </div>
                    )}
                  </div>
                  {bgInfo && (
                    <div
                      className="relative cursor-help"
                      onMouseEnter={() => setHoveredItem('bgfeature')}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <span className="text-[#37F2D1] font-semibold">Feature:</span>
                      <span className="text-white ml-2">{bgInfo.feature}</span>
                      {hoveredItem === 'bgfeature' && (
                        <div className="absolute z-50 left-0 top-full mt-2 bg-[#1E2430] text-white p-4 rounded-lg text-sm w-96 shadow-xl border-2 border-[#FF5722]">
                          <div className="font-bold mb-2 text-[#FF5722]">{bgInfo.feature}</div>
                          <div className="text-white">{bgInfo.description}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Race */}
              <div>
                <h3 className="text-2xl font-bold text-[#FFC6AA] mb-3 uppercase">Race</h3>
                <div className="space-y-2">
                  {classInfo && (
                    <>
                      <div
                        className="relative cursor-help"
                        onMouseEnter={() => setHoveredItem('creaturetype')}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <span className="text-[#37F2D1] font-semibold">Creature Type:</span>
                        <span className="text-white ml-2">{classInfo.creatureType}</span>
                        {hoveredItem === 'creaturetype' && (
                          <div className="absolute z-50 left-0 top-full mt-2 bg-[#1E2430] text-white p-4 rounded-lg text-sm w-96 shadow-xl border-2 border-[#FF5722]">
                            <div className="font-bold mb-2 text-[#FF5722]">Humanoid</div>
                            <div className="text-white">A general term for the enormous variety of sentient species that populate the D&D world, including humans, elves, dwarves, and many others.</div>
                          </div>
                        )}
                      </div>
                      <div
                        className="relative cursor-help"
                        onMouseEnter={() => setHoveredItem('age')}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <span className="text-[#37F2D1] font-semibold">Age:</span>
                        <span className="text-white ml-2">{selectedCharacter.appearance?.age || 'Unknown'} years old</span>
                      </div>
                      <div
                        className="relative cursor-help"
                        onMouseEnter={() => setHoveredItem('size')}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <span className="text-[#37F2D1] font-semibold">Size:</span>
                        <span className="text-white ml-2">{classInfo.size}</span>
                        {hoveredItem === 'size' && (
                          <div className="absolute z-50 left-0 top-full mt-2 bg-[#1E2430] text-white p-4 rounded-lg text-sm w-96 shadow-xl border-2 border-[#FF5722]">
                            <div className="font-bold mb-2 text-[#FF5722]">{classInfo.size}</div>
                            <div className="text-white">Creatures of different sizes occupy different amounts of space. Medium creatures occupy a 5-foot-by-5-foot space. Small creatures also occupy 5 feet but can move through the space of larger creatures.</div>
                          </div>
                        )}
                      </div>
                      {classInfo.features.map((feature, idx) => (
                        <div
                          key={idx}
                          className="relative cursor-help"
                          onMouseEnter={() => setHoveredItem(`racefeature-${idx}`)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <span className="text-[#37F2D1] font-semibold">{feature}</span>
                          {hoveredItem === `racefeature-${idx}` && featureDescriptions[feature] && (
                            <div className="absolute z-50 left-0 top-full mt-2 bg-[#1E2430] text-white p-4 rounded-lg text-sm w-96 shadow-xl border-2 border-[#FF5722] max-h-64 overflow-y-auto">
                              <div className="font-bold mb-2 text-[#FF5722]">{feature}</div>
                              <div className="text-white">{featureDescriptions[feature]}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Class */}
              <div>
                <h3 className="text-2xl font-bold text-[#FFC6AA] mb-3 uppercase">Class</h3>
                <div className="space-y-2">
                  {selectedCharacter.feature_choices && Object.entries(selectedCharacter.feature_choices).map(([key, value], idx) => {
                    const description = subclassDescriptions[value] || pactBoonDescriptions[value] || fightingStyleDescriptions[value];

                    return (
                      <div
                        key={idx}
                        className="relative cursor-help"
                        onMouseEnter={() => setHoveredItem(`classchoice-${idx}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <span className="text-[#37F2D1] font-semibold">{value}</span>
                        {hoveredItem === `classchoice-${idx}` && description && (
                          <div className="absolute z-50 left-0 top-full mt-2 bg-[#1E2430] text-white p-4 rounded-lg text-sm w-96 shadow-xl border-2 border-[#FF5722] max-h-64 overflow-y-auto">
                            <div className="font-bold mb-2 text-[#FF5722]">{value}</div>
                            <div className="text-white">{description}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {classFeatureNames[selectedCharacter.class]?.map((feature, idx) => (
                    <div
                      key={idx}
                      className="relative cursor-help"
                      onMouseEnter={() => setHoveredItem(`classfeature-${idx}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <span className="text-[#37F2D1] font-semibold">{feature}</span>
                      {hoveredItem === `classfeature-${idx}` && classFeatureDescriptions[feature] && (
                        <div className="absolute z-50 left-0 top-full mt-2 bg-[#1E2430] text-white p-4 rounded-lg text-sm w-96 shadow-xl border-2 border-[#FF5722] max-h-64 overflow-y-auto">
                          <div className="font-bold mb-2 text-[#FF5722]">{feature}</div>
                          <div className="text-white">{classFeatureDescriptions[feature]}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Eldritch Invocations */}
              {selectedCharacter.class === "Warlock" && selectedCharacter.feature_choices && (
                <div>
                  <h3 className="text-2xl font-bold text-[#FFC6AA] mb-3 uppercase">Eldritch Invocations</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedCharacter.feature_choices)
                      .filter(([key]) => key.includes('Eldritch Invocation'))
                      .map(([key, invocation], idx) => (
                        <div
                          key={idx}
                          className="relative cursor-help"
                          onMouseEnter={() => setHoveredItem(`invocation-${idx}`)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <span className="text-[#37F2D1] font-semibold">{invocation}</span>
                          {hoveredItem === `invocation-${idx}` && invocationDescriptions[invocation] && (
                            <div className="absolute z-50 left-0 top-full mt-2 bg-[#1E2430] text-white p-4 rounded-lg text-sm w-96 shadow-xl border-2 border-[#FF5722] max-h-64 overflow-y-auto">
                              <div className="font-bold mb-2 text-[#FF5722]">{invocation}</div>
                              <div className="text-white">{invocationDescriptions[invocation]}</div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              <div>
                <h3 className="text-2xl font-bold text-[#FFC6AA] mb-3 uppercase">Languages</h3>
                <div className="space-y-2">
                  {(selectedCharacter.languages || []).map((lang, idx) => (
                    <div
                      key={idx}
                      className="relative cursor-help"
                      onMouseEnter={() => setHoveredItem(`language-${idx}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <span className="text-[#37F2D1] font-semibold">{lang}</span>
                      {hoveredItem === `language-${idx}` && languageDescriptions[lang] && (
                        <div className="absolute z-50 left-0 top-full mt-2 bg-[#1E2430] text-white p-4 rounded-lg text-sm w-96 shadow-xl border-2 border-[#FF5722]">
                          <div className="font-bold mb-2 text-[#FF5722]">{lang}</div>
                          <div className="text-white">{languageDescriptions[lang]}</div>
                        </div>
                      )}
                    </div>
                  ))}
                  {(!selectedCharacter.languages || selectedCharacter.languages.length === 0) && (
                    <span className="text-gray-400">No languages selected</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[#FFC6AA] font-semibold text-lg mb-3 flex items-center gap-2">
                  <Swords className="w-5 h-5" />
                  Equipment & Gear
                </h3>
                {selectedCharacter.inventory && selectedCharacter.inventory.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCharacter.inventory.map((item, idx) => (
                      <div key={idx} className="bg-gradient-to-r from-[#2A3441] to-[#1E2430] rounded-lg p-3 border border-gray-700 hover:border-[#37F2D1] transition-all">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-white font-semibold">{safeText(item.name)}</p>
                            {item.description && (
                              <p className="text-gray-400 text-sm mt-1">{safeText(item.description)}</p>
                            )}
                          </div>
                          <div className="text-right ml-3">
                            {item.quantity > 1 && (
                              <p className="text-[#37F2D1] font-bold text-lg">×{safeText(item.quantity)}</p>
                            )}
                            {item.weight && (
                              <p className="text-gray-500 text-xs">{safeText(item.weight)} lb</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-2">🎒</div>
                    <p>No items in inventory</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-[#FFC6AA] font-semibold text-lg mb-3">Currency</h3>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: 'cp', name: 'Copper', color: 'text-orange-700' },
                    { key: 'sp', name: 'Silver', color: 'text-gray-400' },
                    { key: 'ep', name: 'Electrum', color: 'text-emerald-400' },
                    { key: 'gp', name: 'Gold', color: 'text-yellow-400' },
                    { key: 'pp', name: 'Platinum', color: 'text-cyan-300' }
                  ].map(({ key, name, color }) => (
                    <div
                      key={key}
                      className="bg-gradient-to-br from-[#2A3441] to-[#1E2430] rounded-lg p-3 text-center border border-gray-700 cursor-help relative"
                      onMouseEnter={() => setHoveredItem(`currency-${key}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <div className={`text-2xl font-bold ${color}`}>
                        {selectedCharacter.currency?.[key] || 0}
                      </div>
                      <div className="text-xs text-gray-500 uppercase mt-1">{key}</div>
                      {hoveredItem === `currency-${key}` && (
                        <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 bg-[#1E2430] text-white p-2 rounded-lg text-xs whitespace-nowrap shadow-xl border-2 border-gray-600">
                          {name} Pieces
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <CreateCharacterDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#2A3441] border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              This will permanently delete <span className="font-bold text-[#FF5722]">{characterToDelete?.name}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-600 text-white hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCharacterMutation.mutate(characterToDelete?.id)}
              className="bg-[#FF5722] hover:bg-[#FF6B3D] text-white"
            >
              Delete Character
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}