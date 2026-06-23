// D&D 5e (2024) — game-pack body leaf.
//
// Phase 0 chunk 2a: a contract-conforming GamePackBody facade. Its data lives
// in this leaf (content/ + rules/, folded in 2d); equipment/class methods come
// via the data/games adapter and the UI via the shared src/game-packs/dnd5e/ui.
// vocab is the leaf's own rules module (chunk 2e — no cross-leaf borrow).

import { lazy } from "react";
import { getGamePackData } from "@/data/games";
import * as rules from "./rules/rules.js";
import { getBackgroundList, getBackgroundById } from "./content/backgrounds.js";
import { getSubclass } from "./content/subclassFeatures.js";

// TEMPORARY delegation — data folds in at 2b/2c. The 2024 adapter already
// exposes equipment + class/subclass methods (getClasses, getClassById,
// getSubclassesForClass, getSubclassFeaturesAtLevel, rules); backgrounds and
// getSubclass(id) aren't on the adapter, so they're imported directly.
const adapter = getGamePackData("dnd5e_2024");

const content = {
  ...adapter,
  getBackground: (id) => getBackgroundById(id) ?? null,
  listBackgrounds: () => getBackgroundList(),
  getSubclass: (id) => getSubclass(id) ?? null,
  listSubclasses: (filter) =>
    filter?.class ? adapter.getSubclassesForClass?.(filter.class) ?? [] : [],
  getClass: (id) => adapter.getClassById?.(id) ?? null,
  listClasses: () => adapter.getClasses?.() ?? [],
  // Monsters are DB-backed (the Monster entity), not static pack data — 2c.
  getMonster: () => null,
  listMonsters: () => [],
  // Items == equipment for 5e; delegate to the adapter.
  getItem: (id) => adapter.getEquipmentById?.(id) ?? null,
  listItems: () => adapter.getEquipment?.() ?? [],
};

const ui = {
  // Shared edition-branching creator shell (dispatches on ?gamePack=).
  createCharacter: lazy(() => import("@/pages/CharacterCreator")),
  // D&D character sheet is still inline in CharacterLibrary (no extracted
  // component yet) — extracted/folded later.
  characterSheet: null,
  statBlock: lazy(() => import("@/game-packs/dnd5e/ui/MonsterStatBlock")),
  equipmentLayout: lazy(() => import("@/game-packs/dnd5e/ui/EquipmentLayout")),
  actionBar: lazy(() => import("@/game-packs/dnd5e/ui/CombatActionBar")),
};

// GamePackBody (see src/game-packs/index.js loadGamePack).
const dnd5e2024 = {
  resolveForm: () => null, // wired in the Brewery phase
  // Self-contained: the leaf's own 2024 rules module. A proper shared-5e
  // vocab surface is populated in the Brewery phase. (Chunk 2e.)
  vocab: rules,
  content,
  ui,
};

export default dnd5e2024;
