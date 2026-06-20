// Companion catalog — SRD familiar gating.
//
// A Warlock's only SRD familiar source is Pact of the Chain, gained with
// the Pact Boon at level 3. The picker must therefore NOT appear for a
// boon-less warlock, a Tome/Blade warlock, or any warlock below level 3 —
// only Pact of the Chain at level >= 3 surfaces the familiar list (with
// the imp / pseudodragon / quasit / sprite upgrades). Rangers get no SRD
// companion at all, so they never resolve a context.

import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveCompanionContext } from "../companionCatalog.js";

test("Warlock without a Pact Boon: no familiar picker", () => {
  const ctx = resolveCompanionContext({
    className: "Warlock",
    subclass: "The Fiend",
    pactBoon: null,
    level: 3,
  });
  assert.equal(ctx, null, "No boon → no familiar (only Pact of the Chain grants one)");
});

test("Warlock + Pact of the Chain at level 1-2: no familiar picker yet", () => {
  for (const level of [1, 2]) {
    const ctx = resolveCompanionContext({
      className: "Warlock",
      subclass: "The Fiend",
      pactBoon: "Pact of the Chain",
      level,
    });
    assert.equal(ctx, null, `Pact Boon is gained at level 3 — none at level ${level}`);
  }
});

test("Warlock + Pact of the Chain at level 3+: familiar list with imp / pseudodragon / quasit / sprite", () => {
  const ctx = resolveCompanionContext({
    className: "Warlock",
    subclass: "The Fiend",
    pactBoon: "Pact of the Chain",
    level: 3,
  });
  assert.equal(ctx.kind, "familiar_chain");
  const species = new Set(ctx.list.map((c) => c.species));
  assert.ok(species.has("Imp"), "Chain list must include Imp");
  assert.ok(species.has("Pseudodragon"), "Chain list must include Pseudodragon");
  assert.ok(species.has("Quasit"), "Chain list must include Quasit");
  assert.ok(species.has("Sprite"), "Chain list must include Sprite");
});

test("Warlock + Pact of the Blade / Tome: no familiar picker", () => {
  for (const pactBoon of ["Pact of the Blade", "Pact of the Tome"]) {
    const ctx = resolveCompanionContext({
      className: "Warlock",
      subclass: "The Fiend",
      pactBoon,
      level: 10,
    });
    assert.equal(ctx, null, `${pactBoon} does not grant a familiar`);
  }
});

test("Subclass name containing 'Chain' does NOT trigger a familiar", () => {
  // The Pact Boon is the only signal — a patron name is never used.
  const ctx = resolveCompanionContext({
    className: "Warlock",
    subclass: "The Chain-Bound Horror",
    pactBoon: "Pact of the Tome",
    level: 10,
  });
  assert.equal(ctx, null, "Familiar must be driven by Pact Boon, not patron name");
});

test("Ranger never resolves a companion context (Beast Master is non-SRD)", () => {
  for (const subclass of ["Hunter", null]) {
    for (const level of [1, 3, 11, 20]) {
      const ctx = resolveCompanionContext({ className: "Ranger", subclass, level });
      assert.equal(ctx, null, `Ranger (${subclass}, L${level}) must not get a companion picker`);
    }
  }
});
