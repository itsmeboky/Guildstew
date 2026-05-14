import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
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
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";

// Normalize a brewery race (modEngine metadata shape) into the same
// shape the SRD race list uses — { name, subtypes, description,
// subtypeDescriptions, traits, icon, image } — so the existing
// carousel / detail UI keeps working without a parallel branch.
// Brewery-flavored fields (_source, _mod_id, _mod_name, and the raw
// schema blob under _raw) ride along so later steps can apply them.
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
    name: mod.name || mod._mod_name || "Unnamed Race",
    subtypes,
    description: mod.description || "",
    subtypeDescriptions,
    traits,
    icon: mod.image_url || "",
    image: mod.image_url || "",
    _source: "brewery",
    _mod_id: mod._mod_id,
    _mod_name: mod._mod_name || mod.name,
    _raw: mod,
  };
}

// D&D 5e SRD language list — used to populate the bonus-language
// picker for races that grant one extra language of the player's
// choice (Human base, Half-Elf, High Elf's Extra Language feature).
const SRD_LANGUAGES = [
  "Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin",
  "Halfling", "Orc", "Abyssal", "Celestial", "Draconic",
  "Deep Speech", "Infernal", "Primordial", "Sylvan", "Undercommon",
];

// Collapse the RACES registry + subrace override into the shape the
// badges row renders. Returns null if the race isn't SRD-registered
// (brewery races have their own picker block).
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

