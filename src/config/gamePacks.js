// Game pack catalog. Single source of truth for what systems
// Guildstew can theoretically run, which the player owns, and which
// are still on the roadmap.
//
// Today every player owns dnd5e by default — no DB-backed
// entitlements yet. When the entitlement layer ships, replace the
// hard-coded `currentlyOwned` in useUserGamePacks() with a
// per-user lookup; the rest of the system (picker UI, routing)
// already keys off this catalog and won't need changes.

export const GAME_PACKS = {
  dnd5e: {
    id: "dnd5e",
    name: "Dungeons & Dragons 5e",
    short: "D&D 5e",
    tagline: "Heroic high fantasy with d20 mechanics. The default.",
    description:
      "Classic D&D 5th edition. Twelve classes, ability scores, levels 1–20, advantage/disadvantage, the whole familiar toolkit.",
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

export const GAME_PACK_ORDER = [
  "dnd5e",
  "pathfinder_2e",
  "world_of_darkness",
  "mork_borg",
  "cyborg",
  "kids_on_bikes",
];

export function getGamePack(id) {
  return GAME_PACKS[id] || null;
}

export function getOwnedGamePacks(ownedIds) {
  return GAME_PACK_ORDER
    .map((id) => GAME_PACKS[id])
    .filter((p) => p && ownedIds.includes(p.id));
}

export function getUpcomingGamePacks(ownedIds) {
  return GAME_PACK_ORDER
    .map((id) => GAME_PACKS[id])
    .filter((p) => p && p.status === "coming_soon" && !ownedIds.includes(p.id));
}
