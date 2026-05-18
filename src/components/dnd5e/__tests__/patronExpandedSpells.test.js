// Patron / subclass expanded spell list integration.
//
// Per PHB 2014 Otherworldly Patron: "If a spell on the Expanded
// Spells list isn't on the warlock spell list, it is nonetheless a
// warlock spell for you." Before this wiring, getAllAvailableSpells
// only filtered by class membership, so a Fiend warlock could not
// pick burning hands (it's not on the base warlock list — it's only
// granted via the Fiend's Expanded Spells table). Sourced from
// docs/5e_reference/2014/5e-SRD-Subclasses.json (the "fiend" entry),
// which is OGL-permissible.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SUBCLASS_EXPANDED_SPELLS,
  getExpandedSpellsForSubclass,
} from "../subclassExpandedSpells.js";

test("Fiend warlock L1: burning hands + command unlocked", () => {
  const out = getExpandedSpellsForSubclass("Warlock", "The Fiend", 1);
  assert.ok(out, "Fiend at L1 must return an expanded list");
  assert.deepEqual(
    out.level1.slice().sort(),
    ["Burning Hands", "Command"].sort(),
  );
  // Higher-level patron spells stay gated.
  assert.equal(out.level2, undefined,
    "L1 Fiend warlock must NOT yet see 2nd-level patron spells");
  assert.equal(out.level3, undefined);
});

test("Fiend warlock L5: cumulative — L1 + L3 + L5 patron spells all unlocked", () => {
  const out = getExpandedSpellsForSubclass("Warlock", "The Fiend", 5);
  assert.deepEqual(out.level1.slice().sort(), ["Burning Hands", "Command"].sort());
  assert.deepEqual(out.level2.slice().sort(), ["Blindness/Deafness", "Scorching Ray"].sort());
  assert.deepEqual(out.level3.slice().sort(), ["Fireball", "Stinking Cloud"].sort());
  assert.equal(out.level4, undefined,
    "L5 Fiend warlock must NOT yet see L4 patron spells");
});

test("Fiend warlock L9: full Expanded Spells table unlocked", () => {
  const out = getExpandedSpellsForSubclass("Warlock", "The Fiend", 9);
  assert.deepEqual(out.level4.slice().sort(), ["Fire Shield", "Wall of Fire"].sort());
  assert.deepEqual(out.level5.slice().sort(), ["Flame Strike", "Hallow"].sort());
});

test("Unknown subclass returns null (e.g. Archfey not in SRD)", () => {
  assert.equal(
    getExpandedSpellsForSubclass("Warlock", "The Archfey", 1), null,
    "Archfey patron is not in the 2014 SRD JSON — returns null until sourced from an OGL-compliant pack",
  );
});

test("Missing args return null gracefully", () => {
  assert.equal(getExpandedSpellsForSubclass(null, "The Fiend", 1), null);
  assert.equal(getExpandedSpellsForSubclass("Warlock", null, 1), null);
  assert.equal(getExpandedSpellsForSubclass("Sorcerer", "Draconic Bloodline", 1), null,
    "Sorcerer subclasses have no expanded spells in the 2014 PHB");
});

test("SUBCLASS_EXPANDED_SPELLS data shape: every entry is a {level: {bucket: []}} map", () => {
  for (const [_className, byClass] of Object.entries(SUBCLASS_EXPANDED_SPELLS)) {
    for (const [_subName, bySub] of Object.entries(byClass)) {
      for (const [minLevel, buckets] of Object.entries(bySub)) {
        assert.ok(Number(minLevel) >= 1 && Number(minLevel) <= 20,
          "minLevel must be 1..20");
        for (const [bucket, list] of Object.entries(buckets)) {
          assert.ok(/^(cantrips|level[1-9])$/.test(bucket),
            `Bucket key must be 'cantrips' or 'level1..9' — got ${bucket}`);
          assert.ok(Array.isArray(list), "Bucket value must be a string[]");
          assert.ok(list.every((s) => typeof s === "string" && s.length > 0));
        }
      }
    }
  }
});
