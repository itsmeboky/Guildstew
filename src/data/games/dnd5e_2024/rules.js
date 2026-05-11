/**
 * D&D 5e (2024) — rules helpers.
 *
 * Edition-specific mechanical data for the 2024 PHB. Lives entirely
 * separate from the 2014 registries (src/components/dnd5e/dnd5eRules.js
 * and src/game-packs/dnd5e/data/rules.js); per the multiclass vetting
 * spec, this pack must not fall back to 2014.
 *
 * Status by class:
 *   - Barbarian, Fighter, Monk, Paladin, Ranger, Rogue: shipped (this
 *     file, Commit 6 of the vetting plan).
 *   - Bard, Cleric, Druid, Sorcerer, Warlock, Wizard: pending Commit 7.
 *     Their data shapes (SPELLS_KNOWN_TABLE entries, CANTRIPS_KNOWN
 *     rows, DIVINE_ORDER_OPTIONS, PRIMAL_ORDER_OPTIONS,
 *     WARLOCK_PACT_SLOTS, full-caster getSpellSlots helper) remain
 *     stubs that throw with a clear message.
 *
 * Source-of-truth precedence:
 *   - Class basics (hit dice, primary ability, saves, proficiencies,
 *     multiclass prereqs, starting-equipment options) read from
 *     `docs/5e_reference/2024/5e-SRD-Classes.json` via the
 *     `dnd5e_2024/classes.js` adapter.
 *   - Mechanical scaling tables (Weapon Mastery slot counts, Rage
 *     uses, Sneak Attack progression, Martial Arts die, Focus Points,
 *     Lay on Hands pool, half-caster slot table, prepared spell
 *     counts, ASI level lists) are hand-coded here because rules
 *     aren't IP-protected even when described in the PHB.
 */

// ─────────────────────────────────────────────
// HELPERS — stub generator for not-yet-implemented surfaces.
// Calls throw with a clear "pending Commit X" message so accidental
// cross-edition wiring or premature consumption surfaces immediately.
// ─────────────────────────────────────────────

const notImplemented = (name, commit = "Commit 7") => () => {
  throw new Error(
    `dnd5e_2024: ${name}() not yet implemented (pending Vetting ${commit}).`,
  );
};

const notImplementedConst = (name, commit = "Commit 7") => new Proxy({}, {
  get(_target, prop) {
    if (prop === "then" || typeof prop === "symbol") return undefined;
    throw new Error(
      `dnd5e_2024: ${name}.${String(prop)} not yet implemented ` +
      `(pending Vetting ${commit}).`,
    );
  },
});

// ─────────────────────────────────────────────
// UNIVERSAL 2024 CONSTANTS
// ─────────────────────────────────────────────

// 2024 unified subclass-decision level. Every class chooses its
// subclass at character level 3 (PHB 2024 uniform rule — was 1 for
// Cleric/Sorcerer/Warlock and 2 for Druid/Wizard in 2014).
export const SUBCLASS_DECISION_LEVEL_2024 = 3;

// 2024 universal ASI / Feat levels. Most classes use exactly this
// list; Fighter (extra at 6 + 14) and Rogue (extra at 10) override
// via ABILITY_SCORE_IMPROVEMENT_LEVELS below.
export const UNIVERSAL_ASI_LEVELS_2024 = Object.freeze([4, 8, 12, 16, 19]);

// ─────────────────────────────────────────────
// CLASS BASICS — 6 martial classes only (Commit 6).
// Caster-only classes throw via notImplementedConst until Commit 7.
// ─────────────────────────────────────────────

const MARTIAL_HIT_DICE = {
  Barbarian: 12,
  Fighter:   10,
  Monk:      8,
  Paladin:   10,
  Ranger:    10,
  Rogue:     8,
};

const MARTIAL_SAVING_THROWS = {
  Barbarian: ["str", "con"],
  Fighter:   ["str", "con"],
  Monk:      ["str", "dex"],
  Paladin:   ["wis", "cha"],
  Ranger:    ["str", "dex"],
  Rogue:     ["dex", "int"],
};

