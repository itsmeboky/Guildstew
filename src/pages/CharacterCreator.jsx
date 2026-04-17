import { useAuth } from '@/lib/AuthContext';
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { toast } from "sonner";
import { getSpellSlots, getPactSlots } from "@/components/dnd5e/spellData";
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
import ClassStep from "@/components/characterCreator/ClassStep";
import AbilityScoresStep from "@/components/characterCreator/AbilityScoresStep";
import ClassFeaturesStep from "@/components/characterCreator/ClassFeaturesStep";
import SkillsStep from "@/components/characterCreator/SkillsStep";
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

const BACKGROUND_GIFS = [
  'https://i.imgur.com/R7iho4v.gif',
  'https://i.imgur.com/TDqaFe2.gif',
  'https://i.imgur.com/GMYKSnu.gif',
  'https://i.imgur.com/VYI8Dqf.gif',
  'https://i.imgur.com/2Ux58y5.gif',
  'https://i.imgur.com/9objTJy.gif',
  'https://i.imgur.com/rr91mop.gif',
  'https://i.imgur.com/O5bstqD.gif'
];

const classSkillCounts = {
  Barbarian: 2, Bard: 3, Cleric: 2, Druid: 2, Fighter: 2, Monk: 2,
  Paladin: 2, Ranger: 3, Rogue: 4, Sorcerer: 2, Warlock: 2, Wizard: 2
};

// Helper function to get skills provided by a background
const getBackgroundSkills = (background) => {
  const backgroundSkillMap = {
    "Acolyte": ["Insight", "Religion"],
    "Charlatan": ["Deception", "Sleight of Hand"],
    "Criminal": ["Deception", "Stealth"],
    "Entertainer": ["Acrobatics", "Performance"],
    "Folk Hero": ["Animal Handling", "Survival"],
    "Guild Artisan": ["Insight", "Persuasion"],
    "Hermit": ["Medicine", "Religion"],
    "Noble": ["History", "Persuasion"],
    "Outlander": ["Athletics", "Survival"],
    "Sage": ["Arcana", "History"],
    "Sailor": ["Athletics", "Perception"],
    "Soldier": ["Athletics", "Intimidation"],
    "Urchin": ["Sleight of Hand", "Stealth"],
    // Add other backgrounds as needed
  };
  return backgroundSkillMap[background] || [];
};

export default function CharacterCreator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const editCharacterId = urlParams.get('edit');
  const campaignId = urlParams.get('campaignId');
  const returnTo = urlParams.get('returnTo');
  
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
    race: "",
    subrace: "",
    class: "",
    subclass: "",
    background: "",
    alignment: "True Neutral",
    level: 1,
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
    expertise: [], // Added for passive perception calculation
  });

  const previousClassRef = useRef(characterData.class);

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
        // Editing a PC: existing logic
        setCharacterData(prev => ({
          ...prev,
          ...existingCharacter,
          attributes: existingCharacter.attributes || prev.attributes,
          skills: existingCharacter.skills || prev.skills,
          spells: existingCharacter.spells || prev.spells,
          saving_throws: existingCharacter.saving_throws || prev.saving_throws,
          proficiencies: existingCharacter.proficiencies || prev.proficiencies,
          languages: existingCharacter.languages || prev.languages,
          features: existingCharacter.features || prev.features,
          feature_choices: existingCharacter.feature_choices || prev.feature_choices,
          multiclasses: existingCharacter.multiclasses || prev.multiclasses,
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
    mutationFn: (stats) => {
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
        queryClient.invalidateQueries({ queryKey: ['campaignNPCs', campaignId] });
        toast.success("NPC created successfully!");
        navigate(createPageUrl(returnTo || "CampaignNPCs") + `?id=${campaignId}`);
      } else {
        queryClient.invalidateQueries({ queryKey: ['allCharacters'] });
        toast.success(editCharacterId ? "Character updated successfully!" : "Character created successfully!");
        navigate(createPageUrl("CharacterLibrary"));
      }
    }
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
        return Object.values(characterData.attributes).every(val => val >= 3 && val <= 18);
      case 'features':
        return true;
      case 'skills':
        const primarySkillCount = classSkillCounts[characterData.class] || 2;
        const multiclassSkillCount = (characterData.multiclasses || []).filter(mc => mc.class).length;
        const racialBonusSkills = 
          characterData.race === "Half-Elf" ? 2 : 
          characterData.race === "Human" ? 1 : 
          0;
        const totalRequired = primarySkillCount + multiclassSkillCount + racialBonusSkills;
        
        // Get background skills (these don't count toward the total for selection)
        const backgroundSkillsFromData = characterData.background ? getBackgroundSkills(characterData.background) : [];
        const selectedSkillsList = Object.entries(characterData.skills || {}).filter(([_, selected]) => selected).map(([skill]) => skill);
        
        // Filter out skills that are granted by the background, as these are not "chosen" skills.
        const nonBackgroundSkills = selectedSkillsList.filter(skill => !backgroundSkillsFromData.includes(skill));
        
        return nonBackgroundSkills.length === totalRequired;
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

      createMutation.mutate(stats);
    } catch (err) {
      toast.error(err?.message || 'Failed to save character');
    } finally {
      setAiSaving(false);
    }
  };

  const CurrentStepComponent = STEPS[currentStep].component;

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
          <ModeSelector onSelect={setMode} />
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
                onClick={() => setQuickCreateOpen(true)}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-bold"
              >
                <Zap className="w-4 h-4 mr-2" />
                Quick Create
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
            <CurrentStepComponent
              characterData={characterData}
              updateCharacterData={updateCharacterData}
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
              disabled={createMutation.isPending || !canProceed}
              className="bg-gradient-to-r from-[#FF5722] to-[#FF6B3D] hover:from-[#FF6B3D] hover:to-[#FF5722] text-white disabled:opacity-50 shadow-lg shadow-[#FF5722]/30"
            >
              {createMutation.isPending 
                ? (editCharacterId ? 'Updating...' : campaignId ? 'Creating NPC...' : 'Creating...') 
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