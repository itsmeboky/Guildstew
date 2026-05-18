/**
 * D&D 5e (2024) — rules helpers.
 *
 * Edition-specific mechanical data for the 2024 PHB. Lives entirely
 * separate from the 2014 registries (src/components/dnd5e/dnd5eRules.js
 * and src/game-packs/dnd5e/data/rules.js); per the multiclass vetting
 * spec, this pack must not fall back to 2014.
 *
 * Status by class (Commits 6 + 7):
 *   - Barbarian, Fighter, Monk, Paladin, Ranger, Rogue: shipped in
 *     Commit 6.
 *   - Bard, Cleric, Druid, Sorcerer, Warlock, Wizard: shipped in
 *     Commit 7 (this file).
 *
 * OGL/SRD discipline:
 *   - Game MECHANICS (slot tables, prep counts, point pools, ASI
 *     levels, swap rules) are not IP-protected and are hand-coded
 *     here, mirroring the 2014 registry's shape.
 *   - Feature NAMES are restricted to those present in the 2014 or
 *     2024 SRD JSON. OGL-permissible names used here: Channel
 *     Divinity, Pact Magic, Pact Boon, Eldritch Invocations, Font
 *     of Magic, Sorcery Points (described in Font of Magic),
 *     Metamagic, Lay on Hands, Rage, Bardic Inspiration, Mystic
 *     Arcanum, Wild Shape, Spellcasting.
 *   - PHB-2024-only feature names (Innate Sorcery, Magical Cunning,
 *     Memorize Spell, Cantrip Formulas, Divine Order, Primal Order)
 *     are NOT named here. Their MECHANICS are encoded under
 *     descriptive data fields (e.g. `level2RecoverPactSlots`,
 *     `cantripSwapOnLongRest`) so the creator can implement the
 *     behavior without surfacing the protected names. Stubs for
 *     these surfaces throw "PHB-only; not in OGL SRD JSON".
 */

// ─────────────────────────────────────────────
// HELPERS — Proxy wrapper for clearer error messages on unknown
// class names + a permanent "not in OGL SRD" stub for PHB-only
// feature surfaces.
// ─────────────────────────────────────────────

const phbOnlyStub = (name) => () => {
  throw new Error(
    `dnd5e_2024: ${name} is a PHB-2024-only feature not present in ` +
    `the OGL SRD JSON. The mechanic (where required) is encoded via ` +
    `generic data fields on the spell-table entry; the name itself ` +
    `isn't shipped per the OGL constraint.`,
  );
};

const phbOnlyStubConst = (name) => new Proxy({}, {
  get(_target, prop) {
    if (prop === "then" || typeof prop === "symbol") return undefined;
    throw new Error(
      `dnd5e_2024: ${name}.${String(prop)} is a PHB-2024-only feature ` +
      `not present in the OGL SRD JSON. Mechanic encoded via data ` +
      `fields on the relevant SPELLS_KNOWN_TABLE entry instead.`,
    );
  },
});

function withUnknownClassGuard(map, name) {
  return new Proxy(map, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === "then" || typeof prop === "symbol") return undefined;
      throw new Error(
        `dnd5e_2024: ${name}[${String(prop)}] — unknown class.`,
      );
    },
  });
}

const ABILITY_NAMES_2024 = {
  str: "Strength", dex: "Dexterity", con: "Constitution",
  int: "Intelligence", wis: "Wisdom", cha: "Charisma",
};

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
// CLASS BASICS — all 12 PHB classes
// ─────────────────────────────────────────────

const CLASS_HIT_DICE_MAP = {
  Barbarian: 12,
  Fighter:   10,
  Monk:      8,
  Paladin:   10,
  Ranger:    10,
  Rogue:     8,
  Bard:      8,
  Cleric:    8,
  Druid:     8,
  Sorcerer:  6,
  Warlock:   8,
  Wizard:    6,
};

const CLASS_SAVING_THROWS_MAP = {
  Barbarian: ["str", "con"],
  Fighter:   ["str", "con"],
  Monk:      ["str", "dex"],
  Paladin:   ["wis", "cha"],
  Ranger:    ["str", "dex"],
  Rogue:     ["dex", "int"],
  Bard:      ["dex", "cha"],
  Cleric:    ["wis", "cha"],
  Druid:     ["int", "wis"],
  Sorcerer:  ["con", "cha"],
  Warlock:   ["wis", "cha"],
  Wizard:    ["int", "wis"],
};

