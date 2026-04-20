
import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, User, Move, ZoomIn, ZoomOut, Save, Pencil, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  CLASS_HIT_DICE,
  CLASS_SAVING_THROWS,
  CLASS_PRIMARY_ABILITY,
  CLASS_ARMOR_PROFICIENCIES,
  CLASS_WEAPON_PROFICIENCIES,
  ABILITY_NAMES,
} from '@/components/dnd5e/dnd5eRules';
import { getModdedClasses } from '@/lib/modEngine';
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

// Normalize a brewery class (modEngine metadata shape) into the
// same shape the SRD class list uses. Keeps provenance (_source,
// _mod_id, _raw) so later steps can read the full class schema.
function normalizeBreweryClass(mod) {
  const features = Array.isArray(mod.features) ? mod.features : [];
  const level1Features = features
    .filter((f) => Number(f?.level) === 1 && !f?.is_asi)
    .map((f) => f?.name)
    .filter(Boolean);
  const savePrimary = Array.isArray(mod.saving_throws) && mod.saving_throws.length > 0
    ? ABILITY_NAMES[mod.saving_throws[0]?.toLowerCase?.() || ""] || mod.saving_throws[0]
    : "";
  return {
    name: mod.name || mod._mod_name || "Unnamed Class",
    description: mod.description || "",
    playstyle: "",
    hitDie: mod.hit_die || "d8",
    primaryAbility: savePrimary,
    savingThrows: Array.isArray(mod.saving_throws)
      ? mod.saving_throws.map((s) => ABILITY_NAMES[s?.toLowerCase?.() || ""] || s)
      : [],
    features: level1Features,
    icon: mod.image_url || "",
    _source: "brewery",
    _mod_id: mod._mod_id,
    _mod_name: mod._mod_name || mod.name,
    _raw: mod,
  };
}

