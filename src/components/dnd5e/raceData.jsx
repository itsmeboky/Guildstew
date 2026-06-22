// TEMPORARY shim — removed at consumer cutover (Phase 1).
//
// raceData moved into the D&D 5e (2014) leaf in Phase 0 chunk 2c
// (game-packs/dnd/5e/2014/content/raceData.js). This re-exports its full
// surface (6 named exports, no default) so every existing consumer resolves
// unchanged at the new location.
export * from "../../game-packs/dnd/5e/2014/content/raceData.js";
