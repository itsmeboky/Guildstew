import {
  ABILITY_SCORE_IMPROVEMENT_LEVELS,
  FEATS,
  abilityModifier,
} from "@/components/dnd5e/dnd5eRules";

/**
 * ASI (Ability Score Improvement) selection helpers.
 *
 * Per RAW (PHB p. 15), at every ASI level a character can:
 *   - Bump one ability score by +2 (cap 20)
 *   - Bump two different ability scores by +1 each (cap 20 each)
 *   - Take a feat instead (PHB p. 165)
 *
 * Storage shape on characterData:
 *   asiSelections: {
 *     [classKey-classLevel]: {
 *       kind: 'plus2' | 'split' | 'feat',
 *       ability1?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha',
 *       ability2?: same set (only for 'split'),
 *       feat?: feat name (only for 'feat'),
 *     }
 *   }
 *
 * Key shape `${classKey}-${classLevel}` disambiguates Fighter level
 * 4 ASI from Wizard level 4 ASI in a multiclass build.
 *
 * Today's UI surfaces only PRIMARY-class ASIs. Multiclass ASI
 * distribution is filed as a smell — the helpers here are
 * multiclass-ready (the keying scheme handles it) but the picker
 * cards don't iterate over multiclass entries yet.
 */

export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

export const ABILITY_LABELS = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

export const MAX_ABILITY_SCORE = 20;

/** Build the asiSelections key for a specific class + class-level. */
export function asiKey(className, classLevel) {
  return `${className}-${classLevel}`;
}

/**
 * Per-class ASI levels reached given a class level. Reads from
 * ABILITY_SCORE_IMPROVEMENT_LEVELS so Fighter (extra ASIs at 6/14)
 * and Rogue (extra at 10) are honoured automatically.
 */
export function reachedAsiLevels(className, classLevel) {
  const list = ABILITY_SCORE_IMPROVEMENT_LEVELS[className] || [];
  return list.filter((l) => Number(l) <= Number(classLevel));
}

/**
 * Feats whose prerequisites are satisfied by the candidate
 * attributes. Today only ability-score prerequisites
 * (`{ str: 13 }` etc.) are checked. Spellcasting / proficiency
 * prereqs (Spell Sniper, Heavily Armored, etc.) pass through —
 * tightening those is filed for follow-up since it requires class
 * + equipment context the picker doesn't have yet.
 */
export function feasibleFeats(attributes) {
  const result = [];
  for (const [name, def] of Object.entries(FEATS)) {
    const pre = def?.prerequisite;
    if (!pre) {
      result.push(name);
      continue;
    }
    if (pre.spellcasting || pre.proficiency) {
      // Pass through — un-checkable from here, the picker shows
      // them and lets the player vouch for them.
      result.push(name);
      continue;
    }
    let ok = true;
    for (const ability of ABILITY_KEYS) {
      if (typeof pre[ability] === "number" && (attributes?.[ability] || 10) < pre[ability]) {
        ok = false;
        break;
      }
    }
    if (ok) result.push(name);
  }
  return result.sort();
}

/**
 * Compute the net per-ability bump from a single ASI selection.
 * Caller layers the result on top of pre-ASI attributes.
 */
export function bumpsForSelection(selection) {
  const out = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  if (!selection) return out;
  if (selection.kind === "plus2" && selection.ability1) {
    out[selection.ability1] = 2;
  } else if (selection.kind === "split" && selection.ability1 && selection.ability2) {
    out[selection.ability1] = (out[selection.ability1] || 0) + 1;
    out[selection.ability2] = (out[selection.ability2] || 0) + 1;
  }
  // Feats grant no flat ability bump in this helper. (A handful of
  // feats include a +1 to a stat — Resilient, Athlete, etc. — those
  // would need a per-feat bump table; out of scope for the alpha
  // ASI surface.)
  return out;
}

/**
 * Sum every ASI selection's bumps, capped at MAX_ABILITY_SCORE
 * relative to the supplied base attributes. Returns a delta map
 * the caller can ADD to base to get effective scores.
 */
export function totalAsiDelta(asiSelections, baseAttributes) {
  const delta = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  if (!asiSelections || typeof asiSelections !== "object") return delta;
  for (const sel of Object.values(asiSelections)) {
    const b = bumpsForSelection(sel);
    for (const k of ABILITY_KEYS) {
      const base = (baseAttributes?.[k] || 10) + delta[k];
      const room = Math.max(0, MAX_ABILITY_SCORE - base);
      delta[k] += Math.min(b[k], room);
    }
  }
  return delta;
}

/**
 * Effective attributes after all ASI selections, capped at 20 per
 * ability. Pure function — caller decides whether to store the
 * result on characterData.attributes or compute on the fly.
 */
export function applyAsiBumps(baseAttributes, asiSelections) {
  const delta = totalAsiDelta(asiSelections, baseAttributes);
  const out = { ...baseAttributes };
  for (const k of ABILITY_KEYS) {
    out[k] = Math.min(MAX_ABILITY_SCORE, (baseAttributes?.[k] || 10) + delta[k]);
  }
  return out;
}

/**
 * Validation for a single ASI card. Returns null when the card is
 * complete; otherwise a string describing what's still missing.
 */
export function validateSelection(selection) {
  if (!selection || !selection.kind) return "Pick an option";
  if (selection.kind === "plus2") {
    if (!selection.ability1) return "Pick an ability";
    return null;
  }
  if (selection.kind === "split") {
    if (!selection.ability1 || !selection.ability2) return "Pick two abilities";
    if (selection.ability1 === selection.ability2) return "Pick two DIFFERENT abilities";
    return null;
  }
  if (selection.kind === "feat") {
    if (!selection.feat) return "Pick a feat";
    return null;
  }
  return "Unknown selection";
}

/** Display modifier (+N / -N) for a given score. */
export function fmtMod(score) {
  const m = abilityModifier(score);
  return m >= 0 ? `+${m}` : `${m}`;
}
