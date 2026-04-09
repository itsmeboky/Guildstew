import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { getLanguagesForCharacter } from "@/components/dnd5e/backgroundData";
import { 
  calculateMaxHP, 
  calculateAC, 
  calculateProficiencyBonus, 
  calculatePassivePerception,
  getSpeed,
  calculateAbilityModifier
} from "@/components/dnd5e/characterCalculations";

const races = ["Dragonborn", "Elf", "Dwarf", "Human", "Halfling", "Tiefling", "Half-Elf", "Half-Orc", "Gnome"];
const classes = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard"];
const backgrounds = ["Acolyte", "Charlatan", "Criminal", "Entertainer", "Folk Hero", "Guild Artisan", "Hermit", "Noble", "Outlander", "Sage", "Sailor", "Soldier", "Urchin"];

// Standard array: 15, 14, 13, 12, 10, 8
const getOptimalStatsForClass = (className) => {
  const statPriorities = {
    "Barbarian": { str: 15, con: 14, dex: 13, wis: 12, cha: 10, int: 8 },
    "Bard": { cha: 15, dex: 14, con: 13, wis: 12, int: 10, str: 8 },
    "Cleric": { wis: 15, con: 14, str: 13, dex: 12, cha: 10, int: 8 },
    "Druid": { wis: 15, con: 14, dex: 13, int: 12, cha: 10, str: 8 },
    "Fighter": { str: 15, con: 14, dex: 13, wis: 12, cha: 10, int: 8 },
    "Monk": { dex: 15, wis: 14, con: 13, str: 12, cha: 10, int: 8 },
    "Paladin": { str: 15, cha: 14, con: 13, wis: 12, dex: 10, int: 8 },
    "Ranger": { dex: 15, wis: 14, con: 13, str: 12, int: 10, cha: 8 },
    "Rogue": { dex: 15, con: 14, int: 13, cha: 12, wis: 10, str: 8 },
    "Sorcerer": { cha: 15, con: 14, dex: 13, wis: 12, int: 10, str: 8 },
    "Warlock": { cha: 15, con: 14, dex: 13, wis: 12, int: 10, str: 8 },
    "Wizard": { int: 15, dex: 14, con: 13, wis: 12, cha: 10, str: 8 }
  };
  return statPriorities[className] || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
};

