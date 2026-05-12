// Game pack data abstraction. Routes the character creator
// through a single per-pack interface so components don't have
// to branch on `character.gamePack` at every read.
//
// Today only D&D 5e is covered; both editions live as separate
// modules so the 2014 / 2024 ruleset split stays editorially
// distinct. Other systems (Pathfinder 2e, Mörk Borg, etc.) gain
// their own modules here when they ship.
//
// Pack ids are CANONICAL: "dnd5e_2014" / "dnd5e_2024". Legacy
// character records may carry the old "dnd5e" slug; the inline
// alias map below coerces it to "dnd5e_2014" so callers never
// need to know about the rename.

import * as dnd5e2014 from "./dnd5e_2014";
import * as dnd5e2024 from "./dnd5e_2024";

const PACKS = {
  dnd5e_2014: dnd5e2014,
  dnd5e_2024: dnd5e2024,
};

// Legacy alias resolution — older character records may carry
// "dnd5e" from before the 2014 / 2024 split.
const PACK_ALIASES = {
  dnd5e: "dnd5e_2014",
};

function resolvePackId(packId) {
  return PACK_ALIASES[packId] || packId || "dnd5e_2014";
}

/**
 * Return the game-pack adapter module for a character / pack id.
 * Falls back to the 2014 D&D pack for unknown / missing ids so
 * legacy characters with no `gamePack` field continue to render.
 */
export function getGamePackData(packId) {
  const canonical = resolvePackId(packId);
  return PACKS[canonical] || dnd5e2014;
}

// Backwards-compat alias for callers that still use the older name.
export const getGamePack = getGamePackData;

// List of canonical pack ids — kept for callers that need to enumerate.
export function listGamePackIds() {
  return Object.keys(PACKS);
}

export { dnd5e2014, dnd5e2024 };