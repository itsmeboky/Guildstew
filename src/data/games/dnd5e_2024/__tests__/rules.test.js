// 2024 D&D rules — martial classes (Vetting Commit 6).
//
// Locks the 2024-specific mechanical deltas from 2014 + verifies the
// 6 martial classes' data is wired correctly. Runs alongside the
// 2014 test file under `npm test` (which globs all
// src/**/__tests__/**/*.test.js).

import { test } from "node:test";
import assert from "node:assert/strict";

import * as rules2024 from "../rules.js";
import * as rules2014 from "../../../../components/dnd5e/dnd5eRules.js";

const MARTIALS = ["Barbarian", "Fighter", "Monk", "Paladin", "Ranger", "Rogue"];
const CASTERS = ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"];

// ─────────────────────────────────────────────
// Class basics — martial coverage + caster stub guard
// ─────────────────────────────────────────────

test("Hit dice: all 6 martials match PHB 2024", () => {
  assert.equal(rules2024.CLASS_HIT_DICE.Barbarian, 12);
  assert.equal(rules2024.CLASS_HIT_DICE.Fighter,   10);
  assert.equal(rules2024.CLASS_HIT_DICE.Monk,      8);
  assert.equal(rules2024.CLASS_HIT_DICE.Paladin,   10);
  assert.equal(rules2024.CLASS_HIT_DICE.Ranger,    10);
  assert.equal(rules2024.CLASS_HIT_DICE.Rogue,     8);
});

test("Hit dice: accessing a caster class throws 'pending Commit 7'", () => {
  for (const cls of CASTERS) {
    assert.throws(
      () => rules2024.CLASS_HIT_DICE[cls],
      /pending Vetting Commit 7/,
      `${cls} should throw until Commit 7`,
    );
  }
});

test("Primary ability discriminated shape: Fighter is OR, Paladin/Monk/Ranger are AND", () => {
  assert.deepEqual(rules2024.CLASS_PRIMARY_ABILITY.Fighter,
    { abilities: ["str", "dex"], mode: "or" });
  assert.deepEqual(rules2024.CLASS_PRIMARY_ABILITY.Monk,
    { abilities: ["dex", "wis"], mode: "and" });
  assert.deepEqual(rules2024.CLASS_PRIMARY_ABILITY.Paladin,
    { abilities: ["str", "cha"], mode: "and" });
  assert.deepEqual(rules2024.CLASS_PRIMARY_ABILITY.Ranger,
    { abilities: ["dex", "wis"], mode: "and" });
  assert.deepEqual(rules2024.CLASS_PRIMARY_ABILITY.Barbarian,
    { abilities: ["str"], mode: "single" });
  assert.deepEqual(rules2024.CLASS_PRIMARY_ABILITY.Rogue,
    { abilities: ["dex"], mode: "single" });
});

test("primaryAbilityDisplay produces the right joined string per mode", () => {
  assert.equal(rules2024.primaryAbilityDisplay("Barbarian"), "Strength");
  assert.equal(rules2024.primaryAbilityDisplay("Fighter"),   "Strength or Dexterity");
  assert.equal(rules2024.primaryAbilityDisplay("Monk"),      "Dexterity & Wisdom");
  assert.equal(rules2024.primaryAbilityDisplay("Paladin"),   "Strength & Charisma");
  assert.equal(rules2024.primaryAbilityDisplay("Ranger"),    "Dexterity & Wisdom");
  assert.equal(rules2024.primaryAbilityDisplay("Rogue"),     "Dexterity");
});

// ─────────────────────────────────────────────
// ASI level lists
// ─────────────────────────────────────────────

test("ASI levels: most martials use universal [4,8,12,16,19]", () => {
  for (const cls of ["Barbarian", "Monk", "Paladin", "Ranger"]) {
    assert.deepEqual(rules2024.ABILITY_SCORE_IMPROVEMENT_LEVELS[cls], [4, 8, 12, 16, 19]);
  }
});

