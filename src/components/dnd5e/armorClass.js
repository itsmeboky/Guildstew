/**
 * SHIM — file relocated to src/game-packs/dnd5e/rules/armorClass.js as
 * part of Combat Engine v2 Phase 1.12b. Re-exports preserve all imports
 * working unchanged. Will be removed in Phase 8 cleanup.
 *
 * Note: the original Phase 1.12b spec assumed computeArmorClass lived
 * inline in GMPanel.jsx and prescribed an extraction. The function
 * already had its own module at this path, so 1.12b reduces to a
 * Phase 1.2-style relocation behind this shim — same end state.
 *
 * See: combat_redo_plan_v3.md (Part 8) and Phase 1.2 commit for the pattern.
 */
export * from '@/game-packs/dnd5e/rules/armorClass.js';
