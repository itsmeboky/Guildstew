// D&D 5e Background Skills and Proficiencies

export const backgroundSkills = {
  "Acolyte": {
    skills: ["Insight", "Religion"],
    tools: [],
    languages: 2
  },
  "Charlatan": {
    skills: ["Deception", "Sleight of Hand"],
    tools: ["Disguise kit", "Forgery kit"],
    languages: 0
  },
  "Criminal": {
    skills: ["Deception", "Stealth"],
    tools: ["One type of gaming set", "Thieves' tools"],
    languages: 0
  },
  "Entertainer": {
    skills: ["Acrobatics", "Performance"],
    tools: ["Disguise kit", "One type of musical instrument"],
    languages: 0
  },
  "Folk Hero": {
    skills: ["Animal Handling", "Survival"],
    tools: ["One type of artisan's tools", "Vehicles (land)"],
    languages: 0
  },
  "Guild Artisan": {
    skills: ["Insight", "Persuasion"],
    tools: ["One type of artisan's tools"],
    languages: 1
  },
  "Hermit": {
    skills: ["Medicine", "Religion"],
    tools: ["Herbalism kit"],
    languages: 1
  },
  "Noble": {
    skills: ["History", "Persuasion"],
    tools: ["One type of gaming set"],
    languages: 1
  },
  "Outlander": {
    skills: ["Athletics", "Survival"],
    tools: ["One type of musical instrument"],
    languages: 1
  },
  "Sage": {
    skills: ["Arcana", "History"],
    tools: [],
    languages: 2
  },
  "Sailor": {
    skills: ["Athletics", "Perception"],
    tools: ["Navigator's tools", "Vehicles (water)"],
    languages: 0
  },
  "Soldier": {
    skills: ["Athletics", "Intimidation"],
    tools: ["One type of gaming set", "Vehicles (land)"],
    languages: 0
  },
  "Urchin": {
    skills: ["Sleight of Hand", "Stealth"],
    tools: ["Disguise kit", "Thieves' tools"],
    languages: 0
  }
};

const raceLanguages = {
  "Dragonborn": ["Common", "Draconic"],
  "Elf": ["Common", "Elvish"],
  "Dwarf": ["Common", "Dwarvish"],
  "Human": ["Common"],
  "Halfling": ["Common", "Halfling"],
  "Tiefling": ["Common", "Infernal"],
  "Half-Elf": ["Common", "Elvish"],
  "Half-Orc": ["Common", "Orc"],
  "Gnome": ["Common", "Gnomish"]
};

export function getBackgroundSkills(background) {
  return backgroundSkills[background]?.skills || [];
}

export function getBackgroundTools(background) {
  return backgroundSkills[background]?.tools || [];
}

export function getBackgroundLanguages(background) {
  return backgroundSkills[background]?.languages || 0;
}

export function getLanguagesForCharacter(race, background) {
  const raceLangs = raceLanguages[race] || ["Common"];
  const bgLangCount = getBackgroundLanguages(background);
  
  const languages = [...raceLangs];
  
  // Add placeholder for additional languages from background
  for (let i = 0; i < bgLangCount; i++) {
    if (i === 0) languages.push("Dwarvish");
    else if (i === 1) languages.push("Elvish");
  }
  
  return languages;
}