test("ASI levels: Fighter gets bonus at 6 and 14", () => {
  assert.deepEqual(rules2024.ABILITY_SCORE_IMPROVEMENT_LEVELS.Fighter,
    [4, 6, 8, 12, 14, 16, 19]);
});

test("ASI levels: Rogue gets bonus at 10", () => {
  assert.deepEqual(rules2024.ABILITY_SCORE_IMPROVEMENT_LEVELS.Rogue,
    [4, 8, 10, 12, 16, 19]);
});

// ─────────────────────────────────────────────
// Weapon Mastery (2024 new mechanic)
// ─────────────────────────────────────────────

test("Weapon Mastery: Fighter has the most (3 at L1, scales to 6 at L16)", () => {
  assert.equal(rules2024.weaponMasterySlots("Fighter", 1),  3);
  assert.equal(rules2024.weaponMasterySlots("Fighter", 3),  3); // no scale before L4
  assert.equal(rules2024.weaponMasterySlots("Fighter", 4),  4);
  assert.equal(rules2024.weaponMasterySlots("Fighter", 10), 5);
  assert.equal(rules2024.weaponMasterySlots("Fighter", 16), 6);
  assert.equal(rules2024.weaponMasterySlots("Fighter", 20), 6);
});

test("Weapon Mastery: 4 other martials get 2 → 5", () => {
  for (const cls of ["Barbarian", "Paladin", "Ranger", "Rogue"]) {
    assert.equal(rules2024.weaponMasterySlots(cls, 1),  2, `${cls} L1`);
    assert.equal(rules2024.weaponMasterySlots(cls, 4),  3, `${cls} L4`);
    assert.equal(rules2024.weaponMasterySlots(cls, 10), 4, `${cls} L10`);
    assert.equal(rules2024.weaponMasterySlots(cls, 16), 5, `${cls} L16`);
  }
});

test("Weapon Mastery: Monk does NOT get the mechanic in 2024", () => {
  assert.equal(rules2024.weaponMasterySlots("Monk", 1),  0);
  assert.equal(rules2024.weaponMasterySlots("Monk", 20), 0);
});

test("Weapon Mastery: caster classes get 0 (don't have the mechanic)", () => {
  for (const cls of CASTERS) {
    assert.equal(rules2024.weaponMasterySlots(cls, 5), 0, `${cls}`);
  }
});

// ─────────────────────────────────────────────
// Class-specific scaling
// ─────────────────────────────────────────────

test("Barbarian Rage uses scale per PHB table", () => {
  assert.equal(rules2024.rageUsesAtLevel(1),  2);
  assert.equal(rules2024.rageUsesAtLevel(2),  2);
  assert.equal(rules2024.rageUsesAtLevel(3),  3);
  assert.equal(rules2024.rageUsesAtLevel(6),  4);
  assert.equal(rules2024.rageUsesAtLevel(12), 5);
  assert.equal(rules2024.rageUsesAtLevel(17), 6);
  assert.equal(rules2024.rageUsesAtLevel(20), Infinity);
});

test("Barbarian Rage damage scales +2 / +3 / +4", () => {
  assert.equal(rules2024.rageDamageAtLevel(1),  2);
  assert.equal(rules2024.rageDamageAtLevel(8),  2);
  assert.equal(rules2024.rageDamageAtLevel(9),  3);
  assert.equal(rules2024.rageDamageAtLevel(15), 3);
  assert.equal(rules2024.rageDamageAtLevel(16), 4);
});

test("Rogue Sneak Attack dice = ceil(level / 2)", () => {
  assert.equal(rules2024.sneakAttackDice(1),  1);
  assert.equal(rules2024.sneakAttackDice(2),  1);
  assert.equal(rules2024.sneakAttackDice(3),  2);
  assert.equal(rules2024.sneakAttackDice(11), 6);
  assert.equal(rules2024.sneakAttackDice(20), 10);
});

