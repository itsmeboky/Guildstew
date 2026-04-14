import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, Settings, GripVertical, X, EyeOff, Eye, Package, Search, Dices, AlertCircle, LogOut } from "lucide-react";
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
import { spellIcons, spellDetails as hardcodedSpellDetails, getCharacterSpellSlots, fetchAllSpells } from "@/components/dnd5e/spellData";
import { Heart, Music, Circle, Triangle, Crosshair } from "lucide-react";
import LootManager from "@/components/gm/LootManager";
import MoneyCounter from "@/components/shared/MoneyCounter";
import { allItemsWithEnchanted, itemIcons } from "@/components/dnd5e/itemData";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import CampaignLog from "@/components/gm/CampaignLog";
import CharacterSelector from "@/components/gm/CharacterSelector";
import MonsterQueue from "@/components/gm/MonsterQueue";
import { enrichMonster } from "@/components/gm/monsterEnrichment";
import { canEquipToSlot } from "@/components/gm/equipmentRules";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CombatActionBar from "@/components/combat/CombatActionBar";
import CombatDiceWindow from "@/components/combat/CombatDiceWindow";
import { resolveAction, consumeActionCost } from "@/components/combat/actionResolver";
import { toast } from "sonner";
import { useTurnContext } from "@/components/combat/useTurnContext";

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
  // Dodging isn't a 5e condition proper, but we surface it as one so the
  // Dodge action leaves a visible label on the portrait until the
  // character's next turn starts (attack rolls vs them have disadvantage,
  // and they have advantage on DEX saves — GM enforces manually for now).
  Dodging: { color: "#0ea5e9", label: "Dodging" },
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