// 2024 primary-ability shape matches the discriminated form from the
// 2014 Commit 2 fix: { abilities: [...], mode: 'single' | 'or' | 'and' }.
// Same numeric values for the 6 martial classes; Fighter is OR-mode
// (player picks one — both 2014 and 2024 SRD encode this via
// `prerequisite_options` rather than `prerequisites`); Monk/Paladin/
// Ranger are AND-mode (both abilities are primary).
const MARTIAL_PRIMARY_ABILITY = {
  Barbarian: { abilities: ["str"],         mode: "single" }, // PHB 2024 pg. 47
  Fighter:   { abilities: ["str", "dex"],  mode: "or"     }, // PHB 2024 pg. 91
  Monk:      { abilities: ["dex", "wis"],  mode: "and"    }, // PHB 2024 pg. 102
  Paladin:   { abilities: ["str", "cha"],  mode: "and"    }, // PHB 2024 pg. 110
  Ranger:    { abilities: ["dex", "wis"],  mode: "and"    }, // PHB 2024 pg. 116
  Rogue:     { abilities: ["dex"],         mode: "single" }, // PHB 2024 pg. 121
};

// Public exports merge martial entries onto a Proxy that throws for
// unrecognised classes (i.e., the casters until Commit 7).
function withMartialFallback(martialMap, name) {
  return new Proxy(martialMap, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === "then" || typeof prop === "symbol") return undefined;
      throw new Error(
        `dnd5e_2024: ${name}.${String(prop)} not yet implemented ` +
        `(pending Vetting Commit 7 — caster class).`,
      );
    },
  });
}

export const CLASS_HIT_DICE = withMartialFallback(MARTIAL_HIT_DICE, "CLASS_HIT_DICE");
export const CLASS_SAVING_THROWS = withMartialFallback(MARTIAL_SAVING_THROWS, "CLASS_SAVING_THROWS");
export const CLASS_PRIMARY_ABILITY = withMartialFallback(MARTIAL_PRIMARY_ABILITY, "CLASS_PRIMARY_ABILITY");

/**
 * Discriminated-shape display helper for the primary ability of a
 * class. Same return shape as the 2014 helper: returns "", "Strength",
 * "Strength or Dexterity", or "Dexterity & Wisdom" depending on mode.
 */
const ABILITY_NAMES_2024 = {
  str: "Strength", dex: "Dexterity", con: "Constitution",
  int: "Intelligence", wis: "Wisdom", cha: "Charisma",
};

export function primaryAbilityDisplay(className) {
  const entry = MARTIAL_PRIMARY_ABILITY[className];
  if (!entry || !Array.isArray(entry.abilities) || entry.abilities.length === 0) {
    return "";
  }
  const names = entry.abilities.map((a) => ABILITY_NAMES_2024[a] || a);
  if (entry.mode === "or")  return names.join(" or ");
  if (entry.mode === "and") return names.join(" & ");
  return names[0];
}

// ─────────────────────────────────────────────
// ASI / FEAT LEVELS PER CLASS
// ─────────────────────────────────────────────
//
// Most classes get ASIs at 4 / 8 / 12 / 16 / 19. Fighter gets bonus
// ASIs at 6 and 14 (continues from 2014); Rogue gets a bonus ASI at
// 10 (continues from 2014). Level 19 is the Epic Boon slot in 2024 —
// the player can still take a standard ASI or feat there.

export const ABILITY_SCORE_IMPROVEMENT_LEVELS = withMartialFallback({
  Barbarian: [4, 8, 12, 16, 19],
  Fighter:   [4, 6, 8, 12, 14, 16, 19],
  Monk:      [4, 8, 12, 16, 19],
  Paladin:   [4, 8, 12, 16, 19],
  Ranger:    [4, 8, 12, 16, 19],
  Rogue:     [4, 8, 10, 12, 16, 19],
}, "ABILITY_SCORE_IMPROVEMENT_LEVELS");

