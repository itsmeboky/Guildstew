/**
 * Brewery class → character sheet glue.
 *
 * Mirrors breweryRaceApply.js but for class mods. Pulls the structured
 * class metadata (see src/config/breweryClassSchema.js) and translates
 * it into the characterData fields the creator + character sheet
 * already know about.
 *
 * Subclass application (Step 6) layers on top of whatever the base
 * class produces; class resource tracking (Step 7) reads from the
 * `class_resource` block, and feature/ASI scheduling (Step 5) reads
 * from the `features` array.
 */

import {
  FULL_CASTER_SLOTS,
  HALF_CASTER_SLOTS,
} from "@/config/breweryClassSchema";

const ABILITY_KEY_MAP = {
  STR: "str", DEX: "dex", CON: "con",
  INT: "int", WIS: "wis", CHA: "cha",
};

/**
 * Compute the characterData updates to land the moment a brewery
 * class is picked: saving throws, armor/weapon/tool proficiencies,
 * and the _brewery_class marker the later creator steps read.
 *
 * `existing` is the current characterData so proficiencies already
 * carried (e.g. from a brewery race) are merged rather than
 * overwritten.
 */
export function applyBreweryClassBaseline(breweryClass, existing = {}) {
  if (!breweryClass) return {};

  // Saving throws live on characterData.saving_throws as a
  // { [abilityKey]: true } map so the review step can render them
  // with the same chip UI the skills step uses.
  const saveKeys = (breweryClass.saving_throws || [])
    .map((s) => ABILITY_KEY_MAP[String(s).toUpperCase()] || String(s).toLowerCase())
    .filter(Boolean);
  const saveMap = { ...(existing.saving_throws || {}) };
  for (const k of saveKeys) saveMap[k] = true;

  const existingProf = existing.proficiencies || { armor: [], weapons: [], tools: [] };
  const proficiencies = {
    armor:   Array.from(new Set([...(existingProf.armor   || []), ...(breweryClass.armor_proficiencies  || [])])),
    weapons: Array.from(new Set([...(existingProf.weapons || []), ...(breweryClass.weapon_proficiencies || [])])),
    tools:   Array.from(new Set([...(existingProf.tools   || []), ...(breweryClass.tool_proficiencies   || [])])),
  };

  return {
    _brewery_class: breweryClass,
    _brewery_class_skill_picks: [],
    _brewery_class_equipment: { fixed_confirmed: true, choices: {} },
    saving_throws: saveMap,
    proficiencies,
  };
}

/**
 * Wipe every _brewery_class_* marker on characterData. Called when
 * the user switches back to an SRD class so nothing sticky leaks
 * through. Does NOT touch proficiencies / saving_throws — those
 * already merge via dedupe and removing them individually would
 * re-open the duplicate-substitution problem.
 */
export function clearBreweryClassMarkers() {
  return {
    _brewery_class: null,
    _brewery_class_skill_picks: [],
    _brewery_class_equipment: null,
    _brewery_class_subclass: null,
    _brewery_class_resource: null,
  };
}

/**
 * Spell slots for a brewery class at a given character level. The
 * shape matches what SpellsStep + the character sheet already
 * consume: { cantrips, level1, level2, … level9 }. Non-casting
 * classes return an all-zero object so callers can merge without
 * branching.
 *
 * Third / pact progressions are not yet implemented — they fall
 * back to zeros, same as none. Custom progressions read straight
 * from spellcasting.custom_slots (a 20-row { level, slots[9] }
 * array authored in the creator form).
 */
export function getBreweryClassSpellSlots(breweryClass, level) {
  const zero = {
    cantrips: 0,
    level1: 0, level2: 0, level3: 0, level4: 0, level5: 0,
    level6: 0, level7: 0, level8: 0, level9: 0,
  };
  if (!breweryClass?.spellcasting?.enabled) return zero;
  const sc = breweryClass.spellcasting;
  const lvl = Math.max(1, Math.min(20, Number(level) || 1));

  let table = null;
  if (sc.slot_progression === "full") table = FULL_CASTER_SLOTS;
  else if (sc.slot_progression === "half") table = HALF_CASTER_SLOTS;
  else if (sc.slot_progression === "custom" && Array.isArray(sc.custom_slots)) {
    table = sc.custom_slots;
  } else {
    return zero;
  }

  const row = table.find((r) => Number(r?.level) === lvl);
  if (!row || !Array.isArray(row.slots)) return zero;

  // Cantrips for Known casters come from the spells_known_schedule;
  // Prepared casters default to 0 here and rely on the class's
  // feature list to grant cantrip-known amounts.
  let cantrips = 0;
  if (sc.type === "known" && Array.isArray(sc.spells_known_schedule)) {
    const scheduleRow = sc.spells_known_schedule.find((r) => Number(r?.level) === lvl);
    cantrips = Number(scheduleRow?.cantrips) || 0;
  }

  return {
    cantrips,
    level1: Number(row.slots[0]) || 0,
    level2: Number(row.slots[1]) || 0,
    level3: Number(row.slots[2]) || 0,
    level4: Number(row.slots[3]) || 0,
    level5: Number(row.slots[4]) || 0,
    level6: Number(row.slots[5]) || 0,
    level7: Number(row.slots[6]) || 0,
    level8: Number(row.slots[7]) || 0,
    level9: Number(row.slots[8]) || 0,
  };
}

