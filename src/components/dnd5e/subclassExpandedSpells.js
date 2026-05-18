/**
 * Subclass-granted "expanded spell list" additions for the 2014
 * spell picker. Per the PHB 2014 Otherworldly Patron features:
 *
 *   "If a spell on the Expanded Spells list isn't on the warlock
 *    spell list, it is nonetheless a warlock spell for you."
 *
 * The same shape applies to Cleric Domain Spells, Sorcerer
 * Draconic-Bloodline spells, etc. — keyed by primary class +
 * subclass + the minimum class level the subclass unlocks each
 * spell. The spell still costs a known/prepared slot from the
 * normal quota; this only affects which spells appear in the
 * picker.
 *
 * Currently populated only for The Fiend (the only Warlock subclass
 * in the 2014 SRD JSON — docs/5e_reference/2014/5e-SRD-Subclasses.json
 * "fiend" entry). Other patrons (Archfey, Great Old One) are full
 * PHB content and are not in the SRD; if/when their data is sourced
 * from an OGL-compliant pack, append here.
 *
 * Lives in a plain .js file (not the parent spellData.jsx) so the
 * Node test runner can import it without a JSX loader.
 */

export const SUBCLASS_EXPANDED_SPELLS = {
  Warlock: {
    "The Fiend": {
      // minClassLevel : { cantrips: [], level1: [], ... level9: [] }
      1: { level1: ["Burning Hands", "Command"] },
      3: { level2: ["Blindness/Deafness", "Scorching Ray"] },
      5: { level3: ["Fireball", "Stinking Cloud"] },
      7: { level4: ["Fire Shield", "Wall of Fire"] },
      9: { level5: ["Flame Strike", "Hallow"] },
    },
  },
};

/**
 * Walks SUBCLASS_EXPANDED_SPELLS for a given class + subclass at the
 * given class level, returning a flat map { cantrips: [], level1: [],
 * ... } of every spell unlocked at or before that level. Returns null
 * for unsupported class/subclass combos (most of them) so callers can
 * short-circuit cheaply.
 */
export function getExpandedSpellsForSubclass(className, subclass, classLevel) {
  if (!className || !subclass) return null;
  const byClass = SUBCLASS_EXPANDED_SPELLS[className];
  if (!byClass) return null;
  const bySub = byClass[subclass];
  if (!bySub) return null;
  const level = Number(classLevel) || 1;
  const out = {};
  Object.entries(bySub).forEach(([minLevel, spellsByKey]) => {
    if (level < Number(minLevel)) return;
    Object.entries(spellsByKey).forEach(([key, list]) => {
      if (!Array.isArray(list)) return;
      out[key] = [...(out[key] || []), ...list];
    });
  });
  return Object.keys(out).length > 0 ? out : null;
}
