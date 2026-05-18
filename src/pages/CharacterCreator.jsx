import { useAuth } from '@/lib/AuthContext';
import { useSubscription } from '@/lib/SubscriptionContext';
import { trackEvent } from '@/utils/analytics';
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { loadCampaignBans, findCharacterIncompatibilities } from "@/lib/campaignBans";
import { getSpellSlots, getPactSlots } from "@/components/dnd5e/spellData";
import { getSkillsCompletion } from "@/components/characterCreator/skillsCompletion";
import { getSkillsCompletion2024 } from "@/components/characterCreator/skillsCompletion2024";
import { getSpellsCompletion } from "@/components/characterCreator/spellsCompletion";
import { motion, AnimatePresence } from "framer-motion";
import { 
  calculateMaxHP, 
  calculateAC, 
  calculateProficiencyBonus, 
  // calculatePassivePerception, // This function is no longer needed directly in handleSubmit
  getSpeed,
  calculateAbilityModifier
} from "@/components/dnd5e/characterCalculations";
import {
  buildStatsFromCharacterData,
  npcPayloadFromStats,
  characterDataFromNpcForEditor,
} from "@/components/dnd5e/characterMapping";

import IdentityStep from "@/components/characterCreator/IdentityStep";
import IdentityStep2024 from "@/components/characterCreator/IdentityStep2024";
import ClassStep from "@/components/characterCreator/ClassStep";
import ClassStep2024 from "@/components/characterCreator/ClassStep2024";
import AbilityScoresStep from "@/components/characterCreator/AbilityScoresStep";
import AbilitiesStep2024 from "@/components/characterCreator/AbilitiesStep2024";
import ClassFeaturesStep from "@/components/characterCreator/ClassFeaturesStep";
import ClassFeaturesStep2024 from "@/components/characterCreator/ClassFeaturesStep2024";
import SkillsStep from "@/components/characterCreator/SkillsStep";
import SkillsStep2024 from "@/components/characterCreator/SkillsStep2024";
import SpellsStep from "@/components/characterCreator/SpellsStep";
import SpellsStep2024 from "@/components/characterCreator/SpellsStep2024";
import {
  getSpellsKnownEntry as getSpellsKnownEntry2024,
  spellsPrepared as spellsPrepared2024,
  cantripsKnown as cantripsKnown2024,
} from "@/data/games/dnd5e_2024/rules";
import EquipmentStep from "@/components/characterCreator/EquipmentStep";
import ReviewStep from "@/components/characterCreator/ReviewStep";
import ReviewStep2024 from "@/components/characterCreator/ReviewStep2024";
import QuickCreateDialog from "@/components/characterCreator/QuickCreateDialog";
import ModeSelector from "@/components/characterCreator/ModeSelector";
import QuickPickFlow from "@/components/characterCreator/QuickPickFlow";
import AIGenerateFlow from "@/components/characterCreator/AIGenerateFlow";
import { Stepper } from "@/components/characterCreator/chrome/Stepper";
import { StepNav } from "@/components/characterCreator/chrome/StepNav";
import { themeForClass } from "@/data/character-creator-class-themes";

const STEPS = [
  { id: 'identity', label: 'Identity', component: IdentityStep },
  { id: 'class', label: 'Class & Path', component: ClassStep },
  { id: 'abilities', label: 'Abilities', component: AbilityScoresStep },
  { id: 'features', label: 'Features', component: ClassFeaturesStep },
  { id: 'skills', label: 'Skills', component: SkillsStep },
  { id: 'spells', label: 'Spells', component: SpellsStep },
  { id: 'equipment', label: 'Equipment', component: EquipmentStep },
  { id: 'review', label: 'Review', component: ReviewStep }
];

// Character creator backdrop pool. One of these is picked at random
// per mount (useState initializer at the consumer site, so the
// background doesn't flicker between renders). Hosted in Supabase
// app-assets so the asset list lives in one place; updating the
// Storage bucket doesn't require a code change beyond editing this
// array.
const BACKGROUND_GIFS = [
  'https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/charactercreatorbg1.webp',
  'https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/charactercreatorbg2.webp',
  'https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/charactercreatorbg3.webp',
  'https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/charactercreatorbg4.webp',
];