const CLASS_PRIMARY_ABILITY_MAP = {
  // Discriminated shape from 2014 Commit 2: { abilities, mode }.
  // mode 'or' = player picks one (Fighter); 'and' = both apply
  // (Monk/Paladin/Ranger); 'single' = one ability is primary.
  Barbarian: { abilities: ["str"],        mode: "single" }, // PHB 2024 pg. 47
  Fighter:   { abilities: ["str", "dex"], mode: "or"     }, // PHB 2024 pg. 91
  Monk:      { abilities: ["dex", "wis"], mode: "and"    }, // PHB 2024 pg. 102
  Paladin:   { abilities: ["str", "cha"], mode: "and"    }, // PHB 2024 pg. 110
  Ranger:    { abilities: ["dex", "wis"], mode: "and"    }, // PHB 2024 pg. 116
  Rogue:     { abilities: ["dex"],        mode: "single" }, // PHB 2024 pg. 121
  Bard:      { abilities: ["cha"],        mode: "single" },
  Cleric:    { abilities: ["wis"],        mode: "single" },
  Druid:     { abilities: ["wis"],        mode: "single" },
  Sorcerer:  { abilities: ["cha"],        mode: "single" },
  Warlock:   { abilities: ["cha"],        mode: "single" },
  Wizard:    { abilities: ["int"],        mode: "single" },
};

export const CLASS_HIT_DICE = withUnknownClassGuard(CLASS_HIT_DICE_MAP, "CLASS_HIT_DICE");
export const CLASS_SAVING_THROWS = withUnknownClassGuard(CLASS_SAVING_THROWS_MAP, "CLASS_SAVING_THROWS");
export const CLASS_PRIMARY_ABILITY = withUnknownClassGuard(CLASS_PRIMARY_ABILITY_MAP, "CLASS_PRIMARY_ABILITY");

