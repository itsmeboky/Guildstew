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

import { lazy } from "react";

export const GAME_PACKS = {
  dnd5e_2014: {
    id: "dnd5e_2014",
    family: "dnd5e",
    name: "D&D 5e (2014)",
    short: "D&D 5e 2014",
    shortName: "D&D 5e",
    yearLabel: "2014",
    tagAbbreviation: "D&D 5e '14",
    tagline: "Original 2014 PHB ruleset. The classic toolkit.",
    description:
      "Twelve classes, nine races, levels 1-20, the 2014 PHB rules everyone learned 5e on. Multiclass, ASIs, the lot.",
    accent: "#37F2D1",
    accentColor: "#8B0000",
    icon: "🐉",
    status: "available",
    creatorRoute: "CharacterCreator",
    // Library detail renderer key — looked up by CharacterDetailDispatcher.
    // D&D 5e detail is still inlined in src/pages/CharacterLibrary.jsx
    // pending a follow-up extraction phase; the dispatcher currently
    // short-circuits the dnd5e family and lets the library render
    // inline. PF2e routes through the dispatcher fully.
    detailComponent: "Dnd5eCharacterDetail",
    // Slug on the game_packs DB table. Migration 20260514030000 split
    // the original single `dnd5e` row into `dnd5e_2014` + `dnd5e_2024`,
    // so each edition now has its own DB row and its own entitlement.
    entitlementSlug: "dnd5e_2014",
  },
  dnd5e_2024: {
    id: "dnd5e_2024",
    family: "dnd5e",
    name: "D&D 5e (2024)",
    short: "5e (2024)",
    shortName: "D&D 5e",
    yearLabel: "2024",
    tagAbbreviation: "D&D 5e '24",
    tagline: "The 2024 revision — PHB 2024.",
    description:
      "The 2024 revision. Weapon Mastery on martial classes, reworked spell lists, ASI through backgrounds, refreshed subclasses, and updated species rules. SRD 5.2 only — non-SRD content is not shipped.",
    accent: "#37F2D1",
    accentColor: "#DC143C",
    icon: "🐉",
    status: "available",
    creatorRoute: "CharacterCreator",
    detailComponent: "Dnd5eCharacterDetail",
    entitlementSlug: "dnd5e_2024",
  },
  pathfinder_2e: {
    id: "pathfinder_2e",
    family: "pathfinder",
    name: "Pathfinder 2e",
    short: "PF2e",
    shortName: "PF2e",
    tagAbbreviation: "PF2e",
    tagline: "Tactical fantasy with deep customization.",
    description:
      "The crunchy d20 alternative — three-action economy, ancestries instead of races, feats every other level.",
    accent: "#c2410c",
    accentColor: "#B8860B",
    icon: "⚔️",
    license: "ORC",
    status: "available",
    enabled: true,
    creatorRoute: "PathfinderCharacterCreator",
    detailComponent: "PathfinderCharacterDetail",
    // DB slug matches the row inserted by migration 20260514030000.
    // (The earlier value `pathfinder2e` — without the underscore —
    // never matched any row, so PF2e was un-pickable for the same
    // reason the two D&D editions were.)
    entitlementSlug: "pathfinder_2e",
    // Lazy-loaded so the PF2e bundle doesn't bloat the main chunk.
    // Resolved by callers that know about the pf2e flow; the
    // legacy creatorRoute pattern (single CharacterCreator page
    // dispatching on gamePack) stays the path of least disruption
    // for 5e and is not used here.
    creator: lazy(() =>
      import("@/game-packs/pathfinder/2e").then((m) => ({ default: m.CharacterCreatorFlow }))
    ),
    sheet: lazy(() =>
      import("@/game-packs/pathfinder/2e").then((m) => ({ default: m.CharacterSheet }))
    ),
    meta: () => import("@/game-packs/pathfinder/2e").then((m) => m.PACK_META),
  },
  // Vampire: The Masquerade (world_of_darkness) removed in Phase 0
  // chunk 1 — the pack body, route, and creator were deleted pending
  // the WoD/Paradox license. Future slot reserved as wod/<game>/<edition>.
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
  "mork_borg",
  "cyborg",
  "kids_on_bikes",
];

// Aliases for ids that have shifted shape but may still appear in
// older code paths or persisted data. Resolved by getGamePack so
// callers don't have to know about the rename.
const ID_ALIASES = {
  dnd5e: "dnd5e_2014",
  pf2e: "pathfinder_2e",
};

export function getGamePack(id) {
  if (!id) return null;
  const resolved = ID_ALIASES[id] || id;
  return GAME_PACKS[resolved] || null;
}

export function getOwnedGamePacks(ownedIds) {
  // Available packs are free-by-spec — they show in the picker for
  // every visitor regardless of what useUserGamePacks() returns.
  // The `ownedIds` argument is kept for the future paid-pack flow
  // (where status==="available" alone isn't enough), but right now
  // every pack at status==="available" is granted unconditionally.
  // This prevents the picker from going empty if the hook errors,
  // the DB doesn't have a matching row, or a deploy lag serves a
  // stale bundle.
  return GAME_PACK_ORDER
    .map((id) => GAME_PACKS[id])
    .filter((p) => p && p.status === "available");
}

export function getUpcomingGamePacks(ownedIds) {
  return GAME_PACK_ORDER
    .map((id) => GAME_PACKS[id])
    .filter((p) => p && p.status === "coming_soon" && !ownedIds.includes(p.id));
}
