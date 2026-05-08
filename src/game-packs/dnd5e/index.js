/**
 * D&D 5e Game Pack
 *
 * The system-specific implementation that plugs into the system-agnostic
 * Combat Engine v2. Phase 1 has populated the data/rules/content/ui
 * registries with everything that was relocated or extracted (1.2 → 1.12c-i).
 * Resolution helpers, flow definitions, and remaining UI components fill
 * in during Phases 5+.
 *
 * Architectural reference: combat_engine_v2_phase0_spec.md (Section 2)
 *                          combat_redo_plan_v3.md (Part 2, Part 8)
 *
 * NOT YET CONSUMED IN PRODUCTION — Phase 7 wires this object into
 * CombatWindow + page shells. Today this file documents what Phase 1
 * extracted; nothing imports it at runtime yet.
 */

// ─── DATA ─────────────────────────────────────────────
import * as rulesData from './data/rules';
import * as conditionsData from './data/conditions';
import * as classFeaturesData from './data/classFeatures';
import * as abilityData from './data/abilityData';
import * as spellData from './data/spellData';
import * as itemData from './data/itemData';

// ─── RULES ────────────────────────────────────────────
// actionResolver currently exports a single resolveAction dispatcher plus
// aspect helpers (getAttackModifier/getSpellSaveDC/etc.), not the
// per-type resolveAttack/resolveDamage/resolveSave/resolveSkillCheck
// functions the GamePack interface anticipates. Those interface fields
// stay null after the ?? null fallbacks below until Phase 5 fills them in.
import * as actionResolver from './rules/actionResolver';
import { computeArmorClass } from './rules/armorClass';

// ─── CONTENT ──────────────────────────────────────────
import * as itemsContent from './content/items';

// ─── UI ───────────────────────────────────────────────
import CombatActionBar from './ui/CombatActionBar';
// PlayerLeftPanel was relocated in Phase 1.10 but has zero importers in
// the current codebase. Wired here for completeness; Phase 1 cleanup
// decides whether to keep or delete.
import PlayerLeftPanel from './ui/PlayerLeftPanel';
import MonsterStatBlock from './ui/MonsterStatBlock';
import EquipmentLayout from './ui/EquipmentLayout';

const dnd5e = {
  // ─── IDENTITY ───────────────────────────────────────
  id: 'dnd5e',
  name: 'D&D 5e',
  version: '0.1.0',

  // ─── DATA REGISTRIES ────────────────────────────────
  rules: rulesData,
  classes: null,                      // class metadata not extracted (Phase 5+)
  races: null,                        // not extracted yet
  conditions: conditionsData,
  abilities: abilityData,
  contentRegistry: {
    monsters: null,                   // monster registry not extracted yet
    spells: spellData,
    items: { ...itemData, ...itemsContent },
    classFeatures: classFeaturesData,
  },

  // ─── FLOW DEFINITIONS (Phase 5+) ────────────────────
  flows: {},

  // ─── RESOLUTION HELPERS ─────────────────────────────
  resolveAttack: actionResolver.resolveAttack ?? null,
  resolveDamage: actionResolver.resolveDamage ?? null,
  resolveSave: actionResolver.resolveSave ?? null,
  resolveSkillCheck: actionResolver.resolveSkillCheck ?? null,
  applyDamage: actionResolver.applyDamage ?? null,
  applyHealing: actionResolver.applyHealing ?? null,
  applyCondition: actionResolver.applyCondition ?? null,
  computeArmorClass,
  availableReactions: actionResolver.availableReactions ?? null,
  // conditionModifiers + isIncapacitated live in conditions.js, not
  // actionResolver — sourced from there.
  conditionModifiers: conditionsData.getConditionModifiers ?? null,
  isIncapacitated: conditionsData.isIncapacitated ?? null,
  postHitOptions: actionResolver.postHitOptions ?? null,
  initiativeRoll: actionResolver.initiativeRoll ?? null,

  // ─── SESSION SHAPE METADATA ────────────────────────
  sessionShape: null,                 // Phase 5+
  hasTurnOrder: true,

  // ─── UI COMPONENTS ─────────────────────────────────
  ui: {
    CombatActionBar,
    CombatWindow: null,               // Phase 7
    CharacterSheet: null,             // Phase 6
    MonsterStatBlock,
    EquipmentLayout,
    InventoryGrid: null,              // Phase 1.13 deferred to Phase 2
    SpellPicker: null,                // Phase 6
    PlayerLeftPanel,                  // currently orphaned (zero importers)
    flows: {},
  },

  // ─── ASSETS ────────────────────────────────────────
  assets: {
    sounds: {},
    icons: {},
  },
};

export default dnd5e;
