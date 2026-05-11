/**
 * D&D 5e (2024) — rules helpers scaffold.
 *
 * SCAFFOLD ONLY. Most helpers throw "not yet implemented" until the
 * 2024 mechanical data lands in subsequent vetting commits:
 *
 *   - Commit 6 (martial classes): Weapon Mastery slot counts, half-
 *     caster slot helper (2024 casts from L1, rounds UP for multiclass),
 *     Fighter/Rogue ASI extras tracking.
 *   - Commit 7 (spellcasting classes): SPELLS_KNOWN_TABLE with the
 *     2024 fixed prepared tables (no INT/WIS/CHA + level formulas),
 *     CANTRIPS_KNOWN, Divine Order / Primal Order options, Innate
 *     Sorcery / Magical Cunning / Memorize Spell mechanics.
 *
 * Architectural rule (from the multiclass vetting spec): the 2024
 * pack must NOT inherit from 2014 via fallbacks. Each helper here is
 * a stub that throws on call so accidental cross-edition wiring
 * surfaces immediately rather than silently using 2014 values.
 *
 * Same-shape items (CLASS_HIT_DICE, CLASS_SAVING_THROWS,
 * MULTICLASS_REQUIREMENTS, CLASS_PRIMARY_ABILITY) happen to match
 * 2014 numerically but the spec is explicit: re-declare with 2024
 * values when commits 6/7 land, don't re-export from 2014. Stubs
 * stay until then.
 */

const notImplemented = (name) => (..._args) => {
  throw new Error(
    `dnd5e_2024: ${name}() not yet implemented (pending Vetting Commit 6/7). ` +
    `If you're seeing this, a step component is calling 2024 rules helpers ` +
    `before they ship. Either dispatch the step to the 2014 component for ` +
    `now, or implement the helper.`,
  );
};

const notImplementedConst = (name) => new Proxy({}, {
  get(_target, prop) {
    if (prop === 'then' || typeof prop === 'symbol') return undefined;
    throw new Error(
      `dnd5e_2024: ${name}.${String(prop)} not yet implemented ` +
      `(pending Vetting Commit 6/7).`,
    );
  },
});

// ── Class basics ─────────────────────────────────────────────
// Hit dice + saves + primary ability happen to match 2014 numerically
// but live here to assert 2024 ownership. Re-declared, not re-exported.
export const CLASS_HIT_DICE = notImplementedConst('CLASS_HIT_DICE');
export const CLASS_SAVING_THROWS = notImplementedConst('CLASS_SAVING_THROWS');
export const CLASS_PRIMARY_ABILITY = notImplementedConst('CLASS_PRIMARY_ABILITY');

// ── Spellcasting ─────────────────────────────────────────────
// 2024 uses FIXED prepared tables per class (no INT/WIS/CHA + level
// formula). 2024 half-casters cast from L1, multiclass half-caster
// levels round UP (vs 2014 down). All NEW shape — not 2014 imports.
export const SPELLS_KNOWN_TABLE = notImplementedConst('SPELLS_KNOWN_TABLE');
export const CANTRIPS_KNOWN = notImplementedConst('CANTRIPS_KNOWN');
export const FULL_CASTER_SLOTS = notImplementedConst('FULL_CASTER_SLOTS');
export const WARLOCK_PACT_SLOTS = notImplementedConst('WARLOCK_PACT_SLOTS');
export const halfCasterSlots = notImplemented('halfCasterSlots');
export const getSpellSlots = notImplemented('getSpellSlots');
export const spellsPrepared = notImplemented('spellsPrepared');
export const spellsKnown = notImplemented('spellsKnown');
export const cantripsKnown = notImplemented('cantripsKnown');

// ── ASI / Multiclass ─────────────────────────────────────────
export const ABILITY_SCORE_IMPROVEMENT_LEVELS = notImplementedConst('ABILITY_SCORE_IMPROVEMENT_LEVELS');
export const MULTICLASS_REQUIREMENTS = notImplementedConst('MULTICLASS_REQUIREMENTS');
export const MULTICLASS_PROFICIENCIES = notImplementedConst('MULTICLASS_PROFICIENCIES');
export const meetsMulticlassPrereqs = notImplemented('meetsMulticlassPrereqs');
export const multiclassPrereqDescription = notImplemented('multiclassPrereqDescription');

// ── 2024-specific mechanics ──────────────────────────────────
// Weapon Mastery slot count per class per level. Six martial classes
// (Barbarian / Fighter / Monk / Paladin / Ranger / Rogue) per PHB 2024.
export const WEAPON_MASTERY_SLOTS_BY_CLASS = notImplementedConst('WEAPON_MASTERY_SLOTS_BY_CLASS');

// Cleric Divine Order / Druid Primal Order picks at level 1.
export const DIVINE_ORDER_OPTIONS = notImplementedConst('DIVINE_ORDER_OPTIONS');
export const PRIMAL_ORDER_OPTIONS = notImplementedConst('PRIMAL_ORDER_OPTIONS');

// Universal 2024 ASI levels (most classes). Fighter / Rogue extras
// land in WEAPON_MASTERY_SLOTS_BY_CLASS's sibling structures.
export const UNIVERSAL_ASI_LEVELS_2024 = Object.freeze([4, 8, 12, 16, 19]);
