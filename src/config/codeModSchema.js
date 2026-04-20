/**
 * Brewery Layer-3 code mod schema.
 *
 * A code mod is a `brewery_mods` row with `mod_type: 'code_mod'`.
 * Its metadata contains:
 *   - triggers[]       — an array of event-triggered effect bundles
 *   - config_schema[]  — parameters the installing GM can customize
 *   - config_values    — current values for the above (populated on
 *     install, not in the creator)
 *
 * The trigger system reuses the Tier 3 event list from the homebrew
 * creator — same event names, same filter/gate semantics — so a
 * GM who's authored Tier 3 triggers doesn't have to relearn
 * anything.
 */

// ────────────────────── Effect types ──────────────────────────

/**
 * Effect types a trigger can produce. Each shape lists the fields
 * the creator form should expose for that type; the combat layer
 * reads those same fields when the trigger fires.
 */
export const EFFECT_TYPES = [
  {
    value: "deal_damage",
    label: "Deal Damage",
    description: "Deal damage to target(s) with a formula + damage type.",
    fields: ["formula", "damage_type"],
  },
  {
    value: "modify_damage",
    label: "Modify Damage",
    description: "Change outgoing or incoming damage by a formula.",
    fields: ["formula", "replaces"],
  },
  {
    value: "heal",
    label: "Heal",
    description: "Restore HP by a formula.",
    fields: ["formula"],
  },
  {
    value: "grant_temp_hp",
    label: "Grant Temporary HP",
    description: "Grant temporary HP by a formula.",
    fields: ["formula"],
  },
  {
    value: "apply_condition",
    label: "Apply Condition",
    description: "Apply a condition with optional save.",
    fields: ["condition", "save_ability", "save_dc_formula", "duration"],
  },
  {
    value: "remove_condition",
    label: "Remove Condition",
    description: "Remove a specific condition from the target.",
    fields: ["condition"],
  },
  {
    value: "modify_roll",
    label: "Modify Roll",
    description: "Add or subtract from a roll result.",
    fields: ["formula", "applies_to"],
  },
  {
    value: "grant_advantage",
    label: "Grant Advantage",
    description: "Grant advantage on a roll for a duration.",
    fields: ["applies_to", "duration"],
  },
  {
    value: "grant_disadvantage",
    label: "Grant Disadvantage",
    description: "Apply disadvantage on a roll for a duration.",
    fields: ["applies_to", "duration"],
  },
  {
    value: "modify_ac",
    label: "Modify AC",
    description: "Temporarily change AC by a formula.",
    fields: ["formula", "duration"],
  },
  {
    value: "modify_speed",
    label: "Modify Speed",
    description: "Temporarily change movement speed by a formula.",
    fields: ["formula", "duration"],
  },
  {
    value: "restore_resource",
    label: "Restore Resource",
    description: "Restore HP, hit dice, spell slot, or class resource.",
    fields: ["resource", "formula"],
  },
  {
    value: "spend_resource",
    label: "Spend Resource",
    description: "Consume HP, hit dice, spell slot, or class resource.",
    fields: ["resource", "formula"],
  },
  {
    value: "recharge_ability",
    label: "Recharge Ability",
    description: "Force-recharge a specific named ability.",
    fields: ["ability_name"],
  },
  {
    value: "force_save",
    label: "Force Saving Throw",
    description: "Force a saving throw with pass/fail branches.",
    fields: ["save_ability", "dc_formula", "on_fail", "on_success"],
  },
  {
    value: "custom",
    label: "Custom (GM adjudicates)",
    description: "Description-only effect the GM resolves by hand.",
    fields: ["description"],
  },
];

/** Quick lookup helper for the creator form. */
export function effectTypeMeta(value) {
  return EFFECT_TYPES.find((t) => t.value === value) || null;
}

// ────────────────────── Trigger events ────────────────────────

/**
 * Event names a trigger can fire on. Mirrors the Tier 3 homebrew
 * trigger list so authors don't learn two different vocabularies.
 */
export const TRIGGER_EVENTS = [
  "on_hit",
  "on_hit_by",
  "on_crit",
  "on_crit_by",
  "on_miss",
  "on_missed_by",
  "on_deal_damage",
  "on_take_damage",
  "on_take_damage_type",
  "on_reduced_to_zero",
  "on_bloodied",
  "on_ally_reduced_to_zero",
  "on_kill",
  "on_kill_type",
  "on_turn_start",
  "on_turn_end",
  "on_enemy_turn_end",
  "on_save_success",
  "on_save_fail",
  "on_target_save_fail",
  "on_spell_cast",
  "on_concentration_break",
];

export const TRIGGER_GATES = [
  { value: "unlimited",        label: "Unlimited" },
  { value: "once_per_turn",    label: "Once Per Turn" },
  { value: "once_per_round",   label: "Once Per Round" },
  { value: "once_per_rest",    label: "Once Per Rest" },
  { value: "proficiency_bonus", label: "Proficiency Bonus / Long Rest" },
];

export const APPLIES_TO_OPTIONS = ["attack", "save", "check", "damage"];
export const RESOLUTION_RESOURCES = ["hp", "hit_dice", "spell_slot", "class_resource", "temp_hp"];
export const DAMAGE_TYPE_OPTIONS = [
  "acid", "bludgeoning", "cold", "fire", "force", "lightning",
  "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder",
];
export const REPLACES_OPTIONS = ["crit_damage", "outgoing_damage", "incoming_damage"];

// ────────────────────── Blanks ────────────────────────────────