// ─────────────────────────────────────────────
// WEAPON MASTERY (2024 new mechanic)
// ─────────────────────────────────────────────
//
// Five martial classes get Weapon Mastery in 2024 (Barbarian,
// Fighter, Paladin, Ranger, Rogue). Monk does NOT — Martial Arts is
// the Monk's equivalent surface. Slot count is the number of weapon
// types the character can apply mastery properties to at one time;
// the player can swap one chosen weapon for another on a long rest.
//
// The mastery PROPERTY names (Cleave, Graze, Nick, Push, Sap, Slow,
// Topple, Vex) are sourced from
// `docs/5e_reference/2024/5e-SRD-Weapon-Mastery-Properties.json`.
// Each individual weapon's mastery is in 5e-SRD-Equipment.json.

export const WEAPON_MASTERY_SLOTS_BY_CLASS = {
  // Barbarian: 2 at 1st, 3 at 4th, 4 at 10th, 5 at 16th
  Barbarian: { 1: 2, 4: 3, 10: 4, 16: 5 },
  // Fighter: 3 at 1st, 4 at 4th, 5 at 10th, 6 at 16th
  Fighter:   { 1: 3, 4: 4, 10: 5, 16: 6 },
  // Paladin: 2 at 1st, 3 at 4th, 4 at 10th, 5 at 16th
  Paladin:   { 1: 2, 4: 3, 10: 4, 16: 5 },
  // Ranger: 2 at 1st, 3 at 4th, 4 at 10th, 5 at 16th
  Ranger:    { 1: 2, 4: 3, 10: 4, 16: 5 },
  // Rogue: 2 at 1st, 3 at 4th, 4 at 10th, 5 at 16th
  Rogue:     { 1: 2, 4: 3, 10: 4, 16: 5 },
};

/** Returns the number of Weapon Mastery slots a class has at the
 *  given class level. Returns 0 for classes that don't get the
 *  mechanic (Monk, plus all casters). */
export function weaponMasterySlots(className, classLevel) {
  const table = WEAPON_MASTERY_SLOTS_BY_CLASS[className];
  if (!table || !classLevel || classLevel < 1) return 0;
  const thresholds = Object.keys(table).map(Number).sort((a, b) => b - a);
  for (const t of thresholds) if (classLevel >= t) return table[t];
  return 0;
}

// ─────────────────────────────────────────────
// CLASS-SPECIFIC SCALING TABLES
// ─────────────────────────────────────────────

// Barbarian Rage uses per long rest (unchanged from 2014).
// L20: unlimited per RAW — represented as Infinity here so consumer
// math can compare cleanly.
export const RAGE_USES_BY_LEVEL = {
  1: 2, 3: 3, 6: 4, 12: 5, 17: 6, 20: Infinity,
};

// Barbarian Rage damage bonus by level (unchanged from 2014).
export const RAGE_DAMAGE_BY_LEVEL = {
  1: 2, 9: 3, 16: 4,
};

export function rageUsesAtLevel(barbarianLevel) {
  const thresholds = Object.keys(RAGE_USES_BY_LEVEL).map(Number).sort((a, b) => b - a);
  for (const t of thresholds) if (barbarianLevel >= t) return RAGE_USES_BY_LEVEL[t];
  return 0;
}

export function rageDamageAtLevel(barbarianLevel) {
  const thresholds = Object.keys(RAGE_DAMAGE_BY_LEVEL).map(Number).sort((a, b) => b - a);
  for (const t of thresholds) if (barbarianLevel >= t) return RAGE_DAMAGE_BY_LEVEL[t];
  return 0;
}

// Rogue Sneak Attack progression (1d6 at 1st, +1d6 every two levels).
// Unchanged from 2014.
export function sneakAttackDice(rogueLevel) {
  if (!rogueLevel || rogueLevel < 1) return 0;
  return Math.ceil(rogueLevel / 2);
}

// Monk Martial Arts die. 2024 scales d6 → d8 → d10 → d12 (one die
// size bigger at each milestone than the 2014 progression).
export const MARTIAL_ARTS_DIE_2024 = {
  1: "d6", 5: "d8", 11: "d10", 17: "d12",
};