const classes = [
  {
    name: "Barbarian",
    description: "Barbarians are fierce warriors from the edges of civilization who draw upon primal rage in battle. They possess unmatched physical prowess and can enter a berserker fury that makes them nearly unstoppable. Barbarians are at their best when charging into the thick of combat. With the highest hit points of any class, they can take tremendous punishment while dishing out devastating melee damage. They are mobile, hard-hitting warriors who excel at breaking enemy lines.",
    playstyle: "Best for players who want to be the toughest character in combat, dealing massive damage while shrugging off hits. Perfect if you enjoy straightforward, aggressive gameplay without complex spellcasting.",
    hitDie: "d12",
    primaryAbility: "Strength",
    savingThrows: ["Strength", "Constitution"],
    features: ["Rage", "Unarmored Defense"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a6652f2d8_Barbarian1.png"
  },
  {
    name: "Bard",
    description: "Bards are versatile performers who use music and magic to inspire allies and hinder foes. Masters of song, speech, and the magic they contain, bards are talented musicians and storytellers. They weave magic through words and music, bringing inspiration to allies and doom to enemies. Bards have access to a wide variety of spells and are exceptional at supporting their party. Their versatility allows them to fill almost any role needed.",
    playstyle: "Ideal for players who enjoy versatility and support. Bards excel at buffing allies, debuffing enemies, and solving problems creatively. Perfect for social encounters and those who like having many options.",
    hitDie: "d8",
    primaryAbility: "Charisma",
    savingThrows: ["Dexterity", "Charisma"],
    features: ["Spellcasting", "Bardic Inspiration"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/cbe7f7dba_Bard1.png"
  },
  {
    name: "Cleric",
    description: "Clerics are divine spellcasters who serve the gods and channel holy power. They combine potent spellcasting with the ability to wear armor and fight in melee. Clerics can heal wounds, protect allies, and smite enemies with divine magic. They're versatile enough to serve as frontline fighters or supportive healers. Different divine domains grant them unique powers and abilities.",
    playstyle: "Great for players who want to support their team while remaining effective in combat. Clerics are essential party members who can adapt to many situations. Perfect for those who enjoy being prepared for anything.",
    hitDie: "d8",
    primaryAbility: "Wisdom",
    savingThrows: ["Wisdom", "Charisma"],
    features: ["Spellcasting", "Divine Domain"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/15fe6ef24_Cleric1.png"
  },
  {
    name: "Druid",
    description: "Druids are nature-focused spellcasters who can transform into animals. They draw their power from nature itself and serve as guardians of the wild. Druids have access to potent healing and battlefield control spells. Their Wild Shape ability allows them to become beasts, making them incredibly versatile. They excel at controlling the battlefield and adapting to any situation through transformation.",
    playstyle: "Perfect for players who love nature themes and want ultimate versatility. Wild Shape lets you become a bear, wolf, or other beasts for different situations. Great for creative problem-solving.",
    hitDie: "d8",
    primaryAbility: "Wisdom",
    savingThrows: ["Intelligence", "Wisdom"],
    features: ["Spellcasting", "Wild Shape"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/ef43c9ff2_Druid1.png"
  },
  {
    name: "Fighter",
    description: "Fighters are masters of martial combat and weaponry. They have unparalleled weapon training and can use any armor or weapon. Fighters are the most customizable class, with numerous fighting styles and subclasses. They excel in sustained combat and can make multiple attacks per turn. Whether using sword and shield, wielding a massive weapon, or fighting with precision, fighters dominate the battlefield.",
    playstyle: "Best for players who want to focus on mastering weapons and combat tactics. Fighters are reliable, powerful, and straightforward. Perfect for those new to D&D or who prefer tactical combat.",
    hitDie: "d10",
    primaryAbility: "Strength or Dexterity",
    savingThrows: ["Strength", "Constitution"],
    features: ["Fighting Style", "Second Wind"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/5e1b2cd68_Fighter1.png"
  },
  {
    name: "Monk",
    description: "Monks are martial artists who harness ki energy to perform supernatural feats. They combine unarmed strikes with mystical energy manipulation. Monks are incredibly mobile and can deliver a flurry of attacks each turn. They dodge attacks with supernatural grace and can catch arrows in mid-flight. Their connection to ki energy allows them to channel elemental forces and perform impossible martial techniques.",
    playstyle: "Ideal for players who want high mobility and lots of attacks. Monks are tactical and rewarding to play, with unique mechanics. Great for fans of martial arts fantasy.",
    hitDie: "d8",
    primaryAbility: "Dexterity & Wisdom",
    savingThrows: ["Strength", "Dexterity"],
    features: ["Unarmored Defense", "Martial Arts"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/f2e85e13a_Monk1.png"
  },
  {
    name: "Paladin",
    description: "Paladins are holy warriors bound by sacred oaths. They combine divine magic with martial prowess to smite evil. Paladins can heal allies, protect the innocent, and channel divine power through their weapons. Their oath grants them unique abilities and spells. They are natural leaders who inspire their allies with their unwavering conviction. Their Divine Smite ability makes them devastating against evil creatures.",
    playstyle: "Perfect for players who want to be a frontline fighter with support capabilities. Paladins are tough, deal good damage, and can heal. Ideal for those who enjoy playing heroes with strong moral codes.",
    hitDie: "d10",
    primaryAbility: "Strength & Charisma",
    savingThrows: ["Wisdom", "Charisma"],
    features: ["Divine Sense", "Lay on Hands"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/1eb7cd2f2_Paladin1.png"
  },
  {
    name: "Ranger",
    description: "Rangers are skilled hunters and wilderness warriors. They combine martial prowess with nature magic and tracking abilities. Rangers excel at fighting specific enemy types and navigating natural environments. They can use both melee and ranged weapons effectively. Their connection to nature grants them spellcasting and the ability to have an animal companion. They are masters of survival and excel at reconnaissance.",
    playstyle: "Great for players who want a mix of combat and exploration skills. Rangers are versatile and self-sufficient. Perfect for those who enjoy nature themes and tactical positioning.",
    hitDie: "d10",
    primaryAbility: "Dexterity & Wisdom",
    savingThrows: ["Strength", "Dexterity"],
    features: ["Favored Enemy", "Natural Explorer"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/748e5be38_Ranger1.png"
  },
  {
    name: "Rogue",
    description: "Rogues are stealthy tricksters who strike from the shadows with deadly precision. They excel at dealing massive damage to single targets through sneak attacks. Rogues are masters of stealth, locks, and traps. Their cunning and quick reflexes make them invaluable for reconnaissance and infiltration. They can avoid damage through evasion and have numerous skills. Rogues are the ultimate skill specialists.",
    playstyle: "Best for players who enjoy tactical positioning and big damage numbers. Rogues reward clever play and careful planning. Perfect for those who like stealth, skills, and being the party's scout.",
    hitDie: "d8",
    primaryAbility: "Dexterity",
    savingThrows: ["Dexterity", "Intelligence"],
    features: ["Sneak Attack", "Thieves' Cant"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a66f2aac1_Rogue1.png"
  },
  {
    name: "Sorcerer",
    description: "Sorcerers are natural spellcasters born with innate magical power. Unlike wizards who study magic, sorcerers channel raw magical energy through their bloodline. They can manipulate their spells using Metamagic, bending magic to their will. Sorcerers have fewer spells known than wizards but can cast them more flexibly. Their magical origin grants them unique abilities. They excel at sustained magical combat.",
    playstyle: "Ideal for players who want to be powerful spellcasters with unique abilities. Sorcerers can modify their spells in creative ways. Great for those who enjoy magic but want spontaneity over preparation.",
    hitDie: "d6",
    primaryAbility: "Charisma",
    savingThrows: ["Constitution", "Charisma"],
    features: ["Spellcasting", "Sorcerous Origin"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/6f5b501db_Sorceror1.png"
  },
  {
    name: "Warlock",
    description: "Warlocks gain their power through a pact with a powerful otherworldly being. This patron grants them magical abilities and eldritch powers. Warlocks have fewer spell slots than other casters but they recharge on short rests. They gain powerful invocations that customize their abilities. Their Eldritch Blast is the most reliable magical attack in the game. They blend magic with unique supernatural abilities granted by their patron.",
    playstyle: "Perfect for players who want consistent magical damage with interesting abilities. Warlocks are reliable and have great customization. Ideal for those who enjoy pacts, mysteries, and eldritch themes.",
    hitDie: "d8",
    primaryAbility: "Charisma",
    savingThrows: ["Wisdom", "Charisma"],
    features: ["Otherworldly Patron", "Pact Magic"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/184c98268_Warlock1.png"
  },
  {
    name: "Wizard",
    description: "Wizards are scholarly spellcasters who master arcane magic through study. They have the largest spell list of any class and can prepare different spells each day. Wizards learn spells from scrolls and other wizards' spellbooks. Their versatility is unmatched as they can have the perfect spell for almost any situation. They are masters of arcane knowledge. Wizards shape reality itself through their mastery of magic.",
    playstyle: "Best for players who enjoy strategic planning and having a solution for everything. Wizards are the ultimate utility casters. Perfect for those who love magic, learning, and preparation.",
    hitDie: "d6",
    primaryAbility: "Intelligence",
    savingThrows: ["Intelligence", "Wisdom"],
    features: ["Spellcasting", "Arcane Recovery"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/94cfaa28a_Wizard1.png"
  }
];

// Overlay registry rules data onto the presentation array so the
// render always shows the canonical hit die, saves, etc. from the
// single source of truth without losing descriptions / icons.
classes.forEach((cls) => {
  const name = cls.name;
  cls.hitDie = `d${CLASS_HIT_DICE[name] || 8}`;
  cls.primaryAbility = ABILITY_NAMES[CLASS_PRIMARY_ABILITY[name]] || cls.primaryAbility;
  cls.savingThrows = (CLASS_SAVING_THROWS[name] || []).map(
    (ab) => ABILITY_NAMES[ab] || ab,
  );
});

const alignments = [
  {
    name: "Lawful Good",
    description: "Believes in honor, compassion, and helping others while respecting laws and order. Think noble paladins and righteous heroes."
  },
  {
    name: "Neutral Good",
    description: "Does good because it's right, regardless of laws. Helps others and fights evil pragmatically. Think kind-hearted adventurers."
  },
  {
    name: "Chaotic Good",
    description: "Values freedom and kindness above all. Does good but dislikes rules and authority. Think Robin Hood or rebel heroes."
  },
  {
    name: "Lawful Neutral",
    description: "Values order, tradition, and law above all else. Neither particularly good nor evil. Think judges or soldiers following orders."
  },
  {
    name: "True Neutral",
    description: "Balanced and pragmatic. Doesn't lean toward law or chaos, good or evil. Acts based on situation. Think druids protecting natural balance."
  },
  {
    name: "Chaotic Neutral",
    description: "Values personal freedom above all. Unpredictable and follows their whims. Neither cruel nor caring. Think free spirits and wanderers."
  },
  {
    name: "Lawful Evil",
    description: "Uses laws and systems to gain power and hurt others methodically. Think tyrants and corrupt officials."
  },
  {
    name: "Neutral Evil",
    description: "Purely selfish and does whatever benefits them. No loyalty to law or chaos. Think mercenaries and opportunists."
  },
  {
    name: "Chaotic Evil",
    description: "Destroys and causes suffering for pleasure. Values freedom to do terrible things. Think demons and psychopaths."
  }
];

const companionTypes = {
  Paladin: { name: "Mount", description: "Your loyal steed that accompanies you in battle" },
  Ranger: { name: "Animal Companion", description: "Your beast companion that fights alongside you" },
  Warlock: { name: "Patron", description: "The otherworldly entity you made a pact with" },
  Wizard: { name: "Familiar", description: "Your magical companion that serves and scouts for you" },
  Druid: { name: "Animal Companion", description: "A creature of nature bonded to you" }
};

export default function ClassStep({ characterData, updateCharacterData, campaignId }) {
  // Modded classes only appear when the creator is opened against a
  // campaign — library-only characters can't depend on a campaign's
  // installed mods, so brewery classes are hidden there.
  const { data: moddedClasses = [] } = useQuery({
    queryKey: ["characterCreator", "moddedClasses", campaignId],
    queryFn: () => getModdedClasses(campaignId),
    enabled: !!campaignId,
    initialData: [],
  });

  const combinedClasses = React.useMemo(() => {
    if (!moddedClasses || moddedClasses.length === 0) return classes;
    return [...classes, ...moddedClasses.map(normalizeBreweryClass)];
  }, [moddedClasses]);

  const [uploading, setUploading] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCompanion, setUploadingCompanion] = useState(false);
  const [fullBodyPosition, setFullBodyPosition] = useState(characterData.avatar_position || { x: 0, y: 0 });
  const [fullBodyZoom, setFullBodyZoom] = useState(characterData.avatar_zoom || 1);
  const [profilePosition, setProfilePosition] = useState(characterData.profile_position || { x: 0, y: 0 });
  const [profileZoom, setProfileZoom] = useState(characterData.profile_zoom || 1);
  const [isDraggingFull, setIsDraggingFull] = useState(false);
  const [isDraggingProfile, setIsDraggingProfile] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [fullBodySaved, setFullBodySaved] = useState(!!characterData.avatar_position);
  const [profileSaved, setProfileSaved] = useState(!!characterData.profile_position);
  
  const selectedClass = combinedClasses.find(c => c.name === characterData.class);
  const selectedAlignment = alignments.find(a => a.name === characterData.alignment);
  const companionInfo = companionTypes[characterData.class];

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateCharacterData({ avatar_url: file_url });
      setFullBodyPosition({ x: 0, y: 0 });
      setFullBodyZoom(1);
      setFullBodySaved(false);
      toast.success("Portrait uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProfile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateCharacterData({ profile_avatar_url: file_url });
      setProfilePosition({ x: 0, y: 0 });
      setProfileZoom(1);
      setProfileSaved(false);
      toast.success("Profile picture uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleCompanionImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCompanion(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateCharacterData({ companion_image: file_url });
      toast.success(`${companionInfo.name} image uploaded!`);
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingCompanion(false);
    }
  };

  const handleMouseDown = (e, type) => {
    e.preventDefault();
    if (type === 'full' && !fullBodySaved) {
      setIsDraggingFull(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (type === 'profile' && !profileSaved) {
      setIsDraggingProfile(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (isDraggingFull) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setFullBodyPosition(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDraggingProfile) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setProfilePosition(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingFull(false);
    setIsDraggingProfile(false);
  };

  useEffect(() => {
    if (isDraggingFull || isDraggingProfile) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingFull, isDraggingProfile, dragStart]);

  const profileImageUrl = characterData.profile_avatar_url || characterData.avatar_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-2 gap-6"
    >
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">Class</Label>
          <Select
            value={characterData.class}
            onValueChange={(value) => {
              const cls = combinedClasses.find(c => c.name === value);
              updateCharacterData({
                class: value,
                features: (cls?.features || []).map(f => ({ name: f, source: value, description: "" }))
              });
            }}
          >
            <SelectTrigger className="bg-[#2A3441]/80 border-[#37F2D1]/30 text-white text-base h-12 hover:border-[#37F2D1]/60 transition-colors">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2430] border-[#2A3441]">
              {combinedClasses.map((cls) => (
                <SelectItem
                  key={cls.name}
                  value={cls.name}
                  className="text-white hover:bg-[#2A3441] focus:bg-[#2A3441]"
                >
                  <span className="inline-flex items-center gap-2">
                    {cls.name}
                    {cls._source === "brewery" && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#050816] bg-[#37F2D1] rounded px-1 py-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Brewery
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {selectedClass && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
          >
            <div className="flex items-center gap-4 mb-4">
              {selectedClass.icon ? (
                <img src={selectedClass.icon} alt={selectedClass.name} className="w-20 h-20 object-contain" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#37F2D1]/30 to-[#8B5CF6]/30 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-[#37F2D1]" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-2xl font-bold text-white">{selectedClass.name}</h3>
                  {selectedClass._source === "brewery" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#050816] bg-[#37F2D1] rounded px-1.5 py-0.5">
                      <Sparkles className="w-3 h-3" /> Brewery
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/60 mt-1">Hit Die: {selectedClass.hitDie}</p>
              </div>
            </div>
            <p className="text-white/80 mb-4 text-sm leading-relaxed">{selectedClass.description}</p>
            <div className="bg-[#37F2D1]/10 rounded-lg p-4 mb-4 border border-[#37F2D1]/20">
              <p className="text-xs font-semibold text-[#37F2D1] mb-2">💡 PLAYSTYLE TIP</p>
              <p className="text-sm text-white/80">{selectedClass.playstyle}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Primary Ability:</span>
                <span className="text-[#37F2D1] font-semibold">{selectedClass.primaryAbility}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Saving Throws:</span>
                <span className="text-white">{selectedClass.savingThrows.join(", ")}</span>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">Alignment</Label>
          <Select
            value={characterData.alignment}
            onValueChange={(value) => updateCharacterData({ alignment: value })}
          >
            <SelectTrigger className="bg-[#2A3441]/80 border-[#37F2D1]/30 text-white h-12 hover:border-[#37F2D1]/60 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2430] border-[#2A3441]">
              {alignments.map((align) => (
                <SelectItem 
                  key={align.name} 
                  value={align.name} 
                  className="text-white hover:bg-[#2A3441] focus:bg-[#2A3441]"
                >
                  {align.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedAlignment && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-[#2A3441]/50 rounded-lg p-3 mt-3 border border-[#37F2D1]/20"
            >
              <p className="text-sm text-white/80">{selectedAlignment.description}</p>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <Label className="text-white/70 mb-4 block text-sm uppercase tracking-wide">Physical Details</Label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-white/50 text-xs mb-1 block">Age</Label>
              <Input
                type="number"
                value={characterData.appearance?.age || ""}
                onChange={(e) => updateCharacterData({
                  appearance: { ...characterData.appearance, age: parseInt(e.target.value) }
                })}
                placeholder="25"
                className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white h-10 focus:border-[#37F2D1]"
              />
            </div>
            <div>
              <Label className="text-white/50 text-xs mb-1 block">Height</Label>
              <Input
                value={characterData.appearance?.height || ""}
                onChange={(e) => updateCharacterData({
                  appearance: { ...characterData.appearance, height: e.target.value }
                })}
                placeholder="5'10&quot;"
                className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white h-10 focus:border-[#37F2D1]"
              />
            </div>
            <div>
              <Label className="text-white/50 text-xs mb-1 block">Weight</Label>
              <Input
                value={characterData.appearance?.weight || ""}
                onChange={(e) => updateCharacterData({
                  appearance: { ...characterData.appearance, weight: e.target.value }
                })}
                placeholder="180 lbs"
                className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white h-10 focus:border-[#37F2D1]"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">Biography</Label>
          <Textarea
            value={characterData.description}
            onChange={(e) => updateCharacterData({ description: e.target.value })}
            placeholder="Write your character's story..."
            className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white min-h-32 focus:border-[#37F2D1] resize-none"
          />
        </motion.div>

        {companionInfo && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#5B4B9E]/30"
          >
            <h3 className="text-base font-bold text-[#5B4B9E] mb-1">{companionInfo.name}</h3>
            <p className="text-xs text-white/60 mb-4">{companionInfo.description}</p>
            
            <div className="space-y-3">
              <div className="w-full aspect-square rounded-xl bg-[#2A3441]/50 overflow-hidden border border-[#5B4B9E]/20">
                {characterData.companion_image ? (
                  <img
                    src={characterData.companion_image}
                    alt={companionInfo.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-white/20" />
                  </div>
                )}
              </div>

              <Button
                onClick={() => document.getElementById('companion-upload').click()}
                disabled={uploadingCompanion}
                className="w-full bg-[#5B4B9E]/90 hover:bg-[#5B4B9E] text-white"
                size="sm"
              >
                <Upload className="w-3 h-3 mr-2" />
                {uploadingCompanion ? 'Uploading...' : `Upload Image`}
              </Button>
              <input
                type="file"
                id="companion-upload"
                accept="image/*"
                onChange={handleCompanionImageUpload}
                className="hidden"
              />

              <div>
                <Label className="text-white/50 mb-1 block text-xs">Name</Label>
                <Input
                  value={characterData.companion_name || ""}
                  onChange={(e) => updateCharacterData({ companion_name: e.target.value })}
                  placeholder={`${companionInfo.name} name`}
                  className="bg-[#2A3441]/80 border-[#5B4B9E]/20 text-white text-sm h-9 focus:border-[#5B4B9E]"
                />
              </div>

              <div>
                <Label className="text-white/50 mb-1 block text-xs">Background</Label>
                <Textarea
                  value={characterData.companion_background || ""}
                  onChange={(e) => updateCharacterData({ companion_background: e.target.value })}
                  placeholder={`Tell the story of your ${companionInfo.name.toLowerCase()}...`}
                  className="bg-[#2A3441]/80 border-[#5B4B9E]/20 text-white text-sm min-h-20 resize-none focus:border-[#5B4B9E]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <Label className="text-white/70 mb-3 block text-sm uppercase tracking-wide">Full Character Portrait</Label>
          <div 
            className="relative overflow-hidden rounded-xl bg-[#2A3441]/50 mx-auto border border-[#37F2D1]/20"
            style={{ aspectRatio: '2/3', width: '100%' }}
          >
            {characterData.avatar_url ? (
              <>
                <img
                  src={characterData.avatar_url}
                  alt="Character"
                  className={fullBodySaved ? "absolute" : "absolute cursor-move"}
                  style={{
                    transform: `translate(${fullBodyPosition.x}px, ${fullBodyPosition.y}px) scale(${fullBodyZoom})`,
                    transformOrigin: 'center center',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: fullBodySaved ? 'none' : 'auto'
                  }}
                  onMouseDown={(e) => handleMouseDown(e, 'full')}
                  draggable={false}
                />
                {!fullBodySaved && (
                  <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-white text-xs">
                      <Move className="w-3 h-3" />
                      <span>Drag to reposition</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ZoomOut className="w-3 h-3 text-white" />
                      <Slider
                        value={[fullBodyZoom]}
                        onValueChange={(val) => setFullBodyZoom(val[0])}
                        min={0.5}
                        max={3}
                        step={0.1}
                        className="flex-1"
                      />
                      <ZoomIn className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}
                {fullBodySaved && (
                  <button
                    onClick={() => setFullBodySaved(false)}
                    className="absolute top-3 right-3 bg-[#FF5722] hover:bg-[#FF6B3D] text-white p-2 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <User className="w-20 h-20 text-white/20 mb-3" />
                <p className="text-white/40 text-center px-4 text-sm">Upload character portrait</p>
              </div>
            )}
          </div>
          {characterData.avatar_url && !fullBodySaved && (
            <Button
              onClick={() => {
                setFullBodySaved(true);
                updateCharacterData({ 
                  avatar_position: fullBodyPosition,
                  avatar_zoom: fullBodyZoom
                });
              }}
              className="w-full mt-3 bg-[#37F2D1] hover:bg-[#37F2D1]/80 text-[#1E2430]"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Position
            </Button>
          )}
          <Button
            onClick={() => document.getElementById('avatar-upload').click()}
            disabled={uploading}
            className="w-full mt-3 bg-[#FF5722]/90 hover:bg-[#FF5722] text-white border-0"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Portrait'}
          </Button>
          <input
            type="file"
            id="avatar-upload"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <Label className="text-white/70 mb-3 block text-sm uppercase tracking-wide">Profile Picture</Label>
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-[#2A3441]/50 overflow-hidden border-2 border-[#FF5722]/50 relative">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className={profileSaved ? "absolute" : "absolute cursor-move"}
                    style={{
                      transform: `translate(${profilePosition.x}px, ${profilePosition.y}px) scale(${profileZoom})`,
                      transformOrigin: 'center center',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      pointerEvents: profileSaved ? 'none' : 'auto'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'profile')}
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-white/20" />
                  </div>
                )}
              </div>
              {profileSaved && profileImageUrl && (
                <button
                  onClick={() => setProfileSaved(false)}
                  className="absolute -top-1 -right-1 bg-[#FF5722] hover:bg-[#FF6B3D] text-white p-1.5 rounded-full transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          {profileImageUrl && !profileSaved && (
            <div className="mt-3 bg-[#2A3441]/50 rounded-lg p-3 border border-[#FF5722]/20">
              <div className="flex items-center gap-2 text-white/70 text-xs mb-2">
                <Move className="w-3 h-3" />
                <span>Drag to reposition</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <ZoomOut className="w-3 h-3 text-white/70" />
                <Slider
                  value={[profileZoom]}
                  onValueChange={(val) => setProfileZoom(val[0])}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <ZoomIn className="w-3 h-3 text-white/70" />
              </div>
              <Button
                onClick={() => {
                  setProfileSaved(true);
                  updateCharacterData({
                    profile_position: profilePosition,
                    profile_zoom: profileZoom
                  });
                }}
                className="w-full bg-[#37F2D1] hover:bg-[#37F2D1]/80 text-[#1E2430]"
                size="sm"
              >
                <Save className="w-3 h-3 mr-2" />
                Save Position
              </Button>
            </div>
          )}
          <Button
            onClick={() => document.getElementById('profile-upload').click()}
            disabled={uploadingProfile}
            className="w-full mt-3 bg-[#FF5722]/90 hover:bg-[#FF5722] text-white"
            size="sm"
          >
            <Upload className="w-3 h-3 mr-2" />
            {uploadingProfile ? 'Uploading...' : 'Upload Profile Photo'}
          </Button>
          <input
            type="file"
            id="profile-upload"
            accept="image/*"
            onChange={handleProfileImageUpload}
            className="hidden"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
