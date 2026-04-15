import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ChevronLeft, ChevronRight, Settings, GripVertical, X, EyeOff, Eye, 
  Package, Search, Dices, AlertCircle, Heart, Music, Circle, Triangle, Crosshair, CircleDollarSign
} from "lucide-react";
import LootBox from "@/components/player/LootBox";
import MoneyCounter from "@/components/shared/MoneyCounter";
import { spellIcons, spellDetails as hardcodedSpellDetails, getCharacterSpellSlots, fetchAllSpells } from "@/components/dnd5e/spellData";
import { allItemsWithEnchanted, itemIcons } from "@/components/dnd5e/itemData";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import CampaignLog from "@/components/gm/CampaignLog";
import { canEquipToSlot } from "@/components/gm/equipmentRules";
import CombatActionBar from "@/components/combat/CombatActionBar";
import CombatDiceWindow from "@/components/combat/CombatDiceWindow";
import { useTurnContext } from "@/components/combat/useTurnContext";
import { hpBarColor } from "@/components/combat/hpColor";
import {
  classFeatureDescriptions,
  languageDescriptions,
  invocationDescriptions,
  alignmentDescriptions,
  subclassDescriptions,
  pactBoonDescriptions,
  fightingStyleDescriptions
} from "@/components/dnd5e/featureDescriptions";

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

