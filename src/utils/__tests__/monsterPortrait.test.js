// Monster portrait resolver — gate, type normalization, crest URL, CR band.
//
// The gate (MONSTER_PORTRAITS_ENABLED) defaults OFF with a hardcoded
// false fallback, so under `node --test` (no VITE_ env) every monster
// must resolve to its type crest, never an AI portrait.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MONSTER_PORTRAITS_ENABLED,
  MONSTER_TYPE_COLORS,
  normalizeMonsterType,
  getMonsterCrestUrl,
  getMonsterPortrait,
  getCrestCrBand,
  isCrestUrl,
} from "../monsterPortrait.js";

test("gate is OFF by default (no env wired)", () => {
  assert.equal(MONSTER_PORTRAITS_ENABLED, false);
});

test("14 SRD types are mapped to hex colors", () => {
  assert.equal(Object.keys(MONSTER_TYPE_COLORS).length, 14);
  for (const [type, hex] of Object.entries(MONSTER_TYPE_COLORS)) {
    assert.match(hex, /^#[0-9A-Fa-f]{6}$/, `${type} should be a hex color`);
  }
});

test("normalizeMonsterType strips parenthetical subtypes", () => {
  assert.equal(normalizeMonsterType("humanoid (goblinoid)"), "Humanoid");
  assert.equal(normalizeMonsterType("fiend (demon)"), "Fiend");
  assert.equal(normalizeMonsterType("Celestial (angel)"), "Celestial");
});

test("normalizeMonsterType handles swarm phrasing and plurals", () => {
  assert.equal(normalizeMonsterType("swarm of Tiny beasts"), "Beast");
});

test("normalizeMonsterType is case-insensitive", () => {
  assert.equal(normalizeMonsterType("DRAGON"), "Dragon");
  assert.equal(normalizeMonsterType("ooze"), "Ooze");
});

test("normalizeMonsterType defaults to Humanoid + warns on garbage", () => {
  const warnings = [];
  const orig = console.warn;
  console.warn = (msg) => warnings.push(msg);
  try {
    assert.equal(normalizeMonsterType("xyzzy"), "Humanoid");
    assert.equal(normalizeMonsterType(undefined), "Humanoid");
    assert.equal(normalizeMonsterType(""), "Humanoid");
  } finally {
    console.warn = orig;
  }
  assert.equal(warnings.length, 3, "every unmatched value must warn");
});

test("getMonsterCrestUrl points at the type-crest SVG set", () => {
  const url = getMonsterCrestUrl("dragon");
  assert.match(url, /\/campaign-assets\/monster-type-crests\/Dragon\.svg$/);
});

test("getMonsterPortrait (gate OFF) returns the type crest, never AI art", () => {
  // Even with a wired image_url present, the gate forces the crest.
  const monster = {
    name: "Adult Black Dragon",
    image_url: "https://example.com/ai/adult-black-dragon.png",
    stats: { type: "dragon" },
  };
  const url = getMonsterPortrait(monster);
  assert.ok(isCrestUrl(url), "must resolve to a crest while gated");
  assert.match(url, /Dragon\.svg$/);
});

test("getMonsterPortrait reads nested stats.type and flat type alike", () => {
  assert.match(getMonsterPortrait({ type: "ooze" }), /Ooze\.svg$/);
  assert.match(getMonsterPortrait({ stats: { type: "plant" } }), /Plant\.svg$/);
});

test("getCrestCrBand bands integer CR", () => {
  assert.equal(getCrestCrBand(0), "common");
  assert.equal(getCrestCrBand(4), "common");
  assert.equal(getCrestCrBand(5), "dangerous");
  assert.equal(getCrestCrBand(10), "dangerous");
  assert.equal(getCrestCrBand(11), "deadly");
  assert.equal(getCrestCrBand(16), "deadly");
  assert.equal(getCrestCrBand(17), "legendary");
  assert.equal(getCrestCrBand(30), "legendary");
});

test("getCrestCrBand treats fractional and missing CR as common", () => {
  assert.equal(getCrestCrBand("1/8"), "common");
  assert.equal(getCrestCrBand("1/4"), "common");
  assert.equal(getCrestCrBand("1/2"), "common");
  assert.equal(getCrestCrBand(0.25), "common");
  assert.equal(getCrestCrBand(undefined), "common");
  assert.equal(getCrestCrBand(null), "common");
  assert.equal(getCrestCrBand("?"), "common");
});

test("isCrestUrl distinguishes crests from real portraits", () => {
  assert.equal(
    isCrestUrl("https://x/campaign-assets/monster-type-crests/Fey.svg"),
    true,
  );
  assert.equal(
    isCrestUrl("https://x/campaign-assets/dnd5e/monsters/Goblin.png"),
    false,
  );
});
