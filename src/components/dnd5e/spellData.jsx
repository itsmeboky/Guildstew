// TEMPORARY shim — removed at consumer cutover (Phase 1).
//
// spellData moved into the D&D 5e (2014) leaf in Phase 0 chunk 2b
// (game-packs/dnd/5e/2014/content/spells.js). This re-exports its full
// surface (10 named exports, no default) so every existing consumer resolves
// to the same content at the new location with zero edits. Consumers are cut
// over to the leaf in Phase 1.
export * from "../../game-packs/dnd/5e/2014/content/spells.js";
