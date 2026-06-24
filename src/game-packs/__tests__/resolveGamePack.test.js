// Tests for the pure useGamePack resolution logic (P1.1).
//
// node:test can't run JSX or resolve the `@/` alias, so it can't mount the
// hook or import the `@/`-using leaf bodies / sync registry. Instead it
// exercises the node-safe resolver the hook delegates to (planGamePack,
// syncState, asyncReducer) against the REAL catalog, with a contract-shaped
// body injected for the sync-body lookup. The real registry->leaf wiring is
// verified by the build. The five behaviors below map 1:1 to the chunk spec.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  planGamePack,
  syncState,
  asyncReducer,
  initialAsyncState,
} from "../resolveGamePack.js";

// A stand-in contract body shaped like a real leaf default export.
const CONTRACT_BODY = {
  resolveForm: () => null,
  vocab: { ABILITY_NAMES: ["str"] },
  content: { getEquipment: () => [] },
  ui: { statBlock: {} },
};
const CONTRACT_KEYS = ["resolveForm", "vocab", "content", "ui"];

// Sync-body lookup that registers only the 2014 D&D edition (like syncBodies).
const only2014 = (id) => (id === "dnd5e_2014" ? CONTRACT_BODY : null);

// 1 — D&D resolves synchronously: loading:false + a full contract body.
test("D&D resolves synchronously with loading:false and a full contract body", () => {
  const plan = planGamePack("dnd5e_2014", only2014);
  assert.equal(plan.canonicalId, "dnd5e_2014");

  const state = syncState(plan);
  assert.notEqual(state, null, "should be a terminal synchronous state");
  assert.equal(state.loading, false);
  assert.equal(state.error, null);
  assert.equal(state.pack, CONTRACT_BODY);
  for (const k of CONTRACT_KEYS) {
    assert.ok(k in state.pack, `contract body missing "${k}"`);
  }
  assert.deepEqual(state.readiness, {
    characterCreation: "ready",
    campaignPlay: "ready",
  });
});

// 2 — A lazy pack goes loading:true -> body.
test("lazy pack: initial state is loading, then resolves to the body", () => {
  assert.deepEqual(initialAsyncState, {
    pack: null,
    loading: true,
    error: null,
  });

  const loaded = asyncReducer(initialAsyncState, {
    type: "loaded",
    body: CONTRACT_BODY,
  });
  assert.equal(loaded.loading, false);
  assert.equal(loaded.pack, CONTRACT_BODY);
  assert.equal(loaded.error, null);
});

// 3 — Aliasing resolves correctly (dnd5e->dnd5e_2014, pf2e->pathfinder_2e).
test("aliasing resolves legacy ids to canonical ids", () => {
  assert.equal(planGamePack("dnd5e", only2014).canonicalId, "dnd5e_2014");
  assert.equal(planGamePack("pf2e", only2014).canonicalId, "pathfinder_2e");
  // Canonical ids pass through unchanged.
  assert.equal(planGamePack("dnd5e_2024", only2014).canonicalId, "dnd5e_2024");
  assert.equal(
    planGamePack("pathfinder_2e", only2014).canonicalId,
    "pathfinder_2e",
  );
  // The alias still drives the sync-body lookup by canonical id.
  assert.equal(planGamePack("dnd5e", only2014).syncBody, CONTRACT_BODY);
});

// 4 — readiness is returned immediately from the catalog, body or not.
test("readiness is available synchronously even when the body is not loaded", () => {
  // PF2e is lazy here (only2014 returns null for it) — no sync body...
  const plan = planGamePack("pf2e", only2014);
  assert.equal(plan.syncBody, null);
  // ...but readiness is present immediately from the eager catalog.
  assert.deepEqual(plan.readiness, {
    characterCreation: "ready",
    campaignPlay: "not_ready",
  });
  // syncState defers to async (null), yet plan.readiness is the gate source.
  assert.equal(syncState(plan), null);
});

// 5 — error path sets `error` and leaves `pack` null.
test("error path: reducer surfaces the error and keeps pack null", () => {
  const err = new Error("import failed");
  const errored = asyncReducer(initialAsyncState, { type: "error", error: err });
  assert.equal(errored.loading, false);
  assert.equal(errored.pack, null);
  assert.equal(errored.error, err);
});

test("unknown pack id is a terminal error state with null pack and readiness", () => {
  const unknown = syncState(planGamePack("does-not-exist", only2014));
  assert.notEqual(unknown, null);
  assert.equal(unknown.pack, null);
  assert.equal(unknown.loading, false);
  assert.ok(unknown.error instanceof Error);
  assert.equal(unknown.readiness, null);
});