export function martialArtsDie(monkLevel) {
  const thresholds = Object.keys(MARTIAL_ARTS_DIE_2024).map(Number).sort((a, b) => b - a);
  for (const t of thresholds) if (monkLevel >= t) return MARTIAL_ARTS_DIE_2024[t];
  return null;
}

// Monk Focus Points (renamed from 2014 Ki Points). Equal to Monk
// level, starting at level 2.
export function focusPoints(monkLevel) {
  if (!monkLevel || monkLevel < 2) return 0;
  return monkLevel;
}

// Paladin Lay on Hands pool. Equal to 5 × Paladin level (unchanged
// from 2014).
export function layOnHandsPool(paladinLevel) {
  if (!paladinLevel || paladinLevel < 1) return 0;
  return paladinLevel * 5;
}

// ─────────────────────────────────────────────
// SPELL SLOTS — full caster, half caster, multiclass
// ─────────────────────────────────────────────
//
// The full-caster slot table hasn't changed between 2014 and 2024
// (the 5e standard slot progression is system-level mechanics, not
// edition-specific). Declared here rather than re-exported from the
// 2014 file because the architectural rule says no cross-edition
// fallback, even for tables that happen to match. Hand-confirmed
// against the 2024 PHB.

export const FULL_CASTER_SLOTS = {
  1:  [2],
  2:  [3],
  3:  [4, 2],
  4:  [4, 3],
  5:  [4, 3, 2],
  6:  [4, 3, 3],
  7:  [4, 3, 3, 1],
  8:  [4, 3, 3, 2],
  9:  [4, 3, 3, 3, 1],
  10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1],
  12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1],
  14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1],
  16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

/**
 * 2024 half-caster slot table for Paladin and Ranger. Key 2024 change
 * from 2014: half-casters get spellcasting from level 1 (vs 2014's
 * level-2 start). At L1 they have [2] 1st-level slots. From L2 onward
 * the table matches 2014's `ceil(L/2)` lookup into the full-caster
 * progression — the L1 case is the only difference between editions
 * for single-class slot lookup.
 */
export function halfCasterSlots(characterLevel) {
  if (!characterLevel || characterLevel < 1) return [];
  const effectiveLevel = Math.ceil(characterLevel / 2);
  return FULL_CASTER_SLOTS[effectiveLevel] || [];
}

/**
 * Multiclass effective-caster-level contribution from a half-caster
 * class. 2024 rounds UP (key change from 2014 which rounded DOWN).
 * Per multiclass vetting Section C.3: Paladin 1 / Wiz 5 in 2024 →
 * effective caster level 6 (Paladin contributes 1); in 2014 →
 * effective caster level 5 (Paladin contributes 0).
 */
export function multiclassHalfCasterContribution(halfCasterClassLevel) {
  if (!halfCasterClassLevel || halfCasterClassLevel < 1) return 0;
  return Math.ceil(halfCasterClassLevel / 2);
}

// ─────────────────────────────────────────────
// SPELLS PREPARED — Paladin + Ranger (martial half-casters)
// ─────────────────────────────────────────────
//
// 2024 fixed prepared tables. No INT/WIS/CHA + level formulas. Both
// Paladin and Ranger share the identical 1..20 table per PHB 2024.
//
// Swap rule per 2024 SRD (verified against
// 5e-SRD-Classes.json -> spellcasting.info -> "Changing Your
// Prepared Spells"): "Whenever you finish a Long Rest, you can
// replace ONE spell on your list..." for both Paladin and Ranger.
// (The vetting spec doc said Paladin gets swap-all on long rest but
// SRD is the canonical source per the OGL constraint.)

const HALF_CASTER_PREPARED_TABLE_2024 = {
  1:  2,  2:  3,  3:  4,  4:  5,  5:  6,
  6:  6,  7:  7,  8:  7,  9:  9,  10: 9,
  11: 10, 12: 10, 13: 11, 14: 11, 15: 12,
  16: 12, 17: 14, 18: 14, 19: 15, 20: 15,
};

