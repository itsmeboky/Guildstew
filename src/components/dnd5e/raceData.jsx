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