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
  isAiMonsterUrl,
  getCombatantPortrait,
  getMonsterCrestType,
  resolveCombatantAvatar,
  crestTypeFromUrl,
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

// --- Combat-surface gate (CombatQueue + GMPanel) ---------------------------

const AI_URL =
  "https://x.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/monsters/Goblin.png";
const USER_URL =
  "https://x.supabase.co/storage/v1/object/public/user-assets/users/abc/campaigns/def/homebrew/monsters/my-beastie.webp";

test("isAiMonsterUrl flags the dnd5e/monsters naming-convention art only", () => {
  assert.equal(isAiMonsterUrl(AI_URL), true);
  assert.equal(isAiMonsterUrl(USER_URL), false);
  assert.equal(isAiMonsterUrl(""), false);
  assert.equal(isAiMonsterUrl(undefined), false);
  assert.equal(isAiMonsterUrl(null), false);
});

test("getCombatantPortrait (gate OFF): AI/SRD art -> type crest", () => {
  const url = getCombatantPortrait({ image_url: AI_URL, stats: { type: "humanoid (goblinoid)" } });
  assert.ok(isCrestUrl(url));
  assert.match(url, /Humanoid\.svg$/);
});

test("getCombatantPortrait (gate OFF): empty slot -> type crest, not blank", () => {
  const url = getCombatantPortrait({ stats: { type: "dragon" } });
  assert.ok(isCrestUrl(url));
  assert.match(url, /Dragon\.svg$/);
});

test("getCombatantPortrait (gate OFF): homebrew user upload passes through untouched", () => {
  // The must-not-break case.
  const url = getCombatantPortrait({ image_url: USER_URL, type: "Aberration" });
  assert.equal(url, USER_URL);
  assert.equal(isCrestUrl(url), false);
});

test("getCombatantPortrait (gate OFF): honors avatar_url and stats.image_url precedence", () => {
  assert.equal(getCombatantPortrait({ avatar_url: USER_URL }), USER_URL);
  assert.equal(getCombatantPortrait({ stats: { image_url: USER_URL } }), USER_URL);
  // stats.image_url carrying AI art is still gated to a crest.
  assert.ok(isCrestUrl(getCombatantPortrait({ stats: { image_url: AI_URL, type: "ooze" } })));
});

test("getCombatantPortrait reads creature type from flat or nested stats", () => {
  // No portrait -> crest keyed off the type accessor (type ?? stats.type).
  assert.match(getCombatantPortrait({ type: "fiend (demon)" }), /Fiend\.svg$/);
  assert.match(getCombatantPortrait({ stats: { type: "plant" } }), /Plant\.svg$/);
});

test("getCombatantPortrait ignores the 'monster'/'npc' kind discriminator", () => {
  // Built combatants overwrite type with 'monster'; the real type lives in
  // stats.type. The crest must key off stats.type, not 'monster'.
  assert.match(
    getCombatantPortrait({ type: "monster", stats: { type: "dragon" } }),
    /Dragon\.svg$/,
  );
  assert.match(
    getCombatantPortrait({ type: "monster", image_url: AI_URL, stats: { type: "undead" } }),
    /Undead\.svg$/,
  );
  // 'npc' discriminator with no real type -> Humanoid default.
  assert.match(getCombatantPortrait({ type: "npc" }), /Humanoid\.svg$/);
});

test("getCombatantPortrait resolves a built combatant via its gated avatar field", () => {
  const crest = "https://x/campaign-assets/monster-type-crests/Beast.svg";
  // Already-gated combatant (only carries `avatar`) passes the crest back.
  assert.equal(
    getCombatantPortrait({ type: "monster", uniqueId: "monster-7", avatar: crest }),
    crest,
  );
  // A user-upload avatar passes through untouched.
  assert.equal(
    getCombatantPortrait({ type: "monster", avatar: USER_URL }),
    USER_URL,
  );
});

test("getMonsterCrestType keys off stats.type past the 'monster' discriminator", () => {
  assert.equal(getMonsterCrestType({ type: "monster", stats: { type: "fey" } }), "Fey");
});

test("crestTypeFromUrl extracts the type from a crest URL", () => {
  assert.equal(crestTypeFromUrl("https://x/campaign-assets/monster-type-crests/Dragon.svg"), "Dragon");
  assert.equal(crestTypeFromUrl("https://x/campaign-assets/monster-type-crests/Undead.svg?v=2"), "Undead");
  assert.equal(crestTypeFromUrl("https://x/campaign-assets/dnd5e/monsters/Goblin.png"), null);
  assert.equal(crestTypeFromUrl("https://x/campaign-assets/monster-type-crests/Bogus.svg"), null);
  assert.equal(crestTypeFromUrl(""), null);
});

// --- resolveCombatantAvatar: one rule for every combat tracker -------------

test("resolveCombatantAvatar leaves players untouched (never crests them)", () => {
  assert.deepEqual(
    resolveCombatantAvatar({ type: "player", avatar: USER_URL }),
    { src: USER_URL, isCrest: false, isPlayer: true },
  );
  // player- id prefix is enough even without type
  assert.equal(resolveCombatantAvatar({ id: "player-42", avatar: USER_URL }).isPlayer, true);
  // a player with no avatar stays empty (gets a letter fallback, not a crest)
  assert.equal(resolveCombatantAvatar({ type: "player" }).src, "");
  assert.equal(resolveCombatantAvatar({ type: "player" }).isCrest, false);
});

test("resolveCombatantAvatar crests monsters, incl. stale AI in the avatar field", () => {
  // Stale combat_data row: only an AI URL in `avatar` -> still crested.
  const stale = resolveCombatantAvatar({ type: "monster", avatar: AI_URL, stats: { type: "dragon" } });
  assert.ok(stale.isCrest);
  assert.match(stale.src, /Dragon\.svg$/);
  // empty monster slot -> crest
  assert.ok(resolveCombatantAvatar({ id: "monster-7", stats: { type: "ooze" } }).isCrest);
  // homebrew user upload -> passthrough
  assert.deepEqual(
    resolveCombatantAvatar({ type: "monster", avatar: USER_URL }),
    { src: USER_URL, isCrest: false, isPlayer: false },
  );
});
