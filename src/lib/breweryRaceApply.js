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
