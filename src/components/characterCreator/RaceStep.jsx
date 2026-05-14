import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RACES, BACKGROUNDS as SRD_BACKGROUNDS } from "@/components/dnd5e/dnd5eRules";
import { getModdedRaces } from "@/lib/modEngine";
import {
  applyBreweryRaceBaseline,
  applyBreweryRaceSubrace,
  clearBreweryRaceMarkers,
} from "@/lib/breweryRaceApply";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";

// ============================================================================
// Step 1: Identity — race + background, with a sticky right rail for the
// character codex (name + level). Exact port of
// design-reference/character-creator/step-identity.jsx, with the existing
// dnd5e data layer (RACES registry, brewery mod engine, SRD BACKGROUNDS
// dictionary) wired in place of the prototype's hard-coded arrays.
//
// Portrait / age / height / weight / biography stay on the Class step
// (which is where this codebase already collects them), per the brief's
// "background, alignment, name, portrait sections go to whichever
// existing steps handle them" rule.
// ============================================================================

// SRD 5e bonus-language pool. Used by the +1 choice picker for races that
// grant an extra language (Human base, Half-Elf, High Elf's Extra Language
// feature). Persisted into characterData.languages alongside the fixed list.
const SRD_LANGUAGES = [
  "Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin",
  "Halfling", "Orc", "Abyssal", "Celestial", "Draconic",
  "Deep Speech", "Infernal", "Primordial", "Sylvan", "Undercommon",
];

