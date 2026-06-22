// D&D 5e (2024) — game-pack body leaf.
//
// Phase 0 chunk 2a: a contract-conforming GamePackBody facade. It moves NO
// data — every field delegates to the sources that exist today
// (src/data/games/dnd5e_2024, src/components/dnd5e/dnd5eRules, and the shared
// src/game-packs/dnd5e/ui). 2b/2c fold those sources in behind this stable
// interface; until then this is TEMPORARY delegation — data folds in at 2b/2c.

import { lazy } from "react";
import { getGamePackData } from "@/data/games";
import * as dnd5eRules from "@/components/dnd5e/dnd5eRules";
import { getBackgroundList, getBackgroundById } from "@/data/games/dnd5e_2024/backgrounds";
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
  vocab: dnd5eRules,
  content,
  ui,
};

export default dnd5e2024;