export function blankTrigger() {
  return {
    id: `trigger_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: "New Trigger",
    description: "",
    event: "on_hit",
    filters: { source: "self", weapon_type: "any" },
    gate: "unlimited",
    effect: {
      type: "deal_damage",
      formula: "1d6",
      damage_type: "fire",
      description: "",
    },
  };
}

export function blankConfigParam() {
  return {
    key: "",
    label: "",
    type: "number",
    default: 0,
    min: 0,
    max: 10,
    options: [],
  };
}

export const BLANK_CODE_MOD = {
  mod_type: "code_mod",
  name: "",
  description: "",
  image_url: "",
  triggers: [],
  config_schema: [],
};

// ────────────────────── Trigger templates ─────────────────────

/**
 * Pre-filled trigger presets. Authors pick one from the "Start
 * from Template" menu inside the trigger editor; the template
 * stamps a deep-copy of the fields onto the new trigger so edits
 * don't mutate the canonical data here.
 */
export const TRIGGER_TEMPLATES = [
  {
    id: "bonus_damage_on_hit",
    name: "Bonus Damage on Hit",
    description: "Deal extra damage when you hit with an attack.",
    event: "on_hit",
    filters: { source: "self", weapon_type: "any" },
    gate: "once_per_turn",
    effect: {
      type: "deal_damage",
      formula: "1d6",
      damage_type: "fire",
      description: "Extra damage when you land an attack.",
    },
  },
  {
    id: "heal_on_kill",
    name: "Heal on Kill",
    description: "Regain HP equal to your level when you kill a creature.",
    event: "on_kill",
    filters: { source: "self" },
    gate: "unlimited",
    effect: {
      type: "heal",
      formula: "actor.level",
      description: "Heal for your character level on a kill.",
    },
  },
  {
    id: "temp_hp_on_turn_start",
    name: "Temp HP on Turn Start",
    description: "Gain temp HP equal to your CON modifier at the start of each turn.",
    event: "on_turn_start",
    filters: { source: "self" },
    gate: "unlimited",
    effect: {
      type: "grant_temp_hp",
      formula: "actor.con_mod",
      description: "Gain CON-modifier temp HP each turn.",
    },
  },
  {
    id: "bonus_to_saves",
    name: "Bonus to Saves",
    description: "Add proficiency bonus to a failed save (once per rest).",
    event: "on_save_fail",
    filters: { source: "self" },
    gate: "once_per_rest",
    effect: {
      type: "modify_roll",
      formula: "actor.prof",
      applies_to: "save",
      description: "Add your proficiency bonus to a failed save.",
    },
  },
  {
    id: "reaction_counterattack",
    name: "Reaction Attack on Enemy Miss",
    description: "When an enemy misses you with a melee attack, strike back.",
    event: "on_missed_by",
    filters: { source: "enemy", weapon_type: "melee" },
    gate: "once_per_round",
    effect: {
      type: "deal_damage",
      formula: "weapon_damage_dice + actor.str_mod",
      damage_type: "slashing",
      description: "Counterattack when a melee attack misses you.",
    },
  },
  {
    id: "damage_reduction",
    name: "Damage Reduction",
    description: "Reduce all incoming damage by your proficiency bonus.",
    event: "on_take_damage",
    filters: { source: "self" },
    gate: "unlimited",
    effect: {
      type: "modify_damage",
      formula: "-actor.prof",
      replaces: "incoming_damage",
      description: "Subtract proficiency bonus from every damage instance.",
    },
  },
  {
    id: "scaling_damage_by_level",
    name: "Scaling Damage by Level",
    description: "Deal scaling necrotic damage that increases at levels 5, 11, and 17.",
    event: "on_hit",
    filters: { source: "self" },
    gate: "once_per_turn",
    effect: {
      type: "deal_damage",
      formula: "if(actor.level >= 17, 4d6, if(actor.level >= 11, 3d6, if(actor.level >= 5, 2d6, 1d6)))",
      damage_type: "necrotic",
      description: "Necrotic damage that scales at level 5 / 11 / 17.",
    },
  },
];

/** Deep-copy a template row so form edits don't mutate the catalog. */
export function cloneTriggerTemplate(id) {
  const t = TRIGGER_TEMPLATES.find((row) => row.id === id);
  if (!t) return blankTrigger();
  const copy = JSON.parse(JSON.stringify(t));
  copy.id = `trigger_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  return copy;
}

// ────────────────────── Default mock context ──────────────────

/**
 * Baseline mock context for the "Test Formula" sandbox. The
 * creator can nudge individual values in the UI before clicking
 * Evaluate; this is what the sandbox seeds on first open.
 */
export const DEFAULT_MOCK_CONTEXT = {
  actor: {
    level: 5, class_level: 5, prof: 3,
    str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10,
    str_mod: 3, dex_mod: 2, con_mod: 2, int_mod: 0, wis_mod: 1, cha_mod: 0,
    hp: 40, max_hp: 45, temp_hp: 0,
    ac: 16, spell_mod: 3, spell_dc: 14,
  },
  target: {
    level: 5, class_level: 5, prof: 3,
    str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10,
    str_mod: 2, dex_mod: 1, con_mod: 2, int_mod: 0, wis_mod: 0, cha_mod: 0,
    hp: 30, max_hp: 45, temp_hp: 0,
    ac: 14, spell_mod: 0, spell_dc: 10,
  },
  weapon_damage_dice: 1,
  spell_level: 3,
  damage_dealt: 12,
  roll_result: 18,
  save_dc: 14,
  config: {},
};
