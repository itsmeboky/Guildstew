/**
 * Game pack data registry.
 *
 * Each entry is a self-contained data adapter for one game pack
 * (rule system + edition combination). Adapters share a common
 * surface — `getEquipment()`, `getEquipmentByCategory()`, etc. — so
 * step-level UI can stay edition-agnostic and dispatch on the
 * character's `gamePack` field.
 *
 * Architectural rule: the same character is one game pack
 * throughout. Steps don't fall through across editions. If a
 * character is `dnd5e_2024`, every read goes through the 2024
 * adapter; never the 2014 adapter, never a partial-fall-through.
 *
 * IDs match the planned `src/config/gamePacks.js` ids. While the
 * config still ships only `dnd5e` (singular) — the dual-pack split
 * lands with the 2024 character creator — `getGamePack()` accepts
 * `dnd5e` as an alias for `dnd5e_2014` so existing characters keep
 * working unchanged.
 *
 * Adapter shape is built from EXPLICIT named imports rather than
 * `...moduleNamespace` spreads. Spreading an ES module namespace
 * object works in dev (Vite serves them as real objects) but can
 * silently drop properties in some production-build configurations
 * — the symptom was a `getGamePack(...).getEquipment is not a
 * function` crash on the Equipment step in prod. Explicit imports
 * make every function rollup keeps tree-shakeable and observable.
 */

import {
  getEquipment as getEquipment_2014,
  getEquipmentByCategory as getEquipmentByCategory_2014,
  getEquipmentByName as getEquipmentByName_2014,
  getEquipmentById as getEquipmentById_2014,
} from "./dnd5e_2014/equipment.js";

import {
  getEquipment as getEquipment_2024,
  getEquipmentByCategory as getEquipmentByCategory_2024,
  getEquipmentByName as getEquipmentByName_2024,
  getEquipmentById as getEquipmentById_2024,
  getWeaponsWithMastery as getWeaponsWithMastery_2024,
} from "./dnd5e_2024/equipment.js";

import {
  getClasses as getClasses_2024,
  getClassByName as getClassByName_2024,
  getClassById as getClassById_2024,
  getSubclassesForClass as getSubclassesForClass_2024,
  getMulticlassPrereqs as getMulticlassPrereqs_2024,
} from "./dnd5e_2024/classes.js";

import {
  getClasses as getClassFeatureClasses_2024,
  getClassBasics as getClassBasics_2024,
  getClassAsiLevels as getClassAsiLevels_2024,
  hasPerLevelFeatures as hasPerLevelFeatures_2024,
} from "./dnd5e_2024/classFeatures.js";

import {
  getSubclassFeaturesAtLevel as getSubclassFeaturesAtLevel_2024,
} from "./dnd5e_2024/subclassFeatures.js";

import * as dnd5e_2024_rules from "./dnd5e_2024/rules.js";

const ADAPTERS = {
  dnd5e_2014: {
    id: "dnd5e_2014",
    getEquipment: getEquipment_2014,
    getEquipmentByCategory: getEquipmentByCategory_2014,
    getEquipmentByName: getEquipmentByName_2014,
    getEquipmentById: getEquipmentById_2014,
  },
  dnd5e_2024: {
    id: "dnd5e_2024",
    getEquipment: getEquipment_2024,
    getEquipmentByCategory: getEquipmentByCategory_2024,
    getEquipmentByName: getEquipmentByName_2024,
    getEquipmentById: getEquipmentById_2024,
    getWeaponsWithMastery: getWeaponsWithMastery_2024,
    getClasses: getClasses_2024,
    getClassByName: getClassByName_2024,
    getClassById: getClassById_2024,
    getSubclassesForClass: getSubclassesForClass_2024,
    getMulticlassPrereqs: getMulticlassPrereqs_2024,
    // classFeatures helpers — getClasses is already on the class
    // adapter above; the classFeatures module's own `getClasses`
    // wraps a different shape, so it's mapped as
    // `getClassFeatureClasses` here to keep both surfaces.
    getClassFeatureClasses: getClassFeatureClasses_2024,
    getClassBasics: getClassBasics_2024,
    getClassAsiLevels: getClassAsiLevels_2024,
    hasPerLevelFeatures: hasPerLevelFeatures_2024,
    getSubclassFeaturesAtLevel: getSubclassFeaturesAtLevel_2024,
    rules: dnd5e_2024_rules,
  },
};

// Legacy alias resolution — older character records may carry
// "dnd5e" from before the 2014 / 2024 split.
const PACK_ALIASES = {
  dnd5e: "dnd5e_2014",
};

function resolvePackId(packId) {
  return PACK_ALIASES[packId] || packId || "dnd5e_2014";
}

/**
 * Return the game-pack adapter module for a character / pack id.
 * Falls back to the 2014 D&D pack for unknown / missing ids so
 * legacy characters with no `gamePack` field continue to render.
 */
export function getGamePackData(packId) {
  const canonical = resolvePackId(packId);
  return PACKS[canonical] || dnd5e2014;
}

// Backwards-compat alias for callers that still use the older name.
export const getGamePack = getGamePackData;

// List of canonical pack ids — kept for callers that need to enumerate.
export function listGamePackIds() {
  return Object.keys(PACKS);
}

export { dnd5e2014, dnd5e2024 };