test("Monk Martial Arts die scales d6 → d8 → d10 → d12 in 2024", () => {
  assert.equal(rules2024.martialArtsDie(1),  "d6");
  assert.equal(rules2024.martialArtsDie(4),  "d6");
  assert.equal(rules2024.martialArtsDie(5),  "d8");
  assert.equal(rules2024.martialArtsDie(10), "d8");
  assert.equal(rules2024.martialArtsDie(11), "d10");
  assert.equal(rules2024.martialArtsDie(16), "d10");
  assert.equal(rules2024.martialArtsDie(17), "d12");
  assert.equal(rules2024.martialArtsDie(20), "d12");
});

test("Monk Focus Points = Monk level, starts at L2", () => {
  assert.equal(rules2024.focusPoints(1), 0);
  assert.equal(rules2024.focusPoints(2), 2);
  assert.equal(rules2024.focusPoints(5), 5);
  assert.equal(rules2024.focusPoints(20), 20);
});

test("Paladin Lay on Hands pool = 5 × Paladin level", () => {
  assert.equal(rules2024.layOnHandsPool(1), 5);
  assert.equal(rules2024.layOnHandsPool(5), 25);
  assert.equal(rules2024.layOnHandsPool(20), 100);
});

// ─────────────────────────────────────────────
// Spell slots — 2024 half-caster edition delta
// ─────────────────────────────────────────────

test("2024 half-caster gets slots at L1 (key change from 2014)", () => {
  // The signature 2024 change: a Paladin or Ranger at level 1 has
  // [2] 1st-level slots. In 2014 they have [] (no spellcasting yet).
  assert.deepEqual(rules2024.halfCasterSlots(1), [2]);
  assert.deepEqual(rules2014.halfCasterSlots(1), []);
});

test("2024 vs 2014 half-caster slot tables converge from L2 onward", () => {
  // Single-class slot lookup is identical from L2 up — the L1 edge
  // is the only difference. Both tables fall through `ceil(L/2)`.
  for (const lvl of [2, 3, 4, 5, 7, 9, 11, 13, 15, 17, 20]) {
    assert.deepEqual(
      rules2024.halfCasterSlots(lvl),
      rules2014.halfCasterSlots(lvl),
      `L${lvl} should match`,
    );
  }
});

test("2024 multiclass half-caster contribution rounds UP (key change from 2014)", () => {
  // Per multiclass vetting C.3: Paladin 1 contributes 1 effective
  // caster level in 2024 (was 0 in 2014); Paladin 3 contributes 2
  // (was 1 in 2014).
  assert.equal(rules2024.multiclassHalfCasterContribution(1), 1);
  assert.equal(rules2024.multiclassHalfCasterContribution(2), 1);
  assert.equal(rules2024.multiclassHalfCasterContribution(3), 2);
  assert.equal(rules2024.multiclassHalfCasterContribution(4), 2);
  assert.equal(rules2024.multiclassHalfCasterContribution(5), 3);
  assert.equal(rules2024.multiclassHalfCasterContribution(20), 10);
});

// ─────────────────────────────────────────────
// Prepared spells — Paladin / Ranger fixed tables
// ─────────────────────────────────────────────

test("Paladin / Ranger share the same 2024 prepared spell table from L1 to L20", () => {
  for (let lvl = 1; lvl <= 20; lvl++) {
    assert.equal(
      rules2024.spellsPrepared("Paladin", lvl),
      rules2024.spellsPrepared("Ranger", lvl),
      `L${lvl} should match`,
    );
  }
});

test("Paladin prepared at L1 = 2 spells (2024 starts at L1, not L2)", () => {
  assert.equal(rules2024.spellsPrepared("Paladin", 1), 2);
  // Compare to 2014 which had startLevel: 2 — Paladin L1 prepares 0
  assert.equal(rules2014.spellsPrepared("Paladin", 1, 4 /* cha mod */), 0);
});

test("Paladin prepared at L20 = 15 spells", () => {
  assert.equal(rules2024.spellsPrepared("Paladin", 20), 15);
});

test("Paladin prepared at L17 = 14 (table includes 14/14/15/15 pairs at the top)", () => {
  assert.equal(rules2024.spellsPrepared("Paladin", 17), 14);
  assert.equal(rules2024.spellsPrepared("Paladin", 18), 14);
  assert.equal(rules2024.spellsPrepared("Paladin", 19), 15);
});