export function primaryAbilityDisplay(className) {
  const entry = CLASS_PRIMARY_ABILITY_MAP[className];
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

const ABILITY_SCORE_IMPROVEMENT_LEVELS_MAP = {
  Barbarian: [4, 8, 12, 16, 19],
  Fighter:   [4, 6, 8, 12, 14, 16, 19],
  Monk:      [4, 8, 12, 16, 19],
  Paladin:   [4, 8, 12, 16, 19],
  Ranger:    [4, 8, 12, 16, 19],
  Rogue:     [4, 8, 10, 12, 16, 19],
  Bard:      [4, 8, 12, 16, 19],
  Cleric:    [4, 8, 12, 16, 19],
  Druid:     [4, 8, 12, 16, 19],
  Sorcerer:  [4, 8, 12, 16, 19],
  Warlock:   [4, 8, 12, 16, 19],
  Wizard:    [4, 8, 12, 16, 19],
};

export const ABILITY_SCORE_IMPROVEMENT_LEVELS = withUnknownClassGuard(
  ABILITY_SCORE_IMPROVEMENT_LEVELS_MAP,
  "ABILITY_SCORE_IMPROVEMENT_LEVELS",
);

// ─────────────────────────────────────────────
// WEAPON MASTERY (2024 new mechanic)
// ─────────────────────────────────────────────
//
// Five martial classes get Weapon Mastery (Barbarian, Fighter,
// Paladin, Ranger, Rogue). Monk does NOT — Martial Arts is the
// Monk's equivalent surface. Casters have no Weapon Mastery.

export const WEAPON_MASTERY_SLOTS_BY_CLASS = {
  Barbarian: { 1: 2, 4: 3, 10: 4, 16: 5 },
  Fighter:   { 1: 3, 4: 4, 10: 5, 16: 6 },
  Paladin:   { 1: 2, 4: 3, 10: 4, 16: 5 },
  Ranger:    { 1: 2, 4: 3, 10: 4, 16: 5 },
  Rogue:     { 1: 2, 4: 3, 10: 4, 16: 5 },
};

export function weaponMasterySlots(className, classLevel) {
  const table = WEAPON_MASTERY_SLOTS_BY_CLASS[className];
  if (!table || !classLevel || classLevel < 1) return 0;
  const thresholds = Object.keys(table).map(Number).sort((a, b) => b - a);
  for (const t of thresholds) if (classLevel >= t) return table[t];
  return 0;
}

// ─────────────────────────────────────────────
// MARTIAL CLASS SCALING (Barb / Monk / Pal / Rog)
// ─────────────────────────────────────────────

export const RAGE_USES_BY_LEVEL = {
  1: 2, 3: 3, 6: 4, 12: 5, 17: 6, 20: Infinity,
};
export const RAGE_DAMAGE_BY_LEVEL = { 1: 2, 9: 3, 16: 4 };

export function rageUsesAtLevel(barbarianLevel) {
  const t = Object.keys(RAGE_USES_BY_LEVEL).map(Number).sort((a, b) => b - a);
  for (const k of t) if (barbarianLevel >= k) return RAGE_USES_BY_LEVEL[k];
  return 0;
}
export function rageDamageAtLevel(barbarianLevel) {
  const t = Object.keys(RAGE_DAMAGE_BY_LEVEL).map(Number).sort((a, b) => b - a);
  for (const k of t) if (barbarianLevel >= k) return RAGE_DAMAGE_BY_LEVEL[k];
  return 0;
}

export function sneakAttackDice(rogueLevel) {
  if (!rogueLevel || rogueLevel < 1) return 0;
  return Math.ceil(rogueLevel / 2);
}

export const MARTIAL_ARTS_DIE_2024 = { 1: "d6", 5: "d8", 11: "d10", 17: "d12" };
export function martialArtsDie(monkLevel) {
  const t = Object.keys(MARTIAL_ARTS_DIE_2024).map(Number).sort((a, b) => b - a);
  for (const k of t) if (monkLevel >= k) return MARTIAL_ARTS_DIE_2024[k];
  return null;
}

export function focusPoints(monkLevel) {
  if (!monkLevel || monkLevel < 2) return 0;
  return monkLevel;
}

export function layOnHandsPool(paladinLevel) {
  if (!paladinLevel || paladinLevel < 1) return 0;
  return paladinLevel * 5;
}

// ─────────────────────────────────────────────
// SPELL SLOTS — full caster + half caster
// ─────────────────────────────────────────────

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
 * from 2014: half-casters get spellcasting from level 1.
 */
export function halfCasterSlots(characterLevel) {
  if (!characterLevel || characterLevel < 1) return [];
  const effectiveLevel = Math.ceil(characterLevel / 2);
  return FULL_CASTER_SLOTS[effectiveLevel] || [];
}

export function multiclassHalfCasterContribution(halfCasterClassLevel) {
  if (!halfCasterClassLevel || halfCasterClassLevel < 1) return 0;
  return Math.ceil(halfCasterClassLevel / 2);
}

// ─────────────────────────────────────────────
// WARLOCK PACT MAGIC SLOTS
// ─────────────────────────────────────────────
//
// Pact Magic is OGL-covered (Pact Magic, Pact Boon, Mystic Arcanum
// are 2014 SRD feature names). The 1..20 slot table is mechanics.
// Multiclass: Warlock pact slots are a separate pool — they do NOT
// contribute to the multiclass-spellcaster table. Per spec.

export const WARLOCK_PACT_SLOTS = {
  1:  { slots: 1, level: 1 },
  2:  { slots: 2, level: 1 },
  3:  { slots: 2, level: 2 },
  4:  { slots: 2, level: 2 },
  5:  { slots: 2, level: 3 },
  6:  { slots: 2, level: 3 },
  7:  { slots: 2, level: 4 },
  8:  { slots: 2, level: 4 },
  9:  { slots: 2, level: 5 },
  10: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 },
  14: { slots: 3, level: 5 },
  15: { slots: 3, level: 5 },
  16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 },
  18: { slots: 4, level: 5 },
  19: { slots: 4, level: 5 },
  20: { slots: 4, level: 5 },
};

/** Returns { slots, level } for the given Warlock class level, or
 *  null if the level is out of range. */
export function getPactSlots(warlockLevel) {
  if (!warlockLevel || warlockLevel < 1) return null;
  return WARLOCK_PACT_SLOTS[Math.min(20, warlockLevel)] || null;
}

/** Warlock Mystic Arcanum: free 1/long-rest cast of an N-th level
 *  spell. Returns an array of granted spell levels at the given
 *  Warlock class level. e.g. Warlock 13 → [6, 7]. */
const MYSTIC_ARCANUM_GRANTS = { 11: 6, 13: 7, 15: 8, 17: 9 };

export function mysticArcanumLevels(warlockLevel) {
  if (!warlockLevel || warlockLevel < 11) return [];
  return Object.entries(MYSTIC_ARCANUM_GRANTS)
    .filter(([gateLevel]) => warlockLevel >= Number(gateLevel))
    .map(([, spellLevel]) => spellLevel)
    .sort((a, b) => a - b);
}

