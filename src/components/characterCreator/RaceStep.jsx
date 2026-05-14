import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { Flame, Shield, Eye, Sword, Wind, Droplet, Heart, Sparkles } from "lucide-react";
import { RACES } from '@/components/dnd5e/dnd5eRules';
import { getModdedRaces } from '@/lib/modEngine';
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";
import {
  applyBreweryRaceBaseline,
  applyBreweryRaceSubrace,
  clearBreweryRaceMarkers,
} from '@/lib/breweryRaceApply';
import { OrnateHeading } from "@/components/characterCreator/chrome/Ornaments";

// Normalize a brewery race (modEngine metadata shape) into the same
// shape the SRD race list uses. Preserves brewery-flavored fields
// (_source, _mod_id, _raw) so later steps can apply them.
function normalizeBreweryRace(mod) {
  const subraces = Array.isArray(mod.subraces) ? mod.subraces : [];
  const subtypes = subraces.length > 0 ? subraces.map((s) => s.name).filter(Boolean) : ["Standard"];
  const subtypeDescriptions = {};
  if (subraces.length > 0) {
    for (const s of subraces) {
      if (s?.name) subtypeDescriptions[s.name] = s.description || "";
    }
  } else {
    subtypeDescriptions["Standard"] = mod.description || "";
  }
  const traits = (Array.isArray(mod.traits) ? mod.traits : []).map((t) => ({
    icon: Sparkles,
    name: t?.name || "Trait",
    description: t?.description || "",
  }));
  return {
    id: (mod.name || mod._mod_name || "unnamed").toLowerCase().replace(/\s+/g, "-"),
    name: mod.name || mod._mod_name || "Unnamed Race",
    subtypes,
    description: mod.description || "",
    subtypeDescriptions,
    traits,
    icon: mod.image_url || "",
    image: mod.image_url || "",
    // No prototype lore for brewery — these stay so the visual
    // chip row still renders something meaningful.
    speed: Number(mod.speed) || 30,
    size: mod.size || "Medium",
    languages: Array.isArray(mod.languages?.fixed) ? mod.languages.fixed : ["Common"],
    bonuses: {},
    _source: "brewery",
    _mod_id: mod._mod_id,
    _mod_name: mod._mod_name || mod.name,
    _raw: mod,
  };
}

// D&D 5e SRD language list — populates the bonus-language picker for
// races that grant one extra language of the player's choice.
const SRD_LANGUAGES = [
  "Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin",
  "Halfling", "Orc", "Abyssal", "Celestial", "Draconic",
  "Deep Speech", "Infernal", "Primordial", "Sylvan", "Undercommon",
];

// Collapse the RACES registry + subrace override into the shape the
// SRD traits panel renders.
function computeRacialTags(raceName, subraceName) {
  const data = RACES[raceName];
  if (!data) return null;
  const sub = subraceName && data.subraces ? (data.subraces[subraceName] || {}) : {};
  const speed = sub.speed ?? data.speed ?? 30;
  const size = data.size || 'Medium';
  const mergedFeatures = [...(data.features || []), ...(sub.features || [])];
  const darkvisionFeat = mergedFeatures.find((f) => /darkvision/i.test(f));
  const otherFeatures = mergedFeatures.filter((f) => !/darkvision/i.test(f));
  const baseLangs = Array.isArray(data.languages) ? data.languages : [];
  const fixedLangs = baseLangs.filter((l) => l !== '+1 choice');
  const extraChoiceSlots = baseLangs.filter((l) => l === '+1 choice').length;
  const bonuses = { ...(data.abilityBonuses || {}), ...(sub.abilityBonuses || {}) };
  return {
    speed,
    size,
    darkvision: darkvisionFeat || null,
    features: otherFeatures,
    fixedLangs,
    extraChoiceSlots,
    bonuses,
  };
}

