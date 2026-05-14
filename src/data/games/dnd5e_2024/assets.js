/**
 * D&D 5e (2024) — asset registry.
 *
 * Icon and portrait URLs for 2024 classes and species. The 2024
 * pack reuses 2014 art for anything that maps 1:1 between editions
 * (all 12 classes; species that already shipped as 2014 races —
 * Dragonborn, Dwarf, Elf, Gnome, Halfling, Human, Tiefling). 2024-
 * only species (Goliath, Orc) have no 2014 counterpart and render
 * without an icon today; when art lands at
 * campaign-assets/dnd5e/2024/species/<name>.png it can be wired in
 * here without touching the step components.
 *
 * Resolution path for missing icons:
 *   1. Drop a PNG into the Supabase bucket
 *      `campaign-assets/dnd5e/2024/species/<lowercased-name>.png`
 *   2. Add the URL to SPECIES_ICONS_2024 below (or rebuild it from
 *      a manifest when one exists).
 *   3. The step components pick the new URL up automatically via
 *      `getClassIcon` / `getSpeciesIcon`.
 */

const SUPABASE_BASE =
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public";

// Class icons — shared between 2014 and 2024. Both editions ship
// the same 12 classes with the same names; the art was authored
// once in campaign-assets/dnd5e/classes/.
const CLASS_ICONS = {
  Barbarian: `${SUPABASE_BASE}/campaign-assets/dnd5e/classes/a6652f2d8_Barbarian1.png`,
  Bard:      `${SUPABASE_BASE}/campaign-assets/dnd5e/classes/cbe7f7dba_Bard1.png`,
  Cleric:    `${SUPABASE_BASE}/campaign-assets/dnd5e/classes/15fe6ef24_Cleric1.png`,
  Druid:     `${SUPABASE_BASE}/campaign-assets/dnd5e/classes/ef43c9ff2_Druid1.png`,
  Fighter:   `${SUPABASE_BASE}/campaign-assets/dnd5e/classes/5e1b2cd68_Fighter1.png`,
  Monk:      `${SUPABASE_BASE}/campaign-assets/dnd5e/classes/f2e85e13a_Monk1.png`,
  Paladin:   `${SUPABASE_BASE}/campaign-assets/dnd5e/classes/1eb7cd2f2_Paladin1.png`,
  Ranger:    `${SUPABASE_BASE}/campaign-assets/dnd5e/classes/748e5be38_Ranger1.png`,
  Rogue:     `${SUPABASE_BASE}/campaign-assets/dnd5e/classes/a66f2aac1_Rogue1.png`,
  Sorcerer:  `${SUPABASE_BASE}/campaign-assets/dnd5e/classes/6f5b501db_Sorceror1.png`,
  Warlock:   `${SUPABASE_BASE}/campaign-assets/dnd5e/classes/184c98268_Warlock1.png`,
  Wizard:    `${SUPABASE_BASE}/campaign-assets/dnd5e/classes/94cfaa28a_Wizard1.png`,
};

// Species icons — 7 of 9 reuse the 2014 race icons. Goliath and
// Orc are 2024-only and don't have art shipped yet.
const SPECIES_ICONS = {
  Dragonborn: `${SUPABASE_BASE}/campaign-assets/dnd5e/races/d987fae82_dragonbornraceicon.png`,
  Dwarf:      `${SUPABASE_BASE}/campaign-assets/dnd5e/races/7b31ed2b9_dwarfraceicon.png`,
  Elf:        `${SUPABASE_BASE}/campaign-assets/dnd5e/races/f696b9d6e_elfraceicon.png`,
  Gnome:      `${SUPABASE_BASE}/campaign-assets/dnd5e/races/c56fbbc80_gnomeraceicon.png`,
  Halfling:   `${SUPABASE_BASE}/campaign-assets/dnd5e/races/1f05e3073_halflingraceicon.png`,
  Human:      `${SUPABASE_BASE}/campaign-assets/dnd5e/races/72c27f140_humanraceicon.png`,
  Tiefling:   `${SUPABASE_BASE}/campaign-assets/dnd5e/races/bf4ea2436_TieflingRaceIcon.png`,
  // Goliath: 2024-only — drop into campaign-assets/dnd5e/2024/species/ and wire here.
  // Orc:     2024-only — drop into campaign-assets/dnd5e/2024/species/ and wire here.
};

/**
 * Returns the icon URL for a 2024 class by name, or null if none
 * is known. Class names match the SRD JSON's capitalized names
 * (e.g. "Wizard", "Sorcerer" — note: Sorcerer, not "Sorceror").
 */
export function getClassIcon(className) {
  if (!className) return null;
  return CLASS_ICONS[className] || null;
}

/**
 * Returns the icon URL for a 2024 species by name, or null if
 * none is known. Names match the SRD JSON capitalization
 * ("Dragonborn", "Elf", etc.). 2024-only species without art
 * (Goliath, Orc) return null; callers should render the card
 * without an icon rather than substituting a placeholder image.
 */
export function getSpeciesIcon(speciesName) {
  if (!speciesName) return null;
  return SPECIES_ICONS[speciesName] || null;
}
