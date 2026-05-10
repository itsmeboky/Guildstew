// Game pack data abstraction. Routes the character creator
// through a single per-pack interface so components don't have
// to branch on `character.gamePack` at every read.
//
// Today only D&D 5e is covered; both editions live as separate
// modules so the 2014 / 2024 ruleset split (Layer 4) stays
// editorially distinct. Other systems (Pathfinder 2e, Mörk Borg,
// etc.) gain their own modules here when they ship — their
// gamePacks.js entries already exist as `coming_soon`.
//
// Pack ids are CANONICAL (post-Layer-4): "dnd5e_2014" /
// "dnd5e_2024". Legacy character records may carry the old
// "dnd5e" slug; resolveGamePackId in @/config/gamePacks coerces
// it to "dnd5e_2014" so this module's switch never sees the alias.

import * as dnd5e2014 from "./dnd5e_2014";
import * as dnd5e2024 from "./dnd5e_2024";
import { resolveGamePackId } from "@/config/gamePacks";

const PACKS = {
  dnd5e_2014: dnd5e2014,
  dnd5e_2024: dnd5e2024,
};

/**
 * Return the game-pack adapter module for a character / pack id.
 * Falls back to the 2014 D&D pack for unknown / missing ids so
 * legacy characters with no `gamePack` field continue to render.
 */
export function getGamePackData(packId) {
  const canonical = resolveGamePackId(packId);
  return PACKS[canonical] || dnd5e2014;
}

export { dnd5e2014, dnd5e2024 };
