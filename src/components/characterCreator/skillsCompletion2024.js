import { getClassByName } from "@/data/games/dnd5e_2024/classes";
import { getSpeciesById, getSubspecies } from "@/data/games/dnd5e_2024/species";

/**
 * 2024 D&D 5e — skill step completion check.
 *
 * Mirrors the 2014 helper (skillsCompletion.js) but reads from the
 * 2024 adapters so skill choice counts come from the SRD class JSON
 * and background skills come from the AbilitiesStep2024 selection
 * (characterData.background.skillsGranted).
 *
 * Buckets:
 *   - class picks: class.skillChoiceCount skills from class list,
 *     excluding any already granted by background.
 *   - species picks: +1 free pick if the species/subspecies has the
 *     "skillful" trait (Human in SRD 5.2).
 *   - expertise: Rogue and Bard pick 2 at L1.
 */

const EXPERTISE_AT_L1 = {
  Rogue: 2,
  Bard: 2,
};

function stripSkillPrefix(name) {
  return String(name || "").replace(/^Skill:\s*/i, "");
}

function speciesSkillfulCount(characterData) {
  const speciesId = characterData.species?.speciesId;
  if (!speciesId) return 0;
  const species = getSpeciesById(speciesId);
  const subspeciesId = characterData.species?.subspeciesId;
  const subspecies = subspeciesId ? getSubspecies(subspeciesId) : null;
  const traits = [
    ...(species?.traits || []),
    ...(subspecies?.traits || []),
  ];
  return traits.some((t) => t.index === "skillful") ? 1 : 0;
}

export function getSkillsCompletion2024(characterData = {}) {
  const className = characterData.class;
  const cls = className ? getClassByName(className) : null;
  const classRequired = cls?.skillChoiceCount || 0;
  const classOptions = (cls?.skillChoices || [])
    .map(stripSkillPrefix)
    .filter(Boolean);

  const backgroundSkills = characterData.background?.skillsGranted || [];
  const speciesRequired = speciesSkillfulCount(characterData);
  const expertiseRequired = EXPERTISE_AT_L1[className] || 0;

  const selected = Object.entries(characterData.skills || {})
    .filter(([, on]) => on)
    .map(([s]) => s);

  const classSelected = selected.filter(
    (s) => !backgroundSkills.includes(s) && classOptions.includes(s),
  ).length;

  const speciesSelected = selected.filter(
    (s) => !backgroundSkills.includes(s) && !classOptions.includes(s),
  ).length;

  const expertiseSelected = Array.isArray(characterData.expertise)
    ? characterData.expertise.length
    : 0;

  const isComplete =
    classSelected === classRequired &&
    speciesSelected === speciesRequired &&
    expertiseSelected === expertiseRequired;

  return {
    classSelected,
    classRequired,
    speciesSelected,
    speciesRequired,
    expertiseSelected,
    expertiseRequired,
    isComplete,
  };
}
