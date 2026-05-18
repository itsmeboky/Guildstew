/**
 * Pathfinder 2e — equipment adapter (stub).
 *
 * Placeholder so the game-pack registry can resolve `pathfinder_2e`
 * without falling back to D&D 5e. Returns empty lists from every
 * accessor. Replaced when a real Pathfinder data module lands.
 *
 * Shape matches the dnd5e_2014 and dnd5e_2024 equipment adapters:
 *   getEquipment()                 → array of item rows
 *   getEquipmentByCategory(cat)    → filter by category
 *   getEquipmentByName(name)       → single lookup
 *   getEquipmentById(id)           → single lookup
 *
 * The character creator's Pathfinder branch (CharacterCreator.jsx)
 * short-circuits to a "Coming soon" tome before any step actually
 * tries to render equipment, so empty returns here never reach UI
 * that would render an empty grid.
 */

export function getEquipment() {
  return [];
}

export function getEquipmentByCategory(_category) {
  return [];
}

export function getEquipmentByName(_name) {
  return null;
}

export function getEquipmentById(_id) {
  return null;
}
