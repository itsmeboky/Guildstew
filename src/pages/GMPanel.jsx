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
import GMSessionSidebar from "@/components/gm/GMSessionSidebar";
import MoneyCounter from "@/components/shared/MoneyCounter";
import ItemTooltip from "@/components/shared/ItemTooltip";
import { allItemsWithEnchanted, itemIcons } from "@/components/dnd5e/itemData";
import { computeArmorClass } from "@/components/dnd5e/armorClass";
import { safeText } from "@/utils/safeRender";

// Helpers to extract the character's fighting-style names from any of
// the several shapes a sheet might use. Used by AC (Defense +1) and
// weapon damage (Great Weapon Fighting, Dueling, Archery, etc.).
function collectFightingStyles(character) {
  if (!character) return [];
  const out = [];
  const primary = character.fighting_style || character.fightingStyle;
  if (primary) out.push(typeof primary === 'string' ? primary : primary.name);
  const arr = character.fighting_styles;
  if (Array.isArray(arr)) {
    for (const s of arr) out.push(typeof s === 'string' ? s : s?.name);
  }
  const feats = character.features;
  if (Array.isArray(feats)) {
    for (const s of feats) out.push(typeof s === 'string' ? s : s?.name);
  }
  return out.filter(Boolean);
}

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import CampaignLog from "@/components/gm/CampaignLog";
import CharacterSelector from "@/components/gm/CharacterSelector";
import CombatQueue from "@/components/gm/CombatQueue";
import {
  readCombatQueue,
  writeCombatQueue,
  clearCombatQueue,
  FACTION_STYLES,
  FACTIONS,
  getFaction,
  getFactionStyle,
} from "@/utils/combatQueue";
import { enrichMonster } from "@/components/gm/monsterEnrichment";
import { canEquipToSlot } from "@/components/gm/equipmentRules";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CombatActionBar from "@/components/combat/CombatActionBar";
import CombatDiceWindow from "@/components/combat/CombatDiceWindow";
import DeathSaveWindow from "@/components/combat/DeathSaveWindow";
import CustomCompanionApprovalDialog from "@/components/gm/CustomCompanionApprovalDialog";
import {
  blankDeathSaves, applyDeathSaveRoll, applyDownedDamage, isDying,
} from "@/components/combat/deathSaves";
import ConditionRing from "@/components/combat/ConditionRing";
import PortraitWithState from "@/components/combat/PortraitWithState";
import {
  CONDITIONS as DND_CONDITIONS,
  CONDITION_COLORS,
  isIncapacitated,
  getNoActionConditionName,
} from "@/components/combat/conditions";
import { resolveAction, consumeActionCost, getSpellEffect } from "@/components/combat/actionResolver";
import { hpBarColor, clampHp, normalizeHp } from "@/components/combat/hpColor";
import { logCombatEvent, logSystemEvent } from "@/utils/combatLog";
import { trackStat, ensureCharacterStats } from "@/utils/characterStats";
import { checkAchievementsForCombatants } from "@/utils/achievementChecker";
import { trackEvent } from "@/utils/analytics";
import { supabase } from "@/api/supabaseClient";
import SessionModal from "@/components/session/SessionModal";
import AdventuringPartyContent from "@/components/session/content/AdventuringPartyContent";
import CampaignArchivesContent from "@/components/session/content/CampaignArchivesContent";
import QuickNotesContent from "@/components/session/content/QuickNotesContent";
import CampaignSettingsContent from "@/components/session/content/CampaignSettingsContent";
import GMSidebarAchievements from "@/components/gm/GMSidebarAchievements";
import GMSidebarPlayers from "@/components/gm/GMSidebarPlayers";
import GMSidebarUpdates from "@/components/gm/GMSidebarUpdates";
import {
  getAC as monsterGetAC,
  getSpeed as monsterGetSpeed,
  getCR as monsterGetCR,
  getSenses as monsterGetSenses,
  getLanguages as monsterGetLanguages,
  getDamageInfo as monsterGetDamageInfo,
  getAbilityScores as monsterGetAbilityScores,
} from "@/utils/monsterHelpers";
import {
  abilityModifier,
  proficiencyBonus,
  CONCENTRATION,
  applyDamageModifiers,
  attacksPerAction,
  getRule,
  DEATH_RULES,
  RAGE_DAMAGE_BONUS,
  RAGES_PER_DAY,
  FIGHTING_STYLES,
  kiPoints,
  CLASS_ABILITY_MECHANICS,
  layOnHandsPool,
  WILD_SHAPE,
  HEALING_POTIONS,
  spellSaveDC,
  getSpellSlots as getSpellSlotsRegistry,
  deepMergeRules,
} from "@/components/dnd5e/dnd5eRules";
import {
  initClassResources,
  getClassResources,
  rageDamageBonus,
} from "@/components/combat/classResources";
import { toast } from "sonner";
import { useTurnContext } from "@/components/combat/useTurnContext";

