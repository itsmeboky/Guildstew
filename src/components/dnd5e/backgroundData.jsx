// D&D 5e Background Skills and Proficiencies

// SRD 5.1 ships exactly one background — Acolyte. The other PHB
// backgrounds were trimmed for the public-release SRD lockdown.
export const backgroundSkills = {
  "Acolyte": {
    skills: ["Insight", "Religion"],
    tools: [],
    languages: 2
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