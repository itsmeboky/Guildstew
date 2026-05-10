
// D&D 5e Character Calculations
// Delegates core formulas to dnd5eRules.js (the single source of truth).
// This module re-exports the same names so existing importers don't break.

import {
  abilityModifier,
  proficiencyBonus,
  CLASS_HIT_DICE,
  RACES,
} from '@/components/dnd5e/dnd5eRules';

// Re-export so `import { classHitDice } from 'characterCalculations'` still works.
export const classHitDice = CLASS_HIT_DICE;

export const raceSpeed = {
  Dragonborn: 30, Dwarf: 25, Elf: 30, Gnome: 25,
  "Half-Elf": 30, "Half-Orc": 30, Halfling: 25, Human: 30, Tiefling: 30,
};

export function calculateAbilityModifier(score) {
  return abilityModifier(score);
}

/**
 * Max HP per RAW (PHB p. 12 + multiclass rules p. 164).
 *
 * Two call shapes supported:
 *   calculateMaxHP("Fighter", 5, 14)
 *     — single-class, legacy signature; preserved for callers not
 *       yet migrated to the multiclass-aware signature.
 *   calculateMaxHP({ class: "Fighter", level: 8, conScore: 14,
 *                    multiclasses: [{ class: "Wizard", level: 3 }] })
 *     — multiclass-aware. `level` is the TOTAL character level;
 *       primary-class levels are inferred as
 *       (level - sum of multiclass levels).
 *
 * RAW: only the FIRST level of the FIRST class grants max-die HP.
 * Every other level — including all multiclass levels — uses the
 * class-specific average (floor(die/2) + 1) plus the CON modifier.
 * Each level grants at least 1 HP per the level-up errata.
 */
export function calculateMaxHP(classOrSpec, level, conScore) {
  // Legacy single-class signature → forward to the spec form.
  if (typeof classOrSpec === "string") {
    return calculateMaxHP({
      class: classOrSpec,
      level,
      conScore,
      multiclasses: [],
    });
  }

  const spec = classOrSpec || {};
  const primaryClass = spec.class;
  const totalLevel = Math.max(1, Number(spec.level) || 1);
  const conMod = abilityModifier(spec.conScore ?? 10);
  const multiclasses = Array.isArray(spec.multiclasses) ? spec.multiclasses : [];
  const mcLevelsTotal = multiclasses.reduce(
    (s, mc) => s + (Number(mc?.level) || 0),
    0,
  );
  const primaryLevel = Math.max(0, totalLevel - mcLevelsTotal);
  const primaryDie = CLASS_HIT_DICE[primaryClass] ?? 8;
  const perLevelMin = 1;

  if (primaryLevel < 1) {
    // Edge case: multiclass levels exceed total — treat as primary
    // level 1 to keep something sensible on the sheet.
    return primaryDie + conMod;
  }

  // Level 1 of primary: max die + CON (no minimum-1 floor needed —
  // the smallest hit die is d6, conMod can drop this below 1 only
  // for absurd CON < 5, but we still floor at 1 for safety).
  let hp = Math.max(perLevelMin, primaryDie + conMod);

  // Remaining primary levels: average of primary die + CON each.
  const primaryAvg = Math.floor(primaryDie / 2) + 1;
  hp += (primaryLevel - 1) * Math.max(perLevelMin, primaryAvg + conMod);

  // Each multiclass entry contributes its own die's average per level.
  for (const mc of multiclasses) {
    const cls = mc?.class;
    const lvl = Number(mc?.level) || 0;
    if (!cls || lvl <= 0) continue;
    const die = CLASS_HIT_DICE[cls] ?? 8;
    const avg = Math.floor(die / 2) + 1;
    hp += lvl * Math.max(perLevelMin, avg + conMod);
  }

  return hp;
}

export function calculateAC(dexScore, armor = null) {
  const dexMod = abilityModifier(dexScore);
  if (!armor) return 10 + dexMod;
  return 10 + dexMod;
}

export function calculateProficiencyBonus(level) {
  return proficiencyBonus(level);
}

export function calculatePassivePerception(wisScore, isProficient, hasExpertise, profBonus) {
  const wisMod = abilityModifier(wisScore);
  if (hasExpertise) return 10 + wisMod + (profBonus * 2);
  return 10 + wisMod + (isProficient ? profBonus : 0);
}

export function calculateSkillModifier(abilityScore, isProficient, hasExpertise, profBonus) {
  const mod = abilityModifier(abilityScore);
  if (hasExpertise) return mod + (profBonus * 2);
  if (isProficient) return mod + profBonus;
  return mod;
}

export function formatModifier(value) {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function getSpeed(race) {
  return RACES[race]?.speed || raceSpeed[race] || 30;
}
