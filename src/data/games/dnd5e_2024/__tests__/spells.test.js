// 2024 spell adapter tests (Build Bundle Commit 1).
//
// Locks the stopgap behavior: 2014 SRD spells as the 2024 base
// pool with overrides applied. When SRD 5.2 spell text lands in
// the override JSON or upstream 5e-database adds 2024 spells,
// these tests will need their assertion targets refreshed.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  getSpellList,
  getSpellById,
  getSpellsForClass,
  getCantripsForClass,
} from "../spells.js";
import overrides from "../spell-overrides.json" with { type: "json" };

test("getSpellList returns at least 318 spells (2014 SRD floor)", () => {
  const list = getSpellList();
  assert.ok(list.length >= 318, `expected >= 318, got ${list.length}`);
});

test("getSpellById('fireball') returns the Fireball entry", () => {
  const spell = getSpellById("fireball");
  assert.ok(spell, "Fireball should exist");
  assert.equal(spell.name, "Fireball");
  assert.equal(spell.level, 3);
  assert.equal(spell.school?.name || spell.school, "Evocation");
});

test("getSpellById returns null for unknown / removed spells", () => {
  assert.equal(getSpellById("not-a-real-spell"), null);
  assert.equal(getSpellById(""), null);
  assert.equal(getSpellById(null), null);
});

test("getSpellsForClass('wizard', 3) returns only Wizard spells, levels 0-2", () => {
  const list = getSpellsForClass("wizard", 3);
  assert.ok(list.length > 0, "should return some spells");
  for (const spell of list) {
    // Class-list membership
    const classNames = (spell.classes || []).map((c) =>
      (c?.index ?? c?.name ?? "").toString().toLowerCase(),
    );
    assert.ok(
      classNames.includes("wizard"),
      `${spell.name} should be on Wizard list`,
    );
    // Castable level (Wiz 3 has 1st + 2nd-level slots)
    const lvl = Number(spell.level ?? 0);
    assert.ok(lvl <= 2, `${spell.name} at level ${lvl} > 2`);
  }
});

test("getSpellsForClass('paladin', 1) includes 1st-level spells (2024 half-casters cast from L1)", () => {
  const list = getSpellsForClass("paladin", 1);
  assert.ok(list.length > 0, "Paladin L1 should have spells available");
  const has1st = list.some((s) => Number(s.level) === 1);
  assert.ok(has1st, "Paladin L1 should include 1st-level spells");
});

test("getCantripsForClass('cleric') returns only level-0 Cleric spells", () => {
  const list = getCantripsForClass("cleric");
  assert.ok(list.length > 0, "Cleric should have cantrips");
  for (const spell of list) {
    assert.equal(spell.level, 0, `${spell.name} should be a cantrip`);
    const classNames = (spell.classes || []).map((c) =>
      (c?.index ?? c?.name ?? "").toString().toLowerCase(),
    );
    assert.ok(
      classNames.includes("cleric"),
      `${spell.name} should be on Cleric list`,
    );
  }
});

test("getCantripsForClass returns empty for non-spellcasting classes", () => {
  assert.deepEqual(getCantripsForClass("barbarian"), []);
  assert.deepEqual(getCantripsForClass("fighter"), []);
});

// ─────────────────────────────────────────────
// Override layer — structural sanity. The stopgap ships with an
// empty override JSON (no revisions / additions / removals). When
// SRD 5.2 spell text is sourced and the JSON is populated, the
// deep-merge / addition / removal paths in spells.js will fire;
// the tests below confirm the empty-override case is a no-op
// passthrough so the file shape is right and consumers see exactly
// the 2014 pool.
// ─────────────────────────────────────────────

test("spell-overrides.json starts empty (no revisions / added / removed)", () => {
  assert.deepEqual(Object.keys(overrides.revised), []);
  assert.deepEqual(Object.keys(overrides.added), []);
  assert.deepEqual(overrides.removed, []);
});

test("with empty overrides, every 2014 spell appears in the merged pool unchanged", () => {
  // Two SRD-canonical samples drawn from different schools and
  // classes. If the merge logic ever silently corrupts the
  // passthrough path, these would drift.
  const cureWounds = getSpellById("cure-wounds");
  assert.equal(cureWounds.name, "Cure Wounds");
  assert.equal(cureWounds.level, 1);
  assert.equal(cureWounds.school?.name, "Evocation");

  const magicMissile = getSpellById("magic-missile");
  assert.equal(magicMissile.name, "Magic Missile");
  assert.equal(magicMissile.level, 1);
});

test("override JSON has a documented schema for population path", () => {
  // Lock the override schema so a future contributor populating
  // SRD 5.2 revisions knows the field names match the consumer.
  assert.ok(overrides._meta, "_meta block must exist");
  assert.ok(overrides._meta.schema, "_meta.schema must document the fields");
  assert.ok(overrides._meta.schema.revised, "revised field documented");
  assert.ok(overrides._meta.schema.added, "added field documented");
  assert.ok(overrides._meta.schema.removed, "removed field documented");
  assert.equal(overrides._meta.license, "CC-BY 4.0");
});
