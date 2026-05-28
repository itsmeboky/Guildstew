/**
 * Monster portrait resolver — single source of truth for what image a
 * monster renders.
 *
 * Background: every monster has an AI-generated portrait wired by naming
 * convention in campaign-assets/dnd5e/monsters/<name>.png (resolved by
 * getMonsterImageUrl in monsterHelpers.js). The AI art is being pulled
 * for now, so while the gate is OFF every monster falls back to a crest
 * for its creature type. The naming-convention wiring is PRESERVED and
 * merely bypassed — flip MONSTER_PORTRAITS_ENABLED back on (the AI files
 * get replaced in place later) and the original behaviour returns.
 *
 * Display components call ONLY getMonsterPortrait(monster). They never
 * touch getMonsterImageUrl directly anymore.
 */

import { getMonsterImageUrl, getMonsterType } from "./monsterHelpers.js";

// import.meta.env is undefined under `node --test`; guard it the same way
// languageFonts.js does so this module is importable in unit tests.
const env =
  typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};

const SUPABASE_URL =
  env.VITE_SUPABASE_URL || "https://ktdxhsstrgwciqkvprph.supabase.co";

const CAMPAIGN_ASSETS_BASE = `${SUPABASE_URL}/storage/v1/object/public/campaign-assets`;

/**
 * The single switch. Default OFF — hardcoded fallback of false so the
 * crest path is the safe default even with no env wired. Set
 * VITE_MONSTER_PORTRAITS_ENABLED=true to restore the wired AI portraits
 * whole-bestiary.
 */
export const MONSTER_PORTRAITS_ENABLED =
  String(env.VITE_MONSTER_PORTRAITS_ENABLED).toLowerCase() === "true";

/**
 * The 14 SRD creature types → crest accent hex. Drives the --crest-color
 * CSS var the CR-intensity glow layer is tinted with.
 */
export const MONSTER_TYPE_COLORS = {
  Aberration:  "#8A5CD1",
  Beast:       "#9A6A3C",
  Celestial:   "#E4B53C",
  Construct:   "#828A97",
  Dragon:      "#C2392E",
  Elemental:   "#23AEBD",
  Fey:         "#E268A4",
  Fiend:       "#DB6428",
  Giant:       "#4E79A2",
  Humanoid:    "#4FA3E3",
  Monstrosity: "#B0407E",
  Ooze:        "#A9C53A",
  Plant:       "#5AA64C",
  Undead:      "#5F9385",
};

const MONSTER_TYPE_KEYS = Object.keys(MONSTER_TYPE_COLORS);

/**
 * SRD type strings carry subtypes / parens / swarm phrasing, e.g.
 * "humanoid (goblinoid)", "fiend (demon)", "swarm of Tiny beasts".
 * Match the base type against the 14 keys, case-insensitive, allowing a
 * trailing plural ("beasts"). No match → "Humanoid" + a warning so the
 * unmatched value is never silently swallowed.
 */
export function normalizeMonsterType(rawType) {
  if (rawType && typeof rawType === "string") {
    const lower = rawType.toLowerCase();
    const match = MONSTER_TYPE_KEYS.find((key) =>
      new RegExp(`\\b${key.toLowerCase()}s?\\b`).test(lower),
    );
    if (match) return match;
  }
  // eslint-disable-next-line no-console
  console.warn(
    `[monsterPortrait] Unmatched monster type ${JSON.stringify(rawType)} — defaulting to Humanoid crest`,
  );
  return "Humanoid";
}

/**
 * Crest URL for a raw type string, pointing at the type-crest SVG set in
 * campaign-assets/monster-type-crests/{Type}.svg (Type is one of the 14
 * filenames, e.g. Dragon.svg).
 */
export function getMonsterCrestUrl(rawType) {
  const type = normalizeMonsterType(rawType);
  return `${CAMPAIGN_ASSETS_BASE}/monster-type-crests/${type}.svg`;
}

/**
 * THE function display components call. Gate ON → the preserved wired
 * naming-convention portrait (current behaviour). Gate OFF → the type
 * crest. Reads the raw type from either the flat field or the nested
 * stats blob, matching the dual-path accessor in monsterHelpers.js.
 */
export function getMonsterPortrait(monster) {
  if (MONSTER_PORTRAITS_ENABLED) {
    return getMonsterImageUrl(monster);
  }
  const rawType = monster?.type ?? monster?.stats?.type;
  return getMonsterCrestUrl(rawType);
}

/**
 * True when a resolved src is a type crest (vs a real portrait). Render
 * sites use this to decide whether to apply the CR-intensity glow layer —
 * real portraits get NO glow, crests only.
 */
export function isCrestUrl(url) {
  return typeof url === "string" && url.includes("/monster-type-crests/");
}

/**
 * The normalized crest type key for a monster — used to pick the
 * --crest-color. Mirrors the type getMonsterPortrait keyed the crest off.
 */
export function getMonsterCrestType(monster) {
  return normalizeMonsterType(getMonsterType(monster));
}

/**
 * CR → intensity band for the crest glow. Fractional CR (1/8, 1/4, 1/2)
 * and missing/garbage CR fall to 'common'.
 *   common    0–4
 *   dangerous 5–10
 *   deadly    11–16
 *   legendary 17+
 */
export function getCrestCrBand(cr) {
  const n = parseCr(cr);
  if (n == null) return "common";
  if (n >= 17) return "legendary";
  if (n >= 11) return "deadly";
  if (n >= 5) return "dangerous";
  return "common";
}

function parseCr(cr) {
  if (typeof cr === "number" && Number.isFinite(cr)) return cr;
  if (typeof cr === "string") {
    const trimmed = cr.trim();
    if (!trimmed || trimmed === "?") return null;
    if (trimmed.includes("/")) {
      const [num, den] = trimmed.split("/").map(Number);
      if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
        return num / den;
      }
      return null;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
