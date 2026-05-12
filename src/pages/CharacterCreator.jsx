import { useAuth } from '@/lib/AuthContext';
import { useSubscription } from '@/lib/SubscriptionContext';
import { trackEvent } from '@/utils/analytics';
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { loadCampaignBans, findCharacterIncompatibilities } from "@/lib/campaignBans";
import { getSpellSlots, getPactSlots } from "@/components/dnd5e/spellData";
import { getSkillsCompletion } from "@/components/characterCreator/skillsCompletion";
import { getSkillsCompletion2024 } from "@/components/characterCreator/skillsCompletion2024";
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

import RaceStep from "@/components/characterCreator/RaceStep";
import SpeciesStep2024 from "@/components/characterCreator/SpeciesStep2024";
import ClassStep from "@/components/characterCreator/ClassStep";
import ClassStep2024 from "@/components/characterCreator/ClassStep2024";
import AbilityScoresStep from "@/components/characterCreator/AbilityScoresStep";
import AbilitiesStep2024 from "@/components/characterCreator/AbilitiesStep2024";
import ClassFeaturesStep from "@/components/characterCreator/ClassFeaturesStep";
import ClassFeaturesStep2024 from "@/components/characterCreator/ClassFeaturesStep2024";
import SkillsStep from "@/components/characterCreator/SkillsStep";
import SkillsStep2024 from "@/components/characterCreator/SkillsStep2024";
import SpellsStep from "@/components/characterCreator/SpellsStep";
import EquipmentStep from "@/components/characterCreator/EquipmentStep";
import ReviewStep from "@/components/characterCreator/ReviewStep";
import QuickCreateDialog from "@/components/characterCreator/QuickCreateDialog";
import ModeSelector from "@/components/characterCreator/ModeSelector";
import QuickPickFlow from "@/components/characterCreator/QuickPickFlow";
import AIGenerateFlow from "@/components/characterCreator/AIGenerateFlow";

