
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

export function calculateMaxHP(className, level, conScore) {
  const hitDie = CLASS_HIT_DICE[className] || 8;
  const conMod = abilityModifier(conScore || 10);
  if (level === 1) return hitDie + conMod;
  const avgPerLevel = Math.floor(hitDie / 2) + 1;
  return hitDie + conMod + ((level - 1) * (avgPerLevel + conMod));
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