// Warlock Eldritch Invocations known by Warlock level. 2024 grants
// the first TWO Invocations at level 1 (vs 2014 which started at
// level 2 with 2 Invocations). PHB 2024 Warlock features table:
// L1=2, L2=3, L5=5, L7=6, L9=7, L12=8, L15=9, L18=10.
const ELDRITCH_INVOCATIONS_BY_LEVEL = {
  1: 2, 2: 3, 5: 5, 7: 6, 9: 7, 12: 8, 15: 9, 18: 10,
};

export function eldritchInvocationsKnown(warlockLevel) {
  if (!warlockLevel || warlockLevel < 1) return 0;
  const t = Object.keys(ELDRITCH_INVOCATIONS_BY_LEVEL).map(Number).sort((a, b) => b - a);
  for (const k of t) if (warlockLevel >= k) return ELDRITCH_INVOCATIONS_BY_LEVEL[k];
  return 0;
}

// ─────────────────────────────────────────────
// SORCERER MECHANICS — Sorcery Points + Metamagic
// ─────────────────────────────────────────────
//
// Sorcery Points and Metamagic are OGL-permissible names (described
// in Font of Magic in the 2014 SRD).

/** Sorcery Points = Sorcerer level, starting at level 2 (Font of
 *  Magic feature). */
export function sorceryPoints(sorcererLevel) {
  if (!sorcererLevel || sorcererLevel < 2) return 0;
  return sorcererLevel;
}

/** Number of Metamagic options known at the given Sorcerer level.
 *  2024 change: starts at L2 with 2 options (vs 2014 which started
 *  at L3). +1 at L10, +1 at L17. */
const METAMAGIC_KNOWN_BY_LEVEL = { 2: 2, 10: 3, 17: 4 };

export function metamagicKnown(sorcererLevel) {
  if (!sorcererLevel || sorcererLevel < 2) return 0;
  const t = Object.keys(METAMAGIC_KNOWN_BY_LEVEL).map(Number).sort((a, b) => b - a);
  for (const k of t) if (sorcererLevel >= k) return METAMAGIC_KNOWN_BY_LEVEL[k];
  return 0;
}

// ─────────────────────────────────────────────
// CHANNEL DIVINITY USES (Cleric + Paladin)
// ─────────────────────────────────────────────
//
// Channel Divinity is OGL-covered (2014 SRD feature). 2024 use scaling
// per PHB. Cleric: 2/6/18 → 2/3/4 per Long Rest (refreshes on Long
// Rest only — Cleric). Paladin: 3/7 → 1/2 (refreshes on Short or
// Long Rest — Paladin). Tracked separately per class for multiclass
// builds (the 2024 PHB makes these independent pools, unlike 2014's
// pooled treatment).

export const CHANNEL_DIVINITY_USES_CLERIC = { 2: 2, 6: 3, 18: 4 };
export const CHANNEL_DIVINITY_USES_PALADIN = { 3: 1, 7: 2 };

export function channelDivinityUses(className, classLevel) {
  if (!classLevel || classLevel < 1) return 0;
  const table = className === "Cleric"
    ? CHANNEL_DIVINITY_USES_CLERIC
    : className === "Paladin"
      ? CHANNEL_DIVINITY_USES_PALADIN
      : null;
  if (!table) return 0;
  const t = Object.keys(table).map(Number).sort((a, b) => b - a);
  for (const k of t) if (classLevel >= k) return table[k];
  return 0;
}

// ─────────────────────────────────────────────
// SPELLCASTING TABLES — all 12 classes
// ─────────────────────────────────────────────
//
// Shape `SPELLS_KNOWN_TABLE[className]`:
//   - type: "prepared" (most casters) | "spellbook" (Wizard) | "pact"
//     (Warlock — pact slots, but still uses a fixed prepared table)
//   - cantrips: { thresholdLevel: count } | null
//   - preparedTable: { 1..20: count } — the 2024 fixed prepared
//     table per class
//   - source: human-readable description of the spell pool
//   - startLevel: class level at which spellcasting begins
//   - swapOnLongRest: "all" | 1 | 0 (0 = no swap on LR)
//   - swapOnLevelUp: 1 | 0
//   - alwaysPrepared: array of OGL-permissible spell names that
//     don't count against the prep cap
//
// Swap rules per the 2024 SRD spellcasting blob (canonical):
//   - Cleric, Druid, Wizard: swap any/all on Long Rest
//   - Paladin, Ranger: swap 1 on Long Rest
//   - Bard, Sorcerer, Warlock: swap 1 on level-up only (NOT on
//     Long Rest — note this differs from the spec doc; SRD wins)

