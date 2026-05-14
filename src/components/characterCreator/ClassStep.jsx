
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, User, Move, ZoomIn, ZoomOut, Save, Pencil, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";
import {
  CLASS_HIT_DICE,
  CLASS_SAVING_THROWS,
  primaryAbilityDisplay,
  CLASS_ARMOR_PROFICIENCIES,
  CLASS_WEAPON_PROFICIENCIES,
  ABILITY_NAMES,
} from '@/components/dnd5e/dnd5eRules';
import { getModdedClasses } from '@/lib/modEngine';
import {
  applyBreweryClassBaseline,
  clearBreweryClassMarkers,
  getBreweryClassFeaturesAtLevel,
  getBreweryClassAsiLevels,
  getBreweryClassResource,
} from '@/lib/breweryClassApply';
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import CompanionPicker from "@/components/characterCreator/CompanionPicker";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";

// Family label rendered above the class name in the featured tome.
// Mirrors the prototype's classFamily() flavor map.
const CLASS_FAMILY = {
  Barbarian: "Primal", Bard: "Lyric", Cleric: "Divine", Druid: "Wild",
  Fighter: "Steelborn", Monk: "Disciplined", Paladin: "Sworn",
  Ranger: "Wandering", Rogue: "Roguish", Sorcerer: "Innate",
  Warlock: "Pact-Bound", Wizard: "Studied",
};

