<<<<<<< HEAD
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
=======
/**
 * Game pack data registry.
 *
 * Each entry is a self-contained data adapter for one game pack
 * (rule system + edition combination). Adapters share a common
 * surface — `getEquipment()`, `getEquipmentByCategory()`, etc. — so
 * step-level UI can stay edition-agnostic and dispatch on the
 * character's `gamePack` field.
 *
 * Architectural rule: the same character is one game pack
 * throughout. Steps don't fall through across editions. If a
 * character is `dnd5e_2024`, every read goes through the 2024
 * adapter; never the 2014 adapter, never a partial-fall-through.
 *
 * IDs match the planned `src/config/gamePacks.js` ids. While the
 * config still ships only `dnd5e` (singular) — the dual-pack split
 * lands with the 2024 character creator — `getGamePack()` accepts
 * `dnd5e` as an alias for `dnd5e_2014` so existing characters keep
 * working unchanged.
 */

import * as dnd5e_2014_equipment from "./dnd5e_2014/equipment.js";
import * as dnd5e_2024_equipment from "./dnd5e_2024/equipment.js";

const ADAPTERS = {
  dnd5e_2014: {
    id: "dnd5e_2014",
    ...dnd5e_2014_equipment,
  },
  dnd5e_2024: {
    id: "dnd5e_2024",
    ...dnd5e_2024_equipment,
  },
};

const ALIASES = {
  dnd5e: "dnd5e_2014",
};

export function getGamePack(packId) {
  const id = ALIASES[packId] || packId || "dnd5e_2014";
  return ADAPTERS[id] || ADAPTERS.dnd5e_2014;
}

export function listGamePackIds() {
  return Object.keys(ADAPTERS);
}
>>>>>>> origin/claude/fix-alpha-blocking-bugs-7Sspq