const HALF_CASTER_PREPARED_TABLE_2024 = {
  1:  2,  2:  3,  3:  4,  4:  5,  5:  6,
  6:  6,  7:  7,  8:  7,  9:  9,  10: 9,
  11: 10, 12: 10, 13: 11, 14: 11, 15: 12,
  16: 12, 17: 14, 18: 14, 19: 15, 20: 15,
};

const FULL_CASTER_PREPARED_CLERIC_DRUID = {
  1:  4,  2:  5,  3:  6,  4:  7,  5:  9,
  6:  10, 7:  11, 8:  12, 9:  14, 10: 15,
  11: 16, 12: 16, 13: 17, 14: 17, 15: 18,
  16: 18, 17: 19, 18: 20, 19: 21, 20: 22,
};

const FULL_CASTER_PREPARED_BARD = {
  1:  4,  2:  5,  3:  6,  4:  7,  5:  9,
  6:  10, 7:  11, 8:  12, 9:  14, 10: 15,
  11: 16, 12: 16, 13: 17, 14: 18, 15: 19,
  16: 19, 17: 20, 18: 22, 19: 22, 20: 22,
};

const FULL_CASTER_PREPARED_SORCERER = {
  1:  2,  2:  4,  3:  6,  4:  7,  5:  9,
  6:  10, 7:  11, 8:  12, 9:  14, 10: 15,
  11: 16, 12: 16, 13: 17, 14: 17, 15: 18,
  16: 18, 17: 19, 18: 20, 19: 21, 20: 22,
};

const PACT_CASTER_PREPARED_WARLOCK = {
  1:  2,  2:  3,  3:  4,  4:  5,  5:  6,
  6:  7,  7:  8,  8:  9,  9:  10, 10: 10,
  11: 11, 12: 11, 13: 12, 14: 12, 15: 13,
  16: 13, 17: 14, 18: 14, 19: 15, 20: 15,
};

const SPELLBOOK_PREPARED_WIZARD = {
  1:  4,  2:  5,  3:  6,  4:  7,  5:  9,
  6:  10, 7:  11, 8:  12, 9:  14, 10: 15,
  11: 16, 12: 16, 13: 17, 14: 18, 15: 19,
  16: 21, 17: 22, 18: 23, 19: 24, 20: 25,
};