const STEPS = [
  { id: 'race', label: 'Race', component: RaceStep },
  { id: 'class', label: 'Class', component: ClassStep },
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
    gamePack: "dnd5e_2014",
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
    
    switch (step.id) {
      case 'race':
        return characterData.name && characterData.race && characterData.background;
      case 'class':
        return characterData.class && characterData.alignment;
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
        const spellSlots = getSpellSlots(characterData.class, characterData.level, characterData.multiclasses || []);
        const pactSlots = getPactSlots(characterData.class, characterData.level, characterData.multiclasses || []);
        
        // Calculate total slots by level (standard + pact)
        const totalSlots = { ...spellSlots };
        if (pactSlots) {
          const key = `level${pactSlots.slotLevel}`;
          totalSlots[key] = (totalSlots[key] || 0) + pactSlots.slots;
        }

        // If no spell slots, step is valid
        if (Object.values(totalSlots).every(slots => slots === 0)) return true;
        
        // Check if all available slots are filled
        return Object.entries(totalSlots).every(([levelKey, slots]) => {
          if (slots === 0) return true;
          const selectedCount = (characterData.spells?.[levelKey] || []).length;
          return selectedCount === slots;
        });
      case 'equipment':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const canProceed = validateStep(currentStep);

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
    _is2024 && _stepDef.id === 'race' ? SpeciesStep2024 :
    _is2024 && _stepDef.id === 'class' ? ClassStep2024 :
    _is2024 && _stepDef.id === 'abilities' ? AbilitiesStep2024 :
    _is2024 && _stepDef.id === 'features' ? ClassFeaturesStep2024 :
    _is2024 && _stepDef.id === 'skills' ? SkillsStep2024 :
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
          <ModeSelector onSelect={(next) => {
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
            setMode(next);
          }} />
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

  return (
    <div className="min-h-screen relative p-6">
      <div 
        className="fixed inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${backgroundImage})`,
          animation: 'slowZoom 30s ease-in-out infinite alternate'
        }}
      />
      
      <div className="fixed inset-0 bg-[#1E2430]/85 backdrop-blur-sm" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-4xl font-bold text-white">
              {editCharacterId ? 'Edit Character' : campaignId ? 'Create NPC' : 'Character Creator'}
            </h1>
            {!editCharacterId && (
              <Button
                onClick={() => toast("Coming in 1.0 — use Full Creator for now.")}
                disabled
                title="Coming in 1.0 — use Full Creator for now"
                className="bg-transparent border-2 border-dashed border-slate-600 text-slate-400 font-bold cursor-not-allowed hover:bg-transparent disabled:opacity-100"
              >
                <Zap className="w-4 h-4 mr-2" />
                Quick Create — Coming in 1.0
              </Button>
            )}
          </div>
          <p className="text-white/60">
            {editCharacterId ? 'Modify your D&D 5e character' : campaignId ? 'Build your campaign NPC' : 'Build your D&D 5e character'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 bg-[#1E2430]/60 backdrop-blur-sm rounded-2xl p-4 border border-[#2A3441]"
        >
          <div className="flex justify-between mb-3">
            {STEPS.map((step, index) => {
              const isCompleted = completedSteps.includes(index) || index < currentStep;
              const isClickable = isCompleted || editCharacterId; // Allow clicking on any step in edit mode if already visited
              const isActive = index === currentStep;
              
              return (
                <div
                  key={step.id}
                  className="flex-1 text-center"
                >
                  <motion.div
                    onClick={() => isClickable && handleStepClick(index)}
                    whileHover={isClickable ? { scale: 1.05 } : {}}
                    whileTap={isClickable ? { scale: 0.95 } : {}}
                    className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-bold transition-all ${
                      isActive 
                        ? 'bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/50' 
                        : index < currentStep
                        ? 'bg-[#37F2D1] text-[#1E2430]'
                        : 'bg-[#2A3441] text-white/40'
                    } ${isClickable ? 'cursor-pointer hover:shadow-lg' : ''}`}
                  >
                    {index + 1}
                  </motion.div>
                  <span className={`text-xs font-semibold ${isActive ? 'text-[#FF5722]' : index < currentStep ? 'text-[#37F2D1]' : 'text-white/40'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-1.5 bg-[#2A3441] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#FF5722] to-[#37F2D1]"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
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
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between"
        >
          <Button
            onClick={handleBack}
            disabled={currentStep === 0}
            variant="outline"
            className="bg-[#2A3441]/80 border-[#37F2D1]/30 hover:bg-[#2A3441] hover:border-[#37F2D1] hover:text-[#37F2D1] text-white disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep === STEPS.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || !canProceed || incompatibilityGate}
              title={
                incompatibilityGate
                  ? 'Resolve every banned-content conflict above before saving'
                  : undefined
              }
              className="bg-gradient-to-r from-[#FF5722] to-[#FF6B3D] hover:from-[#FF6B3D] hover:to-[#FF5722] text-white disabled:opacity-50 shadow-lg shadow-[#FF5722]/30"
            >
              {createMutation.isPending
                ? (editCharacterId ? 'Updating...' : campaignId ? 'Creating NPC...' : 'Creating...')
                : incompatibilityGate
                ? `Resolve ${editIncompatibilityViolations.length} conflict${editIncompatibilityViolations.length === 1 ? '' : 's'}`
                : (editCharacterId ? 'Update Character' : campaignId ? 'Create NPC' : 'Create Character')
              }
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="bg-gradient-to-r from-[#FF5722] to-[#FF6B3D] hover:from-[#FF6B3D] hover:to-[#FF5722] text-white disabled:opacity-50 shadow-lg shadow-[#FF5722]/30"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </motion.div>
      </div>

      <QuickCreateDialog
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onCharacterCreated={handleQuickCreateComplete}
      />

      <style>{`
        @keyframes slowZoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}