// Race roster — ordered to match design-reference/character-creator/data.jsx.
// Each entry carries:
//   - `id`, `glyph`, `description`, `speed`, `size`, `languages`,
//     `bonuses` (prototype-shape fields — added per the visual port
//     spec for FeaturedRace's chip row + medallion emoji).
//   - `icon` (URL), `traits` (rich objects), `subtypes` + `subtypeDescriptions`
//     (existing-shape fields, untouched so saved characters keep
//     loading and the SRD traits panel keeps reading them).
// Prototype lore strings copied verbatim from
// design-reference/character-creator/data.jsx.
const races = [
  {
    id: "dragonborn",
    name: "Dragonborn",
    glyph: "🐉",
    description: "Born of dragons, Dragonborn stand a head taller than humans with scaled hides and proud bearing. They value honor, skill, and ancestry — and breathe elemental fury when pressed.",
    speed: 30,
    size: "Medium",
    languages: ["Common", "Draconic"],
    bonuses: { str: 2, cha: 1 },
    subtypes: ["Gold", "Silver", "Bronze", "Copper", "Brass", "Red", "Blue", "Green", "Black", "White"],
    subtypeDescriptions: {
      "Gold":   "Noble and wise, Gold Dragonborn radiate warmth and command respect. Their breath weapon is fire (15ft cone, Dex save), and they resist fire damage.",
      "Silver": "Graceful and kind, Silver Dragonborn are champions of good. Their breath weapon is cold (15ft cone, Con save), and they resist cold damage.",
      "Bronze": "Honorable warriors who love the sea. Their breath weapon is lightning (5ft x 30ft line, Dex save), and they resist lightning damage.",
      "Copper": "Witty and playful with a love of jokes and tricks. Their breath weapon is acid (5ft x 30ft line, Dex save), and they resist acid damage.",
      "Brass":  "Talkative and sociable, they love conversation. Their breath weapon is fire (5ft x 30ft line, Dex save), and they resist fire damage.",
      "Red":    "Proud and greedy, often arrogant but powerful. Their breath weapon is fire (15ft cone, Dex save), and they resist fire damage.",
      "Blue":   "Vain and territorial, they value order. Their breath weapon is lightning (5ft x 30ft line, Dex save), and they resist lightning damage.",
      "Green":  "Cunning and deceptive schemers. Their breath weapon is poison (15ft cone, Con save), and they resist poison damage.",
      "Black":  "Cruel and sadistic, they revel in suffering. Their breath weapon is acid (5ft x 30ft line, Dex save), and they resist acid damage.",
      "White":  "Savage and bestial hunters. Their breath weapon is cold (15ft cone, Con save), and they resist cold damage.",
    },
    traits: [
      { icon: Flame,  name: "Breath Weapon",      description: "Use your action to exhale destructive energy based on your draconic ancestry. Each creature in the area must make a saving throw." },
      { icon: Shield, name: "Damage Resistance",  description: "You have resistance to the damage type associated with your draconic ancestry, taking half damage from that type." },
      { icon: Eye,    name: "Draconic Ancestry",  description: "Your draconic ancestry sets your breath-weapon shape, save type, and damage resistance." },
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/d987fae82_dragonbornraceicon.png",
  },
  {
    id: "dwarf",
    name: "Dwarf",
    glyph: "⚒️",
    description: "Dwarves are short, broad, and bearded — masters of forge and stone. Centuries of life underground granted them keen sight in darkness and unmatched durability.",
    speed: 25,
    size: "Medium",
    languages: ["Common", "Dwarvish"],
    bonuses: { con: 2 },
    subtypes: ["Mountain Dwarf", "Hill Dwarf"],
    subtypeDescriptions: {
      "Mountain Dwarf": "Strong warriors proficient in light and medium armor. They are larger and more combat-oriented. +2 Strength.",
      "Hill Dwarf":     "Especially hardy with keen senses. They have additional hit points (1 per level) and increased Wisdom. +1 Wisdom, +1 HP per level.",
    },
    traits: [
      { icon: Eye,    name: "Darkvision",         description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { icon: Shield, name: "Dwarven Resilience", description: "You have advantage on saving throws against poison, and resistance against poison damage." },
      { icon: Sword,  name: "Stonecunning",       description: "You have proficiency in History checks related to the origin of stonework, gaining double your proficiency bonus." },
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/7b31ed2b9_dwarfraceicon.png",
  },
  {
    id: "elf",
    name: "Elf",
    glyph: "🏹",
    description: "Elves live centuries. They view time differently than mortals — patient, deliberate, and unmatched at any craft to which they dedicate themselves.",
    speed: 30,
    size: "Medium",
    languages: ["Common", "Elvish"],
    bonuses: { dex: 2 },
    subtypes: ["High Elf", "Wood Elf", "Dark Elf (Drow)"],
    subtypeDescriptions: {
      "High Elf":         "Studious and proud, High Elves master magic and intellect. They know one wizard cantrip and are proficient with longswords, shortswords, shortbows, and longbows. +1 Intelligence.",
      "Wood Elf":         "Swift and stealthy forest dwellers. Their base walking speed is 35 feet, they can hide even when lightly obscured by nature, and are proficient with longswords, shortswords, shortbows, and longbows. +1 Wisdom.",
      "Dark Elf (Drow)":  "Underground dwellers adapted to darkness. They have superior darkvision (120 feet), know the dancing lights cantrip, and can cast faerie fire and darkness once per long rest. Sunlight sensitivity. +1 Charisma.",
    },
    traits: [
      { icon: Eye,   name: "Darkvision",   description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { icon: Shield, name: "Fey Ancestry", description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep." },
      { icon: Wind,  name: "Trance",       description: "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day, remaining semiconscious." },
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/f696b9d6e_elfraceicon.png",
  },
  {
    id: "gnome",
    name: "Gnome",
    glyph: "🎩",
    description: "A gnome's energy fits a body twice its size. They explore the world with the joy of a child opening every drawer in a vast curiosity cabinet.",
    speed: 25,
    size: "Small",
    languages: ["Common", "Gnomish"],
    bonuses: { int: 2 },
    subtypes: ["Forest Gnome", "Rock Gnome"],
    subtypeDescriptions: {
      "Forest Gnome": "Nature-loving gnomes who communicate with small beasts. They know the minor illusion cantrip and can speak with small animals. +1 Dexterity.",
      "Rock Gnome":   "Ingenious inventors and tinkerers. They have proficiency with tinker's tools and can create clockwork toys and devices. +1 Constitution.",
    },
    traits: [
      { icon: Eye,    name: "Darkvision",    description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { icon: Shield, name: "Gnome Cunning", description: "You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic." },
      { icon: Wind,   name: "Small Size",    description: "Gnomes are between 3 and 4 feet tall. Your small size grants you unique advantages in certain situations." },
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/c56fbbc80_gnomeraceicon.png",
  },
  {
    id: "half-elf",
    name: "Half-Elf",
    glyph: "✨",
    description: "Caught between human ambition and elven grace, half-elves belong nowhere and everywhere. Charming diplomats, restless wanderers, and bridges between cultures.",
    speed: 30,
    size: "Medium",
    languages: ["Common", "Elvish", "+1 choice"],
    bonuses: { cha: 2, choice: { count: 2, amount: 1, exclude: ["cha"] } },
    subtypes: ["Standard Half-Elf", "Half-High Elf", "Half-Wood Elf", "Half-Drow"],
    subtypeDescriptions: {
      "Standard Half-Elf": "Versatile and charismatic, combining human adaptability with elven grace. +2 Charisma, +1 to two other ability scores. Gain Skill Versatility (proficiency in two skills of choice).",
      "Half-High Elf":     "Reflecting high elf heritage. +2 Charisma, +1 to two other ability scores. Gain one wizard cantrip of your choice. Replaces Skill Versatility with Elf Weapon Training.",
      "Half-Wood Elf":     "Reflecting wood elf heritage. +2 Charisma, +1 to two other ability scores. Base walking speed increases to 35 feet. Replaces Skill Versatility with Mask of the Wild.",
      "Half-Drow":         "Reflecting drow heritage. +2 Charisma, +1 to two other ability scores. Superior Darkvision (120 feet). Replaces Skill Versatility with Drow Magic.",
    },
    traits: [
      { icon: Eye,    name: "Darkvision",      description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { icon: Shield, name: "Fey Ancestry",    description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep." },
      { icon: Heart,  name: "Skill Versatility", description: "You gain proficiency in two skills of your choice — replaced by lineage-specific traits for Half-High Elf, Half-Wood Elf, and Half-Drow." },
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/297cad9ca_halfelfraceicon.png",
  },
  {
    id: "half-orc",
    name: "Half-Orc",
    glyph: "⚔️",
    description: "Half-orcs are scarred by life from birth — but those scars are stories of survival. They love hard, fight harder, and never give up.",
    speed: 30,
    size: "Medium",
    languages: ["Common", "Orc"],
    bonuses: { str: 2, con: 1 },
    subtypes: ["Standard"],
    subtypeDescriptions: {
      "Standard": "Powerful warriors combining human determination with orcish strength. +2 Strength, +1 Constitution. Natural survivors who refuse to fall.",
    },
    traits: [
      { icon: Eye,    name: "Darkvision",           description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { icon: Shield, name: "Menacing",             description: "You gain proficiency in the Intimidation skill." },
      { icon: Shield, name: "Relentless Endurance", description: "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can't use this feature again until you finish a long rest." },
      { icon: Sword,  name: "Savage Attacks",       description: "When you score a critical hit with a melee weapon attack, you can roll one of the weapon's damage dice one additional time and add it to the extra damage." },
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/d4a087969_halforcraceicon.png",
  },
  {
    id: "halfling",
    name: "Halfling",
    glyph: "🍃",
    description: "Halflings prize peace, full pantries, and good company — but when a halfling decides to leave home, the world had better watch out.",
    speed: 25,
    size: "Small",
    languages: ["Common", "Halfling"],
    bonuses: { dex: 2 },
    subtypes: ["Lightfoot", "Stout"],
    subtypeDescriptions: {
      "Lightfoot": "Naturally stealthy, they can hide even behind creatures larger than them. Friendly and easygoing. +1 Charisma.",
      "Stout":     "Hardier than other halflings with dwarven resilience. They have advantage on saves against poison and resistance to poison damage. +1 Constitution.",
    },
    traits: [
      { icon: Flame,  name: "Lucky",               description: "When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll." },
      { icon: Shield, name: "Brave",               description: "You have advantage on saving throws against being frightened." },
      { icon: Wind,   name: "Halfling Nimbleness", description: "You can move through the space of any creature that is of a size larger than yours." },
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/1f05e3073_halflingraceicon.png",
  },
  {
    id: "human",
    name: "Human",
    glyph: "🧭",
    description: "Humans live brief, blazing lives. What they lack in centuries of experience they make up for in ambition, ingenuity, and sheer numbers.",
    speed: 30,
    size: "Medium",
    languages: ["Common", "+1 choice"],
    bonuses: { all: 1 },
    subtypes: ["Standard"],
    subtypeDescriptions: {
      "Standard": "Versatile and ambitious, gaining +1 to all ability scores. Their adaptability makes them suited to any class or role.",
    },
    traits: [
      { icon: Flame,  name: "Versatile",   description: "Humans gain +1 to all ability scores, making them adaptable to any class or role." },
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/72c27f140_humanraceicon.png",
  },
  {
    id: "tiefling",
    name: "Tiefling",
    glyph: "🔥",
    description: "Tieflings carry the mark of a devil somewhere in their bloodline. Society often distrusts them on sight — so they learn to speak well, fight smart, and trust their own.",
    speed: 30,
    size: "Medium",
    languages: ["Common", "Infernal"],
    bonuses: { cha: 2, int: 1 },
    subtypes: ["Asmodeus", "Baalzebul", "Dispater", "Fierna", "Glasya", "Levistus", "Mammon", "Mephistopheles", "Zariel"],
    subtypeDescriptions: {
      "Asmodeus":       "The most common tiefling bloodline. Knows thaumaturgy cantrip, can cast hellish rebuke and darkness. +2 Charisma, +1 Intelligence.",
      "Baalzebul":      "Legacy of lies and corruption. Knows thaumaturgy, can cast ray of sickness and crown of madness. +2 Charisma, +1 Intelligence.",
      "Dispater":       "Infernal politicians and schemers. Knows thaumaturgy, can cast disguise self and detect thoughts. +2 Charisma, +1 Dexterity.",
      "Fierna":         "Masters of manipulation and charm. Knows friends cantrip, can cast charm person and suggestion. +2 Charisma, +1 Wisdom.",
      "Glasya":         "Cunning tricksters and thieves. Knows minor illusion, can cast disguise self and invisibility. +2 Charisma, +1 Dexterity.",
      "Levistus":       "Frozen in ice, masters of survival. Knows ray of frost, can cast armor of Agathys and darkness. +2 Charisma, +1 Constitution.",
      "Mammon":         "Driven by greed and wealth. Knows mage hand, can cast Tenser's floating disk and arcane lock. +2 Charisma, +1 Intelligence.",
      "Mephistopheles": "Scholars of arcane secrets. Knows mage hand, can cast burning hands and flame blade. +2 Charisma, +1 Intelligence.",
      "Zariel":         "Warriors bearing the mark of battle. Knows thaumaturgy, can cast searing smite and branding smite. +2 Charisma, +1 Strength.",
    },
    traits: [
      { icon: Eye,     name: "Darkvision",         description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { icon: Flame,   name: "Hellish Resistance", description: "You have resistance to fire damage." },
      { icon: Droplet, name: "Infernal Legacy",    description: "You know the thaumaturgy cantrip. At 3rd level, you can cast hellish rebuke once per long rest." },
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/bf4ea2436_TieflingRaceIcon.png",
  },
];

export default function RaceStep({ characterData, updateCharacterData, campaignId }) {
  const [selectedRaceIndex, setSelectedRaceIndex] = useState(0);

  const { data: moddedRaces = [] } = useQuery({
    queryKey: ["characterCreator", "moddedRaces", campaignId],
    queryFn: () => getModdedRaces(campaignId),
    enabled: !!campaignId,
    initialData: [],
  });

  const combinedRaces = React.useMemo(() => {
    if (!moddedRaces || moddedRaces.length === 0) return races;
    return [...races, ...moddedRaces.map(normalizeBreweryRace)];
  }, [moddedRaces]);

  const currentRace = combinedRaces[selectedRaceIndex] || combinedRaces[0];

  // Same brewery / SRD / mod_dependencies handling as before — the
  // medallion grid below just calls it with a different race index.
  const buildRaceUpdates = (race) => {
    const base = {
      race: race.name,
      subrace: race.subtypes[0],
    };
    if (race._source === "brewery") {
      const baseline = applyBreweryRaceBaseline(race._raw || null, characterData);
      const subraceUpdates = applyBreweryRaceSubrace(
        race._raw || null,
        race.subtypes[0],
        baseline.race_features || [],
      );
      const priorDeps = Array.isArray(characterData.mod_dependencies) ? characterData.mod_dependencies : [];
      const nonRaceDeps = priorDeps.filter((d) => d?.mod_type !== "race");
      const raceDep = race._mod_id
        ? [{ mod_id: race._mod_id, mod_name: race._mod_name || race.name, mod_type: "race" }]
        : [];
      return {
        ...base,
        ...clearBreweryRaceMarkers(),
        _brewery_race: race._raw || null,
        mod_dependencies: [...nonRaceDeps, ...raceDep],
        ...baseline,
        ...subraceUpdates,
      };
    }
    const priorDeps = Array.isArray(characterData.mod_dependencies) ? characterData.mod_dependencies : [];
    const nonRaceDeps = priorDeps.filter((d) => d?.mod_type !== "race");
    return {
      ...base,
      ...clearBreweryRaceMarkers(),
      mod_dependencies: nonRaceDeps,
    };
  };

  const handlePickRace = (race, index) => {
    setSelectedRaceIndex(index);
    updateCharacterData(buildRaceUpdates(race));
  };

  React.useEffect(() => {
    if (!characterData.race) {
      updateCharacterData(buildRaceUpdates(currentRace));
    } else {
      const initialRaceIndex = combinedRaces.findIndex((race) => race.name === characterData.race);
      if (initialRaceIndex !== -1 && initialRaceIndex !== selectedRaceIndex) {
        setSelectedRaceIndex(initialRaceIndex);
      }
    }
  }, [characterData.race, selectedRaceIndex, updateCharacterData, currentRace.name, currentRace.subtypes, combinedRaces]);

  const activeSubrace = characterData.subrace || currentRace.subtypes[0];

  return (
    <div>
      {/* Tome panel — the prototype wraps RaceSection inside .tome
          with padding 32/36. */}
      <div className="cc-tome" style={{ padding: '32px 36px' }}>
        <RaceSection
          currentRace={currentRace}
          combinedRaces={combinedRaces}
          activeSubrace={activeSubrace}
          characterData={characterData}
          updateCharacterData={updateCharacterData}
          onPickRace={handlePickRace}
        />

        {currentRace?._source !== "brewery" && (
          <SrdRacialTraitsPanel
            raceName={currentRace.name}
            subraceName={activeSubrace}
            characterData={characterData}
            updateCharacterData={updateCharacterData}
          />
        )}

        {currentRace?._source === "brewery" && (
          <BreweryRacePickers
            characterData={characterData}
            updateCharacterData={updateCharacterData}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Race section — 1:1 with design-reference/character-creator/step-identity.jsx
// RaceSection (~40-76). OrnateHeading + FeaturedRace (or empty-state primer)
// + medallion rail.
// ============================================================================
function RaceSection({
  currentRace, combinedRaces, activeSubrace,
  characterData, updateCharacterData, onPickRace,
}) {
  return (
    <div>
      <OrnateHeading>Race</OrnateHeading>

      {currentRace ? (
        <FeaturedRace
          race={currentRace}
          subrace={activeSubrace}
          characterData={characterData}
          updateCharacterData={updateCharacterData}
        />
      ) : (
        <div
          className="cc-primer"
          style={{
            textAlign: 'center',
            padding: 28,
            fontFamily: 'var(--cc-serif)',
            fontStyle: 'italic',
            color: 'var(--cc-text-dim)',
            fontSize: 16,
          }}
        >
          Choose a heritage from the line below to reveal their tale.
        </div>
      )}

      {/* Race rail — bigger icons, hover-reveal name, click to feature.
          Prototype uses grid-template-columns: repeat(9, 1fr). */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          gap: 8,
          marginTop: 18,
        }}
      >
        {combinedRaces.map((race, idx) => (
          <RaceMedallion
            key={`${race._source || 'srd'}-${race.id || race.name}`}
            race={race}
            active={characterData.race === race.name}
            onClick={() => onPickRace(race, idx)}
          />
        ))}
      </div>
    </div>
  );
}

// FeaturedRace — 1:1 with prototype step-identity.jsx (~78-137).
function FeaturedRace({ race, subrace, characterData, updateCharacterData }) {
  return (
    <motion.div
      key={race.id || race.name}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 22 }}
    >
      {/* Iconic emblem */}
      <div
        style={{
          height: 90,
          width: 90,
          background: 'radial-gradient(circle, rgba(212, 169, 81, 0.18) 0%, transparent 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 56,
          lineHeight: 1,
          position: 'relative',
          filter: 'drop-shadow(0 4px 12px rgba(255, 83, 0, 0.25))',
        }}
      >
        <RaceGlyph race={race} size={56} />
      </div>

      <div>
        <div
          className="cc-display"
          style={{
            fontSize: 36,
            color: 'var(--cc-orange-soft)',
            lineHeight: 1,
            marginBottom: 8,
            letterSpacing: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {race.name}
          <InfoTip>{tipFor("race")}</InfoTip>
          {race._source === "brewery" && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#050816',
                background: 'var(--cc-teal)',
                borderRadius: 4,
                padding: '2px 6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Sparkles className="w-2.5 h-2.5" /> Brewery
            </span>
          )}
        </div>

        <p
          className="cc-italic-serif"
          style={{
            fontSize: 16,
            color: 'var(--cc-text-dim)',
            margin: 0,
            marginBottom: 14,
            lineHeight: 1.55,
          }}
        >
          {race.description}
        </p>

        {/* Chip row — Speed / Size / ability bonuses / trait names.
            Order and class names match the prototype verbatim. */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 16,
          }}
        >
          {race.speed != null && (
            <span className="cc-chip cc-chip-gold">Speed {race.speed} ft</span>
          )}
          {race.size && (
            <span className="cc-chip cc-chip-gold">Size {race.size}</span>
          )}
          {Object.entries(race.bonuses || {}).map(([k, v]) => {
            if (k === 'choice') return null;
            if (k === 'all') {
              return (
                <span key={k} className="cc-chip cc-chip-orange">All +{v}</span>
              );
            }
            return (
              <span key={k} className="cc-chip cc-chip-orange">
                {k.toUpperCase()} +{v}
              </span>
            );
          })}
          {(race.traits || []).map((t, idx) => {
            const name = typeof t === 'string' ? t : t.name;
            const description = typeof t === 'object' ? t.description : null;
            return (
              <span
                key={`${name}-${idx}`}
                className="cc-chip cc-chip-neutral"
                title={description || undefined}
                style={description ? { cursor: 'help' } : undefined}
              >
                {name}
              </span>
            );
          })}
        </div>

        {/* Lineage picker — only shown when there are 2+ subraces.
            Prototype renders a grid of auto-fill minmax(180px, 1fr). */}
        {race.subtypes.length > 1 && (
          <div>
            <div
              className="cc-label"
              style={{ marginBottom: 8, color: 'var(--cc-gold-soft)' }}
            >
              Choose a lineage
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 8,
              }}
            >
              {race.subtypes.map((subtype) => {
                const active = subrace === subtype;
                return (
                  <button
                    key={subtype}
                    type="button"
                    onClick={() => {
                      const updates = { subrace: subtype };
                      if (race._source === "brewery" && race._raw) {
                        const baseline = applyBreweryRaceBaseline(race._raw, characterData);
                        const subraceUpdates = applyBreweryRaceSubrace(
                          race._raw,
                          subtype,
                          baseline.race_features || [],
                        );
                        Object.assign(updates, baseline, subraceUpdates);
                      }
                      updateCharacterData(updates);
                    }}
                    className={`cc-pickable ${active ? 'cc-selected-teal' : ''}`}
                    style={{ padding: '12px 14px', textAlign: 'left', color: 'inherit' }}
                  >
                    <div
                      className="cc-display"
                      style={{
                        fontSize: 16,
                        color: 'var(--cc-text)',
                        marginBottom: 4,
                      }}
                    >
                      {subtype}
                    </div>
                    <div
                      className="cc-italic-serif"
                      style={{
                        fontSize: 13,
                        color: 'var(--cc-text-dim)',
                        lineHeight: 1.45,
                      }}
                    >
                      {race.subtypeDescriptions?.[subtype]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* AutoSelect for single-subtype races — mirrors the
            prototype's AutoSelect helper (~139-142). */}
        {race.subtypes.length === 1 && (
          <AutoSelect
            current={subrace}
            target={race.subtypes[0]}
            onMount={() => updateCharacterData({ subrace: race.subtypes[0] })}
          />
        )}
      </div>
    </motion.div>
  );
}

// AutoSelect — 1:1 with prototype helper (~139-142).
function AutoSelect({ onMount, current, target }) {
  React.useEffect(() => {
    if (current !== target) onMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// RaceMedallion — 1:1 with prototype step-identity.jsx (~144-176).
function RaceMedallion({ race, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={race.name}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '8px 4px',
        borderRadius: 4,
        transition: 'all .15s',
        background: active ? 'rgba(255, 83, 0, 0.10)' : 'transparent',
        border: `1px solid ${active ? 'var(--cc-orange)' : 'transparent'}`,
        boxShadow: active ? '0 0 16px var(--cc-orange-glow)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'rgba(212, 169, 81, 0.06)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          lineHeight: 1,
          background: active
            ? 'radial-gradient(circle, rgba(255, 83, 0, 0.22) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(212, 169, 81, 0.08) 0%, transparent 70%)',
          filter: active ? 'none' : 'grayscale(0.4) opacity(0.85)',
        }}
      >
        <RaceGlyph race={race} size={26} />
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: active ? 'var(--cc-orange-soft)' : 'var(--cc-text-dim)',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {race.name}
      </div>
    </button>
  );
}

// Glyph renderer — emoji for SRD races (per prototype), URL image
// for brewery races (whose icon is a Supabase storage URL).
function RaceGlyph({ race, size }) {
  const glyph = race.glyph;
  const url = race.icon;
  if (glyph) {
    return (
      <span style={{ fontSize: size, lineHeight: 1, filter: 'sepia(0.15) saturate(1.2)' }}>
        {glyph}
      </span>
    );
  }
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{
          width: size + 12,
          height: size + 12,
          objectFit: 'contain',
        }}
      />
    );
  }
  return (
    <span style={{ fontSize: size, lineHeight: 1, color: 'var(--cc-gold)' }}>
      {race.name?.charAt(0) || '?'}
    </span>
  );
}

// ============================================================================
// SRD racial traits panel — preserved verbatim from pre-port file.
// Owns the language-merge + bonus-language picker behavior.
// ============================================================================
function TraitTag({ children, accent = "teal" }) {
  const accents = {
    teal:   "bg-[#37F2D1]/10 border-[#37F2D1]/40 text-[#37F2D1]",
    amber:  "bg-amber-500/10 border-amber-400/40 text-amber-300",
    violet: "bg-violet-500/10 border-violet-400/40 text-violet-300",
    slate:  "bg-slate-700/40 border-slate-600/60 text-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider rounded px-2 py-0.5 border ${accents[accent] || accents.slate}`}>
      {children}
    </span>
  );
}

function SrdRacialTraitsPanel({ raceName, subraceName, characterData, updateCharacterData }) {
  const tags = computeRacialTags(raceName, subraceName);
  if (!tags) return null;

  const bonusLangs = Array.isArray(characterData.bonus_languages)
    ? characterData.bonus_languages
    : [];

  React.useEffect(() => {
    const merged = Array.from(new Set([...tags.fixedLangs, ...bonusLangs]));
    const current = Array.isArray(characterData.languages) ? characterData.languages : [];
    const same = merged.length === current.length && merged.every((l, i) => l === current[i]);
    if (!same) updateCharacterData({ languages: merged });
  }, [raceName, subraceName, tags.fixedLangs.join("|"), bonusLangs.join("|")]);

  React.useEffect(() => {
    if (tags.extraChoiceSlots >= bonusLangs.length) return;
    updateCharacterData({ bonus_languages: bonusLangs.slice(0, tags.extraChoiceSlots) });
  }, [tags.extraChoiceSlots]);

  const pickLanguage = (idx, value) => {
    const next = [...bonusLangs];
    next[idx] = value;
    updateCharacterData({ bonus_languages: next.filter(Boolean) });
  };

  const eligibleLanguages = SRD_LANGUAGES
    .filter((l) => !tags.fixedLangs.includes(l))
    .filter((l) => !bonusLangs.includes(l));

  const bonusEntries = Object.entries(tags.bonuses);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-5 bg-[#2A3441]/50 rounded-lg p-4 border border-[#37F2D1]/20"
    >
      <h4 className="text-[#37F2D1] font-semibold text-sm mb-3">Racial Traits</h4>

      <div className="flex flex-wrap gap-2 mb-3">
        <TraitTag accent="teal">Speed: {tags.speed} ft.</TraitTag>
        <TraitTag accent="slate">Size: {tags.size}</TraitTag>
        {tags.darkvision && <TraitTag accent="violet">Darkvision 60 ft.</TraitTag>}
        {bonusEntries.length > 0 && (
          <TraitTag accent="amber">
            {bonusEntries.map(([ab, val]) => `+${val} ${ab.toUpperCase()}`).join(", ")}
          </TraitTag>
        )}
      </div>

      {tags.features.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.features.map((f) => (
            <TraitTag key={f} accent="slate">{f}</TraitTag>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-widest text-white/60 font-bold">Languages:</span>
        {tags.fixedLangs.map((l) => (
          <TraitTag key={l} accent="teal">{l}</TraitTag>
        ))}
        {bonusLangs.map((l) => (
          <TraitTag key={`bonus-${l}`} accent="amber">{l} (chosen)</TraitTag>
        ))}
      </div>

      {tags.extraChoiceSlots > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[11px] text-white/60 mb-2">
            {raceName} grants {tags.extraChoiceSlots} additional language of your choice.
          </p>
          <div className="flex flex-col gap-2">
            {Array.from({ length: tags.extraChoiceSlots }).map((_, idx) => (
              <Select
                key={idx}
                value={bonusLangs[idx] || ""}
                onValueChange={(v) => pickLanguage(idx, v)}
              >
                <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white text-xs h-9">
                  <SelectValue placeholder="Pick a language…" />
                </SelectTrigger>
                <SelectContent className="bg-[#1E2430] border-slate-700 text-white">
                  {[
                    ...(bonusLangs[idx] ? [bonusLangs[idx]] : []),
                    ...eligibleLanguages,
                  ].map((l) => (
                    <SelectItem key={l} value={l} className="text-white text-xs">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Brewery race pickers — preserved verbatim from pre-port file.
// Owns the bonus-language + skill-choice picker behavior.
// ============================================================================
function BreweryRacePickers({ characterData, updateCharacterData }) {
  const race = characterData._brewery_race;
  if (!race) return null;

  const bonusLangPicks = Number(race.languages?.bonus_picks) || 0;
  const restrictedTo   = Array.isArray(race.languages?.restricted_to) ? race.languages.restricted_to : [];
  const skillChoose    = Number(race.skill_proficiencies?.choose) || 0;
  const chooseFrom     = Array.isArray(race.skill_proficiencies?.choose_from) ? race.skill_proficiencies.choose_from : [];

  const fixedLangs = Array.isArray(race.languages?.fixed) ? race.languages.fixed : [];
  const fixedSkills = Array.isArray(race.skill_proficiencies?.fixed) ? race.skill_proficiencies.fixed : [];

  const existingLangs = Array.isArray(characterData.languages) ? characterData.languages : [];
  const existingBonus = Array.isArray(characterData._brewery_bonus_langs) ? characterData._brewery_bonus_langs : [];
  const existingChosenSkills = Array.isArray(characterData._brewery_chosen_skills) ? characterData._brewery_chosen_skills : [];

  const langOptions = restrictedTo.length > 0
    ? restrictedTo.filter((l) => !fixedLangs.includes(l))
    : [
        "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin", "Halfling", "Orc",
        "Abyssal", "Celestial", "Draconic", "Deep Speech", "Infernal",
        "Primordial", "Sylvan", "Undercommon",
      ].filter((l) => !fixedLangs.includes(l));
  const skillOptionList = chooseFrom.length > 0
    ? chooseFrom.filter((s) => !fixedSkills.includes(s))
    : [
        "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
        "History", "Insight", "Intimidation", "Investigation", "Medicine",
        "Nature", "Perception", "Performance", "Persuasion", "Religion",
        "Sleight of Hand", "Stealth", "Survival",
      ].filter((s) => !fixedSkills.includes(s));

  const toggleLang = (lang) => {
    const active = existingBonus.includes(lang);
    if (!active && existingBonus.length >= bonusLangPicks) return;
    const nextBonus = active
      ? existingBonus.filter((l) => l !== lang)
      : [...existingBonus, lang];
    const mergedLangs = Array.from(new Set([
      ...existingLangs.filter((l) => !existingBonus.includes(l) || nextBonus.includes(l)),
      ...nextBonus,
    ]));
    updateCharacterData({
      _brewery_bonus_langs: nextBonus,
      languages: mergedLangs,
    });
  };

  const toggleSkill = (skill) => {
    const active = existingChosenSkills.includes(skill);
    if (!active && existingChosenSkills.length >= skillChoose) return;
    const nextChosen = active
      ? existingChosenSkills.filter((s) => s !== skill)
      : [...existingChosenSkills, skill];
    const nextSkills = { ...(characterData.skills || {}) };
    if (active) {
      if (!fixedSkills.includes(skill)) delete nextSkills[skill];
    } else {
      nextSkills[skill] = true;
    }
    updateCharacterData({
      _brewery_chosen_skills: nextChosen,
      skills: nextSkills,
    });
  };

  if (bonusLangPicks === 0 && skillChoose === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 space-y-3"
    >
      {bonusLangPicks > 0 && (
        <div className="bg-[#0b1220] border-2 border-[#37F2D1]/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[#37F2D1] font-bold text-xs uppercase tracking-widest">
              Bonus Languages
            </h4>
            <span className="text-[10px] text-white/60">
              {existingBonus.length} / {bonusLangPicks}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {langOptions.map((lang) => {
              const active = existingBonus.includes(lang);
              const disabled = !active && existingBonus.length >= bonusLangPicks;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLang(lang)}
                  disabled={disabled}
                  className={`px-2 py-1 rounded border text-[10px] font-semibold transition-colors ${
                    active
                      ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                      : disabled
                        ? "bg-[#1E2430] text-slate-600 border-slate-800 cursor-not-allowed"
                        : "bg-[#1E2430] text-slate-300 border-slate-700 hover:border-[#37F2D1]/60"
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {skillChoose > 0 && (
        <div className="bg-[#0b1220] border-2 border-[#37F2D1]/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[#37F2D1] font-bold text-xs uppercase tracking-widest">
              Skill Choices
            </h4>
            <span className="text-[10px] text-white/60">
              {existingChosenSkills.length} / {skillChoose}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skillOptionList.map((skill) => {
              const active = existingChosenSkills.includes(skill);
              const disabled = !active && existingChosenSkills.length >= skillChoose;
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  disabled={disabled}
                  className={`px-2 py-1 rounded border text-[10px] font-semibold transition-colors ${
                    active
                      ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                      : disabled
                        ? "bg-[#1E2430] text-slate-600 border-slate-800 cursor-not-allowed"
                        : "bg-[#1E2430] text-slate-300 border-slate-700 hover:border-[#37F2D1]/60"
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
