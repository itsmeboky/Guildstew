/**
 * Pathfinder 2e Game Pack
 *
 * Self-contained system pack that plugs into the Combat Engine v2,
 * mirroring the structure of src/game-packs/dnd5e/.
 *
 * SCAFFOLD ONLY — no data is wired in yet. The
 * src/game-packs/pf2e/pf2e-foundry-source/ subdirectory is the
 * intended staging area for the raw Foundry PF2e source dump; an
 * import script (added in a follow-up commit) will walk that source
 * and emit trimmed adapter modules into:
 *
 *   data/    — rules, abilityData, classFeatures, conditions,
 *              itemData, spellData (one module per category, matching
 *              dnd5e/data/)
 *   rules/   — actionResolver, armorClass, etc.
 *   content/ — items, ancestries, classes, spells (trimmed for app use)
 *   ui/      — PF2e-flavored CombatActionBar, StatBlock, EquipmentLayout
 *   config/  — per-system constants
 *
 * Until those modules land, this file exports a recognisable pack
 * shape with null adapter slots so anything that introspects the
 * registry sees PF2e as "registered but not ready".
 *
 * Architectural reference: combat_engine_v2_phase0_spec.md (Section 2)
 *                          combat_redo_plan_v3.md (Part 2, Part 8)
 *
 * NOT YET CONSUMED IN PRODUCTION — the character creator routes PF2e
 * picks to a "Coming soon" tome in CharacterCreator.jsx until the
 * data modules ship.
 */

export const pf2eGamePack = {
  id: "pathfinder_2e",
  name: "Pathfinder (2nd Edition)",
  ready: false,

  // Data registries — populated by the import script.
  data: {
    rules:         null,
    abilityData:   null,
    classFeatures: null,
    conditions:    null,
    itemData:      null,
    spellData:     null,
  },

  // Rule resolvers — populated when the PF2e mechanic helpers are
  // hand-written / generated to match the dnd5e/rules/ shape.
  rules: {
    resolveAction: null,
    armorClass:    null,
  },

  // Content modules — items, ancestries, classes, spells, etc. The
  // raw Foundry source under pf2e-foundry-source/ gets trimmed into
  // here so the bundled UI assets only carry what the app reads.
  content: {
    items:      null,
    ancestries: null,
    classes:    null,
    spells:     null,
  },

  // PF2e-flavored UI surfaces — combat bar, stat block, equipment
  // layout. Default to null so existing dnd5e UI keeps rendering for
  // dnd5e characters; PF2e dispatch lands when these exist.
  ui: {
    CombatActionBar:  null,
    MonsterStatBlock: null,
    EquipmentLayout:  null,
  },
};

export default pf2eGamePack;
