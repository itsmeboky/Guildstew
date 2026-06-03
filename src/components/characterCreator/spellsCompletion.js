/**
 * Single source of truth for "is the Spells step complete?" in
 * the 2014 D&D 5e creator. Returns the cantrip + non-cantrip
 * targets and a derived `isComplete` flag. Used by both
 * SpellsStep.jsx (cap UI) and CharacterCreator.jsx (the Next-button
 * validator) so they can never drift apart.
 *
 * The 2014 model:
 *   - cantripCap = sum of cantripsKnown(class, level) across every
 *     spellcasting entry the character has.
 *   - prepKnownCap depends on the entry type:
 *       * known      → spellsKnown(class, level)
 *       * prepared   → preparedFormula(abilityMod, level)
 *       * spellbook  → at character creation, the player stocks
 *                      the SPELLBOOK with `startingSpells +
 *                      (level - 1) * spellsPerLevel` spells. The
 *                      "prepared" subset (INT mod + level) is a
 *                      daily decision made in-game, not at
 *                      creation, so the creator caps by the
 *                      spellbook size — matching PHB p. 114
 *                      ("a spellbook containing 6 first-level
 *                      spells of your choice").
 *   - Brewery classes (mod-authored slot tables) skip the SRD
 *     cap and fall back to per-level slot counts (legacy behavior).
 */

import {
  SPELLS_KNOWN_TABLE,
  SPELLCASTING_ABILITY,
  spellsKnown,
  spellsPrepared,
  cantripsKnown,
  abilityModifier,
} from "@/components/dnd5e/dnd5eRules";
import { getSpellSlots, getPactSlots } from "@/components/dnd5e/spellData";
import { getBreweryClassSpellSlots } from "@/lib/breweryClassApply";

function spellcastingEntries(characterData) {
  const multis = Array.isArray(characterData.multiclasses)
    ? characterData.multiclasses.filter((mc) => mc?.class && mc?.level)
    : [];
  const primaryLevel = Math.max(
    1,
    (Number(characterData.level) || 1)
      - multis.reduce((s, m) => s + (Number(m.level) || 0), 0),
  );
  return [
    { class: characterData.class, level: primaryLevel },
    ...multis.map((m) => ({ class: m.class, level: Number(m.level) || 0 })),
  ].filter((e) => e.class && e.level > 0 && SPELLS_KNOWN_TABLE[e.class]);
}

export function getSpellsCompletion(characterData = {}) {
  const breweryClass = characterData._brewery_class || null;

  // Brewery classes use their author-defined slot table for picker
  // cap + validator. SRD logic doesn't apply.
  if (breweryClass?.spellcasting?.enabled) {
    const slots = getBreweryClassSpellSlots(breweryClass, characterData.level);
    const totalSlots = { ...slots };
    if (Object.values(totalSlots).every((s) => s === 0)) {
      return { isComplete: true, cantripCap: 0, nonCantripCap: 0 };
    }
    const okPerLevel = Object.entries(totalSlots).every(([key, count]) => {
      if (count === 0) return true;
      const sel = (characterData.spells?.[key] || []).length;
      return sel === count;
    });
    return {
      isComplete: okPerLevel,
      cantripCap: totalSlots.cantrips || 0,
      nonCantripCap: Object.entries(totalSlots)
        .filter(([k]) => k !== "cantrips")
        .reduce((s, [, v]) => s + v, 0),
      brewery: true,
    };
  }

  const entries = spellcastingEntries(characterData);
  const attributes = characterData.attributes || {};

  // Cantrip cap = sum of cantripsKnown across all caster entries.
  const cantripCap = entries.reduce(
    (sum, { class: cls, level }) => sum + (cantripsKnown(cls, level) || 0),
    0,
  );

  // Non-cantrip cap = sum of per-class caps. Wizard uses spellbook
  // size, prepared casters use formula, known casters use table.
  const nonCantripCap = entries.reduce((sum, { class: cls, level }) => {
    const data = SPELLS_KNOWN_TABLE[cls];
    if (!data) return sum;
    if (data.type === "known") {
      return sum + (spellsKnown(cls, level) || 0);
    }
    if (data.type === "prepared") {
      const ability = SPELLCASTING_ABILITY[cls];
      const score = Number(attributes?.[ability] ?? 10);
      const mod = abilityModifier(score);
      return sum + (spellsPrepared(cls, level, mod) || 0);
    }
    if (data.type === "spellbook") {
      // Wizard at character creation: stock the spellbook.
      // PHB p. 114: 6 spells at L1, +2 per wizard level.
      const startingSpells = data.startingSpells || 6;
      const perLevel = data.spellsPerLevel || 2;
      return sum + startingSpells + Math.max(0, (level - 1)) * perLevel;
    }
    return sum;
  }, 0);

  // Non-casters: cap is 0 across the board → step is complete.
  if (cantripCap === 0 && nonCantripCap === 0) {
    return { isComplete: true, cantripCap: 0, nonCantripCap: 0 };
  }

  // Count selected. Cantrips bucketed under `spells.cantrips`,
  // everything else under `spells.level1`...`spells.level9`.
  const sel = characterData.spells || {};
  const selCantrips = Array.isArray(sel.cantrips) ? sel.cantrips.length : 0;
  const selNonCantrips = Object.entries(sel).reduce(
    (s, [k, v]) => (k === "cantrips" ? s : s + (Array.isArray(v) ? v.length : 0)),
    0,
  );

  // Use `>=` rather than strict `===`: the picker caps additions at the
  // cap, so for a UI-built character this is identical to equality
  // (you must FILL your slots — under-cap still blocks). But it also
  // means an OVER-cap stored state (e.g. spells left over after the
  // level was lowered) can never lock the step with no way out. The
  // level-decrease handler trims the leftovers so the saved character
  // stays legal (see levelTrim).
  const isComplete =
    selCantrips >= cantripCap && selNonCantrips >= nonCantripCap;

  return {
    isComplete,
    cantripCap,
    nonCantripCap,
    selectedCantrips: selCantrips,
    selectedNonCantrips: selNonCantrips,
  };
}
