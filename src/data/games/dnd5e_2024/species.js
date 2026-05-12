/**
 * D&D 5e (2024) — species adapter.
 *
 * SOURCE OF TRUTH:
 *   - docs/5e_reference/2024/5e-SRD-Species.json     (9 species)
 *   - docs/5e_reference/2024/5e-SRD-Subspecies.json  (24 subspecies)
 *
 * 2024 PHB renames "race" → "species" and DROPS the species-grants-
 * ASI mechanic. Background grants ASI in 2024. The data layer here
 * therefore exposes species metadata (size, speed, traits, subspecies
 * options) but never an `ability_score_bonuses` field — by spec.
 *
 * Subspecies (Dragonborn ancestries, Elf / Gnome / Goliath lineages,
 * Tiefling legacies) carry their own additional `traits` array;
 * `getSubspecies(idx)` returns the full record so consumers can
 * surface lineage spells / abilities.
 */

import SPECIES from "../../../../docs/5e_reference/2024/5e-SRD-Species.json" with { type: "json" };
import SUBSPECIES from "../../../../docs/5e_reference/2024/5e-SRD-Subspecies.json" with { type: "json" };

const BY_SPECIES_ID = new Map(SPECIES.map((s) => [s.index, s]));
const BY_SUBSPECIES_ID = new Map(SUBSPECIES.map((s) => [s.index, s]));

/** Returns all 2024 SRD species. */
export function getSpeciesList() {
  return SPECIES;
}

/** Single-species lookup by SRD index (e.g. "dragonborn"). */
export function getSpeciesById(id) {
  if (!id) return null;
  return BY_SPECIES_ID.get(id) || null;
}

/** Subspecies for a given species id. Empty array for species
 *  that don't have subspecies (e.g. Human in 2024 SRD). */
export function getSubspeciesForSpecies(speciesId) {
  if (!speciesId) return [];
  return SUBSPECIES.filter((s) => s.species?.index === speciesId);
}

/** Single-subspecies lookup by SRD index
 *  (e.g. "elven-lineage-drow"). */
export function getSubspecies(id) {
  if (!id) return null;
  return BY_SUBSPECIES_ID.get(id) || null;
}