const SPELLS_KNOWN_TABLE_MAP = {
  // ─── Half-casters (Commit 6) ───────────────────────────────
  Paladin: {
    type: "prepared",
    cantrips: null,
    preparedTable: HALF_CASTER_PREPARED_TABLE_2024,
    source: "Entire paladin spell list",
    startLevel: 1,
    swapOnLongRest: 1,
    swapOnLevelUp: 0,
    // Per the 2024 PHB, Divine Smite is now a Paladin spell, always
    // prepared, doesn't count against the prep cap.
    alwaysPrepared: ["Divine Smite"],
  },
  Ranger: {
    type: "prepared",
    cantrips: null,
    preparedTable: HALF_CASTER_PREPARED_TABLE_2024,
    source: "Entire ranger spell list",
    startLevel: 1,
    swapOnLongRest: 1,
    swapOnLevelUp: 0,
    alwaysPrepared: ["Hunter's Mark"],
  },

  // ─── Full casters — swap-all on Long Rest ───────────────────
  Cleric: {
    type: "prepared",
    cantrips: { 1: 3, 4: 4, 10: 5 },
    preparedTable: FULL_CASTER_PREPARED_CLERIC_DRUID,
    source: "Entire cleric spell list",
    startLevel: 1,
    swapOnLongRest: "all",
    swapOnLevelUp: 0,
    // L1: class-feature choice grants additional proficiencies or a
    // cantrip + WIS-derived bonus. PHB-2024 name not in OGL SRD JSON
    // — surfaced via DIVINE_ORDER_OPTIONS stub which throws.
    level1ClassPathChoice: true,
    // Channel Divinity scaling encoded in CHANNEL_DIVINITY_USES_CLERIC.
  },
  Druid: {
    type: "prepared",
    cantrips: { 1: 2, 4: 3, 10: 4 },
    preparedTable: FULL_CASTER_PREPARED_CLERIC_DRUID,
    source: "Entire druid spell list",
    startLevel: 1,
    swapOnLongRest: "all",
    swapOnLevelUp: 0,
    // L1 class-feature choice (PHB-2024 name not in SRD JSON, same
    // shape as Cleric's). Surfaced via PRIMAL_ORDER_OPTIONS stub.
    level1ClassPathChoice: true,
  },
  Wizard: {
    type: "spellbook",
    cantrips: { 1: 3, 4: 4, 10: 5 },
    // 2024 Wizard cantrips can be swapped (1 cantrip on Long Rest).
    // The PHB feature name for this is PHB-only and not in SRD JSON;
    // mechanic encoded here.
    cantripSwapOnLongRest: 1,
    preparedTable: SPELLBOOK_PREPARED_WIZARD,
    source: "Spellbook (prepare on Long Rest from spellbook only)",
    startLevel: 1,
    swapOnLongRest: "all",
    swapOnLevelUp: 0,
    // 2024 Wizard L5 feature: swap 1 prepared spell on Short Rest.
    // PHB name not in SRD JSON; mechanic encoded:
    swapOnShortRest: 1,
    swapOnShortRestStartLevel: 5,
    // 2024 Wizard L1 feature: cast any Ritual-tagged spell from
    // spellbook without preparing. The L1 "Ritual Adept" feature
    // name isn't in the SRD JSON either; mechanic encoded as a
    // boolean flag.
    ritualCastingFromSpellbook: true,
    // Spellbook contents (acquisition rules)
    startingSpellbookSpells: 6,    // 1st-level spells at character creation
    spellsPerLevel: 2,             // added to spellbook on level-up
    copySpellCost: "2 hours + 50 GP per spell level",
  },

  // ─── Full casters — swap-on-level-up (per 2024 SRD) ─────────
  Bard: {
    type: "prepared",
    cantrips: { 1: 2, 4: 3, 10: 4 },
    preparedTable: FULL_CASTER_PREPARED_BARD,
    source: "Entire bard spell list",
    startLevel: 1,
    swapOnLongRest: 0,
    swapOnLevelUp: 1,
    // Bardic Inspiration die scales with class level. Die-size key
    // is the Bard class level where each tier unlocks.
    bardicInspirationDie: { 1: "d6", 5: "d8", 10: "d10", 15: "d12" },
  },
  Sorcerer: {
    type: "prepared",
    cantrips: { 1: 4, 4: 5, 10: 6 },
    preparedTable: FULL_CASTER_PREPARED_SORCERER,
    source: "Entire sorcerer spell list",
    startLevel: 1,
    swapOnLongRest: 0,
    swapOnLevelUp: 1,
    // 2024 Sorcerer L1 feature: a limited-use spell-buff toggle
    // (+1 spell save DC, advantage on spell attacks, 1 min, 2/long
    // rest). PHB name not in SRD JSON; mechanic encoded:
    level1SpellcastingBuff: {
      durationMinutes: 1,
      spellSaveDcBonus: 1,
      spellAttackAdvantage: true,
      usesPerLongRest: 2,
    },
    // Sorcery Points (OGL via Font of Magic) — see sorceryPoints()
    // helper. Metamagic counts — see metamagicKnown() helper.
  },

  // ─── Warlock — Pact Magic ──────────────────────────────────
  Warlock: {
    type: "pact",
    cantrips: { 1: 2, 4: 3, 10: 4 },
    preparedTable: PACT_CASTER_PREPARED_WARLOCK,
    source: "Entire warlock spell list",
    startLevel: 1,
    swapOnLongRest: 0,
    swapOnLevelUp: 1,
    // 2024 Warlock L2 feature: regain expended Pact Magic slots
    // (up to half max, rounded up). PHB name not in SRD JSON;
    // mechanic encoded:
    level2RecoverPactSlots: {
      fractionOfMax: 0.5,
      rounding: "up",
      usesPerLongRest: 1,
    },
    // Pact Boon (OGL via 2014 SRD) — selected at L3 in 2024 (was
    // L3 in 2014 too). Now an Eldritch Invocation per 2024 PHB.
    pactBoonAtLevel: 3,
    // Mystic Arcanum levels — see mysticArcanumLevels() helper.
    // Eldritch Invocations known — see eldritchInvocationsKnown().
  },

  // ─── No-spellcasting classes (omit from SPELLS_KNOWN_TABLE) ─
  // Barbarian, Fighter, Monk, Rogue: no class-level spellcasting in
  // 2024 baseline. Subclass spellcasting (e.g. Eldritch Knight,
  // Arcane Trickster) is PHB-only and not in the 2024 SRD; not
  // shipped per OGL.
};

export const SPELLS_KNOWN_TABLE = withUnknownClassGuard(
  SPELLS_KNOWN_TABLE_MAP,
  "SPELLS_KNOWN_TABLE",
);