export default function CharacterCreator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const sub = useSubscription();
  // Cached count of the user's existing characters — gated against
  // the subscription tier's character limit before opening any
  // creation flow (full / quick / AI). Editing or building NPCs
  // bypasses the limit.
  const { data: existingCharacterCount = 0 } = useQuery({
    queryKey: ['characterCount', authUser?.email],
    queryFn: async () => {
      // Match the save-side convention: created_by is the email, not
      // the UUID. Filtering by UUID would always return 0 and let the
      // tier character-limit gate through.
      if (!authUser?.email) return 0;
      const rows = await base44.entities.Character
        .filter({ created_by: authUser.email })
        .catch(() => []);
      return rows.length;
    },
    enabled: !!authUser?.email,
    initialData: 0,
  });
  const urlParams = new URLSearchParams(window.location.search);
  const editCharacterId = urlParams.get('edit');
  const campaignId = urlParams.get('campaignId');
  const returnTo = urlParams.get('returnTo');
  // gamePack is the rule system + edition the character is being
  // built against. Defaults to dnd5e_2014; the picker in
  // CreateCharacterDialog stamps the URL with the chosen pack id
  // when the player has multiple owned. Persisted on the saved
  // character row so subsequent loads dispatch to the right
  // per-step UI.
  const urlGamePack = urlParams.get('gamePack') || 'dnd5e_2014';
  // When the apply flow pushes the player into the creator it tags
  // the URL with ?forApply=1 so we save a PC (characters table) and
  // stamp mod_dependencies + campaign_origin instead of taking the
  // existing GM NPC-create branch below.
  const isApplyFlow = urlParams.get('forApply') === '1';
  // Mandatory edit-pass mode (set by the lobby's library picker
  // when the picked character violates a campaign ban). The player
  // gets a top-of-page alert listing every violation and the save
  // button stays disabled until none are left. See the
  // `editIncompatibilityViolations` memo + the `incompatibilityGate`
  // disable on the save Button below.
  const editIncompatibilities = urlParams.get('editIncompatibilities') === '1';
  
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  // Creation mode: null = show mode selector. 'full' = the classic
  // step-by-step creator. 'quick' / 'ai' = AI-assisted flows that
  // skip straight to their own screens. Editing an existing
  // character bypasses the selector entirely (see effect below).
  const [mode, setMode] = useState(null);
  const [aiSaving, setAiSaving] = useState(false);
  const [backgroundImage] = useState(() => 
    BACKGROUND_GIFS[Math.floor(Math.random() * BACKGROUND_GIFS.length)]
  );

  const { user } = useAuth();

  const [characterData, setCharacterData] = useState({
    name: "",
    // Game pack / ruleset edition this character was built under.
    // Layer 4 introduces dnd5e_2014 (current default) and
    // dnd5e_2024 (filled in by commits 2-4). Legacy characters
    // saved without this field default to dnd5e_2014 in the
    // editCharacter loader below.
    race: "",
    subrace: "",
    class: "",
    subclass: "",
    background: "",
    alignment: "True Neutral",
    level: 1,
    avatar_url: "",
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    // Pre-ASI scores = base (rolled / point-buy / standard array)
    // + racial bonuses. The Features step's ASI picker computes
    // characterData.attributes = applyAsiBumps(baseAttributes,
    // asiSelections) so downstream HP / skill / save-DC consumers
    // can keep reading `attributes` and naturally see the effective
    // post-ASI value.
    baseAttributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skills: {},
    spells: { cantrips: [], level1: [] },
    saving_throws: {},
    proficiencies: { armor: [], weapons: [], tools: [] },
    languages: [],
    features: [],
    feature_choices: {},
    gamePack: urlGamePack,
    game_pack: urlGamePack,
    multiclasses: [],
    // Per-class multiclass skill picks (Bard / Ranger / Rogue grant
    // 1 skill on entry per RAW). Keyed by class name; the SkillsStep
    // picker reads / writes this map alongside the main `skills` map.
    multiclassSkills: {},
    // Ability Score Improvement / feat selections at each ASI
    // milestone (PHB p. 15). Keyed by `${className}-${classLevel}`
    // so a multiclass build's separate ASI tracks don't collide.
    // Bumps are applied to characterData.attributes by the picker
    // in ClassFeaturesStep; this map is the audit trail used to
    // re-apply on reload and to recompute when the player edits.
    asiSelections: {},
    inventory: [],
    equipment: { weapons: [], armor: {} },
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    personality: { traits: [], ideals: "", bonds: "", flaws: "" },
    appearance: {},
    description: "",
    expertise: [], // Added for passive perception calculation
  });

  const previousClassRef = useRef(characterData.class);

  // Mandatory edit-pass: load the campaign's ban list and recompute
  // violations live as the player edits. Only runs in
  // editIncompatibilities mode (lobby library picker routes here
  // when findCharacterIncompatibilities found violations on the
  // source library row). The save button gates on
  // `incompatibilityGate` further below.
  const { data: campaignBansForEdit } = useQuery({
    queryKey: ['campaignBans', campaignId, 'editPass'],
    enabled: editIncompatibilities && !!campaignId,
    queryFn: () => loadCampaignBans(campaignId),
  });

  // Live violation list from the wizard's current characterData.
  // findCharacterIncompatibilities walks race / class / subclass /
  // spells / features / items. As the player edits a banned field,
  // that field drops out of the list and the gate clears
  // automatically on the next render.
  const editIncompatibilityViolations = React.useMemo(() => {
    if (!editIncompatibilities || !campaignBansForEdit) return [];
    return findCharacterIncompatibilities(campaignBansForEdit, characterData) || [];
  }, [editIncompatibilities, campaignBansForEdit, characterData]);

  const incompatibilityGate = editIncompatibilities && editIncompatibilityViolations.length > 0;

  const { data: existingCharacter } = useQuery({
    queryKey: ['character', editCharacterId, campaignId],
    queryFn: async () => {
      if (campaignId) {
        // Editing an NPC
        const npcs = await base44.entities.CampaignNPC.filter({ id: editCharacterId });
        return npcs[0];
      } else {
        // Editing a character
        const chars = await base44.entities.Character.filter({ id: editCharacterId });
        return chars[0];
      }
    },
    enabled: !!editCharacterId,
  });

  // Editing an existing character (or building an NPC inside a
  // campaign) skips the mode selector and lands straight in the
  // full step-by-step editor.
  useEffect(() => {
    if (editCharacterId || campaignId) setMode('full');
  }, [editCharacterId, campaignId]);

  useEffect(() => {
    if (existingCharacter && editCharacterId) {
      if (campaignId) {
        // Editing an NPC: use stats blob
        const mapped = characterDataFromNpcForEditor(existingCharacter);
        setCharacterData(prev => ({
          ...prev,
          ...mapped,
        }));
      } else {
        // Editing a PC: existing logic.
        // game_pack on the row is the persisted edition; mirror it
        // into the camelCase `gamePack` the dispatcher reads.
        const persistedPack =
          existingCharacter.game_pack === 'dnd5e' ? 'dnd5e_2014'
            : existingCharacter.game_pack || 'dnd5e_2014';
        setCharacterData(prev => ({
          ...prev,
          ...existingCharacter,
          gamePack: persistedPack,
          game_pack: persistedPack,
          attributes: existingCharacter.attributes || prev.attributes,
          baseAttributes: existingCharacter.baseAttributes || existingCharacter.attributes || prev.baseAttributes,
          skills: existingCharacter.skills || prev.skills,
          spells: existingCharacter.spells || prev.spells,
          saving_throws: existingCharacter.saving_throws || prev.saving_throws,
          proficiencies: existingCharacter.proficiencies || prev.proficiencies,
          languages: existingCharacter.languages || prev.languages,
          features: existingCharacter.features || prev.features,
          feature_choices: existingCharacter.feature_choices || prev.feature_choices,
          multiclasses: existingCharacter.multiclasses || prev.multiclasses,
          multiclassSkills: existingCharacter.multiclassSkills || prev.multiclassSkills,
          asiSelections: existingCharacter.asiSelections || prev.asiSelections,
          inventory: existingCharacter.inventory || prev.inventory,
          equipment: existingCharacter.equipment || prev.equipment,
          currency: existingCharacter.currency || prev.currency,
          personality: existingCharacter.personality || prev.personality,
          appearance: existingCharacter.appearance || prev.appearance,
          expertise: existingCharacter.expertise || prev.expertise,
        }));
      }
      setCompletedSteps(STEPS.map((_, idx) => idx)); // Mark all steps as complete for editing
    }
  }, [existingCharacter, editCharacterId, campaignId]);

  // Class-driven page palette: when the picked class changes, shift the
  // .cc-root surface to that class's theme and trigger the arrival
  // shockwave. Skipped silently when no class is picked yet.
  useEffect(() => {
    const root = document.querySelector('.cc-root');
    if (!root) return;
    const theme = themeForClass(characterData.class);
    if (theme) {
      root.style.setProperty('--page-bg-1', theme.bg1);
      root.style.setProperty('--page-bg-2', theme.bg2);
      root.style.setProperty('--page-accent', theme.accent);
      root.style.setProperty('--page-accent-deep', theme.accentDeep);
      root.style.setProperty('--aura-tint', theme.color);
      root.style.setProperty('--aura-deep', theme.auraDeep);
      root.style.setProperty('--aura-strength', '1');
    } else {
      root.style.setProperty('--aura-strength', '0');
    }
  }, [characterData.class]);

  useEffect(() => {
    if (!characterData.class) return;
    const el = document.getElementById('class-arrival');
    if (!el) return;
    el.classList.add('firing');
    const timer = setTimeout(() => el.classList.remove('firing'), 1600);
    return () => clearTimeout(timer);
  }, [characterData.class]);

  useEffect(() => {
    // This effect handles resetting creation flow if class changes during creation,
    // but should not interfere with loading an existing character.
    if (!editCharacterId && previousClassRef.current && previousClassRef.current !== characterData.class && characterData.class) {
      const step1Data = {
        name: characterData.name,
        race: characterData.race,
        subrace: characterData.subrace,
        background: characterData.background,
        level: characterData.level
      };
      
      setCharacterData({
        ...step1Data,
        class: characterData.class,
        subclass: "",
        alignment: "True Neutral",
        avatar_url: "",
        attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        skills: {},
        spells: { cantrips: [], level1: [] },
        saving_throws: {},
        proficiencies: { armor: [], weapons: [], tools: [] },
        languages: [],
        features: [],
        feature_choices: {},
        multiclasses: [],
        inventory: [],
        equipment: { weapons: [], armor: {} },
        currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
        personality: { traits: [], ideals: "", bonds: "", flaws: "" },
        appearance: {},
        description: "",
        expertise: []
      });
      
      setCurrentStep(1);
      setCompletedSteps(prev => prev.filter(step => step < 1));
      toast.info("Class changed - character creation reset from this point.");
    }
    
    previousClassRef.current = characterData.class;
  }, [characterData.class, characterData.name, characterData.race, characterData.subrace, characterData.background, characterData.level, editCharacterId]);

  const createMutation = useMutation({
    mutationFn: async (stats) => {
      // Preserve any mod_dependencies the wizard state already carries
      // — the race / class steps read from getModdedRaces() /
      // getModdedClasses() when a campaignId is in scope, and the
      // modded-campaign apply path wants the resulting PC tagged with
      // every installed mod id so it can be filtered into the right
      // campaigns later.
      if (Array.isArray(characterData.mod_dependencies)) {
        stats = { ...stats, mod_dependencies: characterData.mod_dependencies };
      }

      // Apply-flow path: player is building a PC *for* a campaign.
      // Save into the characters table (not campaign_npcs) and stamp
      // mod_dependencies + campaign_origin from the campaign's
      // installed mods. The NPC branch below keeps the legacy GM
      // route working for /CharacterCreator?campaignId=… on its own.
      if (isApplyFlow && campaignId) {
        const [{ data: installed }, { data: campaignRow }] = await Promise.all([
          supabase
            .from('campaign_installed_mods')
            .select('mod_id')
            .eq('campaign_id', campaignId),
          supabase
            .from('campaigns')
            .select('title, name, system')
            .eq('id', campaignId)
            .maybeSingle(),
        ]);
        const modIds = (installed || []).map((m) => m.mod_id).filter(Boolean);
        // Merge by mod_id while keeping the {mod_id, mod_type, mod_name}
        // object shape every reader (RaceStep, ClassStep, modEngine,
        // CharacterLibrary, CampaignApplyFlow) expects. Pre-fix this
        // set-merged plain mod_id strings into an array of objects,
        // producing mixed-shape data that broke `d.mod_id` dot-access
        // downstream. mod_type defaults to 'unknown' for entries that
        // came in via campaign_installed_mods without further context;
        // entries already on stats from RaceStep/ClassStep keep their
        // full object shape.
        const priorDeps = Array.isArray(stats.mod_dependencies)
          ? stats.mod_dependencies.filter((d) => d && typeof d === 'object' && d.mod_id)
          : [];
        const seen = new Set(priorDeps.map((d) => d.mod_id));
        const campaignDeps = modIds
          .filter((id) => !seen.has(id))
          .map((id) => ({ mod_id: id, mod_type: 'unknown', mod_name: id }));
        const mergedDeps = [...priorDeps, ...campaignDeps];
        const campaignName = campaignRow?.title || campaignRow?.name || null;
        // required_mods is the flat list of mod_ids the character
        // depends on. Lobby-gate compat checks in #10b read this
        // directly (rather than walking mod_dependencies' rich
        // objects) for fast set-membership against
        // campaign_installed_mods. Derive from mergedDeps so the
        // two stay in sync.
        const requiredMods = Array.from(new Set(
          mergedDeps.map((d) => d?.mod_id).filter(Boolean)
        ));
        stats = {
          ...stats,
          mod_dependencies: mergedDeps,
          required_mods: requiredMods,
          campaign_origin: campaignName,
          is_campaign_copy: true,
        };

        // Mandatory edit-pass mode: the lobby's library picker
        // passed `edit=<libraryId>` so the wizard could pre-load
        // the library character's data into the form, but on save
        // we MUST clone — not update the library row — otherwise
        // the player's library original gets mutated by the
        // edits, defeating the clone-on-attach foundation from
        // #10a. Force CREATE with source_character_id pointing
        // back at the library row, and strip identity / session-
        // lock fields the spread might carry across.
        if (editIncompatibilities && editCharacterId) {
          const cloneStats = {
            ...stats,
            id: undefined,
            created_at: undefined,
            updated_at: undefined,
            last_played: null,
            active_session_id: null,
            source_character_id: editCharacterId,
          };
          return base44.entities.Character.create(cloneStats);
        }

        // Standard apply flow — Update if editing an existing
        // campaign character, Create otherwise. source_character_id
        // stays null because the player created from scratch and
        // there's no library original to point back at.
        return editCharacterId
          ? base44.entities.Character.update(editCharacterId, stats)
          : base44.entities.Character.create(stats);
      }

      if (campaignId && !editCharacterId) {
        // New NPC
        const npcPayload = npcPayloadFromStats(stats, {
          campaignId,
          avatarUrl: stats.profile_avatar_url || stats.avatar_url || null,
        });
        return base44.entities.CampaignNPC.create(npcPayload);
      } else if (campaignId && editCharacterId) {
        // Update NPC
        const npcPayload = npcPayloadFromStats(stats, {
          campaignId,
          avatarUrl: stats.profile_avatar_url || stats.avatar_url || null,
        });
        return base44.entities.CampaignNPC.update(editCharacterId, npcPayload);
      } else {
        // PC create/update
        return editCharacterId
          ? base44.entities.Character.update(editCharacterId, stats)
          : base44.entities.Character.create(stats);
      }
    },
    onSuccess: () => {
      if (campaignId) {
        // Apply-flow saves create rows in `characters` (with
        // is_campaign_copy=true). NPC saves create rows in
        // `campaign_npcs`. Invalidate BOTH query keys so whichever
        // one the next page reads has fresh data — most
        // importantly, ['campaignCharacters', campaignId] backs
        // the pre-lobby character gate in CampaignPanel
        // (10b-followup-1). Without this invalidation the gate's
        // 30s staleTime would let the cached library-only view
        // persist and players would see the picker again instead
        // of the lobby.
        queryClient.invalidateQueries({ queryKey: ['campaignNPCs', campaignId] });
        queryClient.invalidateQueries({ queryKey: ['campaignCharacters', campaignId] });
        toast.success(isApplyFlow ? "Character created!" : "NPC created successfully!");
        navigate(createPageUrl(returnTo || "CampaignNPCs") + `?id=${campaignId}`);
      } else {
        queryClient.invalidateQueries({ queryKey: ['allCharacters'] });
        toast.success(editCharacterId ? "Character updated successfully!" : "Character created successfully!");
        if (!editCharacterId && authUser?.id) {
          trackEvent(authUser.id, 'character_created', {
            method: mode || 'full',
            race: characterData.race,
            class: characterData.class,
            gender: characterData.gender,
          });
        }
        navigate(createPageUrl("CharacterLibrary"));
      }
    },
    onError: (err) => {
      console.error("Character save failed", err);
      toast.error(`Couldn't save character: ${err?.message || err}`);
    },
  });

  const updateCharacterData = (updates) => {
    setCharacterData(prev => ({ ...prev, ...updates }));
  };

  const validateStep = (stepIndex) => {
    const step = STEPS[stepIndex];

    // Wrap the per-step branch in a try / catch so a bug in a
    // completion helper can never crash the entire creator render —
    // the worst case is the Next button stays disabled and the
    // error is logged in dev. Without this guard, an exception in
    // (e.g.) getSpellsCompletion would propagate up through the
    // render and trip the page-level ErrorBoundary, replacing the
    // creator with "Something went wrong".
    try {
      return validateStepImpl(step);
    } catch (err) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error(`validateStep[${step?.id}] threw:`, err);
      }
      return false;
    }
  };

  const validateStepImpl = (step) => {
    switch (step.id) {
      case 'identity':
        // 2024 splits the legacy "race step" into species (this
        // step) + background (chosen later in AbilitiesStep2024
        // because the background grants the ASI). The gate here
        // therefore drops the background requirement for 2024
        // and validates the species selection instead — without
        // this branch, 2024 chars couldn't proceed past the
        // species step because background is empty until later.
        if (characterData.gamePack === 'dnd5e_2024') {
          return !!(characterData.name && characterData.species?.speciesId && characterData.alignment);
        }
        return characterData.name && characterData.race && characterData.background && characterData.alignment;
      case 'class':
        return !!characterData.class;
      case 'abilities':
        // Effective post-racial / post-ASI scores cap at 20 per RAW
        // (PHB p. 15). The base-score caps (rolled / point-buy /
        // standard array enforce 3-18 / 8-15 / fixed) live in
        // AbilityScoresStep itself; this validator only sanity-
        // checks the effective range so Mountain Dwarf STR 17 base
        // + 2 racial = 19, or post-ASI scores hitting 19/20, don't
        // get rejected at the gate.
        return Object.values(characterData.attributes).every(val => val >= 3 && val <= 20);
      case 'features':
        return true;
      case 'skills':
        // 2024 reads from its own SRD-driven completion helper —
        // background skills come from AbilitiesStep2024's selection,
        // class skill choice count from the 2024 class adapter, and
        // species "Skillful" trait grants a bonus pick. 2014 path
        // still uses the registry-driven helper that handles legacy
        // race / background / multiclass entries.
        return (characterData.gamePack === 'dnd5e_2024'
          ? getSkillsCompletion2024(characterData)
          : getSkillsCompletion(characterData)
        ).isComplete;
      case 'spells':
        if (characterData.gamePack === 'dnd5e_2024') {
          const cls = characterData.class;
          const lvl = Number(characterData.level) || 1;
          const tableEntry = getSpellsKnownEntry2024(cls);
          if (!tableEntry) return true; // non-caster
          const cantripsTarget = cantripsKnown2024(cls, lvl);
          const preparedTarget = spellsPrepared2024(cls, lvl);
          const wizardSpellbookSize = tableEntry.type === 'spellbook'
            ? (tableEntry.startingSpellbookSpells || 6)
              + Math.max(0, lvl - 1) * (tableEntry.spellsPerLevel || 2)
            : 0;
          const s = characterData.spells || {};
          const cantripsCount = Array.isArray(s.cantrips) ? s.cantrips.length : 0;
          const preparedCountSel = Array.isArray(s.prepared) ? s.prepared.length : 0;
          const spellbookCount = Array.isArray(s.spellbook) ? s.spellbook.length : 0;
          if (cantripsCount !== cantripsTarget) return false;
          if (preparedCountSel !== preparedTarget) return false;
          if (tableEntry.type === 'spellbook' && spellbookCount !== wizardSpellbookSize) return false;
          return true;
        }
        // 2014 path — share the spell-completion helper with
        // SpellsStep so the picker caps and the Next-button gate
        // can never drift apart. The previous validator compared
        // picks against per-level SLOTS (casts/day), which never
        // matched the picker's prepared/known/spellbook caps for
        // Bard / Cleric / Druid / Warlock / Wizard at L1, leaving
        // every prepared/known caster stuck on this step.
        return getSpellsCompletion(characterData).isComplete;
      case 'equipment':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const canProceed = validateStep(currentStep);

  // Human-readable hint shown by the new StepNav when canProceed is
  // false. Existing validateStep() returns boolean only; this mirrors
  // its branches and surfaces the first missing piece.
  const blockedReason = (() => {
    if (canProceed) return null;
    const step = STEPS[currentStep];
    switch (step?.id) {
      case 'identity':
        if (!characterData.name) return 'Name your character';
        if (!characterData.race && !characterData.species?.speciesId) return 'Pick a race';
        if (characterData.gamePack !== 'dnd5e_2024' && !characterData.background) return 'Pick a background';
        if (!characterData.alignment) return 'Pick an alignment';
        return 'Complete the identity fields';
      case 'class':
        if (!characterData.class) return 'Pick a class';
        return 'Pick a class';
      case 'abilities':
        return 'Set every ability score between 3 and 20';
      case 'skills':
        return 'Finish your skill picks';
      case 'spells':
        return 'Fill every available spell slot';
      default:
        return 'Complete this step to continue';
    }
  })();

  const handleNext = () => {
    if (!canProceed) {
      toast.error("Please complete all required fields");
      return;
    }
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (stepIndex) => {
    if (completedSteps.includes(stepIndex) || stepIndex < currentStep) {
      setCurrentStep(stepIndex);
    }
  };

const handleSubmit = () => {
    if (!characterData.name || !characterData.race || !characterData.class) {
      toast.error("Please fill in all required fields");
      return;
    }

    // RLS policy `users_manage_own_characters` rejects any INSERT
    // where user_id != auth.uid(). If useAuth hasn't hydrated yet
    // (cold app start, expired session), `user?.id` would be null,
    // we'd write user_id=null, and Supabase would return a generic
    // "security error" with no useful detail. Bail explicitly so
    // the player sees an actionable message instead.
    if (!user?.id) {
      toast.error("Sign in first — your session has expired.");
      return;
    }

    const stats = buildStatsFromCharacterData(characterData);
    stats.created_by = user?.email;
    stats.user_id = user?.id;
    // Persist the game pack the character was built against. The
    // dispatcher in this file (and downstream sheet display code)
    // routes per-step UI on this field; without it, a 2024
    // character would round-trip as 2014 on reload.
    stats.game_pack = characterData.gamePack || characterData.game_pack || 'dnd5e_2014';
    createMutation.mutate(stats);
  };

  const handleQuickCreateComplete = (generatedCharacter) => {
    setCharacterData(generatedCharacter);
    setCurrentStep(STEPS.length - 1);
    setCompletedSteps(STEPS.map((_, idx) => idx));
  };

  // Translate either a Quick Pick card or an AI Generate record
  // into the `characters` table shape, then run it through the
  // existing createMutation. We keep the full step-flow intact by
  // building a `stats` object (buildStatsFromCharacterData expects
  // the characterData shape) rather than bypassing it.
  const saveAiGenerated = async (generated) => {
    // Same RLS-bypass guard as handleSubmit. Without authUser?.id
    // populated, the INSERT would write user_id=null and be rejected
    // by the users_manage_own_characters policy.
    if (!authUser?.id) {
      toast.error("Sign in first — your session has expired.");
      return;
    }
    setAiSaving(true);
    try {
      const abilities = generated.ability_scores
        || generated.abilities
        || generated.stats?.ability_scores
        || {};
      const stats = {
        name: generated.name || 'Unnamed Hero',
        race: generated.race || '',
        subrace: generated.subrace || '',
        class: generated.class || '',
        subclass: generated.subclass || '',
        background: generated.background || '',
        level: Number(generated.level) || 1,
        alignment: generated.alignment || '',
        gender: generated.gender || '',
        age: generated.age || '',
        height: generated.height || '',
        weight: generated.weight || '',
        strength: Number(abilities.str ?? abilities.STR ?? abilities.strength ?? 10),
        dexterity: Number(abilities.dex ?? abilities.DEX ?? abilities.dexterity ?? 10),
        constitution: Number(abilities.con ?? abilities.CON ?? abilities.constitution ?? 10),
        intelligence: Number(abilities.int ?? abilities.INT ?? abilities.intelligence ?? 10),
        wisdom: Number(abilities.wis ?? abilities.WIS ?? abilities.wisdom ?? 10),
        charisma: Number(abilities.cha ?? abilities.CHA ?? abilities.charisma ?? 10),
        skill_proficiencies: Array.isArray(generated.skill_proficiencies)
          ? generated.skill_proficiencies
          : Array.isArray(generated.skills) ? generated.skills : [],
        saving_throws: Array.isArray(generated.saving_throw_proficiencies)
          ? generated.saving_throw_proficiencies
          : Array.isArray(generated.saving_throws) ? generated.saving_throws : [],
        languages: Array.isArray(generated.languages) ? generated.languages : [],
        spells: generated.spells || generated.spells_known || [],
        equipment: generated.equipment || [],
        backstory: generated.backstory || generated.story_hook || '',
        appearance: generated.appearance || '',
        personality: generated.personality || '',
        profile_avatar_url: generated.avatar_url || null,
        avatar_url: generated.avatar_url || null,
        bloodied_avatar_url: generated.bloodied_avatar_url || null,
      };
      // Default HP / AC if the AI didn't supply them — mirrors what
      // buildStatsFromCharacterData does inside the full flow.
      const conMod = Math.floor((stats.constitution - 10) / 2);
      const dexMod = Math.floor((stats.dexterity - 10) / 2);
      const hitDie = {
        Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
        Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
        Sorcerer: 6, Wizard: 6,
      }[stats.class] || 8;
      const maxHp = Number(generated.hit_points?.max ?? generated.max_hp ?? (hitDie + conMod));
      stats.hit_points = { current: maxHp, max: maxHp, temporary: 0 };
      stats.armor_class = Number(generated.armor_class ?? 10 + dexMod);

      // Ownership fields — RLS on the characters table blocks inserts
      // without these, which is why the AI save path used to silently
      // fail. user_id is the canonical UUID; created_by carries the
      // legacy email that every character-filter query across the app
      // keys off of, so both are required.
      stats.user_id = authUser?.id;
      stats.created_by = authUser?.email;

      createMutation.mutate(stats);
    } catch (err) {
      toast.error(err?.message || 'Failed to save character');
    } finally {
      setAiSaving(false);
    }
  };

  // Per-step game-pack dispatch. 2024 currently ships its own class
  // and class-features steps; other steps still use the legacy 2014
  // components until commits 4-5 of the bundle land. The dispatcher
  // is keyed off characterData.gamePack so a 2024 character
  // round-trips through the right per-step UI on every reopen.
  const _stepDef = STEPS[currentStep];
  const _is2024 = characterData.gamePack === 'dnd5e_2024';
  const CurrentStepComponent =
    _is2024 && _stepDef.id === 'identity' ? IdentityStep2024 :
    _is2024 && _stepDef.id === 'class' ? ClassStep2024 :
    _is2024 && _stepDef.id === 'abilities' ? AbilitiesStep2024 :
    _is2024 && _stepDef.id === 'features' ? ClassFeaturesStep2024 :
    _is2024 && _stepDef.id === 'skills' ? SkillsStep2024 :
    _is2024 && _stepDef.id === 'spells' ? SpellsStep2024 :
    _is2024 && _stepDef.id === 'review' ? ReviewStep2024 :
    _stepDef.component;

  // Mode selector — first screen before any creator steps render.
  // editCharacterId / campaignId flip us directly into 'full'
  // so this only shows for brand-new PCs.
  if (!mode) {
    return (
      <div className="min-h-screen relative p-6">
        <div
          className="fixed inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            animation: 'slowZoom 30s ease-in-out infinite alternate',
          }}
        />
        <div className="fixed inset-0 bg-[#1E2430]/85 backdrop-blur-sm" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-white">Character Creator</h1>
            <p className="text-white/60">Pick how you want to build your next hero.</p>
          </motion.div>
          <ModeSelector
            initialGamePack={characterData.gamePack}
            onSelect={({ mode: next, gamePack: pickedPack }) => {
              // Edits + NPCs bypass the limit (handled earlier).
              // For brand-new PCs, enforce the tier's character cap.
              const limit = sub.maxCharacters;
              if (Number.isFinite(limit) && existingCharacterCount >= limit) {
                toast.error(
                  `You've reached your ${limit} character limit. Upgrade to create more!`,
                );
                navigate(createPageUrl('Settings') + '?tab=subscription');
                return;
              }
              // Persist the player's game-pack choice onto
              // characterData so the rest of the creator (and the
              // save handler) sees it. Mirror to both shapes the
              // codebase reads.
              if (pickedPack) {
                setCharacterData((prev) => ({
                  ...prev,
                  gamePack: pickedPack,
                  game_pack: pickedPack,
                }));
              }
              setMode(next);
            }}
          />
        </div>
      </div>
    );
  }

  if (mode === 'quick') {
    return (
      <div className="min-h-screen relative p-6">
        <div
          className="fixed inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            animation: 'slowZoom 30s ease-in-out infinite alternate',
          }}
        />
        <div className="fixed inset-0 bg-[#1E2430]/85 backdrop-blur-sm" />
        <div className="relative z-10 py-4">
          <QuickPickFlow
            campaignId={campaignId}
            busy={aiSaving || createMutation.isPending}
            onBack={() => setMode(null)}
            onComplete={saveAiGenerated}
          />
        </div>
      </div>
    );
  }

  if (mode === 'ai') {
    return (
      <div className="min-h-screen relative p-6">
        <div
          className="fixed inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            animation: 'slowZoom 30s ease-in-out infinite alternate',
          }}
        />
        <div className="fixed inset-0 bg-[#1E2430]/85 backdrop-blur-sm" />
        <div className="relative z-10 py-4">
          <AIGenerateFlow
            campaignId={campaignId}
            busy={aiSaving || createMutation.isPending}
            onBack={() => setMode(null)}
            onComplete={saveAiGenerated}
          />
        </div>
      </div>
    );
  }

  // Pathfinder 2e — testing slot. The pack picker on the ModeSelector
  // surfaces this as an option for all players, but no
  // src/data/games/pathfinder_2e/ data module ships yet. Short-circuit
  // to a friendly "Coming soon" tome instead of routing the player
  // through the D&D step components (which would crash trying to
  // resolve PF2e classes / spells against an empty data adapter).
  if (mode === 'full' && characterData.gamePack === 'pathfinder_2e') {
    return (
      <div className="cc-root">
        <div className="backdrop" aria-hidden />
        <div className="class-aura" aria-hidden />
        <div className="relative z-10 max-w-3xl mx-auto p-6 pt-16">
          <div
            className="tome"
            style={{
              padding: '48px 36px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div style={{ fontSize: 56, opacity: 0.7 }}>⚔️</div>
            <h2
              className="display"
              style={{ fontSize: 38, color: 'var(--text)', lineHeight: 1.1 }}
            >
              Pathfinder 2e — coming soon
            </h2>
            <p
              className="italic-serif"
              style={{
                fontSize: 16,
                color: 'var(--text-dim)',
                maxWidth: 520,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              The Pathfinder picker is live so testers can verify the game-pack
              flow end-to-end. The actual species / class / spell / equipment
              data modules haven't landed yet — pick a D&D 5e pack to build
              a character today.
            </p>
            <button
              type="button"
              onClick={() => {
                setMode(null);
                setCharacterData((prev) => ({
                  ...prev,
                  gamePack: 'dnd5e_2014',
                  game_pack: 'dnd5e_2014',
                }));
              }}
              className="btn btn-primary"
              style={{ marginTop: 8 }}
            >
              ← Back to pack picker
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full-mode render — wrapped with the new chrome from Phase B.
  // Atmospheric backdrop replaces the random Supabase backgroundImage
  // that the mode selector / Quick / AI flows still use; those branches
  // above stay untouched. Step internals (CurrentStepComponent) render
  // unchanged inside the new frame — Phase C migrates each step.
  const isFinalStep = currentStep === STEPS.length - 1;
  const submitting = createMutation.isPending;
  const finalLabel = submitting
    ? (editCharacterId ? 'Updating...' : campaignId ? 'Creating NPC...' : 'Creating...')
    : incompatibilityGate
    ? `Resolve ${editIncompatibilityViolations.length} conflict${editIncompatibilityViolations.length === 1 ? '' : 's'}`
    : (editCharacterId ? 'Update Character' : campaignId ? 'Create NPC' : 'Create Character');
  const stepNavBlockedReason = incompatibilityGate
    ? 'Resolve banned-content conflicts above'
    : blockedReason;

  return (
    <div className="cc-root">
      <div className="backdrop" aria-hidden />
      <div className="class-aura" aria-hidden />
      <div className="class-arrival" id="class-arrival" aria-hidden />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1280, margin: '0 auto', padding: '32px 24px 80px' }}>
        <header style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1
            className="display"
            style={{
              fontSize: 52,
              color: 'white',
              lineHeight: 1,
              marginBottom: 6,
              letterSpacing: 1,
              textShadow: '0 4px 24px rgba(255, 83, 0, 0.25)',
            }}
          >
            {editCharacterId ? 'Edit Character' : campaignId ? 'Create NPC' : 'Character Creator'}
          </h1>
          <p style={{ color: 'var(--text-dim)', margin: 0, fontSize: 15 }}>
            {editCharacterId
              ? 'Modify your D&D 5e character'
              : campaignId
              ? 'Build your campaign NPC'
              : 'Build your D&D 5e hero — step by step, with help along the way.'}
          </p>
        </header>

        <Stepper
          current={currentStep}
          completed={completedSteps}
          onClick={handleStepClick}
        />

        <div key={currentStep} className="step-content" style={{ marginBottom: 6 }}>
          {editIncompatibilities && editIncompatibilityViolations.length > 0 && (
            <Alert className="mb-4 bg-amber-950/40 border-amber-700/60 text-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertTitle className="text-amber-100">Adjustments needed</AlertTitle>
              <AlertDescription className="text-amber-200/90">
                <p className="mb-2">
                  This character relies on content the campaign has banned. Edit the highlighted fields
                  to continue — the save button stays disabled until every conflict is resolved.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {editIncompatibilityViolations.map((conflict, i) => (
                    <li key={`${conflict.field}-${conflict.banned_name}-${i}`}>
                      <span className="font-semibold capitalize">{conflict.field}:</span>{' '}
                      <span className="font-mono">{conflict.banned_name}</span>
                      {conflict.reason ? <> — {conflict.reason}</> : ' is banned in this campaign'}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <CurrentStepComponent
            characterData={characterData}
            updateCharacterData={updateCharacterData}
            campaignId={campaignId}
          />
        </div>

        <StepNav
          onBack={handleBack}
          onNext={isFinalStep ? handleSubmit : handleNext}
          canBack={currentStep > 0}
          canNext={canProceed && !incompatibilityGate && !submitting}
          nextLabel={isFinalStep ? finalLabel : null}
          blockedReason={stepNavBlockedReason}
        />

        <footer
          style={{
            marginTop: 60,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-faint)',
            fontStyle: 'italic',
          }}
        >
          D&D 5e content adapted from the System Reference Document 5.1 (CC BY 4.0).
        </footer>
      </div>

      <QuickCreateDialog
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onCharacterCreated={handleQuickCreateComplete}
      />
    </div>
  );
}