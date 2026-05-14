// Game pack catalog. Single source of truth for what systems
// Guildstew can theoretically run, which the player owns, and which
// are still on the roadmap.
//
// 5e splits into two siblings — `dnd5e_2014` and `dnd5e_2024` —
// because the editions diverge enough mechanically (weapon mastery,
// spell list reworks, ASI source change, etc.) that mixed-edition
// characters would mean partial fall-through. Each sibling has its
// own data adapter under src/data/games/<id>/ and its own per-step
// UI; the picker shows them as separate cards.
//
// Today every player owns the available 5e pack by default — no
// DB-backed entitlements yet. When the entitlement layer ships,
// replace the hard-coded `currentlyOwned` in useUserGamePacks()
// with a per-user lookup; the rest of the system already keys off
// this catalog.

export const GAME_PACKS = {
  dnd5e_2014: {
    id: "dnd5e_2014",
    family: "dnd5e",
    name: "D&D 5e (2014)",
    short: "5e (2014)",
    tagline: "The classic 5e ruleset — PHB 2014.",
    description:
      "Classic D&D 5th edition as written in the 2014 Player's Handbook. Twelve classes, ability scores, levels 1–20, advantage/disadvantage, the whole familiar toolkit.",
    accent: "#37F2D1",
    icon: "🐉",
    status: "legacy",
    creatorRoute: "CharacterCreator",
    aliasFor: "dnd5e_2014",
  },
  dnd5e_2014: {
    id: "dnd5e_2014",
    name: "D&D 5e (2014)",
    short: "D&D 5e 2014",
    tagline: "Original 2014 PHB ruleset. The classic toolkit.",
    description:
      "Twelve classes, nine races, levels 1-20, the 2014 PHB rules everyone learned 5e on. Multiclass, ASIs, the lot.",
    accent: "#37F2D1",
    icon: "🐉",
    status: "available",
    creatorRoute: "CharacterCreator",
  },
  dnd5e_2024: {
    id: "dnd5e_2024",
    family: "dnd5e",
    name: "D&D 5e (2024)",
    short: "5e (2024)",
    tagline: "The 2024 revision — PHB 2024.",
    description:
      "The 2024 revision. Weapon Mastery on martial classes, reworked spell lists, ASI through backgrounds, refreshed subclasses, and updated species rules. SRD 5.2 only — non-SRD content is not shipped.",
    accent: "#37F2D1",
    icon: "🐉",
    status: "available",
    creatorRoute: "CharacterCreator",
  },
  pathfinder_2e: {
    id: "pathfinder_2e",
    name: "Pathfinder 2e",
    short: "PF2e",
    tagline: "Tactical fantasy with deep customization.",
    description:
      "The crunchy d20 alternative — three-action economy, ancestries instead of races, feats every other level.",
    accent: "#c2410c",
    icon: "⚔️",
    status: "coming_soon",
  },
  world_of_darkness: {
    id: "world_of_darkness",
    name: "World of Darkness",
    short: "WoD",
    tagline: "Modern horror with d10 dice pools.",
    description:
      "Vampires, werewolves, mages, and the human cost of supernatural power. Storyteller-focused mechanics.",
    accent: "#7f1d1d",
    icon: "🩸",
    status: "coming_soon",
  },
  mork_borg: {
    id: "mork_borg",
    name: "Mörk Borg",
    short: "MÖRK BORG",
    tagline: "Doom-metal apocalypse RPG.",
    description:
      "Brutal, fast, ugly, beautiful. The world is ending and your character probably won't survive it.",
    accent: "#facc15",
    icon: "💀",
    status: "coming_soon",
  },
  cyborg: {
    id: "cyborg",
    name: "CY_BORG",
    short: "CY_BORG",
    tagline: "Cyberpunk doom-metal sequel to Mörk Borg.",
    description:
      "Neon-lit dystopia, hackers, mercenaries, and the slow grind of capitalism crushing everything you love.",
    accent: "#22d3ee",
    icon: "🔌",
    status: "coming_soon",
  },
  kids_on_bikes: {
    id: "kids_on_bikes",
    name: "Kids on Bikes",
    short: "KoB",
    tagline: "1980s small-town strangeness.",
    description:
      "Rules-light collaborative storytelling. Bored kids, weird towns, and the mysteries adults can't see.",
    accent: "#a855f7",
    icon: "🚲",
    status: "coming_soon",
  },
};

// Order in which packs render in the picker. The legacy "dnd5e"
// entry is intentionally omitted — it exists in GAME_PACKS only as
// an alias for backward compat (existing characters / DB rows that
// reference the pre-2014/2024-split slug).
export const GAME_PACK_ORDER = [
  "dnd5e_2014",
  "dnd5e_2024",
  "pathfinder_2e",
  "world_of_darkness",
  "mork_borg",
  "cyborg",
  "kids_on_bikes",
];

// Aliases for ids that have shifted shape but may still appear in
// older code paths or persisted data. Resolved by getGamePack so
// callers don't have to know about the rename.
const ID_ALIASES = {
  dnd5e: "dnd5e_2014",
};

export function getGamePack(id) {
  if (!id) return null;
  const resolved = ID_ALIASES[id] || id;
  return GAME_PACKS[resolved] || null;
}

export function getOwnedGamePacks(ownedIds) {
  return GAME_PACK_ORDER
    .map((id) => GAME_PACKS[id])
    .filter((p) => p && ownedIds.includes(p.id) && p.status === "available");
}

export function getUpcomingGamePacks(ownedIds) {
  return GAME_PACK_ORDER
    .map((id) => GAME_PACKS[id])
    .filter((p) => p && p.status === "coming_soon" && !ownedIds.includes(p.id));
}