/**
 * Safe accessor for SPELLS_KNOWN_TABLE that returns null for
 * non-spellcasting classes (Barbarian, Fighter, Monk, Rogue)
 * instead of throwing via the unknown-class guard. UI code that
 * needs to branch on "is this class a caster?" should use this
 * rather than indexing SPELLS_KNOWN_TABLE directly.
 */
export function getSpellsKnownEntry(className) {
  if (!className) return null;
  if (!(className in SPELLS_KNOWN_TABLE_MAP)) return null;
  return SPELLS_KNOWN_TABLE_MAP[className];
}

/**
 * Returns the number of spells the class can prepare at the given
 * class level, per the 2024 fixed-table model. Returns null for
 * non-spellcasting classes and 0 for spellcasters that haven't yet
 * reached their startLevel.
 */
export function spellsPrepared(className, classLevel) {
  const data = SPELLS_KNOWN_TABLE_MAP[className];
  if (!data) return null;
  if (data.startLevel && classLevel < data.startLevel) return 0;
  return data.preparedTable?.[classLevel] ?? 0;
}

/**
 * Returns the array of full-caster slots for a class at the given
 * level. Returns:
 *   - full caster (Bard / Cleric / Druid / Sorcerer / Wizard):
 *     FULL_CASTER_SLOTS[classLevel]
 *   - half caster (Paladin / Ranger): halfCasterSlots(classLevel)
 *   - Warlock: [] (use getPactSlots() instead — Pact Magic is a
 *     separate pool that doesn't combine with the multiclass
 *     spellcaster table)
 *   - non-caster classes: []
 */
const FULL_CASTERS = new Set(["Bard", "Cleric", "Druid", "Sorcerer", "Wizard"]);
const HALF_CASTERS = new Set(["Paladin", "Ranger"]);

export function getSpellSlots(className, classLevel) {
  if (!classLevel || classLevel < 1) return [];
  if (FULL_CASTERS.has(className)) {
    return FULL_CASTER_SLOTS[Math.min(20, classLevel)] || [];
  }
  if (HALF_CASTERS.has(className)) {
    return halfCasterSlots(classLevel);
  }
  return [];
}

// ─────────────────────────────────────────────
// CANTRIPS — table per class
// ─────────────────────────────────────────────

const CANTRIPS_KNOWN_MAP = {
  Barbarian: null,
  Fighter:   null,
  Monk:      null,
  Paladin:   null,
  Ranger:    null,
  Rogue:     null,
  Bard:      { 1: 2, 4: 3, 10: 4 },
  Cleric:    { 1: 3, 4: 4, 10: 5 },
  Druid:     { 1: 2, 4: 3, 10: 4 },
  Sorcerer:  { 1: 4, 4: 5, 10: 6 },
  Warlock:   { 1: 2, 4: 3, 10: 4 },
  Wizard:    { 1: 3, 4: 4, 10: 5 },
};

export const CANTRIPS_KNOWN = withUnknownClassGuard(CANTRIPS_KNOWN_MAP, "CANTRIPS_KNOWN");

export function cantripsKnown(className, classLevel) {
  const table = CANTRIPS_KNOWN_MAP[className];
  if (table == null) return 0;
  const t = Object.keys(table).map(Number).sort((a, b) => b - a);
  for (const k of t) if (classLevel >= k) return table[k];
  return 0;
}

// ─────────────────────────────────────────────
// MULTICLASS — prereqs + grants
// ─────────────────────────────────────────────

const MULTICLASS_REQUIREMENTS_MAP = {
  Barbarian: { entries: [{ ability: "str", min: 13 }], mode: "single" },
  Fighter:   { entries: [{ ability: "str", min: 13 }, { ability: "dex", min: 13 }], mode: "or" },
  Monk:      { entries: [{ ability: "dex", min: 13 }, { ability: "wis", min: 13 }], mode: "and" },
  Paladin:   { entries: [{ ability: "str", min: 13 }, { ability: "cha", min: 13 }], mode: "and" },
  Ranger:    { entries: [{ ability: "dex", min: 13 }, { ability: "wis", min: 13 }], mode: "and" },
  Rogue:     { entries: [{ ability: "dex", min: 13 }], mode: "single" },
  Bard:      { entries: [{ ability: "cha", min: 13 }], mode: "single" },
  Cleric:    { entries: [{ ability: "wis", min: 13 }], mode: "single" },
  Druid:     { entries: [{ ability: "wis", min: 13 }], mode: "single" },
  Sorcerer:  { entries: [{ ability: "cha", min: 13 }], mode: "single" },
  Warlock:   { entries: [{ ability: "cha", min: 13 }], mode: "single" },
  Wizard:    { entries: [{ ability: "int", min: 13 }], mode: "single" },
};