test("spellsPrepared for a martial-only class returns null", () => {
  assert.equal(rules2024.spellsPrepared("Barbarian", 5), null);
  assert.equal(rules2024.spellsPrepared("Fighter", 5), null);
  assert.equal(rules2024.spellsPrepared("Monk", 5), null);
  assert.equal(rules2024.spellsPrepared("Rogue", 5), null);
});

test("Paladin SPELLS_KNOWN_TABLE entry flags Divine Smite as always-prepared", () => {
  // 2024: Divine Smite is a spell, always prepared, doesn't count
  // against the prep cap.
  assert.deepEqual(
    rules2024.SPELLS_KNOWN_TABLE.Paladin.alwaysPrepared,
    ["Divine Smite"],
  );
});

test("Ranger SPELLS_KNOWN_TABLE entry flags Hunter's Mark as always-prepared", () => {
  // 2024: Hunter's Mark always prepared, doesn't count against cap.
  // Favored Enemy lets Ranger cast it free (limited uses).
  assert.deepEqual(
    rules2024.SPELLS_KNOWN_TABLE.Ranger.alwaysPrepared,
    ["Hunter's Mark"],
  );
});

test("Paladin + Ranger both swap ONLY 1 prepared spell per long rest in 2024", () => {
  // Per the 2024 SRD spellcasting blob (verified during Commit 6
  // recon — "replace one spell on your list"), both half-casters
  // use swap-1-per-long-rest. The spec doc had Paladin as swap-all,
  // but SRD is canonical per the OGL constraint.
  assert.equal(rules2024.SPELLS_KNOWN_TABLE.Paladin.swapOnLongRest, 1);
  assert.equal(rules2024.SPELLS_KNOWN_TABLE.Ranger.swapOnLongRest, 1);
});

test("All 6 martial classes have null cantrips (no baseline cantrips in 2024)", () => {
  for (const cls of MARTIALS) {
    assert.equal(rules2024.CANTRIPS_KNOWN[cls], null, `${cls} should be null`);
    assert.equal(rules2024.cantripsKnown(cls, 5), 0, `${cls} count should be 0`);
  }
});

// ─────────────────────────────────────────────
// Multiclass — prereqs + grants
// ─────────────────────────────────────────────

test("Multiclass prereqs: Fighter is OR, Paladin/Monk/Ranger are AND", () => {
  assert.equal(rules2024.MULTICLASS_REQUIREMENTS.Fighter.mode, "or");
  assert.equal(rules2024.MULTICLASS_REQUIREMENTS.Monk.mode, "and");
  assert.equal(rules2024.MULTICLASS_REQUIREMENTS.Paladin.mode, "and");
  assert.equal(rules2024.MULTICLASS_REQUIREMENTS.Ranger.mode, "and");
  assert.equal(rules2024.MULTICLASS_REQUIREMENTS.Barbarian.mode, "single");
  assert.equal(rules2024.MULTICLASS_REQUIREMENTS.Rogue.mode, "single");
});

test("meetsMulticlassPrereqs respects OR semantics for Fighter", () => {
  // STR 13, DEX 8 → passes (STR meets prereq)
  assert.equal(rules2024.meetsMulticlassPrereqs("Fighter", { str: 13, dex: 8 }), true);
  // STR 8, DEX 13 → passes (DEX meets prereq)
  assert.equal(rules2024.meetsMulticlassPrereqs("Fighter", { str: 8, dex: 13 }), true);
  // STR 12, DEX 12 → fails (neither meets)
  assert.equal(rules2024.meetsMulticlassPrereqs("Fighter", { str: 12, dex: 12 }), false);
});

