// TEMPORARY shim — removed at consumer cutover (Phase 1).
//
// subclassExpandedSpells moved into the D&D 5e (2014) leaf in Phase 0 chunk 2c
// (game-packs/dnd/5e/2014/content/subclassExpandedSpells.js). Kept as a shim
// because patronExpandedSpells.test.js imports it from here. Re-exports its
// full surface (2 named exports, no default) so consumers resolve unchanged.
export * from "../../game-packs/dnd/5e/2014/content/subclassExpandedSpells.js";