const MARTIAL_SPELLS_KNOWN_TABLE = {
  Paladin: {
    type: "prepared",
    cantrips: null, // Paladin has no cantrips in 2024 baseline
    preparedTable: HALF_CASTER_PREPARED_TABLE_2024,
    source: "Entire paladin spell list",
    startLevel: 1, // 2024 change: Paladin casts from L1 (was L2 in 2014)
    swapOnLongRest: 1,
    alwaysPrepared: ["Divine Smite"], // 2024: Divine Smite is a Paladin spell, always prepared
  },
  Ranger: {
    type: "prepared",
    cantrips: null, // Ranger has no cantrips in 2024 baseline
    preparedTable: HALF_CASTER_PREPARED_TABLE_2024,
    source: "Entire ranger spell list",
    startLevel: 1, // 2024 change: Ranger casts from L1
    swapOnLongRest: 1,
    alwaysPrepared: ["Hunter's Mark"], // 2024: Hunter's Mark always prepared, doesn't count against cap
  },
};

export const SPELLS_KNOWN_TABLE = withMartialFallback(
  MARTIAL_SPELLS_KNOWN_TABLE,
  "SPELLS_KNOWN_TABLE",
);

/**
 * Returns the number of spells a class can prepare at the given class
 * level, per the 2024 fixed-table model (no ability-mod formula).
 * Returns 0 if the class is martial-only (no spellcasting) or if the
 * class hasn't yet reached its spellcasting startLevel.
 */
export function spellsPrepared(className, classLevel /* , abilityMod ignored in 2024 */) {
  const data = MARTIAL_SPELLS_KNOWN_TABLE[className];
  if (!data || data.type !== "prepared") return null;
  if (data.startLevel && classLevel < data.startLevel) return 0;
  return data.preparedTable?.[classLevel] ?? 0;
}

// ─────────────────────────────────────────────
// CANTRIPS — none for the 6 martial classes at baseline
// ─────────────────────────────────────────────

const MARTIAL_CANTRIPS_KNOWN = {
  Barbarian: null,
  Fighter:   null, // Eldritch Knight subclass excepted; PHB-only, not in SRD
  Monk:      null,
  Paladin:   null,
  Ranger:    null, // Druidic Warrior fighting-style choice can grant cantrips; not baseline
  Rogue:     null, // Arcane Trickster subclass excepted; PHB-only, not in SRD
};

export const CANTRIPS_KNOWN = withMartialFallback(MARTIAL_CANTRIPS_KNOWN, "CANTRIPS_KNOWN");

export function cantripsKnown(className, classLevel) {
  const table = MARTIAL_CANTRIPS_KNOWN[className];
  if (table == null) return 0;
  // Reserved shape: { thresholdLevel: count, ... } per the 2014 helper.
  const thresholds = Object.keys(table).map(Number).sort((a, b) => b - a);
  for (const t of thresholds) if (classLevel >= t) return table[t];
  return 0;
}

// ─────────────────────────────────────────────
// MULTICLASS — prereqs + proficiency grants on entry
// ─────────────────────────────────────────────
//
// Prereq shape uses the same discriminator pattern as
// CLASS_PRIMARY_ABILITY (mode: 'single' | 'or' | 'and'). The 2024 SRD
// encodes Fighter's STR-or-DEX in `prerequisite_options` (choose 1
// from 2); every other martial uses `prerequisites` (AND-shape).
//
// Per multiclass vetting Section C.1, prereqs are unchanged from 2014
// numerically — the values match. Re-declared here per the
// no-fallback rule.

const MARTIAL_MULTICLASS_REQUIREMENTS = {
  Barbarian: { entries: [{ ability: "str", min: 13 }], mode: "single" },
  Fighter:   { entries: [{ ability: "str", min: 13 }, { ability: "dex", min: 13 }], mode: "or" },
  Monk:      { entries: [{ ability: "dex", min: 13 }, { ability: "wis", min: 13 }], mode: "and" },
  Paladin:   { entries: [{ ability: "str", min: 13 }, { ability: "cha", min: 13 }], mode: "and" },
  Ranger:    { entries: [{ ability: "dex", min: 13 }, { ability: "wis", min: 13 }], mode: "and" },
  Rogue:     { entries: [{ ability: "dex", min: 13 }], mode: "single" },
};

