import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, User, Move, ZoomIn, ZoomOut, Save, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { uploadFile } from "@/utils/uploadFile";
import { BUCKETS } from "@/config/storageConfig";
import { Slider } from "@/components/ui/slider";
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

// Alignment lore — moved from ClassStep (per prototype step-identity.jsx).
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
    subtypes: ["High Elf"],
    description: "Graceful and long-lived, elves carry an innate connection to magic and the wild. Keen senses and natural agility define their step.",
    subtypeDescriptions: {
      "High Elf": "Studious and proud — one wizard cantrip; elf weapon training.",
    },
    traits: ["Darkvision", "Fey Ancestry", "Trance", "Keen Senses"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/f696b9d6e_elfraceicon.png",
  },
  {
    name: "Dwarf",
    subtypes: ["Hill Dwarf"],
    description: "Bold and hardy — skilled warriors, miners, and craftspeople with a deep bond to stone and metal.",
    subtypeDescriptions: {
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
    subtypes: ["Lightfoot"],
    description: "Small and nimble — naturally lucky and brave, with a knack for slipping past trouble.",
    subtypeDescriptions: {
      Lightfoot: "Naturally stealthy — can hide behind creatures one size larger.",
    },
    traits: ["Lucky", "Brave", "Halfling Nimbleness"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/1f05e3073_halflingraceicon.png",
  },
  {
    name: "Tiefling",
    subtypes: [],
    description: "Descended from fiends, tieflings carry an infernal heritage — striking horns, tails, and a natural pull toward magic.",
    subtypeDescriptions: {},
    traits: ["Darkvision", "Hellish Resistance", "Infernal Legacy"],
    icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/races/bf4ea2436_TieflingRaceIcon.png",
  },
  {
    name: "Half-Elf",
    subtypes: [],
    description: "Walking in two worlds, half-elves combine human adaptability with elven grace — natural diplomats and bridges between cultures.",
    subtypeDescriptions: {},
    traits: ["Darkvision", "Fey Ancestry", "Skill Versatility"],
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
    subtypes: ["Rock Gnome"],
    description: "Small, clever, endlessly curious. Ingenious tinkerers and nature-lovers who find wonder in the world.",
    subtypeDescriptions: {
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
// SRD 5.1 ships exactly one background — Acolyte. The other 12 PHB
// backgrounds were trimmed for the public-release SRD lockdown; they're
// future Brewery content, not migrated here.
const BACKGROUND_LORE = [
  { name: "Acolyte", icon: "🛐", desc: "You served a temple or holy order. You know rites, faith, and how to find shelter at any shrine.", tip: "Great for clerics, paladins, monks — anyone whose backstory has roots in faith." },
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

export default function IdentityStep({ characterData, updateCharacterData, campaignId }) {
  const { user } = useAuth();
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
  const selectedAlignment = ALIGNMENTS.find((a) => a.name === characterData.alignment) || null;

  // Portrait + profile drag-zoom state — moved from ClassStep per prototype
  // step-identity.jsx IdentityCodex.
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

  // Character imagery goes to user-assets/users/{user_id}/character-library/
  // — the per-user convention shared with the Quick/AI flows. The old
  // base44.integrations.Core.UploadFile default targeted campaign-assets,
  // producing URLs that weren't valid for a player's own library.
  const characterLibraryPath = () =>
    user?.id ? `users/${user.id}/character-library` : "character-library";

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.id) {
      toast.error("Sign in to upload imagery.");
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, BUCKETS.USER, characterLibraryPath(), {
        userId: user.id,
        uploadType: "avatar",
      });
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
    if (!user?.id) {
      toast.error("Sign in to upload imagery.");
      return;
    }
    setUploadingProfile(true);
    try {
      const { file_url } = await uploadFile(file, BUCKETS.USER, characterLibraryPath(), {
        userId: user.id,
        uploadType: "avatar",
      });
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

  // ── Race selection ───────────────────────────────────────────
  const buildRaceUpdates = (race) => {
    // Races with no SRD subrace (Tiefling, Half-Elf, …) have an empty
    // subtypes list → no subrace. Single-subrace races default to it.
    const base = { race: race.name, subrace: race.subtypes[0] || "" };
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

          <FleurDivider />

          <AlignmentSection
            value={characterData.alignment}
            selected={selectedAlignment}
            onPick={(name) => updateCharacterData({ alignment: name })}
          />
        </div>

        {/* RIGHT — character codex with name + level + physical +
            portrait + avatar + biography per prototype IdentityCodex */}
        <div style={{ position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
          <IdentityCodex
            characterData={characterData}
            updateCharacterData={updateCharacterData}
            uploading={uploading}
            uploadingProfile={uploadingProfile}
            fullBodyPosition={fullBodyPosition}
            fullBodyZoom={fullBodyZoom}
            fullBodySaved={fullBodySaved}
            profilePosition={profilePosition}
            profileZoom={profileZoom}
            profileSaved={profileSaved}
            onImageUpload={handleImageUpload}
            onProfileImageUpload={handleProfileImageUpload}
            onMouseDown={handleMouseDown}
            setFullBodyZoom={setFullBodyZoom}
            setProfileZoom={setProfileZoom}
            onSaveFullBody={() => {
              setFullBodySaved(true);
              updateCharacterData({
                avatar_position: fullBodyPosition,
                avatar_zoom: fullBodyZoom,
              });
            }}
            onEditFullBody={() => setFullBodySaved(false)}
            onSaveProfile={() => {
              setProfileSaved(true);
              updateCharacterData({
                profile_position: profilePosition,
                profile_zoom: profileZoom,
              });
            }}
            onEditProfile={() => setProfileSaved(false)}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AlignmentSection — 3x3 .pickable grid per prototype step-identity.jsx
// ============================================================================
function AlignmentSection({ value, selected, onPick }) {
  return (
    <div>
      <OrnateHeading>Alignment</OrnateHeading>
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
                {w2 || ' '}
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
          gridTemplateColumns: `repeat(3, 1fr)`,
          gap: 10,
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
function IdentityCodex({
  characterData, updateCharacterData,
  uploading, uploadingProfile,
  fullBodyPosition, fullBodyZoom, fullBodySaved,
  profilePosition, profileZoom, profileSaved,
  onImageUpload, onProfileImageUpload,
  onMouseDown,
  setFullBodyZoom, setProfileZoom,
  onSaveFullBody, onEditFullBody,
  onSaveProfile, onEditProfile,
}) {
  const appearance = characterData.appearance || {};
  const setAppearance = (patch) => {
    updateCharacterData({ appearance: { ...appearance, ...patch } });
  };
  return (
    <div
      className="panel-strong"
      style={{
        padding: 24,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div className="tome-corner tr" />
      <div className="tome-corner bl" />

      <div className="ornate-heading" style={{ marginBottom: 0 }}>
        <span className="ornate-flourish small" />
        <h3 style={{ fontSize: 22, color: 'var(--text)' }}>Codex</h3>
        <span className="ornate-flourish small" />
      </div>

      {/* THE BASICS — name + level */}
      <div>
        <div className="label" style={{ marginBottom: 8, color: 'var(--gold-soft)' }}>
          The Basics
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>
              Character Name <span style={{ color: 'var(--orange)' }}>*</span>
            </div>
            <input
              className="input"
              value={characterData.name || ''}
              onChange={(e) => updateCharacterData({ name: e.target.value })}
              placeholder="e.g. Kael Stormwhisper"
              maxLength={40}
              style={{ fontSize: 16 }}
            />
          </div>
        </div>
      </div>

      {/* PHYSICAL — age + height + weight */}
      <div>
        <div className="label" style={{ marginBottom: 8, color: 'var(--gold-soft)' }}>
          Physical
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Age</div>
            <input
              type="number"
              className="input"
              value={appearance.age ?? ''}
              onChange={(e) => setAppearance({
                age: e.target.value === '' ? '' : parseInt(e.target.value, 10),
              })}
              placeholder="25"
            />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Height</div>
            <input
              className="input"
              value={appearance.height || ''}
              onChange={(e) => setAppearance({ height: e.target.value })}
              placeholder={"5'10\""}
            />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Weight</div>
            <input
              className="input"
              value={appearance.weight || ''}
              onChange={(e) => setAppearance({ weight: e.target.value })}
              placeholder="180 lbs"
            />
          </div>
        </div>
      </div>

      {/* CHARACTER PORTRAIT — full-body drag-zoom */}
      <PortraitPanel
        label="Character Portrait"
        avatarUrl={characterData.avatar_url}
        position={fullBodyPosition}
        zoom={fullBodyZoom}
        saved={fullBodySaved}
        uploading={uploading}
        onUpload={onImageUpload}
        onMouseDown={(e) => onMouseDown(e, 'full')}
        onZoomChange={(val) => setFullBodyZoom(val[0])}
        onSave={onSaveFullBody}
        onEdit={onEditFullBody}
        inputId="avatar-upload"
        aspectRatio="2/3"
      />

      {/* PROFILE AVATAR — circular drag-zoom */}
      <ProfilePanel
        avatarUrl={characterData.profile_avatar_url || characterData.avatar_url}
        position={profilePosition}
        zoom={profileZoom}
        saved={profileSaved}
        uploading={uploadingProfile}
        onUpload={onProfileImageUpload}
        onMouseDown={(e) => onMouseDown(e, 'profile')}
        onZoomChange={(val) => setProfileZoom(val[0])}
        onSave={onSaveProfile}
        onEdit={onEditProfile}
      />

      {/* BIOGRAPHY */}
      <div>
        <div className="label" style={{ marginBottom: 8, color: 'var(--gold-soft)' }}>
          Biography
        </div>
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
            fontSize: 14,
            lineHeight: 1.55,
            fontStyle: 'italic',
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// PortraitPanel — full-body uploader with drag-zoom positioning. Moved
// verbatim from ClassStep per prototype step-identity.jsx IdentityCodex.
// ============================================================================
function PortraitPanel({
  label, avatarUrl, position, zoom, saved, uploading,
  onUpload, onMouseDown, onZoomChange, onSave, onEdit,
  inputId, aspectRatio,
}) {
  return (
    <div>
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
              className={saved ? 'absolute' : 'absolute cursor-move'}
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
// ProfilePanel — circular avatar uploader with drag-zoom positioning.
// Moved verbatim from ClassStep per prototype step-identity.jsx IdentityCodex.
// ============================================================================
function ProfilePanel({
  avatarUrl, position, zoom, saved, uploading,
  onUpload, onMouseDown, onZoomChange, onSave, onEdit,
}) {
  return (
    <div>
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
                className={saved ? 'absolute' : 'absolute cursor-move'}
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