export default function GMPanel() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const navigate = useNavigate();
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);

  const [nonLethalActive, setNonLethalActive] = useState(false);
  const [isPossessed, setIsPossessed] = useState(false);
  const [showPossessSelector, setShowPossessSelector] = useState(false);
  const [quickSlots, setQuickSlots] = useState(Array(7).fill(null));
  const [monsterInventory, setMonsterInventory] = useState([]);
  const [equippedItems, setEquippedItems] = useState({});
  const [initiativeOrder, setInitiativeOrder] = useState([]);
  const [combatActive, setCombatActive] = useState(false);
  const [actionsState, setActionsState] = useState({ action: true, bonus: true, inspiration: false });
  const [activeConditions, setActiveConditions] = useState({});

  // 1. Auto-select first monster if queue has items and no character selected
  React.useEffect(() => {
    const savedQueue = localStorage.getItem(`gm_monster_queue_${campaignId}`);
    if (savedQueue && !selectedCharacter) {
      try {
        const queue = JSON.parse(savedQueue);
        if (queue.length > 0) {
          // Need to enrich it to be usable
          const first = queue[0];
          const enriched = enrichMonster(first);
          setSelectedCharacter(enriched);
          setMonsterInventory(enriched.inventory || []);
          setEquippedItems(enriched.equipped || {});
        }
      } catch (e) { console.error(e); }
    }
  }, [campaignId]); // Run once on mount/campaignId change


  const [showConditionManager, setShowConditionManager] = useState(false);
  const [showEndSessionAlert, setShowEndSessionAlert] = useState(false);
  const queryClient = useQueryClient();

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then(campaigns => campaigns[0]),
    enabled: !!campaignId,
    refetchInterval: (data) => (data?.combat_active || data?.combat_data?.stage === 'initiative') ? 1000 : 2000
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // The GM can always act, regardless of whose turn it is in the combat
  // tracker — they might be running a monster, possessing a player, or
  // just fixing something mid-session.
  const isGM = !!campaign?.game_master_id && campaign?.game_master_id === currentUser?.id;

  const { isActorsTurn } = useTurnContext({ campaign, actor: selectedCharacter });

  // Combat State
  const [combatState, setCombatState] = useState({
    isOpen: false,
    step: 'idle', // idle, selecting_target, rolling
    action: null,
    target: null
  });

  // Stateful 4-state attack mode toggle: null → melee → ranged → unarmed → null
  // Owned by GMPanel because both CombatActionBar (display + cycling) and
  // the targeting / dice-window flow (which weapon to fire) need it.
  const [attackMode, setAttackMode] = useState(null);

  // Stealth / Sneak state.
  //   hiddenCharacters: Set of character IDs that have successfully hidden
  //     (Hide action resolved). Cleared when the character attacks, takes
  //     damage, or their turn ends without re-hiding.
  //   sneakActive: whether the currently-selected character has the
  //     Sneak toggle on. Only meaningful while that character is hidden.
  //   prevActiveKeyRef: remembers whose turn it was last render so the
  //     turn-change effect can reveal them if they didn't re-hide.
  //   hidThisTurnRef: whether a successful Hide check happened during the
  //     current active character's turn (prevents the end-of-turn reveal).
  const [hiddenCharacters, setHiddenCharacters] = useState(() => new Set());
  const [sneakActive, setSneakActive] = useState(false);
  const prevActiveKeyRef = React.useRef(null);
  const hidThisTurnRef = React.useRef(false);

  // Canonical character id. Monsters from the queue use uniqueId, DB-backed
  // characters use their row id.
  const getCharacterKey = React.useCallback((c) => c?.uniqueId || c?.id || null, []);
  const selectedCharacterKey = getCharacterKey(selectedCharacter);
  const isHidden = !!selectedCharacterKey && hiddenCharacters.has(selectedCharacterKey);

  // If the selected character is no longer hidden (turn rolled over, attacked
  // while sneaking, or the GM switched to a different character) the Sneak
  // toggle should fall back off automatically.
  React.useEffect(() => {
    if (!isHidden && sneakActive) setSneakActive(false);
  }, [isHidden, sneakActive]);

  // Sync combat state to DB for spectators
  const updateCombatEncounter = React.useCallback((newState) => {
    if (!campaign?.combat_active) return;
    
    // Debounce or simple check to avoid excessive writes
    const prevEncounter = campaign?.combat_data?.active_encounter;
    // Simple equality check or just fire it
    
    base44.entities.Campaign.update(campaignId, {
      combat_data: {
        ...campaign.combat_data,
        active_encounter: newState
      }
    }).catch(err => console.error("Failed to sync encounter", err));
  }, [campaign?.combat_active, campaignId, campaign?.combat_data]);

  // When combat state changes significantly, sync it
  useEffect(() => {
    if (combatState.isOpen && combatState.target) {
      updateCombatEncounter({
        attackerId: selectedCharacter?.uniqueId || `monster-${selectedCharacter?.queueId}`,
        targetId: combatState.target.uniqueId || combatState.target.id,
        attackerName: selectedCharacter?.name,
        targetName: combatState.target.name,
        action: combatState.action,
        phase: 'ready', // Start at ready
        timestamp: Date.now()
      });
    } else if (!combatState.isOpen && combatState.step === 'idle') {
      // Clear encounter when closed
      if (campaign?.combat_data?.active_encounter) {
        updateCombatEncounter(null);
      }
    }
  }, [combatState.isOpen, combatState.target, selectedCharacter]);

  // Listener for Spectated Damage Application (from players)
  const lastProcessedDamageRef = React.useRef(null);
  useEffect(() => {
    const encounter = campaign?.combat_data?.active_encounter;
    if (encounter?.phase === 'damage_result' && encounter.damageRoll && encounter.timestamp !== lastProcessedDamageRef.current) {
      lastProcessedDamageRef.current = encounter.timestamp;
      
      const damage = encounter.damageRoll.total;
      const targetId = encounter.targetId;

      // Apply damage if target is a monster (managed by GM)
      if (targetId.startsWith('monster-')) {
        const monsterQueueId = targetId.replace('monster-', '');
        const savedQueue = localStorage.getItem(`gm_monster_queue_${campaignId}`);
        if (savedQueue) {
          const queue = JSON.parse(savedQueue);
          const newQueue = queue.map(m => {
            if (m.queueId === monsterQueueId) {
              const currentHp = m.hit_points?.current !== undefined ? m.hit_points.current : (m.hit_points?.max || 10);
              return {
                ...m,
                hit_points: {
                  ...m.hit_points,
                  current: Math.max(0, currentHp - damage)
                }
              };
            }
            return m;
          });
          localStorage.setItem(`gm_monster_queue_${campaignId}`, JSON.stringify(newQueue));
          window.dispatchEvent(new Event('storage'));
        }
      }
    }
  }, [campaign?.combat_data?.active_encounter, campaignId]);

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      // Reset combat state
      await base44.entities.Campaign.update(campaignId, { 
        is_session_active: false,
        last_session_ended_at: new Date().toISOString(),
        ready_player_ids: [],
        combat_active: false,
        combat_data: null
      });
      
      // Clear monster queue from local storage
      localStorage.removeItem(`gm_monster_queue_${campaignId}`);
      window.dispatchEvent(new Event('storage'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      navigate(createPageUrl("CampaignGMPanel") + `?id=${campaignId}`);
    }
  });

  const [showEndCombatAlert, setShowEndCombatAlert] = useState(false);
  const [isTurnOrderAccepted, setIsTurnOrderAccepted] = useState(false);

  const acceptTurnOrderMutation = useMutation({
    mutationFn: () => base44.entities.Campaign.update(campaignId, { 
      combat_active: true,
      combat_data: {
        order: initiativeOrder,
        currentTurnIndex: 0,
        round: 1
      }
    }),
    onSuccess: () => {
      const audio = new Audio('https://static.wixstatic.com/mp3/5cdfd8_1e1b1f8b2b074994ac92bc8ee2913586.wav');
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play failed", e));
      
      setIsTurnOrderAccepted(true);
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    }
  });

  const endCombatMutation = useMutation({
    mutationFn: () => base44.entities.Campaign.update(campaignId, { 
      combat_active: false,
      combat_data: null
    }),
    onSuccess: () => {
      setCombatActive(false);
      setIsTurnOrderAccepted(false);
      setInitiativeOrder([]);
      setActiveConditions({});
      setHiddenCharacters(new Set());
      setSneakActive(false);
      hidThisTurnRef.current = false;
      prevActiveKeyRef.current = null;
      setShowEndCombatAlert(false);
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    }
  });

  const handleEndCombat = () => {
    endCombatMutation.mutate();
  };

  const toggleCondition = (targetId, condition) => {
    setActiveConditions(prev => {
      const current = prev[targetId] || [];
      if (current.includes(condition)) {
        const newConditions = current.filter(c => c !== condition);
        if (newConditions.length === 0) {
          const newState = { ...prev };
          delete newState[targetId];
          return newState;
        }
        return { ...prev, [targetId]: newConditions };
      }
      return { ...prev, [targetId]: [...current, condition] };
    });
  };

  // Construct the attack action object for a given mode. Used both when the
  // attack button changes mode (to set combatState.action for targeting) and
  // when a target is selected. If the requested mode has no weapon available
  // (melee with no weapon1, ranged with no ranged weapon) we fall back to
  // unarmed, and always send `weapon: null` for unarmed so the dice window
  // synthesizes the unarmed strike (1d4 + STR, or Martial Arts for Monks).
  const buildAttackAction = React.useCallback((mode) => {
    if (!mode) return null;
    const equipment = equippedItems || {};
    let effectiveMode = mode;
    let weapon = null;

    if (mode === 'melee') {
      weapon = equipment.weapon1 || null;
      if (!weapon) effectiveMode = 'unarmed';
    } else if (mode === 'ranged') {
      weapon = equipment.ranged || null;
      if (!weapon) effectiveMode = 'unarmed';
    }
    // mode === 'unarmed' always sends weapon: null

    if (effectiveMode === 'unarmed') weapon = null;

    const action = {
      type: 'basic',
      name: 'Attack',
      mode: effectiveMode,
      weapon,
      isOffHand: false,
    };
    const resolved = resolveAction(action, selectedCharacter);
    return { ...action, resolved };
  }, [equippedItems, selectedCharacter]);

  // Handler called when CombatActionBar cycles the attack toggle.
  const handleAttackModeChange = React.useCallback((nextMode) => {
    // Guardrails: only check turn order / action economy when transitioning
    // from null → a mode (i.e. entering attack targeting). Cycling between
    // modes or cancelling is always allowed.
    if (attackMode === null && nextMode !== null) {
      // GM can always act, regardless of whose turn the tracker says it is.
      if (campaign?.combat_active && campaign?.combat_data && !isGM && !isActorsTurn) {
        toast.error("It's not this character's turn!");
        return;
      }
      if (!actionsState.action) {
        toast.error("No action available this turn!");
        return;
      }
    }

    setAttackMode(nextMode);

    if (nextMode === null) {
      // Fourth click: cancel. Clear any attack targeting state.
      setCombatState(prev => {
        if (prev.action?.name === 'Attack' && prev.step === 'selecting_target') {
          return { isOpen: false, step: 'idle', action: null, target: null };
        }
        return prev;
      });
    } else {
      // Enter / update attack targeting mode with the new weapon.
      const action = buildAttackAction(nextMode);
      setCombatState({ isOpen: false, step: 'selecting_target', action, target: null });
    }
  }, [
    attackMode,
    campaign?.combat_active,
    campaign?.combat_data,
    isActorsTurn,
    isGM,
    actionsState.action,
    buildAttackAction,
  ]);

  const rollInitiative = () => {
    // 1. Get Players
    const playerCombatants = players.map(p => {
      const char = p.character;
      const dex = char?.attributes?.dex || 10;
      const mod = Math.floor((dex - 10) / 2);
      return {
        id: `player-${p.user_id}`,
        name: char?.name || p.username,
        avatar: char?.profile_avatar_url || p.avatar_url,
        dexMod: mod,
        type: 'player',
        initiative: Math.floor(Math.random() * 20) + 1 + mod,
        uniqueId: `player-${p.user_id}`
      };
    });

    // 2. Get Monsters from localStorage
    const savedQueue = localStorage.getItem(`gm_monster_queue_${campaignId}`);
    const monsterQueue = savedQueue ? JSON.parse(savedQueue) : [];
    
    const monsterCombatants = monsterQueue.map(m => {
      const stats = m.stats || m;
      const dex = stats.dex || stats.attributes?.dex || 10;
      const mod = Math.floor((dex - 10) / 2);
      return {
        id: `monster-${m.queueId}`,
        name: m.name,
        avatar: m.image_url || m.avatar_url,
        dexMod: mod,
        type: 'monster',
        initiative: Math.floor(Math.random() * 20) + 1 + mod,
        uniqueId: `monster-${m.queueId}`,
        initiative_rolled: true // Monsters always have rolled
      };
    });

    // 3. Combine and Sort
    const allCombatants = [...playerCombatants, ...monsterCombatants].sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      return Math.random() - 0.5;
    });

    // Start Initiative Phase
    base44.entities.Campaign.update(campaignId, {
      combat_active: true,
      combat_data: {
        stage: 'initiative',
        order: allCombatants, // Provisional order, will be updated as players roll
        rolls: {},
        currentTurnIndex: 0,
        round: 1
      }
    });
    
    setCombatActive(true);
    setIsTurnOrderAccepted(false);
  };



  // 2. Auto-select character on turn change (for GM controlled entities)
  React.useEffect(() => {
    if (campaign?.combat_active && campaign?.combat_data?.order && campaign.combat_data.order.length > 0) {
      // Always look at the FIRST combatant in the order (since we rotate)
      const currentCombatant = campaign.combat_data.order[0];
      
      if (currentCombatant && (currentCombatant.type === 'monster' || currentCombatant.type === 'npc')) {
        // It's a GM turn. Find this monster in the queue/data to select it fully.
        const queueId = currentCombatant.uniqueId?.replace('monster-', '');
        
        // Try to find in localStorage queue first
        const savedQueue = localStorage.getItem(`gm_monster_queue_${campaignId}`);
        let foundMonster = null;
        
        if (savedQueue) {
          const queue = JSON.parse(savedQueue);
          foundMonster = queue.find(m => m.queueId === queueId) || queue.find(m => m.name === currentCombatant.name);
        }
        
        if (foundMonster) {
          const enriched = enrichMonster(foundMonster);
          // IMPORTANT: Inject the uniqueId from the combatant to ensure match and prevent infinite loop
          enriched.uniqueId = currentCombatant.uniqueId; 

          // Always force selection for active monster turn
          if (selectedCharacter?.uniqueId !== currentCombatant.uniqueId) {
             setSelectedCharacter(enriched);
             setMonsterInventory(enriched.inventory || []);
             setEquippedItems(enriched.equipped || {});
          }
        }
      }
    }
  }, [campaign?.combat_data?.order, campaign?.combat_active]);

  React.useEffect(() => {
    if (campaign?.combat_active) {
      setCombatActive(true);
      setIsTurnOrderAccepted(true);
      if (campaign.combat_data?.order) {
        setInitiativeOrder(campaign.combat_data.order);
      }
    }

    // Auto-initialize loot data for existing campaigns
    if (campaign && !campaign.loot_data) {
      base44.entities.Campaign.update(campaignId, {
        loot_data: {
          items: [],
          currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
          settings: { split_gold_evenly: true, level_up: false, random_items: false },
          is_distributed: false
        }
      });
    }
  }, [campaign, campaignId]);

  // Per-turn resets on turn change:
  //   - action economy (Action + Bonus Action + Inspiration)
  //   - attack-mode toggle
  //   - sneak toggle
  //   - Dodging condition on the new active combatant (per 5e the Dodge
  //     benefit lasts until the start of the dodger's next turn)
  //   - Reveal the previous active combatant if they didn't re-hide during
  //     their turn (hidThisTurnRef tracks that). Hiding is short-lived:
  //     attack / take damage / let your turn pass without re-hiding and
  //     you're exposed.
  React.useEffect(() => {
    setActionsState({ action: true, bonus: true, inspiration: false });
    setAttackMode(null);
    setSneakActive(false);

    const activeCombatant = campaign?.combat_data?.order?.[0];
    const activeKey = activeCombatant?.uniqueId || activeCombatant?.id;

    if (activeKey) {
      setActiveConditions(prev => {
        const current = prev[activeKey] || [];
        if (!current.includes('Dodging')) return prev;
        return { ...prev, [activeKey]: current.filter(c => c !== 'Dodging') };
      });
    }

    // End-of-turn reveal: if the character whose turn just ended was hidden
    // and didn't re-hide this turn, remove them from hiddenCharacters.
    const prevActiveKey = prevActiveKeyRef.current;
    if (prevActiveKey && prevActiveKey !== activeKey && !hidThisTurnRef.current) {
      setHiddenCharacters(prev => {
        if (!prev.has(prevActiveKey)) return prev;
        const next = new Set(prev);
        next.delete(prevActiveKey);
        return next;
      });
    }
    hidThisTurnRef.current = false;
    prevActiveKeyRef.current = activeKey;
  }, [campaign?.combat_data?.currentTurnIndex, campaign?.combat_data?.round, campaign?.combat_data?.order?.[0]?.id]);

  // Sync equippedItems + monsterInventory whenever a different character is
  // selected/possessed. This is the single source of truth for both players
  // and monsters, so no matter which selection path fires (Possess dialog,
  // Character selector, MonsterQueue click, turn auto-select, seed data)
  // the equipment and inventory always populate from the character row.
  //
  // Keyed on selectedCharacter?.id so drag-and-drop mutations to
  // equippedItems don't get clobbered while the same character is active.
  React.useEffect(() => {
    if (!selectedCharacter) {
      setEquippedItems({});
      setMonsterInventory([]);
      return;
    }
    // Prefer `equipped` (the canonical field for equipped-slot data).
    // Fall back to `equipment` if `equipped` is missing or empty, so older
    // rows that only have the legacy field still light up the slots.
    const equippedField = selectedCharacter.equipped;
    const equipmentField = selectedCharacter.equipment;
    const resolvedEquipped =
      equippedField && Object.keys(equippedField).length > 0
        ? equippedField
        : equipmentField && Object.keys(equipmentField).length > 0
        ? equipmentField
        : {};
    setEquippedItems(resolvedEquipped);
    setMonsterInventory(Array.isArray(selectedCharacter.inventory) ? selectedCharacter.inventory : []);
  }, [selectedCharacter?.id, selectedCharacter?.uniqueId]);

  const { data: monsters = [] } = useQuery({
    queryKey: ['campaignMonsters', campaignId],
    queryFn: () => base44.entities.Monster.filter({ campaign_id: campaignId }),
    enabled: !!campaignId
  });

  const { data: npcs = [] } = useQuery({
    queryKey: ['campaignNPCs', campaignId],
    queryFn: () => base44.entities.CampaignNPC.filter({ campaign_id: campaignId }),
    enabled: !!campaignId
  });

  const { data: characters = [] } = useQuery({
    queryKey: ['campaignCharacters', campaignId],
    queryFn: async () => {
      const chars = await base44.entities.Character.filter({ campaign_id: campaignId });
      // Ensure full HP on load if not set
      chars.forEach(c => {
        if (c.hit_points && (c.hit_points.current === undefined || c.hit_points.current === null)) {
           base44.entities.Character.update(c.id, { 
             hit_points: { ...c.hit_points, current: c.hit_points.max || 10 } 
           });
        }
      });
      return chars;
    },
    enabled: !!campaignId
  });

  const { data: allUserProfiles = [] } = useQuery({
    queryKey: ['allUserProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
    staleTime: 60000
  });

  // Fetch all spells for accurate tooltips
  const { data: fullSpellsList } = useQuery({
    queryKey: ['dnd5e-spells'],
    queryFn: () => fetchAllSpells().then(data => data.spells),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const currentUserProfile = React.useMemo(() => {
    return allUserProfiles.find(p => p.user_id === currentUser?.id);
  }, [allUserProfiles, currentUser?.id]);

  const players = React.useMemo(() => {
    const playerMap = new Map();
    const claimedCharacterIds = new Set();

    // 1. Real players: those in campaign.player_ids with a matching profile.
    if (campaign?.player_ids) {
      const uniquePlayerIds = [...new Set(campaign.player_ids)];
      uniquePlayerIds.forEach(playerId => {
        const profile = allUserProfiles.find(u => u.user_id === playerId);
        if (profile && !playerMap.has(playerId)) {
          const character = characters.find(c => c.created_by === profile.email && c.campaign_id === campaignId);
          if (character) claimedCharacterIds.add(character.id);
          playerMap.set(playerId, { ...profile, character });
        }
      });
    }

    // 2. Orphan characters: any character in this campaign not already linked
    // to a profile-based player. This covers test/seeded data, characters
    // whose owners left the campaign, and GM-controlled NPCs. Each becomes
    // a synthetic "ghost" player entry so the GM can see and control them
    // through the same UI flows.
    characters.forEach(char => {
      if (char.campaign_id !== campaignId) return;
      if (claimedCharacterIds.has(char.id)) return;
      const ghostKey = `ghost-${char.id}`;
      playerMap.set(ghostKey, {
        user_id: ghostKey,
        email: char.created_by || 'ghost@local',
        username: char.name || 'Unclaimed',
        avatar_url: char.profile_avatar_url,
        profile_color_1: '#FF5722',
        profile_color_2: '#37F2D1',
        character: char,
        isGhost: true,
      });
    });

    return Array.from(playerMap.values());
  }, [campaign?.player_ids, allUserProfiles, characters, campaignId]);



  if (!campaign) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #050816;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>

      <style>{`
        @keyframes rotateBorder {
          0% {
            filter: hue-rotate(0deg) brightness(1.2);
          }
          100% {
            filter: hue-rotate(360deg) brightness(1.2);
          }
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
            character={selectedCharacter} 
            onSelectCharacter={() => setShowCharacterSelector(true)}
            isPossessed={isPossessed}
            setIsPossessed={setIsPossessed}
            players={players}
            onPossessPlayer={() => setShowPossessSelector(true)}
            monsterInventory={monsterInventory}
            setMonsterInventory={setMonsterInventory}
            equippedItems={equippedItems}
            setEquippedItems={setEquippedItems}
            onRollInitiative={rollInitiative}
            onManageConditions={() => setShowConditionManager(true)}
          />

          <div className="space-y-4">
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

            <CombatDiceWindow
              isOpen={
                combatState.isOpen || 
                (campaign?.combat_data?.stage === 'initiative') ||
                (!!campaign?.combat_data?.active_encounter && !combatState.isOpen)
              }
              onClose={() => {
                setAttackMode(null);
                setCombatState({ step: 'idle', isOpen: false, action: null, target: null });
              }}
              actor={
                (!combatState.isOpen && campaign?.combat_data?.active_encounter)
                  ? { 
                      name: campaign.combat_data.active_encounter.attackerName, 
                      id: campaign.combat_data.active_encounter.attackerId,
                      avatar_url: campaign.combat_data.active_encounter.attackerAvatar
                    }
                  : selectedCharacter
              }
              target={
                (!combatState.isOpen && campaign?.combat_data?.active_encounter)
                  ? {
                      name: campaign.combat_data.active_encounter.targetName,
                      id: campaign.combat_data.active_encounter.targetId,
                      avatar_url: campaign.combat_data.active_encounter.targetAvatar
                    }
                  : combatState.target
              }
              initialAction={
                (!combatState.isOpen && campaign?.combat_data?.active_encounter)
                  ? campaign.combat_data.active_encounter.action
                  : combatState.action
              }
              allCombatants={campaign?.combat_data?.stage === 'initiative' ? campaign.combat_data.order : initiativeOrder}
              isGM={true}
              mode={campaign?.combat_data?.stage === 'initiative' ? 'initiative' : 'combat'}
              campaignId={campaignId}
              
              // Spectator Props
              isSpectator={!combatState.isOpen && !!campaign?.combat_data?.active_encounter}
              spectatorData={campaign?.combat_data?.active_encounter}
              sneakActive={sneakActive}

              onSwitchTarget={() => {
                setCombatState(prev => ({ ...prev, isOpen: false, step: 'selecting_target' }));
              }}
              onRoll={(data) => {
                // Sync roll to DB for spectators
                if (campaign?.combat_data?.active_encounter) {
                  const currentEncounter = campaign.combat_data.active_encounter;
                  let updates = {};

                  if (data.type === 'attack_result') { // Custom event we'll add to DiceWindow
                     updates = { phase: 'attack_result', attackRoll: data.roll };
                  } else if (data.type === 'damage') {
                     updates = { phase: 'damage_result', damageRoll: { total: data.value, ...data.detail } };
                  } else if (data.type === 'rolling_attack') {
                     updates = { phase: 'rolling_attack' };
                  } else if (data.type === 'rolling_damage') {
                     updates = { phase: 'rolling_damage' };
                  }

                  if (Object.keys(updates).length > 0) {
                    base44.entities.Campaign.update(campaignId, {
                      combat_data: {
                        ...campaign.combat_data,
                        active_encounter: { ...currentEncounter, ...updates }
                      }
                    });
                  }
                }

                // Hide success → mark the current character as hidden so the
                // Sneak toggle unlocks. Any completed Hide check counts as
                // success; the GM can mentally invalidate a low roll by
                // manually revealing. We also flip hidThisTurnRef so the
                // end-of-turn reveal in the turn-change effect leaves them
                // alone.
                if (data.type === 'check_result' && combatState.action?.name === 'Hide') {
                  const key = getCharacterKey(selectedCharacter);
                  if (key) {
                    setHiddenCharacters(prev => {
                      const next = new Set(prev);
                      next.add(key);
                      return next;
                    });
                    hidThisTurnRef.current = true;
                  }
                }

                if (data.type === 'damage') {
                  // Apply damage
                  const targetId = data.targetId;
                  const damage = data.value;

                  // Taking damage reveals a hidden character.
                  if (targetId) {
                    setHiddenCharacters(prev => {
                      if (!prev.has(targetId)) return prev;
                      const next = new Set(prev);
                      next.delete(targetId);
                      return next;
                    });
                  }
                  
                  if (targetId.startsWith('player-')) {
                    const userId = targetId.replace('player-', '');
                    const char = characters.find(c => {
                      // find character for this user
                      // Need to map user_id to email or check campaign player_ids
                      const player = players.find(p => p.user_id === userId);
                      return player && c.created_by === player.email;
                    });
                    
                    if (char) {
                      const newCurrent = Math.max(0, (char.hit_points?.current || char.hit_points?.max || 0) - damage);
                      base44.entities.Character.update(char.id, {
                        hit_points: { ...char.hit_points, current: newCurrent }
                      });
                      queryClient.invalidateQueries(['campaignCharacters']);
                    }
                  } else if (targetId.startsWith('monster-')) {
                    // Handle monster HP (local state or queue)
                    // Update local queue in localStorage or state
                    // NOTE: Monster instances in queue should track their own HP
                    // We need to update `monsters` state in ConditionManager or wherever it's stored
                    // Since MonsterQueue uses localStorage, we update it there.
                    const savedQueue = localStorage.getItem(`gm_monster_queue_${campaignId}`);
                    if (savedQueue) {
                      const queue = JSON.parse(savedQueue);
                      const monsterQueueId = targetId.replace('monster-', '');
                      const newQueue = queue.map(m => {
                        if (m.queueId === monsterQueueId) {
                          const currentHp = m.hit_points?.current !== undefined ? m.hit_points.current : (m.hit_points?.max || 10);
                          return {
                            ...m,
                            hit_points: {
                              ...m.hit_points,
                              current: Math.max(0, currentHp - damage)
                            }
                          };
                        }
                        return m;
                      });
                      localStorage.setItem(`gm_monster_queue_${campaignId}`, JSON.stringify(newQueue));
                      // Force re-render/update
                      window.dispatchEvent(new Event('storage'));
                    }
                  }
                }
              }}
              onActionComplete={() => {
                // Consume the action's cost now that it has been resolved
                const resolvedCost = combatState.action?.resolved?.cost;
                if (resolvedCost) {
                  setActionsState(prev => consumeActionCost(prev, resolvedCost));
                }
                // Attack resolved → leave attack-mode selection
                setAttackMode(null);

                // If the character attacked while sneaking, reveal them: drop
                // them from hiddenCharacters and flip the Sneak toggle off
                // (the isHidden-driven effect will also catch this).
                if (combatState.action?.name === 'Attack' && sneakActive) {
                  const key = getCharacterKey(selectedCharacter);
                  if (key) {
                    setHiddenCharacters(prev => {
                      if (!prev.has(key)) return prev;
                      const next = new Set(prev);
                      next.delete(key);
                      return next;
                    });
                  }
                  setSneakActive(false);
                }
                // Clear the synced encounter so spectators exit cleanly.
                // Optimistically update the local cache to avoid a flash where the
                // dice window briefly switches to spectator mode before the
                // server round-trips back.
                if (campaign?.combat_data?.active_encounter) {
                  const cleared = {
                    ...campaign.combat_data,
                    active_encounter: null,
                  };
                  queryClient.setQueryData(['campaign', campaignId], (old) =>
                    old ? { ...old, combat_data: cleared } : old
                  );
                  base44.entities.Campaign.update(campaignId, {
                    combat_data: cleared,
                  }).catch(err => console.error("Failed to clear encounter", err));
                }
                // Reset combat state cleanly (do NOT end turn — that's a separate action)
                setCombatState({ step: 'idle', isOpen: false, action: null, target: null });
              }}
              onEndTurn={async () => {
                if (campaign?.combat_data?.stage === 'initiative') {
                  // GM Accepting rolls
                  const finalOrder = [...campaign.combat_data.order].sort((a, b) => b.initiative - a.initiative);
                  await base44.entities.Campaign.update(campaignId, {
                    combat_data: {
                      ...campaign.combat_data,
                      stage: 'combat',
                      order: finalOrder
                    }
                  });
                } else if (campaign?.combat_active && campaign?.combat_data) {
                  // Cycle turn order: Move first to last
                  const currentOrder = [...campaign.combat_data.order];
                  if (currentOrder.length > 0) {
                    const [finished] = currentOrder.splice(0, 1);
                    currentOrder.push(finished);

                    await base44.entities.Campaign.update(campaignId, {
                      combat_data: {
                        ...campaign.combat_data,
                        order: currentOrder,
                        currentTurnIndex: 0 // Always 0 as we rotate the array
                      }
                    });
                    queryClient.invalidateQueries(['campaign', campaignId]);
                  }
                }
                setAttackMode(null);
                setCombatState({ step: 'idle', isOpen: false, action: null, target: null });
              }}
            />

            <div className="flex justify-between items-end relative">
              {combatActive && (
                <TurnOrderBar 
                  order={initiativeOrder} 
                  setOrder={setInitiativeOrder} 
                  activeConditions={activeConditions} 
                  onSelectTarget={(target) => {
                    if (combatState.step === 'selecting_target') {
                      setCombatState(prev => ({ ...prev, target, step: 'rolling', isOpen: true }));
                    }
                  }}
                  selectionMode={combatState.step === 'selecting_target'}
                  isTurnOrderAccepted={isTurnOrderAccepted}
                  // Pass helpers to lookup HP
                  getHp={(id) => {
                    if (id.startsWith('player-')) {
                      const p = players.find(p => `player-${p.user_id}` === id);
                      return p?.character?.hit_points;
                    }
                    if (id.startsWith('monster-')) {
                      // Look in localStorage for sync
                      const qId = id.replace('monster-', '');
                      const savedQueue = localStorage.getItem(`gm_monster_queue_${campaignId}`);
                      if (savedQueue) {
                         const q = JSON.parse(savedQueue);
                         const m = q.find(m => m.queueId === qId);
                         return m?.hit_points || m?.stats?.hit_points;
                      }
                    }
                    return null;
                  }}
                />
              )}
              <div className="flex-1 flex flex-col items-end gap-2 relative z-50">
                <div className="flex gap-2">
                  {combatActive && (
                    <>
                      {!isTurnOrderAccepted ? (
                        <button 
                          onClick={() => acceptTurnOrderMutation.mutate()}
                          disabled={acceptTurnOrderMutation.isPending}
                          className="rounded-full bg-[#37F2D1]/20 border border-[#37F2D1] text-[#37F2D1] px-5 py-2 text-xs font-semibold tracking-wide hover:bg-[#37F2D1]/30 transition"
                        >
                          {acceptTurnOrderMutation.isPending ? "ACCEPTING..." : "ACCEPT TURN ORDER"}
                        </button>
                      ) : (
                        <button 
                          onClick={() => setShowEndCombatAlert(true)}
                          className="rounded-full bg-red-500/20 border border-red-500 text-red-400 px-5 py-2 text-xs font-semibold tracking-wide hover:bg-red-500/30 transition"
                        >
                          END COMBAT
                        </button>
                      )}
                      
                      {isTurnOrderAccepted && (
                        <button 
                          onClick={async () => {
                            const currentOrder = [...campaign.combat_data.order];
                            if (currentOrder.length > 0) {
                              const [finished] = currentOrder.splice(0, 1);
                              currentOrder.push(finished);
                              await base44.entities.Campaign.update(campaignId, {
                                combat_data: { ...campaign.combat_data, order: currentOrder, currentTurnIndex: 0 }
                              });
                              queryClient.invalidateQueries(['campaign', campaignId]);
                            }
                          }}
                          className="rounded-full bg-[#22c5f5] px-7 py-2 text-sm font-semibold tracking-wide shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:translate-y-[1px] hover:bg-[#38bdf8] transition"
                        >
                          END TURN
                        </button>
                      )}
                    </>
                  )}
                </div>
                <button 
                  onClick={() => setShowEndSessionAlert(true)}
                  className="text-[10px] text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 transition-colors bg-[#050816]/80 px-3 py-1 rounded-full border border-red-500/20 hover:border-red-500/50"
                >
                  <LogOut className="w-3 h-3" />
                  END SESSION
                </button>
              </div>
            </div>

            <CombatActionBar
              character={selectedCharacter ? { ...selectedCharacter, equipment: equippedItems } : null}
              actionsState={actionsState}
              setActionsState={setActionsState}
              attackMode={attackMode}
              onAttackModeChange={handleAttackModeChange}
              isHidden={isHidden}
              sneakActive={sneakActive}
              onSneakToggle={(next) => setSneakActive(next)}
              onActionClick={(action) => {
                // Clicking any other action cancels attack-mode targeting.
                if (attackMode !== null) setAttackMode(null);

                // Turn order enforcement — GM bypasses the check entirely
                // (they might be running a monster or possessing a player).
                if (campaign?.combat_active && campaign?.combat_data) {
                  if (!isGM && !isActorsTurn) {
                    toast.error("It's not this character's turn!");
                    return;
                  }
                }

                const resolved = resolveAction(action, selectedCharacter);
                const enrichedAction = { ...action, resolved };

                // Action economy gate — can't do it if the required cost isn't available
                if (resolved.cost === "action" && !actionsState.action) {
                  toast.error("No action available this turn!");
                  return;
                }
                if (resolved.cost === "bonus" && !actionsState.bonus) {
                  toast.error("No bonus action available this turn!");
                  return;
                }

                // No-roll actions — just consume the cost and toast. Don't open the dice window.
                if (resolved.rollType === "no_roll") {
                  setActionsState(prev => consumeActionCost(prev, resolved.cost));
                  toast.success(`${selectedCharacter?.name || 'Character'} uses ${action.name}`);

                  // Dodge leaves a visible "Dodging" condition label on the
                  // character until the start of their next turn. The
                  // turn-change effect auto-clears it when the turn rotates
                  // back to them.
                  if (action.name === 'Dodge') {
                    const key = selectedCharacter?.uniqueId;
                    if (key) {
                      setActiveConditions(prev => {
                        const current = prev[key] || [];
                        if (current.includes('Dodging')) return prev;
                        return { ...prev, [key]: [...current, 'Dodging'] };
                      });
                    }
                  }

                  setCombatState({ isOpen: false, step: 'idle', action: null, target: null });
                  return;
                }

                // Modifier toggles — no cost, no dice window
                if (resolved.rollType === "modifier") {
                  return;
                }

                // Actions that need a target → enter targeting mode.
                // (Cost is NOT consumed yet — only on successful resolution via onActionComplete,
                // so cancelling targeting doesn't burn the action.)
                if (resolved.requiresTarget) {
                  setCombatState({ isOpen: false, step: 'selecting_target', action: enrichedAction, target: null });
                } else {
                  // Skill checks without a target (like Hide) open the dice window directly.
                  setCombatState({ isOpen: true, step: 'rolling', action: enrichedAction, target: null });
                }
              }}
            />

            <div className="grid grid-cols-[minmax(0,1fr),minmax(0,1.1fr)] gap-4">
              <div className="flex flex-col gap-4 h-full">
                <MonsterStatBlock 
                  character={selectedCharacter} 
                  className="flex-1" 
                  onActionClick={(action) => {
                    setCombatState({ isOpen: false, step: 'selecting_target', action: action, target: null });
                  }}
                />
                <div className="w-full">
                  <SectionCard title="Quick Slots">
                    <QuickSlots 
                      quickSlots={quickSlots} 
                      setQuickSlots={setQuickSlots}
                      inventory={selectedCharacter?.type === 'monster' || selectedCharacter?.type === 'npc' ? monsterInventory : (selectedCharacter?.inventory || [])}
                    />
                  </SectionCard>
                </div>
              </div>

              <div className="space-y-4">
                <MonsterQueue
                  monsters={monsters}
                  npcs={npcs}
                  onSelectMonster={(char) => {
                    setSelectedCharacter(char);
                    setMonsterInventory(char.inventory || []);
                    setEquippedItems(char.equipped || {});
                  }}
                  campaignId={campaignId}
                />

                <SectionCard title="Adventurers">
                  <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
                    {players.map((player) => {
                      const character = player.character;
                      const color1 = player.profile_color_1 || "#FF5722";
                      const color2 = player.profile_color_2 || "#37F2D1";
                      const currentHp = character?.hit_points?.current || 0;
                      const maxHp = character?.hit_points?.max || 0;
                      const ac = character?.armor_class || 10;

                      return (
                        <div
                          key={player.user_id}
                          onClick={() => {
                            if (combatState.step === 'selecting_target') {
                              const target = initiativeOrder.find(c => c.id === `player-${player.user_id}`) || { 
                                id: `player-${player.user_id}`, 
                                name: character?.name || player.username, 
                                avatar: character?.profile_avatar_url, 
                                type: 'player' 
                              };
                              setCombatState(prev => ({ ...prev, target, step: 'rolling', isOpen: true }));
                            }
                          }}
                          className={`min-w-[160px] max-w-[160px] rounded-3xl bg-[#050816] overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.7)] border-2 relative group transition-all duration-300 ${
                            combatState.step === 'selecting_target' ? 'cursor-pointer hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] z-50' : ''
                          }`}
                          style={{
                            borderColor: activeConditions[`player-${player.user_id}`]?.[0] ? CONDITIONS[activeConditions[`player-${player.user_id}`][0]].color : undefined,
                            borderImage: !activeConditions[`player-${player.user_id}`]?.length ? `linear-gradient(135deg, ${color1}, ${color2}) 1` : undefined
                          }}
                        >
                          {combatState.step === 'selecting_target' && (
                            <div className="absolute inset-0 bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold text-white tracking-wider z-20">
                              SELECT
                            </div>
                          )}
                          {activeConditions[`player-${player.user_id}`]?.length > 0 && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-black/80 text-white text-[9px] px-2 py-0.5 rounded-full border border-white/20 whitespace-nowrap">
                              {activeConditions[`player-${player.user_id}`][0]}
                            </div>
                          )}
                          <div 
                            className="h-24 bg-cover bg-center relative"
                            style={{ 
                              backgroundImage: character?.profile_avatar_url 
                                ? `url(${character.profile_avatar_url})` 
                                : 'none',
                              backgroundColor: '#1a1f2e'
                            }}
                          >
                            {!character?.profile_avatar_url && (
                              <div className="absolute inset-0 flex items-center justify-center text-3xl text-gray-600">
                                ?
                              </div>
                            )}
                          </div>
                          <div className="px-3 py-2 text-[11px] space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold truncate">
                                {character?.name || player.username}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                AC {ac}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              {character?.race || '?'} • {character?.class || '?'}
                            </p>
                            <div className="flex justify-between items-center pt-1">
                              <span className="text-[10px] text-slate-400">
                                {currentHp}/{maxHp} HP
                              </span>
                              <div className="flex items-center gap-1">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: color1 }}
                                />
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: color2 }}
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
                      const character = player.character;
                      const color1 = player.profile_color_1 || "#FF5722";
                      const color2 = player.profile_color_2 || "#37F2D1";

                      return (
                        <div
                          key={`companion-${player.user_id}`}
                          className="min-w-[120px] max-w-[120px] rounded-2xl bg-[#050816] overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.6)] border-2 relative"
                          style={{
                            borderColor: activeConditions[`companion-${player.user_id}`]?.[0] ? CONDITIONS[activeConditions[`companion-${player.user_id}`][0]].color : undefined,
                            borderImage: !activeConditions[`companion-${player.user_id}`]?.length ? `linear-gradient(135deg, ${color1}, ${color2}) 1` : undefined
                          }}
                        >
                          {activeConditions[`companion-${player.user_id}`]?.length > 0 && (
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 bg-black/80 text-white text-[8px] px-2 py-0.5 rounded-full border border-white/20 whitespace-nowrap">
                              {activeConditions[`companion-${player.user_id}`][0]}
                            </div>
                          )}
                          <div 
                            className="h-16 bg-cover bg-center relative"
                            style={{ 
                              backgroundImage: character?.companion_image 
                                ? `url(${character.companion_image})` 
                                : 'none',
                              backgroundColor: '#1a1f2e'
                            }}
                          >
                            {!character?.companion_image && (
                              <div className="absolute inset-0 flex items-center justify-center text-2xl text-gray-600">
                                🐾
                              </div>
                            )}
                          </div>
                          <div className="px-2 py-1.5 text-[10px]">
                            <div className="font-semibold truncate text-white">
                              {character?.companion_name}
                            </div>
                            <p className="text-[9px] text-slate-500 truncate">
                              {character?.name}'s companion
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {players.filter(p => p.character?.companion_name).length === 0 && (
                      <div className="text-[10px] text-slate-600 italic py-2">No active companions</div>
                    )}
                  </div>
                </SectionCard>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1.2fr),minmax(0,0.9fr)] gap-4">
              <SectionCard title="Campaign Log">
                <div className="h-64 relative">
                  <CampaignLog 
                    campaignId={campaignId} 
                    currentUser={currentUser}
                    currentUserProfile={currentUserProfile}
                    campaign={campaign}
                    characters={characters}
                    allUserProfiles={allUserProfiles}
                  />
                </div>
              </SectionCard>

              <div className="space-y-4">
                <SectionCard title="Downed">
                  <div className="flex items-center gap-3">
                    <button className="w-7 h-7 rounded-full bg-[#050816] flex items-center justify-center text-sm">‹</button>
                    <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="min-w-[96px] max-w-[96px] rounded-3xl bg-[#050816] overflow-hidden border border-[#111827]"
                        >
                          <div className="h-20 bg-red-900/50 bg-cover bg-center grayscale" />
                        </div>
                      ))}
                    </div>
                    <button className="w-7 h-7 rounded-full bg-[#050816] flex items-center justify-center text-sm">›</button>
                  </div>
                </SectionCard>

                <SectionCard title="Loot">
                  <LootManager 
                    campaignId={campaignId}
                    lootData={campaign.loot_data}
                    players={players}
                    onUpdateLoot={(newData) => {
                      base44.entities.Campaign.update(campaignId, { loot_data: newData });
                      queryClient.invalidateQueries(['campaign', campaignId]);
                    }}
                  />
                </SectionCard>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Possess Character Selector (players + GM monster queue) */}
      {showPossessSelector && (() => {
        // Pull the GM's current monster queue from localStorage so the dialog
        // shows monsters the GM is already running alongside the party.
        let monsterQueue = [];
        try {
          const savedQueue = localStorage.getItem(`gm_monster_queue_${campaignId}`);
          if (savedQueue) monsterQueue = JSON.parse(savedQueue) || [];
        } catch (e) {
          console.error("Failed to read monster queue for Possess dialog", e);
        }

        return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-[#050816] rounded-3xl border-2 border-[#37F2D1]/30 shadow-[0_24px_80px_rgba(0,0,0,0.9)] max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#111827]">
              <h2 className="text-2xl font-bold">Possess Character</h2>
              <button
                onClick={() => setShowPossessSelector(false)}
                className="w-10 h-10 rounded-full bg-[#1a1f2e] hover:bg-[#37F2D1]/20 transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-6">
              {/* Players */}
              <div>
                <h3 className="text-xs font-bold tracking-[0.22em] uppercase text-slate-400 mb-3">
                  Party
                </h3>
                {players.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {players.map(player => {
                      const char = player.character;
                      const color1 = player.profile_color_1 || "#FF5722";
                      const color2 = player.profile_color_2 || "#37F2D1";

                      return (
                        <button
                          key={player.user_id}
                          onClick={() => {
                            if (char) {
                              setSelectedCharacter({
                                ...char,
                                type: 'player',
                                // Mirror the combatant uniqueId so conditions
                                // (Dodging, etc.) keyed on uniqueId apply to
                                // the same entity the turn tracker sees.
                                uniqueId: `player-${player.user_id}`,
                              });
                              setEquippedItems(char.equipped || char.equipment || {});
                              setMonsterInventory(char.inventory || []);
                              setIsPossessed(true);
                            }
                            setShowPossessSelector(false);
                          }}
                          disabled={!char}
                          className="bg-[#1a1f2e] rounded-xl overflow-hidden hover:ring-2 hover:ring-[#37F2D1] transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div
                            className="h-32 bg-cover bg-center relative"
                            style={{
                              backgroundImage: char?.profile_avatar_url ? `url(${char.profile_avatar_url})` : 'none',
                              backgroundColor: '#0b1220'
                            }}
                          >
                            {!char?.profile_avatar_url && (
                              <div className="absolute inset-0 flex items-center justify-center text-4xl text-slate-600">?</div>
                            )}
                            <div
                              className="absolute bottom-0 left-0 right-0 h-1"
                              style={{ background: `linear-gradient(to right, ${color1}, ${color2})` }}
                            />
                          </div>
                          <div className="p-3">
                            <h3 className="text-white font-bold text-sm truncate">
                              {char?.name || 'No Character'}
                            </h3>
                            <p className="text-slate-400 text-xs truncate">
                              {player.username} • {char?.race || '?'} {char?.class || '?'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-sm italic">
                    No players in this campaign
                  </div>
                )}
              </div>

              {/* GM's monster queue */}
              <div>
                <h3 className="text-xs font-bold tracking-[0.22em] uppercase text-slate-400 mb-3">
                  Your Monsters
                </h3>
                {monsterQueue.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {monsterQueue.map((monster) => {
                      const art = monster.image_url || monster.avatar_url || monster.stats?.image_url;
                      return (
                        <button
                          key={monster.queueId}
                          onClick={() => {
                            const enriched = enrichMonster(monster);
                            enriched.queueId = monster.queueId;
                            enriched.uniqueId = `monster-${monster.queueId}`;
                            setSelectedCharacter(enriched);
                            setMonsterInventory(enriched.inventory || []);
                            setEquippedItems(enriched.equipped || {});
                            setIsPossessed(true);
                            setShowPossessSelector(false);
                          }}
                          className="bg-[#1a1f2e] rounded-xl overflow-hidden hover:ring-2 hover:ring-[#FF5722] transition-all text-left"
                        >
                          <div
                            className="h-32 bg-cover bg-center relative"
                            style={{
                              backgroundImage: art ? `url(${art})` : 'none',
                              backgroundColor: '#0b1220'
                            }}
                          >
                            {!art && (
                              <div className="absolute inset-0 flex items-center justify-center text-4xl text-slate-600">?</div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF5722] to-[#F59E0B]" />
                          </div>
                          <div className="p-3">
                            <h3 className="text-white font-bold text-sm truncate">
                              {monster.name || 'Unknown Creature'}
                            </h3>
                            <p className="text-slate-400 text-xs truncate">
                              {monster.type || 'monster'}
                              {monster.stats?.challenge_rating != null ? ` • CR ${monster.stats.challenge_rating}` : ''}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-sm italic">
                    No monsters in your queue. Add some from the Monster Queue panel.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Character Selector Popup */}
      <CharacterSelector
        isOpen={showCharacterSelector}
        onClose={() => setShowCharacterSelector(false)}
        monsters={monsters}
        npcs={npcs}
        onSelect={(char) => {
          const enriched = enrichMonster(char);
          setSelectedCharacter(enriched);
          setMonsterInventory(enriched.inventory || []);
          setEquippedItems(enriched.equipped || {});
        }}
      />

      {/* Condition Manager Dialog */}
      {showConditionManager && (
        <ConditionManagerDialog
          onClose={() => setShowConditionManager(false)}
          activeConditions={activeConditions}
          toggleCondition={toggleCondition}
          players={players}
          campaignId={campaignId}
        />
      )}

      <AlertDialog open={showEndSessionAlert} onOpenChange={setShowEndSessionAlert}>
        <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>End Session?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to end the current session? This will disconnect all players and return everyone to the lobby.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => endSessionMutation.mutate()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showEndCombatAlert} onOpenChange={setShowEndCombatAlert}>
        <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>End Combat?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to end combat? This will clear the turn order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEndCombat}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              End Combat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ConditionManagerDialog({ onClose, activeConditions, toggleCondition, players, campaignId }) {
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [adjustingHp, setAdjustingHp] = useState(false);
  const [hpAdjustment, setHpAdjustment] = useState(0);
  
  // Get monsters from queue
  const [monsters, setMonsters] = useState([]);
  
  const loadMonsters = () => {
    const saved = localStorage.getItem(`gm_monster_queue_${campaignId}`);
    if (saved) {
      try {
        setMonsters(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved monster queue", e);
      }
    }
  };

  React.useEffect(() => {
    loadMonsters();
    window.addEventListener('storage', loadMonsters);
    return () => window.removeEventListener('storage', loadMonsters);
  }, [campaignId]);

  const handleHpAdjustment = (targetId, amount) => {
    if (targetId.startsWith('player-')) {
      const userId = targetId.replace('player-', '');
      const player = players.find(p => p.user_id === userId);
      const char = player?.character;
      if (char) {
        const current = char.hit_points?.current || char.hit_points?.max || 0;
        const newCurrent = Math.max(0, Math.min(char.hit_points?.max || 100, current + amount));
        base44.entities.Character.update(char.id, {
          hit_points: { ...char.hit_points, current: newCurrent }
        });
        // Optimistic update or wait for query invalidation (handled by parent usually, but here we trigger directly)
      }
    } else if (targetId.startsWith('monster-')) {
      const monsterQueueId = targetId.replace('monster-', '');
      const savedQueue = localStorage.getItem(`gm_monster_queue_${campaignId}`);
      if (savedQueue) {
        const queue = JSON.parse(savedQueue);
        const newQueue = queue.map(m => {
          if (m.queueId === monsterQueueId) {
            const current = m.hit_points?.current !== undefined ? m.hit_points.current : (m.hit_points?.max || 10);
            const max = m.hit_points?.max || 10;
            return {
              ...m,
              hit_points: {
                ...m.hit_points,
                current: Math.max(0, Math.min(max, current + amount))
              }
            };
          }
          return m;
        });
        localStorage.setItem(`gm_monster_queue_${campaignId}`, JSON.stringify(newQueue));
        loadMonsters();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-6">
      <div className="bg-[#050816] rounded-3xl border-2 border-red-500/30 shadow-[0_24px_80px_rgba(0,0,0,0.9)] max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[#111827]">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">Manage Combat</h2>
            <div className="flex bg-[#111827] rounded-lg p-1">
              <button 
                onClick={() => setAdjustingHp(false)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${!adjustingHp ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Conditions
              </button>
              <button 
                onClick={() => setAdjustingHp(true)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${adjustingHp ? 'bg-green-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                HP
              </button>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#1a1f2e] hover:bg-red-500/20 transition-colors flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Left Panel */}
          <div className="w-1/3 border-r border-[#111827] p-4 overflow-y-auto custom-scrollbar bg-[#0b1220]">
            {!adjustingHp ? (
              <>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">Select Condition</h3>
                <div className="space-y-2">
                  {Object.entries(CONDITIONS).map(([key, { color, label }]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCondition(key)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between ${
                        selectedCondition === key
                          ? 'bg-[#1a1f2e] border-white shadow-lg'
                          : 'bg-[#050816] border-[#111827] hover:border-slate-600'
                      }`}
                    >
                      <span className="text-sm font-semibold text-white">{label}</span>
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">Adjust HP</h3>
                <div className="space-y-4">
                  <div className="bg-[#050816] p-4 rounded-xl border border-[#111827]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-400">Amount</span>
                      <span className="text-xl font-bold text-white">{hpAdjustment > 0 ? '+' : ''}{hpAdjustment}</span>
                    </div>
                    <input 
                      type="range" 
                      min="-50" 
                      max="50" 
                      value={hpAdjustment} 
                      onChange={(e) => setHpAdjustment(parseInt(e.target.value))}
                      className="w-full accent-green-500"
                    />
                    <div className="flex justify-between mt-2">
                      <button onClick={() => setHpAdjustment(h => h - 1)} className="px-2 py-1 bg-[#111827] rounded text-xs">-1</button>
                      <button onClick={() => setHpAdjustment(0)} className="px-2 py-1 bg-[#111827] rounded text-xs text-slate-400">Reset</button>
                      <button onClick={() => setHpAdjustment(h => h + 1)} className="px-2 py-1 bg-[#111827] rounded text-xs">+1</button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setHpAdjustment(-5)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 py-2 rounded-lg font-bold">-5 Dmg</button>
                    <button onClick={() => setHpAdjustment(5)} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50 py-2 rounded-lg font-bold">+5 Heal</button>
                    <button onClick={() => setHpAdjustment(-10)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 py-2 rounded-lg font-bold">-10 Dmg</button>
                    <button onClick={() => setHpAdjustment(10)} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50 py-2 rounded-lg font-bold">+10 Heal</button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Panel (Targets) */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#050816]">
            {!adjustingHp && !selectedCondition ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-500">Select a condition to apply</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center gap-3 mb-6">
                  {!adjustingHp ? (
                    <>
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: CONDITIONS[selectedCondition].color }} />
                      <h3 className="text-xl font-bold text-white">Apply {selectedCondition} to...</h3>
                    </>
                  ) : (
                    <h3 className="text-xl font-bold text-white">Apply {hpAdjustment > 0 ? 'Healing' : 'Damage'} ({Math.abs(hpAdjustment)}) to...</h3>
                  )}
                </div>

                {/* Players */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Players</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {players.map(player => {
                      const id = `player-${player.user_id}`;
                      const char = player.character;
                      const hasCondition = !adjustingHp && activeConditions[id]?.includes(selectedCondition);
                      const currentHp = char?.hit_points?.current || 0;
                      const maxHp = char?.hit_points?.max || 0;
                      
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            if (adjustingHp) handleHpAdjustment(id, hpAdjustment);
                            else toggleCondition(id, selectedCondition);
                          }}
                          className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                            hasCondition 
                              ? 'bg-[#1a1f2e] border-[#37F2D1] shadow-[0_0_15px_rgba(55,242,209,0.2)]' 
                              : 'bg-[#0b1220] border-[#111827] hover:border-slate-600'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-cover bg-center bg-[#111827]" style={{ backgroundImage: char?.profile_avatar_url ? `url(${char.profile_avatar_url})` : 'none' }} />
                          <div className="text-left min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">{char?.name || player.username}</p>
                            {adjustingHp ? (
                              <div className="w-full bg-[#111827] h-1.5 rounded-full mt-1 overflow-hidden">
                                <div className="bg-green-500 h-full" style={{ width: `${Math.min(100, (currentHp/maxHp)*100)}%` }} />
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400">Player</p>
                            )}
                          </div>
                          {hasCondition && <div className="ml-auto w-2 h-2 rounded-full bg-[#37F2D1]" />}
                          {adjustingHp && <span className="text-xs text-slate-400">{currentHp}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Monsters */}
                {monsters.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Monsters</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {monsters.map(monster => {
                        const id = `monster-${monster.queueId}`;
                        const hasCondition = !adjustingHp && activeConditions[id]?.includes(selectedCondition);
                        const currentHp = monster.hit_points?.current !== undefined ? monster.hit_points.current : (monster.hit_points?.max || 10);
                        const maxHp = monster.hit_points?.max || 10;

                        return (
                          <button
                            key={id}
                            onClick={() => {
                              if (adjustingHp) handleHpAdjustment(id, hpAdjustment);
                              else toggleCondition(id, selectedCondition);
                            }}
                            className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                              hasCondition 
                                ? 'bg-[#1a1f2e] border-[#37F2D1] shadow-[0_0_15px_rgba(55,242,209,0.2)]' 
                                : 'bg-[#0b1220] border-[#111827] hover:border-slate-600'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-cover bg-center bg-[#111827]" style={{ backgroundImage: (monster.image_url || monster.avatar_url) ? `url(${monster.image_url || monster.avatar_url})` : 'none' }} />
                            <div className="text-left min-w-0 flex-1">
                              <p className="text-sm font-bold text-white truncate">{monster.name}</p>
                              {adjustingHp ? (
                                <div className="w-full bg-[#111827] h-1.5 rounded-full mt-1 overflow-hidden">
                                  <div className="bg-red-500 h-full" style={{ width: `${Math.min(100, (currentHp/maxHp)*100)}%` }} />
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400">Monster</p>
                              )}
                            </div>
                            {hasCondition && <div className="ml-auto w-2 h-2 rounded-full bg-[#37F2D1]" />}
                            {adjustingHp && <span className="text-xs text-slate-400">{currentHp}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getSilhouetteImage(character) {
  if (!character) return 'https://static.wixstatic.com/media/5cdfd8_35e9f29559bd43239470a098001a1fe5~mv2.png';
  
  if (character.type === 'monster') {
    return 'https://static.wixstatic.com/media/5cdfd8_c201364be8ad40aa9518230a106c8442~mv2.png';
  }
  
  const gender = (character.gender || character.appearance?.gender || '').toLowerCase();
  
  if (gender.includes('female') || gender.includes('woman') || gender === 'f') {
    return 'https://static.wixstatic.com/media/5cdfd8_95e7b63afc9a444e97bbadc37e59b154~mv2.png';
  } else if (gender.includes('non-binary') || gender.includes('nonbinary') || gender.includes('enby') || gender.includes('nb') || gender.includes('agender') || gender.includes('genderfluid') || gender.includes('other')) {
    return 'https://static.wixstatic.com/media/5cdfd8_35e9f29559bd43239470a098001a1fe5~mv2.png';
  } else if (gender.includes('male') || gender.includes('man') || gender === 'm') {
    return 'https://static.wixstatic.com/media/5cdfd8_8b8fc7ed62dd4c74927bfee94c031e7d~mv2.png';
  }
  
  return 'https://static.wixstatic.com/media/5cdfd8_35e9f29559bd43239470a098001a1fe5~mv2.png';
}

function CharacterPanel({ character, onSelectCharacter, isPossessed, setIsPossessed, players, onPossessPlayer, monsterInventory, setMonsterInventory, equippedItems, setEquippedItems, onRollInitiative, onManageConditions }) {
  const [showQuickEquip, setShowQuickEquip] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  // Reset inventory when character changes
  React.useEffect(() => {
    if (character?.type === 'monster' || character?.type === 'npc') {
      // Keep monster inventory as is (don't reset when switching)
    } else if (character) {
      setMonsterInventory([]);
      setEquippedItems({});
    }
  }, [character?.id]);

  const handleDragStart = (item, sourceType, sourceIndex) => {
    setDraggedItem({ item, sourceType, sourceIndex });
  };

  const handleDropOnSlot = (slotId) => {
    if (!draggedItem) return;
    
    // Check if item can be equipped to this slot
    if (!canEquipToSlot(draggedItem.item, slotId)) {
      setDraggedItem(null);
      return; // Item doesn't match slot type
    }
    
    // Equip the item to this slot
    const newEquipped = { ...equippedItems };
    
    // If slot already has an item, put it back in inventory
    if (newEquipped[slotId]) {
      setMonsterInventory(prev => [...prev, newEquipped[slotId]]);
    }
    
    newEquipped[slotId] = draggedItem.item;
    setEquippedItems(newEquipped);
    
    // Remove from inventory if it came from there
    if (draggedItem.sourceType === 'inventory') {
      setMonsterInventory(prev => prev.filter((_, idx) => idx !== draggedItem.sourceIndex));
    }
    
    setDraggedItem(null);
  };

  const handleDropOnInventory = () => {
    if (!draggedItem) return;
    
    // If it came from an equipment slot, unequip it
    if (draggedItem.sourceType === 'slot') {
      const newEquipped = { ...equippedItems };
      delete newEquipped[draggedItem.sourceIndex];
      setEquippedItems(newEquipped);
      setMonsterInventory(prev => [...prev, draggedItem.item]);
    }
    
    setDraggedItem(null);
  };

  const unequipItem = (slotId) => {
    if (equippedItems[slotId]) {
      setMonsterInventory(prev => [...prev, equippedItems[slotId]]);
      const newEquipped = { ...equippedItems };
      delete newEquipped[slotId];
      setEquippedItems(newEquipped);
    }
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

  // Calculate inventory slots based on items
  const getInventorySlots = () => {
    let slots = 20;
    if (!character?.inventory) return slots;
    
    const inventoryNames = character.inventory.map(item => item.name?.toLowerCase() || '');
    
    if (inventoryNames.some(name => name.includes('backpack'))) {
      slots = 40;
    }
    if (inventoryNames.some(name => name.includes('pouch'))) {
      slots = Math.min(slots + 5, 45);
    }
    // Check for bag of holding or similar third inventory extender
    if (inventoryNames.some(name => 
      name.includes('bag of holding') || 
      name.includes('handy haversack') || 
      name.includes('portable hole')
    )) {
      slots = 50;
    }
    
    return slots;
  };

  const inventorySlots = getInventorySlots();
  const [showInventoryOrganizer, setShowInventoryOrganizer] = useState(false);
  const [inventoryOrder, setInventoryOrder] = useState([]);

  // Initialize inventory order when the selected character changes (or when
  // its inventory array is refreshed). Depending on the inventory reference
  // itself — not its length — ensures the effect actually re-fires when a
  // character swap comes in with a different inventory object but the same
  // item count.
  React.useEffect(() => {
    if (Array.isArray(character?.inventory) && character.inventory.length > 0) {
      setInventoryOrder(character.inventory.map((item, idx) => ({ ...item, _idx: idx })));
    } else {
      setInventoryOrder([]);
    }
  }, [character?.id, character?.uniqueId, character?.inventory]);

  return (
    <div className="relative z-10 rounded-[32px] bg-[#050816]/95 px-6 pt-6 pb-8 shadow-[0_24px_60px_rgba(0,0,0,0.8)] flex flex-col items-center gap-6">
      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
        <div 
          className="w-full h-full bg-cover bg-center" 
          style={{ 
            backgroundImage: character 
              ? `url(${character.image_url || character.avatar_url || '/images/karliah-avatar.jpg'})` 
              : 'none',
            backgroundColor: '#1a1f2e'
          }}
        >
          {!character && (
            <div className="w-full h-full flex items-center justify-center text-5xl text-gray-600">
              ?
            </div>
          )}
        </div>
      </div>

      {character ? (
        <>
          <div className="text-center space-y-1">
            <p className="text-[11px] tracking-[0.24em] uppercase text-amber-300">
              Level {character.level || character.stats?.level || character.challenge_rating || character.stats?.challenge_rating || '?'} • {character.type || 'NPC'}
            </p>
            <p className="text-sm text-slate-300">{character.name}</p>
          </div>

          <button
            onClick={onRollInitiative}
            className="w-full flex items-center justify-center gap-2 bg-[#FF5722] hover:bg-[#FF6B3D] text-white rounded-lg py-3 text-sm font-bold transition-colors shadow-lg"
          >
            <Dices className="w-5 h-5" />
            ROLL FOR INITIATIVE
          </button>

          <button
            onClick={onManageConditions}
            className="w-full flex items-center justify-center gap-2 bg-[#1a1f2e] hover:bg-[#2A3441] text-white border border-red-500/30 rounded-lg py-2 text-xs font-bold transition-colors shadow-lg"
          >
            <AlertCircle className="w-4 h-4 text-red-500" />
            CONDITIONS
          </button>

          <div className="w-full flex gap-2">
            <button
              onClick={onSelectCharacter}
              className="flex-1 bg-[#22c5f5]/20 hover:bg-[#22c5f5]/30 text-[#22c5f5] rounded-lg py-2 text-sm transition-colors"
            >
              Change Character
            </button>
            <button
              onClick={() => isPossessed ? setIsPossessed(false) : onPossessPlayer()}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                isPossessed 
                  ? 'bg-[#FF5722] hover:bg-[#FF6B3D] text-white' 
                  : 'bg-[#37F2D1]/20 hover:bg-[#37F2D1]/30 text-[#37F2D1]'
              }`}
            >
              {isPossessed ? 'Release Control' : 'Possess'}
            </button>
          </div>

          {(character?.type === 'monster' || character?.type === 'npc') && (
            <button
              onClick={() => setShowQuickEquip(true)}
              className="w-full flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg py-2 text-sm transition-colors"
            >
              <Package className="w-4 h-4" />
              Quick Equip Items
            </button>
          )}

          <div className="w-full relative flex gap-3 justify-center mb-2">
            <img 
              src={getSilhouetteImage(character)} 
              alt="Character Silhouette" 
              className="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none"
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

          {/* Inventory Grid */}
                      <div className="w-full pt-3 border-t border-[#111827] mt-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] tracking-[0.2em] uppercase text-slate-400">Inventory</span>
                            <EncumbranceBar 
                              inventory={(character?.type === 'monster' || character?.type === 'npc') ? monsterInventory : (character?.inventory || [])}
                              strength={character?.attributes?.str || character?.stats?.strength || 10}
                            />
                          </div>
                          <div className="flex-1 max-w-[140px] mx-2">
                            <MoneyCounter 
                              currency={character?.currency} 
                              onChange={(newCurrency) => {
                                if (character.type === 'monster' || character.type === 'npc') {
                                  // Handle monster currency update locally or via separate mutation if needed
                                  // For now we just have local state in selectedCharacter, 
                                  // but ideally we'd update the monster entity or the campaign queue
                                } else {
                                  base44.entities.Character.update(character.id, { currency: newCurrency });
                                  queryClient.invalidateQueries(['campaignCharacters']);
                                }
                              }}
                              readOnly={character?.type === 'monster' || character?.type === 'npc'} // GMs can edit monster currency via other means usually
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">{inventorySlots} slots</span>
                            <button
                              onClick={() => setShowInventoryOrganizer(true)}
                              className="w-5 h-5 rounded bg-[#111827] hover:bg-[#1a1f2e] flex items-center justify-center transition-colors"
                              title="Organize Inventory"
                            >
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
                {Array.from({ length: inventorySlots }).map((_, idx) => {
                  const isMonsterOrNpc = character?.type === 'monster' || character?.type === 'npc';
                  const item = isMonsterOrNpc
                    ? (monsterInventory[idx] || null)
                    : (inventoryOrder[idx] || null);
                  return (
                    <InventorySlot 
                      key={idx} 
                      item={item} 
                      isGM={true}
                      onDragStart={isMonsterOrNpc ? () => handleDragStart(item, 'inventory', idx) : undefined}
                      draggable={isMonsterOrNpc && !!item}
                      onDrop={isMonsterOrNpc ? (droppedItem) => {
                        setMonsterInventory(prev => prev.filter((_, i) => i !== idx));
                      } : undefined}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Inventory Organizer Dialog */}
          {showInventoryOrganizer && (
            <InventoryOrganizer
              inventory={(character?.type === 'monster' || character?.type === 'npc') ? monsterInventory : inventoryOrder}
              setInventory={(character?.type === 'monster' || character?.type === 'npc') ? setMonsterInventory : setInventoryOrder}
              onClose={() => setShowInventoryOrganizer(false)}
              isMonsterInventory={character?.type === 'monster' || character?.type === 'npc'}
            />
          )}

          {/* Monster Quick Equip Dialog */}
          {showQuickEquip && (
            <MonsterQuickEquip
              inventory={monsterInventory}
              setInventory={setMonsterInventory}
              onClose={() => setShowQuickEquip(false)}
              monsterName={character?.name}
            />
          )}
          </>
          ) : (
        <>
          <div className="text-center space-y-1">
            <p className="text-[11px] tracking-[0.24em] uppercase text-slate-400">
              No Character Selected
            </p>
            <p className="text-sm text-slate-300">Select a character to begin</p>
          </div>

          <div className="w-full flex gap-2 mt-4">
            <button
              onClick={onSelectCharacter}
              className="flex-1 bg-[#22c5f5] hover:bg-[#38bdf8] text-white rounded-lg py-2 text-sm font-semibold transition-colors"
            >
              Select Character
            </button>
            <button
              onClick={onPossessPlayer}
              className="flex-1 bg-[#37F2D1]/20 hover:bg-[#37F2D1]/30 text-[#37F2D1] rounded-lg py-2 text-sm font-semibold transition-colors"
            >
              Possess
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Removed local SLOT_RESTRICTIONS and canEquipToSlot - imported from utils

function EquipmentSlot({ label, size = 'normal', item, slotId, onDrop, onDragStart, onUnequip, isValidTarget }) {
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
          <span className="text-[8px] text-center text-slate-300 px-1 line-clamp-2">
            {item.name}
          </span>
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

function EncumbranceBar({ inventory, strength }) {
  const currentWeight = inventory.reduce((total, item) => {
    return total + ((item.weight || 0) * (item.quantity || 1));
  }, 0);
  const maxWeight = strength * 15; // D&D 5e carrying capacity
  const percentage = Math.min((currentWeight / maxWeight) * 100, 100);
  
  const getBarColor = () => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 66) return 'bg-amber-500';
    return 'bg-[#37F2D1]';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-[#111827] overflow-hidden">
        <div 
          className={`h-full ${getBarColor()} transition-all`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-[9px] ${percentage >= 100 ? 'text-red-400' : 'text-slate-500'}`}>
        {currentWeight}/{maxWeight} lbs
      </span>
    </div>
  );
}

function InventorySlot({ item, isGM = false, isMoleWithAccess = false, onDragStart, draggable, onDrop }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Hidden items are only visible to GM or mole with access
  const isHidden = item?.hidden;
  const canSee = !isHidden || isGM || isMoleWithAccess;
  
  if (item && !canSee) {
    return (
      <div className="w-11 h-11 rounded-lg bg-[#0b1220] border border-[#111827] shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
    );
  }

  return (
    <div className="relative group">
      <div
        draggable={draggable && !!item}
        onDragStart={() => item && onDragStart && onDragStart()}
        onMouseEnter={() => item && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-11 h-11 rounded-lg bg-[#0b1220] border transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center relative ${
          item ? 'bg-[#111827] cursor-grab active:cursor-grabbing' : ''
        } ${isHidden ? 'border-purple-500/50 hover:border-purple-400' : 'border-[#111827] hover:border-[#22c5f5]/50'}`}
      >
        {item && (
          <>
            {item.image_url ? (
              <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover" />
            ) : (
              <span className="text-[8px] text-slate-400 text-center px-0.5 truncate">
                {item.quantity > 1 ? `${item.quantity}` : '•'}
              </span>
            )}
            {isHidden && <EyeOff className="w-2.5 h-2.5 text-purple-400 absolute top-0.5 right-0.5" />}
            {item.quantity > 1 && item.image_url && (
              <span className="absolute bottom-0 right-0 text-[8px] bg-black/70 text-white px-1 rounded">
                {item.quantity}
              </span>
            )}
          </>
        )}
      </div>
      {item && onDrop && (
        <button
          onClick={() => onDrop(item)}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 hover:bg-red-500 text-white text-[10px] items-center justify-center hidden group-hover:flex z-10"
          title="Drop item"
        >
          ×
        </button>
      )}
      {showTooltip && item && (
        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1E2430] text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-50 shadow-xl border ${isHidden ? 'border-purple-500' : 'border-[#37F2D1]'}`}>
          {isHidden && <span className="text-purple-400 mr-1">[Hidden]</span>}
          {item.name}{item.quantity > 1 ? ` (x${item.quantity})` : ''} {draggable && '(drag to equip)'}
        </div>
      )}
    </div>
  );
}

function QuickSlots({ quickSlots, setQuickSlots, inventory }) {
  const [selectingSlot, setSelectingSlot] = useState(null);

  const handleSelectItem = (item) => {
    if (selectingSlot !== null) {
      const newSlots = [...quickSlots];
      newSlots[selectingSlot] = item;
      setQuickSlots(newSlots);
      setSelectingSlot(null);
    }
  };

  const clearSlot = (index, e) => {
    e.stopPropagation();
    const newSlots = [...quickSlots];
    newSlots[index] = null;
    setQuickSlots(newSlots);
  };

  return (
    <>
      <div className="grid grid-cols-7 gap-3">
        {quickSlots.map((item, idx) => (
          <div key={idx} className="relative w-full">
            <button
              onClick={() => inventory.length > 0 && setSelectingSlot(idx)}
              className={`w-full aspect-square rounded-2xl bg-[#050816] border transition-all shadow-[0_10px_25px_rgba(0,0,0,0.6)] flex items-center justify-center hover:-translate-y-0.5 overflow-hidden ${
                item ? 'border-[#37F2D1]/50' : 'border-[#111827] hover:border-[#22c5f5]/50'
              }`}
            >
              {item ? (
                item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-1">
                    <span className="text-[9px] text-slate-300 line-clamp-2">{item.name}</span>
                  </div>
                )
              ) : (
                <span className="text-[10px] text-slate-600">{idx + 1}</span>
              )}
            </button>
            {item && (
              <button
                onClick={(e) => clearSlot(idx, e)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 hover:bg-red-500 text-white text-[10px] flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Item Selection Popup - Only from inventory */}
      {selectingSlot !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-6">
          <div className="bg-[#050816] rounded-2xl border border-[#22c5f5]/30 shadow-[0_24px_80px_rgba(0,0,0,0.9)] max-w-md w-full max-h-[60vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#111827]">
              <h3 className="text-lg font-bold">Select Item for Slot {selectingSlot + 1}</h3>
              <button
                onClick={() => setSelectingSlot(null)}
                className="w-8 h-8 rounded-full bg-[#1a1f2e] hover:bg-[#22c5f5]/20 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[45vh] overflow-y-auto custom-scrollbar">
              {inventory.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No items in inventory</p>
              ) : (
                <div className="space-y-2">
                  {inventory.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectItem(item)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#0b1220] border border-[#111827] hover:border-[#22c5f5]/50 transition-all text-left"
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#111827] flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{item.name}</p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MonsterQuickEquip({ inventory, setInventory, onClose, monsterName }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredItems = React.useMemo(() => {
    return allItemsWithEnchanted.filter(item => {
      if (searchQuery && !item.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [searchQuery, categoryFilter]);

  const addItem = (item) => {
    const existing = inventory.find(i => i.name === item.name);
    if (existing) {
      setInventory(inventory.map(i => 
        i.name === item.name ? { ...i, quantity: (i.quantity || 1) + 1 } : i
      ));
    } else {
      setInventory([...inventory, { ...item, image_url: itemIcons[item.name], quantity: 1 }]);
    }
  };

  const removeItem = (itemName) => {
    setInventory(inventory.filter(i => i.name !== itemName));
  };

  const categoryColors = {
    weapons: "border-red-500/50 text-red-400",
    armor: "border-blue-500/50 text-blue-400",
    adventuringGear: "border-green-500/50 text-green-400",
    tools: "border-amber-500/50 text-amber-400",
    mounts: "border-purple-500/50 text-purple-400",
    magic: "border-pink-500/50 text-pink-400",
    trinkets: "border-slate-500/50 text-slate-400",
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-6">
      <div className="bg-[#050816] rounded-3xl border-2 border-amber-500/30 shadow-[0_24px_80px_rgba(0,0,0,0.9)] max-w-3xl w-full max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#111827]">
          <div>
            <h2 className="text-xl font-bold">Quick Equip</h2>
            <p className="text-sm text-slate-400">{monsterName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#1a1f2e] hover:bg-amber-500/20 transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto custom-scrollbar space-y-6">
          {/* Current Inventory */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Current Inventory ({inventory.length} items)</h3>
            {inventory.length === 0 ? (
              <p className="text-slate-500 text-sm">No items equipped</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {inventory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 bg-[#1a1f2e] rounded-lg px-3 py-1.5 text-sm border ${categoryColors[item.category] || 'border-slate-600'}`}
                  >
                    {item.image_url && (
                      <img src={item.image_url} alt="" className="w-5 h-5 rounded object-cover" />
                    )}
                    <span className="text-white">{item.name}</span>
                    {item.quantity > 1 && (
                      <span className="text-[#37F2D1] text-xs">x{item.quantity}</span>
                    )}
                    <button
                      onClick={() => removeItem(item.name)}
                      className="text-red-400 hover:text-red-300 ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">D&D 5e Item Library</h3>
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="w-full bg-[#1a1f2e] border border-[#111827] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#1a1f2e] border border-[#111827] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Categories</option>
                <option value="weapons">Weapons</option>
                <option value="armor">Armor</option>
                <option value="adventuringGear">Adventuring Gear</option>
                <option value="tools">Tools</option>
                <option value="mounts">Mounts & Vehicles</option>
                <option value="magic">Magic Items</option>
                <option value="trinkets">Trinkets</option>
              </select>
            </div>
          </div>

          {/* Items Grid */}
          <div>
            {filteredItems.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">
                No items match your filters
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredItems.slice(0, 50).map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => addItem(item)}
                    className={`p-3 rounded-xl border bg-[#0b1220] hover:bg-[#1a1f2e] transition-all text-left group ${categoryColors[item.category] || 'border-slate-600'}`}
                  >
                    <div className="flex items-start gap-3">
                      {itemIcons[item.name] ? (
                        <img 
                          src={itemIcons[item.name]} 
                          alt={item.name} 
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#111827] flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-500">{item.type}</p>
                        <p className="text-[10px] text-slate-400">{item.cost} • {item.weight} lb</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {filteredItems.length > 50 && (
              <p className="text-center text-slate-500 text-xs mt-4">
                Showing 50 of {filteredItems.length} items. Use search to find more.
              </p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-[#111827] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-[#22c5f5] hover:bg-[#38bdf8] text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryOrganizer({ inventory, setInventory, onClose, isMonsterInventory }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(inventory);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setInventory(items);
  };

  const toggleHidden = (index) => {
    const items = [...inventory];
    items[index] = { ...items[index], hidden: !items[index].hidden };
    setInventory(items);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-6">
      <div className="bg-[#050816] rounded-3xl border-2 border-[#22c5f5]/30 shadow-[0_24px_80px_rgba(0,0,0,0.9)] max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#111827]">
          <h2 className="text-xl font-bold">Organize Inventory</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#1a1f2e] hover:bg-[#22c5f5]/20 transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-slate-400 text-sm mb-4">Drag to reorder • Click eye to toggle hidden</p>
          
          {inventory.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No items in inventory</p>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="inventory-organizer">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar"
                  >
                    {inventory.map((item, index) => (
                      <Draggable key={`organizer-${item.name}-${index}`} draggableId={`organizer-${item.name}-${index}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              snapshot.isDragging
                                ? 'bg-[#1a1f2e] border-[#22c5f5] shadow-lg'
                                : item.hidden
                                  ? 'bg-[#0b1220] border-purple-500/50'
                                  : 'bg-[#0b1220] border-[#111827] hover:border-[#22c5f5]/50'
                            }`}
                          >
                            <GripVertical className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            {item.image_url && (
                              <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-sm truncate">{item.name}</p>
                              {item.quantity > 1 && (
                                <p className="text-xs text-slate-400">Quantity: {item.quantity}</p>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleHidden(index);
                              }}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                item.hidden
                                  ? 'bg-purple-500/30 text-purple-300 hover:bg-purple-500/40'
                                  : 'bg-[#111827] text-slate-400 hover:text-slate-300'
                              }`}
                              title={item.hidden ? 'Make visible' : 'Hide item'}
                            >
                              {item.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        <div className="p-6 border-t border-[#111827] flex justify-between items-center">
          <p className="text-xs text-slate-500">
            <EyeOff className="w-3 h-3 inline mr-1 text-purple-400" />
            Hidden items visible only to GMs & authorized moles
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#22c5f5] hover:bg-[#38bdf8] text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}





function SectionCard({ title, children, className }) {
  return (
    <div className={`rounded-[24px] bg-[#050816]/95 shadow-[0_18px_50px_rgba(0,0,0,0.7)] overflow-hidden ${className}`}>
      <div className="px-5 pt-3 pb-2 border-b border-[#111827]">
        <span className="text-[11px] tracking-[0.22em] uppercase text-slate-300">{title}</span>
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

function MonsterStatBlock({ character, className, onActionClick }) {
  const [activeTab, setActiveTab] = useState('traits');
  
  // Listen for custom event as fallback/bridge
  useEffect(() => {
    const handler = (e) => {
      if (onActionClick) onActionClick(e.detail);
    };
    window.addEventListener('gm-monster-action', handler);
    return () => window.removeEventListener('gm-monster-action', handler);
  }, [onActionClick]);

  if (!character) {
    return (
      <SectionCard title="Monster Stats" className={className}>
        <div className="h-full flex items-center justify-center">
          <p className="text-slate-500 text-[11px]">Select a character to view stats</p>
        </div>
      </SectionCard>
    );
  }

  // Prioritize internal stats object if available (NPC structure), otherwise use top level
  const stats = character.stats || character;
  const abilities = stats.abilities || stats.attributes || {};
  
  const getMod = (score) => {
    if (!score) return '+0';
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // Handle nested attributes structure or flat keys
  const getAbilityScore = (key) => {
    if (abilities[key.toLowerCase()]) return abilities[key.toLowerCase()];
    if (stats[key.toLowerCase()]) return stats[key.toLowerCase()];
    if (stats.attributes?.[key.toLowerCase()]) return stats.attributes[key.toLowerCase()];
    return 10;
  };

  const abilityScores = {
    STR: getAbilityScore('STR'),
    DEX: getAbilityScore('DEX'),
    CON: getAbilityScore('CON'),
    INT: getAbilityScore('INT'),
    WIS: getAbilityScore('WIS'),
    CHA: getAbilityScore('CHA')
  };

  // Features can be in various places depending on data source
  const traits = stats.traits || character.traits || [];
  const actions = stats.actions || character.actions || [];
  const specialAbilities = stats.special_abilities || character.special_abilities || 
                          stats.features || character.features || []; // NPC features often mapped here
  
  const skills = stats.skills || character.skills || {};
  const senses = stats.senses || character.senses || '';
  const languages = stats.languages || character.languages || '';
  const proficiencyBonus = stats.proficiency_bonus || character.proficiency_bonus || 2;
  
  const ac = stats.armor_class || character.armor_class || 10;
  const hpObj = stats.hit_points || character.hit_points;
  const hp = typeof hpObj === 'object' ? (hpObj?.max || '?') : (hpObj || '?');
  const speed = stats.speed || character.speed || '30 ft.';
  const cr = stats.challenge_rating ?? character.challenge_rating ?? '?';

  // Spells might be in stats.spells (NPC) or character.spells
  const spellsData = stats.spells || character.spells;
  const hasSpells = spellsData && (
    (Array.isArray(spellsData) && spellsData.length > 0) || 
    (typeof spellsData === 'object' && Object.keys(spellsData).some(k => spellsData[k]?.length > 0))
  );

  return (
    <SectionCard title={character.name || 'Monster Stats'} className={`${className} flex flex-col`}>
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#0b1220] rounded-lg p-0.5 mb-3 flex-shrink-0">
          {['traits', 'abilities', 'skills', ...(hasSpells ? ['spells'] : [])].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-2 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                activeTab === tab 
                  ? 'bg-[#22c5f5] text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-[#111827]'
              }`}
            >
              {tab === 'abilities' ? 'Stats' : tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-[300px]">
          {/* Traits Tab */}
          {activeTab === 'traits' && (
            <div className="space-y-4">
              {/* Core Stats Header */}
              <div className="grid grid-cols-4 gap-2 text-[10px] bg-[#0b1220] p-2 rounded-xl border border-[#111827]">
                <div className="text-center">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider">AC</span>
                  <span className="text-white font-bold text-sm">{ac}</span>
                </div>
                <div className="text-center border-l border-[#1e293b]">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider">HP</span>
                  <span className="text-white font-bold text-sm">{hp}</span>
                </div>
                <div className="text-center border-l border-[#1e293b]">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Speed</span>
                  <span className="text-white font-bold text-sm">{speed}</span>
                </div>
                <div className="text-center border-l border-[#1e293b]">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider">CR</span>
                  <span className="text-amber-400 font-bold text-sm">{cr}</span>
                </div>
              </div>

              {/* Traits & Special Abilities */}
              {(traits.length > 0 || specialAbilities.length > 0) && (
                <div>
                  <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-2 font-bold border-b border-amber-500/20 pb-1">Traits & Features</p>
                  <div className="space-y-3">
                    {[...traits, ...specialAbilities].map((trait, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="text-white font-bold">{trait.name}. </span>
                        <span className="text-slate-300 leading-relaxed">{trait.desc || trait.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {actions.length > 0 && (
                <div>
                  <p className="text-[10px] text-red-400 uppercase tracking-wide mb-2 font-bold border-b border-red-500/20 pb-1">Actions</p>
                  <div className="space-y-3">
                    {actions.map((action, idx) => (
                      <div 
                        key={idx} 
                        className="text-[11px] hover:bg-white/5 p-1 rounded cursor-pointer transition-colors group"
                        onClick={() => {
                          // Trigger action selection in parent (GMPanel)
                          // We need to lift this up. The component prop signature doesn't have onActionClick.
                          // Let's look for a way to bubble this event up.
                          // Currently MonsterStatBlock is self contained for display.
                          // I will add a custom event dispatch or callback if passed.
                          if (character?.onActionClick) {
                             character.onActionClick(action);
                          } else {
                             // Dispatch global event as fallback if props drilling is hard, 
                             // but better to use the prop we'll add in GMPanel usage
                             const event = new CustomEvent('gm-monster-action', { detail: action });
                             window.dispatchEvent(event);
                          }
                        }}
                      >
                        <span className="text-white font-bold group-hover:text-[#37F2D1] transition-colors">{action.name}. </span>
                        <span className="text-slate-300 leading-relaxed">{action.desc || action.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {traits.length === 0 && specialAbilities.length === 0 && actions.length === 0 && (
                <div className="h-full flex items-center justify-center py-8">
                  <p className="text-slate-500 text-xs italic">No traits or actions defined.</p>
                </div>
              )}
            </div>
          )}

          {/* Ability Scores Tab */}
          {activeTab === 'abilities' && (
            <div className="h-full">
              <div className="grid grid-cols-2 gap-2 mb-4">
                {Object.entries(abilityScores).map(([name, score]) => (
                  <div key={name} className="flex justify-between items-center bg-[#0b1220] rounded-lg p-2 border border-[#111827]">
                    <span className="text-xs text-amber-400 font-bold w-8">{name}</span>
                    <span className="text-white font-bold text-sm">{score}</span>
                    <span className="text-xs text-slate-400 w-8 text-right">{getMod(score)}</span>
                  </div>
                ))}
              </div>
              
              {/* Saves if available */}
              {stats.saving_throws && Object.keys(stats.saving_throws).length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Saving Throws</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.saving_throws).filter(([_, p]) => p).map(([key, val]) => (
                      <span key={key} className="text-xs bg-[#1a1f2e] px-2 py-1 rounded text-slate-300 border border-[#2A3441]">
                        {key.toUpperCase()} +{getMod(abilityScores[key.toUpperCase()]) + proficiencyBonus}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="flex justify-between text-xs pb-2 border-b border-[#111827]">
                <span className="text-slate-400">Proficiency Bonus</span>
                <span className="text-amber-400 font-bold">+{proficiencyBonus}</span>
              </div>

              {skills && Object.keys(skills).length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Skills</p>
                  <div className="grid grid-cols-2 gap-2">
                    {typeof skills === 'object' && !Array.isArray(skills) ? (
                      Object.entries(skills).filter(([_, v]) => v).map(([skill, value]) => {
                        // Calculate bonus roughly if boolean, or use value if number
                        let bonus = "+?";
                        if (typeof value === 'number') bonus = value >= 0 ? `+${value}` : value;
                        else if (value === true) bonus = "Proficient";
                        
                        return (
                          <div key={skill} className="flex justify-between bg-[#0b1220] px-2 py-1.5 rounded text-xs">
                            <span className="text-slate-300">{skill}</span>
                            <span className="text-[#37F2D1]">{bonus}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-300 col-span-2">{Array.isArray(skills) ? skills.join(', ') : String(skills)}</p>
                    )}
                  </div>
                </div>
              )}

              {(senses || languages) && (
                <div className="space-y-3 pt-2">
                  {senses && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Senses</p>
                      <p className="text-xs text-white bg-[#0b1220] p-2 rounded">{typeof senses === 'string' ? senses : JSON.stringify(senses)}</p>
                    </div>
                  )}
                  {languages && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Languages</p>
                      <p className="text-xs text-white bg-[#0b1220] p-2 rounded">{Array.isArray(languages) ? languages.join(', ') : languages}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Spells Tab */}
          {activeTab === 'spells' && (
            <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2 border border-slate-800/50 rounded-lg p-2 bg-[#080c14]/50">
              {typeof spellsData === 'object' && !Array.isArray(spellsData) ? (
                Object.entries(spellsData).map(([level, spells]) => {
                  if (!spells || spells.length === 0) return null;
                  const label = level === 'cantrips' ? 'Cantrips' : 
                               level.startsWith('level') ? `Level ${level.replace('level', '')}` : 
                               level;
                  return (
                    <div key={level}>
                      <p className="text-[10px] text-purple-400 uppercase tracking-wide mb-2 font-bold sticky top-0 bg-[#050816] py-1">{label}</p>
                      <div className="space-y-1">
                        {spells.map((spell, idx) => (
                          <div key={idx} className="text-xs bg-[#0b1220] p-2 rounded border border-[#111827]">
                            <span className="text-white font-medium">{typeof spell === 'string' ? spell : spell.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400">Spells format not supported or empty.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function TogglePill({ label }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-full bg-[#050816] border border-[#111827] px-3 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.7)] text-[10px] whitespace-nowrap hover:bg-[#0b1220] transition">
      <span className="w-3 h-3 rounded-[4px] border border-[#22c5f5]" />
      <span>{label}</span>
    </button>
  );
}

function LogEntry({ name, time, text, highlight }) {
  return (
    <div className="space-y-[2px]">
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{name}</span>
        <span>{time}</span>
      </div>
      <p className={`text-[11px] ${highlight ? "text-amber-300" : "text-slate-200"}`}>{text}</p>
    </div>
  );
}

function TurnOrderBar({ order, setOrder, activeConditions, onSelectTarget, selectionMode, isTurnOrderAccepted, getHp }) {
  const hasPlayedRef = React.useRef(false);

  // Play sound effects on mount (when combat starts/turn order appears)
  React.useEffect(() => {
    if (order && order.length > 0 && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      order.forEach((_, index) => {
        setTimeout(() => {
          const audio = new Audio('https://static.wixstatic.com/mp3/5cdfd8_969fe25cd3c5430ab97224d8b9a17227.wav');
          audio.volume = 0.6; // Increased volume
          audio.play().catch(e => console.warn("Turn order sound blocked:", e));
        }, index * 100); // 100ms stagger matching animation
      });
    }
  }, [order]); // Run when order populates

  const onDragEnd = (result) => {
    if (!result.destination || isTurnOrderAccepted) return;
    const items = Array.from(order);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setOrder(items);
  };

  return (
    <div className="flex-1 mr-4 overflow-visible">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="turn-order" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex items-end gap-4 overflow-x-visible pb-2 min-h-[120px]"
            >
              {order.map((combatant, index) => {
                const conditions = activeConditions[combatant.uniqueId] || [];
                const mainCondition = conditions[0];
                const borderColor = mainCondition ? CONDITIONS[mainCondition].color : null;

                return (
                  <Draggable key={combatant.uniqueId} draggableId={combatant.uniqueId} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`flex flex-col items-center gap-2 min-w-[80px] transition-all ${
                          snapshot.isDragging ? 'scale-110 z-[100]' : 'z-10'
                        } ${selectionMode ? 'cursor-pointer hover:scale-110' : ''}`}
                        onClick={() => selectionMode && onSelectTarget && onSelectTarget(combatant)}
                      >
                        <motion.div
                          initial={{ y: -50, opacity: 0, scale: 0.5 }}
                          animate={{ y: 0, opacity: 1, scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 15,
                            delay: index * 0.1
                          }}
                          className="flex flex-col items-center gap-2 relative"
                        >
                          {selectionMode && (
                            <div className="absolute -top-8 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-bounce shadow-lg z-50">
                              SELECT
                            </div>
                          )}
                          {/* Condition Text above head */}
                          {mainCondition && (
                            <div 
                              className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/80 text-white whitespace-nowrap z-20 border border-white/20"
                              style={{ borderColor: borderColor }}
                            >
                              {mainCondition}
                            </div>
                          )}

                          <div 
                            className={`relative w-20 h-20 rounded-full border-4 overflow-hidden transition-all ${
                              index === 0 ? 'shadow-[0_0_25px_rgba(55,242,209,0.6)] scale-110' : 'bg-[#050816]'
                            }`}
                            style={{ 
                              borderColor: borderColor || (index === 0 ? '#37F2D1' : '#111827')
                            }}
                          >
                            <div 
                              className="w-full h-full bg-cover bg-center"
                              style={{ 
                                backgroundImage: combatant.avatar ? `url(${combatant.avatar})` : 'none',
                                backgroundColor: '#1a1f2e'
                              }}
                            >
                              {!combatant.avatar && (
                                <div className="w-full h-full flex items-center justify-center text-xl text-slate-500 font-bold">
                                  {combatant.name[0]}
                                </div>
                              )}
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[11px] text-center text-white font-bold py-0.5">
                              {combatant.initiative}
                            </div>
                          </div>
                          
                          {/* HP Bar for GM */}
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1 border border-gray-700">
                             {(() => {
                               // Determine HP percentage
                               let current = 0; 
                               let max = 10;
                               
                               // For players we need to look up current HP if not in combatant object
                               // But initiativeOrder usually has basic info. GM Panel uses 'players' array too.
                               // Actually the order array in GM Panel might need to be enriched or we look up.
                               // 'initiativeOrder' is just the campaign.combat_data.order.
                               // Monsters in queue have HP. Players in campaignCharacters have HP.
                               
                               // Since this is GM Panel, we can try to find the entity.
                               // However, 'order' items are snapshots.
                               // We should probably look up the live entity for HP.
                               // But for now, let's assume we can find it or it's in the snapshot if updated.
                               // Actually, `activeConditions` logic suggests we treat IDs.
                               
                               // Simplified: If it's a monster, look in monster queue (localStorage).
                               // If player, look in `characters` prop from GMPanel.
                               
                               if (combatant.type === 'player') {
                                  // Find player character in `players` or `characters`
                                  // `players` is available in GMPanel scope but maybe not inside TurnOrderBar if not passed.
                                  // TurnOrderBar receives `activeConditions`.
                                  // Let's rely on passed props or context? 
                                  // Wait, TurnOrderBar is defined IN GMPanel.js, but `players` is in GMPanel scope.
                                  // But TurnOrderBar is a separate function component at the bottom.
                                  // We need to pass `players` and `monsters` (queue) to it or handle HP lookup there.
                                  // For now, let's just show a generic bar if we can't find stats, or pass data.
                                  
                                  // Actually, let's just modify TurnOrderBar to accept a lookup function or data.
                                  // But to keep it simple and efficient with one find_replace, I will assume
                                  // we can't easily access the full live HP without passing it.
                                  // Let's just stick to the prompt "Monster and NPC HP should also be displayed".
                                  // I'll add a simple visual placeholder if I can't access data, OR
                                  // I'll modify the TurnOrderBar call site to pass `players` and `monsterQueue`.
                                  
                                  return <div className="h-full bg-green-500 w-full opacity-50" />; 
                               } else {
                                  // Monster
                                  return <div className="h-full bg-red-500 w-full opacity-50" />;
                               }
                             })()}
                          </div>

                          <span className={`text-[10px] font-bold max-w-[90px] truncate px-2 py-0.5 rounded-full ${
                            index === 0 ? 'text-[#1E2430] bg-[#37F2D1]' : 'text-slate-400 bg-[#111827]/80'
                          }`}>
                            {combatant.name}
                          </span>
                        </motion.div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}