/**
 * How many spells the player gets to know at a given class level.
 * Prepared casters return null (the creator's spell picker should
 * use the "ability mod + level" formula instead); Known casters
 * read the schedule table the author wrote; Ritual-only returns 0.
 */
export function getBreweryClassSpellsKnown(breweryClass, level) {
  const sc = breweryClass?.spellcasting;
  if (!sc?.enabled) return null;
  if (sc.type === "prepared") return null;
  if (sc.type === "ritual_only") return 0;
  if (sc.type === "known" && Array.isArray(sc.spells_known_schedule)) {
    const lvl = Math.max(1, Math.min(20, Number(level) || 1));
    const row = sc.spells_known_schedule.find((r) => Number(r?.level) === lvl);
    return Number(row?.known) || 0;
  }
  return null;
}

/**
 * Produce the feature list a character should have from the brewery
 * class's features[] array, filtered to features the character has
 * already reached. Includes class-level features (base class) and
 * any subclass features when a subclass is selected. Each result
 * carries:
 *   name, description, level, source, is_asi, mechanical, origin
 *
 * Subclass features are pulled from
 *   breweryClass.subclass.options[].features
 * when `selectedSubraceName` (sic — actually subclass name) matches
 * one of the authored options. If no match, only base features come
 * through.
 */
export function getBreweryClassFeaturesAtLevel(breweryClass, level, selectedSubclassName = null) {
  if (!breweryClass) return [];
  const lvl = Math.max(1, Math.min(20, Number(level) || 1));
  const baseFeatures = (Array.isArray(breweryClass.features) ? breweryClass.features : [])
    .filter((f) => Number(f?.level) <= lvl)
    .map((f) => ({
      name: f?.name || (f?.is_asi ? "Ability Score Improvement" : "Class Feature"),
      description: f?.description || "",
      level: Number(f?.level) || 1,
      source: breweryClass.name,
      is_asi: !!f?.is_asi,
      is_subclass_choice: !!f?.is_subclass_choice,
      mechanical: f?.mechanical || {},
      origin: "class_mod",
    }));

  if (!selectedSubclassName || !breweryClass.subclass) return baseFeatures;
  const options = Array.isArray(breweryClass.subclass.options) ? breweryClass.subclass.options : [];
  const chosen = options.find((o) => o?.name === selectedSubclassName);
  if (!chosen) return baseFeatures;
  const subclassFeatures = (Array.isArray(chosen.features) ? chosen.features : [])
    .filter((f) => Number(f?.level) <= lvl)
    .map((f) => ({
      name: f?.name || "Subclass Feature",
      description: f?.description || "",
      level: Number(f?.level) || 1,
      source: `${breweryClass.name} — ${chosen.name}`,
      is_asi: !!f?.is_asi,
      mechanical: f?.mechanical || {},
      origin: "subclass_mod",
    }));
  return [...baseFeatures, ...subclassFeatures];
}

/**
 * Levels at which the class grants an ASI. Pulled from the saved
 * feature list where any feature with is_asi=true counts. The class
 * creator seeds these at STANDARD_ASI_LEVELS, but authors can add /
 * move / remove them — this helper reflects whatever they wrote.
 */
export function getBreweryClassAsiLevels(breweryClass) {
  if (!breweryClass) return [];
  const levels = new Set();
  for (const f of (breweryClass.features || [])) {
    if (f?.is_asi && Number(f?.level) > 0) levels.add(Number(f.level));
  }
  return Array.from(levels).sort((a, b) => a - b);
}

/**
 * Resolve the class resource state at a given character level.
 * Returns { enabled, name, abbreviation, max, current, recharge }
 * where `max` is read from class_resource.count_by_level (Part 3B's
 * 20-row editor) and `current` seeds at `max` unless the caller
 * passes a previously-tracked value.
 *
 * Returns null when the class has no resource or the resource is
 * disabled — callers can branch cleanly.
 */
export function getBreweryClassResource(breweryClass, level, currentOverride = null) {
  const res = breweryClass?.class_resource;
  if (!res?.enabled) return null;
  const lvl = Math.max(1, Math.min(20, Number(level) || 1));
  const row = (Array.isArray(res.count_by_level) ? res.count_by_level : [])
    .find((r) => Number(r?.level) === lvl);
  const max = Number(row?.count) || 0;
  if (max <= 0) return null;
  return {
    enabled: true,
    name: res.name || "Resource",
    abbreviation: res.abbreviation || "",
    max,
    current: currentOverride == null ? max : Math.max(0, Math.min(max, Number(currentOverride) || 0)),
    recharge: res.recharge || "long_rest",
  };
}

/**
 * Given a class schema + the player's chosen starting_equipment
 * picks, produce a flat item list the creator/save path can push
 * onto characterData.inventory.
 *
 * `equipmentChoices` is the characterData._brewery_class_equipment
 * object shaped like:
 *   { choices: { [groupIdx]: optionString } }
 * `fixed` items from the schema are always included.
 */
export function resolveBreweryStartingItems(breweryClass, equipmentState) {
  if (!breweryClass?.starting_equipment) return [];
  const fixed = Array.isArray(breweryClass.starting_equipment.fixed)
    ? breweryClass.starting_equipment.fixed
    : [];
  const choices = Array.isArray(breweryClass.starting_equipment.choices)
    ? breweryClass.starting_equipment.choices
    : [];
  const chosen = (equipmentState?.choices) || {};
  const resolvedChoices = choices
    .map((_, idx) => chosen[idx])
    .filter((v) => typeof v === "string" && v.trim());
  return [...fixed, ...resolvedChoices];
}