export const MULTICLASS_REQUIREMENTS = withUnknownClassGuard(
  MULTICLASS_REQUIREMENTS_MAP,
  "MULTICLASS_REQUIREMENTS",
);

// 2024 multiclass-entry proficiencies per Section C.2 + verified
// against `docs/5e_reference/2024/5e-SRD-Classes.json` ->
// multi_classing.proficiencies.
const MULTICLASS_PROFICIENCIES_MAP = {
  Barbarian: ["Shields", "Martial Weapons"],
  Fighter:   ["Light Armor", "Medium Armor", "Shields", "Martial Weapons"],
  Monk:      [],
  Paladin:   ["Light Armor", "Medium Armor", "Shields", "Martial Weapons"],
  Ranger:    ["Light Armor", "Medium Armor", "Shields", "Martial Weapons"],
  Rogue:     ["Light Armor", "Tool: Thieves' Tools"],
  Bard:      ["Light Armor"],
  Cleric:    ["Light Armor", "Medium Armor", "Shields"],
  Druid:     ["Light Armor", "Shields"],
  Sorcerer:  [],
  Warlock:   ["Light Armor"],
  Wizard:    [],
};

export const MULTICLASS_PROFICIENCIES = withUnknownClassGuard(
  MULTICLASS_PROFICIENCIES_MAP,
  "MULTICLASS_PROFICIENCIES",
);

export function meetsMulticlassPrereqs(className, attributes) {
  const req = MULTICLASS_REQUIREMENTS_MAP[className];
  if (!req || !Array.isArray(req.entries) || req.entries.length === 0) return false;
  const check = (entry) => Number(attributes?.[entry.ability] ?? 0) >= entry.min;
  if (req.mode === "or") return req.entries.some(check);
  return req.entries.every(check);
}

export function multiclassPrereqDescription(className) {
  const req = MULTICLASS_REQUIREMENTS_MAP[className];
  if (!req) return "";
  const phrases = req.entries.map(
    (e) => `${ABILITY_NAMES_2024[e.ability] || e.ability} ${e.min}`,
  );
  if (req.mode === "or")  return phrases.join(" or ");
  if (req.mode === "and") return phrases.join(" and ");
  return phrases[0];
}

// ─────────────────────────────────────────────
// PHB-2024-ONLY FEATURE NAMES — not in OGL SRD JSON
// ─────────────────────────────────────────────
//
// These exports are kept for API compatibility with the 2014 surface
// but throw with a clear "PHB-only" message. The MECHANICS each
// represents are encoded under data fields on the relevant
// SPELLS_KNOWN_TABLE entry (level1ClassPathChoice on Cleric/Druid,
// level1SpellcastingBuff on Sorcerer, level2RecoverPactSlots on
// Warlock, cantripSwapOnLongRest + swapOnShortRest +
// ritualCastingFromSpellbook on Wizard).
//
// The creator UI (Commit 8 territory) should branch on those data
// fields to implement behavior without surfacing the PHB-only
// feature names to the user.

export const DIVINE_ORDER_OPTIONS = phbOnlyStubConst("DIVINE_ORDER_OPTIONS");
export const PRIMAL_ORDER_OPTIONS = phbOnlyStubConst("PRIMAL_ORDER_OPTIONS");
export const INNATE_SORCERY = phbOnlyStub("INNATE_SORCERY");
export const MAGICAL_CUNNING = phbOnlyStub("MAGICAL_CUNNING");
export const MEMORIZE_SPELL = phbOnlyStub("MEMORIZE_SPELL");
export const CANTRIP_FORMULAS = phbOnlyStub("CANTRIP_FORMULAS");

// Helper: legacy alias kept throwing — 2024 uses spellsPrepared()
// for all classes (everyone prepares from a fixed table).
export const spellsKnown = () => {
  throw new Error(
    "dnd5e_2024: spellsKnown() is not used in 2024 — every class " +
    "prepares from a fixed table. Use spellsPrepared(className, " +
    "classLevel) instead. (Even Bard/Sorcerer/Warlock, which feel " +
    "'known' in 2014, are 'prepared' in 2024; the difference is the " +
    "swap rule, not the prep model.)",
  );
};