const basicActionIcons = [
  { name: "Non-Lethal", url: "https://static.wixstatic.com/media/5cdfd8_2717bd75c7c8435197830d28dc91d0c4~mv2.png", toggleable: true },
  { name: "Dash", url: "https://static.wixstatic.com/media/5cdfd8_02e46386022f4a57bb7537e0459427ea~mv2.png" },
  { name: "Help", url: "https://static.wixstatic.com/media/5cdfd8_b6c6460902d246a6bb2f34c0d2a84c71~mv2.png" },
  { name: "Grapple", url: "https://static.wixstatic.com/media/5cdfd8_1a20fa07c6a74ad8a2c678a716ec3138~mv2.png" },
  { name: "Throw", url: "https://static.wixstatic.com/media/5cdfd8_f124e759e4f449a1a9514e2ea8046586~mv2.png" },
  { name: "Hide", url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/1f6ba74ba_Hide.png" },
  { name: "Ready Action", url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/4f1e26b5f_ReadyAction.png" }
];

const CONDITIONS = {
  Blinded: { color: "#525252", label: "Blinded" },
  Charmed: { color: "#db2777", label: "Charmed" },
  Deafened: { color: "#475569", label: "Deafened" },
  Exhaustion: { color: "#dc2626", label: "Exhaustion" },
  Frightened: { color: "#9333ea", label: "Frightened" },
  Grappled: { color: "#ea580c", label: "Grappled" },
  Incapacitated: { color: "#991b1b", label: "Incapacitated" },
  Invisible: { color: "#94a3b8", label: "Invisible" },
  Paralyzed: { color: "#eab308", label: "Paralyzed" },
  Petrified: { color: "#57534e", label: "Petrified" },
  Poisoned: { color: "#16a34a", label: "Poisoned" },
  Prone: { color: "#78350f", label: "Prone" },
  Restrained: { color: "#c2410c", label: "Restrained" },
  Stunned: { color: "#d97706", label: "Stunned" },
  Unconscious: { color: "#000000", label: "Unconscious" },
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

function CampaignPlayerPanelContent() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [nonLethalActive, setNonLethalActive] = useState(false);
  const [quickSlots, setQuickSlots] = useState(Array(7).fill(null));
  const [equippedItems, setEquippedItems] = useState({});
  const [activeConditions, setActiveConditions] = useState({});
  const [draggedItem, setDraggedItem] = useState(null); // Lifted drag state

  // Combat State
  const [combatState, setCombatState] = useState({
    isOpen: false,
    step: 'idle', // idle, selecting_target, rolling
    action: null,
    target: null,
    isOffHand: false
  });

  // Action Resource State
  const [actionsState, setActionsState] = useState({ action: true, bonus: true, reaction: true, inspiration: false });

  // Track previous turn to reset actions
  const prevTurnIndexRef = React.useRef();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then(campaigns => campaigns[0]),
    enabled: !!campaignId,
    refetchInterval: (data) => (data?.combat_active || data?.combat_data?.stage === 'initiative') ? 1000 : 2000
  });

  // Refetch characters frequently during combat to show HP/Resource updates
  const { data: characters = [] } = useQuery({
    queryKey: ['campaignCharacters', campaignId],
    queryFn: () => base44.entities.Character.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    refetchInterval: (campaign?.combat_active) ? 1000 : false
  });

  const { data: allUserProfiles = [] } = useQuery({
    queryKey: ['allUserProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
    staleTime: 60000
  });

  // Characters query moved up to modify refetchInterval

  const myCharacter = React.useMemo(() => {
    return characters.find(c => c.created_by === user?.email && c.campaign_id === campaignId);
  }, [characters, user, campaignId]);

  const { data: guildHall } = useQuery({
    queryKey: ['guildHall', campaignId],
    queryFn: () => base44.entities.GuildHall.filter({ campaign_id: campaignId }).then(res => res[0]),
    enabled: !!campaignId
  });

  const { data: fullSpellsList } = useQuery({
    queryKey: ['dnd5e-spells'],
    queryFn: () => fetchAllSpells().then(data => data.spells),
    staleTime: 1000 * 60 * 60
  });

  // Sync combat state to DB for spectators
  const updateCombatEncounter = React.useCallback((newState) => {
    if (!campaign?.combat_active) return;
    base44.entities.Campaign.update(campaignId, {
      combat_data: {
        ...campaign.combat_data,
        active_encounter: newState
      }
    }).catch(err => console.error("Failed to sync encounter", err));
  }, [campaign?.combat_active, campaignId, campaign?.combat_data]);

  // When combat state changes, sync it
  useEffect(() => {
    if (combatState.isOpen && combatState.target) {
      updateCombatEncounter({
        attackerId: `player-${user?.id}`,
        targetId: combatState.target.uniqueId || combatState.target.id,
        attackerName: myCharacter?.name,
        targetName: combatState.target.name,
        attackerAvatar: myCharacter?.profile_avatar_url || myCharacter?.avatar_url || myCharacter?.image_url,
        targetAvatar: combatState.target?.avatar_url || combatState.target?.image_url || combatState.target?.profile_avatar_url || combatState.target?.avatar,
        action: combatState.action,
        phase: 'ready',
        timestamp: Date.now()
      });
    } else if (!combatState.isOpen && combatState.step === 'idle') {
      if (campaign?.combat_data?.active_encounter?.attackerId === `player-${user?.id}`) {
        updateCombatEncounter(null);
      }
    }
  }, [combatState.isOpen, combatState.target, myCharacter]);

  // Redirect if session ends
  useEffect(() => {
    if (campaign && !campaign.is_session_active) {
      navigate(createPageUrl("CampaignPanel") + `?id=${campaignId}`);
    }
  }, [campaign, campaignId, navigate]);

  const players = React.useMemo(() => {
    if (!campaign?.player_ids) return [];
    const uniquePlayerIds = [...new Set(campaign.player_ids)];
    const playerMap = new Map();
    
    uniquePlayerIds.forEach(playerId => {
      const profile = allUserProfiles.find(u => u.user_id === playerId);
      if (profile && !playerMap.has(playerId)) {
        const character = characters.find(c => c.created_by === profile.email && c.campaign_id === campaignId);
        playerMap.set(playerId, { ...profile, character });
      }
    });
    
    return Array.from(playerMap.values());
  }, [campaign?.player_ids, allUserProfiles, characters, campaignId]);

  const currentUserProfile = React.useMemo(() => {
    return allUserProfiles.find(p => p.user_id === user?.id);
  }, [allUserProfiles, user?.id]);

  const { isActorsTurn } = useTurnContext({ 
    campaign, 
    actor: myCharacter ? { ...myCharacter, user_id: user?.id } : null 
  });

  // Reset actions on new turn
  useEffect(() => {
     const currentIndex = campaign?.combat_data?.currentTurnIndex;
     if (currentIndex !== undefined && currentIndex !== prevTurnIndexRef.current) {
        const { order } = campaign.combat_data;
        const currentTurnCombatant = order?.[currentIndex];
        if (currentTurnCombatant?.id === user?.id || currentTurnCombatant?.id === myCharacter?.id) {
           setActionsState({ action: true, bonus: true, reaction: true, inspiration: false });
        }
        prevTurnIndexRef.current = currentIndex;
     }
  }, [campaign?.combat_data?.currentTurnIndex, user?.id, myCharacter?.id]);

  // Initial equip state from character
  useEffect(() => {
    if (myCharacter && Object.keys(equippedItems).length === 0 && myCharacter.equipment) {
      setEquippedItems(myCharacter.equipment);
    }
  }, [myCharacter]);

  if (!campaign) {
    return <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white"><p className="text-gray-400">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #050816; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        @keyframes rotateBorder {
          0% { filter: hue-rotate(0deg) brightness(1.2); }
          100% { filter: hue-rotate(360deg) brightness(1.2); }
        }
      `}</style>

      <div className="relative w-full h-56 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: `url(${campaign.cover_image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200&h=400&fit=crop'})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#020617]" />
      </div>

      <div className="-mt-16 px-6 pb-10">
        <div className="grid grid-cols-[320px,minmax(0,1fr)] gap-6">
          <CharacterPanel 
          character={myCharacter} 
          user={user} 
          guildHall={guildHall}
          equippedItems={equippedItems}
          setEquippedItems={(newItems) => {
            setEquippedItems(newItems);
            // Persist equipment change to DB
            if (myCharacter) {
              base44.entities.Character.update(myCharacter.id, { equipment: newItems });
              queryClient.invalidateQueries(['campaignCharacters']);
            }
          }}
          inventory={myCharacter?.inventory || []}
          draggedItem={draggedItem}
          setDraggedItem={setDraggedItem}
          combatState={combatState}
          setCombatState={setCombatState}
          campaignData={campaign}
          onLootDrop={async (item, lootIndex) => {
              // 1. Add to character
              const newInventory = [...(myCharacter.inventory || []), item];
              await base44.entities.Character.update(myCharacter.id, { inventory: newInventory });
              
              // 2. Remove from loot
              if (campaign?.loot_data?.items) {
                const newLootItems = [...campaign.loot_data.items];
                newLootItems.splice(lootIndex, 1);
                await base44.entities.Campaign.update(campaignId, { 
                  loot_data: { ...campaign.loot_data, items: newLootItems } 
                });
                queryClient.invalidateQueries(['campaign', campaignId]);
                queryClient.invalidateQueries(['campaignCharacters']);
              }
            }}
          />

          <div className="space-y-4">
            {campaign.combat_active && campaign.combat_data && (
              campaign.combat_data.stage === 'initiative' || campaign.combat_data.stage === 'arranging' ? (
                // Players must not see the GM arranging the turn order.
                // During setup they get a waiting screen only.
                <div className="relative z-10 rounded-[32px] bg-[#050816]/90 border border-[#1a1f2e] px-6 py-10 mb-3 text-center shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full border-2 border-[#37F2D1]/50 border-t-[#37F2D1] animate-spin" />
                    <p className="text-[10px] uppercase tracking-[0.32em] text-[#37F2D1]/80 font-bold">
                      Preparing for Battle
                    </p>
                    <p className="text-white/80 text-sm max-w-xs">
                      The GM is setting up combat. Hold your breath — the turn order will appear in a moment.
                    </p>
                  </div>
                </div>
              ) : (
                <TurnOrderDisplay
                  order={campaign.combat_data.order || []}
                  currentTurnIndex={campaign.combat_data.currentTurnIndex || 0}
                  onSelectTarget={(target) => {
                    if (combatState.step === 'selecting_target') {
                      setCombatState(prev => ({ ...prev, target, step: 'rolling', isOpen: true }));
                    }
                  }}
                  selectionMode={combatState.step === 'selecting_target'}
                  characters={characters}
                  players={players}
                  hideInitiative={true}
                />
              )
            )}
            {/* End Turn Button for Players */}
            {isActorsTurn && campaign?.combat_active && !combatState.isOpen && campaign?.combat_data?.stage !== 'initiative' && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={async () => {
                    const currentOrder = [...campaign.combat_data.order];
                    if (currentOrder.length > 0) {
                      const [finished] = currentOrder.splice(0, 1);
                      currentOrder.push(finished);
                      
                      await base44.entities.Campaign.update(campaignId, {
                        combat_data: {
                          ...campaign.combat_data,
                          order: currentOrder,
                          currentTurnIndex: 0
                        }
                      });
                      queryClient.invalidateQueries(['campaign', campaignId]);
                    }
                  }}
                  className="bg-[#22c5f5] hover:bg-[#38bdf8] text-[#1E2430] px-6 py-2 rounded-full text-sm font-bold shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  END TURN
                </button>
              </div>
            )}

            {!combatState.isOpen && campaign?.combat_data?.stage !== 'initiative' && (
              <CombatActionBar 
                character={myCharacter ? { ...myCharacter, equipment: equippedItems } : null} 
                actionsState={actionsState}
                setActionsState={setActionsState}
                onActionClick={(action) => {
                  // Turn order enforcement
                  if (campaign?.combat_active && campaign?.combat_data) {
                    if (!isActorsTurn) {
                      alert("It's not your turn!");
                      return;
                    }
                  }

                  const requiresTarget = ['Attack', 'Help', 'Use Object'].includes(action.name) || action.type === 'spell';
                  const isOffHand = action.isOffHand || false;

                  if (requiresTarget) {
                    setCombatState({ isOpen: false, step: 'selecting_target', action, target: null, isOffHand });
                  } else {
                    setCombatState({ isOpen: true, step: 'rolling', action, target: null, isOffHand }); 
                  }
                }}
              />
            )}

            <div className="grid grid-cols-[minmax(0,1fr),minmax(0,1.1fr)] gap-4">
              <div className="flex flex-col gap-4 h-full">
                <PlayerStatBlock character={myCharacter} className="h-[540px]" />
                <div className="w-full">
                  <SectionCard title="Quick Slots">
                    <QuickSlots 
                      quickSlots={quickSlots} 
                      setQuickSlots={setQuickSlots}
                      inventory={myCharacter?.inventory || []}
                    />
                  </SectionCard>
                </div>
              </div>

              <div className="space-y-4">
                <SectionCard title="Adventurers">
                  <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
                    {players.map((player) => {
                      const char = player.character;
                      const color1 = player.profile_color_1 || "#FF5722";
                      const color2 = player.profile_color_2 || "#37F2D1";
                      const currentHp = char?.hit_points?.current || 0;
                      const maxHp = char?.hit_points?.max || 0;
                      const ac = char?.armor_class || 10;

                      return (
                        <div
                          key={player.user_id}
                          onClick={() => {
                            if (combatState.step === 'selecting_target') {
                              setCombatState(prev => ({ ...prev, target: { ...char, id: player.user_id, type: 'player' }, step: 'rolling', isOpen: true }));
                            }
                          }}
                          className={`min-w-[160px] max-w-[160px] rounded-3xl bg-[#050816] overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.7)] border-2 relative group transition-all duration-300 ${
                            combatState.step === 'selecting_target' ? 'cursor-pointer hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] z-50' : ''
                          }`}
                          style={{
                            borderImage: `linear-gradient(135deg, ${color1}, ${color2}) 1`
                          }}
                        >
                          {combatState.step === 'selecting_target' && (
                            <div className="absolute inset-0 bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold text-white tracking-wider z-20">
                              SELECT
                            </div>
                          )}
                          <div 
                            className="h-24 bg-cover bg-center relative"
                            style={{ 
                              backgroundImage: char?.profile_avatar_url ? `url(${char.profile_avatar_url})` : 'none',
                              backgroundColor: '#1a1f2e'
                            }}
                          >
                            {!char?.profile_avatar_url && (
                              <div className="absolute inset-0 flex items-center justify-center text-3xl text-gray-600">?</div>
                            )}
                          </div>
                          <div className="px-3 py-2 text-[11px] space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold truncate">{char?.name || player.username}</span>
                              <span className="text-[10px] text-slate-400">AC {ac}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              {char?.race || '?'} • {char?.class || '?'}
                            </p>
                            <div className="flex flex-col gap-1 pt-1 w-full">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400">{currentHp}/{maxHp} HP</span>
                              </div>
                              <div className="h-1.5 w-full bg-[#111827] rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-red-500 to-green-500" 
                                  style={{ width: `${Math.min((currentHp / maxHp) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>

                <SectionCard title="Companions">
                  <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
                    {players.filter(p => p.character?.companion_name).map((player) => {
                      const char = player.character;
                      return (
                        <div key={`comp-${player.user_id}`} className="min-w-[120px] max-w-[120px] rounded-2xl bg-[#050816] overflow-hidden shadow border border-slate-700 relative">
                          <div 
                            className="h-16 bg-cover bg-center relative"
                            style={{ backgroundImage: char?.companion_image ? `url(${char.companion_image})` : 'none', backgroundColor: '#1a1f2e' }}
                          >
                            {!char?.companion_image && <div className="absolute inset-0 flex items-center justify-center text-2xl">🐾</div>}
                          </div>
                          <div className="px-2 py-1.5 text-[10px]">
                            <div className="font-semibold truncate text-white">{char?.companion_name}</div>
                            <p className="text-[9px] text-slate-500 truncate">{char?.name}'s companion</p>
                          </div>
                        </div>
                      );
                    })}
                    {players.filter(p => p.character?.companion_name).length === 0 && (
                      <div className="text-[10px] text-slate-600 italic py-2">No active companions</div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Loot">
                  <LootBox 
                    lootData={campaign.loot_data}
                    canTake={true}
                    onDragStart={(item, idx) => {
                      setDraggedItem({ item, sourceType: 'loot', sourceIndex: idx });
                    }}
                    onTakeItem={(item, idx) => {
                      // 1. Add to character
                      const newInventory = [...(myCharacter.inventory || []), item];
                      base44.entities.Character.update(myCharacter.id, { inventory: newInventory });
                      
                      // 2. Remove from loot
                      const newLootItems = [...campaign.loot_data.items];
                      newLootItems.splice(idx, 1);
                      base44.entities.Campaign.update(campaignId, { 
                        loot_data: { ...campaign.loot_data, items: newLootItems } 
                      });
                      queryClient.invalidateQueries(['campaign', campaignId]);
                      queryClient.invalidateQueries(['campaignCharacters']);
                    }}
                    onTakeCurrency={(currency) => {
                      // 1. Add to character
                      const settings = campaign.loot_data?.settings || {};
                      let amountToTake = { ...currency };
                      
                      if (settings.split_gold_evenly && players.length > 0) {
                        // Split math
                        amountToTake = {
                          cp: Math.floor(currency.cp / players.length),
                          sp: Math.floor(currency.sp / players.length),
                          ep: Math.floor(currency.ep / players.length),
                          gp: Math.floor(currency.gp / players.length),
                          pp: Math.floor(currency.pp / players.length),
                        };
                      }

                      const currentMoney = myCharacter.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
                      const newMoney = {
                        cp: currentMoney.cp + amountToTake.cp,
                        sp: currentMoney.sp + amountToTake.sp,
                        ep: currentMoney.ep + amountToTake.ep,
                        gp: currentMoney.gp + amountToTake.gp,
                        pp: currentMoney.pp + amountToTake.pp,
                      };
                      
                      base44.entities.Character.update(myCharacter.id, { currency: newMoney });

                      // 2. Remove from loot (subtract what was taken)
                      const newLootCurrency = {
                        cp: currency.cp - amountToTake.cp,
                        sp: currency.sp - amountToTake.sp,
                        ep: currency.ep - amountToTake.ep,
                        gp: currency.gp - amountToTake.gp,
                        pp: currency.pp - amountToTake.pp,
                      };
                      
                      base44.entities.Campaign.update(campaignId, { 
                        loot_data: { ...campaign.loot_data, currency: newLootCurrency } 
                      });
                      queryClient.invalidateQueries(['campaign', campaignId]);
                      queryClient.invalidateQueries(['campaignCharacters']);
                    }}
                  />
                </SectionCard>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-4">
              <SectionCard title="Campaign Log">
                <div className="h-64 relative">
                  <CampaignLog 
                    campaignId={campaignId} 
                    currentUser={user}
                    currentUserProfile={currentUserProfile}
                    campaign={campaign}
                    characters={characters}
                    allUserProfiles={allUserProfiles}
                  />
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Shared Components (Copied/Adapted from GMPanel) ---

function CharacterPanel({ character, user, guildHall, equippedItems, setEquippedItems, inventory, onLootDrop, draggedItem, setDraggedItem, combatState, setCombatState, campaignData }) {
  const queryClient = useQueryClient();
  const [showInventoryOrganizer, setShowInventoryOrganizer] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
  const [inventoryOrder, setInventoryOrder] = useState([]);

  useEffect(() => {
    if (inventory) {
      setInventoryOrder(inventory.map((item, idx) => ({ ...item, _idx: idx })));
    } else {
      setInventoryOrder([]);
    }
  }, [inventory]);

  const handleDragStart = (item, sourceType, sourceIndex) => {
    setDraggedItem({ item, sourceType, sourceIndex });
  };

  const handleDropOnInventory = () => {
    if (!draggedItem) return;
    
    // Handle drag from LootBox
    if (draggedItem.sourceType === 'loot') {
      onLootDrop && onLootDrop(draggedItem.item, draggedItem.sourceIndex);
      setDraggedItem(null);
      return;
    }
    
    // Existing drag logic (unequip)
    if (draggedItem.sourceType === 'slot') {
      const newEquipped = { ...equippedItems };
      delete newEquipped[draggedItem.sourceIndex];
      setEquippedItems(newEquipped);
      // Add back to inventory needs to be handled via API if we want to persist, 
      // but currently CharacterPanel just shows inventory from prop. 
      // Ideally we should call an onUnequip prop that updates the DB.
      // For now let's assume the component prop update handles it if we had a callback, 
      // but wait, setEquippedItems is local state. 
      // We need to update the character entity to reflect unequipping if we want it to persist.
      // Since this part of the code wasn't requested to be changed, I'll leave it 
      // but ensure the drag from loot works.
    }
    
    setDraggedItem(null);
  };

  const handleDropOnSlot = (slotId) => {
    if (!draggedItem) return;
    if (!canEquipToSlot(draggedItem.item, slotId)) {
      setDraggedItem(null);
      return;
    }
    const newEquipped = { ...equippedItems };
    newEquipped[slotId] = draggedItem.item;
    setEquippedItems(newEquipped);
    setDraggedItem(null);
  };

  const unequipItem = (slotId) => {
    const newEquipped = { ...equippedItems };
    delete newEquipped[slotId];
    setEquippedItems(newEquipped);
  };

  const equipmentSlots = {
    left: [
      { id: 'head', label: 'Head Gear' },
      { id: 'armor', label: 'Armor' },
      { id: 'gauntlets', label: 'Gauntlets' },
      { id: 'belt', label: 'Belt' },
      { id: 'boots', label: 'Boots' }
    ],
    right: [
      { id: 'cloak', label: 'Cloak' },
      { id: 'necklace', label: 'Necklace' },
      { id: 'ring1', label: 'Ring 1' },
      { id: 'ring2', label: 'Ring 2' },
      { id: 'implement', label: 'Implement' }
    ],
    bottom: [
      { id: 'weapon1', label: 'Weapon 1' },
      { id: 'weapon2', label: 'Weapon 2' },
      { id: 'ranged', label: 'Ranged' }
    ]
  };

  const getInventorySlots = () => {
    let slots = 20;
    if (!inventory) return slots;
    const inventoryNames = inventory.map(item => item.name?.toLowerCase() || '');
    if (inventoryNames.some(name => name.includes('backpack'))) slots = 40;
    if (inventoryNames.some(name => name.includes('pouch'))) slots = Math.min(slots + 5, 45);
    if (inventoryNames.some(name => name.includes('bag of holding'))) slots = 50;
    return slots;
  };
  const inventorySlots = getInventorySlots();

  return (
    <div className="relative z-10 rounded-[32px] bg-[#050816]/95 px-6 pt-6 pb-8 shadow-[0_24px_60px_rgba(0,0,0,0.8)] flex flex-col items-center gap-6">
      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
        <div 
          className="w-full h-full bg-cover bg-center" 
          style={{ 
            backgroundImage: character 
              ? `url(${character.image_url || character.avatar_url || character.profile_avatar_url || '/images/karliah-avatar.jpg'})` 
              : 'none',
            backgroundColor: '#1a1f2e'
          }}
        >
          {!character && (
            <div className="w-full h-full flex items-center justify-center text-5xl text-gray-600">?</div>
          )}
        </div>
      </div>

      {character ? (
        <>
          <div className="text-center space-y-1">
            <p className="text-[11px] tracking-[0.24em] uppercase text-amber-300">
              Level {character.level || '?'} • {character.class || 'Character'}
            </p>
            <p className="text-sm text-slate-300">{character.name}</p>
          </div>

          <button className="w-full flex items-center justify-center gap-2 bg-[#FF5722] hover:bg-[#FF6B3D] text-white rounded-lg py-3 text-sm font-bold transition-colors shadow-lg">
            <Dices className="w-5 h-5" />
            ROLL FOR INITIATIVE
          </button>

          <div className="w-full relative flex gap-3 justify-center mb-2">
            <img 
              src={getSilhouetteImage(character)} 
              alt="" 
              className="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none"
            />
            {/* Target Selection Overlay */}
            {combatState.step === 'selecting_target' && (
              <div className="fixed inset-0 z-[60] cursor-crosshair flex flex-col items-center justify-center pointer-events-none">
                <div className="bg-black/70 text-white px-6 py-3 rounded-full font-bold text-xl animate-pulse flex items-center gap-3 backdrop-blur-md pointer-events-auto">
                  <Crosshair className="w-6 h-6 text-red-500" />
                  SELECT A TARGET
                  <button 
                    onClick={() => setCombatState({ step: 'idle', isOpen: false, action: null, target: null })}
                    className="ml-4 bg-white/20 hover:bg-white/30 p-1 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Active Encounter Dice Window (Spectator or Actor) */}
            <CombatDiceWindow
              // Open if local state is open OR if there is ANY active encounter (Global Spectator)
              isOpen={
                combatState.isOpen || 
                campaignData?.combat_data?.stage === 'initiative' ||
                (!!campaignData?.combat_data?.active_encounter && !combatState.isOpen)
              }
              onClose={() => setCombatState({ step: 'idle', isOpen: false, action: null, target: null, isOffHand: false })}
              actor={
                // If spectator (not our local combat state), actor is from DB.
                (!combatState.isOpen && campaignData?.combat_data?.active_encounter)
                  ? { 
                      name: campaignData.combat_data.active_encounter.attackerName, 
                      avatar_url: campaignData.combat_data.active_encounter.attackerAvatar,
                      id: campaignData.combat_data.active_encounter.attackerId
                    }
                  : character
              }
              target={
                // If spectator, target is from DB.
                (!combatState.isOpen && campaignData?.combat_data?.active_encounter)
                  ? {
                      name: campaignData.combat_data.active_encounter.targetName,
                      id: campaignData.combat_data.active_encounter.targetId,
                      avatar_url: campaignData.combat_data.active_encounter.targetAvatar
                    }
                  : combatState.target
              }
              initialAction={
                (!combatState.isOpen && campaignData?.combat_data?.active_encounter)
                  ? campaignData.combat_data.active_encounter.action
                  : combatState.action
              }
              allCombatants={campaignData?.combat_data?.order || []} 
              mode={campaignData?.combat_data?.stage === 'initiative' ? 'initiative' : 'combat'}
              campaignId={campaignData?.id}
              isOffHand={combatState.isOffHand}
              
              // Spectator Props: We are a spectator if we are not the one actively rolling in local state
              isSpectator={!combatState.isOpen && !!campaignData?.combat_data?.active_encounter}
              spectatorData={campaignData?.combat_data?.active_encounter}

              onSwitchTarget={() => {
                if (!campaignData?.combat_data?.active_encounter) {
                   setCombatState(prev => ({ ...prev, isOpen: false, step: 'selecting_target' }));
                }
              }}
              onActionComplete={() => {
                 if (combatState.isOffHand) {
                    setActionsState(prev => ({ ...prev, bonus: false }));
                 } else {
                    setActionsState(prev => ({ ...prev, action: false }));
                 }
              }}
              onRoll={async (data) => {
                // If we are the actor (not spectator), handle rolls & sync
                if (campaignData?.combat_data?.active_encounter?.targetId !== `player-${user?.id}`) {
                   // Sync our rolls to DB
                   if (campaignData?.combat_data?.active_encounter) {
                      const currentEncounter = campaignData.combat_data.active_encounter;
                      let updates = {};
                      
                      if (data.type === 'attack_result') {
                         updates = { phase: 'attack_result', attackRoll: data.roll };
                      } else if (data.type === 'damage') {
                         updates = { phase: 'damage_result', damageRoll: { total: data.value, ...data.detail } };
                      } else if (data.type === 'rolling_attack') {
                         updates = { phase: 'rolling_attack' };
                      } else if (data.type === 'rolling_damage') {
                         updates = { phase: 'rolling_damage' };
                      }

                      if (Object.keys(updates).length > 0) {
                        updateCombatEncounter({ ...currentEncounter, ...updates });
                      }
                   }
                }

                if (data.type === 'initiative') {
                  const currentOrder = campaignData?.combat_data?.order || [];
                  const myIndex = currentOrder.findIndex(c => c.id === `player-${user?.id}`);
                  if (myIndex !== -1) {
                    const newOrder = [...currentOrder];
                    newOrder[myIndex] = {
                      ...newOrder[myIndex],
                      initiative: data.value,
                      initiative_rolled: true
                    };
                    
                    await base44.entities.Campaign.update(campaignData.id, {
                      combat_data: {
                        ...campaignData.combat_data,
                        order: newOrder
                      }
                    });
                    queryClient.invalidateQueries(['campaign', campaignData.id]);
                  }
                }

                // Healing rewrites to a negative-value damage event so
                // the HP write-through below handles both uniformly.
                if (data.type === 'heal') {
                  data = {
                    ...data,
                    type: 'damage',
                    value: -Math.abs(data.value || 0),
                  };
                }

                if (data.type === 'condition_applied' && data.condition) {
                  // Players don't get to tag conditions themselves —
                  // the GM sees the toast on their side. Skip here.
                }

                if (data.type === 'damage') {
                  // Apply damage (Characters only - Monsters handled by GM via listener)
                  const targetId = data.targetId || (campaignData?.combat_data?.active_encounter?.targetId);
                  const damage = data.value;
                  
                  if (targetId && targetId.startsWith('player-')) {
                    const userId = targetId.replace('player-', '');
                    const char = characters.find(c => {
                      const player = players.find(p => p.user_id === userId);
                      return player && c.created_by === player.email;
                    });
                    
                    if (char) {
                      const maxHp = char.hit_points?.max || 0;
                      const currentHp = char.hit_points?.current ?? maxHp;
                      // Cap on both ends so heals don't exceed max and
                      // damage doesn't go below zero.
                      const newCurrent = Math.max(0, Math.min(maxHp, currentHp - damage));
                      base44.entities.Character.update(char.id, {
                        hit_points: { ...char.hit_points, current: newCurrent }
                      });
                      queryClient.invalidateQueries(['campaignCharacters']);
                    }
                  }
                }
              }}
              onEndTurn={async () => {
                if (campaignData?.combat_active && campaignData?.combat_data) {
                  const currentOrder = [...campaignData.combat_data.order];
                  if (currentOrder.length > 0) {
                    const [finished] = currentOrder.splice(0, 1);
                    currentOrder.push(finished);
                    
                    await base44.entities.Campaign.update(campaignData.id, {
                      combat_data: {
                        ...campaignData.combat_data,
                        order: currentOrder,
                        currentTurnIndex: 0
                      }
                    });
                    queryClient.invalidateQueries(['campaign', campaignData.id]);
                  }
                }
                setCombatState({ step: 'idle', isOpen: false, action: null, target: null });
              }}
            />

            <div className="flex flex-col gap-3 relative z-10">
              {equipmentSlots.left.map(slot => (
                <EquipmentSlot 
                  key={slot.id} 
                  slotId={slot.id}
                  label={slot.label} 
                  item={equippedItems[slot.id]} 
                  onDrop={() => handleDropOnSlot(slot.id)}
                  onDragStart={(item) => handleDragStart(item, 'slot', slot.id)}
                  onUnequip={() => unequipItem(slot.id)}
                  isValidTarget={draggedItem ? canEquipToSlot(draggedItem.item, slot.id) : undefined}
                />
              ))}
            </div>
            <div className="w-32 flex-shrink-0 relative z-10"></div>
            <div className="flex flex-col gap-3 relative z-10">
              {equipmentSlots.right.map(slot => (
                <EquipmentSlot 
                  key={slot.id} 
                  slotId={slot.id}
                  label={slot.label} 
                  item={equippedItems[slot.id]} 
                  onDrop={() => handleDropOnSlot(slot.id)}
                  onDragStart={(item) => handleDragStart(item, 'slot', slot.id)}
                  onUnequip={() => unequipItem(slot.id)}
                  isValidTarget={draggedItem ? canEquipToSlot(draggedItem.item, slot.id) : undefined}
                />
              ))}
            </div>
          </div>

          <div className="w-full flex gap-3 justify-center pt-2 border-t border-[#111827]">
            {equipmentSlots.bottom.map(slot => (
              <EquipmentSlot 
                key={slot.id} 
                slotId={slot.id}
                label={slot.label} 
                size="large" 
                item={equippedItems[slot.id]} 
                onDrop={() => handleDropOnSlot(slot.id)}
                onDragStart={(item) => handleDragStart(item, 'slot', slot.id)}
                onUnequip={() => unequipItem(slot.id)}
                isValidTarget={draggedItem ? canEquipToSlot(draggedItem.item, slot.id) : undefined}
              />
            ))}
          </div>

          <div className="w-full pt-3 border-t border-[#111827] mt-2">
            <div className="mb-3">
              <MoneyCounter 
                currency={character?.currency} 
                onChange={async (newCurrency) => {
                  await base44.entities.Character.update(character.id, { currency: newCurrency });
                  queryClient.invalidateQueries(['campaignCharacters']);
                }}
              />
            </div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-[10px] tracking-[0.2em] uppercase text-slate-400 hidden sm:inline">Inventory</span>
                <div className="w-24">
                  <EncumbranceBar inventory={inventory} currency={character?.currency} strength={character.attributes?.str || 10} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{inventorySlots} slots</span>
                <button onClick={() => setShowInventoryOrganizer(true)} className="w-5 h-5 rounded bg-[#111827] flex items-center justify-center flex-shrink-0">
                  <Settings className="w-3 h-3 text-[#37F2D1]" />
                </button>
              </div>
            </div>
            <div 
              className="max-h-[140px] overflow-y-auto custom-scrollbar pr-1"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropOnInventory}
            >
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: inventorySlots }).map((_, idx) => (
                  <InventorySlot 
                    key={idx} 
                    item={inventoryOrder[idx]} 
                    draggable={!!inventoryOrder[idx]}
                    onDragStart={() => handleDragStart(inventoryOrder[idx], 'inventory', idx)}
                  />
                ))}
              </div>
            </div>
            
            {guildHall?.deed_purchased && (
              <div className="mt-3 pt-3 border-t border-[#111827]">
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="w-full py-2 bg-[#37F2D1]/10 hover:bg-[#37F2D1]/20 border border-[#37F2D1]/30 text-[#37F2D1] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <CircleDollarSign className="w-3 h-3" />
                  Deposit to Guild Coffers
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-10 text-gray-500">No character found</div>
      )}

      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#050816] border border-[#111827] rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-yellow-500" />
              Guild Coffers Deposit
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {['pp', 'gp', 'ep', 'sp', 'cp'].map(type => (
                  <div key={type} className="flex flex-col items-center">
                    <span className={`text-[10px] uppercase mb-1 font-bold ${
                      type === 'gp' ? 'text-yellow-500' : 
                      type === 'sp' ? 'text-slate-400' : 
                      type === 'cp' ? 'text-orange-700' : 
                      type === 'pp' ? 'text-slate-200' : 'text-slate-500'
                    }`}>{type}</span>
                    <input
                      type="number"
                      value={depositAmount[type] || ''}
                      onChange={(e) => setDepositAmount({...depositAmount, [type]: Math.max(0, parseInt(e.target.value) || 0)})}
                      className="w-full bg-[#1a1f2e] border border-[#2A3441] rounded px-1 py-1 text-center text-xs text-white focus:border-[#37F2D1] outline-none"
                      placeholder="0"
                    />
                    <span className="text-[9px] text-slate-500 mt-1">
                      / {character.currency?.[type] || 0}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 py-2 bg-[#1a1f2e] hover:bg-[#2A3441] text-slate-300 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const currentCurrency = character.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
                    const coffers = typeof guildHall.coffers === 'object' ? guildHall.coffers : { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
                    
                    // Validate sufficient funds
                    for (const type of ['cp', 'sp', 'ep', 'gp', 'pp']) {
                      if ((depositAmount[type] || 0) > (currentCurrency[type] || 0)) {
                        alert(`Not enough ${type.toUpperCase()}!`);
                        return;
                      }
                    }

                    // Calculate new amounts
                    const newCharacterCurrency = { ...currentCurrency };
                    const newCoffers = { ...coffers };
                    let hasDeposit = false;

                    ['cp', 'sp', 'ep', 'gp', 'pp'].forEach(type => {
                      const amount = depositAmount[type] || 0;
                      if (amount > 0) hasDeposit = true;
                      newCharacterCurrency[type] = (newCharacterCurrency[type] || 0) - amount;
                      newCoffers[type] = (newCoffers[type] || 0) + amount;
                    });

                    if (!hasDeposit) return;

                    // Update character
                    await base44.entities.Character.update(character.id, {
                      currency: newCharacterCurrency
                    });

                    // Update guild hall
                    await base44.entities.GuildHall.update(guildHall.id, {
                      coffers: newCoffers
                    });

                    queryClient.invalidateQueries(['campaignCharacters']);
                    queryClient.invalidateQueries(['guildHall']);
                    setShowDepositModal(false);
                    setDepositAmount({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
                  }}
                  className="flex-1 py-2 bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] rounded-lg text-xs font-bold"
                >
                  Confirm Deposit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





function EquipmentSlot({ label, size = 'normal', item, onDrop, onDragStart, onUnequip, isValidTarget }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const slotSize = size === 'large' ? 'w-16 h-16' : 'w-14 h-14';

  const borderColor = isDragOver && isValidTarget ? 'border-[#37F2D1] bg-[#37F2D1]/20' :
                      isDragOver && !isValidTarget ? 'border-red-500 bg-red-500/20' :
                      isValidTarget ? 'border-[#37F2D1] border-dashed bg-[#37F2D1]/5' :
                      item ? 'border-[#37F2D1]/50 bg-[#111827]' : 
                      'border-[#111827] hover:border-[#22c5f5]/50';

  const itemImage = item ? (
    item.image_url || 
    itemIcons[item.name] || 
    itemIcons[Object.keys(itemIcons).find(k => k.toLowerCase() === item.name?.toLowerCase())] ||
    itemIcons[Object.keys(itemIcons).find(k => item.name?.toLowerCase().includes(k.toLowerCase()))]
  ) : null;

  return (
    <div className="relative">
      <div
        draggable={!!item}
        onDragStart={() => item && onDragStart && onDragStart(item)}
        onDragOver={(e) => {
          e.preventDefault();
          if (isValidTarget !== undefined) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          onDrop && onDrop();
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onDoubleClick={() => item && onUnequip && onUnequip()}
        className={`${slotSize} rounded-xl bg-[#0b1220] border-2 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.7)] flex items-center justify-center cursor-pointer overflow-hidden ${borderColor} ${isDragOver ? 'scale-105' : ''}`}
      >
        {item && itemImage ? (
          <img src={itemImage} alt={item.name} className="w-full h-full object-cover" />
        ) : item ? (
          <span className="text-[8px] text-center text-slate-300 px-1 line-clamp-2">{item.name}</span>
        ) : (
          <span className="text-[8px] text-center text-slate-600 px-1 leading-tight font-medium">{label}</span>
        )}
      </div>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1E2430] text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-50 shadow-xl border border-[#37F2D1]">
          {item ? `${label}: ${item.name} (double-click to unequip)` : label}
        </div>
      )}
    </div>
  );
}

function InventorySlot({ item, draggable, onDragStart }) {
  const imgSrc = item ? (item.image_url || itemIcons[item.name] || itemIcons[Object.keys(itemIcons).find(k => k.toLowerCase() === item.name?.toLowerCase())]) : null;
  
  return (
    <div 
      draggable={draggable}
      onDragStart={onDragStart}
      className={`w-11 h-11 rounded-lg bg-[#0b1220] border border-[#111827] shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center ${item ? 'bg-[#111827] cursor-grab' : ''}`}
      title={item ? `${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}\n${item.description || ''}` : ''}
    >
      {item && (
        imgSrc ? <img src={imgSrc} alt={item.name} className="w-8 h-8 rounded object-cover" /> : <span className="text-[8px] text-slate-400 text-center px-0.5 truncate">{item.name ? (item.name.length > 8 ? item.name.substring(0, 6) + '..' : item.name) : (item.quantity > 1 ? item.quantity : '•')}</span>
      )}
      {item && item.quantity > 1 && imgSrc && (
        <span className="absolute bottom-0.5 right-1 text-[8px] text-white font-bold drop-shadow-md">x{item.quantity}</span>
      )}
    </div>
  );
}

function EncumbranceBar({ inventory, currency, strength }) {
  const itemWeight = inventory.reduce((total, item) => total + ((item.weight || 0) * (item.quantity || 1)), 0);
  
  // 50 coins = 1 lb
  const totalCoins = (currency?.cp || 0) + (currency?.sp || 0) + (currency?.ep || 0) + (currency?.gp || 0) + (currency?.pp || 0);
  const coinWeight = totalCoins / 50;
  
  const currentWeight = Math.round((itemWeight + coinWeight) * 10) / 10;
  const maxWeight = strength * 15;
  const percentage = Math.min((currentWeight / maxWeight) * 100, 100);
  
  return (
    <div className="flex items-center gap-1 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-[#111827] overflow-hidden">
        <div 
          className={`h-full transition-all ${percentage >= 100 ? 'bg-red-500' : 'bg-[#37F2D1]'}`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
      <span className={`text-[8px] whitespace-nowrap ${percentage >= 100 ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
        {currentWeight}/{maxWeight}
      </span>
    </div>
  );
}

function SectionCard({ title, children, className }) {
  return (
    <div className={`rounded-[24px] bg-[#050816]/95 shadow-[0_18px_50px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col ${className}`}>
      <div className="px-5 pt-3 pb-2 border-b border-[#111827] flex-shrink-0">
        <span className="text-[11px] tracking-[0.22em] uppercase text-slate-300">{title}</span>
      </div>
      <div className="px-5 py-3 flex-1 overflow-hidden flex flex-col">{children}</div>
    </div>
  );
}

function PlayerStatBlock({ character, className }) {
  const [activeTab, setActiveTab] = useState('stats');
  const [hoveredItem, setHoveredItem] = useState(null);
  if (!character) return null;

  const getModifierValue = (score) => {
    return Math.floor((score - 10) / 2);
  };

  const calculateModifier = (score) => {
    const mod = getModifierValue(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const getSavingThrowModifier = (abilityKey) => {
    if (!character?.attributes) return "+0";
    const baseMod = getModifierValue(character.attributes[abilityKey]);
    const profBonus = character.proficiency_bonus || 2;

    const savingThrows = character.saving_throws || {};
    const isProficient = savingThrows[abilityKey];

    const totalMod = isProficient ? baseMod + profBonus : baseMod;
    return totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;
  };

  const getSkillModifier = (skillName) => {
    if (!character?.attributes) return "+0";
    
    const abilityKey = skillAbilityKeys[skillName];
    const baseMod = getModifierValue(character.attributes[abilityKey]);
    const profBonus = character.proficiency_bonus || 2;
    
    const skills = character.skills || {};
    const expertise = character.expertise || [];
    
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

  const classInfo = raceInfo[character.race];
  const bgInfo = backgroundInfo[character.background];

  return (
    <SectionCard title="Character" className={`${className} flex flex-col`}>
      <div className="flex flex-col h-full">
        <div className="flex gap-1 bg-[#0b1220] rounded-lg p-0.5 mb-3 flex-shrink-0">
          {['stats', 'skills', 'background'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-2 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                activeTab === tab 
                  ? 'bg-[#22c5f5] text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-[#111827]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {activeTab === 'stats' && (
            <div className="space-y-4">
              {/* Proficiency & Perception */}
              <div className="grid grid-cols-2 gap-2">
                <div 
                  className="bg-[#0b1220] p-2 rounded text-xs border border-yellow-400 flex flex-col items-center justify-center relative cursor-help"
                  onMouseEnter={() => setHoveredItem('proficiency')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <span className="text-slate-400 text-[9px] uppercase mb-1">Proficiency</span>
                  <span className="text-yellow-400 font-bold">+{character.proficiency_bonus || 2}</span>
                  {hoveredItem === 'proficiency' && (
                    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-48 shadow-xl border border-yellow-400">
                      {statDescriptions["Proficiency Bonus"]}
                    </div>
                  )}
                </div>
                <div 
                  className="bg-[#0b1220] p-2 rounded text-xs border border-[#111827] flex flex-col items-center justify-center relative cursor-help"
                  onMouseEnter={() => setHoveredItem('perception')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <span className="text-slate-400 text-[9px] uppercase mb-1">Passive Perc.</span>
                  <span className="text-white font-bold">{character.passive_perception || 10}</span>
                  {hoveredItem === 'perception' && (
                    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-48 shadow-xl border border-gray-600">
                      {statDescriptions["Passive Perception"]}
                    </div>
                  )}
                </div>
              </div>

              {/* Saving Throws */}
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Saving Throws</p>
                <div className="grid grid-cols-3 gap-2">
                  {character.attributes && Object.keys(character.attributes).map(key => {
                    const isProficient = character.saving_throws?.[key];
                    return (
                      <div 
                        key={key} 
                        className={`flex justify-between px-2 py-1.5 rounded text-xs border ${isProficient ? 'bg-[#1a1f2e] border-[#37F2D1]/30' : 'bg-[#0b1220] border-[#111827]'} relative cursor-help`}
                        onMouseEnter={() => setHoveredItem(`save-${key}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <span className={isProficient ? "text-white font-semibold" : "text-slate-400"}>{key.toUpperCase()}</span>
                        <span className={isProficient ? "text-[#37F2D1]" : "text-slate-500"}>{getSavingThrowModifier(key)}</span>
                        {hoveredItem === `save-${key}` && (
                          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1E2430] text-white p-2 rounded-lg text-xs w-40 shadow-xl border border-[#37F2D1]">
                            <div className="font-bold mb-1">{key.toUpperCase()} Save</div>
                            <div>Modifier: {getSavingThrowModifier(key)}</div>
                            {isProficient && <div className="text-[#37F2D1] mt-1">Proficient</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attribute Points */}
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Attribute Points</p>
                <div className="grid grid-cols-3 gap-2">
                  {character.attributes && Object.entries(character.attributes).map(([key, val]) => (
                    <div 
                      key={key} 
                      className="bg-[#0b1220] p-2 rounded text-xs border border-[#111827] text-center relative cursor-help"
                      onMouseEnter={() => setHoveredItem(`attr-${key}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <div className="text-[9px] text-slate-400 uppercase mb-1">{key}</div>
                      <div className="text-[#FF5722] font-bold text-lg">{calculateModifier(val)}</div>
                      <div className="text-[9px] text-slate-500">{val}</div>
                      {hoveredItem === `attr-${key}` && (
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1E2430] text-white p-2 rounded-lg text-xs w-32 shadow-xl border border-[#FF5722]">
                          <div className="font-bold">{key.toUpperCase()}</div>
                          <div>Score: {val}</div>
                          <div>Modifier: {calculateModifier(val)}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {allSkills.map((skillName) => {
                  const skills = character.skills || {};
                  const expertise = character.expertise || [];
                  const isProficient = skills[skillName];
                  const hasExpertise = expertise.includes(skillName);
                  const modifier = getSkillModifier(skillName);

                  return (
                    <div
                      key={skillName}
                      className={`rounded p-1.5 border flex items-center gap-2 relative cursor-help ${
                        hasExpertise || isProficient ? 'bg-[#1a1f2e] border-[#37F2D1]/30' : 'bg-[#0b1220] border-[#111827]'
                      }`}
                      onMouseEnter={() => setHoveredItem(`skill-${skillName}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {hasExpertise ? (
                          <span className="text-yellow-400 text-[10px]">★</span>
                        ) : isProficient ? (
                          <span className="text-[#37F2D1] text-[10px]">✓</span>
                        ) : (
                          <span className="w-3 inline-block" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-slate-300 truncate">{skillName}</div>
                        <div className="text-[9px] text-slate-500">{skillAbilityMap[skillName]}</div>
                      </div>
                      <div className={`text-xs font-bold ${hasExpertise || isProficient ? 'text-[#37F2D1]' : 'text-slate-500'}`}>
                        {modifier}
                      </div>
                      {hoveredItem === `skill-${skillName}` && (
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-48 shadow-xl border border-[#37F2D1]">
                          <div className="font-bold mb-1 text-[#37F2D1]">{skillName}</div>
                          <div>Ability: {skillAbilityMap[skillName]}</div>
                          {isProficient && <div>Proficiency: +{character.proficiency_bonus || 2}</div>}
                          {hasExpertise && <div className="text-yellow-400">Expertise (x2)</div>}
                          <div className="mt-1 pt-1 border-t border-gray-700">Total: {modifier}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {character.proficiencies?.tools && character.proficiencies.tools.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Tool Proficiencies</p>
                  <div className="flex flex-wrap gap-2">
                    {character.proficiencies.tools.map((tool, idx) => (
                      <div 
                        key={idx} 
                        className="relative cursor-help"
                        onMouseEnter={() => setHoveredItem(`tool-${idx}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <span className="text-[10px] bg-[#1a1f2e] text-slate-300 px-2 py-1 rounded border border-[#2A3441]">
                          {tool}
                        </span>
                        {hoveredItem === `tool-${idx}` && (
                          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1E2430] text-white p-2 rounded-lg text-xs w-40 shadow-xl border border-[#2A3441]">
                            <div className="font-bold mb-1">Tool Proficiency</div>
                            <div>{tool}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'background' && (
            <div className="space-y-4">
              {/* Background Info */}
              <div>
                <h3 className="text-sm font-bold text-[#FFC6AA] mb-2 uppercase">{character.background || "Unknown"}</h3>
                <div className="space-y-2 text-[11px]">
                  <div 
                    className="flex justify-between border-b border-gray-800 pb-1 relative cursor-help"
                    onMouseEnter={() => setHoveredItem('alignment')}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <span className="text-slate-400">Alignment</span>
                    <span className="text-white">{character.alignment}</span>
                    {hoveredItem === 'alignment' && alignmentDescriptions[character.alignment] && (
                      <div className="absolute z-50 bottom-full right-0 mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border border-[#FF5722]">
                        <div className="font-bold mb-1 text-[#FF5722]">{character.alignment}</div>
                        <div>{alignmentDescriptions[character.alignment]}</div>
                      </div>
                    )}
                  </div>
                  {bgInfo && (
                    <div 
                      className="relative cursor-help"
                      onMouseEnter={() => setHoveredItem('bgFeature')}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <span className="text-[#37F2D1] font-semibold block mb-1">Feature: {bgInfo.feature}</span>
                      <p className="text-slate-400 leading-relaxed">{bgInfo.description}</p>
                      {hoveredItem === 'bgFeature' && (
                        <div className="absolute z-50 bottom-full left-0 mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border border-[#37F2D1]">
                          <div className="font-bold mb-1">{bgInfo.feature}</div>
                          <div>Background Feature</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Race Info */}
              <div>
                <h3 className="text-sm font-bold text-[#FFC6AA] mb-2 uppercase">{character.race}</h3>
                {classInfo && (
                  <div className="space-y-2 text-[11px]">
                    <div className="flex gap-2">
                      <div 
                        className="relative cursor-help"
                        onMouseEnter={() => setHoveredItem('size')}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <span className="bg-[#1a1f2e] px-2 py-0.5 rounded text-slate-300">{classInfo.size}</span>
                        {hoveredItem === 'size' && (
                          <div className="absolute z-50 bottom-full left-0 mb-2 bg-[#1E2430] text-white p-2 rounded-lg text-xs w-32 shadow-xl border border-gray-600">
                            Creature Size: {classInfo.size}
                          </div>
                        )}
                      </div>
                      <div 
                        className="relative cursor-help"
                        onMouseEnter={() => setHoveredItem('type')}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <span className="bg-[#1a1f2e] px-2 py-0.5 rounded text-slate-300">{classInfo.creatureType}</span>
                        {hoveredItem === 'type' && (
                          <div className="absolute z-50 bottom-full left-0 mb-2 bg-[#1E2430] text-white p-2 rounded-lg text-xs w-32 shadow-xl border border-gray-600">
                            Creature Type: {classInfo.creatureType}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 mt-2">
                      {classInfo.features.map((feature, idx) => (
                        <div 
                          key={idx}
                          className="relative cursor-help"
                          onMouseEnter={() => setHoveredItem(`race-${idx}`)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <span className="text-[#37F2D1] font-semibold">{feature}</span>
                          {featureDescriptions[feature] && (
                            <p className="text-slate-400 leading-tight mt-0.5">{featureDescriptions[feature]}</p>
                          )}
                          {hoveredItem === `race-${idx}` && featureDescriptions[feature] && (
                            <div className="absolute z-50 bottom-full left-0 mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border border-[#37F2D1]">
                              <div className="font-bold mb-1">{feature}</div>
                              <div>{featureDescriptions[feature]}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Class Features */}
              <div>
                <h3 className="text-sm font-bold text-[#FFC6AA] mb-2 uppercase">{character.class}</h3>
                <div className="space-y-2 text-[11px]">
                  {character.subclass && (
                    <div 
                      className="mb-2 relative cursor-help"
                      onMouseEnter={() => setHoveredItem('subclass')}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <span className="text-slate-400">Archetype: </span>
                      <span className="text-white font-semibold">{character.subclass}</span>
                      {hoveredItem === 'subclass' && subclassDescriptions[character.subclass] && (
                        <div className="absolute z-50 bottom-full left-0 mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border border-[#FF5722]">
                          <div className="font-bold mb-1">{character.subclass}</div>
                          <div>{subclassDescriptions[character.subclass]}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {classFeatureNames[character.class]?.map((feature, idx) => (
                    <div 
                      key={idx}
                      className="relative cursor-help"
                      onMouseEnter={() => setHoveredItem(`class-${idx}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <span className="text-[#37F2D1] font-semibold">{feature}</span>
                      {classFeatureDescriptions[feature] && (
                        <p className="text-slate-400 leading-tight mt-0.5">{classFeatureDescriptions[feature]}</p>
                      )}
                      {hoveredItem === `class-${idx}` && classFeatureDescriptions[feature] && (
                        <div className="absolute z-50 bottom-full left-0 mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-xl border border-[#FF5722]">
                          <div className="font-bold mb-1">{feature}</div>
                          <div>{classFeatureDescriptions[feature]}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Languages */}
              {character.languages && character.languages.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Languages</p>
                  <div className="flex flex-wrap gap-2">
                    {character.languages.map((lang, idx) => (
                      <div 
                        key={idx}
                        className="relative cursor-help"
                        onMouseEnter={() => setHoveredItem(`lang-${idx}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <span className="text-[10px] bg-[#1a1f2e] text-slate-300 px-2 py-1 rounded border border-[#2A3441]">
                          {lang}
                        </span>
                        {hoveredItem === `lang-${idx}` && languageDescriptions[lang] && (
                          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1E2430] text-white p-2 rounded-lg text-xs w-48 shadow-xl border border-[#2A3441]">
                            <div className="font-bold mb-1">{lang}</div>
                            <div>{languageDescriptions[lang]}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function QuickSlots({ quickSlots, setQuickSlots, inventory }) {
  return (
    <div className="grid grid-cols-7 gap-3">
      {quickSlots.map((item, idx) => (
        <div key={idx} className="w-full aspect-square rounded-2xl bg-[#050816] border border-[#111827] flex items-center justify-center">
          {item ? (
            item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover rounded-2xl" /> : <span className="text-[9px]">{item.name}</span>
          ) : <span className="text-[10px] text-slate-600">{idx + 1}</span>}
        </div>
      ))}
    </div>
  );
}

function TurnOrderDisplay({ order, currentTurnIndex, onSelectTarget, selectionMode, characters, players, hideInitiative = false }) {
  const hasPlayedRef = React.useRef(false);

  // Play sound effects when order populates
  React.useEffect(() => {
    if (order && order.length > 0 && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      // Staggered sound effects
      order.forEach((_, index) => {
        setTimeout(() => {
          const audio = new Audio('https://static.wixstatic.com/mp3/5cdfd8_969fe25cd3c5430ab97224d8b9a17227.wav');
          audio.volume = 0.6; // Increased volume
          audio.play().catch(e => console.warn("Turn order sound blocked:", e));
        }, index * 100); // 100ms stagger matching animation
      });
    }
  }, [order]);

  return (
    <div className="w-full overflow-x-auto custom-scrollbar pb-4">
      <div className="flex items-end gap-4 min-w-min px-2">
        <AnimatePresence mode="popLayout">
          {order.map((combatant, index) => {
            const isCurrent = index === currentTurnIndex;
            return (
              <motion.div 
                key={combatant.uniqueId || index}
                onClick={() => selectionMode && onSelectTarget && onSelectTarget(combatant)}
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.1, // Staggered drop animation
                  type: "spring",
                  stiffness: 200,
                  damping: 15
                }}
                className={`flex flex-col items-center gap-2 transition-all duration-500 relative ${
                  isCurrent ? 'scale-110 z-10' : 'opacity-70 scale-90'
                } ${selectionMode ? 'cursor-pointer hover:scale-110 hover:opacity-100' : ''}`}
              >
                {selectionMode && (
                  <div className="absolute -top-8 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-bounce shadow-lg z-50">
                    SELECT
                  </div>
                )}
                {isCurrent && !selectionMode && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[10px] font-bold text-[#37F2D1] bg-[#37F2D1]/10 px-2 py-0.5 rounded-full mb-1 animate-pulse"
                  >
                    CURRENT TURN
                  </motion.div>
                )}
                <div 
                  className={`relative w-16 h-16 rounded-full border-2 overflow-hidden bg-[#050816] transition-colors ${
                    selectionMode ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' :
                    isCurrent ? 'border-[#37F2D1] shadow-[0_0_20px_rgba(55,242,209,0.4)]' : 'border-[#111827]'
                  }`}
                >
                  {combatant.avatar ? (
                    <img src={combatant.avatar} alt={combatant.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl text-slate-600 font-bold">
                      {combatant.name?.[0]}
                    </div>
                  )}
                  {/* Initiative numbers are hidden on the player side so
                      players can't tell the GM rearranged the order. */}
                  {!hideInitiative && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[10px] text-center text-white font-bold py-0.5">
                      {(combatant.type === 'player' || combatant.isPlayer) ? combatant.initiative : '?'}
                    </div>
                  )}
                </div>
                
                {/* HP Bar for Players */}
                {combatant.type === 'player' && (
                   <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1 border border-gray-700">
                      {(() => {
                         // Find real character data for HP
                         // Use passed players/characters props
                         // combatant.id is usually `player-{userId}`
                         const userId = combatant.id.replace('player-', '');
                         const player = players?.find(p => p.user_id === userId);
                         const char = player?.character;
                         if (char?.hit_points) {
                            const current = char.hit_points.current || 0;
                            const max = char.hit_points.max || 10;
                            const pct = Math.min(100, Math.max(0, (current / max) * 100));
                            return <div className={`h-full ${hpBarColor(pct)}`} style={{ width: `${pct}%` }} />;
                         }
                         return <div className="h-full bg-gray-600 w-full opacity-20" />;
                      })()}
                   </div>
                )}
                {/* Simple Bar for Monsters (No numbers) */}
                {combatant.type !== 'player' && (
                   <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1 border border-gray-700 relative" title="Monster Health">
                      {/* Assuming we want to show *some* indication of health loss if possible.
                          Since we don't have the exact Combat Queue data prop passed here in the TurnOrderDisplay inside CampaignPlayerPanel,
                          we can't render an accurate bar.
                          HOWEVER, the user explicitly asked for it: "All monsters and NPCs need to have a health bar... Players should also be able to see HP being lost."

                          To fix this properly, we need to fetch the combat queue in CampaignPlayerPanel and pass it down,
                          OR rely on the fact that 'combatant' in 'order' might have updated 'hit_points' if we are syncing correctly.
                          
                          Currently 'campaign.combat_data.order' is static until updated.
                          If we update the campaign entity with new order data when damage happens, it will reflect here.
                          
                          Let's assume the order object contains the snapshot of HP.
                      */}
                      {(() => {
                         const current = combatant.hit_points?.current !== undefined ? combatant.hit_points.current : (combatant.hit_points?.max || 10);
                         const max = combatant.hit_points?.max || 10;
                         const pct = Math.min(100, Math.max(0, (current / max) * 100));

                         return (
                           <div className={`h-full ${hpBarColor(pct)}`} style={{ width: `${pct}%` }} />
                         );
                      })()}
                   </div>
                )}

                <span className={`text-[10px] font-bold max-w-[80px] truncate px-2 py-0.5 rounded-full ${
                  isCurrent ? 'text-[#1E2430] bg-[#37F2D1]' : 'text-slate-400 bg-[#111827]/80'
                }`}>
                  {combatant.name}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function getSilhouetteImage(character) {
  if (!character) return 'https://static.wixstatic.com/media/5cdfd8_35e9f29559bd43239470a098001a1fe5~mv2.png';
  const gender = (character.gender || '').toLowerCase();
  if (gender.includes('female') || gender === 'f') return 'https://static.wixstatic.com/media/5cdfd8_95e7b63afc9a444e97bbadc37e59b154~mv2.png';
  if (gender.includes('male') || gender === 'm') return 'https://static.wixstatic.com/media/5cdfd8_8b8fc7ed62dd4c74927bfee94c031e7d~mv2.png';
  return 'https://static.wixstatic.com/media/5cdfd8_35e9f29559bd43239470a098001a1fe5~mv2.png';
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CampaignPlayerPanel Error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-950 text-white p-8 font-mono overflow-auto z-[9999] relative">
          <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
          <div className="bg-black/50 p-6 rounded-xl border border-red-500 mb-6 shadow-2xl">
            <p className="text-xl text-red-300 mb-4 font-bold">{this.state.error && this.state.error.toString()}</p>
            <div className="text-xs text-gray-300 whitespace-pre-wrap p-4 bg-black/30 rounded border border-white/10 overflow-auto max-h-[50vh]">
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-white text-red-900 px-8 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors shadow-lg"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function CampaignPlayerPanel() {
  return (
    <ErrorBoundary>
      <CampaignPlayerPanelContent />
    </ErrorBoundary>
  );
}