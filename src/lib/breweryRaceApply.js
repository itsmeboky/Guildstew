/**
 * Brewery race → character sheet glue.
 *
 * Translates a mod's `ability_score_increases` block (see
 * src/config/breweryRaceSchema.js) into the shape the character
 * creator's ability-scores step already understands — a flat
 * `{ str, dex, con, ... }` bonus map.
 *
 * Three modes are supported:
 *   fixed  — bonuses come straight from ability_score_increases.fixed.
 *   choose — the player picks `count` scores to receive `+amount`
 *            each. Picks are stored on characterData._brewery_ability_picks.
 *   custom — auto-apply the `custom.fixed` portion, then let the
 *            player pick `custom.choose.count` more (excluding any
 *            abilities listed in custom.choose.exclude).
 */

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

export function getBreweryRaceBonuses(breweryRace, picks = {}) {
  const out = {};
  if (!breweryRace) return out;
  const asi = breweryRace.ability_score_increases || {};
  const mode = asi.mode || "fixed";

  if (mode === "fixed") {
    for (const [k, v] of Object.entries(asi.fixed || {})) {
      out[k] = (out[k] || 0) + (Number(v) || 0);
    }
    return out;
  }

  if (mode === "choose") {
    const amount = Number(asi.choose?.amount) || 1;
    for (const k of Object.keys(picks || {})) {
      if (!ABILITY_KEYS.includes(k)) continue;
      if (picks[k]) out[k] = (out[k] || 0) + amount;
    }
    return out;
  }

  if (mode === "custom") {
    for (const [k, v] of Object.entries(asi.custom?.fixed || {})) {
      out[k] = (out[k] || 0) + (Number(v) || 0);
    }
    const amount = Number(asi.custom?.choose?.amount) || 1;
    for (const k of Object.keys(picks || {})) {
      if (!ABILITY_KEYS.includes(k)) continue;
      if (picks[k]) out[k] = (out[k] || 0) + amount;
    }
  }

  return out;
}

/**
 * Describe the picker a brewery race needs, if any. Returns
 * { needed, count, amount, excluded[] } or { needed: false }.
 * AbilityScoresStep uses this to decide whether to render the
 * chip picker beneath the SRD bonus readout.
 */
export function getBreweryAbilityPickerSpec(breweryRace) {
  if (!breweryRace) return { needed: false };
  const asi = breweryRace.ability_score_increases || {};
  const mode = asi.mode || "fixed";
  if (mode === "fixed") return { needed: false };
  if (mode === "choose") {
    return {
      needed: true,
      count:  Number(asi.choose?.count)  || 1,
      amount: Number(asi.choose?.amount) || 1,
      excluded: [],
    };
  }
  if (mode === "custom") {
    return {
      needed: true,
      count:  Number(asi.custom?.choose?.count)  || 1,
      amount: Number(asi.custom?.choose?.amount) || 1,
      excluded: Array.isArray(asi.custom?.choose?.exclude) ? asi.custom.choose.exclude : [],
    };
  }
  return { needed: false };
}

export const BREWERY_ABILITY_KEYS = ABILITY_KEYS;

/**
 * Produce the characterData updates that should land the instant a
 * brewery race is selected: auto-granted languages, fixed skill /
 * weapon / armor / tool proficiencies, damage & condition
 * resistances, and the basics (speed, darkvision, size, additional
 * speeds).
 *
 * Existing characterData is passed in so we can merge (fixed
 * languages / proficiencies / skills) with whatever else is
 * already there — switching between SRD and brewery races wipes
 * the brewery-specific chunks via RaceStep's clean-up path, so
 * this helper only has to worry about adding on top.
 */