export default function QuickCreateDialog({ open, onClose, onCharacterCreated }) {
  const [mode, setMode] = useState('initial'); // initial, quick, ai, dating, finalize
  const [generating, setGenerating] = useState(false);
  
  // Quick pick state
  const [selectedRace, setSelectedRace] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedBackground, setSelectedBackground] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("1");
  
  // Dating profile state
  const [generatedCharacters, setGeneratedCharacters] = useState([]);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [acceptedCharacter, setAcceptedCharacter] = useState(null);
  
  // AI generate state
  const [description, setDescription] = useState("");

  const handleQuickPick = async () => {
    if (!selectedRace || !selectedClass || !selectedBackground) {
      toast.error("Please fill in all fields");
      return;
    }

    setGenerating(true);
    try {
      // Generate 9 character options (3 female, 3 male, 3 non-binary)
      const prompt = `Generate 9 different D&D character names and short dating-app-style bios for:
Race: ${selectedRace}
Class: ${selectedClass}
Background: ${selectedBackground}

Create exactly 3 female characters, 3 male characters, and 3 non-binary characters.

Each character should have:
- A fitting name for their gender and race
- A 2-3 sentence bio written in first person, fun and engaging like a dating profile
- One key personality trait
- One major character flaw (be specific and interesting)

Be creative and make each character distinct from the others.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            characters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  gender: { type: "string" },
                  pronouns: { type: "string" },
                  bio: { type: "string" },
                  personality_trait: { type: "string" },
                  flaw: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Generate images for each character
      const charactersWithImages = await Promise.all(
        result.characters.map(async (char) => {
          try {
            const imagePrompt = `Portrait of a ${selectedRace} ${selectedClass} named ${char.name}. ${char.bio}. Fantasy art style, detailed character portrait, D&D character.`;
            const imageResult = await base44.integrations.Core.GenerateImage({ prompt: imagePrompt });
            return {
              ...char,
              race: selectedRace,
              class: selectedClass,
              background: selectedBackground,
              avatar_url: imageResult.url
            };
          } catch (error) {
            console.error("Failed to generate image for character:", error);
            return {
              ...char,
              race: selectedRace,
              class: selectedClass,
              background: selectedBackground,
              avatar_url: null
            };
          }
        })
      );

      setGeneratedCharacters(charactersWithImages);
      setCurrentCharIndex(0);
      setMode('dating');
    } catch (error) {
      toast.error("Failed to generate characters. Please try again.");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAcceptCharacter = () => {
    const char = generatedCharacters[currentCharIndex];
    setAcceptedCharacter(char);
    setMode('finalize');
  };

  const handleRejectCharacter = () => {
    if (currentCharIndex < generatedCharacters.length - 1) {
      setCurrentCharIndex(currentCharIndex + 1);
    } else {
      toast.error("No more characters. Please try different options.");
      setMode('quick');
      setGeneratedCharacters([]);
      setCurrentCharIndex(0);
    }
  };

  const handleLetAIPick = () => {
    const char = acceptedCharacter;
    const optimalAttributes = getOptimalStatsForClass(char.class);
    const level = parseInt(selectedLevel);
    const proficiencyBonus = calculateProficiencyBonus(level);
    const maxHP = calculateMaxHP(char.class, level, optimalAttributes.con);

    const character = {
      name: char.name,
      race: char.race,
      class: char.class,
      background: char.background,
      level: level,
      alignment: "True Neutral",
      attributes: optimalAttributes,
      skills: {},
      spells: { cantrips: [], level1: [] },
      proficiency_bonus: proficiencyBonus,
      hit_points: { max: maxHP, current: maxHP, temporary: 0 },
      armor_class: calculateAC(optimalAttributes.dex),
      initiative: calculateAbilityModifier(optimalAttributes.dex),
      speed: getSpeed(char.race),
      passive_perception: 10,
      languages: getLanguagesForCharacter(char.race, char.background),
      description: char.bio,
      profile_avatar_url: char.avatar_url
    };

    onCharacterCreated(character);
    handleClose();
  };

  const handleEditInCreator = () => {
    const char = acceptedCharacter;
    const optimalAttributes = getOptimalStatsForClass(char.class);
    const level = parseInt(selectedLevel);
    const proficiencyBonus = calculateProficiencyBonus(level);
    const maxHP = calculateMaxHP(char.class, level, optimalAttributes.con);

    const character = {
      name: char.name,
      race: char.race,
      class: char.class,
      background: char.background,
      level: level,
      alignment: "True Neutral",
      attributes: optimalAttributes,
      skills: {},
      spells: { cantrips: [], level1: [] },
      proficiency_bonus: proficiencyBonus,
      hit_points: { max: maxHP, current: maxHP, temporary: 0 },
      armor_class: calculateAC(optimalAttributes.dex),
      initiative: calculateAbilityModifier(optimalAttributes.dex),
      speed: getSpeed(char.race),
      passive_perception: 10,
      languages: getLanguagesForCharacter(char.race, char.background),
      description: char.bio,
      profile_avatar_url: char.avatar_url
    };

    onCharacterCreated(character);
    // Don't close - let the parent component handle navigation to character creator
  };

  const handleAIGenerate = async () => {
    if (!description.trim()) {
      toast.error("Please provide a character description");
      return;
    }

    setGenerating(true);
    try {
      const level = parseInt(selectedLevel);
      const prompt = `Create a D&D 5e level ${level} character based on: "${description}"

Available races: ${races.join(', ')}
Available classes: ${classes.join(', ')}
Available backgrounds: ${backgrounds.join(', ')}

Generate a character with:
- Name, race, class, background, alignment
- A backstory (2-3 sentences)
- Physical appearance details (age, height, weight, hair, eyes, skin)

Keep it simple and valid.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            character_name: { type: "string", description: "The character's name" },
            character_race: { type: "string", description: "The character's race" },
            character_class: { type: "string", description: "The character's class" },
            character_background: { type: "string", description: "The character's background" },
            character_alignment: { type: "string", description: "The character's alignment" },
            character_description: { type: "string", description: "A 2-3 sentence backstory" },
            character_appearance: { 
              type: "object",
              description: "Physical appearance details",
              properties: {
                age: { type: "number" },
                height: { type: "string" },
                weight: { type: "string" },
                hair: { type: "string" },
                eyes: { type: "string" },
                skin: { type: "string" }
              }
            }
          },
          required: ["character_name", "character_race", "character_class", "character_background", "character_alignment"]
        }
      });

      // Map the result to expected format
      const charName = result.character_name || result.name;
      const charRace = result.character_race || result.race;
      const charClass = result.character_class || result.class;
      const charBackground = result.character_background || result.background;
      const charAlignment = result.character_alignment || result.alignment;
      const charDescription = result.character_description || result.description || "";
      const charAppearance = result.character_appearance || result.appearance || {};

      // Use optimal stats for class (standard array)
      const optimalAttributes = getOptimalStatsForClass(charClass);
      const proficiencyBonus = calculateProficiencyBonus(level);
      const maxHP = calculateMaxHP(charClass, level, optimalAttributes.con);
      const ac = calculateAC(optimalAttributes.dex);
      const initiative = calculateAbilityModifier(optimalAttributes.dex);
      const speed = getSpeed(charRace);

      // Get class skills - assign proficiencies based on class
      const classSkills = {
        "Barbarian": ["Athletics", "Intimidation"],
        "Bard": ["Acrobatics", "Performance", "Persuasion"],
        "Cleric": ["Insight", "Religion"],
        "Druid": ["Animal Handling", "Nature"],
        "Fighter": ["Athletics", "Intimidation"],
        "Monk": ["Acrobatics", "Stealth"],
        "Paladin": ["Athletics", "Intimidation"],
        "Ranger": ["Animal Handling", "Nature", "Survival"],
        "Rogue": ["Acrobatics", "Deception", "Sleight of Hand", "Stealth"],
        "Sorcerer": ["Deception", "Intimidation"],
        "Warlock": ["Arcana", "Deception"],
        "Wizard": ["Arcana", "History"]
      };

      const skills = {};
      const assignedSkills = classSkills[charClass] || ["Athletics", "Perception"];
      assignedSkills.forEach(skill => { skills[skill] = true; });

      // Get basic equipment based on class
      const classEquipment = {
        "Barbarian": { weapons: [{ name: "Greataxe", damage: "1d12 slashing" }], armor: {} },
        "Bard": { weapons: [{ name: "Rapier", damage: "1d8 piercing" }], armor: { name: "Leather Armor", ac_bonus: 11 } },
        "Cleric": { weapons: [{ name: "Mace", damage: "1d6 bludgeoning" }], armor: { name: "Scale Mail", ac_bonus: 14 } },
        "Druid": { weapons: [{ name: "Quarterstaff", damage: "1d6 bludgeoning" }], armor: { name: "Leather Armor", ac_bonus: 11 } },
        "Fighter": { weapons: [{ name: "Longsword", damage: "1d8 slashing" }], armor: { name: "Chain Mail", ac_bonus: 16 } },
        "Monk": { weapons: [{ name: "Quarterstaff", damage: "1d6 bludgeoning" }], armor: {} },
        "Paladin": { weapons: [{ name: "Longsword", damage: "1d8 slashing" }], armor: { name: "Chain Mail", ac_bonus: 16 } },
        "Ranger": { weapons: [{ name: "Longbow", damage: "1d8 piercing" }], armor: { name: "Leather Armor", ac_bonus: 11 } },
        "Rogue": { weapons: [{ name: "Shortsword", damage: "1d6 piercing" }], armor: { name: "Leather Armor", ac_bonus: 11 } },
        "Sorcerer": { weapons: [{ name: "Dagger", damage: "1d4 piercing" }], armor: {} },
        "Warlock": { weapons: [{ name: "Dagger", damage: "1d4 piercing" }], armor: { name: "Leather Armor", ac_bonus: 11 } },
        "Wizard": { weapons: [{ name: "Quarterstaff", damage: "1d6 bludgeoning" }], armor: {} }
      };

      const equipment = classEquipment[charClass] || { weapons: [], armor: {} };
      const inventory = [
        { name: "Backpack", quantity: 1 },
        { name: "Bedroll", quantity: 1 },
        { name: "Rations (1 day)", quantity: 10 },
        { name: "Waterskin", quantity: 1 },
        { name: "Rope (50 ft)", quantity: 1 }
      ];

      // Get class features
      const classFeatures = {
        "Barbarian": [{ name: "Rage", description: "In battle, you can enter a rage as a bonus action.", source: "Barbarian" }],
        "Bard": [{ name: "Bardic Inspiration", description: "You can inspire others through stirring words or music.", source: "Bard" }],
        "Cleric": [{ name: "Divine Domain", description: "Choose a domain related to your deity.", source: "Cleric" }],
        "Druid": [{ name: "Druidic", description: "You know Druidic, the secret language of druids.", source: "Druid" }],
        "Fighter": [{ name: "Second Wind", description: "You can use a bonus action to regain hit points.", source: "Fighter" }],
        "Monk": [{ name: "Martial Arts", description: "Your practice of martial arts gives you mastery of combat styles.", source: "Monk" }],
        "Paladin": [{ name: "Divine Sense", description: "You can detect the presence of celestials, fiends, or undead.", source: "Paladin" }],
        "Ranger": [{ name: "Favored Enemy", description: "You have significant experience dealing with one type of creature.", source: "Ranger" }],
        "Rogue": [{ name: "Sneak Attack", description: "You know how to strike subtly and exploit a foe's distraction.", source: "Rogue" }],
        "Sorcerer": [{ name: "Sorcerous Origin", description: "Choose a sorcerous origin that describes the source of your innate magical power.", source: "Sorcerer" }],
        "Warlock": [{ name: "Otherworldly Patron", description: "You have made a pact with an otherworldly being.", source: "Warlock" }],
        "Wizard": [{ name: "Arcane Recovery", description: "You can regain some of your magical energy by studying your spellbook.", source: "Wizard" }]
      };

      const features = classFeatures[charClass] || [];

      const perceptionMod = calculateAbilityModifier(optimalAttributes.wis);
      const isPerceptionProficient = skills["Perception"] || false;
      
      let passivePerception = 10 + perceptionMod;
      if (isPerceptionProficient) {
        passivePerception += proficiencyBonus;
      }

      const finalCharacter = {
        name: charName,
        race: charRace,
        subrace: "",
        class: charClass,
        subclass: "",
        background: charBackground,
        alignment: charAlignment,
        level: level,
        attributes: optimalAttributes,
        skills: skills,
        expertise: [],
        spells: { cantrips: [], level1: [] },
        languages: getLanguagesForCharacter(charRace, charBackground),
        feature_choices: {},
        equipment: equipment,
        inventory: inventory,
        personality: { traits: [], ideals: "", bonds: "", flaws: "" },
        description: charDescription,
        companion_name: "",
        companion_background: "",
        appearance: charAppearance,
        proficiency_bonus: proficiencyBonus,
        hit_points: { max: maxHP, current: maxHP, temporary: 0 },
        armor_class: ac,
        initiative: initiative,
        speed: speed,
        passive_perception: passivePerception,
        features: features,
        saving_throws: {},
        proficiencies: { armor: [], weapons: [], tools: [] }
      };

      onCharacterCreated(finalCharacter);
      handleClose();
      toast.success("Character created with AI!");
    } catch (error) {
      console.error("AI Generation Error:", error);
      const errorMessage = error?.message || "Unknown error";
      toast.error(`Failed to generate: ${errorMessage}. Try Quick Pick instead.`);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setMode('initial');
    setSelectedRace("");
    setSelectedClass("");
    setSelectedBackground("");
    setDescription("");
    setGeneratedCharacters([]);
    setCurrentCharIndex(0);
    setAcceptedCharacter(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1E2430] border-[#2A3441] max-w-2xl">
        <AnimatePresence mode="wait">
          {mode === 'initial' && (
            <motion.div
              key="initial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Quick Create</h2>
                <p className="text-white/60">Choose how you want to create your character</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('quick')}
                  className="bg-[#2A3441] hover:bg-[#2A3441]/80 rounded-xl p-6 border-2 border-[#37F2D1]/30 hover:border-[#37F2D1] transition-all text-left"
                >
                  <div className="text-3xl mb-3">⚡</div>
                  <h3 className="text-xl font-bold text-white mb-2">Quick Pick</h3>
                  <p className="text-white/60 text-sm">Choose race, class, and background manually</p>
                </button>

                <button
                  onClick={() => setMode('ai')}
                  className="bg-[#2A3441] hover:bg-[#2A3441]/80 rounded-xl p-6 border-2 border-[#FF5722]/30 hover:border-[#FF5722] transition-all text-left"
                >
                  <div className="text-3xl mb-3">✨</div>
                  <h3 className="text-xl font-bold text-white mb-2">AI Generate</h3>
                  <p className="text-white/60 text-sm">Describe your character and let AI create everything</p>
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'quick' && (
            <motion.div
              key="quick"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Button
                onClick={() => setMode('initial')}
                variant="ghost"
                className="text-white/60 hover:text-white mb-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <h2 className="text-2xl font-bold text-white">Quick Pick Character</h2>

              <div className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block">Race</Label>
                  <Select value={selectedRace} onValueChange={setSelectedRace}>
                    <SelectTrigger className="bg-[#2A3441] border-[#37F2D1]/20 text-white">
                      <SelectValue placeholder="Select race" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E2430] border-[#2A3441]">
                      {races.map(race => (
                        <SelectItem key={race} value={race} className="text-white hover:bg-[#2A3441]">
                          {race}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white mb-2 block">Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="bg-[#2A3441] border-[#37F2D1]/20 text-white">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E2430] border-[#2A3441]">
                      {classes.map(cls => (
                        <SelectItem key={cls} value={cls} className="text-white hover:bg-[#2A3441]">
                          {cls}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                <Label className="text-white mb-2 block">Background</Label>
                <Select value={selectedBackground} onValueChange={setSelectedBackground}>
                  <SelectTrigger className="bg-[#2A3441] border-[#37F2D1]/20 text-white">
                    <SelectValue placeholder="Select background" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E2430] border-[#2A3441]">
                    {backgrounds.map(bg => (
                      <SelectItem key={bg} value={bg} className="text-white hover:bg-[#2A3441]">
                        {bg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>

                <div>
                <Label className="text-white mb-2 block">Level</Label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger className="bg-[#2A3441] border-[#37F2D1]/20 text-white">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E2430] border-[#2A3441] max-h-60">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(lvl => (
                      <SelectItem key={lvl} value={lvl.toString()} className="text-white hover:bg-[#2A3441]">
                        Level {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>

                <Button
                  onClick={handleQuickPick}
                  disabled={generating || !selectedRace || !selectedClass || !selectedBackground}
                  className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-bold"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Create Character'
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {mode === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Button
                onClick={() => setMode('initial')}
                variant="ghost"
                className="text-white/60 hover:text-white mb-2"
                disabled={generating}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#FF5722]" />
                AI Character Generator
              </h2>

              <p className="text-white/60 text-sm">
                Describe your character concept and AI will create a complete character with all choices made including subclass, spells, skills, equipment, and even companions!
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white mb-2 block">Target Level</Label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger className="bg-[#2A3441] border-[#FF5722]/20 text-white">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E2430] border-[#2A3441] max-h-60">
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(lvl => (
                        <SelectItem key={lvl} value={lvl.toString()} className="text-white hover:bg-[#2A3441]">
                          Level {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: A wise elven cleric who serves the goddess of life and travels the land healing the sick. She has a gentle demeanor but is fierce in battle..."
                className="bg-[#2A3441] border-[#FF5722]/20 text-white min-h-32"
                disabled={generating}
              />

              <Button
                onClick={handleAIGenerate}
                disabled={generating || !description.trim()}
                className="w-full bg-gradient-to-r from-[#FF5722] to-[#FF6B3D] hover:from-[#FF6B3D] hover:to-[#FF5722] text-white font-bold"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Character
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {mode === 'dating' && generatedCharacters.length > 0 && (
            <motion.div
              key="dating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white mb-1">Meet Your Character</h2>
                <p className="text-white/60 text-sm">{currentCharIndex + 1} of {generatedCharacters.length}</p>
              </div>

              <div className="bg-gradient-to-br from-[#2A3441] to-[#1E2430] rounded-2xl p-8 border-2 border-[#37F2D1]/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#37F2D1]/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#FF5722]/10 rounded-full blur-3xl" />
                
                <div className="relative z-10 space-y-4">
                  {generatedCharacters[currentCharIndex].avatar_url && (
                    <div className="flex justify-center mb-4">
                      <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-[#37F2D1]/50 shadow-2xl">
                        <img 
                          src={generatedCharacters[currentCharIndex].avatar_url} 
                          alt={generatedCharacters[currentCharIndex].name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h3 className="text-4xl font-bold text-white mb-2">
                      {generatedCharacters[currentCharIndex].name}
                    </h3>
                    {generatedCharacters[currentCharIndex].pronouns && (
                      <div className="text-white/60 text-sm mb-3">
                        {generatedCharacters[currentCharIndex].pronouns}
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 text-[#37F2D1] mb-4">
                      <span className="font-semibold">{generatedCharacters[currentCharIndex].race}</span>
                      <span>•</span>
                      <span className="font-semibold">{generatedCharacters[currentCharIndex].class}</span>
                    </div>
                    <div className="inline-block bg-[#FF5722]/20 text-[#FF5722] px-4 py-1 rounded-full text-sm">
                      {generatedCharacters[currentCharIndex].background}
                    </div>
                  </div>

                  <div className="bg-[#1E2430]/50 rounded-xl p-6 backdrop-blur-sm">
                    <p className="text-white/90 text-lg leading-relaxed italic">
                      "{generatedCharacters[currentCharIndex].bio}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    {generatedCharacters[currentCharIndex].personality_trait && (
                      <div>
                        <span className="text-white/60 text-sm block mb-1">Personality:</span>
                        <span className="text-[#37F2D1] font-semibold text-sm">
                          {generatedCharacters[currentCharIndex].personality_trait}
                        </span>
                      </div>
                    )}
                    {generatedCharacters[currentCharIndex].flaw && (
                      <div>
                        <span className="text-white/60 text-sm block mb-1">Flaw:</span>
                        <span className="text-red-400 font-semibold text-sm">
                          {generatedCharacters[currentCharIndex].flaw}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <Button
                  onClick={handleRejectCharacter}
                  className="bg-red-600 hover:bg-red-700 text-white text-lg py-6 font-bold border-0"
                >
                  ✕ Pass
                </Button>
                <Button
                  onClick={handleAcceptCharacter}
                  className="bg-gradient-to-r from-[#37F2D1] to-[#2dd9bd] hover:from-[#2dd9bd] hover:to-[#37F2D1] text-[#1E2430] text-lg py-6 font-bold"
                >
                  ♥ Accept
                </Button>
              </div>
            </motion.div>
          )}

          {mode === 'finalize' && acceptedCharacter && (
            <motion.div
              key="finalize"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  It's a Match!
                </h2>
                <p className="text-white/60">
                  You've chosen <span className="text-[#37F2D1] font-semibold">{acceptedCharacter.name}</span>
                </p>
              </div>

              <div className="bg-[#2A3441] rounded-xl p-6 border border-[#37F2D1]/30">
                <p className="text-white/80 text-center mb-4">
                  How would you like to continue?
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleEditInCreator}
                  className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-bold py-3 text-base h-auto"
                >
                  <div className="flex flex-col items-center">
                    <span>✏️ Edit in Character Creator</span>
                    <span className="text-xs opacity-80 mt-1 font-normal">Customize stats, spells, and details</span>
                  </div>
                </Button>

                <Button
                  onClick={handleLetAIPick}
                  className="w-full bg-[#FF5722] hover:bg-[#FF6B3D] text-white font-bold py-3 text-base h-auto border-0"
                >
                  <div className="flex flex-col items-center">
                    <span>✨ Let AI Pick Everything</span>
                    <span className="text-xs opacity-80 mt-1 font-normal">Quick start - AI handles all the details</span>
                  </div>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}