// D&D 5e Racial Ability Score Increases and Bonuses

export const racialBonuses = {
  "Dragonborn": {
    base: { str: 2, cha: 1 },
    subtypes: {}
  },
  "Elf": {
    base: { dex: 2 },
    subtypes: {
      "High Elf": { int: 1 },
      "Wood Elf": { wis: 1 },
      "Dark Elf (Drow)": { cha: 1 }
    }
  },
  "Dwarf": {
    base: { con: 2 },
    subtypes: {
      "Mountain Dwarf": { str: 2 },
      "Hill Dwarf": { wis: 1 }
    }
  },
  "Human": {
    base: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    subtypes: {}
  },
  "Halfling": {
    base: { dex: 2 },
    subtypes: {
      "Lightfoot": { cha: 1 },
      "Stout": { con: 1 }
    }
  },
  "Tiefling": {
    base: { cha: 2, int: 1 },
    subtypes: {}
  },
  "Half-Elf": {
    base: { cha: 2 },
    subtypes: {},
    customBonus: 2 // Can add +1 to two different abilities
  },
  "Half-Orc": {
    base: { str: 2, con: 1 },
    subtypes: {}
  },
  "Gnome": {
    base: { int: 2 },
    subtypes: {
      "Forest Gnome": { dex: 1 },
      "Rock Gnome": { con: 1 }
    }
  }
};

export const racialSkills = {
  "Half-Elf": 2, // Skill Versatility - 2 skills of choice
  "Human": 1 // Extra skill proficiency
};

/**
 * Racial skill proficiencies. Matches the racial-language pattern:
 *   - `fixed`  — auto-granted, rendered as locked chips the player
 *                can't deselect.
 *   - `choose` — how many extra skills the player picks.
 *   - `from`   — either the string "any" (pick from ALL_SKILLS) or
 *                an explicit array of allowed skills.
 *
 * Subrace keys (High Elf / Mountain Dwarf / Variant Human) take
 * precedence over base race when both are present. Base "Human"
 * has no racial skill (Variant Human is the skill-granting variant),
 * so a PHB Human picker that doesn't choose the variant gets 0.
 */
export const RACE_SKILL_PROFICIENCIES = {
  Elf:             { fixed: ["Perception"], choose: 0, from: [] },
  "High Elf":      { fixed: ["Perception"], choose: 0, from: [] },
  "Wood Elf":      { fixed: ["Perception"], choose: 0, from: [] },
  "Dark Elf":      { fixed: ["Perception"], choose: 0, from: [] },
  "Dark Elf (Drow)": { fixed: ["Perception"], choose: 0, from: [] },
  "Half-Elf":      { fixed: [], choose: 2, from: "any" },
  "Half-Orc":      { fixed: ["Intimidation"], choose: 0, from: [] },
  Dwarf:           { fixed: [], choose: 0, from: [] },
  "Mountain Dwarf": { fixed: [], choose: 0, from: [] },
  "Hill Dwarf":    { fixed: [], choose: 0, from: [] },
  Human:           { fixed: [], choose: 0, from: [] },
  "Variant Human": { fixed: [], choose: 1, from: "any" },
  Halfling:        { fixed: [], choose: 0, from: [] },
  Lightfoot:       { fixed: [], choose: 0, from: [] },
  Stout:           { fixed: [], choose: 0, from: [] },
  Gnome:           { fixed: [], choose: 0, from: [] },
  "Forest Gnome":  { fixed: [], choose: 0, from: [] },
  "Rock Gnome":    { fixed: [], choose: 0, from: [] },
  Tiefling:        { fixed: [], choose: 0, from: [] },
  Dragonborn:      { fixed: [], choose: 0, from: [] },
};

/**
 * Resolve the racial skill rule for a race / subrace combo. Subrace
 * wins when present; otherwise we fall back to the base race. An
 * unrecognised race collapses to the empty rule so callers never
 * need to null-check.
 */
export function getRaceSkillProficiencies(race, subrace) {
  const empty = { fixed: [], choose: 0, from: [] };
  return (
    (subrace && RACE_SKILL_PROFICIENCIES[subrace])
    || (race && RACE_SKILL_PROFICIENCIES[race])
    || empty
  );
}

export function getRacialAbilityBonuses(race, subrace) {
  const raceData = racialBonuses[race];
  if (!raceData) return {};
  
  const bonuses = { ...raceData.base };
  
  if (subrace && raceData.subtypes[subrace]) {
    const subtypeBonuses = raceData.subtypes[subrace];
    Object.keys(subtypeBonuses).forEach(key => {
      bonuses[key] = (bonuses[key] || 0) + subtypeBonuses[key];
    });
  }
  
  return bonuses;
}

export function applyRacialBonuses(baseScores, race, subrace, customBonuses = {}) {
  const racialBonuses = getRacialAbilityBonuses(race, subrace);
  const result = { ...baseScores };
  
  // Apply base racial bonuses
  Object.keys(racialBonuses).forEach(key => {
    result[key] = (result[key] || 10) + racialBonuses[key];
  });
  
  // Apply custom bonuses (for Half-Elf +1/+1)
  Object.keys(customBonuses).forEach(key => {
    result[key] = (result[key] || 10) + customBonuses[key];
  });
  
  return result;
}