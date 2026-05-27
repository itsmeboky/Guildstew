// Resolve the effective L1 key ability for a class.
//
// Most classes have a fixed key ability in classes.json (`keyAbility` array
// from Foundry import) — Fighter STR, Wizard INT, etc. Pick the first entry.
//
// Psychic ships with an empty keyAbility array — its key is set by the
// player's Subconscious Mind selection at L1. Look up the mapping from
// the curated `subclassSecondary.keyAbilityMap` block in class-details.json.
//
// Returns the CAPITALIZED full ability name ('Strength', 'Intelligence',
// 'Charisma', …) or undefined when the character hasn't made the required
// selection yet. The raw classes.json field uses lowercase 3-char codes
// ('str', 'int', 'cha') — this helper normalizes them up to match every
// consumer's shape:
//   - compute-derived-stats.js   reads mods[ability] (capitalized keys)
//   - compute-ability-scores.js  reads accumulated[ability] (capitalized)
//   - StepAbilities.jsx          compares `ab === keyAbility` over ABILITIES
// Before this normalization, `mods['dex']` returned undefined which made
// Class DC compute to NaN, and the +1 key-ability boost in
// computeAbilityScores landed on accumulated['dex'] instead of
// accumulated['Dexterity'] — silently lost.

import classDetails from '../data/class-details.json';

const ABILITY_NAME_BY_CODE = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

// Accept either a lowercase code ('dex') or an already-capitalized name
// ('Dexterity') and return the capitalized form. Unknown inputs pass
// through so a hand-curated overlay that's already capitalized still
// works.
function normalizeAbilityName(value) {
  if (!value) return undefined;
  return ABILITY_NAME_BY_CODE[value.toLowerCase?.()] || value;
}

export function getEffectiveKeyAbility(cls, data) {
  if (!cls) return undefined;
  if (cls.keyAbility?.length) return normalizeAbilityName(cls.keyAbility[0]);
  const details = classDetails[cls.slug];
  const map = details?.subclassSecondary?.keyAbilityMap;
  const secondaryPick = data?.subclassSecondary;
  if (map && secondaryPick) return normalizeAbilityName(map[secondaryPick]);
  return undefined;
}
