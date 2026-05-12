/**
 * D&D 5e (2024) — spell data adapter.
 *
 * STOPGAP STATUS: The 2024 SRD JSON (5e-SRD-Spells.json for 2024)
 * is not yet published by the upstream 5e-bits dataset, and the
 * `spells` field on each class in `5e-SRD-Classes.json` (2024) is
 * a truncated URL stub rather than an inline ref list. To unblock
 * the 2024 character creator, this adapter uses the 2014 SRD
 * spells (319 entries, full content under CC-BY 4.0 via SRD 5.1)
 * as the 2024 spell pool. An override layer at
 * `./spell-overrides.json` accepts revisions, additions, and
 * removals so the pool can be reshaped to SRD 5.2 over time
 * without changing call sites.
 *
 * Resolution path for the stopgap:
 *   1. Populate `spell-overrides.json` from SRD 5.2 spell text as
 *      the team sources it, OR
 *   2. Adopt an upstream 5e-database release that includes 2024
 *      spells, then swap this adapter's base import to that file.
 *
 * Class spell associations: the 2014 SRD spells carry a `classes`
 * field (array of `{index, name, url}`). Filters here read that
 * field directly. 2024 class spell lists differ slightly from
 * 2014 (e.g. Ranger gets `Hunter's Mark` always-prepared, some
 * spells moved between class lists) — those deltas land via the
 * override layer.
 *
 * License attribution: SRD 5.1 © Wizards of the Coast LLC, CC-BY
 * 4.0. The `/attributions` page (Commit 8 of this build bundle)
 * carries the full attribution chain.
 */

import SPELLS_2014 from "../../../../docs/5e_reference/2014/5e-SRD-Spells.json" with { type: "json" };
import overrides from "./spell-overrides.json" with { type: "json" };

// ─────────────────────────────────────────────
// Deep-merge helper for `revised` overrides
// ─────────────────────────────────────────────

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out;
}

// ─────────────────────────────────────────────
// Build the merged spell pool once at module load.
// ─────────────────────────────────────────────

const REMOVED = new Set(overrides?.removed ?? []);
const REVISED = overrides?.revised ?? {};
const ADDED = overrides?.added ?? {};

function buildMergedPool() {
  const pool = new Map();
  for (const spell of SPELLS_2014) {
    if (REMOVED.has(spell.index)) continue;
    const revision = REVISED[spell.index];
    pool.set(spell.index, revision ? deepMerge(spell, revision) : spell);
  }
  for (const [idx, added] of Object.entries(ADDED)) {
    pool.set(idx, added);
  }
  return Array.from(pool.values());
}

const MERGED_POOL = buildMergedPool();
const BY_ID = new Map(MERGED_POOL.map((s) => [s.index, s]));

/**
 * Returns the full 2024 spell list (2014 base + overrides applied).
 * Stable order matches the 2014 SRD's order for predictability.
 */
export function getSpellList() {
  return MERGED_POOL;
}

/**
 * Single-spell lookup by SRD index (e.g. "fireball"). Returns null
 * if the spell has been removed or doesn't exist.
 */
export function getSpellById(id) {
  if (!id) return null;
  return BY_ID.get(id) || null;
}

/**
 * Highest castable spell level for a class at a given class level.
 * Used to filter `getSpellsForClass`. Reads from the 2024 rules
 * helper so this stays consistent with the rest of the pack.
 *
 * Implementation note: avoids importing the rules helper directly
 * because that would create a circular dependency during module
 * load. Caller passes `maxLevel` explicitly OR we compute it here
 * from the 2024 caster type for a small set of known classes.
 */
const FULL_CASTERS = new Set(["bard", "cleric", "druid", "sorcerer", "wizard"]);
const HALF_CASTERS = new Set(["paladin", "ranger"]);

function maxSpellLevelForClass(classIdLower, classLevel) {
  if (!classLevel || classLevel < 1) return 0;
  // Standard 5e progression — same in both editions for full +
  // half casters. Warlock pact slots cap separately (always one
  // level, see WARLOCK_PACT_SLOTS in rules.js); treated as full
  // caster for filter purposes since Mystic Arcanum lets them
  // prepare up to 9th.
  if (classIdLower === "warlock") {
    if (classLevel >= 17) return 9;
    if (classLevel >= 15) return 8;
    if (classLevel >= 13) return 7;
    if (classLevel >= 11) return 6;
    if (classLevel >= 9)  return 5;
    if (classLevel >= 7)  return 4;
    if (classLevel >= 5)  return 3;
    if (classLevel >= 3)  return 2;
    return 1;
  }
  if (FULL_CASTERS.has(classIdLower)) {
    return Math.min(9, Math.ceil(classLevel / 2));
  }
  if (HALF_CASTERS.has(classIdLower)) {
    // 2024 half-casters cast from L1 (different from 2014). The
    // max-spell-level table is the same as 2014's at L>=2: hits 1
    // at L1-4, 2 at L5-8, 3 at L9-12, 4 at L13-16, 5 at L17-20.
    if (classLevel >= 17) return 5;
    if (classLevel >= 13) return 4;
    if (classLevel >= 9)  return 3;
    if (classLevel >= 5)  return 2;
    return 1;
  }
  return 0;
}

/**
 * Filter the merged pool to spells available to a class at the
 * given class level (cantrips through max castable level).
 * `classId` matches the SRD lowercase index ("wizard", "cleric").
 */
export function getSpellsForClass(classId, classLevel) {
  if (!classId) return [];
  const target = String(classId).toLowerCase();
  const maxLevel = maxSpellLevelForClass(target, classLevel);
  return MERGED_POOL.filter((spell) => {
    const classes = Array.isArray(spell.classes) ? spell.classes : [];
    const onList = classes.some((c) => {
      const idx = (c?.index ?? c?.name ?? "").toString().toLowerCase();
      return idx === target;
    });
    if (!onList) return false;
    const lvl = Number(spell.level ?? 0);
    return lvl === 0 || lvl <= maxLevel;
  });
}

/**
 * Cantrips (level-0 spells) for a class. Convenience wrapper for
 * the cantrip-picker UI.
 */
export function getCantripsForClass(classId) {
  if (!classId) return [];
  const target = String(classId).toLowerCase();
  return MERGED_POOL.filter((spell) => {
    if (Number(spell.level ?? -1) !== 0) return false;
    const classes = Array.isArray(spell.classes) ? spell.classes : [];
    return classes.some(
      (c) => (c?.index ?? c?.name ?? "").toString().toLowerCase() === target,
    );
  });
}
