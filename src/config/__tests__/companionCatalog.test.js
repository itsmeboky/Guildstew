// Companion catalog — Pact of the Chain trigger regression.
//
// Earlier, resolveCompanionContext({ className: "Warlock", subclass })
// inferred Pact of the Chain from subclass.toLowerCase().includes("chain").
// But `subclass` is the Patron name (Fiend / Archfey / Great Old One)
// — never "Chain" — so the imp / pseudodragon / quasit / sprite list
// was never appended. The fix takes the Pact Boon explicitly via a
// `pactBoon` argument, sourced from characterData.feature_choices
// in the picker.

import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveCompanionContext } from "../companionCatalog.js";

test("Warlock without Pact of the Chain: base familiar list only", () => {
  const ctx = resolveCompanionContext({
    className: "Warlock",
    subclass: "The Fiend",
    pactBoon: null,
  });
  assert.equal(ctx.kind, "familiar");
  const species = new Set(ctx.list.map((c) => c.species));
  assert.ok(!species.has("Imp"),
    "Base list should NOT include the Chain-only Imp");
  assert.ok(!species.has("Pseudodragon"),
    "Base list should NOT include the Chain-only Pseudodragon");
});

test("Warlock + Pact of the Chain: list extends with imp / pseudodragon / quasit / sprite", () => {
  const ctx = resolveCompanionContext({
    className: "Warlock",
    subclass: "The Fiend",
    pactBoon: "Pact of the Chain",
  });
  assert.equal(ctx.kind, "familiar_chain");
  const species = new Set(ctx.list.map((c) => c.species));
  assert.ok(species.has("Imp"), "Chain list must include Imp");
  assert.ok(species.has("Pseudodragon"), "Chain list must include Pseudodragon");
  assert.ok(species.has("Quasit"), "Chain list must include Quasit");
  assert.ok(species.has("Sprite"), "Chain list must include Sprite");
});

test("Warlock + Pact of the Blade / Tome: familiar list NOT upgraded", () => {
  for (const pactBoon of ["Pact of the Blade", "Pact of the Tome"]) {
    const ctx = resolveCompanionContext({
      className: "Warlock",
      subclass: "The Fiend",
      pactBoon,
    });
    assert.equal(ctx.kind, "familiar",
      `${pactBoon} must not trigger the Chain familiar upgrade`);
    const species = new Set(ctx.list.map((c) => c.species));
    assert.ok(!species.has("Imp"),
      `${pactBoon} list should NOT include the Chain-only Imp`);
  }
});

test("Subclass name containing 'Chain' does NOT trigger Chain upgrade", () => {
  // Regression for the legacy bug: a hypothetical homebrew patron
  // whose name contained "chain" would have incorrectly triggered
  // the Chain familiar list. The Pact Boon is the only signal.
  const ctx = resolveCompanionContext({
    className: "Warlock",
    subclass: "The Chain-Bound Horror",
    pactBoon: "Pact of the Tome",
  });
  assert.equal(ctx.kind, "familiar",
    "Chain upgrade must be driven by Pact Boon, not patron name");
  const species = new Set(ctx.list.map((c) => c.species));
  assert.ok(!species.has("Imp"));
});
