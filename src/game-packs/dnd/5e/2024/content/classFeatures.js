/**
 * D&D 5e (2024) — class basics adapter.
 *
 * SOURCE OF TRUTH: docs/5e_reference/2024/5e-SRD-Classes.json
 *
 * The 2024 SRD does NOT include per-level class feature progression.
 * `class_levels` in 5e-SRD-Classes.json is a URL stub (e.g.
 * "/api/2024/classes/barbarian/levels") pointing at the live API
 * rather than inline data, and there is no 5e-SRD-Levels.json for
 * 2024. Per-level class features are NOT in the OGL-covered static
 * SRD and CANNOT be hand-authored from PHB 2024 (PHB 2024 is not
 * OGL).
 *
 * This adapter therefore exposes class BASICS only:
 *   - Hit die, primary ability, saving throws
 *   - Armor / weapon proficiencies, skill choice options
 *   - Multiclass requirements
 *   - Starting equipment options
 *   - Subclass refs (full subclass content lives in subclassFeatures.js)
 *
 * Per-level features are explicitly absent. Consumers should call
 * hasPerLevelFeatures() and render a placeholder when false.
 */

import classesData from "../../../../../../docs/5e_reference/2024/5e-SRD-Classes.json" with { type: "json" };

/**
 * List all 2024 SRD classes.
 */
export function getClasses() {
  return classesData;
}

/**
 * Get class basics for a given class index (e.g. "barbarian") or
 * display name (e.g. "Barbarian"). Returns the raw SRD record.
 */
export function getClassBasics(classKey) {
  if (!classKey) return null;
  const key = String(classKey).toLowerCase();
  return (
    classesData.find((c) => c.index === key) ||
    classesData.find((c) => c.name.toLowerCase() === key) ||
    null
  );
}

/**
 * 2024 universal ASI / Feat levels — same across all classes in the
 * PHB 2024 baseline. Per-class bonus ASIs (Fighter at 6/14, Rogue
 * at 10) are part of the per-level progression that's NOT in SRD,
 * so they're omitted here.
 */
export function getClassAsiLevels(/* classKey */) {
  return [4, 8, 12, 16, 19];
}

/**
 * Returns true if the SRD provides per-level feature data for the
 * class. Currently always false for 2024 (`class_levels` is a URL
 * stub, no inline data). Consumers should display a placeholder.
 */
export function hasPerLevelFeatures(/* classKey */) {
  return false;
}
