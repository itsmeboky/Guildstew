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

test("Hit dice: all 6 casters match PHB 2024", () => {
  assert.equal(rules2024.CLASS_HIT_DICE.Bard,     8);
  assert.equal(rules2024.CLASS_HIT_DICE.Cleric,   8);
  assert.equal(rules2024.CLASS_HIT_DICE.Druid,    8);
  assert.equal(rules2024.CLASS_HIT_DICE.Sorcerer, 6);
  assert.equal(rules2024.CLASS_HIT_DICE.Warlock,  8);
  assert.equal(rules2024.CLASS_HIT_DICE.Wizard,   6);
});

test("Hit dice: unknown class throws", () => {
  assert.throws(
    () => rules2024.CLASS_HIT_DICE.Mountebank,
    /unknown class/,
  );
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
// PHB-2024-only feature names — not in OGL SRD JSON
// ─────────────────────────────────────────────
//
// Names like Divine Order, Primal Order, Innate Sorcery, Magical
// Cunning, Memorize Spell, and Cantrip Formulas are 2024 PHB
// features that don't appear in any SRD JSON file. The MECHANICS
// each represents is encoded under generic data fields on the
// SPELLS_KNOWN_TABLE entry; the feature NAMES throw to keep them
// out of stored content per the OGL discipline.

test("PHB-only feature name surfaces throw with a clear OGL message", () => {
  assert.throws(
    () => rules2024.DIVINE_ORDER_OPTIONS.Protector,
    /PHB-2024-only feature not present in the OGL SRD JSON/,
  );
  assert.throws(
    () => rules2024.PRIMAL_ORDER_OPTIONS.Warden,
    /PHB-2024-only feature not present in the OGL SRD JSON/,
  );
  assert.throws(
    () => rules2024.INNATE_SORCERY(),
    /PHB-2024-only feature not present in the OGL SRD JSON/,
  );
  assert.throws(
    () => rules2024.MAGICAL_CUNNING(),
    /PHB-2024-only feature not present in the OGL SRD JSON/,
  );
  assert.throws(
    () => rules2024.MEMORIZE_SPELL(),
    /PHB-2024-only feature not present in the OGL SRD JSON/,
  );
  assert.throws(
    () => rules2024.CANTRIP_FORMULAS(),
    /PHB-2024-only feature not present in the OGL SRD JSON/,
  );
});

test("spellsKnown() now throws — 2024 uses spellsPrepared() for all classes", () => {
  // Legacy alias kept for API compatibility; throws with a
  // clear message directing consumers to spellsPrepared().
  assert.throws(
    () => rules2024.spellsKnown("Bard", 5),
    /every class prepares from a fixed table/,
  );
});

test("Unknown class names throw a clear 'unknown class' message", () => {
  assert.throws(
    () => rules2024.SPELLS_KNOWN_TABLE.Mountebank,
    /unknown class/,
  );
  assert.throws(
    () => rules2024.MULTICLASS_REQUIREMENTS.Magus,
    /unknown class/,
  );
});

// ─────────────────────────────────────────────
// CASTER CLASSES (Commit 7) — class basics + multiclass + cantrips
// ─────────────────────────────────────────────

test("Caster classes have correct saving throws", () => {
  assert.deepEqual(rules2024.CLASS_SAVING_THROWS.Bard,     ["dex", "cha"]);
  assert.deepEqual(rules2024.CLASS_SAVING_THROWS.Cleric,   ["wis", "cha"]);
  assert.deepEqual(rules2024.CLASS_SAVING_THROWS.Druid,    ["int", "wis"]);
  assert.deepEqual(rules2024.CLASS_SAVING_THROWS.Sorcerer, ["con", "cha"]);
  assert.deepEqual(rules2024.CLASS_SAVING_THROWS.Warlock,  ["wis", "cha"]);
  assert.deepEqual(rules2024.CLASS_SAVING_THROWS.Wizard,   ["int", "wis"]);
});

test("Caster classes are all single-mode primary ability", () => {
  for (const cls of CASTERS) {
    assert.equal(rules2024.CLASS_PRIMARY_ABILITY[cls].mode, "single");
  }
});

test("Caster multiclass prereqs are single-ability 13", () => {
  assert.deepEqual(rules2024.MULTICLASS_REQUIREMENTS.Bard.entries,     [{ ability: "cha", min: 13 }]);
  assert.deepEqual(rules2024.MULTICLASS_REQUIREMENTS.Cleric.entries,   [{ ability: "wis", min: 13 }]);
  assert.deepEqual(rules2024.MULTICLASS_REQUIREMENTS.Druid.entries,    [{ ability: "wis", min: 13 }]);
  assert.deepEqual(rules2024.MULTICLASS_REQUIREMENTS.Sorcerer.entries, [{ ability: "cha", min: 13 }]);
  assert.deepEqual(rules2024.MULTICLASS_REQUIREMENTS.Warlock.entries,  [{ ability: "cha", min: 13 }]);
  assert.deepEqual(rules2024.MULTICLASS_REQUIREMENTS.Wizard.entries,   [{ ability: "int", min: 13 }]);
});

test("Caster multiclass proficiencies match 2024 SRD", () => {
  assert.deepEqual(rules2024.MULTICLASS_PROFICIENCIES.Bard,     ["Light Armor"]);
  assert.deepEqual(rules2024.MULTICLASS_PROFICIENCIES.Cleric,   ["Light Armor", "Medium Armor", "Shields"]);
  assert.deepEqual(rules2024.MULTICLASS_PROFICIENCIES.Druid,    ["Light Armor", "Shields"]);
  assert.deepEqual(rules2024.MULTICLASS_PROFICIENCIES.Sorcerer, []);
  assert.deepEqual(rules2024.MULTICLASS_PROFICIENCIES.Warlock,  ["Light Armor"]);
  assert.deepEqual(rules2024.MULTICLASS_PROFICIENCIES.Wizard,   []);
});

test("Caster ASI levels all use universal [4, 8, 12, 16, 19]", () => {
  for (const cls of CASTERS) {
    assert.deepEqual(rules2024.ABILITY_SCORE_IMPROVEMENT_LEVELS[cls],
      [4, 8, 12, 16, 19]);
  }
});

test("Cantrips known: caster table values match 2024 PHB", () => {
  assert.deepEqual(rules2024.CANTRIPS_KNOWN.Bard,     { 1: 2, 4: 3, 10: 4 });
  assert.deepEqual(rules2024.CANTRIPS_KNOWN.Cleric,   { 1: 3, 4: 4, 10: 5 });
  assert.deepEqual(rules2024.CANTRIPS_KNOWN.Druid,    { 1: 2, 4: 3, 10: 4 });
  assert.deepEqual(rules2024.CANTRIPS_KNOWN.Sorcerer, { 1: 4, 4: 5, 10: 6 });
  assert.deepEqual(rules2024.CANTRIPS_KNOWN.Warlock,  { 1: 2, 4: 3, 10: 4 });
  assert.deepEqual(rules2024.CANTRIPS_KNOWN.Wizard,   { 1: 3, 4: 4, 10: 5 });
});

test("cantripsKnown(): Sorcerer scales 4 → 5 → 6", () => {
  assert.equal(rules2024.cantripsKnown("Sorcerer", 1),  4);
  assert.equal(rules2024.cantripsKnown("Sorcerer", 3),  4);
  assert.equal(rules2024.cantripsKnown("Sorcerer", 4),  5);
  assert.equal(rules2024.cantripsKnown("Sorcerer", 9),  5);
  assert.equal(rules2024.cantripsKnown("Sorcerer", 10), 6);
  assert.equal(rules2024.cantripsKnown("Sorcerer", 20), 6);
});

// ─────────────────────────────────────────────
// SPELLS_KNOWN_TABLE — prepared counts per class per level
// ─────────────────────────────────────────────

test("Cleric / Druid share the same 2024 prepared table", () => {
  for (let lvl = 1; lvl <= 20; lvl++) {
    assert.equal(
      rules2024.spellsPrepared("Cleric", lvl),
      rules2024.spellsPrepared("Druid", lvl),
      `L${lvl} should match`,
    );
  }
});

test("Cleric prepared: L1=4, L13=17, L14=17 (flat), L20=22", () => {
  assert.equal(rules2024.spellsPrepared("Cleric", 1),  4);
  assert.equal(rules2024.spellsPrepared("Cleric", 13), 17);
  assert.equal(rules2024.spellsPrepared("Cleric", 14), 17); // 13/14 flat
  assert.equal(rules2024.spellsPrepared("Cleric", 20), 22);
});

test("Bard prepared: tops at 22 by L18 (differs from Cleric/Druid)", () => {
  // Bard hits 22 at L18 and stays. Cleric/Druid climb to 22 only at
  // L20 via 21 at L19. Spot-check the divergence.
  assert.equal(rules2024.spellsPrepared("Bard", 1),  4);
  assert.equal(rules2024.spellsPrepared("Bard", 13), 17);
  assert.equal(rules2024.spellsPrepared("Bard", 14), 18); // 13→14 (Cleric is flat 17 here)
  assert.equal(rules2024.spellsPrepared("Bard", 17), 20);
  assert.equal(rules2024.spellsPrepared("Bard", 18), 22);
  assert.equal(rules2024.spellsPrepared("Bard", 20), 22);
});

test("Sorcerer prepared: L1=2 (lower than other full casters)", () => {
  // Sorcerer is the only full caster that starts with 2 prepared at
  // L1; everyone else starts at 4 (or 2 for half-casters / Warlock).
  assert.equal(rules2024.spellsPrepared("Sorcerer", 1), 2);
  assert.equal(rules2024.spellsPrepared("Sorcerer", 2), 4);
  assert.equal(rules2024.spellsPrepared("Sorcerer", 3), 6);
  assert.equal(rules2024.spellsPrepared("Sorcerer", 20), 22);
});

test("Warlock prepared: 2 → 15 (gentle slope, ends lower than full casters)", () => {
  assert.equal(rules2024.spellsPrepared("Warlock", 1),  2);
  assert.equal(rules2024.spellsPrepared("Warlock", 5),  6);
  assert.equal(rules2024.spellsPrepared("Warlock", 10), 10);
  assert.equal(rules2024.spellsPrepared("Warlock", 20), 15);
});

test("Wizard prepared: tops at 25 by L20 (highest of any class)", () => {
  // Wizard has the highest prep ceiling — climbs past 19/20/22 to
  // 21/22/23/24/25 in L16-20.
  assert.equal(rules2024.spellsPrepared("Wizard", 1),  4);
  assert.equal(rules2024.spellsPrepared("Wizard", 15), 19);
  assert.equal(rules2024.spellsPrepared("Wizard", 16), 21);
  assert.equal(rules2024.spellsPrepared("Wizard", 20), 25);
});

// ─────────────────────────────────────────────
// Swap rules — distinct per class per 2024 SRD
// ─────────────────────────────────────────────

test("Swap rules: Cleric / Druid / Wizard swap ALL on Long Rest", () => {
  for (const cls of ["Cleric", "Druid", "Wizard"]) {
    const entry = rules2024.SPELLS_KNOWN_TABLE[cls];
    assert.equal(entry.swapOnLongRest, "all", `${cls}.swapOnLongRest`);
    assert.equal(entry.swapOnLevelUp, 0, `${cls}.swapOnLevelUp`);
  }
});

test("Swap rules: Paladin / Ranger swap 1 on Long Rest", () => {
  for (const cls of ["Paladin", "Ranger"]) {
    const entry = rules2024.SPELLS_KNOWN_TABLE[cls];
    assert.equal(entry.swapOnLongRest, 1, `${cls}.swapOnLongRest`);
    assert.equal(entry.swapOnLevelUp, 0, `${cls}.swapOnLevelUp`);
  }
});

test("Swap rules: Bard / Sorcerer / Warlock swap 1 on Level-Up (NOT on LR)", () => {
  // Per 2024 SRD verified during Commit 6 recon — these three swap
  // on level-up only, not on long rest.
  for (const cls of ["Bard", "Sorcerer", "Warlock"]) {
    const entry = rules2024.SPELLS_KNOWN_TABLE[cls];
    assert.equal(entry.swapOnLongRest, 0, `${cls}.swapOnLongRest`);
    assert.equal(entry.swapOnLevelUp, 1, `${cls}.swapOnLevelUp`);
  }
});

// ─────────────────────────────────────────────
// Spell slots — full caster + half + pact
// ─────────────────────────────────────────────

test("getSpellSlots: full caster returns FULL_CASTER_SLOTS[L]", () => {
  for (const cls of ["Bard", "Cleric", "Druid", "Sorcerer", "Wizard"]) {
    assert.deepEqual(rules2024.getSpellSlots(cls, 5),  [4, 3, 2], `${cls} L5`);
    assert.deepEqual(rules2024.getSpellSlots(cls, 20),
      [4, 3, 3, 3, 3, 2, 2, 1, 1], `${cls} L20`);
  }
});

test("getSpellSlots: half caster routes to halfCasterSlots()", () => {
  for (const cls of ["Paladin", "Ranger"]) {
    assert.deepEqual(rules2024.getSpellSlots(cls, 1), [2], `${cls} L1`);
    assert.deepEqual(rules2024.getSpellSlots(cls, 5), [4, 2], `${cls} L5`);
  }
});

test("getSpellSlots: Warlock returns [] (use getPactSlots instead)", () => {
  // Pact Magic is a separate pool; don't combine with the
  // multiclass-spellcaster table.
  assert.deepEqual(rules2024.getSpellSlots("Warlock", 5), []);
  assert.deepEqual(rules2024.getSpellSlots("Warlock", 20), []);
});

test("getSpellSlots: martial-only classes return []", () => {
  for (const cls of ["Barbarian", "Fighter", "Monk", "Rogue"]) {
    assert.deepEqual(rules2024.getSpellSlots(cls, 5),  [], `${cls}`);
    assert.deepEqual(rules2024.getSpellSlots(cls, 20), [], `${cls}`);
  }
});

// ─────────────────────────────────────────────
// Warlock Pact Magic — slots + Mystic Arcanum + Invocations
// ─────────────────────────────────────────────

test("Pact slots: 1@1st → 2@1st → 2@2nd → ... → 4@5th", () => {
  assert.deepEqual(rules2024.getPactSlots(1),  { slots: 1, level: 1 });
  assert.deepEqual(rules2024.getPactSlots(2),  { slots: 2, level: 1 });
  assert.deepEqual(rules2024.getPactSlots(3),  { slots: 2, level: 2 });
  assert.deepEqual(rules2024.getPactSlots(5),  { slots: 2, level: 3 });
  assert.deepEqual(rules2024.getPactSlots(7),  { slots: 2, level: 4 });
  assert.deepEqual(rules2024.getPactSlots(9),  { slots: 2, level: 5 });
  assert.deepEqual(rules2024.getPactSlots(11), { slots: 3, level: 5 });
  assert.deepEqual(rules2024.getPactSlots(17), { slots: 4, level: 5 });
  assert.deepEqual(rules2024.getPactSlots(20), { slots: 4, level: 5 });
});

test("Mystic Arcanum: grants 1 free cast per spell level at 11/13/15/17", () => {
  assert.deepEqual(rules2024.mysticArcanumLevels(10), []);
  assert.deepEqual(rules2024.mysticArcanumLevels(11), [6]);
  assert.deepEqual(rules2024.mysticArcanumLevels(13), [6, 7]);
  assert.deepEqual(rules2024.mysticArcanumLevels(15), [6, 7, 8]);
  assert.deepEqual(rules2024.mysticArcanumLevels(17), [6, 7, 8, 9]);
  assert.deepEqual(rules2024.mysticArcanumLevels(20), [6, 7, 8, 9]);
});

test("Eldritch Invocations: 1 at L1 (2024 starts earlier than 2014), 10 by L18", () => {
  // 2024 grants the first Invocation at level 1; 2014 started at L2.
  assert.equal(rules2024.eldritchInvocationsKnown(1),  1);
  assert.equal(rules2024.eldritchInvocationsKnown(2),  3);
  assert.equal(rules2024.eldritchInvocationsKnown(5),  5);
  assert.equal(rules2024.eldritchInvocationsKnown(7),  6);
  assert.equal(rules2024.eldritchInvocationsKnown(9),  7);
  assert.equal(rules2024.eldritchInvocationsKnown(12), 8);
  assert.equal(rules2024.eldritchInvocationsKnown(15), 9);
  assert.equal(rules2024.eldritchInvocationsKnown(18), 10);
  assert.equal(rules2024.eldritchInvocationsKnown(20), 10);
});

// ─────────────────────────────────────────────
// Sorcerer mechanics
// ─────────────────────────────────────────────

test("Sorcery Points = Sorcerer level, starts at L2", () => {
  assert.equal(rules2024.sorceryPoints(1), 0);
  assert.equal(rules2024.sorceryPoints(2), 2);
  assert.equal(rules2024.sorceryPoints(5), 5);
  assert.equal(rules2024.sorceryPoints(20), 20);
});

test("Metamagic known: 2 at L2 (2024 change from L3 in 2014), +1 at L10, +1 at L17", () => {
  assert.equal(rules2024.metamagicKnown(1),  0);
  assert.equal(rules2024.metamagicKnown(2),  2); // 2024: starts at L2
  assert.equal(rules2024.metamagicKnown(9),  2);
  assert.equal(rules2024.metamagicKnown(10), 3);
  assert.equal(rules2024.metamagicKnown(16), 3);
  assert.equal(rules2024.metamagicKnown(17), 4);
  assert.equal(rules2024.metamagicKnown(20), 4);
});

// ─────────────────────────────────────────────
// Channel Divinity — Cleric + Paladin (per-class scaling)
// ─────────────────────────────────────────────

test("Channel Divinity (Cleric): 2 / 3 / 4 at L2 / L6 / L18", () => {
  assert.equal(rules2024.channelDivinityUses("Cleric", 1),  0);
  assert.equal(rules2024.channelDivinityUses("Cleric", 2),  2);
  assert.equal(rules2024.channelDivinityUses("Cleric", 5),  2);
  assert.equal(rules2024.channelDivinityUses("Cleric", 6),  3);
  assert.equal(rules2024.channelDivinityUses("Cleric", 17), 3);
  assert.equal(rules2024.channelDivinityUses("Cleric", 18), 4);
  assert.equal(rules2024.channelDivinityUses("Cleric", 20), 4);
});

test("Channel Divinity (Paladin): 1 / 2 at L3 / L7", () => {
  assert.equal(rules2024.channelDivinityUses("Paladin", 2), 0);
  assert.equal(rules2024.channelDivinityUses("Paladin", 3), 1);
  assert.equal(rules2024.channelDivinityUses("Paladin", 6), 1);
  assert.equal(rules2024.channelDivinityUses("Paladin", 7), 2);
  assert.equal(rules2024.channelDivinityUses("Paladin", 20), 2);
});

test("Channel Divinity returns 0 for non-CD classes", () => {
  for (const cls of ["Barbarian", "Bard", "Druid", "Fighter", "Monk", "Ranger",
                     "Rogue", "Sorcerer", "Warlock", "Wizard"]) {
    assert.equal(rules2024.channelDivinityUses(cls, 5), 0, `${cls}`);
  }
});

// ─────────────────────────────────────────────
// Wizard-specific mechanics (spellbook, ritual, swap rules)
// ─────────────────────────────────────────────

test("Wizard: spellbook starts with 6 1st-level spells, +2 per level", () => {
  const entry = rules2024.SPELLS_KNOWN_TABLE.Wizard;
  assert.equal(entry.type, "spellbook");
  assert.equal(entry.startingSpellbookSpells, 6);
  assert.equal(entry.spellsPerLevel, 2);
});

test("Wizard: ritualCastingFromSpellbook flag is set (mechanic for L1 feature)", () => {
  // PHB-2024 name for this is 'Ritual Adept'. Name isn't shipped;
  // the mechanic is encoded as a boolean flag on the table entry.
  assert.equal(rules2024.SPELLS_KNOWN_TABLE.Wizard.ritualCastingFromSpellbook, true);
});

test("Wizard: swapOnShortRest mechanic at L5 (PHB 'Memorize Spell' name not shipped)", () => {
  const entry = rules2024.SPELLS_KNOWN_TABLE.Wizard;
  assert.equal(entry.swapOnShortRest, 1);
  assert.equal(entry.swapOnShortRestStartLevel, 5);
});

test("Wizard: cantripSwapOnLongRest mechanic (PHB 'Cantrip Formulas' name not shipped)", () => {
  assert.equal(rules2024.SPELLS_KNOWN_TABLE.Wizard.cantripSwapOnLongRest, 1);
});

// ─────────────────────────────────────────────
// Sorcerer / Warlock mechanic flags (PHB-only names not shipped)
// ─────────────────────────────────────────────

test("Sorcerer L1 spell-buff mechanic encoded as data field (PHB 'Innate Sorcery' name not shipped)", () => {
  const buff = rules2024.SPELLS_KNOWN_TABLE.Sorcerer.level1SpellcastingBuff;
  assert.ok(buff, "buff data field should exist");
  assert.equal(buff.durationMinutes, 1);
  assert.equal(buff.spellSaveDcBonus, 1);
  assert.equal(buff.spellAttackAdvantage, true);
  assert.equal(buff.usesPerLongRest, 2);
});

test("Warlock L2 slot-recovery mechanic encoded as data field (PHB 'Magical Cunning' name not shipped)", () => {
  const recover = rules2024.SPELLS_KNOWN_TABLE.Warlock.level2RecoverPactSlots;
  assert.ok(recover, "recover data field should exist");
  assert.equal(recover.fractionOfMax, 0.5);
  assert.equal(recover.rounding, "up");
  assert.equal(recover.usesPerLongRest, 1);
});

test("Cleric / Druid: L1 class-path-choice flag set (PHB names not shipped)", () => {
  // Mechanically distinct L1 choice exists for both. PHB names
  // (Divine Order, Primal Order) aren't shipped — flag only.
  assert.equal(rules2024.SPELLS_KNOWN_TABLE.Cleric.level1ClassPathChoice, true);
  assert.equal(rules2024.SPELLS_KNOWN_TABLE.Druid.level1ClassPathChoice, true);
});

test("Warlock: Pact Boon comes at L3 (per 2024 PHB; OGL name kept)", () => {
  // 'Pact Boon' is in 2014 SRD — OGL-permissible name.
  assert.equal(rules2024.SPELLS_KNOWN_TABLE.Warlock.pactBoonAtLevel, 3);
});

// ─────────────────────────────────────────────
// Bard / Cleric multiclass prereq display
// ─────────────────────────────────────────────

test("multiclassPrereqDescription for casters returns single-mode string", () => {
  assert.equal(rules2024.multiclassPrereqDescription("Bard"),     "Charisma 13");
  assert.equal(rules2024.multiclassPrereqDescription("Cleric"),   "Wisdom 13");
  assert.equal(rules2024.multiclassPrereqDescription("Druid"),    "Wisdom 13");
  assert.equal(rules2024.multiclassPrereqDescription("Sorcerer"), "Charisma 13");
  assert.equal(rules2024.multiclassPrereqDescription("Warlock"),  "Charisma 13");
  assert.equal(rules2024.multiclassPrereqDescription("Wizard"),   "Intelligence 13");
});

test("meetsMulticlassPrereqs respects single-mode for all casters", () => {
  assert.equal(rules2024.meetsMulticlassPrereqs("Wizard", { int: 13 }), true);
  assert.equal(rules2024.meetsMulticlassPrereqs("Wizard", { int: 12 }), false);
  assert.equal(rules2024.meetsMulticlassPrereqs("Cleric", { wis: 13 }), true);
  assert.equal(rules2024.meetsMulticlassPrereqs("Sorcerer", { cha: 13, dex: 8 }), true);
});

// ─────────────────────────────────────────────
// Universal constants (kept from Commit 6)
// ─────────────────────────────────────────────

test("Subclass decision level is 3 for all classes in 2024", () => {
  assert.equal(rules2024.SUBCLASS_DECISION_LEVEL_2024, 3);
});

test("UNIVERSAL_ASI_LEVELS_2024 is frozen and equals [4, 8, 12, 16, 19]", () => {
  assert.deepEqual([...rules2024.UNIVERSAL_ASI_LEVELS_2024], [4, 8, 12, 16, 19]);
  assert.equal(Object.isFrozen(rules2024.UNIVERSAL_ASI_LEVELS_2024), true);
});
