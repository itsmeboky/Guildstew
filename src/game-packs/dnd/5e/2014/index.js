// D&D 5e (2014) — game-pack body leaf.
//
// Phase 0 chunk 2a: a contract-conforming GamePackBody facade. It moves NO
// data — every field delegates to the sources that exist today
// (src/data/games/dnd5e_2014, src/components/dnd5e/*, and the shared
// src/game-packs/dnd5e/ui). 2b/2c fold those sources in behind this stable
// interface; until then this is TEMPORARY delegation — data folds in at 2b/2c.

import { lazy } from "react";
import { getGamePackData } from "@/data/games";
import * as dnd5eRules from "./rules/dnd5eRules";

// TEMPORARY delegation — data folds in at 2b/2c.
const adapter = getGamePackData("dnd5e_2014");

const content = {
  // Equipment getters delegate to the legacy 2014 data adapter.
  ...adapter,
  // Backgrounds + subclasses live in the dnd5eRules registry today.
  getBackground: (id) => dnd5eRules.BACKGROUNDS?.[id] ?? null,
  listBackgrounds: () => Object.keys(dnd5eRules.BACKGROUNDS ?? {}),
  getSubclass: (id) => dnd5eRules.SUBCLASS_COMBAT_FEATURES?.[id] ?? null,
  listSubclasses: () => Object.keys(dnd5eRules.SUBCLASS_COMBAT_FEATURES ?? {}),
  // 2014 class data is spread across dnd5eRules CLASS_* objects keyed by
  // name; listing the names is cheap, a normalized getClass folds in at 2c.
  getClass: () => null,
  listClasses: () => Object.keys(dnd5eRules.CLASS_HIT_DICE ?? {}),
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
  statBlock: lazy(() => import("./shared/ui/MonsterStatBlock.jsx")),
  equipmentLayout: lazy(() => import("./shared/ui/EquipmentLayout.jsx")),
  actionBar: lazy(() => import("./shared/ui/CombatActionBar.jsx")),
};

// GamePackBody (see src/game-packs/index.js loadGamePack).
const dnd5e2014 = {
  resolveForm: () => null, // wired in the Brewery phase
  vocab: dnd5eRules,
  content,
  ui,
};

export default dnd5e2014;
