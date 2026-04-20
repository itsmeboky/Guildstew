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
