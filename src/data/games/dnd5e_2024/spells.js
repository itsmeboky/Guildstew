// TEMPORARY shim — removed at consumer cutover (Phase 1).
//
// spells moved into the D&D 5e (2024) leaf in Phase 0 chunk 2d. Re-exports
// its full surface (4 named exports, no default) so consumers resolve
// unchanged. (spell-overrides.json remains here — imported directly by
// spells.test.js and unshimmable; the leaf spells.js borrows it.)
export * from "../../../game-packs/dnd/5e/2024/content/spells.js";
