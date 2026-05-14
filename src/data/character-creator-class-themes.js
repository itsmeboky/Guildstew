// Per-class palette + aura colors used to animate the .cc-root surface
// when a class is picked. Values are lifted verbatim from the prototype's
// design-reference/character-creator/data.jsx so the page-wide palette
// transition matches the prototype's screenshots.
//
// Keyed by lowercase class name (matching how the existing creator
// stores `characterData.class` — string class name, not an ID).

export const CLASS_THEMES = {
  barbarian: { bg1: "#1F1208", bg2: "#0F0805", accent: "#D89860", accentDeep: "#7A4D2A", color: "#A67651", auraDeep: "#5C3E26" },
  bard:      { bg1: "#1F0816", bg2: "#0E0410", accent: "#FF4DA6", accentDeep: "#8C1C5A", color: "#FF2E93", auraDeep: "#7A0E48" },
  cleric:    { bg1: "#1A1815", bg2: "#0E0D0A", accent: "#FFF1D2", accentDeep: "#A89070", color: "#F5EAD2", auraDeep: "#6A5A38" },
  druid:     { bg1: "#091A10", bg2: "#04100A", accent: "#52D880", accentDeep: "#1F6638", color: "#3FB76A", auraDeep: "#1F5C36" },
  fighter:   { bg1: "#1F0C0A", bg2: "#0E0606", accent: "#FF5040", accentDeep: "#8A1F14", color: "#E84A3A", auraDeep: "#6A1F18" },
  monk:      { bg1: "#061820", bg2: "#03101A", accent: "#3FE0E8", accentDeep: "#0E6A6E", color: "#22D3D8", auraDeep: "#0E5C5F" },
  paladin:   { bg1: "#1F1808", bg2: "#100C03", accent: "#FFD550", accentDeep: "#9A7818", color: "#F2C94C", auraDeep: "#6B5113" },
  ranger:    { bg1: "#1A0A06", bg2: "#0E0606", accent: "#D45A50", accentDeep: "#7A1E1A", color: "#9E2F2A", auraDeep: "#4F1614" },
  rogue:     { bg1: "#0E0E16", bg2: "#06060A", accent: "#D8D5E0", accentDeep: "#605A6E", color: "#7A7585", auraDeep: "#1F1B26" },
  sorcerer:  { bg1: "#1F0A04", bg2: "#10050A", accent: "#FF9050", accentDeep: "#AA4520", color: "#FF7A33", auraDeep: "#7A2E0F" },
  warlock:   { bg1: "#100620", bg2: "#08031A", accent: "#B580FF", accentDeep: "#5A2BA8", color: "#A66BFF", auraDeep: "#3D1F66" },
  wizard:    { bg1: "#070C20", bg2: "#03061A", accent: "#5AA0FF", accentDeep: "#1F4F9A", color: "#4A8FE8", auraDeep: "#143D70" },
};

export function themeForClass(className) {
  if (!className) return null;
  return CLASS_THEMES[String(className).toLowerCase()] || null;
}
