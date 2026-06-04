import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { ABILITY_NAMES } from "@/components/dnd5e/dnd5eRules";
import { getModdedClasses } from "@/lib/modEngine";
import {
  applyBreweryClassBaseline,
  clearBreweryClassMarkers,
} from "@/lib/breweryClassApply";
import { LevelPicker } from "@/components/characterCreator/LevelPicker";
import { trimChoicesToLevel } from "@/components/characterCreator/levelTrim";
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
// Exported so the Bonds & Allies step (which renders the gated bond
// cards relocated off this step) tints them with the same palette.
export const CLASS_ACCENT = {
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
// Exported so the Bonds & Allies step can resolve the picked class's
// data object (for bondsForClass + the Warlock patron readout) without
// duplicating the roster.
export const CLASSES_DATA = [
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
    ],
  },
  {
    name: "Monk",
    blurb: "Monks channel ki — fast, mobile, unarmored, deadly. Multiple attacks, mobility, surgical takedowns.",
    playstyle: "Ideal if you want high mobility and lots of attacks. Monks are tactical and rewarding with unique mechanics.",
    hitDie: "d8", primaryAbility: "Dexterity & Wisdom",
    savingThrows: ["Strength", "Dexterity"],
    features: ["Unarmored Defense", "Martial Arts"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/f2e85e13a_Monk1.png",
    spellcaster: false, spellAbility: null,
    subclassName: "Monastic Tradition", subclassLevel: 3,
    subclasses: [
      { name: "Way of the Open Hand", desc: "Classic unarmed combat — knockdown, knockback, pressure points.", best: "Players who want clean punch-and-kick combat." },
    ],
  },
  {
    name: "Paladin",
    blurb: "Paladins are holy warriors bound by sacred oaths. Smite for huge damage, heal with Lay on Hands, aura-buff the party.",
    playstyle: "Great if you want a hero who fights for justice. Tanky support striker with devastating smite attacks.",
    hitDie: "d10", primaryAbility: "Strength & Charisma",
    savingThrows: ["Wisdom", "Charisma"],
    features: ["Divine Sense", "Lay on Hands"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/1eb7cd2f2_Paladin1.png",
    spellcaster: "half", spellAbility: "cha", hasDeity: true, hasMount: true,
    subclassName: "Sacred Oath", subclassLevel: 3,
    subclasses: [
      { name: "Oath of Devotion", desc: "The classic paladin — honor, justice, smites against unholy foes.", best: "Lawful good champions." },
    ],
  },
  {
    name: "Ranger",
    blurb: "Rangers are skilled hunters who blend martial combat with nature magic. Bow, beast, and wilderness mastery.",
    playstyle: "Perfect if you love wilderness adventures and combining magic with combat. Beloved animal companion.",
    hitDie: "d10", primaryAbility: "Dexterity & Wisdom",
    savingThrows: ["Strength", "Dexterity"],
    features: ["Favored Enemy", "Natural Explorer"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/748e5be38_Ranger1.png",
    spellcaster: "half", spellAbility: "wis",
    subclassName: "Ranger Archetype", subclassLevel: 3,
    subclasses: [
      { name: "Hunter", desc: "Pick anti-horde, anti-boss, or defensive bonuses. Pure combat.", best: "Bow-focused damage rangers." },
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
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a66f2aac1_Rogue1.png",
    spellcaster: false, spellAbility: null,
    subclassName: "Roguish Archetype", subclassLevel: 3,
    subclasses: [
      { name: "Thief", desc: "Fast hands (bonus action utility), second-story work. Classic burglar.", best: "Skill-heavy adventurers." },
    ],
  },
  {
    name: "Sorcerer",
    blurb: "Sorcerers have innate magic in their blood. Fewer spells than wizards, but they bend them with Metamagic.",
    playstyle: "Ideal if you want powerful spell modifications and dynamic magic. Twin a Haste, Quicken a Fireball.",
    hitDie: "d6", primaryAbility: "Charisma",
    savingThrows: ["Constitution", "Charisma"],
    features: ["Spellcasting", "Sorcerous Origin"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/6f5b501db_Sorceror1.png",
    spellcaster: "full", spellAbility: "cha", hasOrigin: true,
    subclassName: "Sorcerous Origin", subclassLevel: 1,
    subclasses: [
      { name: "Draconic Bloodline", desc: "Dragon ancestry — bonus HP, scaly skin, breath-themed damage.", best: "Durable blasters." },
    ],
  },
  {
    name: "Warlock",
    blurb: "Warlocks made a pact with an otherworldly being for power. Eldritch Blast is your signature. Slots recharge on short rests.",
    playstyle: "Great if you love dark themes and powerful single-target attacks. Mysterious patrons and eldritch power.",
    hitDie: "d8", primaryAbility: "Charisma",
    savingThrows: ["Wisdom", "Charisma"],
    features: ["Otherworldly Patron", "Pact Magic"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/184c98268_Warlock1.png",
    spellcaster: "pact", spellAbility: "cha", hasPatron: true, hasFamiliar: true,
    subclassName: "Otherworldly Patron", subclassLevel: 1,
    subclasses: [
      { name: "The Fiend", desc: "A pact with a devil or demon. Bonus temp HP on kills, fire spells.", best: "Damage-and-survival warlocks." },
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
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/94cfaa28a_Wizard1.png",
    spellcaster: "full", spellAbility: "int",
    subclassName: "Arcane Tradition", subclassLevel: 2,
    subclasses: [
      { name: "School of Evocation", desc: "Sculpt your fireballs around allies. Damage school.", best: "Blaster wizards." },
    ],
  },
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

  const selectedClass = combinedClasses.find((c) => c.name === characterData.class) || null;
  const accent = (selectedClass && (CLASS_ACCENT[selectedClass.name] || "var(--orange)")) || "var(--orange)";

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

  // Level is set once, here on the Class step (relocated from Identity +
  // the old Features-step picker). Clamp 1–20; downstream HP / proficiency
  // / slots / feature accumulation all read characterData.level.
  const handlePickLevel = (newLevel) => {
    const lvl = Math.max(1, Math.min(20, Number(newLevel) || 1));
    // On a level DECREASE, trim choices that are no longer legal
    // (over-cap spells, excess invocations/arcanum/expertise, a subclass
    // picked above the new level) so nothing stale persists or locks.
    const trim = lvl < (Number(characterData.level) || 1)
      ? trimChoicesToLevel(characterData, lvl)
      : {};
    updateCharacterData({ level: lvl, ...trim });
  };

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
          <div className="tome" style={{ padding: '24px 28px' }}>
            <LevelPicker
              totalLevel={characterData.level || 1}
              primaryClassName={characterData.class || ''}
              primaryClassLevel={characterData.level || 1}
              multiclasses={[]}
              onChange={handlePickLevel}
            />
          </div>

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

          {/* Bonds & Allies relocated to its own step (after Skills,
              before Equipment) — see BondsAndAlliesStep. The gated bond
              cards, patron readout, and familiar picker now live there
              alongside the universal free-create relationships section. */}

          {selectedClass?._source === "brewery" && (
            <BreweryClassPickers
              characterData={characterData}
              updateCharacterData={updateCharacterData}
            />
          )}
        </div>

        {/* RIGHT — class roster + build summary, sticky rail.
            Alignment, physical details, biography, portrait and profile
            uploaders moved to IdentityStep per prototype step-class.jsx. */}
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
          : `Unlocks at level ${cls.subclassLevel}. Raise your level above to choose.`}
      </div>

      {/* Subclass is gated by level: the picker only appears once the
          class actually grants the subclass (level >= subclassLevel).
          Below that, no picker — closing the "pick before you've
          unlocked it" leak. */}
      {availableNow && (
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
      )}
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