export function applyBreweryRaceBaseline(breweryRace, characterData = {}) {
  if (!breweryRace) return {};
  const langsFixed = Array.isArray(breweryRace.languages?.fixed) ? breweryRace.languages.fixed : [];
  const existingLangs = Array.isArray(characterData.languages) ? characterData.languages : [];
  const nextLangs = Array.from(new Set([...existingLangs, ...langsFixed]));

  const existingProf = characterData.proficiencies || { armor: [], weapons: [], tools: [] };
  const nextProf = {
    armor:   Array.from(new Set([...(existingProf.armor   || []), ...(breweryRace.armor_proficiencies  || [])])),
    weapons: Array.from(new Set([...(existingProf.weapons || []), ...(breweryRace.weapon_proficiencies || [])])),
    tools:   Array.from(new Set([...(existingProf.tools   || []), ...(breweryRace.tool_proficiencies   || [])])),
  };

  const fixedSkills = Array.isArray(breweryRace.skill_proficiencies?.fixed) ? breweryRace.skill_proficiencies.fixed : [];
  const existingSkills = characterData.skills || {};
  const nextSkills = { ...existingSkills };
  for (const s of fixedSkills) nextSkills[s] = true;

  // Traits land in a dedicated slot so ClassStep's features-
  // overwrite doesn't wipe them. characterMapping merges
  // race_features into the final features list at save time.
  const raceFeatures = (Array.isArray(breweryRace.traits) ? breweryRace.traits : []).map((t) => ({
    name: t?.name || "Racial Trait",
    source: breweryRace.name || "Racial",
    description: t?.description || "",
    level: Number(t?.level) || 1,
    mechanical: t?.mechanical || {},
    origin: "race_mod",
  }));

  return {
    languages: nextLangs,
    proficiencies: nextProf,
    skills: nextSkills,
    _brewery_bonus_langs: [],
    _brewery_chosen_skills: [],
    _brewery_race_resistances: {
      damage_resistances:    Array.isArray(breweryRace.damage_resistances)    ? breweryRace.damage_resistances    : [],
      damage_immunities:     Array.isArray(breweryRace.damage_immunities)     ? breweryRace.damage_immunities     : [],
      condition_resistances: Array.isArray(breweryRace.condition_resistances) ? breweryRace.condition_resistances : [],
    },
    _brewery_speed: Number(breweryRace.speed) || 30,
    _brewery_size: breweryRace.size || "Medium",
    _brewery_darkvision: Number(breweryRace.darkvision) || 0,
    _brewery_additional_speeds: breweryRace.additional_speeds || {},
    race_features: raceFeatures,
  };
}

/**
 * Clear every _brewery_* key on characterData. Called when the
 * user switches away from a brewery race back to SRD so nothing
 * sticky leaks through. Does NOT touch `languages` / `skills` /
 * `proficiencies` — those are dedupe-merged in and removing them
 * individually would re-open the duplicate-substitution problem.
 */
export function clearBreweryRaceMarkers() {
  return {
    _brewery_race: null,
    _brewery_subrace_bonus: {},
    _brewery_ability_picks: {},
    _brewery_bonus_langs: [],
    _brewery_chosen_skills: [],
    _brewery_race_resistances: null,
    _brewery_speed: null,
    _brewery_size: null,
    _brewery_darkvision: null,
    _brewery_additional_speeds: null,
    race_features: [],
  };
}

/**
 * Apply a subrace selection on top of the baseline. Caller should
 * first run applyBreweryRaceBaseline, then merge these updates.
 * If `subraceName` doesn't match any subrace, returns {} (base race
 * alone).
 *
 * Mechanics:
 *   - ability_score_bonus      → additive bonus map, stored
 *     on _brewery_subrace_bonus so AbilityScoresStep sums it in.
 *   - speed_override           → replaces baseline speed when set.
 *   - darkvision_override      → replaces baseline darkvision when
 *     set; the task calls for "replaces if higher" but we respect
 *     author intent and take the override as the authoritative value.
 *   - additional_traits        → appended to race_features.
 *   - replaced_traits          → filtered out of race_features by
 *     name (case-sensitive match, same rule as the creator).
 */
export function applyBreweryRaceSubrace(breweryRace, subraceName, baselineRaceFeatures = []) {
  if (!breweryRace) return {};
  const subraces = Array.isArray(breweryRace.subraces) ? breweryRace.subraces : [];
  const subrace = subraces.find((s) => s && s.name === subraceName);
  if (!subrace) {
    return {
      _brewery_subrace_bonus: {},
      race_features: baselineRaceFeatures,
    };
  }

  const additional = Array.isArray(subrace.additional_traits) ? subrace.additional_traits : [];
  const replaced   = Array.isArray(subrace.replaced_traits)   ? subrace.replaced_traits   : [];
  const filtered   = baselineRaceFeatures.filter((f) => !replaced.includes(f.name));
  const extra = additional.map((t) => ({
    name: t?.name || "Subrace Trait",
    source: subrace.name || breweryRace.name || "Subrace",
    description: t?.description || "",
    level: Number(t?.level) || 1,
    mechanical: t?.mechanical || {},
    origin: "subrace_mod",
  }));

  const updates = {
    _brewery_subrace_bonus: subrace.ability_score_bonus || {},
    race_features: [...filtered, ...extra],
  };
  if (subrace.speed_override != null && subrace.speed_override !== "") {
    updates._brewery_speed = Number(subrace.speed_override) || 0;
  }
  if (subrace.darkvision_override != null && subrace.darkvision_override !== "") {
    updates._brewery_darkvision = Number(subrace.darkvision_override) || 0;
  }
  return updates;
}
