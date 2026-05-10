import {
  ALL_SKILLS,
  CLASS_SKILL_CHOICES,
} from "@/components/dnd5e/dnd5eRules";
import { getRaceSkillProficiencies } from "@/components/dnd5e/raceData";
import { getBackgroundSkills } from "@/components/dnd5e/backgroundData";

/**
 * Single source of truth for "is the Skills step complete?".
 *
 * The same calculation used to live in two places — SkillsStep.jsx
 * (registry-driven, correct) and CharacterCreator.validateStep
 * (hardcoded local maps, divergent). The validator over-counted
 * fixed-racial skills (Elf Perception, Half-Orc Intimidation),
 * required a phantom +1 per multiclass entry the UI never offered
 * a picker for, and misjudged racial bonus counts for races
 * outside its tiny hardcoded list. Result: Next stayed disabled
 * while the in-step UI showed everything green. This helper is
 * the registry-driven version both call sites now share.
 *
 * Returns the raw counts AND a derived `isComplete` so consumers
 * can render per-bucket progress without redoing the work.
 */

const EXPERTISE_COUNTS = {
  Rogue: 2,
  Bard: 2,
};

export function getSkillsCompletion(characterData = {}) {
  const className = characterData.class;
  const choice = CLASS_SKILL_CHOICES[className] || { count: 2, from: [] };
  const classRequired = choice.count || 2;
  const expertiseRequired = EXPERTISE_COUNTS[className] || 0;

  // Bard's `from` is the literal "any" — expand to every skill.
  // Anything else falls back to an empty list so the includes()
  // checks below don't blow up on unknown classes.
  const availableClassSkills =
    choice.from === "any"
      ? ALL_SKILLS
      : Array.isArray(choice.from)
      ? choice.from
      : [];

  const raceRule = getRaceSkillProficiencies(
    characterData.race,
    characterData.subrace,
  );
  const fixedRacialSkills = raceRule.fixed || [];
  const racialRequired = raceRule.choose || 0;

  const backgroundSkills = getBackgroundSkills(characterData.background) || [];

  const selectedSkills = Object.entries(characterData.skills || {})
    .filter(([, on]) => on)
    .map(([skill]) => skill);

  // Class picks: skills the player chose from the class list,
  // excluding free grants (background, fixed-racial) so they
  // don't double-count.
  const classSelected = selectedSkills.filter(
    (s) =>
      !backgroundSkills.includes(s) &&
      !fixedRacialSkills.includes(s) &&
      availableClassSkills.includes(s),
  ).length;

  // Racial-bonus picks: skills the player chose that aren't on
  // the class list and aren't free grants — Half-Elf's two
  // free picks, Variant Human's single pick, etc.
  const racialSelected = selectedSkills.filter(
    (s) =>
      !backgroundSkills.includes(s) &&
      !fixedRacialSkills.includes(s) &&
      !availableClassSkills.includes(s),
  ).length;

  const expertiseSelected = Array.isArray(characterData.expertise)
    ? characterData.expertise.length
    : 0;

  const isComplete =
    classSelected === classRequired &&
    racialSelected === racialRequired &&
    expertiseSelected === expertiseRequired;

  return {
    classSelected,
    classRequired,
    racialSelected,
    racialRequired,
    expertiseSelected,
    expertiseRequired,
    isComplete,
  };
}
