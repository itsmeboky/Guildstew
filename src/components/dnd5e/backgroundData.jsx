// TEMPORARY shim — removed at consumer cutover (Phase 1).
//
// backgroundData moved into the D&D 5e (2014) leaf in Phase 0 chunk 2c
// (game-packs/dnd/5e/2014/content/backgroundData.js, moved verbatim — M7/M9
// bugs intact). This re-exports its full surface (5 named exports, no default)
// so every existing consumer resolves unchanged at the new location.
export * from "../../game-packs/dnd/5e/2014/content/backgroundData.js";
