import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, User, Move, ZoomIn, ZoomOut, Save, Pencil, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ABILITY_NAMES } from "@/components/dnd5e/dnd5eRules";
import { getModdedClasses } from "@/lib/modEngine";
import {
  applyBreweryClassBaseline,
  clearBreweryClassMarkers,
} from "@/lib/breweryClassApply";
import { Slider } from "@/components/ui/slider";
import CompanionPicker from "@/components/characterCreator/CompanionPicker";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";

// ============================================================================
// Step 2: Class & Path — exact port of
// design-reference/character-creator/step-class.jsx. Class roster on the
// right rail, featured class tome with subclass chapter on the left, bonds
// tome below for warlock patrons / paladin oaths / ranger companions /
// cleric deities / druid circles / sorcerer origins. Alignment grid +
// physical details + portrait drag-zoom panels live on this step in the
// existing creator (per the brief), so they're rendered alongside.
// ============================================================================

// Flavor label rendered above the class name (prototype's classFamily()).
const CLASS_FAMILY = {
  Barbarian: "Primal", Bard: "Lyric", Cleric: "Divine", Druid: "Wild",
  Fighter: "Steelborn", Monk: "Disciplined", Paladin: "Sworn",
  Ranger: "Wandering", Rogue: "Roguish", Sorcerer: "Innate",
  Warlock: "Pact-Bound", Wizard: "Studied",
};

// Per-class tinted accent — used in the featured tome hero, playstyle
// callout border, subclass card highlights, and build summary heading.
const CLASS_ACCENT = {
  Barbarian: "#D89860", Bard: "#FF4DA6",
  Cleric: "#FFF1D2",    Druid: "#52D880",
  Fighter: "#FF5040",   Monk: "#3FE0E8",
  Paladin: "#FFD550",   Ranger: "#D45A50",
  Rogue: "#D8D5E0",     Sorcerer: "#FF9050",
  Warlock: "#B580FF",   Wizard: "#5AA0FF",
};

