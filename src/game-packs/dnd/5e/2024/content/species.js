/**
 * D&D 5e (2024) — species adapter.
 *
 * SOURCE OF TRUTH:
 *   - docs/5e_reference/2024/5e-SRD-Species.json     (9 species)
 *   - docs/5e_reference/2024/5e-SRD-Subspecies.json  (24 subspecies)
 *   - docs/5e_reference/2024/5e-SRD-Traits.json      (trait descriptions)
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
 *
 * Trait descriptions live in a separate Traits JSON file (the
 * Species file only carries trait names). The adapter resolves
 * those at load time and attaches a `description` string to each
 * trait so the UI can render hover/select tooltips without a
 * second adapter hop.
 */

import SPECIES from "../../../../../../docs/5e_reference/2024/5e-SRD-Species.json" with { type: "json" };
import SUBSPECIES from "../../../../../../docs/5e_reference/2024/5e-SRD-Subspecies.json" with { type: "json" };
import TRAITS from "../../../../../../docs/5e_reference/2024/5e-SRD-Traits.json" with { type: "json" };

const TRAIT_BY_INDEX = new Map(TRAITS.map((t) => [t.index, t]));

function enrichTraits(rawTraits) {
  if (!Array.isArray(rawTraits)) return [];
  return rawTraits.map((t) => {
    const full = TRAIT_BY_INDEX.get(t.index);
    return {
      ...t,
      description: full?.description || "",
    };
  });
}

const ENRICHED_SPECIES = SPECIES.map((s) => ({
  ...s,
  traits: enrichTraits(s.traits),
}));
const ENRICHED_SUBSPECIES = SUBSPECIES.map((s) => ({
  ...s,
  traits: enrichTraits(s.traits),
}));

const BY_SPECIES_ID = new Map(ENRICHED_SPECIES.map((s) => [s.index, s]));
const BY_SUBSPECIES_ID = new Map(ENRICHED_SUBSPECIES.map((s) => [s.index, s]));

/** Returns all 2024 SRD species, with trait descriptions resolved. */
export function getSpeciesList() {
  return ENRICHED_SPECIES;
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
  return ENRICHED_SUBSPECIES.filter((s) => s.species?.index === speciesId);
}

/** Single-subspecies lookup by SRD index
 *  (e.g. "elven-lineage-drow"). */
export function getSubspecies(id) {
  if (!id) return null;
  return BY_SUBSPECIES_ID.get(id) || null;
}