const basicActionIcons = [
  { name: "Non-Lethal", url: "https://static.wixstatic.com/media/5cdfd8_2717bd75c7c8435197830d28dc91d0c4~mv2.png", toggleable: true },
  { name: "Dash", url: "https://static.wixstatic.com/media/5cdfd8_02e46386022f4a57bb7537e0459427ea~mv2.png" },
  { name: "Help", url: "https://static.wixstatic.com/media/5cdfd8_b6c6460902d246a6bb2f34c0d2a84c71~mv2.png" },
  { name: "Grapple", url: "https://static.wixstatic.com/media/5cdfd8_1a20fa07c6a74ad8a2c678a716ec3138~mv2.png" },
  { name: "Throw", url: "https://static.wixstatic.com/media/5cdfd8_f124e759e4f449a1a9514e2ea8046586~mv2.png" },
  { name: "Hide", url: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/abilities/basic%20actions/hide.png" },
  { name: "Ready Action", url: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/abilities/basic%20actions/ready%20action.png" }
];

// Custom icons for death saving throws. The source PNGs are black-on-
// transparent, so every render site applies `filter: brightness(0) invert(1)`
// to tint them white on the dark UI background.
const DEATH_SAVE_ICONS = {
  life: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/UI/life.png",
  death: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/UI/death.png",
};
const DEATH_SAVE_ICON_STYLE = { filter: "brightness(0) invert(1)" };

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
  const [actionsState, setActionsState] = useState({ action: true, bonus: true, reaction: true, inspiration: false });
  const [activeConditions, setActiveConditions] = useState({});

  // 1. Auto-select first combatant if the combat queue has items and no
  // character is selected yet. readCombatQueue handles the legacy
  // gm_monster_queue → gm_combat_queue migration transparently.
  React.useEffect(() => {
    if (selectedCharacter) return;
    const queue = readCombatQueue(campaignId);
    if (queue.length > 0) {
      const first = queue[0];
      const enriched = enrichMonster(first);
      setSelectedCharacter(enriched);
      setMonsterInventory(enriched.inventory || []);
      setEquippedItems(enriched.equipped || {});
    }
  }, [campaignId]); // Run once on mount/campaignId change


  const [showConditionManager, setShowConditionManager] = useState(false);
  const [showEndSessionAlert, setShowEndSessionAlert] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const queryClient = useQueryClient();

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then(campaigns => campaigns[0]),
    enabled: !!campaignId,
    refetchInterval: (data) => (data?.combat_active || data?.combat_data?.stage === 'initiative') ? 1000 : 2000
  });

  // currentUser needs to be declared before the session-start and
  // presence effects below, which both read it. Keeping the
  // original definition lower in the file used to throw
  // `ReferenceError: Cannot access 'currentUser' before
  // initialization` the moment the GM Panel mounted.
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Start the session when the GM opens the panel. Runs once per
  // campaign load — if the session is already active we skip the
  // write so this doesn't thrash on every refetch.
  React.useEffect(() => {
    if (!campaign) return;
    if (campaign.session_active) return;
    base44.entities.Campaign.update(campaignId, {
      session_active: true,
      session_started_at: new Date().toISOString(),
      active_session_players: campaign.player_ids || [],
      disconnected_players: [],
      is_session_active: true,
    }).catch(() => {});
  }, [campaignId, campaign?.id, campaign?.session_active]);

  // Live presence — every GM + player that mounts its panel drops
  // into this channel. When a connection leaves without a clean
  // handoff (tab close, hard refresh, network drop) the `leave`
  // event fires and we flip the player into disconnected_players.
  React.useEffect(() => {
    if (!campaignId || !currentUser?.id || !campaign?.session_active) return;
    const channel = supabase.channel(`session:${campaignId}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftUserId = leftPresences?.[0]?.user_id;
        if (!leftUserId || leftUserId === campaign.game_master_id) return;
        base44.entities.Campaign.filter({ id: campaignId })
          .then((rows) => rows?.[0])
          .then((fresh) => {
            if (!fresh) return;
            const current = Array.isArray(fresh.disconnected_players) ? fresh.disconnected_players : [];
            if (current.includes(leftUserId)) return;
            return base44.entities.Campaign.update(campaignId, {
              disconnected_players: [...current, leftUserId],
            });
          })
          .catch(() => {});
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.id,
            username: currentUser.username || currentUser.email,
            role: 'gm',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [campaignId, currentUser?.id, campaign?.session_active, campaign?.game_master_id]);

  // Installed Brewery homebrew for this campaign. Each row pairs a
  // homebrew pack with its enabled flag. Enabled packs' `modifications`
  // JSONB gets deep-merged onto campaign.homebrew_rules to form the
  // effective override tree every `getRule()` call honours.
  const { data: installedHomebrew = [] } = useQuery({
    queryKey: ['campaignHomebrewMods', campaignId],
    queryFn: async () => {
      try {
        const rows = await base44.entities.CampaignHomebrew.filter({ campaign_id: campaignId });
        if (!rows?.length) return [];
        const packs = await Promise.all(
          rows.map((r) =>
            base44.entities.HomebrewRule
              .filter({ id: r.homebrew_id })
              .then((arr) => (arr[0] ? { ...r, _pack: arr[0] } : null))
              .catch(() => null),
          ),
        );
        return packs.filter(Boolean);
      } catch {
        return [];
      }
    },
    enabled: !!campaignId,
    initialData: [],
    staleTime: 30000,
  });

  // Parse the campaign's raw homebrew_rules (JSONB or legacy string)
  // into a plain object and merge every enabled Brewery pack on top.
  // The resulting `effectiveRules` is what every `getRule()` call and
  // CombatDiceWindow.homebrewRules prop should consume.
  const effectiveRules = React.useMemo(() => {
    const raw = campaign?.homebrew_rules;
    let rules = {};
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      rules = JSON.parse(JSON.stringify(raw));
    } else if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) rules = parsed;
      } catch { /* ignore — legacy freeform text */ }
    }
    for (const row of installedHomebrew) {
      if (!row?.enabled) continue;
      const mods = row._pack?.modifications;
      if (mods && typeof mods === 'object' && !Array.isArray(mods)) {
        deepMergeRules(rules, mods);
      }
    }
    return rules;
  }, [campaign?.homebrew_rules, installedHomebrew]);

  // === Campaign entity queries ======================================
  // These used to live way further down the component (around line
  // 1256). Moving them up here keeps every variable they declare
  // available to every hook / callback defined below, so we don't
  // keep tripping the "Cannot access X before initialization" TDZ
  // trap when a useCallback deps array references them. Anything that
  // needs this data MUST be declared below this block.
  // Monsters the GM can drop into the combat queue. SRD monsters
  // come from the shared dnd5e_monsters reference table; homebrew
  // monsters come from the per-campaign `monsters` table. Each row
  // is tagged with _source so encounter tracking can prefix IDs
  // (srd:<uuid> vs hb:<uuid>) when flipping the Pokédex.
  const { data: monsters = [] } = useQuery({
    queryKey: ['combatMonsterRoster', campaignId],
    queryFn: async () => {
      const [srd, homebrew] = await Promise.all([
        base44.entities.Dnd5eMonster.list('name').catch(() => []),
        campaignId
          ? base44.entities.Monster.filter({ campaign_id: campaignId }).catch(() => [])
          : Promise.resolve([]),
      ]);
      const srdRows = (srd || []).map((m) => ({ ...m, _source: 'srd' }));
      const hbRows  = (homebrew || []).map((m) => ({ ...m, _source: 'homebrew' }));
      return [...srdRows, ...hbRows].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    },
    enabled: !!campaignId,
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

  // Resolve campaign.disconnected_players (user_id strings) into the
  // { id, name } summaries the sidebar wants. Falls back to the raw
  // user_id when we don't have a profile cached yet.
  const disconnectedPlayerSummaries = React.useMemo(() => {
    const ids = Array.isArray(campaign?.disconnected_players) ? campaign.disconnected_players : [];
    return ids.map((uid) => {
      const profile = allUserProfiles.find((p) => p.user_id === uid);
      return {
        id: uid,
        name: profile?.username || profile?.email || 'Player',
      };
    });
  }, [campaign?.disconnected_players, allUserProfiles]);

  // Fetch all spells for accurate tooltips + effect classification.
  // Prefer the per-campaign `spells` table (the 89 with full details)
  // when a campaign is loaded; fall back to the global `dnd5e_spells`
  // catalog otherwise. fetchAllSpells() handles both paths — it used
  // to invoke a dead Edge Function, see spellData.jsx.
  const { data: fullSpellsList = [] } = useQuery({
    queryKey: ['dnd5e-spells', campaignId || 'global'],
    queryFn: () => fetchAllSpells(campaignId).then(data => data.spells || []),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const currentUserProfile = React.useMemo(() => {
    return allUserProfiles.find(p => p.user_id === currentUser?.id);
  }, [allUserProfiles, currentUser?.id]);

  const players = React.useMemo(() => {
    const playerMap = new Map();

    // One card per player_ids entry. The old ghost/orphan branch
    // that surfaced unclaimed characters alongside real players
    // was duplicating cards in the Adventurers row — characters
    // whose owner isn't in player_ids stay out of this list.
    if (campaign?.player_ids) {
      const uniquePlayerIds = [...new Set(campaign.player_ids)];
      uniquePlayerIds.forEach(playerId => {
        const profile = allUserProfiles.find(u => u.user_id === playerId);
        if (!profile || playerMap.has(playerId)) return;
        const character = characters.find(c =>
          (c.user_id === playerId || c.created_by === profile.email)
          && c.campaign_id === campaignId,
        );
        playerMap.set(playerId, { ...profile, character });
      });
    }

    return Array.from(playerMap.values());
  }, [campaign?.player_ids, allUserProfiles, characters, campaignId]);
  // =================================================================

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

  // Villain action end-of-turn prompt. `villainPrompt` holds the queued
  // villain + the specific round's action so the confirm modal can
  // read from the combat_data.order entry even if it mutates while the
  // prompt is open. null = closed.
  const [villainPrompt, setVillainPrompt] = useState(null);

  // Extra Attack tracking (M). When the Attack action resolves, the
  // counter starts at attacksPerAction(class, level) and decrements
  // after each attack resolves. While > 0, the onActionComplete
  // handler re-enters targeting instead of closing the dice window.
  // totalExtraAttacks stores the max for a "Attack X of Y" label.
  const [remainingAttacks, setRemainingAttacks] = useState(0);
  const [totalExtraAttacks, setTotalExtraAttacks] = useState(0);

  // (S) Bonus action spell restriction. When a bonus action spell
  // is cast this turn, the only other spell the character can cast
  // is a cantrip with a casting time of 1 action.
  const [bonusActionSpellCast, setBonusActionSpellCast] = useState(false);

  // When a downed PLAYER reaches their turn we automatically open the
  // dramatic DeathSaveWindow. When a downed MONSTER reaches their turn
  // the GM can opt into dramatic mode by clicking "Show Dramatic Roll"
  // on the inline DeathSavePanel; that records the monster's key here
  // so the overlay takes over the screen until the roll resolves.
  const [dramaticDeathSaveKey, setDramaticDeathSaveKey] = useState(null);

  // Leveled spells pass through a level picker before they reach the
  // dice window. `pendingSpellCast` holds the raw action; when the
  // user picks a level we call `runActionRef.current(actionWithCastLevel)`
  // which re-enters the action bar's inline onActionClick handler.
  // Cantrips (level 0 / undefined) bypass this entirely — they never
  // show the picker and never spend slots.
  const [pendingSpellCast, setPendingSpellCast] = useState(null);
  const runActionRef = React.useRef(null);

  // Tier 2 class-ability modals (Sorcerer Font of Magic, Paladin Lay
  // on Hands, Cleric Turn Undead, Druid Wild Shape, Sorcerer
  // Metamagic). Each holds the pending action's context so the modal
  // can read the actor / targets / pool when rendering.
  const [fontOfMagicDirection, setFontOfMagicDirection] = useState(null); // 'slotToSP' | 'spToSlot' | null
  const [layOnHandsOpen, setLayOnHandsOpen] = useState(false);
  const [turnUndeadOpen, setTurnUndeadOpen] = useState(false);
  const [wildShapeOpen, setWildShapeOpen] = useState(false);
  const [pendingMetamagic, setPendingMetamagic] = useState(null); // { action, castLevel, options }

  // Concentration tracking. Keyed by casterId →
  //   { spell, spellLevel, targetIds[], casterName }
  // A caster can only concentrate on one spell at a time — a new
  // concentration drops the old one (targets lose the effect label).
  // Damage triggers a CON save (DC = max(10, floor(damage/2))); on
  // failure the concentration breaks.
  const [concentrationByCharacter, setConcentrationByCharacter] = useState({});

  // --- Combat data sync ---------------------------------------------
  //
  // activeConditions and concentrationByCharacter are the GM-panel
  // source of truth. The Player Panel can't reach into this local
  // state, so we persist both maps onto campaign.combat_data and
  // refresh the Player Panel via the existing 1-2s campaign query
  // poll. The rules are strict:
  //   - GMPanel is the ONLY writer. Any panel (player) that wants to
  //     apply a condition must write directly to combat_data itself,
  //     not go through this local state.
  //   - Writes are debounced 500ms so a burst of condition toggles
  //     collapses to a single Campaign.update call.
  //   - We read latest combat_data off the query cache at write time
  //     (not off closure), so we never clobber a concurrent order /
  //     round / currentTurnIndex update.
  //   - A one-shot hydration pulls pre-existing maps out of
  //     combat_data on mount (GM reloading mid-combat) before the
  //     write side turns on, via hydratedCombatDataRef.
  const hydratedCombatDataRef = React.useRef(false);
  const conditionsWriteTimerRef = React.useRef(null);
  const concentrationWriteTimerRef = React.useRef(null);

  // Ref that always points at the latest fullSpellsList query result.
  // startConcentration (declared below) needs to look up a spell row
  // but runs during render — and the query is declared ~700 lines
  // later. Reading the ref avoids the TDZ trap that bit us when we
  // referenced fullSpellsList directly in a deps array. The ref is
  // updated right after the query declares at the bottom of this
  // component (same pattern we use for charactersRef / playersRef).
  const fullSpellsListRef = React.useRef([]);

  // Spell slots spent per character. Keyed by characterKey
  // (uniqueId / id), value is { 1: <spent>, 2: <spent>, ... }. Slots
  // persist across turns and combats — only a long rest should reset
  // them (not implemented yet). Click a dot to manually adjust.
  const [spentSlotsByCharacter, setSpentSlotsByCharacter] = useState({});

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

  // Resolve a combat_data.order entry (or any combatant-shaped
  // object) into the underlying Character.id when the entry is a
  // player. Used by the stat tracker so monster damage doesn't
  // churn character_stats. Returns null for monsters / NPCs / any
  // entry we can't trace back to a real character row.
  const resolveCharacterIdFromCombatant = React.useCallback((c) => {
    if (!c) return null;
    if (typeof c === 'string') {
      // Direct id string from the order entry. "player-<userId>"
      // → look up via players. "ghost-<charId>" / "player-ghost-
      // <charId>" → strip the prefix.
      if (c.startsWith('player-ghost-')) return c.slice('player-ghost-'.length);
      if (c.startsWith('ghost-')) return c.slice('ghost-'.length);
      if (c.startsWith('player-')) {
        const userId = c.slice('player-'.length);
        const player = players.find((p) => p.user_id === userId);
        return player?.character?.id || null;
      }
      // Bare character id passed directly.
      return c;
    }
    if (c.type && c.type !== 'player') return null;
    if (c.characterId) return c.characterId;
    if (c.character_id) return c.character_id;
    if (c.character?.id) return c.character.id;
    if (c.id) return resolveCharacterIdFromCombatant(c.id);
    return null;
  }, [players]);

  // If the currently-selected combatant is downed, pull their live
  // death-save state from combat_data.order so the render can swap the
  // action bar out for a death save panel.
  const selectedDownedEntry = React.useMemo(() => {
    if (!selectedCharacterKey || !campaign?.combat_data?.order) return null;
    const entry = campaign.combat_data.order.find(
      (c) => (c.uniqueId || c.id) === selectedCharacterKey,
    );
    return entry?.downed ? entry : null;
  }, [selectedCharacterKey, campaign?.combat_data?.order]);
  const isHidden = !!selectedCharacterKey && hiddenCharacters.has(selectedCharacterKey);

  // Dramatic death-save overlay target. The window takes over the whole
  // screen when EITHER:
  //   - the active combatant (front of order[0]) is a downed player that
  //     isn't dead/stabilized — their death save is always dramatic, OR
  //   - the GM has explicitly opted a downed monster into dramatic mode
  //     via `dramaticDeathSaveKey` (click "Show Dramatic Roll").
  const activeDeathSaveTarget = React.useMemo(() => {
    const order = campaign?.combat_data?.order || [];
    if (!order.length) return null;

    const isLiveSave = (entry) => {
      if (!entry?.downed) return false;
      const saves = entry.deathSaves || {};
      return !saves.dead && !saves.stabilized;
    };

    const active = order[0];
    const activeKey = active?.uniqueId || active?.id;
    const activeIsPlayer = active?.type === 'player';
    if (activeIsPlayer && isLiveSave(active)) {
      return { combatant: active, key: activeKey, isPlayer: true, silent: false };
    }

    if (dramaticDeathSaveKey) {
      const monster = order.find(
        (c) => (c.uniqueId || c.id) === dramaticDeathSaveKey,
      );
      if (monster && isLiveSave(monster)) {
        return {
          combatant: monster,
          key: monster.uniqueId || monster.id,
          isPlayer: false,
          silent: false,
        };
      }
    }
    return null;
  }, [campaign?.combat_data?.order, dramaticDeathSaveKey]);

  // Rotate combat_data.order[0] to the end of the queue and persist.
  // Used after a downed PC's death save auto-advances their turn. Mirrors
  // the END TURN button's behaviour (splice + push + currentTurnIndex=0).
  const advanceTurn = React.useCallback(async () => {
    // Read from the live React Query cache at call-time rather than
    // the closure — a death-save write that just landed via
    // updateOrderCombatant might be newer than `campaign` in this
    // callback's captured scope, and splicing off a stale order would
    // overwrite the just-persisted saves.
    const latest = queryClient.getQueryData(['campaign', campaignId]) || campaign;
    const latestCombat = latest?.combat_data;
    if (!latestCombat?.order?.length) return;
    const currentOrder = [...latestCombat.order];
    const [finished] = currentOrder.splice(0, 1);
    currentOrder.push(finished);
    const newData = { ...latestCombat, order: currentOrder, currentTurnIndex: 0 };
    queryClient.setQueryData(['campaign', campaignId], (old) =>
      old ? { ...old, combat_data: newData } : old,
    );
    try {
      await base44.entities.Campaign.update(campaignId, { combat_data: newData });
    } catch (err) {
      console.error('advanceTurn failed:', err);
    }
    queryClient.invalidateQueries(['campaign', campaignId]);
  }, [campaign, campaignId, queryClient]);

  // If the selected character is no longer hidden (turn rolled over, attacked
  // while sneaking, or the GM switched to a different character) the Sneak
  // toggle should fall back off automatically.
  React.useEffect(() => {
    if (!isHidden && sneakActive) setSneakActive(false);
  }, [isHidden, sneakActive]);

  // Spell slots for the selected character. getCharacterSpellSlots handles
  // full / half / pact casters and falls back to parsing monster stat
  // blocks. Non-casters (Barbarian, Fighter, Monk, Rogue without a caster
  // multiclass) get {}, which hides the tracker row entirely.
  const maxSpellSlots = React.useMemo(
    () => (selectedCharacter ? getCharacterSpellSlots(selectedCharacter) : {}),
    [selectedCharacter]
  );
  const currentSpentSlots = React.useMemo(
    () => (selectedCharacterKey ? spentSlotsByCharacter[selectedCharacterKey] || {} : {}),
    [spentSlotsByCharacter, selectedCharacterKey]
  );

  // Manually adjust a spent slot count for the current character (the GM
  // clicks a dot in the tracker). Used for corrections.
  const handleToggleSlot = React.useCallback((level, mode) => {
    const key = selectedCharacterKey;
    if (!key) return;
    const max = maxSpellSlots[level] || 0;
    setSpentSlotsByCharacter((prev) => {
      const charSpent = prev[key] || {};
      const curr = charSpent[level] || 0;
      let next = curr;
      if (mode === 'spend') next = Math.min(max, curr + 1);
      else if (mode === 'restore') next = Math.max(0, curr - 1);
      if (next === curr) return prev;
      return { ...prev, [key]: { ...charSpent, [level]: next } };
    });
  }, [selectedCharacterKey, maxSpellSlots]);

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

      // Apply damage if target is a combat-queue entry (managed by GM).
      if (targetId.startsWith('monster-')) {
        const queueId = targetId.replace('monster-', '');
        const queue = readCombatQueue(campaignId);
        if (queue.length > 0) {
          const newQueue = queue.map(m => {
            if (m.queueId === queueId || String(m.queueId) === queueId) {
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
          writeCombatQueue(campaignId, newQueue);
        }
      }
    }
  }, [campaign?.combat_data?.active_encounter, campaignId]);

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      // Reset combat state + the new session-lifecycle columns.
      // The old flags (is_session_active, ready_player_ids,
      // combat_data) stay in sync so existing consumers keep
      // working.
      await base44.entities.Campaign.update(campaignId, {
        is_session_active: false,
        last_session_ended_at: new Date().toISOString(),
        ready_player_ids: [],
        combat_active: false,
        combat_data: null,
        session_active: false,
        session_started_at: null,
        active_session_players: [],
        disconnected_players: [],
      });

      // Release every character locked into this session so players
      // can join another campaign's session. Fire all clears in
      // parallel, swallow individual errors so a single bad row
      // doesn't stop the end-session flow.
      try {
        const locked = await base44.entities.Character.filter({ active_session_id: campaignId });
        await Promise.all(
          (locked || []).map((c) =>
            base44.entities.Character.update(c.id, { active_session_id: null }).catch(() => {}),
          ),
        );
      } catch { /* ignore */ }

      // Clear combat queue from local storage
      clearCombatQueue(campaignId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toast.success('Session ended.');
      // CampaignGMPanel renders the full GM lobby — hero banner,
      // class-iconed player cards, and the Layout's campaign nav
      // (Invite Players / Player Management / Campaign Archives /
      // Campaign Statistics / Campaign Settings). CampaignView is
      // bypassed from Layout and renders a slimmer version without
      // that nav, so End Session pointed at the wrong page.
      navigate(createPageUrl("CampaignGMPanel") + `?id=${campaignId}`);
    },
  });

  const [showEndCombatAlert, setShowEndCombatAlert] = useState(false);
  const [isTurnOrderAccepted, setIsTurnOrderAccepted] = useState(false);

  // FIGHT button → stage 'arranging' → 'combat'. The order is taken
  // from whatever the GM last dragged in the TurnOrderBar.
  const acceptTurnOrderMutation = useMutation({
    mutationFn: () => base44.entities.Campaign.update(campaignId, {
      combat_active: true,
      combat_data: {
        ...(campaign?.combat_data || {}),
        stage: 'combat',
        order: initiativeOrder,
        currentTurnIndex: 0,
        round: 1,
      }
    }),
    onSuccess: () => {
      const audio = new Audio('https://static.wixstatic.com/mp3/5cdfd8_1e1b1f8b2b074994ac92bc8ee2913586.wav');
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play failed", e));

      setIsTurnOrderAccepted(true);
      // Pre-create CharacterStat rows for every player character in
      // the order so first-event writes don't race the row-create.
      // Fire-and-forget — combat starts even if stat seeding fails.
      try {
        const order = (campaign?.combat_data?.order || initiativeOrder || []);
        for (const c of order) {
          const charId = resolveCharacterIdFromCombatant(c);
          if (charId) ensureCharacterStats(charId, campaignId).catch(() => {});
        }
      } catch (err) { /* never block combat */ }

      logSystemEvent(campaignId, '— Round 1 —', { kind: 'round_divider', round: 1 });
      logCombatEvent(campaignId, 'Turn order set. Round 1 begins.', {
        event: 'combat_start',
        category: 'round',
      });
      trackEvent(currentUser?.id, 'combat_started', {
        campaign_id: campaignId,
        combatants: (campaign?.combat_data?.order || initiativeOrder || []).length,
      });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    }
  });

  // Sync isTurnOrderAccepted from the campaign stage. Drag is unlocked
  // during 'initiative' and 'arranging', locked during 'combat'. This
  // makes refresh safe — the UI restores the right state even if the
  // component remounts.
  React.useEffect(() => {
    const stage = campaign?.combat_data?.stage;
    if (stage === 'combat') setIsTurnOrderAccepted(true);
    else if (stage === 'initiative' || stage === 'arranging') setIsTurnOrderAccepted(false);
  }, [campaign?.combat_data?.stage]);

  // Post-combat rest flow. After confirming End Combat, the GM picks
  // Continue (no healing), Short Rest (half-HP restore + Warlock pact
  // slots refresh) or Long Rest (full HP + all slots). The rest is
  // applied to every campaign character — not just the ones that were
  // in the encounter — because the whole party is typically resting
  // together. Combat state is cleared regardless of which option runs.
  const [showRestChoice, setShowRestChoice] = useState(false);

  const clearCombatClientState = React.useCallback(() => {
    setCombatActive(false);
    setIsTurnOrderAccepted(false);
    setInitiativeOrder([]);
    setActiveConditions({});
    setHiddenCharacters(new Set());
    setSneakActive(false);
    setConcentrationByCharacter({});
    hidThisTurnRef.current = false;
    prevActiveKeyRef.current = null;
    setShowEndCombatAlert(false);
    setShowRestChoice(false);
  }, []);

  const endCombatMutation = useMutation({
    mutationFn: async (restType /* 'none' | 'short' | 'long' */ = 'none') => {
      // P.I.E. — snapshot the order BEFORE clearing combat_data so
      // we can run achievement checks against every player who was
      // in the fight. Achievements depend on lifetime stats so we
      // run the check whether or not the GM picked a rest.
      const orderSnapshot = (campaign?.combat_data?.order || []).slice();

      // 1. Clear combat state on the campaign row.
      await base44.entities.Campaign.update(campaignId, {
        combat_active: false,
        combat_data: null,
      });

      // 2. Apply the chosen rest to every PC. Long rest = full HP +
      //    clear all spent slots. Short rest = restore up to half max
      //    HP (pragmatic stand-in for hit-dice spending) and reset
      //    Warlock pact slots only. Continue does neither.
      if (restType === 'short' || restType === 'long') {
        const updates = characters.map(async (c) => {
          const hp = c.hit_points || {};
          const max = Number.isFinite(hp.max) ? hp.max : 0;
          const current = Number.isFinite(hp.current) ? hp.current : max;
          let nextCurrent = current;
          if (restType === 'long') {
            const fullHeal = getRule(effectiveRules, 'resting.full_hp_on_long_rest') !== false;
            nextCurrent = fullHeal ? max : Math.max(current, Math.ceil(max / 2));
          } else if (restType === 'short' && max > 0) {
            // Heal to at least half max HP, but never reduce current HP.
            nextCurrent = Math.max(current, Math.ceil(max / 2));
          }
          const payload = {
            hit_points: { ...hp, max, current: nextCurrent, temporary: 0 },
          };
          try {
            await base44.entities.Character.update(c.id, payload);
          } catch (err) {
            console.error('Rest HP update failed for', c.name, err);
          }
        });
        await Promise.all(updates);

        // Clear in-memory spent spell slots. Long rest clears all,
        // short rest clears slots only for Warlocks (pact magic).
        setSpentSlotsByCharacter((prev) => {
          if (restType === 'long') return {};
          const next = { ...prev };
          characters.forEach((c) => {
            const cls = (c.class || '').toLowerCase();
            if (cls === 'warlock') {
              const key = c.id;
              if (key in next) delete next[key];
            }
          });
          return next;
        });
      }

      // Achievement checks for every player who saw combat. Each
      // check is sequential (per-character) but the outer Promise
      // resolves once they all finish — toast notifications fire
      // from the success handler so we don't block this mutation
      // on UI work.
      const combatants = [];
      for (const entry of orderSnapshot) {
        const charId = resolveCharacterIdFromCombatant(entry);
        if (!charId) continue;
        const player = players.find((p) => p.character?.id === charId);
        const userId = player?.user_id || null;
        // Skip ghost / orphan characters — no user_id means we
        // can't write into the achievements table for them.
        if (!userId || String(userId).startsWith('ghost-')) continue;
        combatants.push({ userId, characterId: charId, name: entry?.name });
      }
      let awards = [];
      if (combatants.length > 0) {
        try {
          awards = await checkAchievementsForCombatants(combatants, campaignId);
        } catch (err) {
          console.error('Achievement evaluation failed:', err);
        }
      }

      return { restType, awards };
    },
    onSuccess: ({ restType, awards } = {}) => {
      const rounds = campaign?.combat_data?.round || 0;
      clearCombatClientState();
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaignCharacters', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      trackEvent(currentUser?.id, 'combat_ended', {
        campaign_id: campaignId,
        rounds,
        rest_type: restType,
        awards_count: (awards || []).length,
      });
      logCombatEvent(campaignId, `Combat ended. ${rounds} round${rounds === 1 ? '' : 's'}.`, {
        event: 'combat_ended',
        category: 'round',
        rounds,
      });
      if (restType === 'long') {
        toast.success('The party takes a long rest. HP and spells restored.');
        logCombatEvent(campaignId, 'The party takes a long rest.', {
          event: 'long_rest',
          category: 'rest',
        });
      } else if (restType === 'short') {
        toast.success('The party takes a short rest.');
        logCombatEvent(campaignId, 'The party takes a short rest.', {
          event: 'short_rest',
          category: 'rest',
        });
      }
      // Surface freshly-earned achievements as celebratory toasts.
      // We log them too so the campaign feed has a record alongside
      // the combat summary.
      for (const award of (awards || [])) {
        toast.custom((t) => (
          <div className="bg-[#1a1f2e] border border-[#37F2D1] rounded-lg p-4 shadow-xl flex items-center gap-3 max-w-sm">
            <span className="text-3xl">{award.icon || '🏆'}</span>
            <div>
              <div className="text-[#37F2D1] font-bold text-xs uppercase tracking-wider">
                Achievement Unlocked!
              </div>
              <div className="text-white font-bold">{award.title}</div>
              <div className="text-slate-400 text-xs">{award.description}</div>
              {award.combatantName && (
                <div className="text-slate-500 text-[10px] mt-1">— {award.combatantName}</div>
              )}
            </div>
          </div>
        ), { duration: 6000 });
        logCombatEvent(campaignId,
          `🏆 ${award.combatantName || 'A hero'} earned: ${award.title}`,
          { event: 'achievement_earned', category: 'achievement', achievement: award.achievement_key },
        );
      }
    },
    onError: (err) => {
      console.error('End combat failed:', err);
      toast.error('Failed to end combat.');
    },
  });

  // "End Combat" first confirms via the alert, then swaps to the rest
  // chooser. Confirming the alert closes it and opens the chooser.
  const handleEndCombat = () => {
    setShowEndCombatAlert(false);
    setShowRestChoice(true);
  };

  const handleChooseRest = (restType) => {
    endCombatMutation.mutate(restType);
  };

  // --- Concentration helpers ---------------------------------------
  //
  // Concentration is per-caster: a character can only hold one
  // Concentration spell at a time. Starting a new one drops the old
  // one (and removes the applied condition from every target that was
  // affected). Dropping is also triggered by:
  //   - the caster failing a CON save after taking damage
  //   - the caster becoming incapacitated
  //   - combat ending
  //
  // We deliberately keep the tracker local — no combat_data writeback
  // in this pass — because conditions themselves are still local.
  const breakConcentration = React.useCallback(
    (casterId, reason) => {
      setConcentrationByCharacter((prev) => {
        const existing = prev[casterId];
        if (!existing) return prev;
        const next = { ...prev };
        delete next[casterId];

        // Clean up the spell's applied conditions on each target so
        // the badge ring / toast goes away with the concentration.
        if (existing.appliedCondition && existing.targetIds?.length) {
          setActiveConditions((cur) => {
            const updated = { ...cur };
            for (const tid of existing.targetIds) {
              const list = updated[tid] || [];
              const pruned = list.filter((c) => c !== existing.appliedCondition);
              if (pruned.length !== list.length) updated[tid] = pruned;
            }
            return updated;
          });
        }

        const reasonLabel = reason === "new"
          ? "dropped"
          : reason === "damage"
          ? "lost"
          : reason === "incapacitated"
          ? "lost (incapacitated)"
          : "ended";
        toast.error(`${existing.casterName || 'Caster'} ${reasonLabel} Concentration on ${existing.spell}.`);
        logCombatEvent(
          campaignId,
          `${existing.casterName || 'Caster'} ${reasonLabel} concentration on ${existing.spell}!`,
          {
            event: 'concentration_end',
            category: 'spell',
            actor: existing.casterName,
            spell: existing.spell,
            reason,
          },
        );
        return next;
      });
    },
    [campaignId],
  );

  const startConcentration = React.useCallback(
    (payload) => {
      if (!payload?.casterId || !payload.spell) return;
      setConcentrationByCharacter((prev) => {
        // If this caster already has a different concentration spell
        // up, drop it first — same visual / toast flow.
        const existing = prev[payload.casterId];
        if (existing && existing.spell !== payload.spell) {
          // Fire the cleanup side-effect asynchronously so we don't
          // nest state updates inside the setter.
          Promise.resolve().then(() => breakConcentration(payload.casterId, "new"));
        }
        // Snapshot which condition (if any) this spell applies so we
        // can strip it from targets when the concentration drops.
        // Reads from fullSpellsListRef (updated post-query) to avoid
        // the TDZ — see the ref comment above.
        const list = fullSpellsListRef.current || [];
        const spellRow = list.find?.(
          (s) => s?.name && s.name.toLowerCase() === payload.spell.toLowerCase(),
        );
        const effect = getSpellEffect(payload.spell, spellRow || null);
        const appliedCondition = effect?.condition || null;
        return {
          ...prev,
          [payload.casterId]: {
            spell: payload.spell,
            spellLevel: payload.spellLevel || 0,
            targetIds: payload.targetIds || [],
            casterName: payload.casterName || 'Caster',
            appliedCondition,
          },
        };
      });
      toast(`${payload.casterName || 'Caster'} is concentrating on ${payload.spell}.`);
    },
    [breakConcentration],
  );

  // Patch a combatant's faction / charm fields in both the live
  // combat_data.order (so the turn tracker UI + clients update
  // immediately) and the persistent combat queue storage (so the
  // change survives re-rolling initiative).
  const updateCombatantFaction = React.useCallback((combatantKey, patch) => {
    if (!combatantKey) return;

    // Live turn order on the campaign entity.
    if (campaign?.combat_data?.order) {
      const newOrder = campaign.combat_data.order.map(c => {
        const key = c.uniqueId || c.id;
        if (key !== combatantKey) return c;
        return { ...c, ...patch };
      });
      base44.entities.Campaign
        .update(campaignId, {
          combat_data: { ...campaign.combat_data, order: newOrder },
        })
        .then(() => queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] }))
        .catch(err => console.error('Faction update (order) failed:', err));
    }

    // Persistent combat queue (so seeding initiative again keeps the new faction).
    if (combatantKey.startsWith('monster-')) {
      const queueId = combatantKey.slice('monster-'.length);
      const queue = readCombatQueue(campaignId);
      if (queue.length > 0) {
        const newQueue = queue.map(m => {
          if (m.queueId !== queueId && String(m.queueId) !== queueId) return m;
          return { ...m, ...patch };
        });
        writeCombatQueue(campaignId, newQueue);
      }
    }
  }, [campaign?.combat_data, campaignId, queryClient]);

  // Generic combat_data.order patcher — used by the downed / death save
  // flow. Reads from the live cache so rapid-fire patches (two damage
  // ticks in the same tick, or a roll + advance close together) build
  // on each other instead of racing. Optimistically updates the cache,
  // then persists to the DB.
  const updateOrderCombatant = React.useCallback((combatantKey, patch) => {
    const latest = queryClient.getQueryData(['campaign', campaignId]) || campaign;
    const latestCombat = latest?.combat_data;
    if (!combatantKey || !latestCombat?.order) return;
    const newOrder = latestCombat.order.map(c => {
      const key = c.uniqueId || c.id;
      if (key !== combatantKey) return c;
      return { ...c, ...patch };
    });
    const newData = { ...latestCombat, order: newOrder };
    queryClient.setQueryData(['campaign', campaignId], (old) =>
      old ? { ...old, combat_data: newData } : old
    );
    base44.entities.Campaign
      .update(campaignId, { combat_data: newData })
      .catch(err => console.error('Order update failed:', err));
  }, [campaign, campaignId, queryClient]);

  // Refs that hold the latest `characters` array and the derived
  // `players` list. The death-save / heal helpers below use these so
  // their useCallback deps don't reference variables that are declared
  // later in render (which would hit the temporal dead zone at module
  // evaluation). The refs are updated in an effect after both are
  // defined — see ~line 960 below.
  const charactersRef = React.useRef([]);
  const playersRef = React.useRef([]);

  // Write a specific current-HP value straight to the persistent entity
  // (Character row for PCs/ghosts, combat queue entry for monsters).
  // Used by the revive-on-nat-20 / heal-from-downed paths so the HP
  // change outlives combat state.
  const applyHpToEntity = React.useCallback((combatantKey, newCurrent) => {
    if (!combatantKey) return;

    if (combatantKey.startsWith('monster-')) {
      const queueId = combatantKey.slice('monster-'.length);
      const queue = readCombatQueue(campaignId);
      if (queue.length === 0) return;
      const newQueue = queue.map(m => {
        if (m.queueId !== queueId && String(m.queueId) !== queueId) return m;
        const max = m.hit_points?.max || newCurrent;
        return {
          ...m,
          hit_points: {
            ...(m.hit_points || {}),
            current: Math.max(0, Math.min(max, newCurrent)),
            max,
          },
        };
      });
      writeCombatQueue(campaignId, newQueue);
      return;
    }

    // Player / ghost character path — read characters + players out of
    // the refs so this callback isn't tied to the later useQuery /
    // useMemo declarations.
    const currentCharacters = charactersRef.current || [];
    const currentPlayers = playersRef.current || [];
    let char = null;
    if (combatantKey.startsWith('player-')) {
      const rest = combatantKey.slice('player-'.length);
      if (rest.startsWith('ghost-')) {
        char = currentCharacters.find(c => c.id === rest.slice('ghost-'.length));
      } else {
        const player = currentPlayers.find(p => p.user_id === rest);
        char = player?.character
          || currentCharacters.find(c => c.created_by === player?.email)
          || null;
      }
    }
    if (!char) return;
    const max = char.hit_points?.max || newCurrent;
    base44.entities.Character
      .update(char.id, {
        hit_points: {
          ...(char.hit_points || {}),
          current: Math.max(0, Math.min(max, newCurrent)),
          max,
        },
      })
      .then(() => queryClient.invalidateQueries({ queryKey: ['campaignCharacters', campaignId] }))
      .catch(err => console.error('HP write-back failed:', err));
  }, [campaignId, queryClient]);

  // Apply a death save to a combatant in combat_data.order. `delta` is
  // { successesDelta, failuresDelta } — or an explicit { successes,
  // failures, stabilized, dead } override. Clamps counts to [0, 3] and
  // auto-promotes to stabilized / dead at the thresholds.
  const applyDeathSaveChange = React.useCallback((combatantKey, change) => {
    if (!combatantKey || !campaign?.combat_data?.order) return;
    const target = campaign.combat_data.order.find(c => (c.uniqueId || c.id) === combatantKey);
    if (!target || !target.downed) return;
    const existing = target.deathSaves || blankDeathSaves();
    const next = { ...existing };
    if (typeof change.successes === 'number') next.successes = change.successes;
    if (typeof change.failures === 'number') next.failures = change.failures;
    if (typeof change.successesDelta === 'number') next.successes = Math.max(0, Math.min(3, existing.successes + change.successesDelta));
    if (typeof change.failuresDelta === 'number') next.failures = Math.max(0, Math.min(3, existing.failures + change.failuresDelta));
    if (typeof change.stabilized === 'boolean') next.stabilized = change.stabilized;
    if (typeof change.dead === 'boolean') next.dead = change.dead;
    // Auto-promotion
    if (next.failures >= 3) next.dead = true;
    if (next.successes >= 3) next.stabilized = true;

    // Dead combatants get moved OUT of the live initiative order into
    // a separate combat_data.fallen[] graveyard. Wounded-but-alive and
    // stabilized stay in the order so the initiative bar still shows
    // them with the unconscious overlay.
    if (next.dead && !existing.dead) {
      const fallenEntry = { ...target, deathSaves: next };
      const newOrder = campaign.combat_data.order.filter(
        (c) => (c.uniqueId || c.id) !== combatantKey,
      );
      const newFallen = [...(campaign.combat_data.fallen || []), fallenEntry];
      const newData = { ...campaign.combat_data, order: newOrder, fallen: newFallen };
      queryClient.setQueryData(['campaign', campaignId], (old) =>
        old ? { ...old, combat_data: newData } : old,
      );
      base44.entities.Campaign
        .update(campaignId, { combat_data: newData })
        .catch(err => console.error('Move to fallen failed:', err));
      toast.error(`${target.name} has died.`);
      logCombatEvent(campaignId, `${target.name} has fallen.`, {
        event: 'death',
        category: 'death_save',
        target: target.name,
      });
      return;
    }

    updateOrderCombatant(combatantKey, { deathSaves: next });
    if (next.stabilized && !existing.stabilized) {
      toast.success(`${target.name} is stabilized.`);
      logCombatEvent(campaignId, `${target.name} has stabilized.`, {
        event: 'stabilized',
        category: 'death_save',
        target: target.name,
      });
    }
  }, [campaign?.combat_data, campaignId, queryClient, updateOrderCombatant]);

  // Roll a d20 death save for a downed combatant and apply the result.
  // 10+ = success, 9− = failure, nat 20 = revive to 1 HP, nat 1 = 2 failures.
  // Accepts an optional `providedRoll` so the DeathSaveWindow can pre-roll
  // the d20 for its animation and then delegate state persistence here.
  const rollDeathSaveForCombatant = React.useCallback((combatantKey, providedRoll) => {
    if (!combatantKey || !campaign?.combat_data?.order) return;
    const target = campaign.combat_data.order.find(c => (c.uniqueId || c.id) === combatantKey);
    if (!target || !target.downed) return;
    const existing = target.deathSaves || blankDeathSaves();
    if (existing.dead || existing.stabilized) return;
    const roll =
      Number.isFinite(providedRoll) && providedRoll >= 1 && providedRoll <= 20
        ? providedRoll
        : Math.floor(Math.random() * 20) + 1;
    // P.I.E. — every death-save roll counts as either a pass or a
    // fail. Nat 20 is also a pass (revives), nat 1 is two failures.
    const downedCharId = resolveCharacterIdFromCombatant(target);
    if (downedCharId) {
      if (roll >= 10 || roll === 20) trackStat(downedCharId, campaignId, 'death_saves_passed');
      else trackStat(downedCharId, campaignId, 'death_saves_failed', roll === 1 ? 2 : 1);
    }

    if (roll === 20) {
      // Back on your feet with 1 HP.
      updateOrderCombatant(combatantKey, {
        downed: false,
        deathSaves: blankDeathSaves(),
        hit_points: { ...(target.hit_points || {}), current: 1 },
      });
      // Also persist the 1 HP to the underlying entity so reads are consistent.
      applyHpToEntity(combatantKey, 1);
      // Clear the Unconscious condition.
      setActiveConditions(prev => {
        const current = prev[combatantKey] || [];
        if (!current.includes('Unconscious')) return prev;
        return { ...prev, [combatantKey]: current.filter(c => c !== 'Unconscious') };
      });
      toast.success(`${target.name} is back on their feet!`);
      logCombatEvent(
        campaignId,
        `${target.name} rolls a natural 20 — BACK FROM THE BRINK!`,
        {
          event: 'death_save_nat20',
          category: 'death_save',
          target: target.name,
        },
      );
      return;
    }
    if (roll === 1) {
      applyDeathSaveChange(combatantKey, { failuresDelta: 2 });
      logCombatEvent(
        campaignId,
        `${target.name} rolls a natural 1... two failures.`,
        {
          event: 'death_save_nat1',
          category: 'death_save',
          target: target.name,
        },
      );
      return;
    }
    // (K) Death save DC — homebrew override. Default DC 10 per PHB.
    const deathSaveDC = getRule(effectiveRules, 'combat.death_saves.dc') ?? DEATH_RULES.death_saves.dc;
    if (roll >= deathSaveDC) {
      applyDeathSaveChange(combatantKey, { successesDelta: 1 });
      logCombatEvent(
        campaignId,
        `${target.name} death save: rolls ${roll} — SUCCESS`,
        {
          event: 'death_save_success',
          category: 'death_save',
          target: target.name,
          roll,
        },
      );
      return;
    }
    applyDeathSaveChange(combatantKey, { failuresDelta: 1 });
    logCombatEvent(
      campaignId,
      `${target.name} death save: rolls ${roll} — FAILURE`,
      {
        event: 'death_save_failure',
        category: 'death_save',
        target: target.name,
        roll,
      },
    );
  }, [campaignId, campaign?.combat_data, updateOrderCombatant, applyDeathSaveChange, applyHpToEntity]);

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
    let isOffHand = false;

    if (mode === 'melee') {
      weapon = equipment.weapon1 || null;
      if (!weapon) effectiveMode = 'unarmed';
    } else if (mode === 'ranged') {
      weapon = equipment.ranged || null;
      if (!weapon) effectiveMode = 'unarmed';
    } else if (mode === 'offhand') {
      // Two-weapon fighting bonus attack. Weapon 2 is the off-hand
      // slot; we leave the mode tag as 'offhand' so downstream code
      // (getModifier / damage flow) can branch and strip the damage
      // modifier per 5e rules. isOffHand=true also flips the action
      // cost from "action" to "bonus" in resolveAction.
      weapon = equipment.weapon2 || null;
      isOffHand = true;
      if (!weapon) effectiveMode = 'unarmed';
    }

    if (effectiveMode === 'unarmed') weapon = null;

    const action = {
      type: 'basic',
      name: 'Attack',
      mode: effectiveMode,
      weapon,
      isOffHand,
    };
    const resolved = resolveAction(action, selectedCharacter);
    return { ...action, resolved };
  }, [equippedItems, selectedCharacter]);

  // Handler fired by the action bar when the off-hand attack becomes
  // available (main action spent + weapon2 equipped + bonus unused).
  // We build an off-hand basic attack and route it straight into
  // targeting mode — no mode cycling, no slot picker.
  const handleOffhandAttack = React.useCallback(() => {
    const action = buildAttackAction('offhand');
    if (!action?.weapon) {
      toast.error('No off-hand weapon equipped.');
      return;
    }
    // GM always allowed; otherwise enforce turn gate.
    if (campaign?.combat_active && campaign?.combat_data && !isGM && !isActorsTurn) {
      toast.error("It's not this character's turn!");
      return;
    }
    if (!actionsState.bonus) {
      toast.error('No bonus action available this turn!');
      return;
    }
    setCombatState({ isOpen: false, step: 'selecting_target', action, target: null });
  }, [buildAttackAction, campaign?.combat_active, campaign?.combat_data, isGM, isActorsTurn, actionsState.bonus]);

  // Class ability handler — dispatches Rage, Reckless, Second Wind,
  // Action Surge, Flurry of Blows, Bardic Inspiration clicks from the
  // Bardic Inspiration application. Stores { die, fromName } on the
  // target combatant inside combat_data.order so the TurnOrderBar can
  // render a ♪ badge and the CombatDiceWindow can offer the +die
  // prompt on the target's next d20. The resource has already been
  // decremented by handleClassAbility before we enter targeting.
  const applyBardicInspiration = React.useCallback((target, die, fromName) => {
    if (!campaign?.combat_data?.order) return;
    const targetKey = target.uniqueId || target.id;
    if (!targetKey) return;
    const newOrder = campaign.combat_data.order.map((c) => {
      const ck = c.uniqueId || c.id;
      if (ck !== targetKey) return c;
      return { ...c, bardicInspiration: { die, fromName } };
    });
    const newData = { ...campaign.combat_data, order: newOrder };
    queryClient.setQueryData(['campaign', campaignId], (old) =>
      old ? { ...old, combat_data: newData } : old,
    );
    base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
    toast.success(`${target.name} gains Bardic Inspiration (${die})`);
  }, [campaign?.combat_data, campaignId, queryClient]);

  // Persist an exhaustion level on a combatant in combat_data.order.
  // Effects auto-apply via getConditionModifiers reading actor.exhaustion.
  const setCombatantExhaustion = React.useCallback((combatantKey, level) => {
    if (!campaign?.combat_data?.order || !combatantKey) return;
    const newOrder = campaign.combat_data.order.map((c) => {
      const ck = c.uniqueId || c.id;
      if (ck !== combatantKey) return c;
      if (level <= 0) {
        const { exhaustion: _e, ...rest } = c;
        return rest;
      }
      return { ...c, exhaustion: level };
    });
    const newData = { ...campaign.combat_data, order: newOrder };
    queryClient.setQueryData(['campaign', campaignId], (old) => old ? { ...old, combat_data: newData } : old);
    base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
    const target = newOrder.find((c) => (c.uniqueId || c.id) === combatantKey);
    if (target) {
      logCombatEvent(campaignId, `${target.name} — Exhaustion level ${level}.`, {
        event: 'exhaustion_set', category: 'condition', target: target.name, level,
      });
      toast(level > 0 ? `${target.name}: Exhaustion ${level}` : `${target.name} is no longer exhausted.`);
    }
  }, [campaign?.combat_data, campaignId, queryClient]);

  // Grant or clear DM inspiration on a combatant. Stored as
  // `hasInspiration: true` so the dice window can surface the
  // advantage prompt and the portrait renders the ★ badge.
  const setCombatantInspiration = React.useCallback((combatantKey, granted) => {
    if (!campaign?.combat_data?.order || !combatantKey) return;
    const newOrder = campaign.combat_data.order.map((c) => {
      const ck = c.uniqueId || c.id;
      if (ck !== combatantKey) return c;
      if (!granted) {
        const { hasInspiration: _i, ...rest } = c;
        return rest;
      }
      return { ...c, hasInspiration: true };
    });
    const newData = { ...campaign.combat_data, order: newOrder };
    queryClient.setQueryData(['campaign', campaignId], (old) => old ? { ...old, combat_data: newData } : old);
    base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
    const target = newOrder.find((c) => (c.uniqueId || c.id) === combatantKey);
    if (target) {
      logCombatEvent(campaignId, granted
        ? `${target.name} gains Inspiration!`
        : `${target.name}'s Inspiration cleared.`,
        { event: 'inspiration', category: 'buff', target: target.name, granted }
      );
      toast(granted ? `${target.name}: Inspiration ★` : `${target.name}: Inspiration cleared`);
    }
  }, [campaign?.combat_data, campaignId, queryClient]);

  // Consume a stored Bardic Inspiration on a combatant. Strips the
  // bardicInspiration key back off their combat_data.order entry so
  // the badge disappears and subsequent rolls don't retrigger.
  const clearBardicInspiration = React.useCallback((combatantKey) => {
    if (!campaign?.combat_data?.order || !combatantKey) return;
    const newOrder = campaign.combat_data.order.map((c) => {
      const ck = c.uniqueId || c.id;
      if (ck !== combatantKey) return c;
      const { bardicInspiration: _b, ...rest } = c;
      return rest;
    });
    const newData = { ...campaign.combat_data, order: newOrder };
    queryClient.setQueryData(['campaign', campaignId], (old) =>
      old ? { ...old, combat_data: newData } : old,
    );
    base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
  }, [campaign?.combat_data, campaignId, queryClient]);

  // Lay on Hands: heal a target for `amount` HP (capped at max) OR
  // spend 5 HP from the pool to remove a disease/poison condition.
  // Consumes the paladin's action. Updates the pool in
  // combat_data.classResources.
  const applyLayOnHands = React.useCallback(({ targetKey, amount, cure }) => {
    const char = selectedCharacter;
    if (!char || !selectedCharacterKey) return;
    const level = char.level || char.stats?.level || 1;
    const maxPool = layOnHandsPool(level);
    const cd = campaign?.combat_data || {};
    const res = cd.classResources?.[selectedCharacterKey] || {};
    const pool = res.layOnHandsRemaining ?? maxPool;
    const cost = cure ? 5 : Math.max(0, Math.min(pool, amount || 0));
    if (cost <= 0) { toast.error('Nothing to spend.'); return; }
    if (cost > pool) { toast.error(`Only ${pool} HP in the pool.`); return; }
    // Spend the action and decrement the pool.
    setActionsState((prev) => ({ ...prev, action: false }));
    const newPool = pool - cost;
    const newRes = {
      ...(cd.classResources || {}),
      [selectedCharacterKey]: { ...res, layOnHandsRemaining: newPool },
    };
    const newData = { ...cd, classResources: newRes };
    queryClient.setQueryData(['campaign', campaignId], (old) => old ? { ...old, combat_data: newData } : old);
    base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);

    // Apply the heal / cure. Players heal via Character entity; NPCs
    // / monsters heal via combat_queue order. We match the pattern
    // existing heal paths use.
    const target = (cd.order || []).find(c => (c.uniqueId || c.id) === targetKey);
    const targetName = target?.name || 'target';
    if (cure) {
      // Strip one disease / poison condition. Active conditions
      // state is authoritative here.
      setActiveConditions((prev) => {
        const cur = prev[targetKey] || [];
        const next = cur.filter((c) => !/poison|disease/i.test(c));
        if (next.length === cur.length) return prev;
        return { ...prev, [targetKey]: next };
      });
      logCombatEvent(campaignId, `${char.name} cures ${targetName} of disease/poison. (Pool: ${newPool}/${maxPool})`, {
        event: 'lay_on_hands_cure',
        category: 'heal',
        actor: char.name,
        target: targetName,
      });
      toast.success(`${char.name} cures ${targetName}.`);
      return;
    }
    // Heal amount on target. Players use Character entity update;
    // NPC/monster/queue entries use setInitiativeOrder via the combat
    // data order. We update combat_data.order regardless so spectators
    // see it live.
    const hpNow = target?.hit_points?.current ?? 0;
    const hpMax = target?.hit_points?.max ?? 0;
    const newCurrent = Math.min(hpMax, hpNow + cost);
    const updatedOrder = (cd.order || []).map((c) => {
      if ((c.uniqueId || c.id) !== targetKey) return c;
      return { ...c, hit_points: { ...(c.hit_points || {}), current: newCurrent } };
    });
    const dataWithOrder = { ...newData, order: updatedOrder };
    queryClient.setQueryData(['campaign', campaignId], (old) => old ? { ...old, combat_data: dataWithOrder } : old);
    base44.entities.Campaign.update(campaignId, { combat_data: dataWithOrder }).catch(console.error);
    // If the target is a DB-backed character, persist HP there too.
    const targetCharId = target?.characterId || (typeof target?.id === 'string' && target.id.startsWith('player-') ? null : null);
    if (targetCharId) {
      base44.entities.Character.update(targetCharId, {
        hit_points: { ...(target?.hit_points || {}), current: newCurrent },
      }).catch(console.error);
      queryClient.invalidateQueries({ queryKey: ['campaignCharacters', campaignId] });
    }
    logCombatEvent(campaignId, `${char.name} lays on hands, healing ${targetName} for ${cost} HP. (Pool: ${newPool}/${maxPool})`, {
      event: 'lay_on_hands', category: 'heal', actor: char.name, target: targetName, heal: cost,
    });
    toast.success(`${char.name} heals ${targetName} for ${cost} HP.`);
  }, [selectedCharacter, selectedCharacterKey, campaign?.combat_data, campaignId, queryClient, setActionsState, setActiveConditions]);

  // Turn Undead: each selected enemy combatant rolls a WIS save vs
  // the cleric's spell save DC. Failures gain the Turned condition
  // (1 minute). At cleric level 5+ the Destroy Undead threshold kills
  // low-CR undead outright.
  const applyTurnUndead = React.useCallback((selections) => {
    const char = selectedCharacter;
    if (!char || !selectedCharacterKey) return;
    const level = char.level || char.stats?.level || 1;
    const wisScore = char.attributes?.wis || char.stats?.wisdom || 10;
    const dc = spellSaveDC(proficiencyBonus(level), abilityModifier(wisScore));
    // Destroy Undead CR threshold (Cleric level → max CR). The table
    // uses mixed strings ('1/2') and numbers, so parse conservatively.
    const thresholdsTable = CLASS_ABILITY_MECHANICS['Destroy Undead']?.crThresholds || {};
    let destroyCR = -1;
    for (const [lvl, cr] of Object.entries(thresholdsTable).sort((a, b) => Number(b[0]) - Number(a[0]))) {
      if (level >= Number(lvl)) {
        destroyCR = typeof cr === 'string' ? (() => {
          const parts = cr.split('/');
          return parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : Number(cr);
        })() : cr;
        break;
      }
    }
    setActionsState((prev) => ({ ...prev, action: false }));
    const cd = campaign?.combat_data || {};
    const res = cd.classResources?.[selectedCharacterKey] || {};
    const maxCD = level >= 18 ? 3 : level >= 6 ? 2 : 1;
    const newRes = {
      ...(cd.classResources || {}),
      [selectedCharacterKey]: { ...res, channelDivinityRemaining: Math.max(0, (res.channelDivinityRemaining ?? maxCD) - 1) },
    };
    const newData = { ...cd, classResources: newRes };
    queryClient.setQueryData(['campaign', campaignId], (old) => old ? { ...old, combat_data: newData } : old);
    base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
    logCombatEvent(campaignId, `${char.name} channels divine energy! Turn Undead!`, {
      event: 'turn_undead', category: 'spell', actor: char.name, dc,
    });
    for (const { combatant, isUndead } of selections) {
      if (!isUndead) continue;
      const wisMod = abilityModifier(combatant.attributes?.wis || combatant.stats?.wisdom || combatant.wisdom || 10);
      const d20 = Math.floor(Math.random() * 20) + 1;
      const total = d20 + wisMod;
      const saved = total >= dc;
      const undeadCR = typeof combatant.cr === 'string' ? (() => {
        const parts = combatant.cr.split('/');
        return parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : Number(combatant.cr);
      })() : (combatant.cr ?? combatant.challenge_rating ?? 99);
      const combatantKey = combatant.uniqueId || combatant.id;
      if (saved) {
        logCombatEvent(campaignId, `${combatant.name} resists the turning. (WIS ${total} vs DC ${dc})`, {
          event: 'turn_undead_resisted', category: 'condition', target: combatant.name,
        });
        continue;
      }
      if (destroyCR >= 0 && undeadCR <= destroyCR) {
        logCombatEvent(campaignId, `${combatant.name} is destroyed by divine power!`, {
          event: 'destroy_undead', category: 'condition', target: combatant.name,
        });
        toast.success(`${combatant.name} destroyed!`);
        // TODO: mark as defeated — out of scope for this integration.
        continue;
      }
      if (combatantKey) {
        setActiveConditions((prev) => {
          const cur = prev[combatantKey] || [];
          if (cur.includes('Turned')) return prev;
          return { ...prev, [combatantKey]: [...cur, 'Turned'] };
        });
      }
      logCombatEvent(campaignId, `${combatant.name} is Turned! (WIS ${total} vs DC ${dc})`, {
        event: 'turn_undead_hit', category: 'condition', target: combatant.name,
      });
    }
  }, [selectedCharacter, selectedCharacterKey, campaign?.combat_data, campaignId, queryClient, setActionsState, setActiveConditions]);

  // Wild Shape: store the pre-transform HP, swap the druid's HP with
  // the beast's, stash the beast on classResources.wildShapeForm. A
  // revert later restores the stored HP (minus any overflow damage
  // to the beast form).
  const applyWildShape = React.useCallback((beastName, beast, isElemental) => {
    const char = selectedCharacter;
    if (!char || !selectedCharacterKey) return;
    const level = char.level || char.stats?.level || 1;
    const isMoon = /circle\s*of\s*the\s*moon/i.test(char.subclass || '');
    const cd = campaign?.combat_data || {};
    const res = cd.classResources?.[selectedCharacterKey] || {};
    if (isElemental) {
      // Costs 2 spell slots. Burn the two highest-level slots still
      // available (simplest automation policy).
      const charSpent = spentSlotsByCharacter[selectedCharacterKey] || {};
      const nextSpent = { ...charSpent };
      let toSpend = 2;
      for (let lvl = 9; lvl >= 1 && toSpend > 0; lvl--) {
        const max = maxSpellSlots[lvl] || 0;
        let remaining = max - (nextSpent[lvl] || 0);
        while (remaining > 0 && toSpend > 0) {
          nextSpent[lvl] = (nextSpent[lvl] || 0) + 1;
          remaining -= 1;
          toSpend -= 1;
        }
      }
      if (toSpend > 0) { toast.error('Need 2 spell slots to shift into an elemental.'); return; }
      setSpentSlotsByCharacter((prev) => ({ ...prev, [selectedCharacterKey]: nextSpent }));
    }
    const preHP = char.hit_points?.current ?? 0;
    if (isMoon) setActionsState((prev) => ({ ...prev, bonus: false }));
    else setActionsState((prev) => ({ ...prev, action: false }));
    const newRes = {
      ...(cd.classResources || {}),
      [selectedCharacterKey]: {
        ...res,
        wildShapeRemaining: Math.max(0, (res.wildShapeRemaining ?? 2) - 1),
        wildShapeForm: { name: beastName, ...beast, isElemental },
        preWildShapeHP: preHP,
        preWildShapeMaxHP: char.hit_points?.max ?? preHP,
      },
    };
    // Also overwrite HP on the combat_data.order entry so portraits
    // show the beast HP bar.
    const updatedOrder = (cd.order || []).map((c) => {
      if ((c.uniqueId || c.id) !== selectedCharacterKey) return c;
      return { ...c, hit_points: { current: beast.hp, max: beast.hp }, wildShapeForm: beastName };
    });
    const newData = { ...cd, classResources: newRes, order: updatedOrder };
    queryClient.setQueryData(['campaign', campaignId], (old) => old ? { ...old, combat_data: newData } : old);
    base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
    logCombatEvent(campaignId, `${char.name} transforms into a ${beastName}!`, {
      event: 'wild_shape', category: 'transform', actor: char.name, beast: beastName,
    });
    toast.success(`${char.name} → ${beastName}`);
  }, [selectedCharacter, selectedCharacterKey, campaign?.combat_data, campaignId, queryClient, setActionsState, spentSlotsByCharacter, maxSpellSlots]);

  const revertWildShape = React.useCallback((excessDamage = 0) => {
    const char = selectedCharacter;
    if (!char || !selectedCharacterKey) return;
    const cd = campaign?.combat_data || {};
    const res = cd.classResources?.[selectedCharacterKey] || {};
    const form = res.wildShapeForm;
    if (!form) return;
    const restoredHP = Math.max(0, (res.preWildShapeHP ?? char.hit_points?.current ?? 0) - excessDamage);
    const preMax = res.preWildShapeMaxHP ?? char.hit_points?.max ?? restoredHP;
    const { wildShapeForm: _w, preWildShapeHP: _p, preWildShapeMaxHP: _pm, ...restCleaned } = res;
    const newRes = {
      ...(cd.classResources || {}),
      [selectedCharacterKey]: restCleaned,
    };
    const updatedOrder = (cd.order || []).map((c) => {
      if ((c.uniqueId || c.id) !== selectedCharacterKey) return c;
      const { wildShapeForm: _rm, ...rest } = c;
      return { ...rest, hit_points: { current: restoredHP, max: preMax } };
    });
    const newData = { ...cd, classResources: newRes, order: updatedOrder };
    queryClient.setQueryData(['campaign', campaignId], (old) => old ? { ...old, combat_data: newData } : old);
    base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
    logCombatEvent(campaignId, `${char.name} reverts to their natural form.`, {
      event: 'wild_shape_revert', category: 'transform', actor: char.name,
    });
    toast(`${char.name} reverts from ${form.name}.`);
  }, [selectedCharacter, selectedCharacterKey, campaign?.combat_data, campaignId, queryClient]);

  // Healing potion consumption. Rolls the potion's dice, heals the
  // currently-selected character (capped at max HP), decrements the
  // potion stack from inventory, and consumes the appropriate action
  // economy slot (action / bonus) per the campaign's homebrew rules.
  const drinkHealingPotion = React.useCallback((item, source) => {
    const char = selectedCharacter;
    if (!char || !item?.name) return;
    const potion = HEALING_POTIONS[item.name];
    if (!potion) return;
    // Action-economy gate — homebrew may allow a self-drink as a
    // bonus action; otherwise it's the default "action".
    const costKey = getRule(effectiveRules, 'combat.healing_potions.action_cost') ?? 'action';
    if (costKey === 'action' && !actionsState.action) {
      toast.error('No action available this turn!');
      return;
    }
    if (costKey === 'bonus' && !actionsState.bonus) {
      toast.error('No bonus action available this turn!');
      return;
    }
    setActionsState((prev) => ({ ...prev, [costKey]: false }));

    // Roll the potion's healing dice. Simple NdF+M parser (the
    // HEALING_POTIONS entries are all this shape).
    const dice = potion.healing || '2d4+2';
    let total = 0;
    const parts = dice.split('+').map(s => s.trim());
    for (const p of parts) {
      const m = p.match(/^(\d+)d(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        const f = parseInt(m[2], 10);
        for (let i = 0; i < n; i++) total += Math.floor(Math.random() * f) + 1;
      } else {
        const flat = parseInt(p, 10);
        if (Number.isFinite(flat)) total += flat;
      }
    }

    // Apply the heal. Cap at max HP.
    const hp = char.hit_points || {};
    const maxHP = hp.max || 0;
    const current = hp.current ?? maxHP;
    const newCurrent = Math.min(maxHP, current + total);
    if (char.id && char.type !== 'monster' && char.type !== 'npc') {
      base44.entities.Character.update(char.id, {
        hit_points: { ...hp, current: newCurrent },
      }).catch(console.error);
      queryClient.invalidateQueries({ queryKey: ['campaignCharacters', campaignId] });
    }
    // Also update combat_data.order entry (spectator-visible HP).
    const cd = campaign?.combat_data || {};
    const updatedOrder = (cd.order || []).map((c) => {
      if ((c.uniqueId || c.id) !== selectedCharacterKey) return c;
      return { ...c, hit_points: { ...(c.hit_points || {}), current: newCurrent, max: maxHP } };
    });
    if (updatedOrder.length) {
      const newData = { ...cd, order: updatedOrder };
      queryClient.setQueryData(['campaign', campaignId], (old) => old ? { ...old, combat_data: newData } : old);
      base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
    }

    // Remove one from inventory. Monster/NPC: mutate the local
    // monsterInventory state. Player: update their character record.
    if (source?.monsterIdx !== undefined) {
      setMonsterInventory((prev) => {
        const next = [...prev];
        const it = next[source.monsterIdx];
        if (!it) return prev;
        if ((it.quantity || 1) > 1) next[source.monsterIdx] = { ...it, quantity: it.quantity - 1 };
        else next.splice(source.monsterIdx, 1);
        return next;
      });
    } else if (source?.inventoryIdx !== undefined && char.id) {
      const inventory = Array.isArray(char.inventory) ? [...char.inventory] : [];
      const it = inventory[source.inventoryIdx];
      if (it) {
        if ((it.quantity || 1) > 1) inventory[source.inventoryIdx] = { ...it, quantity: it.quantity - 1 };
        else inventory.splice(source.inventoryIdx, 1);
        base44.entities.Character.update(char.id, { inventory }).catch(console.error);
        queryClient.invalidateQueries({ queryKey: ['campaignCharacters', campaignId] });
      }
    }

    logCombatEvent(campaignId, `${char.name} drinks a ${item.name}, healing ${total} HP! (${newCurrent}/${maxHP} HP)`, {
      event: 'healing_potion', category: 'heal', actor: char.name, potion: item.name, heal: total,
    });
    toast.success(`${char.name} drinks ${item.name}: +${total} HP`);
  }, [selectedCharacter, selectedCharacterKey, campaign?.combat_data, effectiveRules, campaignId, queryClient, actionsState, setActionsState, setMonsterInventory]);

  // Apply a chosen metamagic to a pending spell action. Spends SP
  // and mutates the action (e.g. Quickened changes cost, Twinned
  // tags it for re-target, Heightened flags disadvantage on the
  // save). Returns the updated action.
  const applyMetamagic = React.useCallback((action, metamagic) => {
    if (!metamagic || metamagic === 'none') return action;
    const char = selectedCharacter;
    if (!char || !selectedCharacterKey) return action;
    const cd = campaign?.combat_data || {};
    const res = cd.classResources?.[selectedCharacterKey] || {};
    const level = char.level || char.stats?.level || 1;
    const spLeft = res.sorceryPointsRemaining ?? level;
    const metamagicDef = CLASS_ABILITY_MECHANICS['Metamagic']?.options || {};
    const rawCost = metamagicDef[metamagic]?.cost;
    let cost = typeof rawCost === 'number'
      ? rawCost
      : (metamagic === 'Twinned Spell' ? Math.max(1, action.castLevel || action.level || 1) : 1);
    if (spLeft < cost) { toast.error('Not enough sorcery points.'); return action; }
    const newRes = {
      ...(cd.classResources || {}),
      [selectedCharacterKey]: { ...res, sorceryPointsRemaining: spLeft - cost },
    };
    const newData = { ...cd, classResources: newRes };
    queryClient.setQueryData(['campaign', campaignId], (old) => old ? { ...old, combat_data: newData } : old);
    base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
    const next = { ...action, metamagic };
    if (metamagic === 'Quickened Spell') {
      next.costOverride = 'bonus';
      if (next.resolved) next.resolved = { ...next.resolved, cost: 'bonus' };
    }
    if (metamagic === 'Twinned Spell') next.metamagic_twinned = true;
    if (metamagic === 'Heightened Spell') next.metamagic_heightened = true;
    if (metamagic === 'Empowered Spell') next.metamagic_empowered = true;
    if (metamagic === 'Careful Spell') {
      const chaMod = abilityModifier(char.attributes?.cha || 10);
      next.metamagic_careful_count = Math.max(1, chaMod);
    }
    logCombatEvent(campaignId, `${char.name} applies ${metamagic} (${cost} SP).`, {
      event: 'metamagic', category: 'spell', actor: char.name, metamagic, cost,
    });
    toast(`${metamagic} (${cost} SP)`);
    return next;
  }, [selectedCharacter, selectedCharacterKey, campaign?.combat_data, campaignId, queryClient]);

  // Manual sorcery-point adjustment (GM clicks a diamond to correct
  // the count). Max SP = sorcerer level.
  const handleToggleSorceryPoint = React.useCallback((mode) => {
    if (!selectedCharacterKey || !campaign?.combat_data) return;
    const cd = campaign.combat_data;
    const res = cd.classResources?.[selectedCharacterKey] || {};
    const char = selectedCharacter;
    if (!char) return;
    const level = char.level || char.stats?.level || 1;
    const maxSP = /sorcerer/i.test(char.class || '') ? level : 0;
    if (maxSP <= 0) return;
    const curr = res.sorceryPointsRemaining ?? maxSP;
    let next = curr;
    if (mode === 'spend') next = Math.max(0, curr - 1);
    else if (mode === 'restore') next = Math.min(maxSP, curr + 1);
    if (next === curr) return;
    const newRes = {
      ...(cd.classResources || {}),
      [selectedCharacterKey]: { ...res, sorceryPointsRemaining: next },
    };
    const newData = { ...cd, classResources: newRes };
    queryClient.setQueryData(['campaign', campaignId], (old) =>
      old ? { ...old, combat_data: newData } : old,
    );
    base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
  }, [selectedCharacterKey, selectedCharacter, campaign?.combat_data, campaignId, queryClient]);

  // Lucky feat pip click handler (GM correction of the 3-point
  // pool). Resets on long rest.
  const handleToggleLuck = React.useCallback((mode) => {
    if (!selectedCharacterKey || !campaign?.combat_data) return;
    const cd = campaign.combat_data;
    const res = cd.classResources?.[selectedCharacterKey] || {};
    const max = 3;
    const curr = res.luckyPointsRemaining ?? max;
    let next = curr;
    if (mode === 'spend') next = Math.max(0, curr - 1);
    else if (mode === 'restore') next = Math.min(max, curr + 1);
    if (next === curr) return;
    const newRes = {
      ...(cd.classResources || {}),
      [selectedCharacterKey]: { ...res, luckyPointsRemaining: next },
    };
    const newData = { ...cd, classResources: newRes };
    queryClient.setQueryData(['campaign', campaignId], (old) => old ? { ...old, combat_data: newData } : old);
    base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
  }, [selectedCharacterKey, campaign?.combat_data, campaignId, queryClient]);

  // Manual ki adjustment (GM clicks a diamond to correct the count).
  // Writes through combat_data.classResources so both panels see the
  // change immediately.
  const handleToggleKi = React.useCallback((mode) => {
    if (!selectedCharacterKey || !campaign?.combat_data) return;
    const cd = campaign.combat_data;
    const res = cd.classResources?.[selectedCharacterKey] || {};
    const char = selectedCharacter;
    if (!char) return;
    const level = char.level || char.stats?.level || 1;
    const maxKi = kiPoints(level) || 0;
    const curr = res.kiRemaining ?? maxKi;
    let next = curr;
    if (mode === 'spend') next = Math.max(0, curr - 1);
    else if (mode === 'restore') next = Math.min(maxKi, curr + 1);
    if (next === curr) return;
    const newRes = {
      ...(cd.classResources || {}),
      [selectedCharacterKey]: { ...res, kiRemaining: next },
    };
    const newData = { ...cd, classResources: newRes };
    queryClient.setQueryData(['campaign', campaignId], (old) =>
      old ? { ...old, combat_data: newData } : old,
    );
    base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
  }, [selectedCharacterKey, selectedCharacter, campaign?.combat_data, campaignId, queryClient]);

  // CombatActionBar ability row. Reads and writes classResources in
  // combat_data so changes persist across both panels.
  const handleClassAbility = React.useCallback((abilityId) => {
    if (!selectedCharacterKey || !campaign?.combat_data) return;
    const cd = campaign.combat_data;
    const res = cd.classResources?.[selectedCharacterKey] || {};
    const char = selectedCharacter;
    const level = char?.level || char?.stats?.level || 1;

    const writeResources = (patch) => {
      const newRes = { ...(cd.classResources || {}), [selectedCharacterKey]: { ...res, ...patch } };
      const newData = { ...cd, classResources: newRes };
      queryClient.setQueryData(['campaign', campaignId], (old) =>
        old ? { ...old, combat_data: newData } : old,
      );
      base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
    };

    switch (abilityId) {
      case 'rage': {
        if (res.isRaging) {
          // Toggle OFF
          writeResources({ isRaging: false });
          setActiveConditions((prev) => {
            const cur = prev[selectedCharacterKey] || [];
            return { ...prev, [selectedCharacterKey]: cur.filter((c) => c !== 'Raging') };
          });
          logCombatEvent(campaignId, `${char?.name}'s rage ends.`, { event: 'rage_end', category: 'condition', actor: char?.name });
          toast(`${char?.name}'s rage ends.`);
        } else {
          if ((res.ragesRemaining ?? 1) <= 0) { toast.error('No rages remaining!'); return; }
          if (!actionsState.bonus) { toast.error('No bonus action available!'); return; }
          setActionsState((prev) => ({ ...prev, bonus: false }));
          writeResources({
            isRaging: true,
            ragesRemaining: (res.ragesRemaining ?? (RAGES_PER_DAY[level] || 2)) - 1,
            rageDamageBonus: rageDamageBonus(level),
          });
          setActiveConditions((prev) => {
            const cur = prev[selectedCharacterKey] || [];
            if (cur.includes('Raging')) return prev;
            return { ...prev, [selectedCharacterKey]: [...cur, 'Raging'] };
          });
          logCombatEvent(campaignId, `${char?.name} enters a RAGE!`, { event: 'rage_start', category: 'condition', actor: char?.name });
          toast.success(`${char?.name} enters a RAGE!`);
        }
        break;
      }
      case 'reckless': {
        const next = !res.recklessActive;
        writeResources({ recklessActive: next });
        if (next) {
          logCombatEvent(campaignId, `${char?.name} attacks recklessly!`, { event: 'reckless_attack', category: 'attack', actor: char?.name });
          toast(`${char?.name} attacks recklessly!`);
        }
        break;
      }
      case 'secondWind': {
        if (res.secondWindUsed) { toast.error('Second Wind already used!'); return; }
        if (!actionsState.bonus) { toast.error('No bonus action available!'); return; }
        setActionsState((prev) => ({ ...prev, bonus: false }));
        // Roll 1d10 + fighter level
        const roll = Math.floor(Math.random() * 10) + 1;
        const healAmount = roll + level;
        const hp = char?.hit_points || {};
        const maxHp = hp.max || 0;
        const current = hp.current ?? maxHp;
        const newCurrent = Math.min(maxHp, current + healAmount);
        if (char?.id) {
          base44.entities.Character.update(char.id, {
            hit_points: { ...hp, current: newCurrent },
          }).catch(console.error);
          queryClient.invalidateQueries({ queryKey: ['campaignCharacters', campaignId] });
        }
        writeResources({ secondWindUsed: true });
        logCombatEvent(campaignId, `${char?.name} uses Second Wind, healing ${healAmount} HP! (${newCurrent}/${maxHp} HP)`, {
          event: 'second_wind', category: 'heal', actor: char?.name, heal: healAmount,
        });
        toast.success(`Second Wind! ${char?.name} heals ${healAmount} HP (${roll} + ${level})`);
        break;
      }
      case 'actionSurge': {
        if ((res.actionSurgeRemaining ?? 0) <= 0) { toast.error('No Action Surge uses remaining!'); return; }
        setActionsState((prev) => ({ ...prev, action: true }));
        writeResources({ actionSurgeRemaining: (res.actionSurgeRemaining ?? 1) - 1 });
        logCombatEvent(campaignId, `${char?.name} uses Action Surge!`, { event: 'action_surge', category: 'turn', actor: char?.name });
        toast.success(`Action Surge! ${char?.name} gains an extra action!`);
        break;
      }
      case 'flurry': {
        const maxKi = kiPoints(level);
        if ((res.kiRemaining ?? maxKi) < 1) { toast.error('Not enough ki!'); return; }
        if (!actionsState.bonus) { toast.error('No bonus action available!'); return; }
        setActionsState((prev) => ({ ...prev, bonus: false }));
        writeResources({ kiRemaining: (res.kiRemaining ?? maxKi) - 1 });
        // Set up 2 unarmed strikes using the Extra Attack counter
        setRemainingAttacks(2);
        setTotalExtraAttacks(2);
        const action = buildAttackAction('unarmed');
        if (action) {
          action.name = 'Flurry of Blows';
          action.isFlurry = true;
        }
        setCombatState({ isOpen: false, step: 'selecting_target', action, target: null });
        logCombatEvent(campaignId, `${char?.name} unleashes a Flurry of Blows!`, { event: 'flurry_of_blows', category: 'attack', actor: char?.name });
        toast.success(`${char?.name} unleashes a Flurry of Blows!`);
        break;
      }
      case 'layOnHands': {
        const maxPool = layOnHandsPool(level);
        const pool = res.layOnHandsRemaining ?? maxPool;
        if (pool <= 0) { toast.error('Lay on Hands pool is empty!'); return; }
        if (!actionsState.action) { toast.error('No action available this turn!'); return; }
        setLayOnHandsOpen(true);
        break;
      }
      case 'turnUndead': {
        const maxCD = level >= 18 ? 3 : level >= 6 ? 2 : 1;
        if ((res.channelDivinityRemaining ?? maxCD) <= 0) { toast.error('No Channel Divinity uses remaining!'); return; }
        if (!actionsState.action) { toast.error('No action available this turn!'); return; }
        setTurnUndeadOpen(true);
        break;
      }
      case 'wildShape': {
        const isMoon = /circle\s*of\s*the\s*moon/i.test(char?.subclass || '');
        // If the druid is already transformed, clicking reverts them.
        if (res.wildShapeForm) {
          revertWildShape();
          break;
        }
        if ((res.wildShapeRemaining ?? 2) <= 0) { toast.error('No Wild Shape uses remaining!'); return; }
        if (isMoon ? !actionsState.bonus : !actionsState.action) {
          toast.error(`No ${isMoon ? 'bonus action' : 'action'} available this turn!`);
          return;
        }
        setWildShapeOpen(true);
        break;
      }
      case 'powerAttack': {
        // GWM / Sharpshooter -5/+10 toggle. Persists on class
        // resources so the dice window can read it when rolling.
        const next = !res.powerAttackActive;
        writeResources({ powerAttackActive: next });
        if (next) {
          logCombatEvent(campaignId, `${char?.name} takes a powerful swing/shot! (-5 to hit, +10 damage)`, {
            event: 'power_attack_on', category: 'attack', actor: char?.name,
          });
          toast.success(`Power Attack ON (${char?.name})`);
        } else {
          toast(`Power Attack OFF (${char?.name})`);
        }
        break;
      }
      case 'polearmMaster': {
        // Polearm Master butt-end attack — 1d4 + STR bonus-action
        // melee attack. Requires a qualifying weapon.
        const w1 = equippedItems?.weapon1;
        const w1name = (w1?.name || '').toLowerCase();
        if (!/glaive|halberd|quarterstaff|spear|pike/.test(w1name)) {
          toast.error('Polearm Master needs a glaive, halberd, quarterstaff, spear, or pike.');
          return;
        }
        if (!actionsState.bonus) { toast.error('No bonus action available!'); return; }
        const action = buildAttackAction('melee');
        if (!action) return;
        action.name = 'Butt End';
        action.isPolearmMaster = true;
        action.costOverride = 'bonus';
        // Swap the weapon's damage dice to 1d4 bludgeoning for this
        // strike. We deep-clone the weapon so the rest of the game
        // sees the original damage.
        if (action.weapon) {
          action.weapon = { ...action.weapon, damage: '1d4', damage_type: 'bludgeoning' };
        } else {
          action.weapon = { name: 'Butt End', damage: '1d4', damage_type: 'bludgeoning', properties: [] };
        }
        setCombatState({ isOpen: false, step: 'selecting_target', action, target: null });
        logCombatEvent(campaignId, `${char?.name} readies a butt-end strike.`, {
          event: 'polearm_master', category: 'attack', actor: char?.name,
        });
        break;
      }
      case 'bardicInspiration': {
        if ((res.bardicInspirationRemaining ?? 1) <= 0) { toast.error('No Bardic Inspiration uses remaining!'); return; }
        if (!actionsState.bonus) { toast.error('No bonus action available!'); return; }
        // Determine die size from level (5: d8, 10: d10, 15: d12).
        const dieLevels = CLASS_ABILITY_MECHANICS['Bardic Inspiration']?.die || { 1: 'd6' };
        let die = 'd6';
        for (const [lvl, d] of Object.entries(dieLevels).sort((a, b) => Number(b[0]) - Number(a[0]))) {
          if (level >= Number(lvl)) { die = d; break; }
        }
        // Enter ally-targeting mode. The bonus action and resource
        // decrement are committed up-front (same pattern as leveled
        // spells); cancelling the targeting still burns the use. The
        // onSelectTarget path filters the click to ally/player
        // factions and stores the inspiration on the chosen combatant.
        setActionsState((prev) => ({ ...prev, bonus: false }));
        writeResources({ bardicInspirationRemaining: (res.bardicInspirationRemaining ?? 1) - 1 });
        toast.success(`${char?.name} inspires with a ${die}! Select an ally.`);
        logCombatEvent(campaignId, `${char?.name} grants Bardic Inspiration (${die})!`, {
          event: 'bardic_inspiration', category: 'spell', actor: char?.name, die,
        });
        setCombatState({
          isOpen: false,
          step: 'selecting_target',
          action: {
            type: 'bardic_inspiration',
            name: 'Bardic Inspiration',
            die,
            fromName: char?.name,
            fromKey: selectedCharacterKey,
          },
          target: null,
        });
        break;
      }
      default:
        break;
    }
  }, [
    selectedCharacterKey,
    selectedCharacter,
    campaign?.combat_data,
    campaignId,
    queryClient,
    actionsState,
    setActionsState,
    setActiveConditions,
    buildAttackAction,
    setRemainingAttacks,
    setTotalExtraAttacks,
    setCombatState,
  ]);

  // Handler called when CombatActionBar cycles the attack toggle.
  const handleAttackModeChange = React.useCallback((nextMode) => {
    // Hard lock during initiative setup — nobody acts before FIGHT.
    const stage = campaign?.combat_data?.stage;
    if (stage === 'initiative' || stage === 'arranging') {
      toast.error("Combat hasn't started yet.");
      return;
    }
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
    campaign?.combat_data?.stage,
    isActorsTurn,
    isGM,
    actionsState.action,
    buildAttackAction,
  ]);

  const rollInitiative = () => {
    // Helper: 1d20 + mod, returns a breakdown so the turn order can
    // show "15 (12 + 3)" per combatant.
    const rollD20 = (mod) => {
      const raw = Math.floor(Math.random() * 20) + 1;
      return { raw, mod, total: raw + mod };
    };

    // 1. Get Players
    const playerCombatants = players.map(p => {
      const char = p.character;
      const dex = char?.attributes?.dex || 10;
      const mod = abilityModifier(dex);
      const roll = rollD20(mod);
      const hp = normalizeHp(char);
      return {
        id: `player-${p.user_id}`,
        name: char?.name || p.username,
        avatar: char?.profile_avatar_url || char?.avatar_url || char?.image_url || p.avatar_url,
        bloodied_avatar_url: char?.bloodied_avatar_url || null,
        dexMod: mod,
        type: 'player',
        initiative: roll.total,
        initiativeRoll: roll.raw,
        initiativeMod: roll.mod,
        uniqueId: `player-${p.user_id}`,
        hit_points: hp,
        // PCs are always their own faction.
        faction: 'player',
        originalFaction: 'player',
        charmDuration: null,
      };
    });

    // 2. Get queued combatants from the combat queue (monsters, NPCs,
    // allies, neutrals — whatever the GM lined up). Faction and the
    // normalized HP come straight from the queue entry; initiative
    // is rolled fresh for each combatant as a 1d20 + DEX mod.
    const queuedCombatants = readCombatQueue(campaignId);

    const monsterCombatants = queuedCombatants.map(m => {
      const stats = m.stats || m;
      const dex = stats.dex || stats.attributes?.dex || 10;
      const mod = abilityModifier(dex);
      const roll = rollD20(mod);
      const hp = normalizeHp(m);
      return {
        id: `monster-${m.queueId}`,
        name: m.name,
        avatar: m.image_url || m.avatar_url,
        dexMod: mod,
        type: 'monster',
        initiative: roll.total,
        initiativeRoll: roll.raw,
        initiativeMod: roll.mod,
        uniqueId: `monster-${m.queueId}`,
        initiative_rolled: true,
        hit_points: hp,
        faction: m.faction || 'enemy',
        originalFaction: m.originalFaction || m.faction || 'enemy',
        charmDuration: m.charmDuration ?? null,
      };
    });

    // 3. Combine and Sort
    const allCombatants = [...playerCombatants, ...monsterCombatants].sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      return Math.random() - 0.5;
    });

    // Start Initiative Phase. Initialize classResources for every
    // combatant so ability buttons can read from combat_data.
    const initialResources = {};
    allCombatants.forEach((c) => {
      const key = c.uniqueId || c.id;
      // Player combatants carry class + level; monsters don't.
      if (c.type === 'player' || c.class) {
        // Look up the underlying character for attribute data.
        const charData = characters.find(ch => ch.id === key || ch.name === c.name) || c;
        initialResources[key] = initClassResources({ ...charData, ...c });
      }
    });

    base44.entities.Campaign.update(campaignId, {
      combat_active: true,
      combat_data: {
        stage: 'initiative',
        order: allCombatants,
        rolls: {},
        currentTurnIndex: 0,
        round: 1,
        classResources: initialResources,
      }
    });

    // Campaign log: combat start + each combatant's initiative roll.
    logCombatEvent(campaignId, '⚔️ Combat started! Rolling initiative...', {
      event: 'combat_started',
      category: 'initiative',
    });
    allCombatants.forEach((c) => {
      const sign = (c.initiativeMod || 0) >= 0 ? '+' : '−';
      const absMod = Math.abs(c.initiativeMod || 0);
      logCombatEvent(
        campaignId,
        `${c.name} rolls initiative: ${c.initiative} (${c.initiativeRoll} ${sign} ${absMod})`,
        {
          event: 'initiative_roll',
          category: 'initiative',
          actor: c.name,
          roll: c.initiative,
          raw: c.initiativeRoll,
          mod: c.initiativeMod,
        },
      );
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
        // It's a GM turn. Find this combatant in the combat queue.
        const queueId = currentCombatant.uniqueId?.replace('monster-', '');
        const queue = readCombatQueue(campaignId);
        const foundMonster = queue.find(m =>
          m.queueId === queueId || String(m.queueId) === queueId
        ) || queue.find(m => m.name === currentCombatant.name);

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
      // isTurnOrderAccepted is now driven by combat_data.stage via a
      // separate effect; don't force it true here or the drag-and-drop
      // would lock during the initiative/arranging phases.
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
    setActionsState({ action: true, bonus: true, reaction: true, inspiration: false });
    setAttackMode(null);
    setSneakActive(false);
    setRemainingAttacks(0);
    setTotalExtraAttacks(0);
    setBonusActionSpellCast(false);
    // A dramatic monster save belongs to the GM's active interaction —
    // close it when the turn rotates so it doesn't stay on screen.
    setDramaticDeathSaveKey(null);

    const activeCombatant = campaign?.combat_data?.order?.[0];
    const activeKey = activeCombatant?.uniqueId || activeCombatant?.id;

    // Campaign log: round marker + turn notice. Only fire once per
    // actual change (the effect retriggers whenever the order array
    // recomputes, so gate on prevActiveKeyRef to avoid duplicates).
    if (
      campaign?.combat_active &&
      activeCombatant &&
      activeKey &&
      prevActiveKeyRef.current !== activeKey
    ) {
      const prevRound = prevActiveKeyRef.current === null ? 0 : (prevActiveKeyRef.currentRound || 0);
      const round = campaign?.combat_data?.round || 1;
      if (round !== prevRound) {
        logSystemEvent(campaignId, `— Round ${round} —`, { kind: 'round_divider', round });
        // P.I.E. — bump rounds_in_combat for every player
        // character in the order. Skips monsters/NPCs because
        // resolveCharacterIdFromCombatant returns null for them.
        const order = campaign?.combat_data?.order || [];
        for (const c of order) {
          const charId = resolveCharacterIdFromCombatant(c);
          if (charId) trackStat(charId, campaignId, 'rounds_in_combat');
        }
      }
      logCombatEvent(
        campaignId,
        `${activeCombatant.name}'s turn.`,
        { event: 'turn_start', category: 'turn', actor: activeCombatant.name, round },
      );
      prevActiveKeyRef.currentRound = round;
    }

    // Auto-expire conditions at the start of the active combatant's
    // turn. Currently this only catches Dodging (autoExpire:
    // "start_of_next_turn") but any future condition with the same
    // flag will expire through here too.
    if (activeKey) {
      setActiveConditions(prev => {
        const current = prev[activeKey] || [];
        if (current.length === 0) return prev;
        const expired = [];
        const remaining = current.filter((name) => {
          const cond = DND_CONDITIONS[name];
          if (cond?.autoExpire === 'start_of_next_turn') {
            expired.push(name);
            return false;
          }
          return true;
        });
        if (expired.length === 0) return prev;
        // Toast each expired condition so the GM / players notice.
        const displayName =
          campaign?.combat_data?.order?.find(
            (c) => (c.uniqueId || c.id) === activeKey,
          )?.name || 'Combatant';
        expired.forEach((name) => {
          toast(`${displayName} is no longer ${name}.`);
          logCombatEvent(
            campaignId,
            `${displayName} is no longer ${name}.`,
            { event: 'condition_expired', category: 'condition', target: displayName, condition: name },
          );
        });
        return { ...prev, [activeKey]: remaining };
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

    // Charm decrement: when a charmed ally's turn ends, decrement their
    // charmDuration. If it hits 0 the charm wears off and they revert to
    // their original faction (typically 'enemy'). We look up the
    // combatant whose turn just ended in both the live order (so the
    // turn-tracker UI reflects the new faction immediately) and the
    // combat queue storage (so the new faction persists across re-rolls
    // of initiative). A toast announces the expiration.
    if (prevActiveKey && prevActiveKey !== activeKey) {
      const order = campaign?.combat_data?.order || [];
      const prev = order.find(c => (c.uniqueId || c.id) === prevActiveKey);
      if (prev && prev.faction === 'ally' && typeof prev.charmDuration === 'number') {
        const next = prev.charmDuration - 1;
        if (next <= 0) {
          const revertTo = prev.originalFaction || 'enemy';
          toast(`${prev.name}'s charm has worn off!`);
          updateCombatantFaction(prevActiveKey, { faction: revertTo, charmDuration: null });
        } else {
          updateCombatantFaction(prevActiveKey, { charmDuration: next });
        }
      }
    }

    hidThisTurnRef.current = false;
    prevActiveKeyRef.current = activeKey;
  }, [campaign?.combat_data?.currentTurnIndex, campaign?.combat_data?.round, campaign?.combat_data?.order?.[0]?.id]);

  // Auto-advance when the active combatant is incapacitated (Paralyzed
  // / Stunned / Petrified / Unconscious without a death save / plain
  // Incapacitated). Waits 2s so the GM / players see the "can't act"
  // card before the turn rotates. A downed PC still drops into the
  // dramatic death save window via a different branch, so the
  // incapacitated path here only fires when the combatant is alive
  // but unable to act.
  React.useEffect(() => {
    if (campaign?.combat_data?.stage !== 'combat') return undefined;
    const active = campaign?.combat_data?.order?.[0];
    if (!active) return undefined;
    const activeKey = active.uniqueId || active.id;
    if (active.downed) return undefined; // death save flow handles this
    const conditions = activeConditions[activeKey] || [];
    if (!isIncapacitated(conditions)) return undefined;

    // Incapacitated → drop any Concentration the combatant was
    // holding. The break helper is a no-op when there's nothing.
    if (concentrationByCharacter[activeKey]) {
      breakConcentration(activeKey, 'incapacitated');
    }

    const timer = setTimeout(() => {
      // Re-check state before advancing — the GM may have removed the
      // condition during the delay.
      const stillActive = campaign?.combat_data?.order?.[0];
      if (!stillActive) return;
      const stillKey = stillActive.uniqueId || stillActive.id;
      if (stillKey !== activeKey) return;
      const stillConditions = activeConditions[stillKey] || [];
      if (!isIncapacitated(stillConditions)) return;
      advanceTurn();
    }, 2000);
    return () => clearTimeout(timer);
  }, [
    campaign?.combat_data?.stage,
    campaign?.combat_data?.order?.[0]?.id,
    campaign?.combat_data?.order?.[0]?.uniqueId,
    activeConditions,
    advanceTurn,
  ]);

  // --- Combat data sync: hydration (runs once when the campaign
  // query first loads) -----------------------------------------------
  // If the GM is reopening the panel mid-combat, pull any previously
  // persisted activeConditions / concentrationByCharacter out of the
  // combat_data JSON column and seed the local state with it. Guarded
  // by hydratedCombatDataRef so it only runs once per mount — the
  // write-side effects check the same ref so we don't immediately
  // write the hydrated data back.
  React.useEffect(() => {
    if (hydratedCombatDataRef.current) return;
    if (!campaign?.combat_data) return;
    const persistedConditions = campaign.combat_data.activeConditions;
    const persistedConcentration = campaign.combat_data.concentrationByCharacter;
    if (persistedConditions && typeof persistedConditions === 'object') {
      setActiveConditions(persistedConditions);
    }
    if (persistedConcentration && typeof persistedConcentration === 'object') {
      setConcentrationByCharacter(persistedConcentration);
    }
    hydratedCombatDataRef.current = true;
  }, [campaign?.combat_data]);

  // --- Combat data sync: debounced writes ---------------------------
  // Whenever local activeConditions changes, schedule a write to
  // combat_data.activeConditions 500ms later. Rapid successive
  // toggles collapse to a single write. The combat_data spread is
  // read off the query cache at write time to avoid clobbering any
  // concurrent round / order update.
  React.useEffect(() => {
    if (!hydratedCombatDataRef.current) return;
    if (!campaign?.combat_active || !campaignId) return;
    if (conditionsWriteTimerRef.current) {
      clearTimeout(conditionsWriteTimerRef.current);
    }
    conditionsWriteTimerRef.current = setTimeout(() => {
      const latest = queryClient.getQueryData(['campaign', campaignId]);
      const combatData = latest?.combat_data || {};
      base44.entities.Campaign
        .update(campaignId, {
          combat_data: { ...combatData, activeConditions },
        })
        .catch((err) => console.error('activeConditions write failed:', err));
    }, 500);
    return () => {
      if (conditionsWriteTimerRef.current) clearTimeout(conditionsWriteTimerRef.current);
    };
  }, [activeConditions, campaign?.combat_active, campaignId, queryClient]);

  // Same pattern for concentrationByCharacter. Debounced separately
  // so a concentration start + condition apply (which often happen
  // in the same frame) each get their own write.
  React.useEffect(() => {
    if (!hydratedCombatDataRef.current) return;
    if (!campaign?.combat_active || !campaignId) return;
    if (concentrationWriteTimerRef.current) {
      clearTimeout(concentrationWriteTimerRef.current);
    }
    concentrationWriteTimerRef.current = setTimeout(() => {
      const latest = queryClient.getQueryData(['campaign', campaignId]);
      const combatData = latest?.combat_data || {};
      base44.entities.Campaign
        .update(campaignId, {
          combat_data: { ...combatData, concentrationByCharacter },
        })
        .catch((err) => console.error('concentrationByCharacter write failed:', err));
    }, 500);
    return () => {
      if (concentrationWriteTimerRef.current) clearTimeout(concentrationWriteTimerRef.current);
    };
  }, [concentrationByCharacter, campaign?.combat_active, campaignId, queryClient]);

  // Sync equippedItems + monsterInventory whenever a different character is
  // selected/possessed. This is the single source of truth for both players
  // and monsters, so no matter which selection path fires (Possess dialog,
  // Character selector, CombatQueue click, turn auto-select, seed data)
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

  // Keep the refs the death-save / heal / concentration helpers above
  // read from in sync with the latest query results. The queries
  // themselves are declared at the top of this component now — these
  // refs used to be the only way to safely read them from callbacks
  // defined above the queries. We keep the refs in place because the
  // helpers that consume them (applyHpToEntity, startConcentration,
  // etc.) still read via ref to stay insulated from re-render timing.
  charactersRef.current = characters;
  playersRef.current = players;
  fullSpellsListRef.current = fullSpellsList;

  if (!campaign) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>;
  }

  return (
    <div className="h-screen w-screen bg-[#020617] text-white flex flex-row overflow-hidden">
      <GMSessionSidebar
        activeModal={activeModal}
        onOpenModal={setActiveModal}
        onEndSession={() => setShowEndSessionAlert(true)}
        disconnectedPlayers={disconnectedPlayerSummaries}
      />

      <SessionModal
        isOpen={activeModal === 'party'}
        onClose={() => setActiveModal(null)}
        title="Adventuring Party"
      >
        <AdventuringPartyContent
          campaignId={campaignId}
          campaign={campaign}
          allUserProfiles={allUserProfiles}
          disconnectedPlayers={disconnectedPlayerSummaries}
        />
      </SessionModal>

      <SessionModal
        isOpen={activeModal === 'archives'}
        onClose={() => setActiveModal(null)}
        title="Campaign Archives"
      >
        <CampaignArchivesContent campaignId={campaignId} />
      </SessionModal>

      <SessionModal
        isOpen={activeModal === 'quick_notes'}
        onClose={() => setActiveModal(null)}
        title="Quick Notes"
      >
        <QuickNotesContent
          campaignId={campaignId}
          campaign={campaign}
          user={currentUser}
        />
      </SessionModal>

      <SessionModal
        isOpen={activeModal === 'achievements'}
        onClose={() => setActiveModal(null)}
        title="Achievements & Titles"
      >
        <div className="h-full overflow-y-auto p-6">
          <GMSidebarAchievements
            campaignId={campaignId}
            campaign={campaign}
            allUserProfiles={allUserProfiles}
            characters={characters}
          />
        </div>
      </SessionModal>

      <SessionModal
        isOpen={activeModal === 'players'}
        onClose={() => setActiveModal(null)}
        title="Player Management"
      >
        <div className="h-full overflow-y-auto p-6">
          <GMSidebarPlayers
            campaignId={campaignId}
            campaign={campaign}
            allUserProfiles={allUserProfiles}
            characters={characters}
            disconnectedPlayers={disconnectedPlayerSummaries}
          />
        </div>
      </SessionModal>

      <SessionModal
        isOpen={activeModal === 'updates'}
        onClose={() => setActiveModal(null)}
        title="Campaign Updates"
      >
        <div className="h-full overflow-y-auto p-6">
          <GMSidebarUpdates campaignId={campaignId} />
        </div>
      </SessionModal>

      <SessionModal
        isOpen={activeModal === 'settings'}
        onClose={() => setActiveModal(null)}
        title="Campaign Settings"
      >
        <CampaignSettingsContent
          campaignId={campaignId}
          campaign={campaign}
          allUserProfiles={allUserProfiles}
        />
      </SessionModal>
      <div className="flex-1 min-w-0 flex flex-col">
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

      <div className="relative w-full h-56 overflow-hidden flex-shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${campaign.cover_image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200&h=400&fit=crop'})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#020617]" />
      </div>

      <div className="-mt-16 px-6 pb-10 flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
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
            onDrinkPotion={drinkHealingPotion}
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

            <CustomCompanionApprovalDialog
              characters={characters}
              campaignId={campaignId}
              isGM={isGM}
            />

            {activeDeathSaveTarget && (
              <DeathSaveWindow
                combatant={activeDeathSaveTarget.combatant}
                canRoll={true}
                silent={false}
                onRoll={(d20) => {
                  rollDeathSaveForCombatant(activeDeathSaveTarget.key, d20);
                }}
                onClose={() => {
                  setDramaticDeathSaveKey(null);
                  // Auto-advance the turn if this save belonged to the
                  // active combatant (front of the queue). Monster
                  // dramatic rolls the GM opened manually DON'T
                  // auto-advance — the GM decides when to end the turn.
                  const activeKey =
                    campaign?.combat_data?.order?.[0]?.uniqueId ||
                    campaign?.combat_data?.order?.[0]?.id;
                  if (activeKey === activeDeathSaveTarget.key) {
                    advanceTurn();
                  }
                }}
              />
            )}

            <CombatDiceWindow
              spellDataList={fullSpellsList}
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
                      avatar_url: campaign.combat_data.active_encounter.attackerAvatar,
                      conditions: activeConditions[campaign.combat_data.active_encounter.attackerId] || [],
                    }
                  : selectedCharacter
                    ? {
                        ...selectedCharacter,
                        conditions: activeConditions[getCharacterKey(selectedCharacter)] || [],
                        // Give the dice window live access to the
                        // actor's classResources + any inspiration
                        // stored on their combat_data.order entry.
                        classResources:
                          campaign?.combat_data?.classResources?.[
                            getCharacterKey(selectedCharacter)
                          ] || {},
                        bardicInspiration: (campaign?.combat_data?.order || [])
                          .find((c) => (c.uniqueId || c.id) === getCharacterKey(selectedCharacter))
                          ?.bardicInspiration,
                      }
                    : null
              }
              target={
                (!combatState.isOpen && campaign?.combat_data?.active_encounter)
                  ? {
                      name: campaign.combat_data.active_encounter.targetName,
                      id: campaign.combat_data.active_encounter.targetId,
                      avatar_url: campaign.combat_data.active_encounter.targetAvatar,
                      conditions: activeConditions[campaign.combat_data.active_encounter.targetId] || [],
                    }
                  : combatState.target
                    ? {
                        ...combatState.target,
                        conditions:
                          activeConditions[combatState.target?.id] ||
                          activeConditions[combatState.target?.uniqueId] ||
                          [],
                      }
                    : null
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
              spentSlots={currentSpentSlots}
              onDivineSmite={(slotLevel) => {
                // Spend the Paladin's spell slot the same way the
                // spell picker does — through setSpentSlotsByCharacter.
                const key = selectedCharacterKey;
                if (!key) return;
                setSpentSlotsByCharacter((prev) => {
                  const charSpent = prev[key] || {};
                  return {
                    ...prev,
                    [key]: {
                      ...charSpent,
                      [slotLevel]: (charSpent[slotLevel] || 0) + 1,
                    },
                  };
                });
              }}
              onStunningStrike={({ saved }) => {
                // Decrement ki (persists via combat_data.classResources)
                // and apply the Stunned condition on save failure.
                const key = selectedCharacterKey;
                if (!key) return;
                const cd = campaign?.combat_data || {};
                const res = cd.classResources?.[key] || {};
                const newRes = {
                  ...(cd.classResources || {}),
                  [key]: { ...res, kiRemaining: Math.max(0, (res.kiRemaining ?? 0) - 1) },
                };
                const newData = { ...cd, classResources: newRes };
                queryClient.setQueryData(['campaign', campaignId], (old) =>
                  old ? { ...old, combat_data: newData } : old,
                );
                base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
                if (!saved && combatState.target) {
                  const tKey = combatState.target.uniqueId || combatState.target.id;
                  if (tKey) {
                    setActiveConditions((prev) => {
                      const cur = prev[tKey] || [];
                      if (cur.includes('Stunned')) return prev;
                      return { ...prev, [tKey]: [...cur, 'Stunned'] };
                    });
                  }
                }
              }}
              onBardicInspirationUse={() => {
                // Strip the inspiration off the actor combatant.
                const actorKey = getCharacterKey(selectedCharacter);
                if (actorKey) clearBardicInspiration(actorKey);
              }}
              onStat={(field, amount = 1) => {
                // Closure scopes the tracker to the current actor
                // (selectedCharacter for player turns, the
                // active_encounter attacker for spectator playback)
                // and the active campaign.
                const actorCharId =
                  selectedCharacter?.id
                  || resolveCharacterIdFromCombatant(
                      campaign?.combat_data?.active_encounter?.attackerId
                    );
                if (actorCharId) trackStat(actorCharId, campaignId, field, amount);
              }}
              onLuckySpend={() => {
                // Decrement the Lucky pool on the actor's classResources.
                const key = getCharacterKey(selectedCharacter);
                if (!key) return;
                const cd = campaign?.combat_data || {};
                const cr = cd.classResources?.[key] || {};
                const left = Math.max(0, (cr.luckyPointsRemaining ?? 3) - 1);
                const newRes = { ...(cd.classResources || {}), [key]: { ...cr, luckyPointsRemaining: left } };
                const newData = { ...cd, classResources: newRes };
                queryClient.setQueryData(['campaign', campaignId], (old) => old ? { ...old, combat_data: newData } : old);
                base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
              }}
              onInspirationUse={() => {
                const actorKey = getCharacterKey(selectedCharacter);
                if (actorKey) setCombatantInspiration(actorKey, false);
              }}
              homebrewRules={effectiveRules}

              // Spectator Props
              isSpectator={!combatState.isOpen && !!campaign?.combat_data?.active_encounter}
              spectatorData={campaign?.combat_data?.active_encounter}
              sneakActive={sneakActive}
              extraAttackInfo={
                totalExtraAttacks > 1
                  ? { current: totalExtraAttacks - remainingAttacks, total: totalExtraAttacks }
                  : null
              }

              onViewTurnOrder={async () => {
                // GM dismissed the rolled-initiative readout. Transition
                // the campaign stage so the dice window closes and the
                // TurnOrderBar takes over for drag-and-drop arrangement.
                try {
                  await base44.entities.Campaign.update(campaignId, {
                    combat_data: {
                      ...(campaign?.combat_data || {}),
                      stage: 'arranging',
                    },
                  });
                  queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
                } catch (err) {
                  console.error("Failed to advance to turn-order stage:", err);
                }
              }}

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

                // Healing: rewrite the event into a damage event with a
                // negative delta. clampHp handles the sign, so the HP
                // write-through below handles both paths uniformly.
                if (data.type === 'heal') {
                  // P.I.E. — record before rewrite so the damage
                  // path doesn't see this as a damage stat.
                  const healAmount = Math.abs(data.value || 0);
                  const healerCharId = selectedCharacter?.id || null;
                  if (healerCharId && healAmount > 0) {
                    trackStat(healerCharId, campaignId, 'total_healing_done', healAmount);
                  }
                  data = {
                    ...data,
                    type: 'damage',
                    value: -Math.abs(data.value || 0),
                  };
                }

                // Condition / debuff / buff hooks. Conditions now get
                // auto-written to activeConditions so the portrait
                // ring updates immediately. The GM can still manually
                // untoggle via the CONDITIONS dialog.
                if (data.type === 'condition_applied' && data.condition && data.targetId) {
                  setActiveConditions((prev) => {
                    const current = prev[data.targetId] || [];
                    if (current.includes(data.condition)) return prev;
                    return { ...prev, [data.targetId]: [...current, data.condition] };
                  });
                  toast(`Condition applied: ${data.condition}`);
                  // Look up the target's display name from the order so
                  // the log reads as a name, not a uuid.
                  const targetEntity = campaign?.combat_data?.order?.find(
                    (c) => (c.uniqueId || c.id) === data.targetId,
                  );
                  logCombatEvent(
                    campaignId,
                    `${targetEntity?.name || 'Target'} is now ${data.condition}.`,
                    {
                      event: 'condition_applied',
                      category: 'condition',
                      target: targetEntity?.name,
                      condition: data.condition,
                    },
                  );
                  // Stats: attacker inflicted, target received.
                  const attackerCharId = selectedCharacter?.id || null;
                  if (attackerCharId) trackStat(attackerCharId, campaignId, 'conditions_inflicted');
                  const tgtCharId = resolveCharacterIdFromCombatant(data.targetId);
                  if (tgtCharId) trackStat(tgtCharId, campaignId, 'conditions_received');
                } else if (data.type === 'debuff_applied' && data.debuff) {
                  toast(`Debuff applied: ${data.debuff}`);
                  logCombatEvent(campaignId, `Debuff applied: ${data.debuff}.`, {
                    event: 'debuff_applied',
                    category: 'condition',
                    debuff: data.debuff,
                  });
                } else if (data.type === 'buff_applied' && data.buff) {
                  toast.success(`Buff applied: ${data.buff}`);
                  logCombatEvent(campaignId, `Buff applied: ${data.buff}.`, {
                    event: 'buff_applied',
                    category: 'condition',
                    buff: data.buff,
                  });
                } else if (data.type === 'utility_applied' && data.note) {
                  toast(`Spell effect: ${data.note}`);
                  logCombatEvent(campaignId, `Spell effect: ${data.note}`, {
                    event: 'utility_applied',
                    category: 'spell',
                    note: data.note,
                  });
                }

                // Concentration start event fires from the dice window
                // whenever a spell with a "Concentration, up to X"
                // duration successfully takes effect. Route it into
                // our tracker.
                if (data.type === 'concentration_start' && data.casterId) {
                  startConcentration({
                    casterId: data.casterId,
                    casterName: data.casterName,
                    spell: data.spell,
                    spellLevel: data.spellLevel,
                    targetIds: data.targetIds,
                  });
                  logCombatEvent(
                    campaignId,
                    `${data.casterName || 'Caster'} is concentrating on ${data.spell}.`,
                    {
                      event: 'concentration_start',
                      category: 'spell',
                      actor: data.casterName,
                      spell: data.spell,
                    },
                  );
                }

                if (data.type === 'damage') {
                  // `delta` is positive for damage, negative for healing.
                  // clampHp in hpColor.js does current - delta bounded to [0, max].
                  const targetId = data.targetId;
                  const delta = data.value;

                  // Concentration check: if the damage target is
                  // concentrating on a spell, roll a silent CON save
                  // (DC = max(10, floor(damage/2))). On failure the
                  // concentration breaks and its applied condition is
                  // removed from every target that was under it.
                  if (targetId && delta > 0 && concentrationByCharacter[targetId]) {
                    const dc = CONCENTRATION.saveDC(delta);
                    // Try to find a CON save modifier on the entity.
                    // Players / monsters both expose attributes.con or
                    // stats.constitution; proficiency_bonus + con_save
                    // proficient flags live on character objects.
                    const order = campaign?.combat_data?.order || [];
                    const entity = order.find((c) => (c.uniqueId || c.id) === targetId);
                    const con =
                      entity?.attributes?.con ||
                      entity?.stats?.constitution ||
                      10;
                    const conMod = abilityModifier(con);
                    const profBonus = entity?.proficiency_bonus || 2;
                    const isProf = entity?.saves?.con || entity?.saving_throws?.con || false;
                    const bonus = conMod + (isProf ? profBonus : 0);
                    // Tier 3: War Caster — advantage on concentration
                    // saves. Roll 2d20 take higher.
                    const feats = Array.isArray(entity?.feats) ? entity.feats
                      : Array.isArray(entity?.features) ? entity.features : [];
                    const hasWarCaster = feats.some((f) => {
                      const n = typeof f === 'string' ? f : f?.name;
                      return typeof n === 'string' && n.toLowerCase() === 'war caster';
                    });
                    let d20 = Math.floor(Math.random() * 20) + 1;
                    if (hasWarCaster) {
                      const second = Math.floor(Math.random() * 20) + 1;
                      d20 = Math.max(d20, second);
                    }
                    const total = d20 + bonus;
                    const casterName = concentrationByCharacter[targetId].casterName || entity?.name || 'Caster';
                    const spell = concentrationByCharacter[targetId].spell;
                    if (total < dc) {
                      toast.error(
                        `${casterName} failed CON save (${total} vs DC ${dc})${hasWarCaster ? ' (War Caster)' : ''} — Concentration on ${spell} broken!`,
                      );
                      breakConcentration(targetId, 'damage');
                    } else {
                      toast(
                        `${casterName} maintained Concentration on ${spell} (${total} vs DC ${dc})${hasWarCaster ? ' (War Caster)' : ''}.`,
                      );
                    }
                  }

                  // Tier 3: Sentinel — a melee hit taken as a reaction
                  // (opportunity attack) sets the target's speed to
                  // 0 for the turn. OA targeting isn't fully wired
                  // yet; we key on action.resolved.cost === 'reaction'
                  // + melee mode, which covers any reaction attack
                  // the GM fires through the dice window. Disengage
                  // bypass for Sentinel needs the full OA flow —
                  // note for future work.
                  {
                    const actionCost = combatState.action?.resolved?.cost || combatState.action?.costOverride;
                    const isMelee = combatState.action?.mode === 'melee' || combatState.action?.mode === 'unarmed';
                    const attackerFeats = Array.isArray(selectedCharacter?.feats) ? selectedCharacter.feats
                      : Array.isArray(selectedCharacter?.features) ? selectedCharacter.features : [];
                    const hasSentinel = attackerFeats.some((f) => {
                      const n = typeof f === 'string' ? f : f?.name;
                      return typeof n === 'string' && n.toLowerCase() === 'sentinel';
                    });
                    if (hasSentinel && isMelee && actionCost === 'reaction' && targetId) {
                      setActiveConditions((prev) => {
                        const cur = prev[targetId] || [];
                        if (cur.includes('Grappled')) return prev; // already speed 0
                        return { ...prev, [targetId]: [...cur, 'Grappled'] };
                      });
                      logCombatEvent(campaignId, `${data.detail?.targetName || 'Target'}'s movement is halted by ${selectedCharacter?.name || 'Actor'}! (Sentinel)`, {
                        event: 'sentinel_halt', category: 'condition', actor: selectedCharacter?.name, target: targetId,
                      });
                    }
                  }

                  // Tier 3: Great Weapon Master — crit or kill with a
                  // melee weapon grants a free bonus-action melee
                  // attack. We just surface a toast so the GM can
                  // click the melee attack again (action economy
                  // keeps bonus open).
                  let _killed = false;
                  {
                    const orderForGWM = campaign?.combat_data?.order || [];
                    const tgt = orderForGWM.find((c) => (c.uniqueId || c.id) === targetId);
                    const tgtHp = tgt?.hit_points?.current ?? 0;
                    _killed = data.value >= tgtHp && data.value > 0;
                    if (data.detail?.isCrit || _killed) {
                      const attackerFeats = Array.isArray(selectedCharacter?.feats) ? selectedCharacter.feats
                        : Array.isArray(selectedCharacter?.features) ? selectedCharacter.features : [];
                      const hasGWM = attackerFeats.some((f) => {
                        const n = typeof f === 'string' ? f : f?.name;
                        return typeof n === 'string' && n.toLowerCase() === 'great weapon master';
                      });
                      const wasMelee = combatState.action?.mode === 'melee' || combatState.action?.mode === 'offhand';
                      if (hasGWM && wasMelee && actionsState.bonus) {
                        toast.success('Great Weapon Master: Bonus action melee attack!');
                      }
                    }
                  }

                  // P.I.E. Chart stat tracking — fire-and-forget so
                  // a slow stats write never stalls combat. We track:
                  //   - Damage dealt by the attacker (when player)
                  //   - Damage taken by the target (when player)
                  //   - Kills credited to the attacker (when player
                  //     and target dropped to 0)
                  if (delta > 0) {
                    const attackerCharId = selectedCharacter?.id || null;
                    if (attackerCharId) trackStat(attackerCharId, campaignId, 'total_damage_dealt', delta);
                    const targetCharId = resolveCharacterIdFromCombatant(targetId);
                    if (targetCharId) trackStat(targetCharId, campaignId, 'total_damage_taken', delta);
                    if (_killed && attackerCharId) trackStat(attackerCharId, campaignId, 'kills');
                  }

                  // Taking damage reveals a hidden character.
                  if (targetId && delta > 0) {
                    setHiddenCharacters(prev => {
                      if (!prev.has(targetId)) return prev;
                      const next = new Set(prev);
                      next.delete(targetId);
                      return next;
                    });
                  }

                  // Resolve the target to an actual character entity.
                  // Four id formats in the wild:
                  //   player-<uuid>           → real player via profile email
                  //   player-ghost-<charId>   → orphan character (seeded / imported)
                  //   ghost-<charId>          → same, direct form
                  //   monster-<queueId>       → combat queue entry
                  let resolvedChar = null;
                  let resolvedMonsterQueueId = null;

                  if (targetId.startsWith('player-')) {
                    const rest = targetId.slice('player-'.length);
                    if (rest.startsWith('ghost-')) {
                      const charId = rest.slice('ghost-'.length);
                      resolvedChar = characters.find(c => c.id === charId) || null;
                    } else {
                      const player = players.find(p => p.user_id === rest);
                      if (player) {
                        // Prefer the direct `player.character` ref (works for
                        // both real players AND orphans synthesised as
                        // ghost players), fall back to email match.
                        resolvedChar = player.character ||
                          characters.find(c => c.created_by === player.email) ||
                          null;
                      }
                    }
                  } else if (targetId.startsWith('ghost-')) {
                    const charId = targetId.slice('ghost-'.length);
                    resolvedChar = characters.find(c => c.id === charId) || null;
                  } else if (targetId.startsWith('monster-')) {
                    resolvedMonsterQueueId = targetId.slice('monster-'.length);
                  }

                  // --- Character (player + ghost) HP write-through to DB ---
                  if (resolvedChar) {
                    const maxHp = resolvedChar.hit_points?.max || 0;
                    const currentHp = resolvedChar.hit_points?.current ?? maxHp;

                    // (N) Damage resistance / vulnerability / immunity.
                    // Monster data uses stats.damage_resistances etc. Player
                    // characters carry resistances on their own object (race
                    // features, spells, etc.). Only applies to positive damage.
                    let effectiveDelta = delta;
                    if (delta > 0) {
                      const damageType = data.detail?.damageType || data.detail?.type || null;
                      if (damageType) {
                        const rawDmg = delta;
                        effectiveDelta = applyDamageModifiers(
                          rawDmg,
                          damageType,
                          resolvedChar.resistances || resolvedChar.stats?.damage_resistances || [],
                          resolvedChar.vulnerabilities || resolvedChar.stats?.damage_vulnerabilities || [],
                          resolvedChar.immunities || resolvedChar.stats?.damage_immunities || [],
                        );
                        if (effectiveDelta !== rawDmg) {
                          const label = effectiveDelta < rawDmg ? 'resists' : 'is vulnerable to';
                          logCombatEvent(
                            campaignId,
                            `${resolvedChar.name} ${label} ${damageType} damage! ${rawDmg} → ${effectiveDelta}`,
                            { event: 'damage_modified', category: 'damage', target: resolvedChar.name, raw: rawDmg, final: effectiveDelta, damageType },
                          );
                        }
                      }
                    }

                    // (T) Temp HP absorbs damage before real HP.
                    let tempHp = resolvedChar.hit_points?.temporary || 0;
                    let remainingDelta = effectiveDelta;
                    if (remainingDelta > 0 && tempHp > 0) {
                      const absorbed = Math.min(tempHp, remainingDelta);
                      tempHp -= absorbed;
                      remainingDelta -= absorbed;
                      if (absorbed > 0) {
                        logCombatEvent(campaignId, `${resolvedChar.name}'s temporary HP absorbs ${absorbed} damage.`, {
                          event: 'temp_hp_absorbed', category: 'damage', target: resolvedChar.name, absorbed,
                        });
                      }
                    }

                    const newCurrent = clampHp(currentHp, maxHp, remainingDelta);
                    if (newCurrent !== currentHp) {
                      base44.entities.Character
                        .update(resolvedChar.id, {
                          hit_points: { ...(resolvedChar.hit_points || {}), current: newCurrent, temporary: tempHp },
                        })
                        .then(() => {
                          queryClient.invalidateQueries({ queryKey: ['campaignCharacters', campaignId] });
                        })
                        .catch(err => {
                          console.error('Damage write-back failed:', err);
                          toast.error('Failed to update character HP');
                        });
                      // Campaign log: damage / heal write line.
                      if (delta > 0) {
                        logCombatEvent(
                          campaignId,
                          `${resolvedChar.name} takes ${delta} damage. (${newCurrent}/${maxHp} HP)`,
                          {
                            event: 'damage_applied',
                            category: 'damage',
                            target: resolvedChar.name,
                            damage: delta,
                            current: newCurrent,
                            max: maxHp,
                          },
                        );
                        if (newCurrent === 0) {
                          logCombatEvent(
                            campaignId,
                            `${resolvedChar.name} is DOWNED!`,
                            {
                              event: 'downed',
                              category: 'death_save',
                              target: resolvedChar.name,
                            },
                          );
                        }
                      } else if (delta < 0) {
                        logCombatEvent(
                          campaignId,
                          `${resolvedChar.name} heals ${Math.abs(delta)} HP. (${newCurrent}/${maxHp} HP)`,
                          {
                            event: 'heal_applied',
                            category: 'heal',
                            target: resolvedChar.name,
                            heal: Math.abs(delta),
                            current: newCurrent,
                            max: maxHp,
                          },
                        );
                      }
                    }
                  }

                  // --- Combat-queue HP write-through ---
                  if (resolvedMonsterQueueId) {
                    try {
                      const queue = readCombatQueue(campaignId);
                      if (queue.length > 0) {
                        const newQueue = queue.map(m => {
                          if (m.queueId !== resolvedMonsterQueueId && String(m.queueId) !== resolvedMonsterQueueId) {
                            return m;
                          }
                          const maxHp = m.hit_points?.max || 10;
                          const currentHp = m.hit_points?.current ?? maxHp;
                          const nextHp = clampHp(currentHp, maxHp, delta);
                          // Campaign log entry for monster damage/heal.
                          if (delta > 0) {
                            logCombatEvent(
                              campaignId,
                              `${m.name} takes ${delta} damage. (${nextHp}/${maxHp} HP)`,
                              {
                                event: 'damage_applied',
                                category: 'damage',
                                target: m.name,
                                damage: delta,
                                current: nextHp,
                                max: maxHp,
                              },
                            );
                            if (nextHp === 0 && currentHp > 0) {
                              logCombatEvent(campaignId, `${m.name} is DOWNED!`, {
                                event: 'downed',
                                category: 'death_save',
                                target: m.name,
                              });
                            }
                          } else if (delta < 0) {
                            logCombatEvent(
                              campaignId,
                              `${m.name} heals ${Math.abs(delta)} HP. (${nextHp}/${maxHp} HP)`,
                              {
                                event: 'heal_applied',
                                category: 'heal',
                                target: m.name,
                                heal: Math.abs(delta),
                                current: nextHp,
                                max: maxHp,
                              },
                            );
                          }
                          return {
                            ...m,
                            hit_points: {
                              ...(m.hit_points || {}),
                              current: nextHp,
                              max: maxHp,
                            },
                          };
                        });
                        writeCombatQueue(campaignId, newQueue);
                      }
                    } catch (err) {
                      console.error('Combat queue damage write-back failed:', err);
                    }
                  }

                  // --- Downed / death save bookkeeping on combat_data.order ---
                  if (targetId && campaign?.combat_data?.order) {
                    const orderEntry = campaign.combat_data.order.find(c => (c.uniqueId || c.id) === targetId);
                    if (orderEntry) {
                      const maxHp = orderEntry.hit_points?.max
                        || resolvedChar?.hit_points?.max
                        || 0;
                      const currentHp = orderEntry.hit_points?.current
                        ?? resolvedChar?.hit_points?.current
                        ?? maxHp;
                      const newCurrent = clampHp(currentHp, maxHp, delta);
                      const wasDowned = !!orderEntry.downed;
                      const isCritDamage = data.detail?.isCrit === true;

                      // Healing path: any positive heal restores a downed
                      // combatant to consciousness and clears their saves.
                      if (delta < 0 && wasDowned && newCurrent > 0) {
                        updateOrderCombatant(targetId, {
                          downed: false,
                          deathSaves: blankDeathSaves(),
                          hit_points: { ...(orderEntry.hit_points || {}), current: newCurrent, max: maxHp },
                        });
                        setActiveConditions(prev => {
                          const current = prev[targetId] || [];
                          if (!current.includes('Unconscious')) return prev;
                          return { ...prev, [targetId]: current.filter(c => c !== 'Unconscious') };
                        });
                        toast.success(`${orderEntry.name} regains consciousness!`);
                      } else if (delta > 0 && wasDowned) {
                        // Damage while already at 0 HP → death save failures.
                        // Crits count as 2 failures.
                        const failuresDelta = isCritDamage ? 2 : 1;
                        applyDeathSaveChange(targetId, { failuresDelta });
                      } else if (delta > 0 && !wasDowned && newCurrent <= 0) {
                        // P.I.E. — first drop to 0 HP this combat
                        // counts as a "downed" event for the
                        // character (skipped for monsters).
                        const downedCharId = resolveCharacterIdFromCombatant(orderEntry);
                        if (downedCharId) trackStat(downedCharId, campaignId, 'times_downed');
                        // Freshly dropped to 0. Non-lethal → immediate
                        // stabilize (Knocked Out). Otherwise initialize
                        // the death save tracker.
                        if (nonLethalActive) {
                          updateOrderCombatant(targetId, {
                            downed: true,
                            deathSaves: { successes: 0, failures: 0, stabilized: true, dead: false },
                            hit_points: { ...(orderEntry.hit_points || {}), current: 0, max: maxHp },
                          });
                          toast(`${orderEntry.name} is knocked out!`);
                        } else {
                          updateOrderCombatant(targetId, {
                            downed: true,
                            deathSaves: blankDeathSaves(),
                            hit_points: { ...(orderEntry.hit_points || {}), current: 0, max: maxHp },
                          });
                          toast.error(`${orderEntry.name} is down!`);
                        }
                        // Mark Unconscious on the conditions map too.
                        setActiveConditions(prev => {
                          const current = prev[targetId] || [];
                          if (current.includes('Unconscious')) return prev;
                          return { ...prev, [targetId]: [...current, 'Unconscious'] };
                        });
                      } else if (newCurrent !== currentHp) {
                        // Regular HP tick — keep the order entry in sync
                        // so the HP bars in the turn tracker are live.
                        updateOrderCombatant(targetId, {
                          hit_points: { ...(orderEntry.hit_points || {}), current: newCurrent, max: maxHp },
                        });
                      }
                    }
                  }
                }
              }}
              onActionComplete={() => {
                const isAttackAction = combatState.action?.name === 'Attack';
                const isMainHandAttack = isAttackAction && !combatState.action?.isOffHand;

                // (M) Extra Attack: on the FIRST attack of the Action,
                // initialize the counter from the registry. On subsequent
                // attacks, decrement it. While remaining > 0, re-enter
                // targeting mode instead of closing the dice window so
                // the character can pick a new target for their next hit.
                if (isMainHandAttack) {
                  if (remainingAttacks === 0 && totalExtraAttacks === 0) {
                    // First attack of this Action — initialize counter.
                    const total = attacksPerAction(
                      selectedCharacter?.class,
                      selectedCharacter?.level || selectedCharacter?.stats?.level || 1,
                    );
                    if (total > 1) {
                      setRemainingAttacks(total - 1); // -1 because first just resolved
                      setTotalExtraAttacks(total);
                      // Consume the action cost on the FIRST attack only.
                      const resolvedCost = combatState.action?.resolved?.cost;
                      if (resolvedCost) {
                        setActionsState(prev => consumeActionCost(prev, resolvedCost));
                      }
                      // Sneak attack reveals on the first hit.
                      if (sneakActive) {
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
                      // Re-enter targeting for the next attack.
                      const action = buildAttackAction(combatState.action?.mode || 'melee');
                      setCombatState({ isOpen: false, step: 'selecting_target', action, target: null });
                      // Clear the active encounter so spectators don't see stale data.
                      if (campaign?.combat_data?.active_encounter) {
                        base44.entities.Campaign.update(campaignId, {
                          combat_data: { ...campaign.combat_data, active_encounter: null },
                        }).catch(() => {});
                      }
                      return; // Don't fall through to the normal close path.
                    }
                  } else if (remainingAttacks > 0) {
                    // Subsequent attacks — decrement counter.
                    const left = remainingAttacks - 1;
                    setRemainingAttacks(left);
                    if (left > 0) {
                      const action = buildAttackAction(combatState.action?.mode || 'melee');
                      setCombatState({ isOpen: false, step: 'selecting_target', action, target: null });
                      if (campaign?.combat_data?.active_encounter) {
                        base44.entities.Campaign.update(campaignId, {
                          combat_data: { ...campaign.combat_data, active_encounter: null },
                        }).catch(() => {});
                      }
                      return; // More attacks left — stay in the targeting loop.
                    }
                    // Last attack resolved → fall through to normal close.
                    setTotalExtraAttacks(0);
                  }
                }

                // Consume the action's cost now that it has been resolved
                // (or for single-attack characters, on the only attack).
                const resolvedCost = combatState.action?.resolved?.cost;
                if (resolvedCost && totalExtraAttacks <= 1) {
                  setActionsState(prev => consumeActionCost(prev, resolvedCost));
                }
                // Reset Extra Attack counter in case it wasn't already.
                setRemainingAttacks(0);
                setTotalExtraAttacks(0);
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

                    // Villain action timing (MCDM): when the *finished*
                    // combatant is non-villain (i.e. "an enemy" from the
                    // villain's POV), check every villain in the queue
                    // for an unspent action for the current round.
                    // Surface the first match as a prompt — the GM
                    // confirms, the action resolves, and the round's
                    // entry lands in the villain's villain_spent[].
                    const round = campaign.combat_data.round || 1;
                    const finishedIsVillain = !!(
                      finished?.villain_actions?.enabled
                      || finished?.villain_data?.villain_actions?.enabled
                      || finished?.is_villain
                    );
                    let villainToPrompt = null;
                    if (!finishedIsVillain) {
                      for (const entry of currentOrder) {
                        const vBlock = entry?.villain_actions
                          || entry?.villain_data?.villain_actions
                          || entry?.stats?.villain_actions
                          || null;
                        if (!vBlock?.enabled || !Array.isArray(vBlock.actions)) continue;
                        const spent = Array.isArray(entry.villain_spent) ? entry.villain_spent : [];
                        if (spent.includes(round)) continue;
                        const action = vBlock.actions.find((a) => (a?.round || 0) === round)
                          || vBlock.actions[round - 1];
                        if (!action || !action.name) continue;
                        villainToPrompt = { villain: entry, action, round };
                        break;
                      }
                    }

                    await base44.entities.Campaign.update(campaignId, {
                      combat_data: {
                        ...campaign.combat_data,
                        order: currentOrder,
                        currentTurnIndex: 0 // Always 0 as we rotate the array
                      }
                    });
                    queryClient.invalidateQueries(['campaign', campaignId]);

                    if (villainToPrompt) setVillainPrompt(villainToPrompt);
                  }
                }
                setAttackMode(null);
                setCombatState({ step: 'idle', isOpen: false, action: null, target: null });
              }}
            />

            <VillainActionPrompt
              prompt={villainPrompt}
              onClose={() => setVillainPrompt(null)}
              onConfirm={async () => {
                if (!villainPrompt) return;
                const { villain, action, round } = villainPrompt;
                const villainKey = villain.uniqueId || villain.id;
                const currentOrder = Array.isArray(campaign?.combat_data?.order) ? campaign.combat_data.order : [];
                const nextOrder = currentOrder.map((entry) => {
                  const key = entry.uniqueId || entry.id;
                  if (key !== villainKey) return entry;
                  const spent = Array.isArray(entry.villain_spent) ? entry.villain_spent : [];
                  if (spent.includes(round)) return entry;
                  return { ...entry, villain_spent: [...spent, round] };
                });
                await base44.entities.Campaign.update(campaignId, {
                  combat_data: { ...campaign.combat_data, order: nextOrder },
                });
                queryClient.invalidateQueries(['campaign', campaignId]);
                logCombatEvent(
                  campaignId,
                  `${villain.name} uses Villain Action: ${action.name}`,
                  { event: 'villain_action', actor: villain.name, action: action.name, round },
                );
                setVillainPrompt(null);
                // Open the dice window pre-configured with the villain
                // action so the GM can resolve it through the normal
                // pipeline. action_type drives the dice flow (save /
                // attack / no_roll / healing).
                setCombatState({
                  step: 'selecting_target',
                  isOpen: true,
                  action: {
                    type: 'villain_action',
                    name: action.name,
                    description: action.description,
                    action_type: action.action_type,
                    save_ability: action.save_ability,
                    save_dc: action.save_dc,
                    attack_bonus: action.attack_bonus,
                    damage: action.damage_dice,
                    damage_type: action.damage_type,
                    half_on_save: action.half_on_save,
                    aoe_shape: action.aoe_shape,
                    aoe_size: action.aoe_size,
                    applies_condition: action.applies_condition,
                    costOverride: 'free',
                    villain_round: round,
                    _raw: action,
                  },
                  target: null,
                });
              }}
            />

            <div className="flex justify-between items-end relative">
              {combatActive && (
                <TurnOrderBar
                  order={initiativeOrder}
                  setOrder={setInitiativeOrder}
                  activeConditions={activeConditions}
                  concentrationByCharacter={concentrationByCharacter}
                  onSelectTarget={(target) => {
                    if (combatState.step !== 'selecting_target') return;
                    // Bardic Inspiration: ally-only targeting. Store
                    // the inspiration die on the target combatant in
                    // combat_data.order and exit targeting mode.
                    if (combatState.action?.type === 'bardic_inspiration') {
                      const targetFaction = getFaction(target);
                      if (targetFaction !== 'player' && targetFaction !== 'ally') {
                        toast.error('Bardic Inspiration can only target allies.');
                        return;
                      }
                      const targetKey = target.uniqueId || target.id;
                      const fromKey = combatState.action.fromKey;
                      if (targetKey && fromKey && targetKey === fromKey) {
                        toast.error('You cannot target yourself.');
                        return;
                      }
                      applyBardicInspiration(target, combatState.action.die, combatState.action.fromName);
                      setCombatState({ step: 'idle', isOpen: false, action: null, target: null });
                      return;
                    }
                    // Faction-aware targeting: non-GMs get a confirmation
                    // prompt when the target is an ally or a neutral.
                    // GMs can always target anything.
                    const targetFaction = getFaction(target);
                    const needsConfirm = !isGM && (targetFaction === 'ally' || targetFaction === 'neutral');
                    if (needsConfirm) {
                      const label = targetFaction === 'ally' ? 'ally' : 'neutral';
                      // eslint-disable-next-line no-alert
                      const ok = window.confirm(`Target ${target.name}? They're ${label === 'ally' ? 'an ally' : 'neutral'}.`);
                      if (!ok) return;
                    }
                    setCombatState(prev => ({ ...prev, target, step: 'rolling', isOpen: true }));
                  }}
                  isGM={isGM}
                  onChangeFaction={updateCombatantFaction}
                  onSetExhaustion={setCombatantExhaustion}
                  onGrantInspiration={setCombatantInspiration}
                  selectionMode={combatState.step === 'selecting_target'}
                  isTurnOrderAccepted={isTurnOrderAccepted}
                  // Pass helpers to lookup HP. Everything flows through
                  // normalizeHp so legacy entries (string HP, nested
                  // stats.hit_points, etc.) render consistently.
                  getHp={(id) => {
                    if (id.startsWith('player-')) {
                      const rest = id.slice('player-'.length);
                      if (rest.startsWith('ghost-')) {
                        const charId = rest.slice('ghost-'.length);
                        const char = characters.find(c => c.id === charId);
                        return normalizeHp(char);
                      }
                      const p = players.find(p => `player-${p.user_id}` === id);
                      return normalizeHp(p?.character);
                    }
                    if (id.startsWith('monster-')) {
                      const qId = id.replace('monster-', '');
                      const q = readCombatQueue(campaignId);
                      const m = q.find(m => m.queueId === qId || String(m.queueId) === qId);
                      return normalizeHp(m);
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
                          {acceptTurnOrderMutation.isPending ? "STARTING..." : "FIGHT"}
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
              </div>
            </div>

            {campaign?.combat_data?.stage === 'initiative' || campaign?.combat_data?.stage === 'arranging' ? (
              // Combat hasn't actually started yet — the GM is still
              // arranging the initiative order. Lock the whole action
              // surface so nobody (GM included) can fire actions, pick
              // targets, or roll anything. The only interactive element
              // during this stage is the draggable TurnOrderBar + the
              // FIGHT button above it.
              <div className="relative z-20 rounded-[32px] bg-[#050816]/95 px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.75)] text-center">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#37F2D1]/80 font-bold mb-2">
                  Initiative Setup
                </p>
                <p className="text-white/80 text-sm">
                  Arrange the turn order, then press <span className="text-[#37F2D1] font-bold">FIGHT</span> to begin combat.
                </p>
                <p className="text-slate-500 text-[11px] mt-2 italic">
                  Actions are locked until combat starts.
                </p>
              </div>
            ) : selectedDownedEntry ? (
              <DeathSavePanel
                combatant={selectedDownedEntry}
                isPlayer={selectedCharacter?.type === 'player'}
                isActiveTurn={
                  (campaign?.combat_data?.order?.[0]?.uniqueId ||
                    campaign?.combat_data?.order?.[0]?.id) === selectedCharacterKey
                }
                onRoll={() => rollDeathSaveForCombatant(selectedCharacterKey)}
                onAdjust={(change) => applyDeathSaveChange(selectedCharacterKey, change)}
                onKill={() => applyDeathSaveChange(selectedCharacterKey, { failures: 3, dead: true })}
                onShowDramatic={() => setDramaticDeathSaveKey(selectedCharacterKey)}
              />
            ) : isIncapacitated(activeConditions[selectedCharacterKey] || []) ? (
              // Incapacitated / Paralyzed / Stunned / Petrified /
              // Unconscious — the character can't take actions. Show
              // a status card instead of the action bar. The turn
              // auto-advances after a short delay so the GM doesn't
              // have to click END TURN.
              <div className="relative z-20 rounded-[32px] bg-[#050816]/95 px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.75)] text-center">
                <p className="text-[10px] uppercase tracking-[0.32em] text-red-400/90 font-bold mb-1">
                  Can't Act
                </p>
                <p className="text-white text-lg font-black">
                  {selectedCharacter?.name || 'This combatant'}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  is{' '}
                  <span className="text-red-300 font-bold">
                    {getNoActionConditionName(activeConditions[selectedCharacterKey] || []) || 'Incapacitated'}
                  </span>{' '}
                  and cannot take actions or reactions.
                </p>
                <p className="text-slate-600 text-[10px] mt-2 italic">
                  Turn will auto-advance in a moment.
                </p>
              </div>
            ) : (
            <CombatActionBar
              character={selectedCharacter ? { ...selectedCharacter, equipment: equippedItems } : null}
              actionsState={actionsState}
              setActionsState={setActionsState}
              attackMode={attackMode}
              onAttackModeChange={handleAttackModeChange}
              isHidden={isHidden}
              sneakActive={sneakActive}
              onSneakToggle={(next) => setSneakActive(next)}
              nonLethalActive={nonLethalActive}
              onNonLethalToggle={setNonLethalActive}
              maxSpellSlots={maxSpellSlots}
              spentSpellSlots={currentSpentSlots}
              onToggleSlot={handleToggleSlot}
              onOffhandAttack={handleOffhandAttack}
              classResources={campaign?.combat_data?.classResources?.[selectedCharacterKey] || {}}
              onClassAbility={handleClassAbility}
              onToggleKi={handleToggleKi}
              onToggleSorceryPoint={handleToggleSorceryPoint}
              onConvertSlotToSP={() => setFontOfMagicDirection('slotToSP')}
              onConvertSPToSlot={() => setFontOfMagicDirection('spToSlot')}
              onToggleLuck={handleToggleLuck}
              onActionClick={((runAction) => {
                // Always repoint the ref at the freshest closure so
                // the level picker can re-enter this exact handler
                // with a castLevel attached.
                runActionRef.current = runAction;
                return runAction;
              })((action) => {
                // Clicking any other action cancels attack-mode targeting.
                if (attackMode !== null) setAttackMode(null);

                // Rage blocks ALL spell casting.
                const charRes = campaign?.combat_data?.classResources?.[selectedCharacterKey] || {};
                if (action.type === 'spell' && charRes.isRaging) {
                  toast.error("Can't cast spells while raging!");
                  return;
                }
                // Wild Shape blocks spells too (until Beast Spells at
                // Druid 18 — we leave that exception for the user's
                // sheet data to drive via a feature flag).
                if (action.type === 'spell' && charRes.wildShapeForm) {
                  const level = selectedCharacter?.level || 1;
                  if (level < 18) {
                    toast.error("Can't cast spells while in Wild Shape!");
                    return;
                  }
                }

                // Level picker interception. Leveled spells (>=1st)
                // without an explicit castLevel get held here so the
                // player can choose a slot level first. Cantrips skip
                // this because action.level is 0 or undefined.
                if (
                  action.type === 'spell' &&
                  typeof action.level === 'number' &&
                  action.level > 0 &&
                  typeof action.castLevel !== 'number'
                ) {
                  setPendingSpellCast({ action });
                  return;
                }

                // Sorcerer — Metamagic prompt. Shown AFTER the level
                // has been chosen (cantrips skip straight through)
                // and BEFORE resolution / targeting. `metamagicChosen`
                // is set on the action once the picker resolves; we
                // skip the picker on the second pass through this
                // handler.
                if (
                  action.type === 'spell' &&
                  /sorcerer/i.test(selectedCharacter?.class || '') &&
                  (selectedCharacter?.level || 1) >= 3 &&
                  !action.metamagicChosen
                ) {
                  const sp = charRes.sorceryPointsRemaining ?? 0;
                  if (sp > 0) {
                    setPendingMetamagic({ action: { ...action, metamagicChosen: true }, castLevel: action.castLevel || action.level });
                    return;
                  }
                }

                // Resolve first so we know the cost — that determines
                // whether the turn-order check even applies. Reactions
                // (Shield, Counterspell, Hellish Rebuke, opportunity
                // attacks) can fire on ANY combatant's turn, so they
                // bypass the turn gate entirely and only check the
                // reaction availability.
                const resolved = resolveAction(action, selectedCharacter);
                const enrichedAction = { ...action, resolved };

                if (resolved.cost === "reaction") {
                  if (!actionsState.reaction) {
                    toast.error("Reaction already used this round!");
                    return;
                  }
                } else if (campaign?.combat_active && campaign?.combat_data) {
                  // Action / bonus / free / no-cost entries still obey the
                  // turn gate. The GM is always allowed through.
                  if (!isGM && !isActorsTurn) {
                    toast.error("It's not this character's turn!");
                    return;
                  }
                }

                // Action economy gate — can't do it if the required cost isn't available
                if (resolved.cost === "action" && !actionsState.action) {
                  toast.error("No action available this turn!");
                  return;
                }
                if (resolved.cost === "bonus" && !actionsState.bonus) {
                  toast.error("No bonus action available this turn!");
                  return;
                }

                // (S) Bonus action spell restriction. D&D 5e PHB p.202:
                // if you cast a spell as a bonus action, you can only
                // cast a cantrip with a casting time of 1 action as
                // your other spell this turn. Track via
                // bonusActionSpellCast flag.
                if (action.type === 'spell') {
                  const isBA = resolved.cost === 'bonus';
                  const isCantrip = !action.level || action.level === 0;
                  if (isBA) {
                    setBonusActionSpellCast(true);
                  }
                  if (bonusActionSpellCast && !isBA && !isCantrip) {
                    toast.error('You already cast a bonus action spell — you can only cast a cantrip this turn.');
                    return;
                  }
                  // Also enforce the reverse: if you cast a leveled
                  // action spell first and then try a bonus action
                  // spell, that's fine per RAW. The restriction only
                  // applies to the action spell AFTER a BA spell.
                }

                // Spell slot gate — leveled spells (level > 0) require an
                // available slot. Cantrips (level 0 / undefined) are free.
                // We commit at castLevel (chosen in the picker), not the
                // spell's base level, so upcasting spends the higher slot.
                if (action.type === 'spell' && typeof action.level === 'number' && action.level > 0) {
                  const key = selectedCharacterKey;
                  const slotLevel = typeof action.castLevel === 'number' ? action.castLevel : action.level;
                  const max = maxSpellSlots[slotLevel] || 0;
                  const already = (spentSlotsByCharacter[key] || {})[slotLevel] || 0;
                  if (max === 0 || already >= max) {
                    toast.error(`No level ${slotLevel} spell slots remaining!`);
                    return;
                  }
                  // Commit the slot up-front. If the spell ultimately gets
                  // cancelled the GM can refund by clicking the dot.
                  if (key) {
                    setSpentSlotsByCharacter((prev) => {
                      const charSpent = prev[key] || {};
                      return {
                        ...prev,
                        [key]: {
                          ...charSpent,
                          [slotLevel]: (charSpent[slotLevel] || 0) + 1,
                        },
                      };
                    });
                  }
                }

                // No-roll actions — just consume the cost and toast. Don't open the dice window.
                if (resolved.rollType === "no_roll") {
                  setActionsState(prev => consumeActionCost(prev, resolved.cost));
                  const featureSuffix = action.classFeature ? ` (${action.classFeature})` : '';
                  toast.success(`${selectedCharacter?.name || 'Character'} uses ${action.name}${featureSuffix}`);
                  // Campaign log: plain action use, plus the special
                  // "now Dodging" line for the Dodge action.
                  logCombatEvent(
                    campaignId,
                    `${selectedCharacter?.name || 'Character'} uses ${action.name}${featureSuffix}.`,
                    {
                      event: 'action_use',
                      category: 'turn',
                      actor: selectedCharacter?.name,
                      action: action.name,
                    },
                  );
                  if (action.name === 'Dodge') {
                    logCombatEvent(
                      campaignId,
                      `${selectedCharacter?.name || 'Character'} is now Dodging.`,
                      {
                        event: 'condition_applied',
                        category: 'condition',
                        target: selectedCharacter?.name,
                        condition: 'Dodging',
                      },
                    );
                  }

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
              })}
            />
            )}

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
                <CombatQueue
                  monsters={monsters}
                  npcs={npcs}
                  onSelectMonster={(char) => {
                    setSelectedCharacter(char);
                    setMonsterInventory(char.inventory || []);
                    setEquippedItems(char.equipped || {});
                  }}
                  onCreateNpc={() => {
                    // Jump to the existing Character Creator in NPC mode.
                    // returnTo is a hint the creator can respect to send
                    // the user back here after the NPC is saved.
                    navigate(createPageUrl("CharacterCreator") + `?campaignId=${campaignId}&mode=npc&returnTo=GMPanel`);
                  }}
                  campaignId={campaignId}
                />

                <SectionCard title="Adventurers">
                  <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
                    {players.map((player) => {
                      const character = player.character;
                      const stats = character?.stats || {};
                      const color1 = player.profile_color_1 || "#FF5722";
                      const color2 = player.profile_color_2 || "#37F2D1";
                      // HP / AC / race / class all live on
                      // character.stats (JSONB) for reseeded rows —
                      // the old top-level fields kept showing 0/0
                      // and AC 10 for every card. Fall through to
                      // the legacy flat shape for older rows.
                      const currentHp =
                        character?.hp_current
                        ?? character?.hit_points?.current
                        ?? stats?.hit_points?.current
                        ?? stats?.hit_points
                        ?? 0;
                      const maxHp =
                        character?.hp_max
                        ?? character?.hit_points?.max
                        ?? stats?.hit_points?.max
                        ?? stats?.hit_points
                        ?? 0;
                      // Effective AC: derive from equipped armor + DEX
                      // when the character has anything in their gear
                      // slots, otherwise fall back to the static
                      // `armor_class` field from their sheet.
                      const equipped = character?.equipped || character?.equipment || {};
                      const hasEquippedArmor =
                        equipped && Object.values(equipped).some((i) => i?.category === 'armor');
                      const computedAC = hasEquippedArmor
                        ? computeArmorClass({
                            equipped,
                            dex:
                              character?.attributes?.dex ||
                              character?.stats?.dexterity ||
                              10,
                            fightingStyles: collectFightingStyles(character),
                          }).total
                        : null;
                      const ac =
                        computedAC
                        ?? character?.armor_class
                        ?? stats?.armor_class
                        ?? stats?.ac
                        ?? 10;
                      const characterRace  = character?.race  ?? stats?.race;
                      const characterClass = character?.class ?? stats?.class;

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
                            className="h-24 bg-cover bg-top relative"
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
                            <div className="flex justify-between items-center gap-1">
                              <span className="inline-block text-[10px] font-semibold bg-[#37F2D1]/20 text-[#37F2D1] px-2 py-0.5 rounded-full truncate">
                                {character?.name || player.username}
                              </span>
                              <span className="text-[10px] text-slate-400 flex-shrink-0">
                                AC {ac}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              {characterRace || '?'} • {characterClass || '?'}
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
                <SectionCard title="Fallen">
                  <FallenRow
                    fallen={campaign?.combat_data?.fallen || []}
                  />
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

      {/* Possess Character Selector (players + GM combat queue) */}
      {showPossessSelector && (() => {
        // Pull the GM's current combat queue so the dialog shows every
        // combatant (monster, NPC, ally, …) the GM is already running
        // alongside the party.
        const combatQueue = readCombatQueue(campaignId);

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

              {/* GM's combat queue */}
              <div>
                <h3 className="text-xs font-bold tracking-[0.22em] uppercase text-slate-400 mb-3">
                  Your Monsters
                </h3>
                {combatQueue.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {combatQueue.map((monster) => {
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
                              {safeText(monster.name) || 'Unknown Creature'}
                            </h3>
                            <p className="text-slate-400 text-xs truncate">
                              {safeText(monster.type) || 'monster'}
                              {monster.stats?.challenge_rating != null ? ` • CR ${safeText(monster.stats.challenge_rating)}` : ''}
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
              This will clear the turn order. You'll then be asked whether the party takes a rest.
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

      {/* Post-combat rest chooser. Continue / Short Rest / Long Rest.
          All three clear combat state; only the rests heal. */}
      <AlertDialog
        open={showRestChoice}
        onOpenChange={(open) => {
          if (!open && !endCombatMutation.isPending) setShowRestChoice(false);
        }}
      >
        <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>After the Battle</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Does the party rest? Long Rest restores everyone to full HP and all spell slots.
              Short Rest heals each character up to half their max HP and refreshes Warlock pact slots.
              Continue just ends combat with no recovery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-1 gap-3 mt-2">
            <button
              type="button"
              disabled={endCombatMutation.isPending}
              onClick={() => handleChooseRest('long')}
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl tracking-wide uppercase text-sm"
            >
              Long Rest
            </button>
            <button
              type="button"
              disabled={endCombatMutation.isPending}
              onClick={() => handleChooseRest('short')}
              className="w-full bg-[#eab308] hover:bg-[#ca8a04] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl tracking-wide uppercase text-sm"
            >
              Short Rest
            </button>
            <button
              type="button"
              disabled={endCombatMutation.isPending}
              onClick={() => handleChooseRest('none')}
              className="w-full bg-[#334155] hover:bg-[#475569] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl tracking-wide uppercase text-sm"
            >
              Continue (No Rest)
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sorcerer — Font of Magic conversion picker. Direction flag
          controls whether we're converting a slot into sorcery points
          or the reverse. Both moves cost a bonus action. */}
      <AlertDialog
        open={!!fontOfMagicDirection}
        onOpenChange={(open) => { if (!open) setFontOfMagicDirection(null); }}
      >
        <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
          {fontOfMagicDirection && (() => {
            const char = selectedCharacter;
            const level = char?.level || char?.stats?.level || 1;
            const res = campaign?.combat_data?.classResources?.[selectedCharacterKey] || {};
            const spTable = CLASS_ABILITY_MECHANICS['Font of Magic'] || {};
            const toPoints = spTable.convertSlotToPoints || {};
            const toSlot = spTable.convertPointsToSlot || {};
            const sp = res.sorceryPointsRemaining ?? level;
            const charSpent = spentSlotsByCharacter[selectedCharacterKey] || {};
            const isSlotToSP = fontOfMagicDirection === 'slotToSP';
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isSlotToSP ? 'Spell Slot → Sorcery Points' : 'Sorcery Points → Spell Slot'}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    Costs a bonus action. {isSlotToSP
                      ? 'Expend a slot to gain sorcery points.'
                      : `Spend sorcery points to create a slot. You have ${sp} SP.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {isSlotToSP ? (
                    Object.entries(toPoints).map(([lvl, points]) => {
                      const slotLvl = Number(lvl);
                      const max = maxSpellSlots[slotLvl] || 0;
                      const spent = charSpent[slotLvl] || 0;
                      const available = max > 0 && spent < max;
                      return (
                        <button
                          key={lvl}
                          disabled={!available}
                          onClick={() => {
                            if (!actionsState.bonus) { toast.error('No bonus action available!'); return; }
                            if (!selectedCharacterKey) return;
                            setActionsState((prev) => ({ ...prev, bonus: false }));
                            setSpentSlotsByCharacter((prev) => {
                              const cs = prev[selectedCharacterKey] || {};
                              return { ...prev, [selectedCharacterKey]: { ...cs, [slotLvl]: (cs[slotLvl] || 0) + 1 } };
                            });
                            const cd = campaign?.combat_data || {};
                            const curRes = cd.classResources?.[selectedCharacterKey] || {};
                            const maxSP = level;
                            const newSP = Math.min(maxSP, (curRes.sorceryPointsRemaining ?? maxSP) + points);
                            const newRes = { ...(cd.classResources || {}), [selectedCharacterKey]: { ...curRes, sorceryPointsRemaining: newSP } };
                            const newData = { ...cd, classResources: newRes };
                            queryClient.setQueryData(['campaign', campaignId], (old) => old ? { ...old, combat_data: newData } : old);
                            base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
                            logCombatEvent(campaignId, `${char?.name} converts a ${slotLvl === 1 ? '1st' : slotLvl === 2 ? '2nd' : slotLvl === 3 ? '3rd' : `${slotLvl}th`}-level slot into ${points} sorcery points.`, { event: 'font_of_magic', category: 'spell', actor: char?.name });
                            toast.success(`Gained ${points} sorcery points (now ${newSP}/${maxSP}).`);
                            setFontOfMagicDirection(null);
                          }}
                          className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-colors ${
                            available
                              ? 'bg-[#a855f7]/20 hover:bg-[#a855f7]/35 border-[#a855f7]/60 text-white'
                              : 'bg-[#0b1220] border-slate-800 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-sm font-black">L{slotLvl} slot → {points} SP</span>
                          <span className="text-[10px] opacity-80 mt-0.5">{max - spent}/{max} left</span>
                        </button>
                      );
                    })
                  ) : (
                    Object.entries(toSlot).map(([pts, lvl]) => {
                      const cost = Number(pts);
                      const slotLvl = Number(lvl);
                      const enough = sp >= cost;
                      return (
                        <button
                          key={pts}
                          disabled={!enough}
                          onClick={() => {
                            if (!actionsState.bonus) { toast.error('No bonus action available!'); return; }
                            if (!selectedCharacterKey) return;
                            setActionsState((prev) => ({ ...prev, bonus: false }));
                            const cd = campaign?.combat_data || {};
                            const curRes = cd.classResources?.[selectedCharacterKey] || {};
                            const newSP = Math.max(0, (curRes.sorceryPointsRemaining ?? level) - cost);
                            const newRes = { ...(cd.classResources || {}), [selectedCharacterKey]: { ...curRes, sorceryPointsRemaining: newSP } };
                            const newData = { ...cd, classResources: newRes };
                            queryClient.setQueryData(['campaign', campaignId], (old) => old ? { ...old, combat_data: newData } : old);
                            base44.entities.Campaign.update(campaignId, { combat_data: newData }).catch(console.error);
                            // Restore one slot at the chosen level (decrement spent).
                            setSpentSlotsByCharacter((prev) => {
                              const cs = prev[selectedCharacterKey] || {};
                              const curSpent = cs[slotLvl] || 0;
                              return { ...prev, [selectedCharacterKey]: { ...cs, [slotLvl]: Math.max(0, curSpent - 1) } };
                            });
                            logCombatEvent(campaignId, `${char?.name} spends ${cost} sorcery points to create a ${slotLvl === 1 ? '1st' : slotLvl === 2 ? '2nd' : slotLvl === 3 ? '3rd' : `${slotLvl}th`}-level slot.`, { event: 'font_of_magic', category: 'spell', actor: char?.name });
                            toast.success(`Created L${slotLvl} slot (${newSP} SP left).`);
                            setFontOfMagicDirection(null);
                          }}
                          className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-colors ${
                            enough
                              ? 'bg-[#a855f7]/20 hover:bg-[#a855f7]/35 border-[#a855f7]/60 text-white'
                              : 'bg-[#0b1220] border-slate-800 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-sm font-black">{cost} SP → L{slotLvl}</span>
                        </button>
                      );
                    })
                  )}
                </div>
                <AlertDialogFooter className="mt-3">
                  <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">
                    Cancel
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      {/* Paladin — Lay on Hands. Select target + HP amount, or cure
          disease/poison (5 HP from pool). */}
      {layOnHandsOpen && selectedCharacter && (
        <LayOnHandsModal
          onClose={() => setLayOnHandsOpen(false)}
          paladin={selectedCharacter}
          pool={(campaign?.combat_data?.classResources?.[selectedCharacterKey]?.layOnHandsRemaining) ?? layOnHandsPool(selectedCharacter?.level || 1)}
          maxPool={layOnHandsPool(selectedCharacter?.level || 1)}
          allies={(campaign?.combat_data?.order || []).filter(c => {
            const f = getFaction(c);
            return f === 'player' || f === 'ally';
          })}
          onConfirm={({ targetKey, amount, cure }) => {
            applyLayOnHands({ targetKey, amount, cure });
            setLayOnHandsOpen(false);
          }}
        />
      )}

      {/* Cleric — Turn Undead. Checkbox list of enemy undead within
          range (GM picks). WIS saves; Destroy Undead threshold kills
          low-CR undead outright. */}
      {turnUndeadOpen && selectedCharacter && (
        <TurnUndeadModal
          onClose={() => setTurnUndeadOpen(false)}
          cleric={selectedCharacter}
          enemies={(campaign?.combat_data?.order || []).filter(c => {
            const f = getFaction(c);
            return f === 'hostile' || f === 'enemy';
          })}
          onConfirm={(selections) => {
            applyTurnUndead(selections);
            setTurnUndeadOpen(false);
          }}
        />
      )}

      {/* Druid — Wild Shape beast form selector. Filtered by the
          druid's level (Moon Druid gets higher CR caps + elementals
          at level 10). */}
      {wildShapeOpen && selectedCharacter && (
        <WildShapeModal
          onClose={() => setWildShapeOpen(false)}
          druid={selectedCharacter}
          availableSlots={maxSpellSlots}
          spentSlots={spentSlotsByCharacter[selectedCharacterKey] || {}}
          onConfirm={(beastName, beast, isElemental) => {
            applyWildShape(beastName, beast, isElemental);
            setWildShapeOpen(false);
          }}
        />
      )}

      {/* Sorcerer — Metamagic picker. Shown after spell-level pick
          (leveled) or immediately on cantrip click. Options the
          sorcerer doesn't have enough SP for are greyed out. */}
      {pendingMetamagic && (
        <MetamagicModal
          pending={pendingMetamagic}
          sp={(campaign?.combat_data?.classResources?.[selectedCharacterKey]?.sorceryPointsRemaining) ?? (selectedCharacter?.level || 0)}
          known={(selectedCharacter?.metamagic) || null}
          onClose={() => setPendingMetamagic(null)}
          onApply={(metamagic) => {
            const updatedAction = applyMetamagic(pendingMetamagic.action, metamagic);
            setPendingMetamagic(null);
            if (runActionRef.current && updatedAction) runActionRef.current(updatedAction);
          }}
        />
      )}

      {/* Leveled-spell cast level picker. Shows slot buttons from the
          spell's base level up to the character's highest available
          slot, greying out levels where every slot is spent. */}
      <AlertDialog
        open={!!pendingSpellCast}
        onOpenChange={(open) => {
          if (!open) setPendingSpellCast(null);
        }}
      >
        <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-sm">
          {pendingSpellCast && (() => {
            const pending = pendingSpellCast.action;
            const baseLevel = pending.level;
            const ordinal = (n) => {
              const suffixes = ['th', 'st', 'nd', 'rd'];
              const v = n % 100;
              return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
            };
            const charSpent = spentSlotsByCharacter[selectedCharacterKey] || {};
            const levels = [];
            for (let lvl = baseLevel; lvl <= 9; lvl++) {
              const max = maxSpellSlots[lvl] || 0;
              if (max === 0) continue;
              const spent = charSpent[lvl] || 0;
              levels.push({ lvl, max, spent, available: spent < max });
            }
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-baseline gap-2">
                    <span>{pending.name}</span>
                    <span className="text-xs uppercase tracking-widest text-slate-400">
                      {ordinal(baseLevel)}-level
                    </span>
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    Choose a spell slot to cast at. Casting above base level upcasts the spell.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {levels.length === 0 ? (
                    <p className="col-span-3 text-center text-sm text-red-400 py-4">
                      No available slots for this spell.
                    </p>
                  ) : (
                    levels.map(({ lvl, max, spent, available }) => (
                      <button
                        key={lvl}
                        type="button"
                        disabled={!available}
                        onClick={() => {
                          const action = { ...pending, castLevel: lvl };
                          setPendingSpellCast(null);
                          if (runActionRef.current) {
                            runActionRef.current(action);
                          }
                        }}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-colors ${
                          available
                            ? 'bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/35 border-[#8B5CF6]/60 text-white'
                            : 'bg-[#0b1220] border-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-sm font-black uppercase tracking-wide">
                          {ordinal(lvl)}
                        </span>
                        <span className="text-[10px] opacity-80 mt-0.5">
                          {max - spent}/{max} left
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <AlertDialogFooter className="mt-3">
                  <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">
                    Cancel
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tier 2 ability modals. These are plain functions, not React.memo'd,
// because they always mount fresh when opened (state is driven by the
// parent's open/close flags).
// ─────────────────────────────────────────────

function LayOnHandsModal({ onClose, paladin, pool, maxPool, allies, onConfirm }) {
  const [targetKey, setTargetKey] = useState(null);
  const [amount, setAmount] = useState(1);
  // Self is always a valid target. Build the combined list.
  const selfEntry = {
    uniqueId: paladin?.uniqueId || paladin?.id,
    id: paladin?.id,
    name: `${paladin?.name} (self)`,
    __isSelf: true,
  };
  const allTargets = [selfEntry, ...allies.filter(a => (a.uniqueId || a.id) !== (paladin?.uniqueId || paladin?.id))];
  return (
    <AlertDialog open={true} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Lay on Hands — Pool: {pool}/{maxPool}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Heal a target (self or ally) or spend 5 HP to cure one disease/poison.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Target</div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              {allTargets.map((t) => {
                const key = t.uniqueId || t.id;
                const selected = targetKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTargetKey(key)}
                    className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
                      selected
                        ? 'bg-[#fbbf24] text-[#050816] border-[#fbbf24]'
                        : 'bg-[#0b1220] border-slate-700 text-slate-300 hover:border-[#fbbf24]/60'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">HP to heal</div>
            <input
              type="number"
              min={1}
              max={pool}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="w-full bg-[#0b1220] border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
            <div className="text-[9px] text-slate-500 mt-1">Max per heal: {pool}</div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={!targetKey || amount <= 0 || amount > pool}
              onClick={() => onConfirm({ targetKey, amount, cure: false })}
              className="flex-1 bg-[#fbbf24] hover:bg-[#fde68a] disabled:opacity-40 disabled:cursor-not-allowed text-[#050816] font-black py-2 rounded-xl text-sm"
            >
              Heal {amount}
            </button>
            <button
              disabled={!targetKey || pool < 5}
              onClick={() => onConfirm({ targetKey, amount: 5, cure: true })}
              className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-2 rounded-xl text-sm"
            >
              Cure Disease/Poison (5 HP)
            </button>
          </div>
        </div>
        <AlertDialogFooter className="mt-3">
          <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TurnUndeadModal({ onClose, cleric, enemies, onConfirm }) {
  const [selections, setSelections] = useState(() => enemies.map(() => false));
  const toggle = (i) => setSelections((prev) => prev.map((v, idx) => idx === i ? !v : v));
  return (
    <AlertDialog open={true} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Turn Undead — {cleric?.name}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Tick each undead within 30 ft. They each roll a WIS save vs your spell DC.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 mt-2">
          {enemies.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-4">No enemies in combat.</p>
          ) : (
            enemies.map((e, i) => (
              <label
                key={e.uniqueId || e.id || i}
                className="flex items-center gap-2 p-2 rounded bg-[#0b1220] border border-slate-800 hover:border-slate-600 cursor-pointer"
              >
                <input type="checkbox" checked={selections[i]} onChange={() => toggle(i)} />
                <span className="text-sm text-white flex-1">{e.name}</span>
                {e.cr != null && (
                  <span className="text-[9px] text-slate-500">CR {e.cr}</span>
                )}
              </label>
            ))
          )}
        </div>
        <AlertDialogFooter className="mt-3">
          <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
          <button
            onClick={() => onConfirm(enemies.map((e, i) => ({ combatant: e, isUndead: selections[i] })))}
            className="bg-[#eab308] hover:bg-[#ca8a04] text-white font-bold px-4 py-2 rounded-lg text-sm"
          >
            Channel Divinity
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function WildShapeModal({ onClose, druid, availableSlots, spentSlots, onConfirm }) {
  const [tab, setTab] = useState('beasts');
  const level = druid?.level || druid?.stats?.level || 1;
  const isMoon = /circle\s*of\s*the\s*moon/i.test(druid?.subclass || '');
  // Determine max CR the druid can assume.
  let maxCRNumeric = 0;
  if (isMoon) {
    if (level >= 6) maxCRNumeric = Math.floor(level / 3);
    else maxCRNumeric = 1;
  } else {
    const limits = Object.entries(WILD_SHAPE.crLimits).sort((a, b) => Number(b[0]) - Number(a[0]));
    for (const [lvl, data] of limits) {
      if (level >= Number(lvl)) {
        maxCRNumeric = typeof data.maxCR === 'string' ? (() => {
          const parts = data.maxCR.split('/');
          return parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : Number(data.maxCR);
        })() : data.maxCR;
        break;
      }
    }
  }
  const parseCR = (cr) => {
    if (typeof cr === 'number') return cr;
    if (typeof cr === 'string') {
      const parts = cr.split('/');
      return parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : Number(cr);
    }
    return 99;
  };
  const beasts = Object.entries(WILD_SHAPE.commonBeastForms).filter(([, b]) => parseCR(b.cr) <= maxCRNumeric);
  const elementalUnlocked = isMoon && level >= 10;
  const elementals = Object.entries(WILD_SHAPE.elementalForms);

  // Sum available slots to show the 2-slot cost in context.
  const slotsAvailable = Object.keys(availableSlots || {}).reduce((sum, lvl) => {
    const max = availableSlots[lvl] || 0;
    const spent = (spentSlots || {})[lvl] || 0;
    return sum + Math.max(0, max - spent);
  }, 0);

  return (
    <AlertDialog open={true} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Wild Shape — {druid?.name}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Choose a form to assume. Max CR: {maxCRNumeric}{isMoon ? ' (Moon Druid)' : ''}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {elementalUnlocked && (
          <div className="flex gap-1 bg-[#0b1220] rounded-lg p-0.5 mt-2">
            <button
              onClick={() => setTab('beasts')}
              className={`flex-1 px-2 py-1 rounded-md text-[10px] font-semibold uppercase ${tab === 'beasts' ? 'bg-[#22c5f5] text-white' : 'text-slate-400'}`}
            >
              Beasts
            </button>
            <button
              onClick={() => setTab('elementals')}
              className={`flex-1 px-2 py-1 rounded-md text-[10px] font-semibold uppercase ${tab === 'elementals' ? 'bg-[#22c5f5] text-white' : 'text-slate-400'}`}
            >
              Elementals (2 slots — {slotsAvailable} available)
            </button>
          </div>
        )}
        <div className="max-h-96 overflow-y-auto custom-scrollbar mt-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(tab === 'elementals' ? elementals : beasts).map(([name, beast]) => {
              const canAfford = tab === 'elementals' ? slotsAvailable >= 2 : true;
              return (
                <button
                  key={name}
                  disabled={!canAfford}
                  onClick={() => onConfirm(name, beast, tab === 'elementals')}
                  className={`flex flex-col items-start p-2 rounded-lg border text-left transition-colors ${
                    canAfford
                      ? 'bg-[#0b1220] border-[#22c55e]/40 hover:bg-[#22c55e]/15 hover:border-[#22c55e] text-white'
                      : 'bg-[#0b1220] border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <span className="text-sm font-black">{name}</span>
                  <span className="text-[10px] text-slate-400">CR {beast.cr} · {beast.size}</span>
                  <span className="text-[10px] text-slate-300 mt-1">AC {beast.ac} · HP {beast.hp}</span>
                  <span className="text-[10px] text-slate-400">{beast.speed}</span>
                </button>
              );
            })}
          </div>
        </div>
        <AlertDialogFooter className="mt-3">
          <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MetamagicModal({ pending, sp, known, onClose, onApply }) {
  const options = CLASS_ABILITY_MECHANICS['Metamagic']?.options || {};
  const entries = Object.entries(options);
  return (
    <AlertDialog open={true} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Apply Metamagic?</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Spending sorcery points modifies the spell. You have {sp} SP.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5 mt-2">
          {entries.map(([name, opt]) => {
            // TODO: filter against `known` array (character.metamagic)
            // when that field is populated by the character creator.
            if (known && Array.isArray(known) && !known.includes(name)) return null;
            const numericCost = typeof opt.cost === 'number'
              ? opt.cost
              : (name === 'Twinned Spell'
                ? Math.max(1, pending.castLevel || pending.action?.level || 1)
                : 1);
            const canAfford = sp >= numericCost;
            return (
              <button
                key={name}
                disabled={!canAfford}
                onClick={() => onApply(name)}
                className={`w-full flex items-start justify-between gap-3 p-2 rounded-lg border text-left transition-colors ${
                  canAfford
                    ? 'bg-[#a855f7]/15 border-[#a855f7]/50 hover:bg-[#a855f7]/30 text-white'
                    : 'bg-[#0b1220] border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="text-sm font-black">{name}</div>
                  <div className="text-[10px] text-slate-400 leading-snug">{opt.description}</div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#a855f7] whitespace-nowrap">
                  {typeof opt.cost === 'number' ? `${opt.cost} SP` : opt.cost}
                </div>
              </button>
            );
          })}
          <button
            onClick={() => onApply('none')}
            className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-bold text-center"
          >
            No Metamagic
          </button>
        </div>
        <AlertDialogFooter className="mt-3">
          <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConditionManagerDialog({ onClose, activeConditions, toggleCondition, players, campaignId }) {
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [adjustingHp, setAdjustingHp] = useState(false);
  const [hpAdjustment, setHpAdjustment] = useState(0);
  
  // Get combatants from the combat queue
  const [monsters, setMonsters] = useState([]);

  const loadMonsters = () => {
    setMonsters(readCombatQueue(campaignId));
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
      const queueId = targetId.replace('monster-', '');
      const queue = readCombatQueue(campaignId);
      if (queue.length > 0) {
        const newQueue = queue.map(m => {
          if (m.queueId === queueId || String(m.queueId) === queueId) {
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
        writeCombatQueue(campaignId, newQueue);
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
                              <div className="w-full bg-[#111827] h-3 rounded-full mt-1 overflow-hidden relative">
                                <div
                                  className={`${hpBarColor(maxHp > 0 ? (currentHp / maxHp) * 100 : 0)} h-full`}
                                  style={{ width: `${maxHp > 0 ? Math.min(100, (currentHp / maxHp) * 100) : 0}%` }}
                                />
                                {/* Numeric HP overlay — keeps health readable for
                                    red/green colorblind viewers who can't rely on
                                    the bar hue alone. */}
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white leading-none tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                                  {currentHp}/{maxHp}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-block text-[10px] font-semibold bg-[#37F2D1]/20 text-[#37F2D1] px-2 py-0.5 rounded-full">
                                Player
                              </span>
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
                              <p className="text-sm font-bold text-white truncate">{safeText(monster.name)}</p>
                              {adjustingHp ? (
                                <div className="w-full bg-[#111827] h-3 rounded-full mt-1 overflow-hidden relative">
                                  <div
                                    className={`${hpBarColor(maxHp > 0 ? (currentHp / maxHp) * 100 : 0)} h-full`}
                                    style={{ width: `${maxHp > 0 ? Math.min(100, (currentHp / maxHp) * 100) : 0}%` }}
                                  />
                                  {/* Numeric overlay — see matching PC bar above. */}
                                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white leading-none tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                                    {currentHp}/{maxHp}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-block text-[10px] font-semibold bg-[#FF5722]/20 text-[#FF5722] px-2 py-0.5 rounded-full">
                                  Monster
                                </span>
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

function CharacterPanel({ character, onSelectCharacter, isPossessed, setIsPossessed, players, onPossessPlayer, monsterInventory, setMonsterInventory, equippedItems, setEquippedItems, onRollInitiative, onManageConditions, onDrinkPotion }) {
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
              Level {safeText(character.level || character.stats?.level || character.challenge_rating || character.stats?.challenge_rating) || '?'} • {safeText(character.type) || 'NPC'}
            </p>
            <p className="text-sm text-slate-300">{safeText(character.name)}</p>
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
            {/* Row 1 — section title + slot count + organize button */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] tracking-[0.2em] uppercase text-slate-400">Inventory</span>
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
            {/* Row 2 — encumbrance text left, wallet right. overflow-hidden
                on the flex parent keeps the MoneyCounter from bleeding out
                of the card when its editor pops open. */}
            <div className="flex items-center justify-between mb-2 gap-2 overflow-hidden">
              <EncumbranceBar
                inventory={(character?.type === 'monster' || character?.type === 'npc') ? monsterInventory : (character?.inventory || [])}
                strength={character?.attributes?.str || character?.stats?.strength || 10}
              />
              <div className="flex-shrink-0 max-w-[60%]">
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
                  readOnly={character?.type === 'monster' || character?.type === 'npc'}
                />
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
                      onUse={(usedItem) => {
                        if (!onDrinkPotion) return;
                        if (isMonsterOrNpc) onDrinkPotion(usedItem, { monsterIdx: idx });
                        else onDrinkPotion(usedItem, { inventoryIdx: idx });
                      }}
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
          <img src={itemImage} alt={safeText(item.name)} className="w-full h-full object-cover" />
        ) : item ? (
          <span className="text-[8px] text-center text-slate-300 px-1 line-clamp-2">
            {safeText(item.name)}
          </span>
        ) : (
          <span className="text-[8px] text-center text-slate-600 px-1 leading-tight font-medium">{label}</span>
        )}
      </div>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1E2430] text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-50 shadow-xl border border-[#37F2D1]">
          {item ? `${label}: ${safeText(item.name)} (double-click to unequip)` : label}
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
  const percentage = maxWeight > 0 ? (currentWeight / maxWeight) * 100 : 0;
  const color =
    percentage >= 100
      ? 'text-red-400'
      : percentage >= 66
      ? 'text-amber-400'
      : 'text-slate-400';

  return (
    <span className={`text-[10px] font-medium ${color} whitespace-nowrap flex-shrink-0`}>
      {currentWeight}/{maxWeight} lbs
    </span>
  );
}

function InventorySlot({ item, isGM = false, isMoleWithAccess = false, onDragStart, draggable, onDrop, onUse }) {
  const [showTooltip, setShowTooltip] = useState(false);
  // Hover delay — snappy but not twitchy. Matches the dice window
  // tooltip behaviour so the panel feels consistent.

  // Hidden items are only visible to GM or mole with access
  const isHidden = item?.hidden;
  const canSee = !isHidden || isGM || isMoleWithAccess;
  // A potion shows an extra "Use" button on hover so the GM can drink
  // it without dragging. Match by name so homebrew potions with the
  // canonical key names work out of the box.
  const isHealingPotion = !!item && typeof item.name === 'string' && HEALING_POTIONS[item.name];
  
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
      {item && isHealingPotion && onUse && (
        <button
          onClick={() => onUse(item)}
          className="absolute -bottom-1 -right-1 px-1 py-[1px] rounded bg-[#22c55e]/90 hover:bg-[#22c55e] text-white text-[8px] font-black uppercase tracking-wider items-center justify-center hidden group-hover:flex z-10"
          title="Drink potion"
        >
          Use
        </button>
      )}
      {/* Rich item tooltip on hover — rarity-colored border, full
          stats block (name/type/rarity/weight/cost/props/desc). */}
      <ItemTooltip item={item} show={showTooltip && !!item} />
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
                  <img src={item.image_url} alt={safeText(item.name)} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-1">
                    <span className="text-[9px] text-slate-300 line-clamp-2">{safeText(item.name)}</span>
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
                        <p className="text-white text-sm font-medium">{safeText(item.name)}</p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-slate-400">Qty: {safeText(item.quantity)}</p>
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
                    <span className="text-white">{safeText(item.name)}</span>
                    {item.quantity > 1 && (
                      <span className="text-[#37F2D1] text-xs">x{safeText(item.quantity)}</span>
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
                          alt={safeText(item.name)}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#111827] flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{safeText(item.name)}</p>
                        <p className="text-[10px] text-slate-500">{safeText(item.type)}</p>
                        <p className="text-[10px] text-slate-400">{safeText(item.cost)} • {safeText(item.weight)} lb</p>
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
                              <p className="text-white font-semibold text-sm truncate">{safeText(item.name)}</p>
                              {item.quantity > 1 && (
                                <p className="text-xs text-slate-400">Quantity: {safeText(item.quantity)}</p>
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

// Render the row of downed / dead combatants below the main GM panel.
// Empty placeholder slots fill the remaining space so the visual footprint
// stays stable even when nobody is currently on the ground.
// FALLEN section — pure graveyard. Only fully-dead combatants (death
// save failures >= 3, or GM-killed) live here. Wounded and stabilized
// combatants stay in the top initiative bar with their unconscious
// overlay rather than getting moved down here.
function FallenRow({ fallen }) {
  const list = fallen || [];
  const [scroll, setScroll] = React.useState(0);
  const visible = 4;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setScroll(Math.max(0, scroll - 1))}
        disabled={scroll <= 0}
        className="w-7 h-7 rounded-full bg-[#050816] flex items-center justify-center text-sm disabled:opacity-30"
      >
        ‹
      </button>
      <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar flex-1">
        {list.slice(scroll, scroll + visible).map((c) => (
          <FallenCard key={c.uniqueId || c.id} combatant={c} />
        ))}
        {Array.from({ length: Math.max(0, visible - list.slice(scroll).length) }).map((_, idx) => (
          <div
            key={`ph-${idx}`}
            className="min-w-[96px] max-w-[96px] h-20 rounded-3xl bg-[#050816] border border-[#111827]"
          />
        ))}
      </div>
      <button
        onClick={() => setScroll(Math.min(Math.max(0, list.length - visible), scroll + 1))}
        disabled={scroll + visible >= list.length}
        className="w-7 h-7 rounded-full bg-[#050816] flex items-center justify-center text-sm disabled:opacity-30"
      >
        ›
      </button>
    </div>
  );
}

// Single fallen-combatant tile: full greyscale portrait with a skull
// overlay and a grey name label. Purely a visual record.
function FallenCard({ combatant }) {
  return (
    <div
      className="min-w-[120px] max-w-[120px] rounded-3xl bg-[#050816] overflow-hidden border border-[#111827] relative"
      title={combatant.name}
    >
      <div
        className="h-20 bg-cover bg-center relative grayscale"
        style={{
          backgroundImage: combatant.avatar ? `url(${combatant.avatar})` : 'none',
          backgroundColor: '#1a1f2e',
        }}
      >
        {!combatant.avatar && (
          <div className="absolute inset-0 flex items-center justify-center text-2xl text-slate-600 font-bold">
            {combatant.name?.[0] || '?'}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={DEATH_SAVE_ICONS.death}
            alt="Dead"
            className="w-10 h-10"
            style={DEATH_SAVE_ICON_STYLE}
          />
        </div>
      </div>
      <div className="px-2 py-1.5">
        <p className="text-[9px] font-semibold text-center px-1.5 py-0.5 rounded-full truncate bg-slate-800 text-slate-400">
          {combatant.name}
        </p>
        <p className="text-[9px] text-slate-500 uppercase tracking-widest text-center mt-1">Dead</p>
      </div>
    </div>
  );
}

// Replaces the CombatActionBar when the selected combatant is downed.
// Players get a single "Roll Death Save" button. The GM also gets a
// row of manual overrides for quick NPC resolution.
function DeathSavePanel({ combatant, isPlayer, isActiveTurn, onRoll, onAdjust, onKill, onShowDramatic }) {
  const saves = combatant.deathSaves || blankDeathSaves();
  // When it's a downed player's turn, the dramatic DeathSaveWindow takes
  // over the full screen so the inline panel just shows a status line —
  // the GM shouldn't be rolling on the player's behalf from this panel.
  const playerOnTheirTurn = isPlayer && isActiveTurn && !saves.dead && !saves.stabilized;

  return (
    <div className="relative z-20 rounded-[32px] bg-[#050816]/95 px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.75)]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#ef4444] bg-[#1a1f2e] flex-shrink-0 opacity-70">
            {combatant.avatar ? (
              <img src={combatant.avatar} alt={combatant.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl text-slate-400 font-bold">
                {combatant.name?.[0] || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-red-400 font-bold">Downed — 0 HP</p>
            <p className="text-white text-lg font-bold truncate">{combatant.name}</p>
            {saves.dead && (
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Dead</p>
            )}
            {saves.stabilized && !saves.dead && (
              <p className="text-xs text-[#22c55e] uppercase tracking-widest mt-0.5">Stabilized</p>
            )}
            {!saves.dead && !saves.stabilized && (
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1">
                  <img
                    src={DEATH_SAVE_ICONS.life}
                    alt="Successes"
                    className="w-4 h-4"
                    style={DEATH_SAVE_ICON_STYLE}
                  />
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: saves.successes > i ? '#22c55e' : '#1e293b' }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <img
                    src={DEATH_SAVE_ICONS.death}
                    alt="Failures"
                    className="w-4 h-4"
                    style={DEATH_SAVE_ICON_STYLE}
                  />
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: saves.failures > i ? '#ef4444' : '#1e293b' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {!saves.dead && !saves.stabilized && playerOnTheirTurn && (
          <p className="text-center text-slate-400 text-xs italic">
            Dramatic death save window is open — waiting on the player to roll.
          </p>
        )}

        {!saves.dead && !saves.stabilized && !playerOnTheirTurn && (
          <div className="flex flex-col gap-2">
            {!isPlayer && (
              <button
                onClick={onRoll}
                className="w-full bg-[#FF5722] hover:bg-[#FF6B3D] text-white text-lg font-black py-3 rounded-2xl shadow-[0_8px_24px_rgba(255,87,34,0.4)] border-b-4 border-[#c43e12] active:border-b-0 active:translate-y-0.5 transition-all"
              >
                ROLL DEATH SAVE (d20)
              </button>
            )}

            {!isPlayer && (
              <button
                onClick={onShowDramatic}
                className="w-full bg-[#1a1f2e] hover:bg-[#222738] text-purple-300 border border-purple-500/40 text-xs font-bold py-2 rounded-xl uppercase tracking-widest transition-colors"
              >
                Show Dramatic Roll
              </button>
            )}

            {!isPlayer && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => onAdjust({ successesDelta: 1 })}
                  className="bg-[#22c55e]/15 hover:bg-[#22c55e]/25 text-[#22c55e] border border-[#22c55e]/40 text-xs font-bold py-2 rounded-xl uppercase tracking-wide transition-colors"
                >
                  Save Once
                </button>
                <button
                  onClick={() => onAdjust({ failuresDelta: 1 })}
                  className="bg-[#ef4444]/15 hover:bg-[#ef4444]/25 text-[#ef4444] border border-[#ef4444]/40 text-xs font-bold py-2 rounded-xl uppercase tracking-wide transition-colors"
                >
                  Fail Once
                </button>
                <button
                  onClick={() => onAdjust({ successes: 3, stabilized: true })}
                  className="bg-[#22c55e]/10 hover:bg-[#22c55e]/20 text-[#22c55e]/90 border border-[#22c55e]/30 text-xs font-semibold py-2 rounded-xl uppercase tracking-wide transition-colors"
                >
                  Save Completely
                </button>
                <button
                  onClick={() => onAdjust({ failures: 3, dead: true })}
                  className="bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444]/90 border border-[#ef4444]/30 text-xs font-semibold py-2 rounded-xl uppercase tracking-wide transition-colors"
                >
                  Fail Completely
                </button>
                <button
                  onClick={onKill}
                  className="col-span-2 bg-[#050816] hover:bg-[#111827] text-slate-300 border border-slate-700 text-xs font-bold py-2 rounded-xl uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  <img
                    src={DEATH_SAVE_ICONS.death}
                    alt=""
                    className="w-4 h-4"
                    style={DEATH_SAVE_ICON_STYLE}
                  />
                  Kill Instantly
                </button>
              </div>
            )}
          </div>
        )}

        {saves.dead && (
          <p className="text-center text-slate-500 text-xs italic">This combatant is dead. End their turn to advance.</p>
        )}
        {saves.stabilized && !saves.dead && (
          <p className="text-center text-slate-500 text-xs italic">Stabilized. They can't act but no longer roll saves — heal them to revive.</p>
        )}
      </div>
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
    const mod = abilityModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // Handle nested attributes structure or flat keys. Falls through
  // to monsterGetAbilityScores for the SRD long-name keys
  // (`strength`, `dexterity`, …) so reseeded monsters resolve too.
  const helperScores = monsterGetAbilityScores(character);
  const getAbilityScore = (key) => {
    const lk = key.toLowerCase();
    if (abilities[lk] != null) return abilities[lk];
    if (stats[lk] != null) return stats[lk];
    if (stats.attributes?.[lk] != null) return stats.attributes[lk];
    if (helperScores[lk] != null) return helperScores[lk];
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

  // Features can be in various places depending on data source.
  // SRD monsters tend to store under `special_abilities`, imported
  // monsters sometimes use `special_traits`, PCs use `features`.
  const traits = stats.traits || character.traits || [];
  const actions = stats.actions || character.actions || [];
  const specialAbilities = stats.special_abilities || character.special_abilities ||
                          stats.special_traits || character.special_traits ||
                          stats.features || character.features || [];
  const legendaryActions = stats.legendary_actions || character.legendary_actions || [];
  const reactions = stats.reactions || character.reactions || [];
  const bonusActions = stats.bonus_actions || character.bonus_actions || [];
  const lairActions = stats.lair_actions || character.lair_actions || [];
  const auras = stats.auras || character.auras || [];
  const multiattack = stats.multiattack || character.multiattack || null;
  const legendaryPerRound = stats.legendary_actions_per_round ?? character.legendary_actions_per_round ?? null;
  const legendaryResistances = stats.legendary_resistances ?? character.legendary_resistances ?? null;

  const skills = stats.skills || character.skills || {};
  // Senses / languages on reseeded SRD monsters are objects /
  // arrays — pipe them through the shared helpers so they end up
  // as plain strings before they hit JSX. Same story for the
  // damage info group: arrays of strings or arrays of objects with
  // `name` keys.
  const senses    = monsterGetSenses(character)    || stats.senses    || character.senses    || '';
  const languages = monsterGetLanguages(character) || stats.languages || character.languages || '—';
  const damageInfo = monsterGetDamageInfo(character);
  const damageResistances     = damageInfo.resistances     || (Array.isArray(stats.damage_resistances)     ? stats.damage_resistances.join(', ')     : stats.damage_resistances     || character.damage_resistances     || null);
  const damageImmunities      = damageInfo.immunities      || (Array.isArray(stats.damage_immunities)      ? stats.damage_immunities.join(', ')      : stats.damage_immunities      || character.damage_immunities      || null);
  const damageVulnerabilities = damageInfo.vulnerabilities || (Array.isArray(stats.damage_vulnerabilities) ? stats.damage_vulnerabilities.join(', ') : stats.damage_vulnerabilities || character.damage_vulnerabilities || null);
  const conditionImmunities   = damageInfo.conditionImmunities || (Array.isArray(stats.condition_immunities) ? stats.condition_immunities.map((c) => c?.name || c).join(', ') : stats.condition_immunities || character.condition_immunities || null);
  const proficiencyBonus = stats.proficiency_bonus || character.proficiency_bonus || 2;
  
  // Prefer a derived AC when the character has anything in their
  // equipment slots — armor + shield + DEX calculated per 5e rules.
  // Falls back to the static armor_class field for monsters / sheets
  // without an equipped map.
  const equippedForAC = character.equipped || character.equipment || {};
  const hasArmorEquipped =
    equippedForAC && Object.values(equippedForAC).some((i) => i?.category === 'armor');
  const computedACValue = hasArmorEquipped
    ? computeArmorClass({
        equipped: equippedForAC,
        dex:
          character.attributes?.dex ||
          character.stats?.dexterity ||
          10,
        fightingStyles: collectFightingStyles(character),
      }).total
    : null;
  // AC on reseeded SRD monsters ships as `[{ type: "natural", value: 19 }]`,
  // which crashes React if we hand it to JSX. monsterGetAC normalises
  // both that array shape and a plain number, so we route the
  // computed (equipped-armor) value first and fall through to it.
  const ac = computedACValue ?? monsterGetAC(character);
  const hpObj = stats.hit_points || character.hit_points;
  const hp = typeof hpObj === 'object' ? (hpObj?.max || '?') : (hpObj || '?');
  // Speed on reseeded SRD monsters ships as `{ walk: "40 ft.",
  // fly: "80 ft.", swim: "40 ft." }`; the helper joins it into a
  // single readable string.
  const speed = monsterGetSpeed(character) || '30 ft.';
  const cr = monsterGetCR(character);

  // Spells might be in stats.spells (NPC) or character.spells
  const spellsData = stats.spells || character.spells;
  const hasSpells = spellsData && (
    (Array.isArray(spellsData) && spellsData.length > 0) || 
    (typeof spellsData === 'object' && Object.keys(spellsData).some(k => spellsData[k]?.length > 0))
  );

  return (
    <SectionCard title={safeText(character.name) || 'Monster Stats'} className={`${className} flex flex-col`}>
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
                  <span className="text-white font-bold text-sm">{safeText(ac)}</span>
                </div>
                <div className="text-center border-l border-[#1e293b]">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider">HP</span>
                  <span className="text-white font-bold text-sm">{safeText(hp)}</span>
                </div>
                <div className="text-center border-l border-[#1e293b]">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Speed</span>
                  <span className="text-white font-bold text-sm">{safeText(speed)}</span>
                </div>
                <div className="text-center border-l border-[#1e293b]">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider">CR</span>
                  <span className="text-amber-400 font-bold text-sm">{safeText(cr)}</span>
                </div>
              </div>

              {/* Traits & Special Abilities */}
              {(traits.length > 0 || specialAbilities.length > 0) && (
                <div>
                  <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-2 font-bold border-b border-amber-500/20 pb-1">Traits & Features</p>
                  <div className="space-y-3">
                    {[...traits, ...specialAbilities].map((trait, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="text-white font-bold">{safeText(trait.name)}. </span>
                        <span className="text-slate-300 leading-relaxed">{safeText(trait.desc || trait.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Damage / Condition treatment — only shows the rows
                  that the monster actually defines so the panel
                  stays compact for simple stat blocks. */}
              {(damageResistances || damageImmunities || damageVulnerabilities || conditionImmunities) && (
                <div>
                  <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-2 font-bold border-b border-blue-500/20 pb-1">Treatment</p>
                  <div className="space-y-1.5 text-[11px]">
                    {damageVulnerabilities && (
                      <div>
                        <span className="text-slate-400 uppercase tracking-wide text-[9px]">Vulnerabilities </span>
                        <span className="text-rose-300">{safeText(damageVulnerabilities)}</span>
                      </div>
                    )}
                    {damageResistances && (
                      <div>
                        <span className="text-slate-400 uppercase tracking-wide text-[9px]">Resistances </span>
                        <span className="text-emerald-300">{safeText(damageResistances)}</span>
                      </div>
                    )}
                    {damageImmunities && (
                      <div>
                        <span className="text-slate-400 uppercase tracking-wide text-[9px]">Damage Immunities </span>
                        <span className="text-slate-200">{safeText(damageImmunities)}</span>
                      </div>
                    )}
                    {conditionImmunities && (
                      <div>
                        <span className="text-slate-400 uppercase tracking-wide text-[9px]">Condition Immunities </span>
                        <span className="text-slate-200">{safeText(conditionImmunities)}</span>
                      </div>
                    )}
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
                        <span className="text-white font-bold group-hover:text-[#37F2D1] transition-colors">{safeText(action.name)}. </span>
                        <span className="text-slate-300 leading-relaxed">{safeText(action.desc || action.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reactions */}
              {reactions.length > 0 && (
                <div>
                  <p className="text-[10px] text-orange-400 uppercase tracking-wide mb-2 font-bold border-b border-orange-500/20 pb-1">Reactions</p>
                  <div className="space-y-3">
                    {reactions.map((reaction, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="text-white font-bold">{safeText(reaction.name)}. </span>
                        <span className="text-slate-300 leading-relaxed">{safeText(reaction.desc || reaction.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-Attack callout */}
              {multiattack && multiattack.enabled && (multiattack.description || (Array.isArray(multiattack.attacks) && multiattack.attacks.length > 0)) && (
                <div>
                  <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-2 font-bold border-b border-amber-500/20 pb-1">Multi-Attack</p>
                  {multiattack.description && (
                    <p className="text-[11px] text-slate-300 leading-relaxed mb-1">{safeText(multiattack.description)}</p>
                  )}
                  {Array.isArray(multiattack.attacks) && multiattack.attacks.length > 0 && (
                    <ul className="text-[11px] text-slate-400 list-disc list-inside">
                      {multiattack.attacks.map((a, i) => (
                        <li key={i}>{a.count > 1 ? `${safeText(a.count)}× ` : ""}{safeText(a.name)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Bonus Actions */}
              {bonusActions.length > 0 && (
                <div>
                  <p className="text-[10px] text-cyan-400 uppercase tracking-wide mb-2 font-bold border-b border-cyan-500/20 pb-1">Bonus Actions</p>
                  <div className="space-y-3">
                    {bonusActions.map((action, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="text-white font-bold">{safeText(action.name)}. </span>
                        <span className="text-slate-300 leading-relaxed">{safeText(action.desc || action.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legendary Actions */}
              {legendaryActions.length > 0 && (
                <div>
                  <p className="text-[10px] text-purple-400 uppercase tracking-wide mb-2 font-bold border-b border-purple-500/20 pb-1">
                    Legendary Actions
                    {legendaryPerRound != null && Number(legendaryPerRound) > 0 && (
                      <span className="text-slate-500 normal-case ml-2 font-normal">
                        ({safeText(legendaryPerRound)}/round)
                      </span>
                    )}
                  </p>
                  <div className="space-y-3">
                    {legendaryActions.map((action, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="text-white font-bold">
                          {safeText(action.name)}
                          {action.legendary_cost > 1 && (
                            <span className="text-purple-300"> (Costs {safeText(action.legendary_cost)})</span>
                          )}
                          . </span>
                        <span className="text-slate-300 leading-relaxed">{safeText(action.desc || action.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legendary Resistances */}
              {legendaryResistances != null && Number(legendaryResistances) > 0 && (
                <div>
                  <p className="text-[10px] text-fuchsia-400 uppercase tracking-wide mb-2 font-bold border-b border-fuchsia-500/20 pb-1">Legendary Resistance</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    If the creature fails a saving throw, it can choose to succeed instead.
                    <span className="text-fuchsia-300 ml-1 font-bold">{safeText(legendaryResistances)}/day</span>
                  </p>
                </div>
              )}

              {/* Lair Actions */}
              {lairActions.length > 0 && (
                <div>
                  <p className="text-[10px] text-lime-400 uppercase tracking-wide mb-2 font-bold border-b border-lime-500/20 pb-1">Lair Actions</p>
                  <p className="text-[10px] text-slate-400 italic mb-2">On initiative count 20 (losing ties), the creature takes one lair action.</p>
                  <div className="space-y-3">
                    {lairActions.map((action, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="text-white font-bold">{safeText(action.name)}. </span>
                        <span className="text-slate-300 leading-relaxed">{safeText(action.desc || action.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auras */}
              {auras.length > 0 && (
                <div>
                  <p className="text-[10px] text-pink-400 uppercase tracking-wide mb-2 font-bold border-b border-pink-500/20 pb-1">Auras</p>
                  <div className="space-y-3">
                    {auras.map((aura, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="text-white font-bold">{safeText(aura.name)}. </span>
                        <span className="text-slate-400">({safeText(aura.radius) || "—"})</span>
                        {aura.description && (
                          <span className="text-slate-300 leading-relaxed"> {safeText(aura.description)}</span>
                        )}
                        {(aura.damage_dice || aura.applies_condition) && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {aura.damage_dice && <span>Damage: {safeText(aura.damage_dice)} {safeText(aura.damage_type)}</span>}
                            {aura.save_ability && <span className="ml-2">Save: DC {safeText(aura.save_dc) || "?"} {safeText(aura.save_ability)}</span>}
                            {aura.applies_condition && <span className="ml-2">Applies: {safeText(aura.applies_condition)}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {traits.length === 0
                && specialAbilities.length === 0
                && actions.length === 0
                && bonusActions.length === 0
                && reactions.length === 0
                && legendaryActions.length === 0
                && lairActions.length === 0
                && auras.length === 0
                && !damageResistances
                && !damageImmunities
                && !damageVulnerabilities
                && !conditionImmunities && (
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
                    <span className="text-xs text-amber-400 font-bold w-8">{safeText(name)}</span>
                    <span className="text-white font-bold text-sm">{safeText(score)}</span>
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
                        {safeText(key).toUpperCase()} +{getMod(abilityScores[key.toUpperCase()]) + proficiencyBonus}
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
                            <span className="text-slate-300">{safeText(skill)}</span>
                            <span className="text-[#37F2D1]">{safeText(bonus)}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-300 col-span-2">{Array.isArray(skills) ? skills.map((s) => safeText(s)).join(', ') : safeText(skills)}</p>
                    )}
                  </div>
                </div>
              )}

              {(senses || languages) && (
                <div className="space-y-3 pt-2">
                  {senses && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Senses</p>
                      <p className="text-xs text-white bg-[#0b1220] p-2 rounded">{safeText(senses)}</p>
                    </div>
                  )}
                  {languages && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Languages</p>
                      <p className="text-xs text-white bg-[#0b1220] p-2 rounded">{safeText(languages)}</p>
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
                      <p className="text-[10px] text-purple-400 uppercase tracking-wide mb-2 font-bold sticky top-0 bg-[#050816] py-1">{safeText(label)}</p>
                      <div className="space-y-1">
                        {spells.map((spell, idx) => (
                          <div key={idx} className="text-xs bg-[#0b1220] p-2 rounded border border-[#111827]">
                            <span className="text-white font-medium">{safeText(typeof spell === 'string' ? spell : spell?.name)}</span>
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

function TurnOrderBar({ order, setOrder, activeConditions, concentrationByCharacter = {}, onSelectTarget, selectionMode, isTurnOrderAccepted, getHp, isGM, onChangeFaction, onSetExhaustion, onGrantInspiration }) {
  const hasPlayedRef = React.useRef(false);
  // Right-click context menu state. Stores the combatant whose portrait
  // was right-clicked plus screen coords so the menu floats there.
  const [factionMenu, setFactionMenu] = React.useState(null);

  React.useEffect(() => {
    if (!factionMenu) return;
    const close = () => setFactionMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
    };
  }, [factionMenu]);

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

                const factionStyle = getFactionStyle(combatant);
                // During targeting mode we swap the border to the faction
                // color so the GM can tell allies / neutrals / enemies
                // apart at a glance. Outside targeting the condition-
                // based border (or active-turn teal) still wins.
                let computedBorderColor = borderColor || (index === 0 ? '#37F2D1' : '#111827');
                if (selectionMode) computedBorderColor = factionStyle.hex;

                // Downed state — the combatant is at 0 HP but not yet
                // dead (dead combatants are filtered into combat_data.
                // fallen and don't reach this map). The portrait gets a
                // faded treatment and a small unconscious / death-save
                // overlay below.
                const saves = combatant.deathSaves;
                const isDowned = !!combatant.downed;
                const isStabilized = !!saves?.stabilized;
                const isDoingDeathSaves = isDowned && !isStabilized;

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
                        onContextMenu={(e) => {
                          // Right-click on a combatant → faction menu.
                          // GMs can re-faction anyone (players included,
                          // e.g. dominated). Non-GMs don't get the menu.
                          if (!isGM || !onChangeFaction) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setFactionMenu({
                            combatant,
                            x: e.clientX,
                            y: e.clientY,
                          });
                        }}
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

                          {/* Charm duration badge — only for charmed allies
                              with a finite duration. */}
                          {combatant.faction === 'ally' && typeof combatant.charmDuration === 'number' && (
                            <div
                              className={`absolute -top-1 -right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full z-30 ${factionStyle.pillStrong} shadow`}
                              title={`Charmed — ${combatant.charmDuration} turn${combatant.charmDuration === 1 ? '' : 's'} left`}
                            >
                              ×{combatant.charmDuration}
                            </div>
                          )}

                          {/* Bardic Inspiration badge — a small ♪ in the
                              Bard class tint when the combatant holds an
                              unspent inspiration die. */}
                          {combatant.bardicInspiration && (
                            <div
                              className="absolute -top-1 -left-1 text-[10px] font-black z-30 rounded-full w-5 h-5 flex items-center justify-center shadow-[0_0_8px_rgba(252,211,77,0.8)]"
                              style={{
                                backgroundColor: '#fbbf24',
                                color: '#1f1303',
                                border: '1.5px solid #fde68a',
                              }}
                              title={`Bardic Inspiration (${combatant.bardicInspiration.die})${combatant.bardicInspiration.fromName ? ` — from ${combatant.bardicInspiration.fromName}` : ''}`}
                            >
                              ♪
                            </div>
                          )}

                          {/* Inspiration badge — gold ★ on top-left when
                              the character has DM inspiration. */}
                          {combatant.hasInspiration && !combatant.bardicInspiration && (
                            <div
                              className="absolute -top-1 -left-1 text-[11px] font-black z-30 rounded-full w-5 h-5 flex items-center justify-center shadow-[0_0_10px_rgba(250,204,21,0.9)]"
                              style={{
                                backgroundColor: '#facc15',
                                color: '#1f1303',
                                border: '1.5px solid #fde68a',
                              }}
                              title="Inspiration (advantage on one roll)"
                            >
                              ★
                            </div>
                          )}

                          {/* Exhaustion badge — small numbered pip in the
                              bottom-left corner when exhaustion > 0. */}
                          {(combatant.exhaustion || 0) > 0 && (
                            <div
                              className="absolute -bottom-1 -left-1 text-[10px] font-black z-30 rounded-full w-5 h-5 flex items-center justify-center bg-red-800 text-white border border-red-300 shadow-[0_0_6px_rgba(153,27,27,0.9)]"
                              title={`Exhaustion level ${combatant.exhaustion}`}
                            >
                              {combatant.exhaustion}
                            </div>
                          )}

                          {/* Unconscious banner for downed combatants */}
                          {isDowned && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/80 text-slate-300 whitespace-nowrap z-30 border border-slate-600 uppercase tracking-wider">
                              Unconscious
                            </div>
                          )}

                          <div
                            className={`relative w-20 h-20 rounded-full border-4 overflow-hidden transition-all ${
                              index === 0 ? 'shadow-[0_0_25px_rgba(55,242,209,0.6)] scale-110' : 'bg-[#050816]'
                            } ${isDowned ? 'opacity-50' : ''}`}
                            style={{
                              borderColor: computedBorderColor,
                            }}
                          >
                            <PortraitWithState
                              url={combatant.avatar}
                              bloodiedUrl={combatant.bloodied_avatar_url}
                              current={combatant.hit_points?.current ?? combatant.hit_points?.max}
                              max={combatant.hit_points?.max}
                              alt={combatant.name}
                              skullSize="lg"
                              fallback={
                                <div className="w-full h-full flex items-center justify-center text-xl text-slate-500 font-bold bg-[#1a1f2e]">
                                  {combatant.name?.[0] || '?'}
                                </div>
                              }
                            />
                            {/* Animated condition rings wrap around the
                                portrait — one ring per active condition,
                                name arcs along the top and slowly spins. */}
                            <ConditionRing conditions={conditions} size={80} />
                            {/* Concentration pulsing glow — distinct
                                from the condition rings. Shown when the
                                combatant is concentrating on a spell. */}
                            {concentrationByCharacter[combatant.uniqueId || combatant.id] && (
                              <div
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{
                                  animation: 'gs-concentration-pulse 2.4s ease-in-out infinite',
                                  borderRadius: '9999px',
                                }}
                                title={`Concentrating: ${
                                  concentrationByCharacter[combatant.uniqueId || combatant.id].spell
                                }`}
                              />
                            )}
                            <div
                              className="absolute bottom-0 inset-x-0 bg-black/80 text-[11px] text-center text-white font-bold py-0.5"
                              title={
                                typeof combatant.initiativeRoll === 'number'
                                  ? `${combatant.name} rolled ${combatant.initiative} (${combatant.initiativeRoll}${
                                      (combatant.initiativeMod || 0) >= 0 ? ' + ' : ' − '
                                    }${Math.abs(combatant.initiativeMod || 0)})`
                                  : undefined
                              }
                            >
                              {combatant.initiative}
                            </div>
                          </div>

                          {/* Initiative roll breakdown — visible only while
                              combatants are still being arranged (pre-Fight).
                              Once the GM locks the order we drop back to
                              just showing the total on the portrait. */}
                          {!isTurnOrderAccepted && !isDowned && typeof combatant.initiativeRoll === 'number' && (
                            <span className="text-[9px] font-mono text-slate-400 tracking-tight">
                              {combatant.initiativeRoll}
                              {(combatant.initiativeMod || 0) >= 0 ? ' + ' : ' − '}
                              {Math.abs(combatant.initiativeMod || 0)}
                              {' = '}
                              <span className="text-white font-bold">{combatant.initiative}</span>
                            </span>
                          )}

                          {/* Death save row under the portrait — only
                              visible while the combatant is downed. */}
                          {isStabilized && (
                            <span className="text-[9px] font-bold text-[#22c55e] uppercase tracking-widest">
                              Stabilized
                            </span>
                          )}
                          {isDoingDeathSaves && saves && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex items-center gap-0.5">
                                <img
                                  src={DEATH_SAVE_ICONS.life}
                                  alt="Successes"
                                  className="w-3 h-3 mr-0.5"
                                  style={DEATH_SAVE_ICON_STYLE}
                                />
                                {[0, 1, 2].map(i => (
                                  <span
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full inline-block"
                                    style={{ backgroundColor: saves.successes > i ? '#22c55e' : '#1e293b' }}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-0.5">
                                <img
                                  src={DEATH_SAVE_ICONS.death}
                                  alt="Failures"
                                  className="w-3 h-3 mr-0.5"
                                  style={DEATH_SAVE_ICON_STYLE}
                                />
                                {[0, 1, 2].map(i => (
                                  <span
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full inline-block"
                                    style={{ backgroundColor: saves.failures > i ? '#ef4444' : '#1e293b' }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* HP Bar for GM — uses the shared getHp lookup so
                              live HP reflects damage write-backs. Color is
                              driven by percentage, not side. */}
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1 border border-gray-700">
                            {(() => {
                              const hp = typeof getHp === 'function' ? getHp(combatant.id) : null;
                              const max = hp?.max || 0;
                              const current = hp?.current ?? max;
                              const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
                              return (
                                <div
                                  className={`h-full ${hpBarColor(pct)}`}
                                  style={{ width: `${pct}%` }}
                                />
                              );
                            })()}
                          </div>

                          {/* Name bubble — colored by faction (player =
                              teal, enemy = red-orange, ally = green,
                              neutral = blue). The current turn swaps to
                              the stronger fill variant. */}
                          <span
                            className={`text-[10px] font-bold max-w-[120px] truncate px-2 py-0.5 rounded-full ${
                              index === 0 ? factionStyle.pillStrong : factionStyle.pill
                            }`}
                            title={combatant.active_title ? `${combatant.name} ${combatant.active_title}` : combatant.name}
                          >
                            {combatant.name}
                            {combatant.active_title && (
                              <span className="ml-1 font-normal opacity-90">{combatant.active_title}</span>
                            )}
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

      {/* Faction context menu — fires from the onContextMenu handler on
          each combatant portrait. Only the GM sees this. Clicking a
          faction applies it via the parent-supplied callback. */}
      {factionMenu && (
        <div
          className="fixed z-[200] bg-[#050816] border-2 border-[#37F2D1]/30 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-2 min-w-[180px] max-h-[80vh] overflow-y-auto"
          style={{ left: factionMenu.x, top: factionMenu.y }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="text-[9px] uppercase tracking-[0.22em] text-slate-500 font-bold px-2 pb-1 border-b border-[#111827] mb-1">
            {factionMenu.combatant.name} — Faction
          </div>
          {Object.keys(FACTION_STYLES).map((f) => {
            const style = FACTION_STYLES[f];
            const current = (factionMenu.combatant.faction || 'enemy') === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => {
                  onChangeFaction(
                    factionMenu.combatant.uniqueId || factionMenu.combatant.id,
                    { faction: f, charmDuration: null }
                  );
                  setFactionMenu(null);
                }}
                className={`w-full text-left text-xs font-semibold px-3 py-1.5 rounded-lg mb-0.5 flex items-center gap-2 transition-colors ${
                  current ? style.pillStrong : style.pill + ' hover:brightness-125'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: style.hex }}
                />
                {style.label}
                {current && <span className="ml-auto text-[9px] opacity-70">current</span>}
              </button>
            );
          })}

          {/* Exhaustion (levels 0-6). Effects auto-apply via
              conditions.js; we only persist the level here. */}
          <div className="text-[9px] uppercase tracking-[0.22em] text-slate-500 font-bold px-2 pt-3 pb-1 border-t border-[#111827] mt-2 mb-1">
            Exhaustion
          </div>
          <div className="grid grid-cols-7 gap-1 px-1 mb-1">
            {[0, 1, 2, 3, 4, 5, 6].map((lvl) => {
              const current = (factionMenu.combatant.exhaustion || 0) === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    if (onSetExhaustion) {
                      onSetExhaustion(
                        factionMenu.combatant.uniqueId || factionMenu.combatant.id,
                        lvl,
                      );
                    }
                    setFactionMenu(null);
                  }}
                  className={`text-[11px] font-black rounded transition-colors py-1 ${
                    current ? 'bg-red-700 text-white' : 'bg-[#111827] text-slate-300 hover:bg-red-700/30'
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>

          {/* Grant Inspiration — GM gives the target a single-use
              advantage die. ★ badge renders on the portrait until the
              character spends it. */}
          <div className="text-[9px] uppercase tracking-[0.22em] text-slate-500 font-bold px-2 pt-3 pb-1 border-t border-[#111827] mt-2 mb-1">
            Inspiration
          </div>
          <button
            type="button"
            onClick={() => {
              if (onGrantInspiration) {
                onGrantInspiration(
                  factionMenu.combatant.uniqueId || factionMenu.combatant.id,
                  !factionMenu.combatant.hasInspiration,
                );
              }
              setFactionMenu(null);
            }}
            className={`w-full text-left text-xs font-semibold px-3 py-1.5 rounded-lg mb-0.5 flex items-center gap-2 transition-colors ${
              factionMenu.combatant.hasInspiration
                ? 'bg-yellow-500 text-black'
                : 'bg-[#111827] text-yellow-400 hover:bg-yellow-500/30'
            }`}
          >
            <span>★</span>
            {factionMenu.combatant.hasInspiration ? 'Clear Inspiration' : 'Grant Inspiration'}
          </button>
        </div>
      )}
    </div>
  );
}
function VillainActionPrompt({ prompt, onClose, onConfirm }) {
  if (!prompt) return null;
  const { villain, action, round } = prompt;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-[#1a0514] to-[#0b1220] border-2 border-rose-600/70 rounded-xl shadow-[0_0_40px_rgba(225,29,72,0.5)] p-6">
        <div className="flex items-center gap-2 text-rose-300 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
          <span className="bg-rose-600/20 border border-rose-600/60 rounded px-2 py-0.5">Round {round}</span>
          Villain Action
        </div>
        <h3 className="text-2xl font-black text-rose-100 mb-1">{safeText(action.name)}</h3>
        <p className="text-xs text-slate-400 mb-4">{safeText(villain.name)}</p>
        {action.description && (
          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed mb-4">
            {safeText(action.description)}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-6">
          {action.save_dc && (
            <div><span className="text-rose-300">DC</span> {safeText(action.save_dc)} {safeText(action.save_ability) || "save"}</div>
          )}
          {action.attack_bonus != null && action.attack_bonus !== "" && (
            <div><span className="text-rose-300">Attack</span> +{safeText(action.attack_bonus)}</div>
          )}
          {action.damage_dice && (
            <div><span className="text-rose-300">Damage</span> {safeText(action.damage_dice)} {safeText(action.damage_type)}</div>
          )}
          {action.aoe_size && (
            <div><span className="text-rose-300">Area</span> {safeText(action.aoe_shape)} {safeText(action.aoe_size)}</div>
          )}
          {action.applies_condition && (
            <div><span className="text-rose-300">Condition</span> {safeText(action.applies_condition)}</div>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-700"
          >
            Skip this round
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-black uppercase tracking-wider shadow-[0_0_20px_rgba(225,29,72,0.6)]"
          >
            Use Villain Action
          </button>
        </div>
      </div>
    </div>
  );
}
