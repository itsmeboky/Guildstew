/**
 * Comprehension tiers + skill / ability lookups used by the World
 * Lore knowledge gates. The three tiers drive rendering:
 *
 *   fluent  — character knows the language, render full English
 *   partial — character knows a related language; render a gist +
 *             font-obfuscated text with an INT decipher roll
 *   unknown — no link at all; render font-only text with no gist
 */

export const LANGUAGE_FAMILIES = {
  Elvish:     ["Sylvan"],
  Sylvan:     ["Elvish"],
  Dwarvish:   ["Giant", "Gnomish"],
  Giant:      ["Dwarvish"],
  Gnomish:    ["Dwarvish"],
  Infernal:   ["Abyssal"],
  Abyssal:    ["Infernal"],
  Primordial: ["Aquan", "Auran", "Ignan", "Terran"],
  Aquan:      ["Primordial", "Auran", "Ignan", "Terran"],
  Auran:      ["Primordial", "Aquan", "Ignan", "Terran"],
  Ignan:      ["Primordial", "Aquan", "Auran", "Terran"],
  Terran:     ["Primordial", "Aquan", "Auran", "Ignan"],
};

function normaliseList(val) {
  if (Array.isArray(val)) return val.filter(Boolean).map((v) => String(v));
  if (typeof val === "string") {
    return val.split(",").map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Pull the character's known languages from whichever shape they're
 * stored in (`stats.languages`, top-level `languages`, or a comma-
 * separated string). Returns a flat array of display names.
 */
export function characterLanguages(character) {
  if (!character) return [];
  const stats = character.stats || {};
  const raw = stats.languages ?? character.languages ?? [];
  return normaliseList(raw);
}

/**
 * Check if the character speaks a specific language.
 */
export function speaksLanguage(character, language) {
  if (!language) return true;
  const known = characterLanguages(character).map((l) => l.toLowerCase());
  return known.includes(String(language).toLowerCase());
}

/**
 * fluent / partial / unknown comprehension tier for a target
 * language. `fluent` trumps `partial`; `partial` needs a
 * LANGUAGE_FAMILIES link.
 */
export function getComprehensionLevel(character, requiredLanguage) {
  if (!requiredLanguage) return "fluent";
  const known = characterLanguages(character).map((l) => l.toLowerCase());
  const required = String(requiredLanguage).toLowerCase();
  if (known.includes(required)) return "fluent";
  const related = (LANGUAGE_FAMILIES[requiredLanguage] || [])
    .map((l) => String(l).toLowerCase());
  if (related.some((r) => known.includes(r))) return "partial";
  return "unknown";
}

/* -------------------- skill / ability modifiers ------------------ */

const SKILL_TO_ABILITY = {
  Acrobatics:       "dex",
  "Animal Handling": "wis",
  Arcana:           "int",
  Athletics:        "str",
  Deception:        "cha",
  History:          "int",
  Insight:          "wis",
  Intimidation:     "cha",
  Investigation:    "int",
  Medicine:         "wis",
  Nature:           "int",
  Perception:       "wis",
  Performance:      "cha",
  Persuasion:       "cha",
  Religion:         "int",
  "Sleight of Hand": "dex",
  Stealth:          "dex",
  Survival:         "wis",
};

export const SKILLS = Object.keys(SKILL_TO_ABILITY);
export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

function abilityScore(character, ability) {
  if (!character) return 10;
  const stats = character.stats || {};
  const attrs = stats.attributes || character.attributes || {};
  const short = ability.toLowerCase();
  const long = { str: "strength", dex: "dexterity", con: "constitution", int: "intelligence", wis: "wisdom", cha: "charisma" }[short];
  return (
    attrs[short]
    ?? attrs[long]
    ?? stats[short]
    ?? stats[long]
    ?? character[short]
    ?? character[long]
    ?? 10
  );
}

export function getAbilityModifier(character, ability) {
  const score = Number(abilityScore(character, ability)) || 10;
  return Math.floor((score - 10) / 2);
}

function proficiencyBonus(character) {
  if (!character) return 2;
  return (
    character?.stats?.proficiency_bonus
    ?? character?.proficiency_bonus
    ?? Math.max(2, 2 + Math.floor(((character?.level ?? character?.stats?.level ?? 1) - 1) / 4))
  );
}

function skillIsProficient(character, skill) {
  const stats = character?.stats || {};
  const skills = stats.skills || character?.skills || {};
  return !!skills[skill];
}

function skillIsExpertise(character, skill) {
  const stats = character?.stats || {};
  const exp = stats.expertise || character?.expertise || [];
  return Array.isArray(exp) && exp.includes(skill);
}

export function getSkillModifier(character, skill) {
  const ability = SKILL_TO_ABILITY[skill];
  if (!ability) return 0;
  const base = getAbilityModifier(character, ability);
  if (!skillIsProficient(character, skill)) return base;
  const pb = proficiencyBonus(character);
  return base + (skillIsExpertise(character, skill) ? pb * 2 : pb);
}

/**
 * Which of `campaigns.skill_check_retry_policy` values lets the
 * character re-roll given a prior attempt. `sessionStartedAt` is
 * optional — only the `next_session` branch reads it.
 */
export function canReattempt({ attempt, retryPolicy, sessionStartedAt }) {
  if (!attempt || attempt.result === "pass") return true;
  if (retryPolicy === "unlimited") return true;
  if (retryPolicy === "permanent") return false;
  if (retryPolicy === "24_hours") {
    const ts = new Date(attempt.attempted_at || attempt.created_at || 0).getTime();
    return !ts || (Date.now() - ts) >= 24 * 60 * 60 * 1000;
  }
  if (retryPolicy === "next_session") {
    if (!sessionStartedAt) return false;
    const ts = new Date(attempt.attempted_at || attempt.created_at || 0).getTime();
    return ts < new Date(sessionStartedAt).getTime();
  }
  return false;
}