// Class lore + structural fields — merged from the existing creator's
// descriptions + the prototype data.jsx subclass / companion content.
// Icons are the existing app's URL artwork.
const CLASSES_DATA = [
  {
    name: "Barbarian",
    blurb: "Barbarians are fierce warriors who draw on primal rage. Highest hit points of any class — they charge in and out-soldier everyone.",
    playstyle: "Best for players who want to be the toughest character in combat, dealing massive damage while shrugging off hits. Straightforward and aggressive — no spellcasting needed.",
    hitDie: "d12", primaryAbility: "Strength",
    savingThrows: ["Strength", "Constitution"],
    features: ["Rage", "Unarmored Defense"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a6652f2d8_Barbarian1.png",
    spellcaster: false, spellAbility: null,
    subclassName: "Primal Path", subclassLevel: 3,
    subclasses: [
      { name: "Path of the Berserker", desc: "Pure fury. Frenzy lets you attack as a bonus action while raging.", best: "Players who want unfiltered damage." },
      { name: "Path of the Totem Warrior", desc: "Channel animal spirits for resistance, speed, or aim.", best: "Strategic damage-takers who want utility." },
    ],
  },
  {
    name: "Bard",
    blurb: "Bards are magical performers who weave spells through song. Versatile support — buff allies, debuff enemies, solve problems creatively.",
    playstyle: "Versatile support and face. Spells, skills, social glue. Pick if you like having an answer for everything.",
    hitDie: "d8", primaryAbility: "Charisma",
    savingThrows: ["Dexterity", "Charisma"],
    features: ["Spellcasting", "Bardic Inspiration"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/cbe7f7dba_Bard1.png",
    spellcaster: "full", spellAbility: "cha",
    subclassName: "Bard College", subclassLevel: 3,
    subclasses: [
      { name: "College of Lore", desc: "Bonus skills, Cutting Words to debuff enemies, and extra spells from other lists.", best: "Skill monkeys and spell-thieves." },
      { name: "College of Valor", desc: "Better armor & weapons, Extra Attack at 6th. Combat bard.", best: "Front-line inspiring warriors." },
    ],
  },
  {
    name: "Cleric",
    blurb: "Clerics are divine champions who channel a deity's power. Heal allies, smite enemies — versatile front-liners or supportive healers.",
    playstyle: "Great for players who want to support their team while remaining effective in combat. Adapt to many situations.",
    hitDie: "d8", primaryAbility: "Wisdom",
    savingThrows: ["Wisdom", "Charisma"],
    features: ["Spellcasting", "Divine Domain"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/15fe6ef24_Cleric1.png",
    spellcaster: "full", spellAbility: "wis", hasDeity: true,
    subclassName: "Divine Domain", subclassLevel: 1,
    subclasses: [
      { name: "Life Domain", desc: "The premier healer. Disciples of Life bonus healing & heavy armor.", best: "Players who love keeping the party alive." },
      { name: "Light Domain", desc: "Blaster cleric. Fire spells, Warding Flare, Radiance of the Dawn.", best: "Damage-leaning clerics." },
      { name: "War Domain", desc: "Heavy armor, martial weapons, bonus attack via War Priest.", best: "Front-line holy warriors." },
    ],
  },
  {
    name: "Druid",
    blurb: "Druids are nature-focused spellcasters who can become animals. Heal, control the battlefield, transform into a bear.",
    playstyle: "Perfect if you love nature themes and want ultimate versatility. Wild Shape lets you become creatures for different situations.",
    hitDie: "d8", primaryAbility: "Wisdom",
    savingThrows: ["Intelligence", "Wisdom"],
    features: ["Druidic", "Spellcasting"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/ef43c9ff2_Druid1.png",
    spellcaster: "full", spellAbility: "wis", hasCircle: true,
    subclassName: "Druid Circle", subclassLevel: 2,
    subclasses: [
      { name: "Circle of the Land", desc: "Spellcasting-focused. Bonus spells based on terrain — forest, mountain, etc.", best: "Druids who want stronger spellcasting." },
      { name: "Circle of the Moon", desc: "Wildshape into a brown bear at L2. Massive HP pool, frontline beast.", best: "Players who want to BE the animal." },
    ],
  },
  {
    name: "Fighter",
    blurb: "Fighters are masters of weapons and armor — the most flexible martial class. Pick your weapon, pick your style, dominate.",
    playstyle: "Best for players who want to focus on mastering weapons and combat tactics. Reliable, powerful, straightforward.",
    hitDie: "d10", primaryAbility: "Strength or Dexterity",
    savingThrows: ["Strength", "Constitution"],
    features: ["Fighting Style", "Second Wind"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/5e1b2cd68_Fighter1.png",
    spellcaster: false, spellAbility: null,
    subclassName: "Martial Archetype", subclassLevel: 3,
    subclasses: [
      { name: "Champion", desc: "Crit on 19-20, extra athleticism. The simplest fighter to play.", best: "New players who want to swing weapons reliably." },
      { name: "Battle Master", desc: "Maneuvers (trip, disarm, riposte) powered by superiority dice. Tactical.", best: "Players who like options each round." },
    ],
  },
  {
    name: "Monk",
    blurb: "Monks channel ki — fast, mobile, unarmored, deadly. Multiple attacks, mobility, surgical takedowns.",
    playstyle: "Ideal if you want high mobility and lots of attacks. Monks are tactical and rewarding with unique mechanics.",
    hitDie: "d8", primaryAbility: "Dexterity & Wisdom",
    savingThrows: ["Strength", "Dexterity"],
    features: ["Unarmored Defense", "Martial Arts"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/4ee7d7898_Monk1.png",
    spellcaster: false, spellAbility: null,
    subclassName: "Monastic Tradition", subclassLevel: 3,
    subclasses: [
      { name: "Way of the Open Hand", desc: "Classic unarmed combat — knockdown, knockback, pressure points.", best: "Players who want clean punch-and-kick combat." },
      { name: "Way of Shadow", desc: "Stealth, teleportation, ki-fueled illusions. Ninja monk.", best: "Players who like sneaking and ambushing." },
    ],
  },
  {
    name: "Paladin",
    blurb: "Paladins are holy warriors bound by sacred oaths. Smite for huge damage, heal with Lay on Hands, aura-buff the party.",
    playstyle: "Great if you want a hero who fights for justice. Tanky support striker with devastating smite attacks.",
    hitDie: "d10", primaryAbility: "Strength & Charisma",
    savingThrows: ["Wisdom", "Charisma"],
    features: ["Divine Sense", "Lay on Hands"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/f4a25cc1f_Paladin1.png",
    spellcaster: "half", spellAbility: "cha", hasDeity: true, hasMount: true,
    subclassName: "Sacred Oath", subclassLevel: 3,
    subclasses: [
      { name: "Oath of Devotion", desc: "The classic paladin — honor, justice, smites against unholy foes.", best: "Lawful good champions." },
      { name: "Oath of the Ancients", desc: "Nature, beauty, defiance of darkness. Damage resistance aura.", best: "Defensive ranger-paladins." },
      { name: "Oath of Vengeance", desc: "Hunt evildoers. Mobility, Vow of Enmity for advantage.", best: "Single-target damage paladins." },
    ],
  },
  {
    name: "Ranger",
    blurb: "Rangers are skilled hunters who blend martial combat with nature magic. Bow, beast, and wilderness mastery.",
    playstyle: "Perfect if you love wilderness adventures and combining magic with combat. Beloved animal companion.",
    hitDie: "d10", primaryAbility: "Dexterity & Wisdom",
    savingThrows: ["Strength", "Dexterity"],
    features: ["Favored Enemy", "Natural Explorer"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/eed59ea36_Ranger1.png",
    spellcaster: "half", spellAbility: "wis", hasCompanion: true,
    subclassName: "Ranger Archetype", subclassLevel: 3,
    subclasses: [
      { name: "Hunter", desc: "Pick anti-horde, anti-boss, or defensive bonuses. Pure combat.", best: "Bow-focused damage rangers." },
      { name: "Beast Master", desc: "Gain a loyal animal companion. Fight side by side.", best: "Players who want a pet from level 3." },
    ],
    companions: [
      { name: "Wolf", desc: "Pack tactics — advantage when allies are adjacent." },
      { name: "Panther", desc: "Stealthy striker. Pounce knocks targets prone." },
      { name: "Hawk", desc: "Recon from above. Fragile but fast." },
      { name: "Boar", desc: "Charges and knocks prone. Relentless." },
      { name: "Mastiff", desc: "Loyal guard dog. Knocks targets prone." },
    ],
  },
  {
    name: "Rogue",
    blurb: "Rogues rely on stealth, skill, and cunning. Sneak attack for burst damage; Expertise doubles your best skills.",
    playstyle: "Best if you enjoy stealth, skill use, and tactical combat. High burst damage and elite scouting.",
    hitDie: "d8", primaryAbility: "Dexterity",
    savingThrows: ["Dexterity", "Intelligence"],
    features: ["Expertise", "Sneak Attack", "Thieves' Cant"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/eddae7d4e_Rogue1.png",
    spellcaster: false, spellAbility: null,
    subclassName: "Roguish Archetype", subclassLevel: 3,
    subclasses: [
      { name: "Thief", desc: "Fast hands (bonus action utility), second-story work. Classic burglar.", best: "Skill-heavy adventurers." },
      { name: "Assassin", desc: "Auto-crit surprise attacks, disguises, poisons.", best: "Burst damage from the shadows." },
      { name: "Arcane Trickster", desc: "Wizard spells, Mage Hand legerdemain. Spell + skill hybrid.", best: "Spellsword rogues." },
    ],
  },
  {
    name: "Sorcerer",
    blurb: "Sorcerers have innate magic in their blood. Fewer spells than wizards, but they bend them with Metamagic.",
    playstyle: "Ideal if you want powerful spell modifications and dynamic magic. Twin a Haste, Quicken a Fireball.",
    hitDie: "d6", primaryAbility: "Charisma",
    savingThrows: ["Constitution", "Charisma"],
    features: ["Spellcasting", "Sorcerous Origin"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/bcebcaf04_Sorcerer1.png",
    spellcaster: "full", spellAbility: "cha", hasOrigin: true,
    subclassName: "Sorcerous Origin", subclassLevel: 1,
    subclasses: [
      { name: "Draconic Bloodline", desc: "Dragon ancestry — bonus HP, scaly skin, breath-themed damage.", best: "Durable blasters." },
      { name: "Wild Magic", desc: "Roll on the Wild Magic table — chaos triggers when you cast.", best: "Players who love unpredictability." },
    ],
  },
  {
    name: "Warlock",
    blurb: "Warlocks made a pact with an otherworldly being for power. Eldritch Blast is your signature. Slots recharge on short rests.",
    playstyle: "Great if you love dark themes and powerful single-target attacks. Mysterious patrons and eldritch power.",
    hitDie: "d8", primaryAbility: "Charisma",
    savingThrows: ["Wisdom", "Charisma"],
    features: ["Otherworldly Patron", "Pact Magic"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/3eb6d8a78_Warlock1.png",
    spellcaster: "pact", spellAbility: "cha", hasPatron: true, hasFamiliar: true,
    subclassName: "Otherworldly Patron", subclassLevel: 1,
    subclasses: [
      { name: "The Fiend", desc: "A pact with a devil or demon. Bonus temp HP on kills, fire spells.", best: "Damage-and-survival warlocks." },
      { name: "The Archfey", desc: "Pact with a fey lord. Charm, fear, fey teleports.", best: "Trickster warlocks." },
      { name: "The Great Old One", desc: "Eldritch alien horror. Telepathy, psychic damage, madness.", best: "Mysterious manipulators." },
    ],
    companions: [
      { name: "Imp", desc: "Fiendish. Invisible, shapechanger, telepathic." },
      { name: "Pseudodragon", desc: "Tiny dragon. Telepathy 100ft, magic resistance." },
      { name: "Sprite", desc: "Fey scout. Invisibility, read alignment on touch." },
      { name: "Quasit", desc: "Demonic shapechanger. Frighten on demand." },
    ],
  },
  {
    name: "Wizard",
    blurb: "Wizards are scholars of magic. The largest spell list of any class — your spellbook is your superpower.",
    playstyle: "Perfect if you love magic and want maximum spell variety. Tactical players who enjoy planning.",
    hitDie: "d6", primaryAbility: "Intelligence",
    savingThrows: ["Intelligence", "Wisdom"],
    features: ["Spellcasting", "Arcane Recovery"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a8da4ae3c_Wizard1.png",
    spellcaster: "full", spellAbility: "int",
    subclassName: "Arcane Tradition", subclassLevel: 2,
    subclasses: [
      { name: "School of Evocation", desc: "Sculpt your fireballs around allies. Damage school.", best: "Blaster wizards." },
      { name: "School of Divination", desc: "Portent — replace any roll with a pre-rolled d20.", best: "Strategic minds." },
      { name: "School of Abjuration", desc: "Arcane Ward absorbs damage. Tankier wizard.", best: "Defensive casters." },
    ],
  },
];

const ALIGNMENTS = [
  { name: "Lawful Good",    short: "LG", desc: "Honest and honorable. Acts for justice within rules.", example: "A paladin who never breaks oath." },
  { name: "Neutral Good",   short: "NG", desc: "Does the right thing — laws bend when people need help.", example: "A healer who shelters refugees." },
  { name: "Chaotic Good",   short: "CG", desc: "Free spirit fighting for the little guy.", example: "A thief who steals from tyrants." },
  { name: "Lawful Neutral", short: "LN", desc: "Order above all. Rules are sacred.", example: "A monk who keeps the code." },
  { name: "True Neutral",   short: "N",  desc: "Balance. Doesn't lean toward law, chaos, good, or evil.", example: "A druid protecting natural balance." },
  { name: "Chaotic Neutral",short: "CN", desc: "Acts on impulse. Personal freedom above all.", example: "A wandering rogue chasing the next thrill." },
  { name: "Lawful Evil",    short: "LE", desc: "Methodical, ambitious, willing to harm to win.", example: "A tyrant who keeps the trains running." },
  { name: "Neutral Evil",   short: "NE", desc: "Self-interest, no loyalty, no scruples.", example: "An assassin loyal only to gold." },
  { name: "Chaotic Evil",   short: "CE", desc: "Cruelty and destruction for their own sake.", example: "A berserker who burns it all down." },
];

// Normalize a brewery class (modEngine metadata shape) into the same
// shape CLASSES_DATA uses. Preserves provenance (_source, _mod_id, _raw)
// so later steps can read the full class schema.
function normalizeBreweryClass(mod) {
  const features = Array.isArray(mod.features) ? mod.features : [];
  const level1Features = features
    .filter((f) => Number(f?.level) === 1 && !f?.is_asi)
    .map((f) => f?.name)
    .filter(Boolean);
  const savePrimary =
    Array.isArray(mod.saving_throws) && mod.saving_throws.length > 0
      ? ABILITY_NAMES[mod.saving_throws[0]?.toLowerCase?.() || ""] || mod.saving_throws[0]
      : "";
  return {
    name: mod.name || mod._mod_name || "Unnamed Class",
    blurb: mod.description || "",
    playstyle: "",
    hitDie: mod.hit_die || "d8",
    primaryAbility: savePrimary,
    savingThrows: Array.isArray(mod.saving_throws)
      ? mod.saving_throws.map((s) => ABILITY_NAMES[s?.toLowerCase?.() || ""] || s)
      : [],
    features: level1Features,
    icon: mod.image_url || "",
    spellcaster: false, spellAbility: null,
    subclassName: "Brewery Path", subclassLevel: 3,
    subclasses: [],
    _source: "brewery",
    _mod_id: mod._mod_id,
    _mod_name: mod._mod_name || mod.name,
    _raw: mod,
  };
}

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
    if (!moddedClasses || moddedClasses.length === 0) return CLASSES_DATA;
    return [...CLASSES_DATA, ...moddedClasses.map(normalizeBreweryClass)];
  }, [moddedClasses]);

  // Portrait + profile state — drag/zoom with two-stage save.
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

  const selectedClass = combinedClasses.find((c) => c.name === characterData.class) || null;
  const selectedAlignment = ALIGNMENTS.find((a) => a.name === characterData.alignment) || null;
  const accent = (selectedClass && (CLASS_ACCENT[selectedClass.name] || "var(--orange)")) || "var(--orange)";

  // ── Portrait handlers ──────────────────────────────────────
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
    } catch {
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
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleMouseDown = (e, type) => {
    e.preventDefault();
    if (type === "full" && !fullBodySaved) {
      setIsDraggingFull(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (type === "profile" && !profileSaved) {
      setIsDraggingProfile(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  const handleMouseMove = (e) => {
    if (isDraggingFull) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setFullBodyPosition((p) => ({ x: p.x + dx, y: p.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDraggingProfile) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setProfilePosition((p) => ({ x: p.x + dx, y: p.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  const handleMouseUp = () => {
    setIsDraggingFull(false);
    setIsDraggingProfile(false);
  };
  useEffect(() => {
    if (isDraggingFull || isDraggingProfile) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraggingFull, isDraggingProfile, dragStart]);

  // ── Class + subclass selection ──────────────────────────────
  const handlePickClass = (cls) => {
    const baseUpdates = {
      class: cls.name,
      subclass: "",
      features: (cls?.features || []).map((f) => ({ name: f, source: cls.name, description: "" })),
    };
    const priorDeps = Array.isArray(characterData.mod_dependencies)
      ? characterData.mod_dependencies
      : [];
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

  const handlePickSubclass = (subclassName) => {
    updateCharacterData({ subclass: subclassName });
  };

  const profileImageUrl = characterData.profile_avatar_url || characterData.avatar_url;

  return (
    <div>
      <StepHeader
        kicker="Chapter II · The Calling"
        title="Choose your path"
        subtitle="What kind of hero is this? Each calling shapes your spells, your weapons, your destiny."
      />

      <Primer title="How to pick a class">
        Pick the <strong>fantasy</strong> first — the kind of hero you want to be. The mechanics
        will follow. Some classes — like Warlock, Paladin, Cleric — bring along a{" "}
        <strong>patron, deity, companion,</strong> or <strong>mount</strong> that you'll detail
        below.
      </Primer>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.55fr 1fr',
          gap: 28,
          alignItems: 'flex-start',
          marginTop: 28,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {selectedClass ? (
            <ClassFeaturedTome
              cls={selectedClass}
              accent={accent}
              subclass={characterData.subclass}
              level={characterData.level || 1}
              onPickSubclass={handlePickSubclass}
            />
          ) : (
            <EmptyClassPrompt />
          )}

          {selectedClass && (
            <BondsTome
              cls={selectedClass}
              accent={accent}
              data={characterData}
              update={updateCharacterData}
            />
          )}

          {selectedClass?._source === "brewery" && (
            <BreweryClassPickers
              characterData={characterData}
              updateCharacterData={updateCharacterData}
            />
          )}

          {selectedClass && (
            <div className="tome" style={{ padding: '32px 36px' }}>
              <OrnateHeading>Alignment</OrnateHeading>
              <AlignmentSection
                value={characterData.alignment}
                onPick={(name) => updateCharacterData({ alignment: name })}
                selected={selectedAlignment}
              />

              <FleurDivider />

              <OrnateHeading>Physical Details</OrnateHeading>
              <PhysicalDetails
                appearance={characterData.appearance || {}}
                onChange={(patch) =>
                  updateCharacterData({
                    appearance: { ...(characterData.appearance || {}), ...patch },
                  })
                }
              />

              <FleurDivider />

              <OrnateHeading>Biography</OrnateHeading>
              <textarea
                className="input italic-serif"
                value={characterData.description || ''}
                onChange={(e) => updateCharacterData({ description: e.target.value })}
                placeholder="Their story so far — origins, scars, the moment they took up the call..."
                rows={5}
                style={{
                  resize: 'vertical',
                  minHeight: 110,
                  fontFamily: 'var(--serif)',
                  fontSize: 15,
                  lineHeight: 1.55,
                  fontStyle: 'italic',
                }}
              />
            </div>
          )}

          {selectedClass && (selectedClass.hasCompanion || selectedClass.hasPatron) && (
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
            classes={combinedClasses}
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

          {selectedClass && <ClassBuildSummary cls={selectedClass} accent={accent} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE — same layout, inviting message (prototype's EmptyClassPrompt)
// ============================================================================
function EmptyClassPrompt() {
  return (
    <div
      className="tome"
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
      <div style={{ fontSize: 56, opacity: 0.4, marginBottom: 8 }}>✦</div>
      <div className="display" style={{ fontSize: 32, color: 'var(--text)' }}>
        Choose a calling
      </div>
      <div
        className="italic-serif"
        style={{ fontSize: 16, color: 'var(--text-dim)', maxWidth: 400, lineHeight: 1.5 }}
      >
        Pick one of the callings from the roster — the chapter will unfurl with their lore.
      </div>
    </div>
  );
}

// ============================================================================
// FEATURED CLASS TOME — hero + FleurDivider + subclass chapter
// ============================================================================
function ClassFeaturedTome({ cls, accent, subclass, level, onPickSubclass }) {
  return (
    <div className="tome" style={{ padding: '32px 36px' }}>
      <FeaturedClassHero cls={cls} accent={accent} />
      <FleurDivider />
      <SubclassChapter
        cls={cls}
        accent={accent}
        subclass={subclass}
        level={level}
        onPick={onPickSubclass}
      />
    </div>
  );
}

function FeaturedClassHero({ cls, accent }) {
  const family = CLASS_FAMILY[cls.name] || (cls._source === "brewery" ? "Brewery" : "Calling");
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
        <div
          style={{
            width: 100,
            height: 100,
            background: `radial-gradient(circle, ${accent}55 0%, ${accent}11 50%, transparent 75%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 64,
            lineHeight: 1,
            flexShrink: 0,
            filter: `drop-shadow(0 4px 16px ${accent}66)`,
          }}
        >
          {cls.icon ? (
            <img
              src={cls.icon}
              alt={cls.name}
              style={{ width: 80, height: 80, objectFit: 'contain', filter: 'sepia(0.1)' }}
            />
          ) : (
            <span style={{ filter: 'sepia(0.1)' }}>✦</span>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div className="label" style={{ color: accent, marginBottom: 6 }}>
            The {family}
          </div>
          <div
            className="display"
            style={{
              fontSize: 44,
              color: 'var(--text)',
              lineHeight: 1,
              marginBottom: 8,
              letterSpacing: 1,
              textShadow: `0 2px 16px ${accent}44`,
            }}
          >
            {cls.name}
          </div>
          <div className="italic-serif" style={{ fontSize: 15, color: 'var(--text-dim)' }}>
            Hit Die <span style={{ color: accent }}>{cls.hitDie}</span> &nbsp;·&nbsp;
            Primary <span style={{ color: accent }}>{cls.primaryAbility || '—'}</span> &nbsp;·&nbsp;
            Saves <span style={{ color: accent }}>{(cls.savingThrows || []).join(', ') || '—'}</span>
          </div>
        </div>
      </div>

      {cls.blurb && (
        <p className="body-prose" style={{ marginBottom: 18 }}>
          {cls.blurb}
        </p>
      )}

      {cls.playstyle && (
        <div
          style={{
            padding: 16,
            borderLeft: `3px solid ${accent}`,
            background: `linear-gradient(90deg, ${accent}14, transparent 80%)`,
            borderRadius: 4,
          }}
        >
          <div className="label" style={{ color: accent, marginBottom: 4 }}>✦ Playstyle</div>
          <div className="italic-serif" style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.55 }}>
            {cls.playstyle}
          </div>
        </div>
      )}
    </div>
  );
}

function SubclassChapter({ cls, accent, subclass, level, onPick }) {
  if (!cls.subclasses || cls.subclasses.length === 0) return null;
  const isPatron = !!cls.hasPatron;
  const heading = isPatron ? 'Otherworldly Patron' : (cls.subclassName || 'Subclass');
  const availableNow = (level || 1) >= (cls.subclassLevel || 3);
  return (
    <div>
      <OrnateHeading color={accent}>{heading}</OrnateHeading>

      <div
        className="italic-serif"
        style={{
          fontSize: 14,
          textAlign: 'center',
          color: availableNow ? 'var(--teal)' : 'var(--text-dim)',
          marginBottom: 18,
        }}
      >
        {availableNow
          ? `Active at your current level (${level || 1}).`
          : `Unlocks at level ${cls.subclassLevel} — pick now to plan your build.`}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: cls.subclasses.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        {cls.subclasses.map((s) => {
          const active = subclass === s.name;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => onPick(s.name)}
              className={`pickable ${active ? 'selected' : ''}`}
              style={{
                padding: 16,
                textAlign: 'left',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div className="display" style={{ fontSize: 18, color: 'var(--text)' }}>{s.name}</div>
              <div
                className="italic-serif"
                style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5, flex: 1 }}
              >
                {s.desc}
              </div>
              {s.best && (
                <div
                  style={{
                    fontSize: 12,
                    color: accent,
                    marginTop: 4,
                    fontFamily: 'var(--serif)',
                    fontStyle: 'italic',
                  }}
                >
                  ✦ Best for: {s.best}
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
// BONDS TOME — patrons / deities / companions / mounts / circles / origins
// ============================================================================
function bondsForClass(cls, data) {
  const bonds = [];
  const subclass = (cls.subclasses || []).find((s) => s.name === data.subclass) || null;

  if (cls.name === "Warlock") {
    bonds.push({
      key: "patron",
      label: "Your Patron",
      kicker: "The being you serve",
      presetOptions: (cls.subclasses || []).map((s) => ({ id: s.name, name: s.name, desc: s.desc })),
      preset: subclass ? { name: subclass.name, desc: subclass.desc } : null,
      placeholder: "Asmodeus, Mab, the Whisper Beyond...",
      descPlaceholder: "What do they want from you? How did the pact form?",
    });
    bonds.push({
      key: "familiar",
      label: "Pact of the Chain Familiar",
      kicker: "Optional — unlocks at level 3 with Pact of the Chain",
      presetOptions: (cls.companions || []).map((c) => ({ id: c.name, name: c.name, desc: c.desc })),
      preset: null,
      placeholder: "Wisp, Shadowclaw, Bound-In-Chains...",
      descPlaceholder: "What does it look like? What does it whisper?",
    });
  }

  if (cls.name === "Ranger") {
    bonds.push({
      key: "companion",
      label: "Animal Companion",
      kicker: "Beast Master ranger — unlocks at level 3",
      presetOptions: (cls.companions || []).map((c) => ({ id: c.name, name: c.name, desc: c.desc })),
      preset: null,
      placeholder: "Rangefur, Talonshine, Old Boar...",
      descPlaceholder: "How did they bond? What's their personality?",
    });
  }

  if (cls.name === "Paladin") {
    bonds.push({
      key: "deity",
      label: "Your Deity",
      kicker: "The power your oath is sworn to",
      placeholder: "Bahamut, the Dawnflower, the Silent Watcher...",
      descPlaceholder: "What does your deity stand for? What rites do you keep?",
    });
    bonds.push({
      key: "mount",
      label: "Celestial Mount",
      kicker: "Optional — unlocks via Find Steed at level 5",
      placeholder: "Brightmane, Stormhoof, Last-Sunrise...",
      descPlaceholder: "Pegasus, warhorse, dire wolf — what answers your call?",
    });
  }

  if (cls.name === "Cleric") {
    bonds.push({
      key: "deity",
      label: "Your Deity",
      kicker: subclass ? `Chosen of the ${subclass.name}` : "The god whose miracles you channel",
      placeholder: "Pelor, Moradin, the Raven Queen...",
      descPlaceholder: "What does your god demand? What do you preach?",
    });
  }

  if (cls.name === "Druid") {
    bonds.push({
      key: "circle",
      label: "Your Druidic Circle",
      kicker: "The grove or order that taught you",
      placeholder: "Circle of the Iron Birch, the Tidal Court...",
      descPlaceholder: "Where do you gather? What rites do you observe?",
    });
  }

  if (cls.name === "Sorcerer") {
    bonds.push({
      key: "origin",
      label: "Source of your magic",
      kicker: subclass ? subclass.name : "The wellspring of your power",
      preset: subclass ? { name: subclass.name, desc: subclass.desc } : null,
      placeholder: "My dragon ancestor Vrazak, a wild surge in the womb...",
      descPlaceholder: "How does the magic feel? Does it want anything?",
    });
  }

  return bonds;
}

function BondsTome({ cls, accent, data, update }) {
  const bonds = bondsForClass(cls, data);
  if (bonds.length === 0) return null;

  return (
    <div className="tome" style={{ padding: '32px 36px' }}>
      <OrnateHeading color={accent}>Bonds &amp; Allies</OrnateHeading>
      <div
        className="italic-serif"
        style={{
          textAlign: 'center',
          color: 'var(--text-dim)',
          fontSize: 15,
          maxWidth: 600,
          margin: '0 auto 22px',
        }}
      >
        Your hero doesn't walk alone. Detail the beings — divine, infernal, animal — that shape their power.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {bonds.map((bond) => (
          <AllyCard
            key={bond.key}
            bond={bond}
            accent={accent}
            data={data}
            update={update}
          />
        ))}
      </div>
    </div>
  );
}

function AllyCard({ bond, accent, data, update }) {
  const allies = data.allies || {};
  const ally = allies[bond.key] || {};
  const setAlly = (patch) => {
    update({ allies: { ...allies, [bond.key]: { ...ally, ...patch } } });
  };

  const effectiveName = ally.name ?? bond.preset?.name ?? '';
  const effectiveDesc = ally.desc ?? bond.preset?.desc ?? '';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: 20,
        padding: 20,
        background: `linear-gradient(135deg, ${accent}0E, transparent 70%)`,
        border: `1px solid ${accent}33`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
      }}
    >
      <AllyPortrait
        src={ally.image}
        onChange={(img) => setAlly({ image: img })}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div className="label" style={{ color: accent, marginBottom: 4 }}>{bond.kicker}</div>
          <div className="display" style={{ fontSize: 22, color: 'var(--text)' }}>{bond.label}</div>
        </div>

        {bond.presetOptions && bond.presetOptions.length > 0 && (
          <PresetPicker
            options={bond.presetOptions}
            current={ally.presetId}
            color={accent}
            onPick={(opt) => setAlly({
              presetId: opt.id,
              name: ally.name?.trim() ? ally.name : opt.name,
              desc: ally.desc?.trim() ? ally.desc : opt.desc,
            })}
          />
        )}

        <div>
          <div className="label" style={{ marginBottom: 4, color: 'var(--text-dim)' }}>Name</div>
          <input
            className="input"
            value={effectiveName}
            onChange={(e) => setAlly({ name: e.target.value })}
            placeholder={bond.placeholder}
            style={{ fontFamily: 'var(--display)', fontSize: 18 }}
          />
        </div>

        <div>
          <div className="label" style={{ marginBottom: 4, color: 'var(--text-dim)' }}>Description</div>
          <textarea
            className="input italic-serif"
            value={effectiveDesc}
            onChange={(e) => setAlly({ desc: e.target.value })}
            placeholder={bond.descPlaceholder}
            rows={3}
            style={{
              resize: 'vertical',
              minHeight: 70,
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function AllyPortrait({ src, onChange }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]); }}
      style={{
        width: '100%',
        height: 160,
        borderRadius: 8,
        background: src ? `url(${src}) center/cover` : 'rgba(11,19,28,0.6)',
        border: `2px ${drag ? 'solid' : 'dashed'} ${drag || src ? 'var(--orange)' : 'var(--border-strong)'}`,
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color .15s, background .15s',
        overflow: 'hidden',
      }}
    >
      {!src && (
        <div style={{ textAlign: 'center', color: 'var(--text-faint)', pointerEvents: 'none', padding: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 6, opacity: 0.5 }}>⊕</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>Drop their likeness</div>
        </div>
      )}
      {src && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(''); }}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            background: 'rgba(0,0,0,0.72)',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '3px 7px',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Replace
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

function PresetPicker({ options, current, color, onPick }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 6, color: 'var(--text-dim)' }}>
        Pick a preset (you can edit)
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map((opt) => {
          const active = current === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPick(opt)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: active ? color : 'transparent',
                color: active ? 'white' : 'var(--text-dim)',
                border: `1px solid ${active ? color : 'var(--border)'}`,
                transition: 'all .15s',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.borderColor = color;
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {opt.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// ALIGNMENT SECTION — 3x3 .pickable grid (prototype's AlignmentSection)
// ============================================================================
function AlignmentSection({ value, onPick, selected }) {
  return (
    <div>
      <div
        className="italic-serif"
        style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 14, textAlign: 'center' }}
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
        {ALIGNMENTS.map((a) => {
          const active = value === a.name;
          const [w1, w2] = a.name.split(' ');
          return (
            <button
              key={a.name}
              type="button"
              onClick={() => onPick(a.name)}
              className={`pickable ${active ? 'selected' : ''}`}
              style={{ padding: '12px 8px', textAlign: 'center', color: 'inherit' }}
            >
              <div
                className="display"
                style={{
                  fontSize: 13,
                  color: active ? 'var(--orange-soft)' : 'var(--gold-soft)',
                  marginBottom: 2,
                }}
              >
                {a.short}
              </div>
              <div
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: 0.2 }}
              >
                {w1}
                <br />
                {w2 || ' '}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className="italic-serif fade-in"
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.5,
            maxWidth: 540,
            margin: '16px auto 0',
          }}
        >
          <strong
            className="display"
            style={{ color: 'var(--orange-soft)', fontSize: 16, fontWeight: 'normal' }}
          >
            {selected.name}.
          </strong>{' '}
          {selected.desc}{' '}
          <span style={{ color: 'var(--text-faint)' }}>— {selected.example}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PHYSICAL DETAILS — preserved from existing creator
// ============================================================================
function PhysicalDetails({ appearance, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <div>
        <div className="label" style={{ marginBottom: 6 }}>Age</div>
        <input
          type="number"
          className="input"
          value={appearance.age || ''}
          onChange={(e) =>
            onChange({ age: e.target.value === '' ? '' : parseInt(e.target.value, 10) })
          }
          placeholder="25"
        />
      </div>
      <div>
        <div className="label" style={{ marginBottom: 6 }}>Height</div>
        <input
          className="input"
          value={appearance.height || ''}
          onChange={(e) => onChange({ height: e.target.value })}
          placeholder={"5'10\""}
        />
      </div>
      <div>
        <div className="label" style={{ marginBottom: 6 }}>Weight</div>
        <input
          className="input"
          value={appearance.weight || ''}
          onChange={(e) => onChange({ weight: e.target.value })}
          placeholder="180 lbs"
        />
      </div>
    </div>
  );
}

// ============================================================================
// CLASS ROSTER (right rail) — prototype's exact medallion grid
// ============================================================================
function ClassRoster({ classes, current, onPick }) {
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="label" style={{ marginBottom: 12 }}>The Twelve Callings</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {classes.map((c) => {
          const active = c.name === current;
          const accent = CLASS_ACCENT[c.name] || 'var(--teal)';
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
                  fontSize: 22,
                  lineHeight: 1,
                  marginBottom: 4,
                  filter: active ? 'none' : 'grayscale(0.4) opacity(0.75)',
                  transition: 'filter .2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 32,
                }}
              >
                {c.icon ? (
                  <img src={c.icon} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
                ) : (
                  <span>✦</span>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: active ? accent : 'var(--text-dim)',
                  letterSpacing: 0.3,
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
                    background: 'var(--teal)',
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
// CLASS BUILD SUMMARY (right rail) — prototype's panel-strong with corners
// ============================================================================
function ClassBuildSummary({ cls, accent }) {
  const subcls = (cls.subclasses || []).find((s) => s.name) && null;
  return (
    <div className="panel-strong" style={{ padding: 18, position: 'relative' }}>
      <div className="tome-corner tr" />
      <div className="tome-corner bl" />

      <div className="ornate-heading" style={{ marginBottom: 16 }}>
        <span className="ornate-flourish small" style={{ background: accent }} />
        <h3 style={{ fontSize: 18, color: 'var(--text)' }}>{cls.name} build</h3>
        <span className="ornate-flourish small" style={{ background: accent }} />
      </div>

      <SummaryRow label="Hit Die" value={cls.hitDie} />
      <SummaryRow label="Primary" value={cls.primaryAbility || '—'} />
      <SummaryRow label="Saves" value={(cls.savingThrows || []).join(', ') || '—'} />
      <SummaryRow
        label="Caster"
        value={
          cls.spellcaster === 'full' ? 'Full'
          : cls.spellcaster === 'pact' ? 'Pact magic'
          : cls.spellcaster === 'half' ? 'Half'
          : '—'
        }
      />
      {subcls && <SummaryRow label={cls.subclassName} value={subcls.name} />}

      {(cls.features || []).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="label" style={{ marginBottom: 8 }}>Level 1 Features</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cls.features.map((f) => (
              <div
                key={f}
                style={{
                  fontSize: 13,
                  color: 'var(--text)',
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

function SummaryRow({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '6px 0',
        borderBottom: '1px solid var(--border)',
        fontSize: 13,
      }}
    >
      <span
        style={{
          color: 'var(--text-faint)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// PORTRAIT PANEL (full body) — drag/zoom positioning, preserved from
// existing creator. The prototype's IdentityCodex uses a simpler
// PortraitUpload; the existing creator's drag-zoom is the brief-explicit
// "portrait drag-zoom uploader".
// ============================================================================
function PortraitPanel({
  label, avatarUrl, position, zoom, saved, uploading,
  onUpload, onMouseDown, onZoomChange, onSave, onEdit,
  inputId, aspectRatio,
}) {
  return (
    <div className="panel-strong" style={{ padding: 16, position: 'relative' }}>
      <div className="label" style={{ marginBottom: 10, color: 'var(--gold-soft)' }}>
        {label}
      </div>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 8,
          background: 'rgba(20, 12, 8, 0.5)',
          border: '1px solid var(--border)',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text)' }}>
                  <Move className="w-3 h-3" />
                  <span>Drag to reposition</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ZoomOut className="w-3 h-3" style={{ color: 'var(--text)' }} />
                  <Slider
                    value={[zoom]}
                    onValueChange={onZoomChange}
                    min={0.5}
                    max={3}
                    step={0.1}
                    className="flex-1"
                  />
                  <ZoomIn className="w-3 h-3" style={{ color: 'var(--text)' }} />
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
                  background: 'var(--orange)',
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
              color: 'var(--text-faint)',
            }}
          >
            <User className="w-16 h-16" style={{ opacity: 0.35, marginBottom: 10 }} />
            <p className="italic-serif" style={{ fontSize: 13, color: 'var(--text-faint)' }}>
              Drop your character art
            </p>
          </div>
        )}
      </div>

      {avatarUrl && !saved && (
        <button
          type="button"
          onClick={onSave}
          className="btn btn-primary"
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
        className="btn btn-primary"
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
// PROFILE PANEL (round avatar) — drag/zoom positioning, preserved from
// existing creator.
// ============================================================================
function ProfilePanel({
  avatarUrl, position, zoom, saved, uploading,
  onUpload, onMouseDown, onZoomChange, onSave, onEdit,
}) {
  return (
    <div className="panel-strong" style={{ padding: 16 }}>
      <div className="label" style={{ marginBottom: 10, color: 'var(--gold-soft)' }}>
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
              border: '2px solid var(--orange)',
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
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User className="w-12 h-12" style={{ color: 'var(--text-faint)', opacity: 0.45 }} />
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
                background: 'var(--orange)',
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
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'var(--text-dim)',
              marginBottom: 8,
            }}
          >
            <Move className="w-3 h-3" />
            <span>Drag to reposition</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ZoomOut className="w-3 h-3" style={{ color: 'var(--text-dim)' }} />
            <Slider
              value={[zoom]}
              onValueChange={onZoomChange}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="w-3 h-3" style={{ color: 'var(--text-dim)' }} />
          </div>
          <button
            type="button"
            onClick={onSave}
            className="btn btn-primary"
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
        className="btn btn-primary"
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
// BREWERY CLASS PICKERS — minimal stub; the original 250-line picker has
// been replaced with a slim flag panel since brewery classes flow their
// data through applyBreweryClassBaseline at class-pick time. If a campaign
// installs a brewery class that needs extra player choices, they surface
// via the standard subclass / skill / spell pickers downstream.
// ============================================================================
function BreweryClassPickers({ characterData }) {
  const breweryClass = characterData?._brewery_class || null;
  if (!breweryClass) return null;
  return (
    <div className="tome" style={{ padding: '24px 28px' }}>
      <div
        className="label"
        style={{ color: 'var(--teal)', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <Sparkles className="w-3 h-3" /> Brewery class
      </div>
      <p className="italic-serif" style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
        Your campaign's <strong style={{ color: 'var(--text)' }}>{breweryClass.name}</strong> is
        loaded. Class-specific options (subclass, skills, spells) appear on their respective steps.
      </p>
    </div>
  );
}