// Local race lore — name, subtypes, description, subtypeDescriptions,
// traits[], icon URL, image URL. This is the existing app's content
// (preserved verbatim) and lives inline so brewery races can be merged
// alongside without a parallel data path.
const RACE_LORE = [
  {
    name: "Dragonborn",
    subtypes: ["Gold", "Silver", "Bronze", "Copper", "Brass", "Red", "Blue", "Green", "Black", "White"],
    description: "Proud dragon-blooded warriors who walk into a room like destiny follows them. Their scales gleam with elemental power; their breath weapon and resistance are tied to their draconic ancestry.",
    subtypeDescriptions: {
      Gold: "Noble and wise — fire breath in a 15ft cone, fire resistance.",
      Silver: "Champions of good — cold breath in a 15ft cone, cold resistance.",
      Bronze: "Sea-loving honorable warriors — lightning line, lightning resistance.",
      Copper: "Witty and playful — acid line, acid resistance.",
      Brass: "Talkative and sociable — fire line, fire resistance.",
      Red: "Proud and arrogant — fire cone, fire resistance.",
      Blue: "Vain and territorial — lightning line, lightning resistance.",
      Green: "Cunning schemers — poison cone, poison resistance.",
      Black: "Cruel and sadistic — acid line, acid resistance.",
      White: "Savage bestial hunters — cold cone, cold resistance.",
    },
    traits: ["Breath Weapon", "Damage Resistance", "Draconic Ancestry"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/d987fae82_dragonbornraceicon.png",
  },
  {
    name: "Elf",
    subtypes: ["High Elf", "Wood Elf", "Drow"],
    description: "Graceful and long-lived, elves carry an innate connection to magic and the wild. Keen senses and natural agility define their step.",
    subtypeDescriptions: {
      "High Elf": "Studious and proud — one wizard cantrip; elf weapon training.",
      "Wood Elf": "Swift and stealthy — base speed 35; Mask of the Wild.",
      Drow: "Underground dwellers — superior darkvision (120ft); Drow Magic.",
    },
    traits: ["Darkvision", "Fey Ancestry", "Trance", "Keen Senses"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/f696b9d6e_elfraceicon.png",
  },
  {
    name: "Dwarf",
    subtypes: ["Mountain Dwarf", "Hill Dwarf"],
    description: "Bold and hardy — skilled warriors, miners, and craftspeople with a deep bond to stone and metal.",
    subtypeDescriptions: {
      "Mountain Dwarf": "Strong warriors — +2 Strength; armor proficiency.",
      "Hill Dwarf": "Especially hardy and perceptive — +1 Wisdom, +1 HP per level.",
    },
    traits: ["Darkvision", "Dwarven Resilience", "Stonecunning"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/7b31ed2b9_dwarfraceicon.png",
  },
  {
    name: "Human",
    subtypes: ["Standard"],
    description: "Versatile and ambitious — humans excel in any role and adapt faster than any other race.",
    subtypeDescriptions: {
      Standard: "Versatile — gains +1 to every ability score.",
    },
    traits: ["Versatile", "Extra Skill", "Ambitious"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/72c27f140_humanraceicon.png",
  },
  {
    name: "Halfling",
    subtypes: ["Lightfoot", "Stout"],
    description: "Small and nimble — naturally lucky and brave, with a knack for slipping past trouble.",
    subtypeDescriptions: {
      Lightfoot: "Naturally stealthy — can hide behind creatures one size larger.",
      Stout: "Hardy — advantage against poison; poison resistance.",
    },
    traits: ["Lucky", "Brave", "Halfling Nimbleness"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/1f05e3073_halflingraceicon.png",
  },
  {
    name: "Tiefling",
    subtypes: ["Asmodeus", "Baalzebul", "Dispater", "Fierna", "Glasya", "Levistus", "Mammon", "Mephistopheles", "Zariel"],
    description: "Descended from fiends, tieflings carry an infernal heritage — striking horns, tails, and a natural pull toward magic.",
    subtypeDescriptions: {
      Asmodeus: "Most common — thaumaturgy; hellish rebuke; darkness.",
      Baalzebul: "Lies and corruption — ray of sickness; crown of madness.",
      Dispater: "Schemers — disguise self; detect thoughts.",
      Fierna: "Manipulation — friends; charm person; suggestion.",
      Glasya: "Tricksters — minor illusion; disguise self; invisibility.",
      Levistus: "Frozen survivors — ray of frost; armor of Agathys; darkness.",
      Mammon: "Greed — mage hand; Tenser's floating disk; arcane lock.",
      Mephistopheles: "Arcane scholars — mage hand; burning hands; flame blade.",
      Zariel: "Warriors — thaumaturgy; searing smite; branding smite.",
    },
    traits: ["Darkvision", "Hellish Resistance", "Infernal Legacy"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/bf4ea2436_TieflingRaceIcon.png",
  },
  {
    name: "Half-Elf",
    subtypes: ["Standard Half-Elf", "Half-High Elf", "Half-Wood Elf", "Half-Drow"],
    description: "Walking in two worlds, half-elves combine human adaptability with elven grace — natural diplomats and bridges between cultures.",
    subtypeDescriptions: {
      "Standard Half-Elf": "Skill Versatility — proficiency in two skills of choice.",
      "Half-High Elf": "Elf Weapon Training; one wizard cantrip.",
      "Half-Wood Elf": "Speed 35; Mask of the Wild.",
      "Half-Drow": "Superior darkvision (120ft); Drow Magic.",
    },
    traits: ["Darkvision", "Fey Ancestry", "Heritage Trait"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/297cad9ca_halfelfraceicon.png",
  },
  {
    name: "Half-Orc",
    subtypes: ["Standard"],
    description: "Half-orcs combine human determination with orcish strength. Relentless and physically powerful — formidable warriors who refuse to stay down.",
    subtypeDescriptions: {
      Standard: "Powerful — +2 Strength, +1 Constitution. Survivors who refuse to fall.",
    },
    traits: ["Darkvision", "Relentless Endurance", "Savage Attacks"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/d4a087969_halforcraceicon.png",
  },
  {
    name: "Gnome",
    subtypes: ["Forest Gnome", "Rock Gnome"],
    description: "Small, clever, endlessly curious. Ingenious tinkerers and nature-lovers who find wonder in the world.",
    subtypeDescriptions: {
      "Forest Gnome": "Speaks to small beasts; knows minor illusion. +1 Dexterity.",
      "Rock Gnome": "Tinker — proficiency with tinker's tools; clockwork toys. +1 Constitution.",
    },
    traits: ["Darkvision", "Gnome Cunning", "Small Size"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/c56fbbc80_gnomeraceicon.png",
  },
];

// Background lore — the prototype's data.jsx content merged with the
// existing 2014 SRD BACKGROUNDS registry. Icon emoji, description blurb,
// and tip come from the prototype; skills / tools / languages mirror the
// SRD list so we don't fork from canon.
const BACKGROUND_LORE = [
  { name: "Acolyte", icon: "🛐", desc: "You served a temple or holy order. You know rites, faith, and how to find shelter at any shrine.", tip: "Great for clerics, paladins, monks — anyone whose backstory has roots in faith." },
  { name: "Criminal", icon: "🗝️", desc: "You've lived outside the law. You know fences, secret passages, and how to lie convincingly.", tip: "Rogues love this. Also any character whose past has rough edges." },
  { name: "Folk Hero", icon: "🌾", desc: "You stood up to a tyrant, saved a village, or pulled off something legendary. Commoners love you.", tip: "Fits fighters, rangers, barbarians from humble origins." },
  { name: "Noble", icon: "👑", desc: "You were born into wealth and status. You know etiquette, politics, and how to call in favors.", tip: "Charismatic classes — bards, sorcerers, paladins — shine here." },
  { name: "Sage", icon: "📜", desc: "A lifelong scholar. You know where to find the right book — and how to read what it says.", tip: "Wizards, artificers, anyone who loves lore." },
  { name: "Soldier", icon: "🛡️", desc: "You served in a fighting force. You know discipline, gear, and the chain of command.", tip: "Fighters, paladins, barbarians — natural fit." },
  { name: "Outlander", icon: "🏔️", desc: "You grew up in the wilds. Cities feel strange; the wilderness feels like home.", tip: "Rangers, druids, barbarians from far places." },
  { name: "Sailor", icon: "⚓", desc: "You crewed a ship. You know knots, weather, and how to brawl in a tavern.", tip: "Pairs with anyone — adventurers travel a lot." },
  { name: "Charlatan", icon: "🎭", desc: "You made your living deceiving people. You read motives like an open book.", tip: "Bards, rogues, sorcerers — anyone with a quick tongue." },
  { name: "Entertainer", icon: "🎵", desc: "You thrive in front of an audience — laughter, tears, riot, you stir them all.", tip: "Bards, rogues, monks — anyone who shines on stage." },
  { name: "Guild Artisan", icon: "🔨", desc: "You belong to a craft guild — a respected, established member of the mercantile world.", tip: "Artificers, fighters, wizards — characters with a trade." },
  { name: "Hermit", icon: "🕯️", desc: "You lived in seclusion. In your solitude, you found a discovery worth sharing.", tip: "Druids, wizards, clerics — contemplative builds." },
  { name: "Urchin", icon: "🪜", desc: "You grew up on the streets. You know shortcuts, hiding places, and how to make yourself small.", tip: "Rogues, monks, sorcerers — survivors." },
];

// Normalize a brewery race (modEngine metadata) into the same shape the
// SRD race lore array uses, so the carousel + featured panel + medallion
// row keep working without a parallel branch.
function normalizeBreweryRace(mod) {
  const subraces = Array.isArray(mod.subraces) ? mod.subraces : [];
  const subtypes = subraces.length > 0
    ? subraces.map((s) => s.name).filter(Boolean)
    : ["Standard"];
  const subtypeDescriptions = {};
  if (subraces.length > 0) {
    for (const s of subraces) {
      if (s?.name) subtypeDescriptions[s.name] = s.description || "";
    }
  } else {
    subtypeDescriptions.Standard = mod.description || "";
  }
  const traits = (Array.isArray(mod.traits) ? mod.traits : [])
    .map((t) => t?.name)
    .filter(Boolean);
  return {
    name: mod.name || mod._mod_name || "Unnamed Race",
    subtypes,
    description: mod.description || "",
    subtypeDescriptions,
    traits,
    icon: mod.image_url || "",
    _source: "brewery",
    _mod_id: mod._mod_id,
    _mod_name: mod._mod_name || mod.name,
    _raw: mod,
  };
}

// Compose ability bonuses by merging the base race registry with the
// active subrace overrides. Returns a flat { str: 2, cha: 1 } object the
// chip row maps over.
function bonusesFor(raceName, subraceName) {
  const data = RACES[raceName];
  if (!data) return {};
  const sub = subraceName && data.subraces ? (data.subraces[subraceName] || {}) : {};
  return { ...(data.abilityBonuses || {}), ...(sub.abilityBonuses || {}) };
}

// Compose the trait list with subrace overrides folded in.
function traitsFor(race, subraceName) {
  const base = race.traits || [];
  const subraceData = RACES[race.name]?.subraces?.[subraceName] || null;
  const subraceFeatures = subraceData?.features || [];
  return [...new Set([...base, ...subraceFeatures])];
}

// Speed / size resolution honoring subrace overrides (Wood Elf speed 35,
// Dwarves not slowed by heavy armor, etc.).
function speedFor(raceName, subraceName) {
  const data = RACES[raceName];
  if (!data) return 30;
  const sub = subraceName && data.subraces ? (data.subraces[subraceName] || {}) : {};
  return sub.speed ?? data.speed ?? 30;
}

function sizeFor(raceName) {
  return RACES[raceName]?.size || "Medium";
}

// Number of bonus-language "+1 choice" slots the race grants. Persisted as
// the extra slots on top of the fixed language list (Common, Elvish, etc.).
function bonusLanguageSlots(raceName, subraceName) {
  const data = RACES[raceName];
  if (!data) return 0;
  const baseLangs = Array.isArray(data.languages) ? data.languages : [];
  const subData = subraceName && data.subraces ? (data.subraces[subraceName] || {}) : {};
  const subLangs = Array.isArray(subData.languages) ? subData.languages : [];
  return baseLangs.filter((l) => l === "+1 choice").length
    + subLangs.filter((l) => l === "+1 choice").length;
}

function fixedLanguagesFor(raceName, subraceName) {
  const data = RACES[raceName];
  if (!data) return ["Common"];
  const baseLangs = Array.isArray(data.languages) ? data.languages : [];
  const subData = subraceName && data.subraces ? (data.subraces[subraceName] || {}) : {};
  const subLangs = Array.isArray(subData.languages) ? subData.languages : [];
  return [...new Set([...baseLangs, ...subLangs].filter((l) => l && l !== "+1 choice"))];
}

export default function RaceStep({ characterData, updateCharacterData, campaignId }) {
  const { data: moddedRaces = [] } = useQuery({
    queryKey: ["characterCreator", "moddedRaces", campaignId],
    queryFn: () => getModdedRaces(campaignId),
    enabled: !!campaignId,
    initialData: [],
  });

  const combinedRaces = useMemo(() => {
    if (!moddedRaces || moddedRaces.length === 0) return RACE_LORE;
    return [...RACE_LORE, ...moddedRaces.map(normalizeBreweryRace)];
  }, [moddedRaces]);

  const currentRace =
    combinedRaces.find((r) => r.name === characterData.race) || null;
  const currentSubrace = characterData.subrace || currentRace?.subtypes?.[0] || "";
  const selectedBackground = BACKGROUND_LORE.find((b) => b.name === characterData.background) || null;

  // ── Race selection ───────────────────────────────────────────
  const buildRaceUpdates = (race) => {
    const base = { race: race.name, subrace: race.subtypes[0] };
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
    return { ...base, ...clearBreweryRaceMarkers(), mod_dependencies: nonRaceDeps };
  };

  const handlePickRace = (race) => {
    updateCharacterData(buildRaceUpdates(race));
  };

  const handlePickSubrace = (subName) => {
    if (!currentRace) return;
    if (currentRace._source === "brewery") {
      const baseline = applyBreweryRaceBaseline(currentRace._raw || null, characterData);
      const subraceUpdates = applyBreweryRaceSubrace(
        currentRace._raw || null,
        subName,
        baseline.race_features || [],
      );
      updateCharacterData({ subrace: subName, ...subraceUpdates });
    } else {
      updateCharacterData({ subrace: subName });
    }
  };

  // Seed the first race on mount if the character has none yet — keeps
  // the validator gate happy and matches the existing creator's behavior.
  useEffect(() => {
    if (!characterData.race && combinedRaces.length > 0) {
      updateCharacterData(buildRaceUpdates(combinedRaces[0]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinedRaces]);

  return (
    <div>
      <StepHeader
        kicker="Chapter I · The Hero"
        title="Forge your hero"
        subtitle="Name, heritage, history — the soul of your character before they ever swing a sword."
      />

      <Primer title="New to D&D? Start here">
        Your character is the person you'll play. <strong>Race</strong> is the species you were
        born as — it sets your size, speed, and one or two special tricks. <strong>Background</strong>{" "}
        is what you did before adventuring — it gives you two skills and a unique perk. Don't
        overthink it — every combination tells a story.
      </Primer>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.55fr 1fr',
          gap: 28,
          marginTop: 32,
          alignItems: 'flex-start',
        }}
      >
        {/* LEFT — tome page with race, background, alignment in flowing sections */}
        <div className="tome" style={{ padding: '32px 36px' }}>
          <RaceSection
            currentRace={currentRace}
            currentSubrace={currentSubrace}
            characterData={characterData}
            updateCharacterData={updateCharacterData}
            combinedRaces={combinedRaces}
            onPickRace={handlePickRace}
            onPickSubrace={handlePickSubrace}
          />

          <FleurDivider />

          <BackgroundSection
            value={characterData.background}
            selected={selectedBackground}
            onPick={(name) => updateCharacterData({ background: name })}
          />
        </div>

        {/* RIGHT — character codex */}
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
// RACE SECTION — featured race tome on top, medallion rail beneath
// ============================================================================
function RaceSection({
  currentRace, currentSubrace, characterData, updateCharacterData,
  combinedRaces, onPickRace, onPickSubrace,
}) {
  return (
    <div>
      <OrnateHeading>Race</OrnateHeading>

      {currentRace ? (
        <FeaturedRace
          race={currentRace}
          subrace={currentSubrace}
          characterData={characterData}
          updateCharacterData={updateCharacterData}
          onPickSubrace={onPickSubrace}
        />
      ) : (
        <div
          className="primer"
          style={{
            textAlign: 'center',
            padding: 28,
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            color: 'var(--text-dim)',
            fontSize: 16,
          }}
        >
          Choose a heritage from the line below to reveal their tale.
        </div>
      )}

      {/* Race rail — bigger icons, hover-reveal name, click to feature */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(9, Math.max(6, combinedRaces.length))}, 1fr)`,
          gap: 8,
          marginTop: 18,
        }}
      >
        {combinedRaces.map((r) => (
          <RaceMedallion
            key={r._mod_id || r.name}
            race={r}
            active={currentRace?.name === r.name}
            onClick={() => onPickRace(r)}
          />
        ))}
      </div>
    </div>
  );
}

function FeaturedRace({ race, subrace, characterData, updateCharacterData, onPickSubrace }) {
  const isBrewery = race._source === "brewery";
  const speed = isBrewery ? (race._raw?.speed || 30) : speedFor(race.name, subrace);
  const size = isBrewery ? (race._raw?.size || "Medium") : sizeFor(race.name);
  const bonuses = isBrewery ? {} : bonusesFor(race.name, subrace);
  const traits = isBrewery ? (race.traits || []) : traitsFor(race, subrace);
  const langSlots = isBrewery ? 0 : bonusLanguageSlots(race.name, subrace);
  const fixedLangs = isBrewery ? [] : fixedLanguagesFor(race.name, subrace);

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 22 }}>
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
        {race.icon ? (
          <img
            src={race.icon}
            alt={race.name}
            style={{ width: 72, height: 72, objectFit: 'contain', filter: 'sepia(0.15) saturate(1.2)' }}
          />
        ) : (
          <span style={{ filter: 'sepia(0.15) saturate(1.2)' }}>✦</span>
        )}
      </div>

      <div>
        <div
          className="display"
          style={{
            fontSize: 36,
            color: 'var(--orange-soft)',
            lineHeight: 1,
            marginBottom: 8,
            letterSpacing: 1,
          }}
        >
          {race.name}
        </div>
        <p
          className="italic-serif"
          style={{ fontSize: 16, color: 'var(--text-dim)', margin: 0, marginBottom: 14, lineHeight: 1.55 }}
        >
          {race.description}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          <span className="chip chip-gold">Speed {speed} ft</span>
          <span className="chip chip-gold">Size {size}</span>
          {Object.entries(bonuses).map(([k, v]) => (
            <span key={k} className="chip chip-orange">{k.toUpperCase()} +{v}</span>
          ))}
          {traits.map((t) => (
            <span key={t} className="chip chip-neutral">{t}</span>
          ))}
        </div>

        {race.subtypes.length > 1 && (
          <div>
            <div className="label" style={{ marginBottom: 8, color: 'var(--gold-soft)' }}>
              Choose a lineage
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 8,
              }}
            >
              {race.subtypes.map((s) => {
                const active = subrace === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onPickSubrace(s)}
                    className={`pickable ${active ? 'selected-teal' : ''}`}
                    style={{ padding: '12px 14px', textAlign: 'left', color: 'inherit' }}
                  >
                    <div
                      className="display"
                      style={{ fontSize: 16, color: 'var(--text)', marginBottom: 4 }}
                    >
                      {s}
                    </div>
                    <div
                      className="italic-serif"
                      style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.45 }}
                    >
                      {race.subtypeDescriptions?.[s] || ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bonus-language picker — only renders for races with "+1 choice"
            in their language list (Human base, Half-Elf, High Elf's Extra
            Language). The prototype doesn't render this UI, but it owns
            characterData.languages persistence the existing data layer
            requires. Styled to blend with the prototype's chip vocabulary. */}
        {langSlots > 0 && (
          <BonusLanguagePicker
            slots={langSlots}
            fixedLangs={fixedLangs}
            value={characterData.languages || fixedLangs}
            onChange={(langs) => updateCharacterData({ languages: langs })}
          />
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
        borderRadius: 4,
        transition: 'all .15s',
        background: active ? 'rgba(255, 83, 0, 0.10)' : 'transparent',
        border: `1px solid ${active ? 'var(--orange)' : 'transparent'}`,
        boxShadow: active ? '0 0 16px var(--orange-glow)' : 'none',
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
        {race.icon ? (
          <img src={race.icon} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
        ) : (
          <span>✦</span>
        )}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: active ? 'var(--orange-soft)' : 'var(--text-dim)',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {race.name}
      </div>
    </button>
  );
}

function BonusLanguagePicker({ slots, fixedLangs, value, onChange }) {
  const fixedSet = new Set(fixedLangs);
  const chosen = (Array.isArray(value) ? value : []).filter((l) => !fixedSet.has(l));
  const available = SRD_LANGUAGES.filter((l) => !fixedSet.has(l));
  const setChosen = (next) => onChange([...fixedLangs, ...next]);

  const handlePick = (lang) => {
    if (chosen.includes(lang)) {
      setChosen(chosen.filter((x) => x !== lang));
    } else if (chosen.length < slots) {
      setChosen([...chosen, lang]);
    }
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div className="label" style={{ marginBottom: 6, color: 'var(--gold-soft)' }}>
        Bonus language{slots > 1 ? `s (pick ${slots})` : ''}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {available.map((lang) => {
          const picked = chosen.includes(lang);
          return (
            <button
              key={lang}
              type="button"
              onClick={() => handlePick(lang)}
              className={`pickable ${picked ? 'selected-gold' : ''}`}
              style={{
                padding: '6px 12px',
                textAlign: 'center',
                color: 'inherit',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {lang}
            </button>
          );
        })}
      </div>
      <div className="italic-serif" style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>
        {chosen.length}/{slots} chosen
      </div>
    </div>
  );
}

// ============================================================================
// BACKGROUND SECTION
// ============================================================================
function BackgroundSection({ value, selected, onPick }) {
  return (
    <div>
      <OrnateHeading>Background</OrnateHeading>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {BACKGROUND_LORE.map((b) => (
          <BackgroundChip
            key={b.name}
            bg={b}
            active={value === b.name}
            onClick={() => onPick(b.name)}
          />
        ))}
      </div>

      {selected && (
        <BackgroundDetail bg={selected} />
      )}
    </div>
  );
}

function BackgroundChip({ bg, active, onClick }) {
  const srd = SRD_BACKGROUNDS[bg.name];
  const skillsLine = srd?.skills?.length ? srd.skills.join(' & ') : '';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pickable ${active ? 'selected' : ''}`}
      style={{
        padding: '12px 14px',
        textAlign: 'left',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 18 }}>{bg.icon}</span>
        <span className="display" style={{ fontSize: 15, color: 'var(--text)' }}>{bg.name}</span>
      </div>
      <div className="italic-serif" style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.35 }}>
        {skillsLine}
      </div>
    </button>
  );
}

function BackgroundDetail({ bg }) {
  const srd = SRD_BACKGROUNDS[bg.name] || {};
  return (
    <div
      className="fade-in"
      style={{
        padding: '16px 20px',
        background: 'rgba(20, 12, 8, 0.5)',
        borderRadius: 4,
        borderLeft: '3px solid var(--gold)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>{bg.icon}</span>
        <span className="display" style={{ fontSize: 22, color: 'var(--orange-soft)' }}>
          {bg.name}
        </span>
      </div>
      <p
        className="italic-serif"
        style={{ fontSize: 14, color: 'var(--text-dim)', margin: '8px 0 14px', lineHeight: 1.5 }}
      >
        {bg.desc}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          columnGap: 14,
          rowGap: 6,
          fontSize: 13,
          marginBottom: 10,
        }}
      >
        {srd.skills?.length > 0 && (
          <>
            <span className="label" style={{ color: 'var(--gold-soft)' }}>Skills</span>
            <span style={{ color: 'var(--text)' }}>{srd.skills.join(' · ')}</span>
          </>
        )}
        {srd.tools?.length > 0 && (
          <>
            <span className="label" style={{ color: 'var(--gold-soft)' }}>Tools</span>
            <span style={{ color: 'var(--text)' }}>{srd.tools.join(' · ')}</span>
          </>
        )}
        {srd.languages > 0 && (
          <>
            <span className="label" style={{ color: 'var(--gold-soft)' }}>Languages</span>
            <span style={{ color: 'var(--text)' }}>{srd.languages} of your choice</span>
          </>
        )}
        {srd.feature && (
          <>
            <span className="label" style={{ color: 'var(--gold-soft)' }}>Feature</span>
            <span style={{ color: 'var(--text)' }}>{srd.feature}</span>
          </>
        )}
      </div>
      {bg.tip && (
        <div
          className="italic-serif"
          style={{ fontSize: 13, color: 'var(--gold-soft)', marginTop: 8, opacity: 0.9 }}
        >
          ✦ {bg.tip}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// IDENTITY CODEX — right rail (Name + Level only — portrait & appearance
// live on the Class step in this codebase, kept intentionally compact)
// ============================================================================
function IdentityCodex({ name, level, updateCharacterData }) {
  return (
    <div className="panel-strong" style={{ padding: 24, position: 'relative' }}>
      <div className="tome-corner tr" />
      <div className="tome-corner bl" />

      <div className="ornate-heading" style={{ marginBottom: 20 }}>
        <span className="ornate-flourish small" />
        <h3 style={{ fontSize: 22, color: 'var(--text)' }}>Codex</h3>
        <span className="ornate-flourish small" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="label" style={{ marginBottom: 6 }}>
          Character Name <span style={{ color: 'var(--orange)' }}>*</span>
        </div>
        <input
          className="input"
          value={name || ''}
          onChange={(e) => updateCharacterData({ name: e.target.value })}
          placeholder="e.g. Kael Stormwhisper"
          maxLength={40}
          style={{ fontSize: 16 }}
        />
      </div>

      <div>
        <div className="label" style={{ marginBottom: 6 }}>Level</div>
        <select
          className="input"
          value={String(level || 1)}
          onChange={(e) => updateCharacterData({ level: parseInt(e.target.value, 10) || 1 })}
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
            <option key={lvl} value={String(lvl)}>Level {lvl}</option>
          ))}
        </select>
      </div>

      <div
        className="italic-serif"
        style={{ marginTop: 18, fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.5 }}
      >
        Portrait, age, height, weight, and biography are set on the Class step.
      </div>
    </div>
  );
}
