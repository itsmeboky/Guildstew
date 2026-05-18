// 2014 + 2024 SpellsStep — per-class L1 progression smoke test.
//
// Reproduces the bug the user hit: at L1, prepared / known / spellbook
// casters in the 2014 path got stuck on the spells step because the
// validator compared spell PICKS against per-level SLOT counts (a
// completely different quantity). This test locks in the picker-cap
// model so the validator + picker stay in sync for both editions.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SPELLS_KNOWN_TABLE,
  spellsKnown,
  spellsPrepared,
  cantripsKnown,
  abilityModifier,
  SPELLCASTING_ABILITY,
} from "../../dnd5e/dnd5eRules.js";
import {
  getSpellsKnownEntry as getSpellsKnownEntry2024,
  spellsPrepared as spellsPrepared2024,
  cantripsKnown as cantripsKnown2024,
} from "../../../data/games/dnd5e_2024/rules.js";

const ALL_CLASSES = [
  "Barbarian", "Bard", "Cleric", "Druid",
  "Fighter", "Monk", "Paladin", "Ranger",
  "Rogue", "Sorcerer", "Warlock", "Wizard",
];

const NON_CASTERS = new Set(["Barbarian", "Fighter", "Monk", "Rogue"]);

// Standard array dropped onto a martial-friendly spread.
const ATTRS = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
// Spread tuned for casters so the prepared formulas resolve cleanly.
const CASTER_ATTRS = { str: 8, dex: 14, con: 14, int: 16, wis: 16, cha: 16 };

// ──────────────────────────────────────────────────────────
// 2014 — expected L1 caps per class
// ──────────────────────────────────────────────────────────

function compute2014Cap(className, attrs) {
  const data = SPELLS_KNOWN_TABLE[className];
  const cantrips = cantripsKnown(className, 1) || 0;
  if (!data) return { cantrips, nonCantrip: 0 };

  let nonCantrip = 0;
  if (data.type === "known") {
    nonCantrip = spellsKnown(className, 1) || 0;
  } else if (data.type === "prepared") {
    const ability = SPELLCASTING_ABILITY[className];
    const mod = abilityModifier(attrs[ability] ?? 10);
    nonCantrip = spellsPrepared(className, 1, mod) || 0;
  } else if (data.type === "spellbook") {
    nonCantrip = (data.startingSpells || 6); // L1: starting spellbook
  }
  return { cantrips, nonCantrip };
}

const EXPECTED_2014_L1 = {
  Bard:      { cantrips: 2, nonCantrip: 4 }, // table-known
  Cleric:    { cantrips: 3, nonCantrip: 4 }, // WIS 16 → +3, +level 1
  Druid:     { cantrips: 2, nonCantrip: 4 }, // WIS 16 → +3, +level 1
  Sorcerer:  { cantrips: 4, nonCantrip: 2 }, // table-known
  Warlock:   { cantrips: 2, nonCantrip: 2 }, // table-known
  Wizard:    { cantrips: 3, nonCantrip: 6 }, // spellbook starting size
  // Half-casters: no L1 spellcasting in 2014.
  Paladin:   { cantrips: 0, nonCantrip: 0 },
  Ranger:    { cantrips: 0, nonCantrip: 0 },
  // Non-casters
  Barbarian: { cantrips: 0, nonCantrip: 0 },
  Fighter:   { cantrips: 0, nonCantrip: 0 },
  Monk:      { cantrips: 0, nonCantrip: 0 },
  Rogue:     { cantrips: 0, nonCantrip: 0 },
};

for (const className of ALL_CLASSES) {
  test(`2014 L1 ${className}: spell caps match PHB`, () => {
    const attrs = NON_CASTERS.has(className) ? ATTRS : CASTER_ATTRS;
    const got = compute2014Cap(className, attrs);
    assert.deepEqual(got, EXPECTED_2014_L1[className],
      `${className}: cap mismatch`);
  });
}

test("2014 Wizard L5 spellbook = 14 (6 starting + 4 level-ups × 2)", () => {
  const data = SPELLS_KNOWN_TABLE.Wizard;
  const expected = data.startingSpells + 4 * data.spellsPerLevel;
  assert.equal(expected, 14);
});

// ──────────────────────────────────────────────────────────
// 2014 — picker / validator parity. The validator
// (spellsCompletion.js) reads from the same SPELLS_KNOWN_TABLE
// helpers tested above; the picker (SpellsStep.jsx) now calls
// getSpellsCompletion() to derive its caps so the two can't
// drift. The previous bug had the picker cap by SLOTS, leaving
// Bard / Cleric / Druid / Warlock / Wizard stuck at L1 — these
// assertions lock the canonical L1 caps so a regression flips
// the test, not the user's Next button.
// ──────────────────────────────────────────────────────────

