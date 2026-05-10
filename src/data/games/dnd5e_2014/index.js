// D&D 5e (2014 PHB) game pack adapter.
//
// Thin wrapper around the existing 2014 registry that's been the
// character creator's source of truth since day one. All functions
// here re-expose data already exported from the legacy
// `src/components/dnd5e/*` and `src/game-packs/dnd5e/*` files —
// the abstraction's job is to give every game pack a uniform shape
// so character-creator components can read through `getGamePack
// (character.gamePack).getRaces()` etc. without branching on
// pack id at every call site.
//
// Migrating existing components to this abstraction is a Phase B
// follow-on; today the abstraction is consumed only by NEW code
// that has to choose a ruleset (the 2024 creator surfaces in
// Layer 4 commits 2-4, edition-aware tooltips, etc.). Existing
// imports of `dnd5eRules.js`, `raceData.jsx`, etc. continue to
// work — those ARE the 2014 data, and the wrapper just re-exports
// them under the unified contract.

import {
  CLASS_HIT_DICE,
  CLASS_SKILL_CHOICES,
  ABILITY_SCORE_IMPROVEMENT_LEVELS,
  MULTICLASS_REQUIREMENTS,
  MULTICLASS_PROFICIENCIES,
  SPELLCASTING_ABILITY,
  CASTER_TYPE,
  FULL_CASTER_SLOTS,
  WARLOCK_PACT_SLOTS,
  CANTRIPS_KNOWN,
  SPELLS_KNOWN_TABLE,
  FEATS,
  FIGHTING_STYLES,
  ALL_SKILLS,
  SKILL_ABILITIES,
  cantripsKnown,
  spellsKnown,
  spellsPrepared,
  getSpellSlots,
  getMulticlassSkillGrant,
  multiPickCount,
  abilityModifier,
  proficiencyBonus,
} from "@/components/dnd5e/dnd5eRules";

import {
  racialBonuses,
  RACE_SKILL_PROFICIENCIES,
  getRaceSkillProficiencies,
  getRacialAbilityBonuses,
  applyRacialBonuses,
} from "@/components/dnd5e/raceData";

import {
  getBackgroundSkills,
  getBackgroundTools,
  getBackgroundLanguages,
  getLanguagesForCharacter,
} from "@/components/dnd5e/backgroundData";

import {
  getClassFeaturesForLevel,
} from "@/components/dnd5e/classFeatures";

import {
  calculateMaxHP,
  calculateProficiencyBonus,
} from "@/components/dnd5e/characterCalculations";

// ─── Pack metadata ────────────────────────────────────────────

export const meta = {
  id: "dnd5e_2014",
  label: "D&D 5e (2014)",
  edition: "2014",
  ready: true,
};

// ─── Discovery accessors ──────────────────────────────────────

const PHB_2014_CLASSES = [
  "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk",
  "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard",
];

const PHB_2014_RACES = [
  "Dragonborn", "Dwarf", "Elf", "Gnome", "Half-Elf", "Half-Orc",
  "Halfling", "Human", "Tiefling",
];

const PHB_2014_BACKGROUNDS = [
  "Acolyte", "Charlatan", "Criminal", "Entertainer", "Folk Hero",
  "Guild Artisan", "Hermit", "Noble", "Outlander", "Sage", "Sailor",
  "Soldier", "Urchin",
];

export function getRaces() {
  return PHB_2014_RACES;
}

export function getClasses() {
  return PHB_2014_CLASSES;
}

export function getBackgrounds() {
  return PHB_2014_BACKGROUNDS;
}

export function getFeats() {
  return Object.entries(FEATS).map(([name, def]) => ({ name, ...def }));
}

// ─── Per-class accessors ──────────────────────────────────────

export function getHitDie(className) {
  return CLASS_HIT_DICE[className] ?? 8;
}

export function getSkillChoices(className) {
  return CLASS_SKILL_CHOICES[className] || { count: 2, from: [] };
}

export function getMulticlassRequirements(className) {
  return MULTICLASS_REQUIREMENTS[className] || [];
}

export function getMulticlassProficiencies(className) {
  return MULTICLASS_PROFICIENCIES[className] || {};
}

export function getAsiLevels(className) {
  return ABILITY_SCORE_IMPROVEMENT_LEVELS[className] || [];
}

export function getSpellcastingAbility(className) {
  return SPELLCASTING_ABILITY[className] || null;
}

export function getCasterType(className) {
  return CASTER_TYPE[className] || "none";
}

export function getFeatures(className, level) {
  return getClassFeaturesForLevel(className, level) || [];
}

// ─── Race accessors ───────────────────────────────────────────

export function getRaceAbilityBonuses(race, subrace) {
  return getRacialAbilityBonuses(race, subrace);
}

export function getRaceSkills(race, subrace) {
  return getRaceSkillProficiencies(race, subrace);
}

// ─── Background accessors ─────────────────────────────────────

export function getBackgroundSkillsList(background) {
  return getBackgroundSkills(background);
}

// ─── Re-exports for components that already import directly. ──
// Listed here so the abstraction layer stays a complete contract;
// existing call sites don't need to migrate today.
export {
  CLASS_HIT_DICE,
  CLASS_SKILL_CHOICES,
  ABILITY_SCORE_IMPROVEMENT_LEVELS,
  MULTICLASS_REQUIREMENTS,
  MULTICLASS_PROFICIENCIES,
  SPELLCASTING_ABILITY,
  CASTER_TYPE,
  FULL_CASTER_SLOTS,
  WARLOCK_PACT_SLOTS,
  CANTRIPS_KNOWN,
  SPELLS_KNOWN_TABLE,
  FEATS,
  FIGHTING_STYLES,
  ALL_SKILLS,
  SKILL_ABILITIES,
  cantripsKnown,
  spellsKnown,
  spellsPrepared,
  getSpellSlots,
  getMulticlassSkillGrant,
  multiPickCount,
  abilityModifier,
  proficiencyBonus,
  racialBonuses,
  RACE_SKILL_PROFICIENCIES,
  applyRacialBonuses,
  getBackgroundTools,
  getBackgroundLanguages,
  getLanguagesForCharacter,
  calculateMaxHP,
  calculateProficiencyBonus,
};
