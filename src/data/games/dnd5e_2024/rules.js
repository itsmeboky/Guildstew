// TEMPORARY shim — removed at consumer cutover (Phase 1).
//
// rules moved into the D&D 5e (2024) leaf in Phase 0 chunk 2d. Re-exports its
// full surface (47 named exports, no default) so consumers (incl. the
// data/games registry's `import * as dnd5e_2024_rules`) resolve unchanged.
export * from "../../../game-packs/dnd/5e/2024/rules/rules.js";