export const MULTICLASS_REQUIREMENTS = withMartialFallback(
  MARTIAL_MULTICLASS_REQUIREMENTS,
  "MULTICLASS_REQUIREMENTS",
);

/**
 * Multiclass proficiencies granted on ENTRY (i.e. when the class is
 * added as a multiclass, not the full level-1 loadout). 2024 PHB
 * Section "As a Multiclass [Class]" per class — values verified
 * against `docs/5e_reference/2024/5e-SRD-Classes.json` ->
 * multi_classing.proficiencies.
 *
 * Notable 2024 deltas from 2014 (per multiclass vetting Section C.2):
 *   - Barbarian: no longer grants simple weapons (just shields +
 *     martial weapons)
 *   - Rogue: no longer grants a skill choice; just light armor +
 *     thieves' tools
 *   - Monk: grants no proficiencies on multiclass entry
 */
const MARTIAL_MULTICLASS_PROFICIENCIES = {
  Barbarian: ["Shields", "Martial Weapons"],
  Fighter:   ["Light Armor", "Medium Armor", "Shields", "Martial Weapons"],
  Monk:      [],
  Paladin:   ["Light Armor", "Medium Armor", "Shields", "Martial Weapons"],
  Ranger:    ["Light Armor", "Medium Armor", "Shields", "Martial Weapons"],
  Rogue:     ["Light Armor", "Tool: Thieves' Tools"],
};

export const MULTICLASS_PROFICIENCIES = withMartialFallback(
  MARTIAL_MULTICLASS_PROFICIENCIES,
  "MULTICLASS_PROFICIENCIES",
);

/**
 * Returns true if the given attributes object satisfies the multiclass
 * prereq for `className`. Returns false for unknown classes
 * (fail-closed) and respects mode='or' (any one suffices) vs
 * mode='and' / 'single' (every entry must pass).
 *
 * `attributes` is a `{ str, dex, ... }` object using lowercase keys.
 * Missing keys are treated as 0 (fail-closed).
 */
export function meetsMulticlassPrereqs(className, attributes) {
  const req = MARTIAL_MULTICLASS_REQUIREMENTS[className];
  if (!req || !Array.isArray(req.entries) || req.entries.length === 0) return false;
  const check = (entry) => Number(attributes?.[entry.ability] ?? 0) >= entry.min;
  if (req.mode === "or") return req.entries.some(check);
  // 'and' and 'single' both require every entry to pass.
  return req.entries.every(check);
}

/**
 * Human-readable description of the multiclass prereq for a class.
 * Returns "Strength 13 or Dexterity 13" for Fighter (OR-mode),
 * "Strength 13 and Charisma 13" for Paladin (AND-mode), and
 * "Strength 13" for single-mode classes.
 */
export function multiclassPrereqDescription(className) {
  const req = MARTIAL_MULTICLASS_REQUIREMENTS[className];
  if (!req) return "";
  const phrases = req.entries.map(
    (e) => `${ABILITY_NAMES_2024[e.ability] || e.ability} ${e.min}`,
  );
  if (req.mode === "or")  return phrases.join(" or ");
  if (req.mode === "and") return phrases.join(" and ");
  return phrases[0];
}

// ─────────────────────────────────────────────
// PENDING COMMIT 7 — full caster slot helper, pact magic, Divine/
// Primal Order options. All throw clearly.
// ─────────────────────────────────────────────

export const WARLOCK_PACT_SLOTS = notImplementedConst("WARLOCK_PACT_SLOTS", "Commit 7");
export const getSpellSlots = notImplemented("getSpellSlots", "Commit 7");
export const spellsKnown = notImplemented("spellsKnown", "Commit 7");
export const DIVINE_ORDER_OPTIONS = notImplementedConst("DIVINE_ORDER_OPTIONS", "Commit 7");
export const PRIMAL_ORDER_OPTIONS = notImplementedConst("PRIMAL_ORDER_OPTIONS", "Commit 7");
