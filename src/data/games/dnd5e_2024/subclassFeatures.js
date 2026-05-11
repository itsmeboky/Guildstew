/**
 * D&D 5e (2024) — subclass features adapter.
 *
 * SOURCE OF TRUTH: docs/5e_reference/2024/5e-SRD-Subclasses.json
 *
 * Unlike the per-level class progression (which the 2024 SRD does
 * NOT carry), the 2024 SRD subclasses carry their features inline:
 * each entry has a `features` array of `{name, level, description}`.
 * That data IS OGL-covered and read directly here.
 *
 * The 2024 SRD ships 12 subclasses — one per class. PHB 2024
 * publishes 4 per class; the other 36 are content gaps awaiting
 * SRD expansion. None are hand-authored.
 */

import subclassesData from "../../../../docs/5e_reference/2024/5e-SRD-Subclasses.json";

/**
 * Get all subclasses for a given class index (e.g. "barbarian") or
 * display name (e.g. "Barbarian"). Returns full SRD records,
 * including their inline features array.
 */
export function getSubclassesForClass(classKey) {
  if (!classKey) return [];
  const key = String(classKey).toLowerCase();
  return subclassesData.filter(
    (s) =>
      s.class?.index === key ||
      String(s.class?.name || "").toLowerCase() === key,
  );
}

/**
 * Lookup a single subclass by its index (e.g. "path-of-the-berserker")
 * or display name (e.g. "Path of the Berserker").
 */
export function getSubclass(subclassKey) {
  if (!subclassKey) return null;
  const key = String(subclassKey).toLowerCase();
  return (
    subclassesData.find((s) => s.index === key) ||
    subclassesData.find((s) => s.name.toLowerCase() === key) ||
    null
  );
}

/**
 * Get subclass features cumulative up to and including the given
 * character level. Returns an empty array if the subclass isn't
 * found.
 */
export function getSubclassFeaturesAtLevel(subclassKey, characterLevel) {
  const sub = getSubclass(subclassKey);
  if (!sub) return [];
  return (sub.features || []).filter((f) => f.level <= characterLevel);
}

/**
 * Get the sorted list of levels at which the subclass grants
 * features.
 */
export function getSubclassFeatureLevels(subclassKey) {
  const sub = getSubclass(subclassKey);
  if (!sub) return [];
  return [...new Set((sub.features || []).map((f) => f.level))].sort(
    (a, b) => a - b,
  );
}
