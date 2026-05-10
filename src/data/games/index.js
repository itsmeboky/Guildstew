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
