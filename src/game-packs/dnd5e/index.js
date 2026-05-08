/**
 * D&D 5e Game Pack
 *
 * The system-specific implementation that plugs into the system-agnostic
 * Combat Engine v2. Currently a scaffolded stub — populated by subsequent
 * Phase 1 tasks (data/rules/UI relocation) and Phase 5+ tasks (rule
 * implementations, flow definitions, resolution helpers).
 *
 * Architectural reference: combat_engine_v2_phase0_spec.md (Section 2)
 *                          combat_redo_plan_v3.md (Part 2, Part 8)
 *
 * DO NOT use this stub in production code yet — nothing is wired to consume
 * it until Phase 7 (CombatWindow + page shell wiring). All field values are
 * intentionally null/empty until subsequent tasks fill them in.
 */

const dnd5e = {
  // ─── IDENTITY ───────────────────────────────────────
  id: 'dnd5e',
  name: 'D&D 5e',
  version: '0.0.1-scaffolding',

  // ─── DATA REGISTRIES (populated in Phase 1a — tasks 1.2–1.7) ─
  rules: null,
  classes: null,
  races: null,
  conditions: null,
  abilities: null,
  contentRegistry: {
    monsters: null,
    spells: null,
    items: null,
    classFeatures: null,
  },

  // ─── FLOW DEFINITIONS (populated in Phase 5+) ──────
  flows: {},

  // ─── RESOLUTION HELPERS (populated in Phase 5) ─────
  resolveAttack: null,
  resolveDamage: null,
  resolveSave: null,
  resolveSkillCheck: null,
  applyDamage: null,
  applyHealing: null,
  applyCondition: null,
  computeArmorClass: null,
  availableReactions: null,
  conditionModifiers: null,
  isIncapacitated: null,
  postHitOptions: null,
  initiativeRoll: null,

  // ─── SESSION SHAPE METADATA ────────────────────────
  sessionShape: null,
  hasTurnOrder: true,

  // ─── UI COMPONENTS (populated in Phase 1b — tasks 1.9–1.15, and Phase 6) ─
  ui: {
    CombatActionBar: null,
    CombatWindow: null,
    CharacterSheet: null,
    MonsterStatBlock: null,
    EquipmentLayout: null,
    InventoryGrid: null,
    SpellPicker: null,
    flows: {},
  },

  // ─── ASSETS ────────────────────────────────────────
  assets: {
    sounds: {},
    icons: {},
  },
};

export default dnd5e;
