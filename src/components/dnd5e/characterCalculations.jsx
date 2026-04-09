
// D&D 5e Character Calculations - following official rules

export const classHitDice = {
  "Barbarian": 12,
  "Fighter": 10,
  "Paladin": 10,
  "Ranger": 10,
  "Bard": 8,
  "Cleric": 8,
  "Druid": 8,
  "Monk": 8,
  "Rogue": 8,
  "Warlock": 8,
  "Sorcerer": 6,
  "Wizard": 6
};

export const raceSpeed = {
  "Dragonborn": 30,
  "Dwarf": 25,
  "Elf": 30,
  "Gnome": 25,
  "Half-Elf": 30,
  "Half-Orc": 30,
  "Halfling": 25,
  "Human": 30,
  "Tiefling": 30
};

export function calculateAbilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

export function calculateMaxHP(className, level, conScore) {
  const hitDie = classHitDice[className] || 8;
  const conMod = calculateAbilityModifier(conScore);
  
  if (level === 1) {
    return hitDie + conMod;
  }
  
  // For higher levels: max at level 1 + average of hit die for remaining levels
  const avgPerLevel = Math.floor(hitDie / 2) + 1;
  return hitDie + conMod + ((level - 1) * (avgPerLevel + conMod));
}

export function calculateAC(dexScore, armor = null) {
  const dexMod = calculateAbilityModifier(dexScore);
  
  if (!armor) {
    return 10 + dexMod;
  }
  
  // Can be extended for armor calculations later
  return 10 + dexMod;
}

export function calculateProficiencyBonus(level) {
  return Math.floor((level - 1) / 4) + 2;
}

export function calculatePassivePerception(wisScore, isProficient, hasExpertise, proficiencyBonus) {
  const wisMod = calculateAbilityModifier(wisScore);
  if (hasExpertise) {
    return 10 + wisMod + (proficiencyBonus * 2);
  }
  return 10 + wisMod + (isProficient ? proficiencyBonus : 0);
}

export function calculateSkillModifier(abilityScore, isProficient, hasExpertise, proficiencyBonus) {
  const abilityMod = calculateAbilityModifier(abilityScore);
  
  if (hasExpertise) {
    return abilityMod + (proficiencyBonus * 2);
  }
  
  if (isProficient) {
    return abilityMod + proficiencyBonus;
  }
  
  return abilityMod;
}

export function formatModifier(value) {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function getSpeed(race) {
  return raceSpeed[race] || 30;
}
