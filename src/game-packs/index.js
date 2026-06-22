// Unified game-pack accessor — the catalog + lazy "shelf" loader.
//
// This is the single entry point the app will use to learn about game
// packs (Phase 0, Unified GamePack Contract v3). It replaces the two
// colliding getGamePack()s — the metadata catalog in
// src/config/gamePacks.js and the data adapter in src/data/games — with
// one model:
//
//   • CATALOG       — a tiny, eager array of lightweight metadata for
//                     every pack. Holds NO pack body (no data adapter,
//                     no UI). Safe to import anywhere; bundles nothing.
//   • loadGamePack  — dynamically imports a pack's heavy body on demand
//                     and caches it. This is the lazy "shelf" model:
//                     a pack body is only pulled when someone asks for it.
//
// IMPORTANT: nothing here statically imports a pack body. Each entry's
// `load` thunk is a dynamic import() so adding a pack never bloats the
// main chunk.
//
// Migration status (Phase 0): packs are being consolidated under
// src/game-packs/<taxonomy>/. Until Chunk 2 lands real per-pack body
// modules for the D&D editions, loadGamePack composes the legacy
// src/data/games adapter into the body (see the TEMPORARY block below).
// That scaffolding — and src/config/gamePacks.js / src/data/games — are
// removed in Chunk 3. No permanent shims survive the full consolidation.

// ── Pint-type capability sets (declared per the contract; not consumed
// yet — the pack-aware Brewery reads these in Phase 1). ──
const DND_PINT_TYPES = [
  "background", "subclass", "race", "class", "feat", "spell",
  "monster", "item", "magic_item", "vehicle", "tool", "language",
  "rule_modification",
];
const PF2E_PINT_TYPES = [
  "background", "subclass", "ancestry", "heritage", "class", "feat",
  "spell", "ritual", "monster", "item", "deity", "rule_modification",
];

// Both surfaces ready.
const FULLY_READY = { characterCreation: "ready", campaignPlay: "ready" };
// Neither surface ready (roadmap packs).
const NOT_READY = { characterCreation: "not_ready", campaignPlay: "not_ready" };

// CATALOG — GamePackCatalogEntry[]. Eager, lightweight, body-free.
// Ordered as packs should render in the picker.
export const CATALOG = [
  {
    id: "dnd5e_2014",
    // Taxonomy path: dnd/5e/2014
    title: "dnd", variant: "5e", edition: "2014",
    family: "dnd5e",
    name: "D&D 5e (2014)",
    short: "D&D 5e 2014", shortName: "D&D 5e", yearLabel: "2014",
    tagAbbreviation: "D&D 5e '14",
    tagline: "Original 2014 PHB ruleset. The classic toolkit.",
    description:
      "Twelve classes, nine races, levels 1-20, the 2014 PHB rules everyone learned 5e on. Multiclass, ASIs, the lot.",
    accent: "#37F2D1", accentColor: "#8B0000", icon: "🐉",
    status: "available",
    creatorRoute: "CharacterCreator",
    detailComponent: "Dnd5eCharacterDetail",
    entitlementSlug: "dnd5e_2014",
    readiness: FULLY_READY,
    supportedPintTypes: DND_PINT_TYPES,
    // Conforming GamePackBody leaf (chunk 2a); delegates to the legacy
    // sources, no data moved yet.
    load: () => import("./dnd/5e/2014"),
  },
  {
    id: "dnd5e_2024",
    title: "dnd", variant: "5e", edition: "2024",
    family: "dnd5e",
    name: "D&D 5e (2024)",
    short: "5e (2024)", shortName: "D&D 5e", yearLabel: "2024",
    tagAbbreviation: "D&D 5e '24",
    tagline: "The 2024 revision — PHB 2024.",
    description:
      "The 2024 revision. Weapon Mastery on martial classes, reworked spell lists, ASI through backgrounds, refreshed subclasses, and updated species rules. SRD 5.2 only — non-SRD content is not shipped.",
    accent: "#37F2D1", accentColor: "#DC143C", icon: "🐉",
    status: "available",
    creatorRoute: "CharacterCreator",
    detailComponent: "Dnd5eCharacterDetail",
    entitlementSlug: "dnd5e_2024",
    readiness: FULLY_READY,
    supportedPintTypes: DND_PINT_TYPES,
    load: null,
  },
  {
    id: "pathfinder_2e",
    // Taxonomy path: pathfinder/2e
    title: "pathfinder", variant: "2e", edition: null,
    family: "pathfinder",
    name: "Pathfinder 2e",
    short: "PF2e", shortName: "PF2e",
    tagAbbreviation: "PF2e",
    tagline: "Tactical fantasy with deep customization.",
    description:
      "The crunchy d20 alternative — three-action economy, ancestries instead of races, feats every other level.",
    accent: "#c2410c", accentColor: "#B8860B", icon: "⚔️",
    license: "ORC",
    status: "available",
    creatorRoute: "PathfinderCharacterCreator",
    detailComponent: "PathfinderCharacterDetail",
    entitlementSlug: "pathfinder_2e",
    // Character creation is shippable; campaign play (combat/GM·player
    // panels) is not wired for PF2e yet.
    readiness: { characterCreation: "ready", campaignPlay: "not_ready" },
    supportedPintTypes: PF2E_PINT_TYPES,
    load: () => import("@/game-packs/pathfinder/2e"),
  },
  // Reserved future slot: Vampire: The Masquerade lands as wod/<game>/<edition>
  // (e.g. wod/vampire/v5). Removed in Phase 0 chunk 1 pending the WoD/Paradox
  // license — pack body, route, and creator deleted; not re-added until ready.
  {
    id: "mork_borg",
    title: "mork_borg", variant: null, edition: null,
    name: "Mörk Borg",
    short: "MÖRK BORG",
    tagline: "Doom-metal apocalypse RPG.",
    description:
      "Brutal, fast, ugly, beautiful. The world is ending and your character probably won't survive it.",
    accent: "#facc15", icon: "💀",
    status: "coming_soon",
    readiness: NOT_READY,
    supportedPintTypes: [],
    load: null,
  },
  {
    id: "cyborg",
    title: "cyborg", variant: null, edition: null,
    name: "CY_BORG",
    short: "CY_BORG",
    tagline: "Cyberpunk doom-metal sequel to Mörk Borg.",
    description:
      "Neon-lit dystopia, hackers, mercenaries, and the slow grind of capitalism crushing everything you love.",
    accent: "#22d3ee", icon: "🔌",
    status: "coming_soon",
    readiness: NOT_READY,
    supportedPintTypes: [],
    load: null,
  },
  {
    id: "kids_on_bikes",
    title: "kids_on_bikes", variant: null, edition: null,
    name: "Kids on Bikes",
    short: "KoB",
    tagline: "1980s small-town strangeness.",
    description:
      "Rules-light collaborative storytelling. Bored kids, weird towns, and the mysteries adults can't see.",
    accent: "#a855f7", icon: "🚲",
    status: "coming_soon",
    readiness: NOT_READY,
    supportedPintTypes: [],
    load: null,
  },
];