// Class-tinted accent color used by the featured tome's hit-die /
// primary / saves chips, the playstyle callout border, and the
// build summary heading. Matches the prototype's per-class palette.
const CLASS_ACCENT = {
  Barbarian: "#E03A3A", Bard:      "#D4A951",
  Cleric:    "#FFD27D", Druid:     "#37F2D1",
  Fighter:   "#A8B0BB", Monk:      "#FF9933",
  Paladin:   "#FFE680", Ranger:    "#7AB55F",
  Rogue:     "#9E5BFF", Sorcerer:  "#FF5722",
  Warlock:   "#9E5BFF", Wizard:    "#5B9CFF",
};

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
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/4ee7d7898_Monk1.png"
  },
  {
    name: "Paladin",
    description: "Paladins are holy warriors bound by sacred oaths to fight evil and protect the innocent. They combine martial prowess with divine magic. Paladins can heal wounds, smite enemies with radiant damage, and inspire allies with their auras. They're durable frontline fighters who also support their party. Their oaths grant them unique abilities and shape their character's morality.",
    playstyle: "Great for players who want a hero who fights for justice. Paladins are powerful in melee, can heal, and have devastating smite attacks. Perfect for those who enjoy roleplaying noble characters.",
    hitDie: "d10",
    primaryAbility: "Strength & Charisma",
    savingThrows: ["Wisdom", "Charisma"],
    features: ["Divine Sense", "Lay on Hands"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/f4a25cc1f_Paladin1.png"
  },
  {
    name: "Ranger",
    description: "Rangers are skilled hunters and trackers who blend martial combat with nature magic. They're masters of the wilderness and excel at fighting specific types of enemies. Rangers can fight with both melee weapons and bows, often using two weapons at once. They have animal companions and can navigate difficult terrain. Their connection to nature grants them magical abilities and survival skills.",
    playstyle: "Perfect for players who love wilderness adventures and combining magic with combat. Rangers are great at ranged attacks, tracking, and have a beloved animal companion. Ideal for outdoor campaigns.",
    hitDie: "d10",
    primaryAbility: "Dexterity & Wisdom",
    savingThrows: ["Strength", "Dexterity"],
    features: ["Favored Enemy", "Natural Explorer"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/eed59ea36_Ranger1.png"
  },
  {
    name: "Rogue",
    description: "Rogues rely on stealth, skill, and cunning rather than brute strength. They're masters of stealth, deception, and precision attacks. Rogues excel at sneak attacks that deal massive damage to surprised enemies. They're skilled at picking locks, disarming traps, and navigating social situations. Their expertise in various skills makes them incredibly versatile outside of combat.",
    playstyle: "Best for players who enjoy stealth, skill use, and tactical combat. Rogues deal high damage with sneak attacks and excel at scouting and infiltration. Great for clever players.",
    hitDie: "d8",
    primaryAbility: "Dexterity",
    savingThrows: ["Dexterity", "Intelligence"],
    features: ["Sneak Attack", "Thieves' Cant"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/eddae7d4e_Rogue1.png"
  },
  {
    name: "Sorcerer",
    description: "Sorcerers are innate spellcasters with magic flowing in their blood. They can manipulate their spells in unique ways through metamagic. Sorcerers have fewer spells than wizards but can modify them on the fly to be more powerful, reach more targets, or have unusual effects. Their bloodline grants them additional magical abilities. They're flexible spellcasters who can adapt to many situations.",
    playstyle: "Ideal for players who want powerful spell modifications and dynamic magic. Sorcerers can twist spells to do amazing things mid-cast. Perfect for those who enjoy creative spellcasting.",
    hitDie: "d6",
    primaryAbility: "Charisma",
    savingThrows: ["Constitution", "Charisma"],
    features: ["Spellcasting", "Sorcerous Origin"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/bcebcaf04_Sorcerer1.png"
  },
  {
    name: "Warlock",
    description: "Warlocks gain magical power through pacts with otherworldly entities. Their patron grants them unique abilities and spells in exchange for service. Warlocks have fewer spell slots but their spells are always cast at their highest level. They have powerful invocations that grant additional abilities. Their pact magic recharges on short rests, making them effective in extended adventures.",
    playstyle: "Great for players who love dark themes and powerful single-target attacks. Warlocks have unique pact magic that recharges quickly. Perfect for those who enjoy mysterious patrons and eldritch power.",
    hitDie: "d8",
    primaryAbility: "Charisma",
    savingThrows: ["Wisdom", "Charisma"],
    features: ["Otherworldly Patron", "Pact Magic"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/3eb6d8a78_Warlock1.png"
  },
  {
    name: "Wizard",
    description: "Wizards are masters of arcane magic who learn spells through intense study. They have the largest spell list of any class. Wizards must memorize their spells daily but have access to incredible magical power. They can specialize in different schools of magic to enhance their abilities. With the right spells, a wizard can solve almost any problem and dominate any battle.",
    playstyle: "Perfect for players who love magic and want maximum spell variety. Wizards can prepare different spells each day for any situation. Great for tactical players who enjoy planning and customization.",
    hitDie: "d6",
    primaryAbility: "Intelligence",
    savingThrows: ["Intelligence", "Wisdom"],
    features: ["Spellcasting", "Arcane Recovery"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a8da4ae3c_Wizard1.png"
  }
];

const alignments = [
  { name: "Lawful Good",     short: "LG", description: "Believes in honor, compassion, and helping others while respecting laws and order. Think noble paladins and righteous heroes." },
  { name: "Neutral Good",    short: "NG", description: "Does good because it's right, regardless of laws. Helps others and fights evil pragmatically. Think kind-hearted adventurers." },
  { name: "Chaotic Good",    short: "CG", description: "Values freedom and kindness above all. Does good but dislikes rules and authority. Think Robin Hood or rebel heroes." },
  { name: "Lawful Neutral",  short: "LN", description: "Values order, tradition, and law above all else. Neither particularly good nor evil. Think judges or soldiers following orders." },
  { name: "True Neutral",    short: "TN", description: "Balanced and pragmatic. Doesn't lean toward law or chaos, good or evil. Acts based on situation. Think druids protecting natural balance." },
  { name: "Chaotic Neutral", short: "CN", description: "Values personal freedom above all. Unpredictable and follows their whims. Neither cruel nor caring. Think free spirits and wanderers." },
  { name: "Lawful Evil",     short: "LE", description: "Uses laws and systems to gain power and hurt others methodically. Think tyrants and corrupt officials." },
  { name: "Neutral Evil",    short: "NE", description: "Purely selfish and does whatever benefits them. No loyalty to law or chaos. Think mercenaries and opportunists." },
  { name: "Chaotic Evil",    short: "CE", description: "Destroys and causes suffering for pleasure. Values freedom to do terrible things. Think demons and psychopaths." },
];

const companionTypes = {
  Paladin: { name: "Mount", description: "Your loyal steed that accompanies you in battle" },
  Ranger:  { name: "Animal Companion", description: "Your beast companion that fights alongside you" },
  Warlock: { name: "Patron", description: "The otherworldly entity you made a pact with" },
  Wizard:  { name: "Familiar", description: "Your magical companion that serves and scouts for you" },
  Druid:   { name: "Animal Companion", description: "A creature of nature bonded to you" },
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
  const [fullBodyPosition, setFullBodyPosition] = useState(characterData.avatar_position || { x: 0, y: 0 });
  const [fullBodyZoom, setFullBodyZoom] = useState(characterData.avatar_zoom || 1);
  const [profilePosition, setProfilePosition] = useState(characterData.profile_position || { x: 0, y: 0 });
  const [profileZoom, setProfileZoom] = useState(characterData.profile_zoom || 1);
  const [isDraggingFull, setIsDraggingFull] = useState(false);
  const [isDraggingProfile, setIsDraggingProfile] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [fullBodySaved, setFullBodySaved] = useState(!!characterData.avatar_position);
  const [profileSaved, setProfileSaved] = useState(!!characterData.profile_position);

  const selectedClass = combinedClasses.find((c) => c.name === characterData.class);
  const selectedAlignment = alignments.find((a) => a.name === characterData.alignment);
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
      setFullBodyPosition((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDraggingProfile) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setProfilePosition((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
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

  const handlePickClass = (cls) => {
    const baseUpdates = {
      class: cls.name,
      features: (cls?.features || []).map((f) => ({ name: f, source: cls.name, description: "" })),
    };
    const priorDeps = Array.isArray(characterData.mod_dependencies) ? characterData.mod_dependencies : [];
    const nonClassDeps = priorDeps.filter((d) => d?.mod_type !== "class");
    if (cls?._source === "brewery" && cls?._raw) {
      Object.assign(
        baseUpdates,
        clearBreweryClassMarkers(),
        applyBreweryClassBaseline(cls._raw, characterData),
      );
      const classDep = cls._mod_id
        ? [{ mod_id: cls._mod_id, mod_name: cls._mod_name || cls.name, mod_type: "class" }]
        : [];
      baseUpdates.mod_dependencies = [...nonClassDeps, ...classDep];
    } else {
      Object.assign(baseUpdates, clearBreweryClassMarkers());
      baseUpdates.mod_dependencies = nonClassDeps;
    }
    updateCharacterData(baseUpdates);
  };

  const profileImageUrl = characterData.profile_avatar_url || characterData.avatar_url;
  const accent = (selectedClass && CLASS_ACCENT[selectedClass.name]) || "var(--cc-orange)";

  return (
    <div>
      <StepHeader
        kicker="Chapter II · The Calling"
        title="Choose your path"
        subtitle="What kind of hero is this? Each calling shapes your spells, your weapons, your destiny."
      />

      <Primer title="How to pick a class">
        Pick the <strong>fantasy</strong> first — the kind of hero you want to be. The mechanics
        will follow. Some classes — like Warlock, Paladin, Cleric, Ranger, Druid — bring along a
        <strong> patron, deity, companion,</strong> or <strong>familiar</strong> you'll detail
        below. Alignment and physical details are roleplay scaffolding; tweak them anytime.
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
        {/* LEFT — featured tome */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {selectedClass ? (
            <ClassFeaturedTome
              cls={selectedClass}
              accent={accent}
            />
          ) : (
            <EmptyClassPrompt />
          )}

          {selectedClass?._source === "brewery" && (
            <BreweryClassPickers
              characterData={characterData}
              updateCharacterData={updateCharacterData}
            />
          )}

          {selectedClass && (
            <div className="cc-tome" style={{ padding: '32px 36px' }}>
              <OrnateHeading>Alignment</OrnateHeading>
              <AlignmentGrid
                value={characterData.alignment}
                onChange={(name) => updateCharacterData({ alignment: name })}
                selectedAlignment={selectedAlignment}
              />

              <FleurDivider />

              <OrnateHeading>Physical Details</OrnateHeading>
              <PhysicalDetails
                appearance={characterData.appearance || {}}
                onChange={(patch) => updateCharacterData({
                  appearance: { ...(characterData.appearance || {}), ...patch },
                })}
              />

              <FleurDivider />

              <OrnateHeading>Biography</OrnateHeading>
              <textarea
                className="cc-input cc-italic-serif"
                value={characterData.description || ''}
                onChange={(e) => updateCharacterData({ description: e.target.value })}
                placeholder="Their story so far — origins, scars, the moment they took up the call..."
                rows={5}
                style={{
                  resize: 'vertical',
                  minHeight: 110,
                  fontFamily: 'var(--cc-serif)',
                  fontSize: 15,
                  lineHeight: 1.55,
                  fontStyle: 'italic',
                }}
              />
            </div>
          )}

          {companionInfo && (
            <CompanionPicker
              characterData={characterData}
              updateCharacterData={updateCharacterData}
              campaignId={campaignId}
            />
          )}
        </div>

        {/* RIGHT — class roster + portrait + build summary, sticky rail */}
        <div
          style={{
            position: 'sticky',
            top: 20,
            alignSelf: 'flex-start',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <ClassRoster
            combinedClasses={combinedClasses}
            current={characterData.class}
            onPick={handlePickClass}
          />

          <PortraitPanel
            label="Full Portrait"
            avatarUrl={characterData.avatar_url}
            position={fullBodyPosition}
            zoom={fullBodyZoom}
            saved={fullBodySaved}
            uploading={uploading}
            onUpload={handleImageUpload}
            onMouseDown={(e) => handleMouseDown(e, 'full')}
            onZoomChange={(val) => setFullBodyZoom(val[0])}
            onSave={() => {
              setFullBodySaved(true);
              updateCharacterData({
                avatar_position: fullBodyPosition,
                avatar_zoom: fullBodyZoom,
              });
            }}
            onEdit={() => setFullBodySaved(false)}
            inputId="avatar-upload"
            aspectRatio="2/3"
          />

          <ProfilePanel
            avatarUrl={profileImageUrl}
            position={profilePosition}
            zoom={profileZoom}
            saved={profileSaved}
            uploading={uploadingProfile}
            onUpload={handleProfileImageUpload}
            onMouseDown={(e) => handleMouseDown(e, 'profile')}
            onZoomChange={(val) => setProfileZoom(val[0])}
            onSave={() => {
              setProfileSaved(true);
              updateCharacterData({
                profile_position: profilePosition,
                profile_zoom: profileZoom,
              });
            }}
            onEdit={() => setProfileSaved(false)}
          />

          {selectedClass && (
            <ClassBuildSummary cls={selectedClass} accent={accent} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Empty class prompt
// ============================================================================
function EmptyClassPrompt() {
  return (
    <div
      className="cc-tome"
      style={{
        padding: '60px 36px',
        textAlign: 'center',
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div style={{ fontSize: 56, opacity: 0.4, marginBottom: 8, color: 'var(--cc-gold)' }}>✦</div>
      <div className="cc-display" style={{ fontSize: 32, color: 'var(--cc-text)' }}>
        Choose a calling
      </div>
      <div
        className="cc-italic-serif"
        style={{
          fontSize: 16,
          color: 'var(--cc-text-dim)',
          maxWidth: 400,
          lineHeight: 1.5,
        }}
      >
        Pick one of the twelve callings from the roster — the chapter will unfurl with their lore.
      </div>
    </div>
  );
}

// ============================================================================
// Featured class tome — big icon + name + chips + description + playstyle
// ============================================================================
function ClassFeaturedTome({ cls, accent }) {
  const family = CLASS_FAMILY[cls.name] || (cls._source === "brewery" ? "Brewery" : "Calling");
  return (
    <div className="cc-tome" style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
        <div
          style={{
            width: 100,
            height: 100,
            background: `radial-gradient(circle, ${accent}55 0%, ${accent}11 50%, transparent 75%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            filter: `drop-shadow(0 4px 16px ${accent}66)`,
          }}
        >
          {cls.icon ? (
            <img src={cls.icon} alt="" style={{ width: 76, height: 76, objectFit: 'contain' }} />
          ) : (
            <Sparkles className="w-14 h-14" style={{ color: accent }} />
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div
            className="cc-label"
            style={{
              color: accent,
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span>The {family}</span>
            {cls._source === "brewery" && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.12em',
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
          <div
            className="cc-display"
            style={{
              fontSize: 42,
              color: 'var(--cc-text)',
              lineHeight: 1,
              marginBottom: 10,
              letterSpacing: 1,
              textShadow: `0 2px 16px ${accent}44`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {cls.name}
            <InfoTip>{tipFor("class")}</InfoTip>
          </div>
          <div
            className="cc-italic-serif"
            style={{ fontSize: 15, color: 'var(--cc-text-dim)' }}
          >
            Hit Die <span style={{ color: accent }}>{cls.hitDie}</span>
            &nbsp;·&nbsp;
            Primary <span style={{ color: accent }}>{cls.primaryAbility || '—'}</span>
            &nbsp;·&nbsp;
            Saves <span style={{ color: accent }}>{(cls.savingThrows || []).join(', ') || '—'}</span>
          </div>
        </div>
      </div>

      <p
        className="cc-body-prose"
        style={{
          marginBottom: 18,
          fontSize: 15,
          color: 'var(--cc-text)',
          lineHeight: 1.65,
        }}
      >
        {cls.description}
      </p>

      {cls.playstyle && (
        <div
          style={{
            padding: 16,
            borderLeft: `3px solid ${accent}`,
            background: `linear-gradient(90deg, ${accent}14, transparent 80%)`,
            borderRadius: 4,
          }}
        >
          <div className="cc-label" style={{ color: accent, marginBottom: 4 }}>
            ✦ Playstyle
          </div>
          <div
            className="cc-italic-serif"
            style={{
              fontSize: 15,
              color: 'var(--cc-text)',
              lineHeight: 1.55,
            }}
          >
            {cls.playstyle}
          </div>
        </div>
      )}

      {(cls.features || []).length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="cc-label" style={{ color: accent, marginBottom: 8 }}>
            Level 1 Features
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {cls.features.map((f) => (
              <span
                key={f}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  color: accent,
                  background: `${accent}14`,
                  border: `1px solid ${accent}55`,
                  borderRadius: 4,
                  padding: '5px 10px',
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Class roster (right rail) — medallion grid replacing the shadcn Select
// ============================================================================
function ClassRoster({ combinedClasses, current, onPick }) {
  return (
    <div className="cc-panel" style={{ padding: 16 }}>
      <div className="cc-label" style={{ marginBottom: 12, color: 'var(--cc-gold-soft)' }}>
        The Twelve Callings
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
        }}
      >
        {combinedClasses.map((c) => {
          const active = c.name === current;
          const accent = CLASS_ACCENT[c.name] || 'var(--cc-teal)';
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => onPick(c)}
              title={c.name}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '10px 4px',
                textAlign: 'center',
                borderRadius: 4,
                transition: 'all .2s',
                background: active ? `${accent}1F` : 'transparent',
                border: `1px solid ${active ? accent : 'transparent'}`,
                boxShadow: active ? `0 0 14px ${accent}40` : 'none',
                position: 'relative',
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 4,
                  filter: active ? 'none' : 'grayscale(0.4) opacity(0.75)',
                  transition: 'filter .2s',
                }}
              >
                {c.icon ? (
                  <img src={c.icon} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                ) : (
                  <Sparkles style={{ width: 24, height: 24, color: accent }} />
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: active ? accent : 'var(--cc-text-dim)',
                  letterSpacing: 0.3,
                  lineHeight: 1.2,
                }}
              >
                {c.name}
              </div>
              {c._source === "brewery" && (
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    fontSize: 8,
                    fontWeight: 900,
                    color: '#050816',
                    background: 'var(--cc-teal)',
                    borderRadius: 3,
                    padding: '1px 3px',
                    letterSpacing: 0.2,
                  }}
                >
                  MOD
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Class build summary — right-rail panel with derived class facts
// ============================================================================
function ClassBuildSummary({ cls, accent }) {
  return (
    <div className="cc-panel-strong" style={{ padding: 18, position: 'relative' }}>
      <div className="cc-tome-corner cc-tr"></div>
      <div className="cc-tome-corner cc-bl"></div>

      <div
        className="cc-ornate-heading"
        style={{ marginBottom: 16, '--ornate-color': accent }}
      >
        <span className="cc-ornate-flourish small" style={{ background: accent }}></span>
        <h3 style={{ fontSize: 18, color: 'var(--cc-text)' }}>{cls.name} build</h3>
        <span className="cc-ornate-flourish small" style={{ background: accent }}></span>
      </div>

      <SummaryRow label="Hit Die" value={cls.hitDie} accent={accent} />
      <SummaryRow label="Primary" value={cls.primaryAbility || '—'} accent={accent} />
      <SummaryRow label="Saves" value={(cls.savingThrows || []).join(', ') || '—'} accent={accent} />

      {(cls.features || []).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="cc-label" style={{ marginBottom: 8, color: 'var(--cc-gold-soft)' }}>
            Level 1
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cls.features.map((f) => (
              <div
                key={f}
                style={{
                  fontSize: 13,
                  color: 'var(--cc-text)',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 6,
                }}
              >
                <span style={{ color: accent }}>◆</span>
                <span style={{ fontWeight: 700 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value, accent }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
        padding: '6px 0',
        borderBottom: '1px solid var(--cc-border-faint)',
        fontSize: 13,
      }}
    >
      <span className="cc-label" style={{ color: 'var(--cc-text-dim)', letterSpacing: 0.4 }}>
        {label}
      </span>
      <span style={{ color: 'var(--cc-text)', fontWeight: 600, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// Alignment grid — 3×3 with elegant labels (replaces shadcn Select)
// ============================================================================
function AlignmentGrid({ value, onChange, selectedAlignment }) {
  return (
    <>
      <div
        className="cc-italic-serif"
        style={{
          fontSize: 14,
          color: 'var(--cc-text-dim)',
          marginBottom: 14,
          textAlign: 'center',
        }}
      >
        Roleplay only — no mechanics depend on alignment.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
          maxWidth: 540,
          margin: '0 auto',
        }}
      >
        {alignments.map((a) => {
          const active = value === a.name;
          return (
            <button
              key={a.name}
              type="button"
              onClick={() => onChange(a.name)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '12px 8px',
                textAlign: 'center',
                borderRadius: 6,
                background: active ? 'rgba(255, 83, 0, 0.10)' : 'rgba(20, 12, 8, 0.4)',
                border: `1px solid ${active ? 'var(--cc-orange)' : 'var(--cc-border)'}`,
                boxShadow: active ? '0 0 12px var(--cc-orange-glow)' : 'none',
                transition: 'all .15s',
              }}
            >
              <div
                className="cc-display"
                style={{
                  fontSize: 13,
                  color: active ? 'var(--cc-orange-soft)' : 'var(--cc-gold-soft)',
                  marginBottom: 2,
                }}
              >
                {a.short}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--cc-text)',
                  letterSpacing: 0.2,
                  lineHeight: 1.3,
                }}
              >
                {a.name.split(' ')[0]}<br />
                {a.name.split(' ')[1] || ' '}
              </div>
            </button>
          );
        })}
      </div>

      {selectedAlignment && (
        <motion.div
          key={selectedAlignment.name}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="cc-italic-serif"
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--cc-text-dim)',
            lineHeight: 1.5,
            maxWidth: 540,
            margin: '16px auto 0',
          }}
        >
          <strong
            className="cc-display"
            style={{ color: 'var(--cc-orange-soft)', fontSize: 16, fontWeight: 'normal' }}
          >
            {selectedAlignment.name}.
          </strong>{' '}
          {selectedAlignment.description}
        </motion.div>
      )}
    </>
  );
}

// ============================================================================
// Physical details — age + height + weight inputs
// ============================================================================
function PhysicalDetails({ appearance, onChange }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
      }}
    >
      <div>
        <div className="cc-label" style={{ marginBottom: 6 }}>Age</div>
        <input
          type="number"
          className="cc-input"
          value={appearance.age || ''}
          onChange={(e) => onChange({ age: parseInt(e.target.value, 10) })}
          placeholder="25"
        />
      </div>
      <div>
        <div className="cc-label" style={{ marginBottom: 6 }}>Height</div>
        <input
          className="cc-input"
          value={appearance.height || ''}
          onChange={(e) => onChange({ height: e.target.value })}
          placeholder={"5'10\""}
        />
      </div>
      <div>
        <div className="cc-label" style={{ marginBottom: 6 }}>Weight</div>
        <input
          className="cc-input"
          value={appearance.weight || ''}
          onChange={(e) => onChange({ weight: e.target.value })}
          placeholder="180 lbs"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Portrait panel (full body) — drag/zoom positioning, restyled around .cc-*
// ============================================================================
function PortraitPanel({
  label, avatarUrl, position, zoom, saved, uploading,
  onUpload, onMouseDown, onZoomChange, onSave, onEdit,
  inputId, aspectRatio,
}) {
  return (
    <div className="cc-panel-strong" style={{ padding: 16, position: 'relative' }}>
      <div className="cc-label" style={{ marginBottom: 10, color: 'var(--cc-gold-soft)' }}>
        {label}
      </div>
      <div
        className="cc-portrait-frame"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 8,
          background: 'rgba(20, 12, 8, 0.5)',
          border: '1px solid var(--cc-border)',
          aspectRatio,
          width: '100%',
        }}
      >
        {avatarUrl ? (
          <>
            <img
              src={avatarUrl}
              alt="Character"
              className={saved ? "absolute" : "absolute cursor-move"}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: saved ? 'none' : 'auto',
              }}
              onMouseDown={onMouseDown}
              draggable={false}
            />
            {!saved && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  right: 12,
                  background: 'rgba(5, 8, 22, 0.78)',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    color: 'var(--cc-text)',
                  }}
                >
                  <Move className="w-3 h-3" />
                  <span>Drag to reposition</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ZoomOut className="w-3 h-3" style={{ color: 'var(--cc-text)' }} />
                  <Slider
                    value={[zoom]}
                    onValueChange={onZoomChange}
                    min={0.5}
                    max={3}
                    step={0.1}
                    className="flex-1"
                  />
                  <ZoomIn className="w-3 h-3" style={{ color: 'var(--cc-text)' }} />
                </div>
              </div>
            )}
            {saved && (
              <button
                type="button"
                onClick={onEdit}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'var(--cc-orange)',
                  color: 'white',
                  padding: 8,
                  borderRadius: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cc-text-faint)',
            }}
          >
            <User className="w-16 h-16" style={{ opacity: 0.35, marginBottom: 10 }} />
            <p
              className="cc-italic-serif"
              style={{ fontSize: 13, color: 'var(--cc-text-faint)' }}
            >
              Drop your character art
            </p>
          </div>
        )}
      </div>

      {avatarUrl && !saved && (
        <button
          type="button"
          onClick={onSave}
          className="cc-btn-primary"
          style={{
            marginTop: 10,
            width: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Save className="w-4 h-4" />
          Save position
        </button>
      )}
      <button
        type="button"
        onClick={() => document.getElementById(inputId).click()}
        disabled={uploading}
        className="cc-btn-orange"
        style={{
          marginTop: 10,
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          opacity: uploading ? 0.6 : 1,
        }}
      >
        <Upload className="w-4 h-4" />
        {uploading ? 'Uploading…' : 'Upload portrait'}
      </button>
      <input
        type="file"
        id={inputId}
        accept="image/*"
        onChange={onUpload}
        className="hidden"
      />
    </div>
  );
}

// ============================================================================
// Profile panel (round avatar) — drag/zoom positioning
// ============================================================================
function ProfilePanel({
  avatarUrl, position, zoom, saved, uploading,
  onUpload, onMouseDown, onZoomChange, onSave, onEdit,
}) {
  return (
    <div className="cc-panel-strong" style={{ padding: 16 }}>
      <div className="cc-label" style={{ marginBottom: 10, color: 'var(--cc-gold-soft)' }}>
        Profile Avatar
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 128,
              height: 128,
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'rgba(20, 12, 8, 0.5)',
              border: '2px solid var(--cc-orange)',
              position: 'relative',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className={saved ? "absolute" : "absolute cursor-move"}
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  pointerEvents: saved ? 'none' : 'auto',
                }}
                onMouseDown={onMouseDown}
                draggable={false}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User className="w-12 h-12" style={{ color: 'var(--cc-text-faint)', opacity: 0.45 }} />
              </div>
            )}
          </div>
          {saved && avatarUrl && (
            <button
              type="button"
              onClick={onEdit}
              style={{
                all: 'unset',
                cursor: 'pointer',
                position: 'absolute',
                top: -4,
                right: -4,
                background: 'var(--cc-orange)',
                color: 'white',
                padding: 6,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {avatarUrl && !saved && (
        <div
          style={{
            marginTop: 12,
            background: 'rgba(20, 12, 8, 0.5)',
            borderRadius: 8,
            padding: 12,
            border: '1px solid var(--cc-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'var(--cc-text-dim)',
              marginBottom: 8,
            }}
          >
            <Move className="w-3 h-3" />
            <span>Drag to reposition</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ZoomOut className="w-3 h-3" style={{ color: 'var(--cc-text-dim)' }} />
            <Slider
              value={[zoom]}
              onValueChange={onZoomChange}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="w-3 h-3" style={{ color: 'var(--cc-text-dim)' }} />
          </div>
          <button
            type="button"
            onClick={onSave}
            className="cc-btn-primary"
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 12,
            }}
          >
            <Save className="w-3 h-3" />
            Save position
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => document.getElementById('profile-upload').click()}
        disabled={uploading}
        className="cc-btn-orange"
        style={{
          marginTop: 10,
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 12,
          opacity: uploading ? 0.6 : 1,
        }}
      >
        <Upload className="w-3 h-3" />
        {uploading ? 'Uploading…' : 'Upload profile photo'}
      </button>
      <input
        type="file"
        id="profile-upload"
        accept="image/*"
        onChange={onUpload}
        className="hidden"
      />
    </div>
  );
}

// ============================================================================
// Brewery class pickers — preserved verbatim from the pre-port file
// ============================================================================
const CLASS_SKILL_OPTIONS = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
  "History", "Insight", "Intimidation", "Investigation", "Medicine",
  "Nature", "Perception", "Performance", "Persuasion", "Religion",
  "Sleight of Hand", "Stealth", "Survival",
];

function BreweryClassPickers({ characterData, updateCharacterData }) {
  const cls = characterData._brewery_class;
  if (!cls) return null;

  const lvl = Number(characterData.level) || 1;
  const earnedFeatures = getBreweryClassFeaturesAtLevel(
    cls,
    lvl,
    characterData._brewery_class_subclass,
  );
  const asiLevels = getBreweryClassAsiLevels(cls);
  const asiReached = asiLevels.filter((l) => l <= lvl);

  const skillCfg = cls.skill_proficiencies || { choose: 0, from: [] };
  const choose = Number(skillCfg.choose) || 0;
  const fromRaw = Array.isArray(skillCfg.from) ? skillCfg.from : [];
  const from = fromRaw.length > 0 ? fromRaw : CLASS_SKILL_OPTIONS;
  const chosen = Array.isArray(characterData._brewery_class_skill_picks)
    ? characterData._brewery_class_skill_picks
    : [];

  const toggleSkill = (skill) => {
    const active = chosen.includes(skill);
    if (!active && chosen.length >= choose) return;
    const next = active ? chosen.filter((s) => s !== skill) : [...chosen, skill];
    const nextSkills = { ...(characterData.skills || {}) };
    if (active) delete nextSkills[skill];
    else nextSkills[skill] = true;
    updateCharacterData({
      _brewery_class_skill_picks: next,
      skills: nextSkills,
    });
  };

  const fixed   = Array.isArray(cls.starting_equipment?.fixed)   ? cls.starting_equipment.fixed   : [];
  const choices = Array.isArray(cls.starting_equipment?.choices) ? cls.starting_equipment.choices : [];
  const equipState = characterData._brewery_class_equipment || { fixed_confirmed: true, choices: {} };
  const picks = equipState.choices || {};

  const pickOption = (groupIdx, option) => {
    updateCharacterData({
      _brewery_class_equipment: {
        ...equipState,
        choices: { ...picks, [groupIdx]: option },
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441] space-y-4"
    >
      <h4 className="text-[#37F2D1] font-bold text-sm uppercase tracking-widest flex items-center gap-2">
        <Sparkles className="w-4 h-4" /> Brewery Class Choices
      </h4>

      {choose > 0 && (
        <div className="bg-[#0b1220] border border-[#37F2D1]/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-white/70 font-semibold">
              Pick {choose} skill{choose > 1 ? "s" : ""}{fromRaw.length > 0 ? " from the class list" : ""}
            </p>
            <span className="text-[10px] text-white/50">{chosen.length} / {choose}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {from.map((skill) => {
              const active = chosen.includes(skill);
              const disabled = !active && chosen.length >= choose;
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
                        ? "bg-[#050816] text-slate-600 border-slate-800 cursor-not-allowed"
                        : "bg-[#050816] text-slate-300 border-slate-700 hover:border-[#37F2D1]/60"
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {earnedFeatures.length > 0 && (
        <div className="bg-[#0b1220] border border-[#37F2D1]/30 rounded-lg p-3">
          <p className="text-xs text-white/70 font-semibold uppercase tracking-wide mb-2">
            Features Earned by Level {lvl}
          </p>
          <div className="space-y-1">
            {earnedFeatures.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] text-[#37F2D1] font-bold w-8 shrink-0">L{f.level}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white">{f.name}</span>
                    {f.is_asi && (
                      <span className="text-[9px] bg-amber-500 text-black rounded px-1 font-bold">ASI</span>
                    )}
                    {f.is_subclass_choice && (
                      <span className="text-[9px] bg-purple-500 text-white rounded px-1 font-bold">SUBCLASS</span>
                    )}
                  </div>
                  {f.description && (
                    <p className="text-[10px] text-white/60 line-clamp-2">{f.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {asiReached.length > 0 && (
            <p className="mt-2 pt-2 border-t border-slate-700 text-[10px] text-amber-300">
              ASI pending at level{asiReached.length > 1 ? "s" : ""}: {asiReached.join(", ")} —
              choose +2 to one score or +1 to two scores (or a feat, DM permitting).
            </p>
          )}
        </div>
      )}

      {(() => {
        const resource = getBreweryClassResource(cls, lvl);
        if (!resource) return null;
        return (
          <div className="bg-[#0b1220] border border-amber-400/40 rounded-lg p-3">
            <p className="text-xs text-white/70 font-semibold uppercase tracking-wide mb-1 flex items-center gap-2">
              <span>{resource.name}</span>
              {resource.abbreviation && (
                <span className="text-[9px] text-amber-300">({resource.abbreviation})</span>
              )}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-amber-300">
                {resource.current} / {resource.max}
              </span>
              <span className="text-[10px] text-white/60 uppercase tracking-widest">
                recharges on {resource.recharge.replace("_", " ")}
              </span>
            </div>
          </div>
        );
      })()}

      {Array.isArray(cls.subclass?.options) && cls.subclass.options.length > 0 && (() => {
        const chooseAt = Number(cls.subclass.choose_at_level) || 3;
        const canPick  = lvl >= chooseAt;
        const chosenSub = characterData._brewery_class_subclass || "";
        const label    = cls.subclass.name || "Subclass";
        return (
          <div className="bg-[#0b1220] border border-[#37F2D1]/30 rounded-lg p-3">
            <p className="text-xs text-white/70 font-semibold uppercase tracking-wide mb-2 flex items-center gap-2">
              <span>{label} Selection</span>
              {!canPick && (
                <span className="text-[9px] bg-slate-700 text-slate-300 rounded px-1.5 py-0.5 uppercase tracking-widest">
                  Unlocks at Lvl {chooseAt}
                </span>
              )}
            </p>
            {canPick ? (
              <div className="space-y-2">
                {cls.subclass.options.map((opt) => {
                  const active = chosenSub === opt.name;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => updateCharacterData({
                        _brewery_class_subclass: opt.name,
                        subclass: opt.name,
                      })}
                      className={`w-full text-left rounded-lg p-3 border transition-colors ${
                        active
                          ? "bg-[#37F2D1]/20 border-[#37F2D1]"
                          : "bg-[#050816] border-slate-700 hover:border-[#37F2D1]/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{opt.name}</span>
                        {active && (
                          <span className="text-[9px] bg-[#37F2D1] text-[#050816] rounded px-1.5 py-0.5 font-black uppercase tracking-widest">
                            Chosen
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <p className="text-[11px] text-white/70 mt-1">{opt.description}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-white/50 italic">
                Bump this character's level to {chooseAt} or higher to pick a {label.toLowerCase()}.
              </p>
            )}
          </div>
        );
      })()}

      {(fixed.length > 0 || choices.length > 0) && (
        <div className="bg-[#0b1220] border border-[#37F2D1]/30 rounded-lg p-3 space-y-3">
          <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Starting Equipment</p>
          {fixed.length > 0 && (
            <div>
              <p className="text-[10px] text-white/50 mb-1">You automatically start with:</p>
              <ul className="text-xs text-white/80 list-disc list-inside">
                {fixed.map((item, i) => (<li key={i}>{item}</li>))}
              </ul>
            </div>
          )}
          {choices.map((group, idx) => {
            const options = (group.options || []).filter((o) => typeof o === "string" && o.trim());
            if (options.length === 0) return null;
            const active = picks[idx];
            return (
              <div key={idx}>
                <p className="text-[10px] text-white/50 mb-1">Choose one (group #{idx + 1}):</p>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => pickOption(idx, opt)}
                      className={`px-2 py-1 rounded border text-[10px] font-semibold transition-colors ${
                        active === opt
                          ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                          : "bg-[#050816] text-slate-300 border-slate-700 hover:border-[#37F2D1]/60"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
