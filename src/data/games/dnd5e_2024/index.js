// D&D 5e (2024 PHB) game pack adapter — SCAFFOLDING.
//
// Layer 4 commit 1 lands the architecture; commits 2-4 fill in
// the actual data. Today every accessor returns an empty value
// and `meta.ready` is false, so any component that tries to
// build a 2024 character will see "no races / classes / etc."
// and can render a "Coming soon" notice instead of crashing.
//
// Source of truth for filling these in:
//   docs/5e_reference/2024/5e-SRD-Species.json    → getRaces (renamed Species)
//   docs/5e_reference/2024/5e-SRD-Subspecies.json → subrace data
//   docs/5e_reference/2024/5e-SRD-Backgrounds.json → getBackgrounds
//                                                    (with Origin Feats)
//   docs/5e_reference/2024/5e-SRD-Classes.json    → getClasses
//   docs/5e_reference/2024/5e-SRD-Features.json   → getFeatures
//   docs/5e_reference/2024/5e-SRD-Feats.json      → getFeats
//                                                    (Origin / General /
//                                                     Fighting Style / Epic
//                                                     Boon categories)
//   docs/5e_reference/2024/5e-SRD-Spells.json     → spell list
//   docs/5e_reference/2024/5e-SRD-Weapon-Mastery-
//     Properties.json                              → mastery data
//
// Schema differences vs 2014 documented in
// docs/character_creator_srd_validation.md (2024 Edition section).
// Most importantly: ASIs come from background not species; subclass
// pick is L3 for ALL classes; Half-Elf and Half-Orc are folded
// into heritage.

export const meta = {
  id: "dnd5e_2024",
  label: "D&D 5e (2024)",
  edition: "2024",
  ready: false, // flipped to true once commits 2-4 land their data
};

export function getRaces() {
  return [];
}

export function getClasses() {
  return [];
}

export function getBackgrounds() {
  return [];
}

export function getFeats() {
  return [];
}

export function getHitDie() {
  return null;
}

export function getSkillChoices() {
  return null;
}

export function getMulticlassRequirements() {
  return [];
}

export function getMulticlassProficiencies() {
  return {};
}

export function getAsiLevels() {
  return [];
}

export function getSpellcastingAbility() {
  return null;
}

export function getCasterType() {
  return "none";
}

export function getFeatures() {
  return [];
}

export function getRaceAbilityBonuses() {
  return {};
}

export function getRaceSkills() {
  return { fixed: [], choose: 0, from: [] };
}

export function getBackgroundSkillsList() {
  return [];
}