// Aliases for ids that have shifted shape but may still appear in older
// code paths or persisted data (characters/brews stored before the id
// split/rename). Resolved by getCatalogEntry so callers don't have to know.
const ID_ALIASES = {
  dnd5e: "dnd5e_2014",
  pf2e: "pathfinder_2e",
};

/** Look up a catalog entry by id, resolving legacy aliases. */
export function getCatalogEntry(id) {
  if (!id) return null;
  const resolved = ID_ALIASES[id] || id;
  return CATALOG.find((p) => p.id === resolved) || null;
}

/**
 * List catalog entries, optionally filtered.
 * @param {{ status?: string, family?: string }} [filter]
 */
export function listGamePacks(filter = {}) {
  return CATALOG.filter((p) => {
    if (filter.status && p.status !== filter.status) return false;
    if (filter.family && p.family !== filter.family) return false;
    return true;
  });
}

// Resolved pack bodies, keyed by canonical id. A body is loaded at most once.
const _bodyCache = new Map();

/**
 * Load a pack's heavy body (data adapter, rules, content, UI exports) on
 * demand and cache it. Returns the catalog metadata merged with the body,
 * or null for an unknown id.
 */
export async function loadGamePack(id) {
  const entry = getCatalogEntry(id);
  if (!entry) return null;
  if (_bodyCache.has(entry.id)) return _bodyCache.get(entry.id);

  const mod = entry.load ? await entry.load() : null;
  const leaf = mod?.default;

  let pack;
  if (leaf && typeof leaf.resolveForm === "function") {
    // Conforming GamePackBody leaf (the D&D editions, chunk 2a). The leaf
    // owns content/vocab/ui/resolveForm and delegates to the real sources
    // itself — no inline composition needed here.
    pack = { ...entry, ...leaf };
  } else {
    // TEMPORARY — removed in Chunk 3. Packs without a conforming leaf yet
    // (PF2e) compose the body from the legacy src/data/games adapter plus
    // the pack module's own exports. Coming-soon packs (no load) fall here
    // too and resolve to metadata + the adapter fallback.
    const { getGamePackData } = await import("@/data/games/index.js");
    pack = { ...entry, content: getGamePackData(entry.id), ...(mod || {}) };
  }

  _bodyCache.set(entry.id, pack);
  return pack;
}
