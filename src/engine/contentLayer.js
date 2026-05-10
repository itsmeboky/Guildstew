/**
 * Content Layer — system-agnostic content + rules access for the engine and UI.
 *
 * The Content Layer is the single read-side abstraction over a campaign's
 * available rules and content. Combat code, character sheets, picker UIs,
 * and any other consumer call into here instead of reaching directly into
 * game pack data files. That keeps:
 *
 *   - Game pack data agnostic of which campaign is consuming it
 *   - Homebrew overrides applied uniformly through one resolver
 *   - Campaign-scoped custom content (monsters, spells, items, NPCs)
 *     mergeable with SRD content under one query API
 *
 * Phase 2.1 — SCAFFOLD ONLY.
 *
 * This file currently exposes a passthrough `getRule()` and
 * `getCampaignRules()` that wrap the existing dnd5e game pack helpers,
 * plus stub placeholders for content getters that Phase 2.3+ will
 * populate. No callsite is migrated yet (Phase 2.2 does that). Combat
 * behavior is unchanged after this commit.
 *
 * Architectural reference: combat_engine_v2_phase0_spec.md
 *                          combat_redo_plan_v3.md (Phase 2)
 */

import {
  getRule as dnd5eGetRule,
  getCampaignRules as dnd5eGetCampaignRules,
} from '@/game-packs/dnd5e/data/rules';

// ─── RULES ────────────────────────────────────────────────────────────
//
// Same signature as the existing dnd5e helper. Callsites in Phase 2.2
// can swap their import from '@/components/dnd5e/dnd5eRules' (or the
// new '@/game-packs/dnd5e/data/rules') to '@/engine/contentLayer' with
// no other changes.

/**
 * Get a modifiable rule value, applying the campaign's homebrew
 * overrides on top of the active game pack's defaults.
 *
 * @param {object|null|undefined} campaignRules — campaign.homebrew_rules JSONB
 * @param {string} path — dot-notation, e.g. 'combat.flanking.enabled'
 * @returns {*} rule value (override if set, default otherwise)
 */
export function getRule(campaignRules, path) {
  return dnd5eGetRule(campaignRules, path);
}

/**
 * Deep-merge campaign overrides onto game pack defaults — full rule tree.
 *
 * @param {object|null|undefined} campaignRules
 * @returns {object} merged rule tree
 */
export function getCampaignRules(campaignRules) {
  return dnd5eGetCampaignRules(campaignRules);
}

// ─── CONTENT GETTERS — STUBS FOR PHASE 2.3 ───────────────────────────
//
// These are the entry points combat and UI will use to read content
// (monsters, spells, items, etc.) merged across SRD baseline and
// campaign-scoped homebrew. Phase 2.3 fills them in. They throw today
// so any accidental early consumer fails loudly instead of silently
// returning null.

const NOT_IMPLEMENTED = (name) => () => {
  throw new Error(
    `[contentLayer] ${name} is not implemented yet — Phase 2.3 wires this up. ` +
    `If you need content access today, keep using the existing data files directly.`
  );
};

export const getMonster      = NOT_IMPLEMENTED('getMonster');
export const getSpell        = NOT_IMPLEMENTED('getSpell');
export const getItem         = NOT_IMPLEMENTED('getItem');
export const getCondition    = NOT_IMPLEMENTED('getCondition');
export const getAbility      = NOT_IMPLEMENTED('getAbility');
export const getClassFeature = NOT_IMPLEMENTED('getClassFeature');
export const getNpc          = NOT_IMPLEMENTED('getNpc');

// List methods for picker UIs — Phase 2.4
export const listMonsters    = NOT_IMPLEMENTED('listMonsters');
export const listSpells      = NOT_IMPLEMENTED('listSpells');
export const listItems       = NOT_IMPLEMENTED('listItems');

export default {
  // Rules
  getRule,
  getCampaignRules,
  // Content getters (stubs — throw until Phase 2.3)
  getMonster,
  getSpell,
  getItem,
  getCondition,
  getAbility,
  getClassFeature,
  getNpc,
  // List methods (stubs — throw until Phase 2.4)
  listMonsters,
  listSpells,
  listItems,
};
