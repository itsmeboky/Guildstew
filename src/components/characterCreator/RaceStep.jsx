import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Flame, Shield, Eye, Sword, Wind, Droplet, Heart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

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

export default function RaceStep({ characterData, updateCharacterData }) {
  const [selectedRaceIndex, setSelectedRaceIndex] = useState(0);
  const [hoveredTrait, setHoveredTrait] = useState(null);
  const currentRace = races[selectedRaceIndex];
  const selectedBackground = backgrounds.find(b => b.name === characterData.background);

  const handleRaceChange = (direction) => {
    let newIndex = selectedRaceIndex + direction;
    if (newIndex < 0) newIndex = races.length - 1;
    if (newIndex >= races.length) newIndex = 0;
    setSelectedRaceIndex(newIndex);
    updateCharacterData({ 
      race: races[newIndex].name,
      subrace: races[newIndex].subtypes[0]
    });
  };

  React.useEffect(() => {
    if (!characterData.race) {
      updateCharacterData({ 
        race: currentRace.name,
        subrace: currentRace.subtypes[0]
      });
    } else {
      const initialRaceIndex = races.findIndex(race => race.name === characterData.race);
      if (initialRaceIndex !== -1 && initialRaceIndex !== selectedRaceIndex) {
        setSelectedRaceIndex(initialRaceIndex);
      }
    }
  }, [characterData.race, selectedRaceIndex, updateCharacterData, currentRace.name, currentRace.subtypes]);

  const selectedSubraceDesc = currentRace.subtypeDescriptions[characterData.subrace || currentRace.subtypes[0]];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-[1fr_1.2fr] gap-6"
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]">
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">Character Name</Label>
          <Input
            value={characterData.name}
            onChange={(e) => updateCharacterData({ name: e.target.value })}
            placeholder="Enter character name"
            className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white text-lg h-12 placeholder:text-white/30 focus:border-[#37F2D1]"
          />
        </div>

        <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]">
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">Level</Label>
          <Select
            value={characterData.level?.toString() || "1"}
            onValueChange={(value) => updateCharacterData({ level: parseInt(value) })}
          >
            <SelectTrigger className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white h-12 hover:border-[#37F2D1]/60 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2430] border-[#2A3441]">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((level) => (
                <SelectItem 
                  key={level} 
                  value={level.toString()} 
                  className="text-white hover:bg-[#2A3441] focus:bg-[#2A3441]"
                >
                  Level {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]">
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">Background</Label>
          <Select
            value={characterData.background}
            onValueChange={(value) => updateCharacterData({ background: value })}
          >
            <SelectTrigger className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white h-12 hover:border-[#37F2D1]/60 transition-colors">
              <SelectValue placeholder="Select background" />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2430] border-[#2A3441]">
              {backgrounds.map((bg) => (
                <SelectItem 
                  key={bg.name} 
                  value={bg.name} 
                  className="text-white hover:bg-[#2A3441] focus:bg-[#2A3441]"
                >
                  {bg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedBackground && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-[#2A3441]/50 rounded-lg p-3 mt-3 border border-[#37F2D1]/20"
            >
              <p className="text-sm text-white/80 leading-relaxed">{selectedBackground.description}</p>
            </motion.div>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentRace.name}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => handleRaceChange(-1)}
              className="text-[#FF5722] hover:text-[#FF6B3D] transition-colors bg-[#2A3441]/50 rounded-lg p-2 hover:bg-[#2A3441]"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <img src={currentRace.icon} alt={currentRace.name} className="w-12 h-12" />
              <h2 className="text-2xl font-bold text-white">
                {currentRace.name}
              </h2>
            </div>
            <button
              onClick={() => handleRaceChange(1)}
              className="text-[#FF5722] hover:text-[#FF6B3D] transition-colors bg-[#2A3441]/50 rounded-lg p-2 hover:bg-[#2A3441]"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-4">
            <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">Subrace</Label>
            <Select
              value={characterData.subrace || currentRace.subtypes[0]}
              onValueChange={(value) => updateCharacterData({ subrace: value })}
            >
              <SelectTrigger className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white h-12 hover:border-[#37F2D1]/60 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E2430] border-[#2A3441]">
                {currentRace.subtypes.map((subtype) => (
                  <SelectItem 
                    key={subtype} 
                    value={subtype} 
                    className="text-white hover:bg-[#2A3441] focus:bg-[#2A3441]"
                  >
                    {subtype}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-2 mb-4">
            {currentRace.traits.map((trait, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                className="relative bg-[#2A3441]/50 border border-[#FF5722]/30 rounded-lg p-3 cursor-pointer transition-all hover:border-[#FF5722]/60 hover:bg-[#2A3441]/70"
                onMouseEnter={() => setHoveredTrait(idx)}
                onMouseLeave={() => setHoveredTrait(null)}
              >
                <div className="flex items-center gap-2">
                  <trait.icon className="w-5 h-5 text-[#FF5722]" />
                  <span className="font-semibold text-white text-sm">{trait.name}</span>
                </div>
                <AnimatePresence>
                  {hoveredTrait === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 pt-2 border-t border-[#FF5722]/20"
                    >
                      <p className="text-xs text-white/70 leading-relaxed">{trait.description}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <div className="bg-[#2A3441]/50 rounded-lg p-4 mb-3 border border-[#37F2D1]/20">
            <h4 className="text-[#37F2D1] font-semibold mb-2 text-sm">Race Description</h4>
            <p className="text-white/70 leading-relaxed text-xs">
              {currentRace.description}
            </p>
          </div>

          {selectedSubraceDesc && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#2A3441]/50 rounded-lg p-4 border border-[#5B4B9E]/20"
            >
              <h4 className="text-[#5B4B9E] font-semibold mb-2 text-sm">
                {characterData.subrace || currentRace.subtypes[0]}
              </h4>
              <p className="text-white/70 leading-relaxed text-xs">
                {selectedSubraceDesc}
              </p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}