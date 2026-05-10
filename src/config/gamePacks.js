// Game pack catalog. Single source of truth for what systems
// Guildstew can theoretically run, which the player owns, and which
// are still on the roadmap.
//
// Today every player owns dnd5e_2014 by default — no DB-backed
// entitlements yet. dnd5e_2024 is staged as coming_soon while the
// 2024 PHB ruleset is wired up (Layer 4 commits 2-4). When the
// entitlement layer ships, replace the hard-coded `currentlyOwned`
// in useUserGamePacks() with a per-user lookup; the rest of the
// system (picker UI, routing) already keys off this catalog.

export const GAME_PACKS = {
  // Legacy alias for any code / DB row still referencing "dnd5e".
  // Hidden from the picker (not in GAME_PACK_ORDER) but kept so
  // existing characters / game_pack_listings rows resolve. New
  // characters stamp themselves with dnd5e_2014.
  dnd5e: {
    id: "dnd5e",
    name: "Dungeons & Dragons 5e",
    short: "D&D 5e",
    tagline: "Heroic high fantasy with d20 mechanics. The default.",
    description:
      "Classic D&D 5th edition. Twelve classes, ability scores, levels 1–20, advantage/disadvantage, the whole familiar toolkit.",
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
    name: "D&D 5e (2024)",
    short: "D&D 5e 2024",
    tagline: "2024 PHB ruleset — Species, Origin Feats, Weapon Mastery.",
    description:
      "The 2024 redesign: Species (with Half-Elf / Half-Orc folded into heritage), backgrounds grant ASIs + Origin Feats, Weapon Mastery for martials, three spell lists.",
    accent: "#a855f7",
    icon: "🐲",
    status: "coming_soon",
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

// Resolve the canonical pack id even if the caller hands us a
// legacy alias — `dnd5e` → `dnd5e_2014`. Keeps character records
// from the pre-Layer-4 era working.
export function resolveGamePackId(id) {
  const pack = GAME_PACKS[id];
  if (pack?.aliasFor) return pack.aliasFor;
  if (pack) return pack.id;
  return "dnd5e_2014";
}

export function getGamePack(id) {
  if (!id) return null;
  const pack = GAME_PACKS[id];
  if (!pack) return null;
  if (pack.aliasFor) return GAME_PACKS[pack.aliasFor] || null;
  return pack;
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