test("meetsMulticlassPrereqs respects AND semantics for Paladin", () => {
  // STR 13, CHA 13 → passes
  assert.equal(rules2024.meetsMulticlassPrereqs("Paladin", { str: 13, cha: 13 }), true);
  // STR 13, CHA 12 → fails (CHA below)
  assert.equal(rules2024.meetsMulticlassPrereqs("Paladin", { str: 13, cha: 12 }), false);
  // STR 12, CHA 13 → fails (STR below)
  assert.equal(rules2024.meetsMulticlassPrereqs("Paladin", { str: 12, cha: 13 }), false);
});

test("meetsMulticlassPrereqs single-mode (Barbarian / Rogue)", () => {
  assert.equal(rules2024.meetsMulticlassPrereqs("Barbarian", { str: 13 }), true);
  assert.equal(rules2024.meetsMulticlassPrereqs("Barbarian", { str: 12 }), false);
  assert.equal(rules2024.meetsMulticlassPrereqs("Rogue", { dex: 13 }), true);
});

test("multiclassPrereqDescription renders OR / AND / single correctly", () => {
  assert.equal(rules2024.multiclassPrereqDescription("Fighter"),
    "Strength 13 or Dexterity 13");
  assert.equal(rules2024.multiclassPrereqDescription("Paladin"),
    "Strength 13 and Charisma 13");
  assert.equal(rules2024.multiclassPrereqDescription("Barbarian"),
    "Strength 13");
});

test("Multiclass proficiency grants per Section C.2 (Barbarian drops 'simple weapons')", () => {
  // 2024 delta: Barbarian no longer grants simple weapons on
  // multiclass entry (just shields + martial). Verified against SRD
  // multi_classing.proficiencies.
  assert.deepEqual(rules2024.MULTICLASS_PROFICIENCIES.Barbarian,
    ["Shields", "Martial Weapons"]);
  // Monk grants nothing on entry
  assert.deepEqual(rules2024.MULTICLASS_PROFICIENCIES.Monk, []);
  // Rogue grants light armor + thieves' tools only (no skill choice
  // in 2024 — that was 2014-specific)
  assert.deepEqual(rules2024.MULTICLASS_PROFICIENCIES.Rogue,
    ["Light Armor", "Tool: Thieves' Tools"]);
});

// ─────────────────────────────────────────────
// Caster-class guard — stubs throw, not silently fall back
// ─────────────────────────────────────────────

test("Caster classes throw 'pending Commit 7' on rules.js access", () => {
  for (const cls of CASTERS) {
    assert.throws(
      () => rules2024.CLASS_HIT_DICE[cls],
      /pending Vetting Commit 7/,
    );
    assert.throws(
      () => rules2024.SPELLS_KNOWN_TABLE[cls],
      /pending Vetting Commit 7/,
    );
  }
});

test("Caster-only helpers (getSpellSlots, spellsKnown) throw with clear message", () => {
  assert.throws(
    () => rules2024.getSpellSlots("Wizard", 5),
    /pending Vetting Commit 7/,
  );
  assert.throws(
    () => rules2024.spellsKnown("Bard", 5),
    /pending Vetting Commit 7/,
  );
});

test("DIVINE_ORDER_OPTIONS / PRIMAL_ORDER_OPTIONS throw 'pending Commit 7'", () => {
  assert.throws(
    () => rules2024.DIVINE_ORDER_OPTIONS.Protector,
    /pending Vetting Commit 7/,
  );
  assert.throws(
    () => rules2024.PRIMAL_ORDER_OPTIONS.Warden,
    /pending Vetting Commit 7/,
  );
});

// ─────────────────────────────────────────────
// Universal constants
// ─────────────────────────────────────────────

test("Subclass decision level is 3 for all classes in 2024", () => {
  assert.equal(rules2024.SUBCLASS_DECISION_LEVEL_2024, 3);
});

test("UNIVERSAL_ASI_LEVELS_2024 is frozen and equals [4, 8, 12, 16, 19]", () => {
  assert.deepEqual([...rules2024.UNIVERSAL_ASI_LEVELS_2024], [4, 8, 12, 16, 19]);
  assert.equal(Object.isFrozen(rules2024.UNIVERSAL_ASI_LEVELS_2024), true);
});