const races = [
  {
    name: "Dragonborn",
    subtypes: ["Gold", "Silver", "Bronze", "Copper", "Brass", "Red", "Blue", "Green", "Black", "White"],
    description: "Gold Dragonborn are the definition of regal. Radiating warmth, wisdom, and an intimidating sense of self-control, they walk into a room like destiny follows them. Their golden scales gleam like sunlight on ancient temples, and their presence alone demands reverence. Idealists at heart, they believe in the power of honor and nobility.",
    subtypeDescriptions: {
      "Gold": "Noble and wise, Gold Dragonborn radiate warmth and command respect. Their breath weapon is fire (15ft cone, Dex save), and they resist fire damage.",
      "Silver": "Graceful and kind, Silver Dragonborn are champions of good. Their breath weapon is cold (15ft cone, Con save), and they resist cold damage.",
      "Bronze": "Honorable warriors who love the sea. Their breath weapon is lightning (5ft x 30ft line, Dex save), and they resist lightning damage.",
      "Copper": "Witty and playful with a love of jokes and tricks. Their breath weapon is acid (5ft x 30ft line, Dex save), and they resist acid damage.",
      "Brass": "Talkative and sociable, they love conversation. Their breath weapon is fire (5ft x 30ft line, Dex save), and they resist fire damage.",
      "Red": "Proud and greedy, often arrogant but powerful. Their breath weapon is fire (15ft cone, Dex save), and they resist fire damage.",
      "Blue": "Vain and territorial, they value order. Their breath weapon is lightning (5ft x 30ft line, Dex save), and they resist lightning damage.",
      "Green": "Cunning and deceptive schemers. Their breath weapon is poison (15ft cone, Con save), and they resist poison damage.",
      "Black": "Cruel and sadistic, they revel in suffering. Their breath weapon is acid (5ft x 30ft line, Dex save), and they resist acid damage.",
      "White": "Savage and bestial hunters. Their breath weapon is cold (15ft cone, Con save), and they resist cold damage."
    },
    traits: [
      { icon: Flame, name: "Breath Weapon", description: "Use your action to exhale destructive energy based on your draconic ancestry. Each creature in the area must make a saving throw." },
      { icon: Shield, name: "Damage Resistance", description: "You have resistance to the damage type associated with your draconic ancestry, taking half damage from that type." },
      { icon: Eye, name: "Darkvision", description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." }
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/d987fae82_dragonbornraceicon.png",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop"
  },
  {
    name: "Elf",
    subtypes: ["High Elf", "Wood Elf", "Dark Elf (Drow)"],
    description: "Graceful and long-lived, elves are known for their magic and connection to nature. With keen senses and natural agility, they move through the world with elegance. High Elves are studious and magical, Wood Elves are swift and stealthy, while Drow are mysterious and adapt to darkness.",
    subtypeDescriptions: {
      "High Elf": "Studious and proud, High Elves master magic and intellect. They know one wizard cantrip and are proficient with longswords, shortswords, shortbows, and longbows. +1 Intelligence.",
      "Wood Elf": "Swift and stealthy forest dwellers. Their base walking speed is 35 feet, they can hide even when lightly obscured by nature, and are proficient with longswords, shortswords, shortbows, and longbows. +1 Wisdom.",
      "Dark Elf (Drow)": "Underground dwellers adapted to darkness. They have superior darkvision (120 feet), know the dancing lights cantrip, and can cast faerie fire and darkness once per long rest. Sunlight sensitivity. +1 Charisma."
    },
    traits: [
      { icon: Eye, name: "Darkvision", description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { icon: Shield, name: "Fey Ancestry", description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep." },
      { icon: Wind, name: "Trance", description: "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day, remaining semiconscious." }
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/f696b9d6e_elfraceicon.png",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&h=800&fit=crop"
  },
  {
    name: "Dwarf",
    subtypes: ["Mountain Dwarf", "Hill Dwarf"],
    description: "Bold and hardy, dwarves are known as skilled warriors, miners, and craftspeople. They're tough, resilient, and have a deep connection to stone and metal. Mountain Dwarves are strong warriors, while Hill Dwarves are especially hardy and perceptive.",
    subtypeDescriptions: {
      "Mountain Dwarf": "Strong warriors proficient in light and medium armor. They are larger and more combat-oriented. +2 Strength.",
      "Hill Dwarf": "Especially hardy with keen senses. They have additional hit points (1 per level) and increased Wisdom. +1 Wisdom, +1 HP per level."
    },
    traits: [
      { icon: Eye, name: "Darkvision", description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { icon: Shield, name: "Dwarven Resilience", description: "You have advantage on saving throws against poison, and resistance against poison damage." },
      { icon: Sword, name: "Stonecunning", description: "You have proficiency in History checks related to the origin of stonework, gaining double your proficiency bonus." }
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/7b31ed2b9_dwarfraceicon.png",
    image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&h=800&fit=crop"
  },
  {
    name: "Human",
    subtypes: ["Standard"],
    description: "Versatile and ambitious, humans are the most adaptable race. They excel in all areas and can pursue any path. Their determination and diversity make them capable of greatness in any field they choose to master.",
    subtypeDescriptions: {
      "Standard": "Versatile and ambitious, gaining +1 to all ability scores. Their adaptability makes them suited to any class or role."
    },
    traits: [
      { icon: Flame, name: "Versatile", description: "Humans gain +1 to all ability scores, making them adaptable to any class or role." },
      { icon: Shield, name: "Extra Skill", description: "Humans gain proficiency in one additional skill of their choice." },
      { icon: Sword, name: "Ambitious", description: "Humans are driven to achieve greatness and adapt quickly to any challenge." }
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/72c27f140_humanraceicon.png",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop"
  },
  {
    name: "Halfling",
    subtypes: ["Lightfoot", "Stout"],
    description: "Small and nimble, halflings are naturally lucky and brave. They're cheerful, friendly, and have a knack for avoiding danger. Lightfoot Halflings are especially stealthy, while Stout Halflings are more resilient.",
    subtypeDescriptions: {
      "Lightfoot": "Naturally stealthy, they can hide even behind creatures larger than them. Friendly and easygoing. +1 Charisma.",
      "Stout": "Hardier than other halflings with dwarven resilience. They have advantage on saves against poison and resistance to poison damage. +1 Constitution."
    },
    traits: [
      { icon: Flame, name: "Lucky", description: "When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll." },
      { icon: Shield, name: "Brave", description: "You have advantage on saving throws against being frightened." },
      { icon: Wind, name: "Nimble", description: "You can move through the space of any creature that is of a size larger than yours." }
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/1f05e3073_halflingraceicon.png",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=800&fit=crop"
  },
  {
    name: "Tiefling",
    subtypes: ["Asmodeus", "Baalzebul", "Dispater", "Fierna", "Glasya", "Levistus", "Mammon", "Mephistopheles", "Zariel"],
    description: "Descended from fiends, tieflings carry an infernal heritage that grants them unique abilities. Despite their appearance, they can be noble heroes. Their natural charisma and magical talents make them compelling individuals.",
    subtypeDescriptions: {
      "Asmodeus": "The most common tiefling bloodline. Knows thaumaturgy cantrip, can cast hellish rebuke and darkness. +2 Charisma, +1 Intelligence.",
      "Baalzebul": "Legacy of lies and corruption. Knows thaumaturgy, can cast ray of sickness and crown of madness. +2 Charisma, +1 Intelligence.",
      "Dispater": "Infernal politicians and schemers. Knows thaumaturgy, can cast disguise self and detect thoughts. +2 Charisma, +1 Dexterity.",
      "Fierna": "Masters of manipulation and charm. Knows friends cantrip, can cast charm person and suggestion. +2 Charisma, +1 Wisdom.",
      "Glasya": "Cunning tricksters and thieves. Knows minor illusion, can cast disguise self and invisibility. +2 Charisma, +1 Dexterity.",
      "Levistus": "Frozen in ice, masters of survival. Knows ray of frost, can cast armor of Agathys and darkness. +2 Charisma, +1 Constitution.",
      "Mammon": "Driven by greed and wealth. Knows mage hand, can cast Tenser's floating disk and arcane lock. +2 Charisma, +1 Intelligence.",
      "Mephistopheles": "Scholars of arcane secrets. Knows mage hand, can cast burning hands and flame blade. +2 Charisma, +1 Intelligence.",
      "Zariel": "Warriors bearing the mark of battle. Knows thaumaturgy, can cast searing smite and branding smite. +2 Charisma, +1 Strength."
    },
    traits: [
      { icon: Eye, name: "Darkvision", description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { icon: Flame, name: "Hellish Resistance", description: "You have resistance to fire damage." },
      { icon: Droplet, name: "Infernal Legacy", description: "You know the thaumaturgy cantrip. At 3rd level, you can cast hellish rebuke once per long rest." }
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/bf4ea2436_TieflingRaceIcon.png",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=800&fit=crop"
  },
  {
    name: "Half-Elf",
    subtypes: ["Standard Half-Elf", "Half-High Elf", "Half-Wood Elf", "Half-Drow"],
    description: "Walking in two worlds but belonging to neither, half-elves combine the best qualities of both humans and elves. Charismatic and versatile, they inherit human adaptability and elven grace. Their diverse heritage makes them natural diplomats and social bridges between different cultures.",
    subtypeDescriptions: {
      "Standard Half-Elf": "Versatile and charismatic, combining human adaptability with elven grace. +2 Charisma, +1 to two other ability scores. Gain Skill Versatility (proficiency in two skills of choice).",
      "Half-High Elf": "Reflecting high elf heritage. +2 Charisma, +1 to two other ability scores. Gain one wizard cantrip of your choice. Replaces Skill Versatility with Elf Weapon Training (longsword, shortsword, shortbow, longbow proficiency).",
      "Half-Wood Elf": "Reflecting wood elf heritage. +2 Charisma, +1 to two other ability scores. Base walking speed increases to 35 feet. Replaces Skill Versatility with Mask of the Wild (can hide when lightly obscured by foliage, heavy rain, falling snow, mist, or other natural phenomena).",
      "Half-Drow": "Reflecting drow heritage. +2 Charisma, +1 to two other ability scores. Superior Darkvision (120 feet). Replaces Skill Versatility with Drow Magic (know dancing lights cantrip, cast faerie fire at 3rd level, cast darkness at 5th level, once per long rest each)."
    },
    traits: [
      { icon: Eye, name: "Darkvision", description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light. (Superior Darkvision of 120 feet for Half-Drow)" },
      { icon: Shield, name: "Fey Ancestry", description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep." },
      { icon: Heart, name: "Heritage Trait", description: "Standard Half-Elf gains Skill Versatility. Half-High Elf gains Elf Weapon Training and a cantrip. Half-Wood Elf gains increased speed and Mask of the Wild. Half-Drow gains Superior Darkvision and Drow Magic." }
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/297cad9ca_halfelfraceicon.png",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&h=800&fit=crop"
  },
  {
    name: "Half-Orc",
    subtypes: ["Standard"],
    description: "Half-orcs combine human adaptability with orcish strength and ferocity. Often caught between two worlds, they forge their own paths through sheer determination. Their physical power and relentless endurance make them formidable warriors who refuse to stay down.",
    subtypeDescriptions: {
      "Standard": "Powerful warriors combining human determination with orcish strength. +2 Strength, +1 Constitution. Natural survivors who refuse to fall."
    },
    traits: [
      { icon: Eye, name: "Darkvision", description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { icon: Shield, name: "Relentless Endurance", description: "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can't use this feature again until you finish a long rest." },
      { icon: Sword, name: "Savage Attacks", description: "When you score a critical hit with a melee weapon attack, you can roll one of the weapon's damage dice one additional time and add it to the extra damage." }
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/d4a087969_halforcraceicon.png",
    image: "https://images.unsplash.com/photo-1542909168-82c3e7fdca44?w=800&h=800&fit=crop"
  },
  {
    name: "Gnome",
    subtypes: ["Forest Gnome", "Rock Gnome"],
    description: "Small, clever, and endlessly curious, gnomes are ingenious tinkerers and nature-lovers. They approach life with enthusiasm and humor, finding wonder in the world around them. Forest Gnomes are friends of small animals, while Rock Gnomes are master inventors and artificers.",
    subtypeDescriptions: {
      "Forest Gnome": "Nature-loving gnomes who communicate with small beasts. They know the minor illusion cantrip and can speak with small animals. +1 Dexterity.",
      "Rock Gnome": "Ingenious inventors and tinkerers. They have proficiency with tinker's tools and can create clockwork toys and devices. +1 Constitution."
    },
    traits: [
      { icon: Eye, name: "Darkvision", description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { icon: Shield, name: "Gnome Cunning", description: "You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic." },
      { icon: Wind, name: "Small Size", description: "Gnomes are between 3 and 4 feet tall. Your small size grants you unique advantages in certain situations." }
    ],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/c56fbbc80_gnomeraceicon.png",
    image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&h=800&fit=crop"
  }
];

const backgrounds = [
  {
    name: "Acolyte",
    description: "You have spent your life in service to a temple, learning sacred rites and providing sacrifices to the god or gods you worship. You act as an intermediary between the holy and the mortal."
  },
  {
    name: "Charlatan",
    description: "You have always had a way with people. You know what makes them tick and can tease out their hearts' desires after a few minutes of conversation. You excel at manipulation and deception."
  },
  {
    name: "Criminal",
    description: "You are an experienced criminal with a history of breaking the law. You have spent a lot of time among other criminals and still have contacts within the criminal underworld."
  },
  {
    name: "Entertainer",
    description: "You thrive in front of an audience. You know how to entrance them, entertain them, and inspire them. Your performances can stir emotions, bringing laughter or tears, or even inspire rage or pity."
  },
  {
    name: "Folk Hero",
    description: "You come from humble social rank, but you are destined for so much more. The people of your home village regard you as their champion, and your destiny calls you to stand against the tyrants and monsters."
  },
  {
    name: "Guild Artisan",
    description: "You are a member of an artisan's guild, skilled in a particular field and closely associated with other artisans. You are a well-established part of the mercantile world."
  },
  {
    name: "Hermit",
    description: "You lived in seclusion—either in a sheltered community or entirely alone—for a formative part of your life. In your time apart from society, you found quiet, solitude, and perhaps some of the answers you were looking for."
  },
  {
    name: "Noble",
    description: "You understand wealth, power, and privilege. You carry a noble title, and your family owns land, collects taxes, and wields significant political influence."
  },
  {
    name: "Outlander",
    description: "You grew up in the wilds, far from civilization and the comforts of town and technology. You've witnessed the migration of herds, survived harsh weather, and endured the solitude of being the only thinking creature for miles."
  },
  {
    name: "Sage",
    description: "You spent years learning the lore of the multiverse. You scoured manuscripts, studied scrolls, and listened to the greatest experts on the subjects that interest you. Your efforts have made you a master in your field."
  },
  {
    name: "Sailor",
    description: "You sailed on a seagoing vessel for years. In that time, you faced storms, monsters of the deep, and those who wanted to sink your craft. Your first love is the distant line of the horizon."
  },
  {
    name: "Soldier",
    description: "War has been your life for as long as you care to remember. You trained as a youth, studied the use of weapons and armor, and learned basic survival techniques, including how to stay alive on the battlefield."
  },
  {
    name: "Urchin",
    description: "You grew up on the streets alone, orphaned, and poor. You had no one to watch over you or provide for you, so you learned to provide for yourself. You fought for scraps of food and kept a constant watch for other desperate souls."
  }
];

export default function RaceStep({ characterData, updateCharacterData, campaignId }) {
  // Selected race is now derived from characterData.race rather than
  // tracked locally — the carousel index went away with the new
  // medallion grid, but we keep a derived index so the existing
  // initial-race-selection useEffect still has a stable target.
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
  const selectedBackground = backgrounds.find((b) => b.name === characterData.background);

  // Same updates writer as the prior carousel — keeps every brewery /
  // SRD branch + the racial-tags reset behavior intact. The medallion
  // grid below just calls it with a different race index.
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
  const selectedSubraceDesc = currentRace.subtypeDescriptions[activeSubrace];

  return (
    <div>
      <StepHeader
        kicker="Chapter I · The Hero"
        title="Forge your hero"
        subtitle="Name, heritage, and history — the soul of your character before they ever swing a sword."
      />

      <Primer title="New to D&D? Start here">
        Your character is the person you'll play. <strong>Race</strong> sets your size, speed,
        and one or two innate tricks. <strong>Background</strong> is what you did before
        adventuring — it shapes the people you know and the skills you bring. Don't overthink it —
        every combination tells a story.
      </Primer>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.55fr 1fr',
          gap: 28,
          marginTop: 24,
          alignItems: 'flex-start',
        }}
      >
        {/* LEFT — tome page with race, background, and (if applicable)
            brewery race pickers in flowing sections. */}
        <div className="cc-tome" style={{ padding: '32px 36px' }}>
          <RaceSection
            currentRace={currentRace}
            combinedRaces={combinedRaces}
            activeSubrace={activeSubrace}
            characterData={characterData}
            updateCharacterData={updateCharacterData}
            onPickRace={handlePickRace}
            selectedSubraceDesc={selectedSubraceDesc}
          />

          <FleurDivider />

          <BackgroundSection
            value={characterData.background}
            selectedBackground={selectedBackground}
            onChange={(name) => updateCharacterData({ background: name })}
          />
        </div>

        {/* RIGHT — identity codex sidebar with name + level. Portrait,
            age, height, weight, and biography live on later steps
            (ClassStep handles avatar uploads + appearance fields), so
            this rail intentionally stays compact. */}
        <div style={{ position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
          <IdentityCodex
            name={characterData.name}
            level={characterData.level}
            updateCharacterData={updateCharacterData}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Race section — featured race tome on top, medallion rail beneath
// ============================================================================
function RaceSection({
  currentRace,
  combinedRaces,
  activeSubrace,
  characterData,
  updateCharacterData,
  onPickRace,
  selectedSubraceDesc,
}) {
  return (
    <div>
      <OrnateHeading>Race</OrnateHeading>

      {currentRace ? (
        <FeaturedRace
          race={currentRace}
          activeSubrace={activeSubrace}
          selectedSubraceDesc={selectedSubraceDesc}
          characterData={characterData}
          updateCharacterData={updateCharacterData}
        />
      ) : (
        <div
          className="cc-italic-serif"
          style={{
            textAlign: 'center',
            padding: 28,
            color: 'var(--cc-text-dim)',
            fontSize: 16,
            background: 'rgba(20, 12, 8, 0.4)',
            borderRadius: 6,
            border: '1px solid var(--cc-border-faint)',
          }}
        >
          Choose a heritage from the line below to reveal their tale.
        </div>
      )}

      {/* Race medallion rail */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(82px, 1fr))',
          gap: 8,
          marginTop: 20,
        }}
      >
        {combinedRaces.map((race, idx) => (
          <RaceMedallion
            key={`${race._source || 'srd'}-${race.name}`}
            race={race}
            active={characterData.race === race.name}
            onClick={() => onPickRace(race, idx)}
          />
        ))}
      </div>

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
  );
}

function FeaturedRace({
  race,
  activeSubrace,
  selectedSubraceDesc,
  characterData,
  updateCharacterData,
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 22 }}>
      {/* Iconic emblem */}
      <div
        style={{
          height: 90,
          width: 90,
          background: 'radial-gradient(circle, rgba(212, 169, 81, 0.18) 0%, transparent 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          filter: 'drop-shadow(0 4px 12px rgba(255, 83, 0, 0.25))',
        }}
      >
        {race.icon ? (
          <img
            src={race.icon}
            alt=""
            style={{ width: 68, height: 68, objectFit: 'contain' }}
          />
        ) : (
          <div
            className="cc-display"
            style={{
              fontSize: 40,
              color: 'var(--cc-gold)',
              lineHeight: 1,
            }}
          >
            {race.name?.charAt(0) || '?'}
          </div>
        )}
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 6,
          }}
        >
          <div
            className="cc-display"
            style={{
              fontSize: 34,
              color: 'var(--cc-orange-soft)',
              lineHeight: 1,
              letterSpacing: 1,
            }}
          >
            {race.name}
          </div>
          <InfoTip>{tipFor("race")}</InfoTip>
          {race._source === "brewery" && (
            <span
              className="inline-flex items-center gap-1"
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#050816',
                background: 'var(--cc-teal)',
                borderRadius: 4,
                padding: '2px 6px',
              }}
            >
              <Sparkles className="w-3 h-3" /> Brewery
            </span>
          )}
        </div>

        <p
          className="cc-italic-serif"
          style={{
            fontSize: 15,
            color: 'var(--cc-text-dim)',
            margin: '0 0 14px',
            lineHeight: 1.55,
          }}
        >
          {race.description}
        </p>

        {/* Trait names as chips (descriptions live further down with
            full text — preserves the existing tooltip-on-hover
            interaction without the prototype's pretty chip styling. */}
        {Array.isArray(race.traits) && race.traits.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 16,
            }}
          >
            {race.traits.map((t, idx) => {
              const Icon = t.icon || Sparkles;
              return (
                <span
                  key={idx}
                  title={t.description}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    color: 'var(--cc-orange-soft)',
                    background: 'rgba(255, 83, 0, 0.08)',
                    border: '1px solid rgba(255, 83, 0, 0.35)',
                    borderRadius: 4,
                    padding: '4px 8px',
                    cursor: 'help',
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {t.name}
                </span>
              );
            })}
          </div>
        )}

        {/* Subrace picker */}
        {race.subtypes.length > 1 && (
          <div>
            <div className="cc-label" style={{ marginBottom: 8, color: 'var(--cc-gold-soft)' }}>
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
                const active = activeSubrace === subtype;
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
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      padding: '12px 14px',
                      textAlign: 'left',
                      borderRadius: 6,
                      background: active
                        ? 'rgba(55, 242, 209, 0.10)'
                        : 'rgba(20, 12, 8, 0.4)',
                      border: `1px solid ${active ? 'var(--cc-teal)' : 'var(--cc-border)'}`,
                      transition: 'border-color .15s, background .15s',
                    }}
                  >
                    <div
                      className="cc-display"
                      style={{
                        fontSize: 16,
                        color: active ? 'var(--cc-teal)' : 'var(--cc-text)',
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

        {/* Single-subtype description (Human "Standard", Half-Orc
            "Standard") — render the same panel style as multi-subtype
            so the layout stays consistent. */}
        {race.subtypes.length === 1 && selectedSubraceDesc && (
          <div
            className="cc-italic-serif"
            style={{
              fontSize: 14,
              color: 'var(--cc-text-dim)',
              lineHeight: 1.5,
              padding: '12px 14px',
              background: 'rgba(20, 12, 8, 0.4)',
              borderRadius: 6,
              borderLeft: '3px solid var(--cc-teal)',
            }}
          >
            {selectedSubraceDesc}
          </div>
        )}
      </div>
    </div>
  );
}

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
        borderRadius: 6,
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
          background: active
            ? 'radial-gradient(circle, rgba(255, 83, 0, 0.22) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(212, 169, 81, 0.08) 0%, transparent 70%)',
          filter: active ? 'none' : 'grayscale(0.4) opacity(0.85)',
        }}
      >
        {race.icon ? (
          <img src={race.icon} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
        ) : (
          <span
            className="cc-display"
            style={{
              fontSize: 22,
              color: active ? 'var(--cc-orange-soft)' : 'var(--cc-gold-soft)',
              lineHeight: 1,
            }}
          >
            {race.name?.charAt(0) || '?'}
          </span>
        )}
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

// ============================================================================
// Background section — chip grid with selected-background block
// ============================================================================
function BackgroundSection({ value, selectedBackground, onChange }) {
  return (
    <div>
      <OrnateHeading>Background</OrnateHeading>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
          marginBottom: 18,
        }}
      >
        {backgrounds.map((bg) => {
          const active = value === bg.name;
          return (
            <button
              key={bg.name}
              type="button"
              onClick={() => onChange(bg.name)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '10px 12px',
                textAlign: 'left',
                borderRadius: 6,
                background: active ? 'rgba(212, 169, 81, 0.10)' : 'rgba(20, 12, 8, 0.4)',
                border: `1px solid ${active ? 'var(--cc-gold)' : 'var(--cc-border)'}`,
                transition: 'all .15s',
              }}
            >
              <div
                className="cc-display"
                style={{
                  fontSize: 15,
                  color: active ? 'var(--cc-gold)' : 'var(--cc-text)',
                  letterSpacing: 0.3,
                }}
              >
                {bg.name}
              </div>
            </button>
          );
        })}
      </div>

      {selectedBackground && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            padding: '16px 20px',
            background: 'rgba(20, 12, 8, 0.5)',
            borderRadius: 6,
            borderLeft: '3px solid var(--cc-gold)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span
              className="cc-display"
              style={{
                fontSize: 22,
                color: 'var(--cc-orange-soft)',
                lineHeight: 1,
              }}
            >
              {selectedBackground.name}
            </span>
            <InfoTip>{tipFor("background")}</InfoTip>
          </div>
          <p
            className="cc-italic-serif"
            style={{
              fontSize: 14,
              color: 'var(--cc-text-dim)',
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            {selectedBackground.description}
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================================
// Identity Codex — right rail (Name + Level only — portrait & appearance
// live on later steps in this codebase, kept intentionally compact)
// ============================================================================
function IdentityCodex({ name, level, updateCharacterData }) {
  return (
    <div className="cc-panel-strong" style={{ padding: 24, position: 'relative' }}>
      <OrnateHeading>Codex</OrnateHeading>

      <div style={{ marginBottom: 16 }}>
        <div className="cc-label" style={{ marginBottom: 6 }}>
          Character Name <span style={{ color: 'var(--cc-orange)' }}>*</span>
        </div>
        <input
          className="cc-input"
          value={name || ''}
          onChange={(e) => updateCharacterData({ name: e.target.value })}
          placeholder="e.g. Kael Stormwhisper"
          maxLength={40}
          style={{ fontSize: 16 }}
        />
      </div>

      <div>
        <div className="cc-label" style={{ marginBottom: 6 }}>
          Level
        </div>
        <select
          className="cc-input"
          value={String(level || 1)}
          onChange={(e) => updateCharacterData({ level: parseInt(e.target.value, 10) })}
          style={{
            appearance: 'none',
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237B8AA0' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            paddingRight: 36,
          }}
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => (
            <option key={lvl} value={String(lvl)}>
              Level {lvl}
            </option>
          ))}
        </select>
      </div>

      <div
        className="cc-italic-serif"
        style={{
          marginTop: 18,
          fontSize: 12,
          color: 'var(--cc-text-faint)',
          lineHeight: 1.5,
        }}
      >
        Portrait, age, height, weight, and biography are set on the
        Class step — those fields haven't moved yet.
      </div>
    </div>
  );
}

// ============================================================================
// Helpers below this line are preserved from the pre-port file. They own
// the language-merge + brewery-picker behavior the visual port shouldn't
// touch.
// ============================================================================

// Compact tag chip used by the racial traits summary below the
// subrace description. Keeps the visual language consistent with the
// brewery picker chips further down the page.
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

// SRD racial traits summary — ability bonuses, speed, size, features,
// darkvision, and the base + bonus language list. If the race grants
// an extra language ("+1 choice" on the RACES registry, e.g. Human,
// Half-Elf), renders a picker and writes the combined set to
// characterData.languages so downstream steps see the full list.
function SrdRacialTraitsPanel({ raceName, subraceName, characterData, updateCharacterData }) {
  const tags = computeRacialTags(raceName, subraceName);
  if (!tags) return null;

  const bonusLangs = Array.isArray(characterData.bonus_languages)
    ? characterData.bonus_languages
    : [];

  // Keep characterData.languages in lockstep with fixed race langs +
  // picked bonus langs. Runs whenever the race, subrace, or bonus
  // list changes so a race swap doesn't leave stale languages.
  React.useEffect(() => {
    const merged = Array.from(new Set([...tags.fixedLangs, ...bonusLangs]));
    const current = Array.isArray(characterData.languages) ? characterData.languages : [];
    const same = merged.length === current.length && merged.every((l, i) => l === current[i]);
    if (!same) updateCharacterData({ languages: merged });
  }, [raceName, subraceName, tags.fixedLangs.join("|"), bonusLangs.join("|")]);

  // If a race swap removed eligible bonus slots, drop any stale picks.
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

// Bonus-language + skill-choice pickers for modded races. Rendered
// in-panel under the race description when the selected race is
// brewery-sourced and its schema includes picks.
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
