// Resolve the effective L1 key ability for a class.
//
// Most classes have a fixed key ability in classes.json (`keyAbility` array
// from Foundry import) — Fighter STR, Wizard INT, etc. Pick the first entry.
//
// Psychic ships with an empty keyAbility array — its key is set by the
// player's Subconscious Mind selection at L1. Look up the mapping from
// the curated `subclassSecondary.keyAbilityMap` block in class-details.json.
//
// Returns the short ability code ('str', 'int', 'cha', etc.) or undefined
// when the character hasn't made the required selection yet.

import classDetails from '../data/class-details.json';

export function getEffectiveKeyAbility(cls, data) {
  if (!cls) return undefined;
  if (cls.keyAbility?.length) return cls.keyAbility[0];
  const details = classDetails[cls.slug];
  const map = details?.subclassSecondary?.keyAbilityMap;
  const secondaryPick = data?.subclassSecondary;
  if (map && secondaryPick) return map[secondaryPick];
  return undefined;
}
