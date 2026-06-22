// TEMPORARY shim — removed at consumer cutover (Phase 1).
//
// dnd5eRules moved into the D&D 5e (2014) leaf in Phase 0 chunk 2b. This
// re-exports its full surface (152 named exports, no default) so every
// existing consumer resolves to the same content at the new location with
// zero edits. Consumers are cut over to the leaf in Phase 1.
export * from "../../game-packs/dnd/5e/2014/rules/dnd5eRules.js";
