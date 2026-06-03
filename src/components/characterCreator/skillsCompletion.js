import {
  ALL_SKILLS,
  CLASS_SKILL_CHOICES,
  getMulticlassSkillGrant,
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


/**
 * Expertise grants scale by class level (M6):
 *   Rogue — 2 at level 1, 2 more at level 6 (4 total).
 *   Bard  — 2 at level 3, 2 more at level 10 (4 total); NONE before level 3.
 *   No other class gets expertise.
 * Uses the PRIMARY class level (total − multiclass levels), since expertise
 * comes from the primary class.
 */
export function expertiseRequiredFor(characterData = {}) {
  const className = characterData.class;
  if (className !== "Rogue" && className !== "Bard") return 0;
  const total = Number(characterData.level) || 1;
  const mcLevels = Array.isArray(characterData.multiclasses)
    ? characterData.multiclasses.reduce((s, m) => s + (Number(m?.level) || 0), 0)
    : 0;
  const level = Math.max(1, total - mcLevels);
  if (className === "Rogue") return level >= 6 ? 4 : 2;
  // Bard
  return level >= 10 ? 4 : level >= 3 ? 2 : 0;
}

export function getSkillsCompletion(characterData = {}) {
  const className = characterData.class;
  const choice = CLASS_SKILL_CHOICES[className] || { count: 2, from: [] };
  const classRequired = choice.count || 2;
  const expertiseRequired = expertiseRequiredFor(characterData);

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

  // Multiclass skill grants — per RAW (PHB p. 164) only Bard, Ranger
  // and Rogue grant a skill on entry; everyone else grants armor /
  // weapon / tool but no skill. The picker UI lives in SkillsStep
  // and writes selections to characterData.multiclassSkills keyed by
  // class name. We accumulate the totals here for the gate, plus a
  // per-class breakdown so SkillsStep can render "X/Y" per picker
  // without redoing this work.
  //
  // "Available" caps the requirement at min(grant.count, picksLeft)
  // where picksLeft = grant.from minus skills already known from
  // every other source. If a player happens to already know every
  // skill on the grant list (rare — usually only on level-20 multi-
  // multiclass builds), the requirement collapses to 0 and the
  // step doesn't get blocked by an unsatisfiable picker.
  const multiclassEntries = Array.isArray(characterData.multiclasses)
    ? characterData.multiclasses.filter((mc) => mc?.class)
    : [];
  const multiclassPicks = characterData.multiclassSkills || {};
  // Skills already known from primary class picks, race fixed
  // grants, race choose grants, and background. Used to compute
  // anti-double-dip caps below.
  const otherKnownSkills = new Set([
    ...backgroundSkills,
    ...fixedRacialSkills,
  ]);
  for (const s of selectedSkills) {
    // A skill is in selectedSkills if any picker chose it. We treat
    // it as "owned by another picker" UNLESS it was picked by THIS
    // multiclass entry — that's resolved per-picker below.
    otherKnownSkills.add(s);
  }
  const multiclassByClass = {};
  let multiclassRequired = 0;
  let multiclassSelected = 0;
  for (const mc of multiclassEntries) {
    const grant = getMulticlassSkillGrant(mc.class);
    if (!grant) continue;
    const grantList = grant.from === "any"
      ? ALL_SKILLS
      : Array.isArray(grant.from)
      ? grant.from
      : [];
    const myPicks = Array.isArray(multiclassPicks[mc.class])
      ? multiclassPicks[mc.class]
      : [];
    // Available to THIS picker = grant list minus skills owned by
    // other sources, with this picker's own current selections
    // excepted so the user can see / deselect their own picks.
    const ownPickSet = new Set(myPicks);
    const availableCount = grantList.filter(
      (s) => !otherKnownSkills.has(s) || ownPickSet.has(s),
    ).length;
    // If all grant slots are blocked by other sources the floor
    // collapses to 0 — picker shows the "wasted grant" notice
    // and step advancement isn't held hostage to an
    // unsatisfiable pick.
    const cappedRequired = Math.max(0, Math.min(grant.count, availableCount));
    const selected = myPicks.filter((s) => grantList.includes(s)).length;
    multiclassByClass[mc.class] = {
      required: cappedRequired,
      selected,
      grantCount: grant.count,
      from: grantList,
    };
    multiclassRequired += cappedRequired;
    multiclassSelected += selected;
  }

  const isComplete =
    classSelected === classRequired &&
    racialSelected === racialRequired &&
    expertiseSelected === expertiseRequired &&
    multiclassSelected === multiclassRequired;

  return {
    classSelected,
    classRequired,
    racialSelected,
    racialRequired,
    expertiseSelected,
    expertiseRequired,
    multiclassSelected,
    multiclassRequired,
    multiclassByClass,
    isComplete,
  };
}