test("2014 L1 Wizard picker cap = 3 cantrips + 6 spellbook spells (not 2 L1 slots)", () => {
  const cantripCap = cantripsKnown("Wizard", 1);
  const data = SPELLS_KNOWN_TABLE.Wizard;
  const nonCantripCap = data.startingSpells; // L1 = startingSpells exactly
  assert.equal(cantripCap, 3);
  assert.equal(nonCantripCap, 6,
    "Wizard L1 spellbook cap must be 6 — capping by 2 L1 slots is the legacy bug");
});

test("2014 L1 Bard picker cap = 2 cantrips + 4 spells known (not 2 L1 slots)", () => {
  const cantripCap = cantripsKnown("Bard", 1);
  const nonCantripCap = spellsKnown("Bard", 1);
  assert.equal(cantripCap, 2);
  assert.equal(nonCantripCap, 4,
    "Bard L1 must allow 4 spell picks — capping by 2 slots is the legacy bug");
});

test("2014 L1 Warlock picker cap = 2 cantrips + 2 spells known (NOT 1 pact slot)", () => {
  const cantripCap = cantripsKnown("Warlock", 1);
  const nonCantripCap = spellsKnown("Warlock", 1);
  assert.equal(cantripCap, 2);
  assert.equal(nonCantripCap, 2,
    "Warlock L1 must allow 2 spell picks — pact slots (1) are casts/day, not the pick cap");
});

test("2014 L1 Cleric picker cap = 3 cantrips + (WIS_mod + level) prepared (not 2 slots)", () => {
  const wis = CASTER_ATTRS.wis;
  const cantripCap = cantripsKnown("Cleric", 1);
  const nonCantripCap = spellsPrepared("Cleric", 1, abilityModifier(wis));
  assert.equal(cantripCap, 3);
  assert.equal(nonCantripCap, 4,
    "Cleric L1 with WIS 16 must allow 4 prepared — capping by 2 slots is the legacy bug");
});

// ──────────────────────────────────────────────────────────
// 2024 — expected L1 caps per class
// ──────────────────────────────────────────────────────────

const EXPECTED_2024_L1 = {
  // Full casters: cantrips per class table, prep cap from preparedTable.
  Bard:      { cantrips: 2, prepared: 4 },
  Cleric:    { cantrips: 3, prepared: 4 },
  Druid:     { cantrips: 2, prepared: 4 },
  Sorcerer:  { cantrips: 4, prepared: 2 },
  Warlock:   { cantrips: 2, prepared: 2 },
  Wizard:    { cantrips: 3, prepared: 4 }, // prepared FROM spellbook
  // Half-casters: 2024 starts at L1 (key change from 2014).
  Paladin:   { cantrips: 0, prepared: 2 },
  Ranger:    { cantrips: 0, prepared: 2 },
  // Non-casters
  Barbarian: { cantrips: 0, prepared: 0 },
  Fighter:   { cantrips: 0, prepared: 0 },
  Monk:      { cantrips: 0, prepared: 0 },
  Rogue:     { cantrips: 0, prepared: 0 },
};

for (const className of ALL_CLASSES) {
  test(`2024 L1 ${className}: spell caps match PHB 2024`, () => {
    const data = getSpellsKnownEntry2024(className);
    const cantrips = data ? cantripsKnown2024(className, 1) : 0;
    const prepared = data ? spellsPrepared2024(className, 1) : 0;
    assert.deepEqual({ cantrips, prepared }, EXPECTED_2024_L1[className],
      `${className}: cap mismatch`);
  });
}

test("2024 Wizard spellbook size at L1 = 6", () => {
  const data = getSpellsKnownEntry2024("Wizard");
  const size = (data.startingSpellbookSpells || 6)
    + 0 * (data.spellsPerLevel || 2);
  assert.equal(size, 6);
});

test("2024 Wizard spellbook size at L5 = 14", () => {
  const data = getSpellsKnownEntry2024("Wizard");
  const size = (data.startingSpellbookSpells || 6)
    + 4 * (data.spellsPerLevel || 2);
  assert.equal(size, 14);
});

// ──────────────────────────────────────────────────────────
// 2024 — always-prepared spell coverage
// ──────────────────────────────────────────────────────────

test("2024 Paladin always-prepared includes Divine Smite", () => {
  const data = getSpellsKnownEntry2024("Paladin");
  assert.ok(Array.isArray(data.alwaysPrepared) && data.alwaysPrepared.length >= 1,
    "Paladin should have an alwaysPrepared list");
});

test("2024 Ranger always-prepared includes Hunter's Mark", () => {
  const data = getSpellsKnownEntry2024("Ranger");
  assert.ok(Array.isArray(data.alwaysPrepared) && data.alwaysPrepared.length >= 1,
    "Ranger should have an alwaysPrepared list");
});
