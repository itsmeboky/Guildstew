/**
 * Pathfinder 2e Game Pack
 *
 * Self-contained system pack that plugs into the Combat Engine v2
 * and the PathfinderCharacterCreator page, mirroring the structure of
 * src/game-packs/dnd5e/.
 *
 * Data flow:
 *
 *   pf2e-foundry-source/packs/pf2e/{...}/*.json   (raw Foundry source)
 *      ↓ src/game-packs/pf2e/scripts/import-foundry.mjs
 *      ↓ (tier filter — Tier 1 ship-as-is, Tier 2 flavor-scrub, Tier 3 drop)
 *   src/game-packs/pf2e/data/{ancestries,classes,backgrounds,
 *      feats-srd,spells-srd,equipment-srd}.json   (committed)
 *      ↓ src/game-packs/pf2e/data/index.js  (re-export aggregator)
 *      ↓ ui/steps/Step*.jsx                 (named-export consumers)
 *
 * Re-run the importer after updating the source dump:
 *
 *   node src/game-packs/pf2e/scripts/import-foundry.mjs
 *
 * License: hybrid — Apache 2.0 (code) + ORC (Remaster content) +
 * OGL 1.0a (legacy items in the source) + Paizo CUP (trademarks).
 * Full attribution at LICENSES/PATHFINDER_2E.md. The importer's
 * tier filter ensures only Tier 1 (Player Core scope) and Tier 2
 * (mechanics OK, flavor scrubbed) make it into the shipped JSONs.
 */

// Re-export the data bridge surface — single canonical source for
// every step component to import from.
export * from "./data/index.js";

// --- Pack metadata -----------------------------------------------------------

export const PACK_META = {
  id: "pathfinder_2e",
  name: "Pathfinder (2nd Edition)",
  edition: "remaster",
  ready: true,
  source: {
    repo: "https://github.com/foundryvtt/pf2e",
    // Upstream commit SHA / tag are unrecoverable — see
    // LICENSES/PATHFINDER_2E.md "Source provenance" for the full
    // explanation. What's known: Remaster-era release (War of
    // Immortals classes present), imported on this date.
    commit: null,
    tag: null,
    importedAt: "2026-05-17",
  },
  licenses: ["Apache-2.0", "ORC", "OGL-1.0a", "Paizo-CUP"],
};

// Combat Engine v2 game-pack contract — same shape the dnd5e pack
// uses so the dispatcher doesn't need special-case branches.
//
// Re-exporting the data bridge above lets callers do either:
//   import { ANCESTRIES, CLASSES } from "@/game-packs/pf2e";
// or pull the whole pack object:
//   import pack from "@/game-packs/pf2e";
//   pack.content.ancestries
export { CharacterCreatorFlow } from "./ui/CharacterCreatorFlow.jsx";

// `content` and `data` namespaces are derived from the same
// canonical bridge — each entry is a getter so the bundle doesn't
// eagerly resolve everything when the pack object is constructed,
// matching the dnd5e pack's contract.
import * as bridge from "./data/index.js";

export const pf2eGamePack = {
  id: "pathfinder_2e",
  name: "Pathfinder (2nd Edition)",
  ready: true,

  content: {
    get ancestries()  { return bridge.ANCESTRIES; },
    get heritages()   { return bridge.HERITAGES_BY_ANCESTRY; },
    get backgrounds() { return bridge.BACKGROUNDS; },
    get classes()     { return bridge.CLASSES; },
    get deities()     { return bridge.DEITIES; },
    get domains()     { return bridge.CLERIC_DOMAINS; },
    get languages()   { return { common: bridge.COMMON_LANGUAGES, byAncestry: bridge.ANCESTRY_LANGUAGES }; },
  },

  // Rule resolvers stay null until the PF2e mechanic helpers under
  // src/game-packs/pf2e/rules/ are wired into the engine. The
  // creator step components import those rules directly today.
  rules: {
    resolveAction: null,
    armorClass:    null,
  },
};

export default pf2eGamePack;
