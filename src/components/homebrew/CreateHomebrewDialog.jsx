import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Code, Eye, RotateCcw, X, Plus, Trash, ChevronUp, ChevronDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { uploadFile } from "@/utils/uploadFile";
import {
  getRule,
  DAMAGE_TYPES,
  WEAPON_PROPERTIES,
  SPELL_SCHOOLS,
  CLASS_HIT_DICE,
} from "@/components/dnd5e/dnd5eRules";
import { CONDITION_COLORS } from "@/components/combat/conditions";
import { supabase } from "@/api/supabaseClient";
import { trackEvent } from "@/utils/analytics";

/**
 * Rule Modification creation / edit dialog. Drives a homebrew_rules
 * row through base44.entities.HomebrewRule, storing only the changed
 * rule values (the delta from MODIFIABLE_RULES) in `modifications`.
 *
 * Guided UI mirrors HouseRulesPanel so GMs see the same controls they
 * already know. A JSON preview / edit toggle exposes the raw object
 * for power users.
 *
 * Props:
 *   open     — boolean, whether the dialog is open
 *   onClose  — close handler (also called after a successful save)
 *   brew     — existing homebrew_rules row to edit (optional). When
 *              null/undefined the dialog is in create mode.
 */
// Content type used by the top-of-dialog selector. `rule_modification`
// stores rule-tree deltas in `modifications`; `custom_item` stores a
// full item record.
const CONTENT_TYPES = [
  { value: "rule_modification",   label: "Rule Modification",   description: "Change how an existing rule works." },
  { value: "custom_item",         label: "Custom Item",         description: "Weapon, armor, potion, wondrous item, or scroll." },
  { value: "custom_monster",      label: "Custom Monster",      description: "A new creature with a full combat-ready stat block." },
  { value: "custom_spell",        label: "Custom Spell",        description: "A new spell with effects and upcasting." },
  { value: "custom_class_feature",label: "Custom Class Feature",description: "A class feature, racial trait, or general ability." },
];

// Ability-score order used throughout the monster form.
const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

// Skills keyed by ability — used to auto-calc modifiers when a
// proficiency is toggled on the monster form.
const SKILLS_BY_ABILITY = {
  str: ["Athletics"],
  dex: ["Acrobatics", "Sleight of Hand", "Stealth"],
  int: ["Arcana", "History", "Investigation", "Nature", "Religion"],
  wis: ["Animal Handling", "Insight", "Medicine", "Perception", "Survival"],
  cha: ["Deception", "Intimidation", "Performance", "Persuasion"],
  con: [],
};
const ALL_SKILLS = Object.values(SKILLS_BY_ABILITY).flat().sort();

// CR options covering the fractional values plus 0-30 integers.
const CR_OPTIONS = ["0", "1/8", "1/4", "1/2",
  ...Array.from({ length: 30 }, (_, i) => String(i + 1))];

const SIZE_OPTIONS = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];

const CREATURE_TYPES = [
  "Aberration", "Beast", "Celestial", "Construct", "Dragon", "Elemental",
  "Fey", "Fiend", "Giant", "Humanoid", "Monstrosity", "Ooze", "Plant", "Undead",
];

const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "True Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil",
  "Unaligned", "Any Alignment",
];

const SAVE_ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

const CASTING_TIMES = [
  "1 action", "1 bonus action", "1 reaction", "1 minute", "10 minutes", "1 hour", "8 hours",
];

const SPELL_CLASSES = Object.keys(CLASS_HIT_DICE);

const SPELL_EFFECT_TYPES = ["Damage", "Healing", "Condition", "Buff", "Debuff", "Utility"];

const FEATURE_SOURCE_TYPES = ["Class Feature", "Racial Feature", "General Ability", "Feature Menu"];
const FEATURE_COSTS = ["Action", "Bonus Action", "Reaction", "Free", "Passive"];
const FEATURE_USES = [
  "At Will",
  "1/Short Rest",
  "1/Long Rest",
  "2/Long Rest",
  "3/Long Rest",
  "Proficiency Bonus/Long Rest",
  "Charges (see Recharge)",
  "Special",
];
const FEATURE_RECHARGE = ["Short Rest", "Long Rest", "Dawn", "Dusk", "Never"];
const FEATURE_EFFECT_TYPES = ["Damage", "Healing", "Condition", "Resource", "Buff", "Utility"];
const FEATURE_RESOLUTIONS = [
  { value: "attack",  label: "Attack roll" },
  { value: "save",    label: "Saving throw" },
  { value: "no_roll", label: "No roll (auto)" },
];
const RESOURCE_POOLS = [
  "Hit Points",
  "Temporary Hit Points",
  "Spell Slot",
  "Ki / Focus",
  "Sorcery Points",
  "Superiority Dice",
  "Bardic Inspiration",
  "Rages",
  "Hit Dice",
];
const CONDITION_DC_SOURCES = [
  { value: "spell_dc",   label: "Spell save DC (8 + prof + ability mod)" },
  { value: "feature_dc", label: "Feature DC (defined below)" },
  { value: "fixed",      label: "Fixed DC" },
];

// Expanded monster-action schema. Every action stores how combat should
// resolve it (attack / save / no_roll) plus optional rider effects.
const ACTION_TYPES = [
  { value: "melee_attack",  label: "Melee Attack"  },
  { value: "ranged_attack", label: "Ranged Attack" },
  { value: "saving_throw",  label: "Saving Throw"  },
  { value: "healing",       label: "Healing"       },
  { value: "no_roll",       label: "No Roll / Auto" },
];

const ACTION_COSTS = ["Action", "Bonus Action", "Reaction", "Free", "Legendary"];

const RECHARGE_OPTIONS = [
  { value: "",       label: "None / at will"   },
  { value: "5-6",    label: "Recharge 5–6"     },
  { value: "6",      label: "Recharge 6"       },
  { value: "short",  label: "Short Rest"       },
  { value: "long",   label: "Long Rest"        },
  { value: "dawn",   label: "Dawn"             },
];

const AOE_SHAPES = ["", "Cone", "Line", "Sphere", "Cube", "Cylinder"];

const CONDITION_END_OPTIONS = [
  { value: "save_each_turn",      label: "Save at end of each turn" },
  { value: "save_at_end",         label: "Save at end — ends effect" },
  { value: "fixed_duration",      label: "Fixed duration (enter below)" },
  { value: "until_concentration", label: "Until concentration ends" },
];

// Tier 3 — Event trigger system. Attaches to any entity that can
// "react to events": monster actions, class features, item abilities,
// auras. The combat loop inspects these after each relevant event.
const TRIGGER_EVENTS = [
  { value: "",                       label: "— No trigger —" },
  { value: "on_hit",                 label: "On hit (this creature hits)" },
  { value: "on_hit_by",              label: "On hit by (this creature is hit)" },
  { value: "on_crit",                label: "On crit (this creature crits)" },
  { value: "on_crit_by",             label: "On crit by" },
  { value: "on_miss",                label: "On miss" },
  { value: "on_missed_by",           label: "On missed by" },
  { value: "on_deal_damage",         label: "On deal damage" },
  { value: "on_take_damage",         label: "On take damage" },
  { value: "on_take_damage_type",    label: "On take damage (type filter)" },
  { value: "on_reduced_to_zero",     label: "On dropped to 0 HP" },
  { value: "on_bloodied",            label: "On bloodied (first time < ½ HP)" },
  { value: "on_ally_reduced_to_zero",label: "On ally dropped to 0 HP" },
  { value: "on_kill",                label: "On kill" },
  { value: "on_kill_type",           label: "On kill (creature type filter)" },
  { value: "on_turn_start",          label: "On turn start" },
  { value: "on_turn_end",            label: "On turn end" },
  { value: "on_enemy_turn_end",      label: "On enemy turn end (villain timing)" },
  { value: "on_save_success",        label: "On save success" },
  { value: "on_save_fail",           label: "On save fail" },
  { value: "on_target_save_fail",    label: "On target fails save vs this" },
  { value: "on_spell_cast",          label: "On spell cast" },
  { value: "on_concentration_break", label: "On concentration broken" },
  { value: "on_enter_range",         label: "On enter range" },
  { value: "on_leave_range",         label: "On leave range" },
  { value: "on_short_rest",          label: "On short rest" },
  { value: "on_long_rest",           label: "On long rest" },
  { value: "on_initiative",          label: "On initiative roll" },
  { value: "on_round_start",         label: "On round start" },
  { value: "initiative_count_20",    label: "Initiative count 20 (lair timing)" },
];

const TRIGGER_GATES = [
  { value: "unlimited",        label: "Unlimited" },
  { value: "once_per_turn",    label: "Once per turn" },
  { value: "once_per_round",   label: "Once per round" },
  { value: "once_per_rest",    label: "Once per rest" },
  { value: "X_per_short_rest", label: "X per short rest" },
  { value: "X_per_long_rest",  label: "X per long rest" },
];

const TRIGGER_SOURCE_TARGETS = [
  { value: "",      label: "Any" },
  { value: "self",  label: "Self" },
  { value: "ally",  label: "Ally" },
  { value: "enemy", label: "Enemy" },
  { value: "any",   label: "Any" },
];

const TRIGGER_EFFECT_TYPES = [
  { value: "",          label: "— Description only —" },
  { value: "damage",    label: "Damage" },
  { value: "healing",   label: "Healing" },
  { value: "condition", label: "Condition" },
  { value: "recharge",  label: "Recharge (self or ally)" },
  { value: "temp_hp",   label: "Temp HP" },
  { value: "movement",  label: "Movement" },
  { value: "custom",    label: "Custom (see description)" },
];

const BLANK_TRIGGER = {
  event: "",
  filters: {
    damage_type: "",
    weapon_type: "",
    source: "",
    target: "",
    range: null,
    creature_type: "",
  },
  gate: "unlimited",
  gate_count: null,
  effect: {
    effect_type: "",
    damage_dice: "",
    damage_type: "",
    healing_dice: "",
    applies_condition: "",
    condition_save: "",
    condition_dc: null,
    temp_hp: "",
    description: "",
  },
};

// Tier 3 — Tiered save failures. Standard 5e pass/fail, extended with
// margin-based escalation. Tiers cumulative on resolution.
const BLANK_SAVE_TIER = {
  margin: 0,
  damage_dice: "",
  damage_type: "",
  applies_condition: "",
  condition_end: "",
  description: "",
};

// Tier 3 — MCDM villain actions. Exactly 3, one per round.
const BLANK_VILLAIN_ACTION = {
  name: "",
  round: 1,
  description: "",
  action_type: "no_roll",
  save_ability: "",
  save_dc: "",
  attack_bonus: "",
  damage_dice: "",
  damage_type: "",
  healing_dice: "",
  half_on_save: true,
  applies_condition: "",
  condition_end: "",
  aoe_shape: "",
  aoe_size: "",
};

// Tier 3 — Menu-style class features (Invocations, Maneuvers, ...).
const MENU_FEATURE_EFFECT_TYPES = [
  "Passive Modifier", "Damage", "Healing", "Condition", "Spell", "Buff", "Utility",
];
const BLANK_MENU_OPTION = {
  name: "",
  description: "",
  level_requirement: 0,
  prerequisite: "",
  effect_type: "Passive Modifier",
  cost: "Passive",
  // Conditional fields based on effect_type:
  damage_dice: "",
  damage_type: "",
  healing_dice: "",
  applies_condition: "",
  spell_reference: "",
  spell_cost: "slot",
  modifier_target: "",
  modifier_value: "",
};

// Tier 3 — Non-slot spell costs.
const SPELL_COST_TYPES = [
  { value: "hp",                 label: "Hit Points (blood magic)" },
  { value: "temp_hp",            label: "Temporary HP" },
  { value: "hit_dice",           label: "Hit Dice" },
  { value: "exhaustion",         label: "Exhaustion level" },
  { value: "material_consumed",  label: "Material component consumed" },
  { value: "custom",             label: "Custom resource" },
];
const BLANK_ALT_COST = {
  type: "hp",
  amount: "",
  amount_per_level: null,
  description: "",
};
const BLANK_ALT_AFTER_EFFECT = {
  trigger: "on_cast",
  effect_type: "exhaustion",
  amount: 1,
  condition: "",
  description: "",
};

// Tier 3 — Cursed items.
const CURSE_TYPES = [
  { value: "stat_penalty",     label: "Stat penalty" },
  { value: "forced_behavior",  label: "Forced behavior" },
  { value: "recurring_damage", label: "Recurring damage" },
  { value: "cannot_unattune",  label: "Cannot unattune" },
  { value: "progressive",      label: "Progressive (escalates over time)" },
  { value: "custom",           label: "Custom (see description)" },
];
const CURSE_REVEAL_TRIGGERS = [
  { value: "on_attune",     label: "On attunement" },
  { value: "on_first_use",  label: "On first use" },
  { value: "on_condition",  label: "On specific condition" },
  { value: "never_auto",    label: "Never (GM reveals manually)" },
];
const BLANK_CURSE = {
  enabled: false,
  identified_as_cursed: false,
  reveal_trigger: "on_attune",
  curse_type: "stat_penalty",
  description: "",
  stat_penalty: { ability: "WIS", amount: -2 },
  forced_behavior: { description: "", save_to_resist: false, save_ability: "WIS", save_dc: 15 },
  recurring: { damage_dice: "", damage_type: "", trigger: "dawn" },
  cannot_unattune: false,
  remove_curse_dc: null,
  progressive: { stages: [] },
};

// Tier 3 — Sentient items.
const SENTIENCE_COMMUNICATION = [
  { value: "empathy",   label: "Empathy only" },
  { value: "telepathy", label: "Telepathy with wielder" },
  { value: "speech",    label: "Speech" },
];
const SENTIENCE_SENSES = [
  "Hearing", "Blindsight 30ft", "Darkvision 60ft", "Darkvision 120ft", "Truesight",
];
const BLANK_SENTIENCE = {
  enabled: false,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  senses: [],
  communication: "empathy",
  languages: [],
  alignment: "True Neutral",
  personality: "",
  purpose: "",
  conflict: {
    trigger_conditions: [],
    contest_type: "charisma",
    on_loss: "",
  },
};

const BLANK_MONSTER_ACTION = {
  name: "",
  description: "",
  action_type: "melee_attack",    // melee_attack | ranged_attack | saving_throw | healing | no_roll
  action_cost: "Action",          // Action | Bonus Action | Reaction | Free | Legendary
  legendary_cost: 1,              // only used when action_cost === "Legendary"
  recharge: "",                   // "" | "5-6" | "6" | "short" | "long" | "dawn"
  reaction_trigger: "",           // free text describing the trigger
  // Attack-based
  attack_bonus: "",               // flat to-hit bonus
  damage: "",                     // primary damage dice, e.g. "2d6+4"
  damage_type: "bludgeoning",
  reach: "",                      // "5 ft" or "60/120 ft"
  // Bonus rider damage (e.g. +7 fire on a bite)
  bonus_damage_dice: "",
  bonus_damage_type: "",
  // Save-based
  save_ability: "DEX",
  save_dc: "",
  half_on_save: true,
  // Area of effect (any type)
  aoe_shape: "",                  // "" | Cone | Line | Sphere | Cube | Cylinder
  aoe_size: "",                   // e.g. "15 ft cone", "60 ft line", "20 ft radius"
  target_count: "",               // "" | "1" | "all in area" — free text
  // Rider condition (applied on hit / failed save)
  applies_condition: "",
  condition_save: "",             // save to resist (if different from main)
  condition_dc: "",               // optional override DC for the rider
  condition_end: "save_each_turn",
  condition_duration: "",
  // Healing
  healing_dice: "",
  healing_flat: "",
  // Tier 3 — event trigger + tiered save failures
  trigger: null,                  // populated with BLANK_TRIGGER when author enables
  save_tiers: [],                 // optional escalating-fail tiers (cumulative)
};

const BLANK_AURA = {
  name: "",
  description: "",
  radius: "10 ft",
  damage_dice: "",
  damage_type: "",
  save_ability: "",
  save_dc: "",
  trigger: "start_of_turn",       // start_of_turn | enter_aura | end_of_turn
  applies_condition: "",
};

const BLANK_MONSTER = {
  name: "",
  size: "Medium",
  creature_type: "Humanoid",
  alignment: "True Neutral",
  cr: "1",
  armor_class: 12,
  hit_points: "30 (4d8 + 12)",
  speed: "30 ft",
  stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  saves: [],
  skills: [],
  damage_resistances: [],
  damage_immunities: [],
  damage_vulnerabilities: [],
  condition_immunities: [],
  senses: "",
  languages: "",
  image_url: "",
  description: "",
  actions: [],
  bonus_actions: [],
  reactions: [],
  legendary_actions: [],
  lair_actions: [],
  auras: [],
  multiattack: { enabled: false, description: "", attacks: [] },
  legendary_actions_per_round: 3,
  legendary_resistances: 0,
  // Tier 3 — MCDM villain actions. Mutually exclusive with legendary
  // actions; the form enforces the XOR via `villain_actions.enabled`.
  villain_actions: {
    enabled: false,
    actions: [
      { ...BLANK_VILLAIN_ACTION, round: 1 },
      { ...BLANK_VILLAIN_ACTION, round: 2 },
      { ...BLANK_VILLAIN_ACTION, round: 3 },
    ],
  },
};

const BLANK_SPELL = {
  name: "",
  level: 0,
  school: "Evocation",
  casting_time: "1 action",
  range: "60 feet",
  components: { v: true, s: true, m: false, material: "" },
  duration: "Instantaneous",
  // Explicit booleans so the combat layer can branch without
  // parsing the duration string. Authors still type the human-
  // readable duration; these flags drive concentration tracking
  // (one concentration spell at a time) and ritual casting
  // (cast without a slot for an extra 10 minutes).
  concentration: false,
  ritual: false,
  description: "",
  higher_level: "",
  classes: [],
  effect_type: "Damage",
  // Damage-specific
  damage_dice: "",
  damage_type: "fire",
  resolution: "save",      // 'save' | 'attack'
  save: "DEX",             // which save to roll when resolution === 'save'
  half_on_save: true,      // half damage on a successful save
  cantrip_scaling: false,
  upcast_per_level: "",    // text expr, e.g., "1d6 per level above 3rd"
  // Healing-specific
  healing_dice: "",
  add_spell_mod: true,
  // Condition-specific
  condition_applied: "Frightened",
  condition_save: "WIS",
  condition_duration: "1 minute",
  // Buff / debuff / utility narrative
  effect_description: "",
  // Tier 3 — alternative casting costs (blood magic, exhaustion, ...)
  alternative_costs: {
    enabled: false,
    replaces_slot: true,
    costs: [],
    after_effects: [],
  },
  // Tier 3 — tiered save failures (only meaningful for save resolution)
  save_tiers: [],
};

const BLANK_CLASS_FEATURE = {
  name: "",
  type: "Class Feature",     // Class Feature | Racial Feature | General Ability
  class: "Fighter",
  level: 1,
  description: "",
  image_url: "",

  // Action economy
  cost: "Action",            // from FEATURE_COSTS
  uses: "At Will",           // from FEATURE_USES
  recharge: "Long Rest",     // from FEATURE_RECHARGE
  reaction_trigger: "",      // required when cost === Reaction

  // Mechanical shape
  effect_type: "Utility",    // from FEATURE_EFFECT_TYPES
  resolution: "no_roll",     // attack | save | no_roll

  // Damage branch
  damage_dice: "",
  damage_type: "slashing",
  save_ability: "DEX",       // if resolution === save
  half_on_save: true,

  // Healing branch
  healing_dice: "",
  add_level: false,          // add character level to healing (Second Wind etc.)
  add_ability_mod: false,    // add spellcasting / class mod to healing

  // Condition branch
  condition_applied: "Prone",
  condition_save: "STR",
  condition_dc_source: "feature_dc", // spell_dc | feature_dc | fixed
  condition_dc_fixed: 13,
  condition_duration: "1 minute",

  // Resource branch (Second Wind, Ki, Sorcery, Spell Slots)
  resource_restored: "Hit Points",
  resource_amount: "",       // dice OR flat, free text — "1d10 + level"

  // Scaling die (monk martial arts, barbarian rage damage, bard inspiration)
  scaling_die: {
    enabled: false,
    base_die: "1d4",
    progression: [],         // [{level:5, die:"1d6"}, ...]
    usage: "",               // free text describing when the die is rolled
  },

  // Feature DC (overrides spell DC for saves this feature requires)
  feature_dc: {
    enabled: false,
    formula: "8 + prof + ability",
    ability: "STR",          // ability used in the DC
  },

  // Tier 3 — event trigger. Optional; present when the author opts in.
  trigger: null,
  // Tier 3 — menu-style features (Invocations, Maneuvers, ...). Only
  // meaningful when `type === "Feature Menu"` (which is added to
  // FEATURE_SOURCE_TYPES at runtime below).
  menu: {
    enabled: false,
    learn_count: [{ level: 1, count: 1 }],
    swap_on_level_up: false,
    swap_count: 1,
    options: [],
  },
  // Tier 3 — tiered save failures, mirrored from monster action schema.
  save_tiers: [],
};

// Item types the creator can pick; the form below reveals different
// extra fields per choice. Keep in sync with the campaign_items type
// column the campaign library already renders.
const ITEM_TYPES = [
  "Weapon",
  "Armor",
  "Shield",
  "Potion",
  "Scroll",
  "Wondrous Item",
  "Adventuring Gear",
  "Ammunition",
];

const ITEM_RARITIES = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact"];

// Wondrous item "Bonus To" targets — covers the most common 5e rider
// shapes (ring of protection, cloak of elvenkind, bracers of archery, etc.).
const WONDROUS_BONUS_TARGETS = [
  "AC",
  "All Saves",
  "STR Save", "DEX Save", "CON Save", "INT Save", "WIS Save", "CHA Save",
  "Attack Rolls",
  "Damage Rolls",
  "Ranged Attack Damage",
  "Spell Save DC",
  "Initiative",
  "Skill: Stealth", "Skill: Perception", "Skill: Athletics",
  "Speed",
  "Max HP",
];

const BLANK_ITEM = {
  name: "",
  type: "Weapon",
  rarity: "Common",
  description: "",
  image_url: "",
  weight: 0,
  cost: 0,
  // Weapon defaults
  damage: "1d8",
  damage_type: "slashing",
  properties: [],
  range: "",
  weapon_category: "Simple",
  versatile_damage: "",
  magic_bonus: 0,              // +1 / +2 / +3 magical bonus
  bonus_damage_dice: "",       // e.g. "1d6"
  bonus_damage_type: "",       // e.g. "fire" — flame tongue rider
  // Armor defaults
  base_ac: 11,
  armor_type: "light",
  str_requirement: 0,
  stealth_disadvantage: false,
  max_dex_bonus: null,
  // Potion defaults
  potion_effect: "Healing",
  healing_dice: "2d4+2",
  effect_description: "",
  duration: "Instantaneous",
  // Wondrous defaults
  requires_attunement: false,
  charges: 0,
  recharge: "Dawn",
  bonus_to: [],                // [{ target:"AC", amount:1 }, ...]
  condition_applied: "",       // applies a condition when used / hit
  save_ability: "",            // save to resist it
  save_dc: "",                 // fixed DC for wondrous save
  // Scroll defaults
  scroll_spell: "",            // name of the spell inscribed
  scroll_level: 1,             // spell slot level it's cast at
  // Tier 3 — curse + sentience blocks (attached to wondrous / weapon /
  // armor / any item type that can be attuned to).
  curse: { ...BLANK_CURSE },
  sentience: { ...BLANK_SENTIENCE },
};

function itemFromModifications(mods) {
  if (!mods || typeof mods !== "object") return { ...BLANK_ITEM };
  return {
    ...BLANK_ITEM,
    ...mods,
    properties: Array.isArray(mods.properties) ? mods.properties : [],
    bonus_to: Array.isArray(mods.bonus_to) ? mods.bonus_to : [],
    curse: mods.curse && typeof mods.curse === "object"
      ? { ...BLANK_CURSE, ...mods.curse }
      : { ...BLANK_CURSE },
    sentience: mods.sentience && typeof mods.sentience === "object"
      ? { ...BLANK_SENTIENCE, ...mods.sentience, conflict: { ...BLANK_SENTIENCE.conflict, ...(mods.sentience.conflict || {}) } }
      : { ...BLANK_SENTIENCE },
  };
}

export default function CreateHomebrewDialog({ open, onClose, brew = null }) {
  const queryClient = useQueryClient();
  const isEditMode = !!brew?.id;

  // Which form body to show. Seeded from the existing brew's category
  // so editing a saved item keeps the right form open.
  const [contentType, setContentType] = useState("rule_modification");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("combat_rules");
  const [gameSystem, setGameSystem] = useState("dnd5e");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [contentRating, setContentRating] = useState("all_ages");
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Rule-mod-specific state — delta from MODIFIABLE_RULES.
  const [modifications, setModifications] = useState({});
  const [showJson, setShowJson] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("{}");
  const [jsonError, setJsonError] = useState(null);

  // Custom-item-specific state. Holds the full item record; saved as
  // the `modifications` JSONB for custom_item brews.
  const [item, setItem] = useState(BLANK_ITEM);

  // Custom-monster / custom-spell / custom-class-feature state. Each
  // holds the full record for its type and is serialized on save.
  const [monster, setMonster] = useState(BLANK_MONSTER);
  const [spell, setSpell] = useState(BLANK_SPELL);
  const [classFeature, setClassFeature] = useState(BLANK_CLASS_FEATURE);

  // Populate state whenever the dialog opens / the brew prop changes.
  useEffect(() => {
    if (!open) return;
    // Legacy `custom_ability` rows map to `custom_class_feature`.
    const CATEGORY_TO_TYPE = {
      custom_item: "custom_item",
      custom_monster: "custom_monster",
      custom_spell: "custom_spell",
      custom_class_feature: "custom_class_feature",
      custom_ability: "custom_class_feature",
    };
    const incomingType = CATEGORY_TO_TYPE[brew?.category] || "rule_modification";
    setContentType(incomingType);
    setTitle(brew?.title || "");
    setCategory(
      brew?.category && !CATEGORY_TO_TYPE[brew.category] ? brew.category : "combat_rules",
    );
    setGameSystem(brew?.game_system || "dnd5e");
    setDescription(brew?.description || "");
    setVersion(brew?.version || "1.0.0");
    setContentRating(brew?.content_rating || "all_ages");
    setTags(Array.isArray(brew?.tags) ? brew.tags : []);
    setTagDraft("");
    setCoverImageUrl(brew?.cover_image_url || "");
    // Reset every type-specific slot to its blank template first so
    // swapping content types in edit mode doesn't leak state from a
    // previous brew.
    setItem(BLANK_ITEM);
    setMonster(BLANK_MONSTER);
    setSpell(BLANK_SPELL);
    setClassFeature(BLANK_CLASS_FEATURE);
    setModifications({});
    if (incomingType === "custom_item") {
      setItem(itemFromModifications(brew?.modifications));
    } else if (incomingType === "custom_monster") {
      setMonster(monsterFromModifications(brew?.modifications));
    } else if (incomingType === "custom_spell") {
      setSpell(spellFromModifications(brew?.modifications));
    } else if (incomingType === "custom_class_feature") {
      setClassFeature(classFeatureFromModifications(brew?.modifications));
    } else {
      setModifications(
        brew?.modifications && typeof brew.modifications === "object" && !Array.isArray(brew.modifications)
          ? JSON.parse(JSON.stringify(brew.modifications))
          : {},
      );
    }
    setShowJson(false);
    setJsonError(null);
  }, [open, brew]);

  // Keep the JSON draft in sync with modifications whenever the raw
  // view is hidden, so flipping it open doesn't lose recent edits.
  useEffect(() => {
    setJsonDraft(JSON.stringify(modifications, null, 2));
  }, [modifications]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isCustomItem         = contentType === "custom_item";
      const isCustomMonster      = contentType === "custom_monster";
      const isCustomSpell        = contentType === "custom_spell";
      const isCustomClassFeature = contentType === "custom_class_feature";
      const typeName =
        isCustomItem         ? item.name :
        isCustomMonster      ? monster.name :
        isCustomSpell        ? spell.name :
        isCustomClassFeature ? classFeature.name : "";
      const effectiveTitle = (typeName || title).trim();
      const typeDesc =
        isCustomItem         ? item.description :
        isCustomMonster      ? monster.description :
        isCustomSpell        ? spell.description :
        isCustomClassFeature ? classFeature.description : "";
      const effectiveDescription = (typeDesc || description).trim();
      if (!effectiveTitle) throw new Error(`${CONTENT_TYPES.find(t => t.value === contentType)?.label || "Content"} name is required`);
      if (!effectiveDescription) throw new Error("Description is required");

      // Pull current auth user for creator_id.
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw new Error("Not authenticated");
      const userId = authData.user.id;

      // Build the modifications blob. For rule mods we save the delta
      // tree directly; for every custom content type the form has its
      // own serializer that trims defaults and returns a database-
      // ready object matching the downstream table schema.
      let mods;
      let effectiveCategory;
      if (isCustomItem) {
        mods = buildItemModifications(item);
        effectiveCategory = "custom_item";
      } else if (contentType === "custom_monster") {
        mods = buildMonsterModifications(monster);
        effectiveCategory = "custom_monster";
      } else if (contentType === "custom_spell") {
        mods = buildSpellModifications(spell);
        effectiveCategory = "custom_spell";
      } else if (contentType === "custom_class_feature") {
        mods = buildClassFeatureModifications(classFeature);
        effectiveCategory = "custom_class_feature";
      } else {
        mods = modifications;
        effectiveCategory = category;
      }

      const payload = {
        creator_id: userId,
        title: effectiveTitle,
        description: effectiveDescription,
        category: effectiveCategory,
        game_system: gameSystem,
        version: version || "1.0.0",
        content_rating: contentRating || "all_ages",
        cover_image_url:
          coverImageUrl
          || (isCustomItem ? item.image_url : null)
          || (isCustomMonster ? monster.image_url : null)
          || null,
        tags,
        modifications: mods,
      };
      if (isEditMode) {
        const updated = await base44.entities.HomebrewRule.update(brew.id, payload);
        return { row: updated, userId, isEdit: true };
      }
      const created = await base44.entities.HomebrewRule.create({ ...payload, is_published: false });
      return { row: created, userId, isEdit: false };
    },
    onSuccess: ({ row, userId, isEdit } = {}) => {
      queryClient.invalidateQueries({ queryKey: ["myBrews"] });
      queryClient.invalidateQueries({ queryKey: ["homebrewMeta"] });
      if (!isEdit) {
        trackEvent(userId, 'homebrew_created', {
          category: row?.category,
          game_system: row?.game_system,
          content_rating: row?.content_rating,
        });
      }
      toast.success(isEdit ? "Homebrew updated" : "Homebrew created");
      onClose?.();
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to save homebrew");
      console.error(err);
    },
  });

  // Image upload. Files land in campaign-assets/homebrew/<filename>.
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "user-assets", "homebrew", { uploadType: "homebrew" });
      setCoverImageUrl(file_url);
    } catch (err) {
      toast.error("Image upload failed");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // Tag input — enter to add, × on chip to remove. Dedupe + trim on add.
  const addTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (!t) return;
    if (tags.includes(t)) { setTagDraft(""); return; }
    setTags((prev) => [...prev, t]);
    setTagDraft("");
  };
  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));

  // Commit a JSON-draft edit. Validates parse + shape.
  const applyJsonDraft = () => {
    try {
      const parsed = JSON.parse(jsonDraft || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Top-level value must be an object");
      }
      setModifications(parsed);
      setJsonError(null);
    } catch (err) {
      setJsonError(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Homebrew" : "Create Homebrew"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Content type selector — picks which form body to render.
              Locked in edit mode since the `category` determines the
              downstream rendering (rule tree vs item library). */}
          <Section title="Content Type">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {CONTENT_TYPES.map((t) => {
                const selected = contentType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    disabled={isEditMode}
                    onClick={() => setContentType(t.value)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      selected
                        ? "bg-[#37F2D1]/15 border-[#37F2D1] text-white"
                        : "bg-[#050816] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
                    } ${isEditMode ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="text-sm font-black">{t.label}</div>
                    <div className="text-[11px] text-slate-400">{t.description}</div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Basics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={contentType === "custom_item" ? "Pack Title" : "Title"} required>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={contentType === "custom_item" ? "e.g., Flame Tongue Greatsword Pack" : "e.g., Flanking Gives +2 To Hit"}
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
              {contentType === "rule_modification" && (
                <Field label="Category">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="combat_rules">Combat Rules</SelectItem>
                      <SelectItem value="rest_rules">Rest Rules</SelectItem>
                      <SelectItem value="character_rules">Character Rules</SelectItem>
                      <SelectItem value="spell_modifiers">Spellcasting Rules</SelectItem>
                      <SelectItem value="class_modifiers">Class Modifiers</SelectItem>
                      <SelectItem value="item_rules">Item Rules</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field label="Game System">
                <Select value={gameSystem} onValueChange={setGameSystem}>
                  <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dnd5e">D&D 5e</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Version">
                <Input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
              <Field label="Content Rating">
                <Select value={contentRating} onValueChange={setContentRating}>
                  <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_ages">All Ages</SelectItem>
                    <SelectItem value="18+">18+ (mature themes or imagery)</SelectItem>
                  </SelectContent>
                </Select>
                {contentRating === '18+' && (
                  <p className="text-[11px] text-amber-300 mt-1">
                    This content will be hidden from users under 18.
                  </p>
                )}
              </Field>
            </div>

            <Field label="Description" required>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={contentType === "custom_item"
                  ? "Short pitch for this pack. The item's own description lives in the Item section below."
                  : "Explain what this rule does and how it changes gameplay..."}
                rows={3}
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>

            <Field label="Cover Image">
              <div className="flex items-center gap-3">
                {coverImageUrl && (
                  <img
                    src={coverImageUrl}
                    alt="Cover"
                    className="w-20 h-20 rounded-lg object-cover border border-slate-700"
                  />
                )}
                <label className="inline-flex items-center gap-2 cursor-pointer bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-3 py-2 text-xs font-semibold text-slate-300">
                  <Upload className="w-3 h-3" />
                  {uploading ? "Uploading..." : coverImageUrl ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
                {coverImageUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl("")}
                    className="text-xs text-slate-400 hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>
            </Field>

            <Field label="Tags">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 bg-[#37F2D1]/20 border border-[#37F2D1]/50 text-[#37F2D1] text-xs font-semibold px-2 py-0.5 rounded-full"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <Input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(); }
                }}
                placeholder="Type a tag and press Enter"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          </Section>

          {contentType === "rule_modification" && (
            <Section
              title="Modifications"
              action={
                <button
                  type="button"
                  onClick={() => setShowJson((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-2 py-1 text-slate-300"
                >
                  {showJson ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                  {showJson ? "Guided UI" : "Preview JSON"}
                </button>
              }
            >
              <p className="text-xs text-slate-400 mb-3">
                Toggle any rule you want this homebrew to change. Only the values you alter are stored.
              </p>
              {showJson ? (
                <div className="space-y-2">
                  <Textarea
                    value={jsonDraft}
                    onChange={(e) => { setJsonDraft(e.target.value); setJsonError(null); }}
                    rows={14}
                    className="font-mono text-xs bg-[#050816] border-slate-700 text-[#37F2D1]"
                  />
                  {jsonError && (
                    <p className="text-[11px] text-red-400">JSON error: {jsonError}</p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyJsonDraft}
                  >
                    Apply JSON
                  </Button>
                </div>
              ) : (
                <ModificationsEditor
                  modifications={modifications}
                  setModifications={setModifications}
                />
              )}
            </Section>
          )}

          {contentType === "custom_item" && (
            <Section title="Item">
              <CustomItemForm item={item} setItem={setItem} />
            </Section>
          )}

          {contentType === "custom_monster" && (
            <Section title="Monster">
              <CustomMonsterForm monster={monster} setMonster={setMonster} />
            </Section>
          )}

          {contentType === "custom_spell" && (
            <Section title="Spell">
              <CustomSpellForm spell={spell} setSpell={setSpell} />
            </Section>
          )}

          {contentType === "custom_class_feature" && (
            <Section title="Class Feature">
              <CustomClassFeatureForm feature={classFeature} setFeature={setClassFeature} />
            </Section>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            {saveMutation.isPending ? "Saving..." : isEditMode ? "Save Changes" : "Create Homebrew"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children, action }) {
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-[#37F2D1]">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <div>
      <Label className="block mb-1 text-xs text-slate-300 font-semibold">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Modifications editor — mirrors HouseRulesPanel controls but binds
// to a local `modifications` object that only holds deltas. This is
// the JSON that gets persisted on the homebrew row.
// ─────────────────────────────────────────────

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function setPath(root, path, value) {
  const keys = path.split(".");
  const next = clone(root);
  let cursor = next;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cursor[keys[i]] || typeof cursor[keys[i]] !== "object") cursor[keys[i]] = {};
    cursor = cursor[keys[i]];
  }
  cursor[keys[keys.length - 1]] = value;
  return next;
}

function clearPath(root, path) {
  const keys = path.split(".");
  const next = clone(root);
  const trail = [];
  let cursor = next;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cursor[keys[i]] || typeof cursor[keys[i]] !== "object") return next;
    trail.push([cursor, keys[i]]);
    cursor = cursor[keys[i]];
  }
  delete cursor[keys[keys.length - 1]];
  for (let i = trail.length - 1; i >= 0; i--) {
    const [parent, key] = trail[i];
    if (parent[key] && typeof parent[key] === "object" && Object.keys(parent[key]).length === 0) {
      delete parent[key];
    } else {
      break;
    }
  }
  return next;
}

function hasPath(root, path) {
  const keys = path.split(".");
  let cursor = root;
  for (const key of keys) {
    if (cursor && typeof cursor === "object" && key in cursor) cursor = cursor[key];
    else return false;
  }
  return true;
}

// Same row catalog as HouseRulesPanel. Kept duplicated so the two
// editors can evolve independently — the mod editor may eventually
// expose fields the settings panel doesn't.
const SECTIONS = [
  {
    key: "combat",
    title: "Combat Rules",
    rows: [
      { path: "combat.flanking.enabled", label: "Flanking", control: "toggle" },
      { path: "combat.flanking.bonus", label: "Flanking bonus", control: "number", min: 0, max: 5 },
      { path: "combat.flanking.grants_advantage", label: "Flanking grants advantage", control: "toggle" },
      { path: "combat.critical_hits", label: "Critical hit formula", control: "crit_hit_radio" },
      { path: "combat.critical_fumbles.enabled", label: "Critical fumbles", control: "toggle" },
      { path: "combat.death_saves.dc", label: "Death save DC", control: "number", min: 5, max: 20 },
      { path: "combat.death_saves.visible_to_party", label: "Death saves visible to party", control: "toggle" },
      { path: "combat.initiative.dex_tiebreaker", label: "DEX tiebreaker on initiative", control: "toggle" },
      { path: "combat.initiative.group_initiative", label: "Group initiative", control: "toggle" },
      { path: "combat.opportunity_attacks.enabled", label: "Opportunity attacks enabled", control: "toggle" },
      { path: "combat.healing_potions.action_cost", label: "Healing potion cost", control: "radio_string", options: [
        { value: "action", label: "Action (default)" },
        { value: "bonus", label: "Bonus Action (self)" },
      ]},
    ],
  },
  {
    key: "resting",
    title: "Rest Rules",
    rows: [
      { path: "resting.short_rest_minutes", label: "Short rest duration (minutes)", control: "number", min: 1, max: 1440 },
      { path: "resting.long_rest_hours", label: "Long rest duration (hours)", control: "number", min: 1, max: 168 },
      { path: "resting.full_hp_on_long_rest", label: "Full HP on long rest", control: "toggle" },
      { path: "resting.gritty_realism", label: "Gritty Realism", control: "toggle" },
      { path: "resting.epic_heroism", label: "Epic Heroism", control: "toggle" },
    ],
  },
  {
    key: "character",
    title: "Character Rules",
    rows: [
      { path: "character.stat_generation", label: "Stat generation", control: "radio_string", options: [
        { value: "standard_array", label: "Standard Array" },
        { value: "point_buy", label: "Point Buy" },
        { value: "roll_4d6_drop_lowest", label: "Roll 4d6 Drop Lowest" },
      ]},
      { path: "character.hp_on_level_up", label: "HP on level up", control: "radio_string", options: [
        { value: "average", label: "Average" },
        { value: "roll", label: "Roll" },
        { value: "max_first_then_roll", label: "Max at 1st, Roll after" },
      ]},
      { path: "character.multiclass_allowed", label: "Multiclassing allowed", control: "toggle" },
      { path: "character.feats_allowed", label: "Feats allowed", control: "toggle" },
      { path: "character.encumbrance_variant", label: "Variant encumbrance", control: "toggle" },
    ],
  },
  {
    key: "spellcasting",
    title: "Spellcasting Rules",
    rows: [
      { path: "spellcasting.component_tracking", label: "Track material components", control: "toggle" },
      { path: "spellcasting.identify_before_counterspell", label: "Identify before Counterspell", control: "toggle" },
      { path: "spellcasting.spell_points_variant", label: "Spell points variant", control: "toggle" },
    ],
  },
];

function resolveCritHitMode(mods) {
  const val = getRule(mods, "combat.critical_hits") || {};
  if (val.max_all) return "max_all";
  if (val.max_first_roll_second) return "max_first_roll_second";
  if (val.double_dice === true) return "double_dice";
  return null; // not set in delta
}

function applyCritHitMode(mods, mode) {
  const next = clone(mods || {});
  if (!next.combat) next.combat = {};
  next.combat.critical_hits = {
    double_dice: mode === "double_dice",
    max_first_roll_second: mode === "max_first_roll_second",
    max_all: mode === "max_all",
  };
  return next;
}

function ModificationsEditor({ modifications, setModifications }) {
  return (
    <div className="space-y-4">
      {SECTIONS.map((section) => (
        <div key={section.key} className="bg-[#050816] border border-[#1e293b] rounded-lg p-3">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">
            {section.title}
          </h4>
          <div className="divide-y divide-[#1e293b]">
            {section.rows.map((row) => (
              <ModRow
                key={row.path}
                row={row}
                modifications={modifications}
                onSet={(path, value) => setModifications(setPath(modifications, path, value))}
                onClear={(path) => setModifications(clearPath(modifications, path))}
                onApplyCritMode={(mode) => setModifications(applyCritHitMode(modifications, mode))}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModRow({ row, modifications, onSet, onClear, onApplyCritMode }) {
  if (row.control === "crit_hit_radio") {
    const mode = resolveCritHitMode(modifications);
    const modified = hasPath(modifications, "combat.critical_hits");
    return (
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-semibold">{row.label}</span>
            {modified && <Badge className="bg-amber-500 text-black hover:bg-amber-500">Changed</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroup
            value={mode || ""}
            onValueChange={onApplyCritMode}
            className="flex flex-col gap-0.5"
          >
            {[
              { value: "double_dice", label: "Double Dice" },
              { value: "max_first_roll_second", label: "Max First, Roll Second" },
              { value: "max_all", label: "Maximize All" },
            ].map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem id={`mod-crit-${opt.value}`} value={opt.value} />
                <Label htmlFor={`mod-crit-${opt.value}`} className="text-xs text-slate-200">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
          {modified && (
            <button
              type="button"
              className="text-slate-400 hover:text-white"
              onClick={() => onClear("combat.critical_hits")}
              title="Revert to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  const defaultVal = getRule({}, row.path);
  const currentVal = getRule(modifications, row.path);
  const modified = hasPath(modifications, row.path);
  const displayVal = modified ? currentVal : defaultVal;

  let control;
  if (row.control === "toggle") {
    control = (
      <Switch
        checked={!!displayVal}
        onCheckedChange={(checked) => onSet(row.path, checked)}
      />
    );
  } else if (row.control === "number") {
    control = (
      <Input
        type="number"
        min={row.min}
        max={row.max}
        value={displayVal ?? 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onSet(row.path, n);
        }}
        className="bg-[#0b1220] border-slate-700 text-white w-24"
      />
    );
  } else if (row.control === "radio_string") {
    control = (
      <RadioGroup
        value={String(displayVal ?? "")}
        onValueChange={(next) => onSet(row.path, next)}
        className="flex flex-col gap-0.5"
      >
        {row.options.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <RadioGroupItem id={`${row.path}-${opt.value}`} value={opt.value} />
            <Label htmlFor={`${row.path}-${opt.value}`} className="text-xs text-slate-200">{opt.label}</Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-semibold">{row.label}</span>
          {modified && <Badge className="bg-amber-500 text-black hover:bg-amber-500">Changed</Badge>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {control}
        {modified && (
          <button
            type="button"
            className="text-slate-400 hover:text-white"
            onClick={() => onClear(row.path)}
            title="Revert to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Custom Item form. Renders the base fields (name / type / rarity /
// description / image / weight / cost) and reveals extra fields
// depending on the chosen Type. The parent passes the full item
// state object + a setter; this component only uses callbacks so
// the whole record round-trips through the dialog's save path.
// ─────────────────────────────────────────────

function CustomItemForm({ item, setItem }) {
  const patch = (fields) => setItem((prev) => ({ ...prev, ...fields }));
  const togglePropertyFlag = (name) => {
    const props = Array.isArray(item.properties) ? [...item.properties] : [];
    const idx = props.indexOf(name);
    if (idx === -1) props.push(name);
    else props.splice(idx, 1);
    patch({ properties: props });
  };

  const isWeapon   = item.type === "Weapon";
  const isArmor    = item.type === "Armor" || item.type === "Shield";
  const isPotion   = item.type === "Potion";
  const isWondrous = item.type === "Wondrous Item";
  const isScroll   = item.type === "Scroll";
  const isRanged = Array.isArray(item.properties) && (
    item.properties.includes("Thrown") || item.properties.includes("Ammunition") || item.properties.includes("Range")
  );

  // Wondrous bonus_to list helpers. Each row is { target, amount }.
  const bonusRows = Array.isArray(item.bonus_to) ? item.bonus_to : [];
  const setBonusRows = (next) => patch({ bonus_to: next });
  const addBonusRow = () => setBonusRows([...bonusRows, { target: "AC", amount: 1 }]);
  const updateBonusRow = (idx, fields) => setBonusRows(
    bonusRows.map((r, i) => (i === idx ? { ...r, ...fields } : r)),
  );
  const removeBonusRow = (idx) => setBonusRows(bonusRows.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      {/* --- Common fields --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Name" required>
          <Input
            value={item.name || ""}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g., Flame Tongue Greatsword"
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
        <Field label="Type">
          <Select value={item.type} onValueChange={(v) => patch({ type: v })}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ITEM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Rarity">
          <Select value={item.rarity} onValueChange={(v) => patch({ rarity: v })}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ITEM_RARITIES.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Weight (lbs)">
          <Input
            type="number" min={0} step="0.1"
            value={item.weight ?? 0}
            onChange={(e) => patch({ weight: Number(e.target.value) || 0 })}
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
        <Field label="Cost (GP)">
          <Input
            type="number" min={0} step="0.01"
            value={item.cost ?? 0}
            onChange={(e) => patch({ cost: Number(e.target.value) || 0 })}
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
      </div>

      <Field label="Description" required>
        <Textarea
          value={item.description || ""}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="What does the item look like? What does it do?"
          rows={3}
          className="bg-[#0b1220] border-slate-700 text-white"
        />
      </Field>

      <Field label="Item image">
        <ItemImageUpload
          url={item.image_url}
          onChange={(url) => patch({ image_url: url })}
        />
      </Field>

      {/* --- Weapon-specific --- */}
      {isWeapon && (
        <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Weapon Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Damage dice">
              <Input
                value={item.damage || ""}
                onChange={(e) => patch({ damage: e.target.value })}
                placeholder="e.g., 2d6"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            <Field label="Damage type">
              <Select value={item.damage_type || "slashing"} onValueChange={(v) => patch({ damage_type: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAMAGE_TYPES.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category">
              <RadioGroup
                value={item.weapon_category || "Simple"}
                onValueChange={(v) => patch({ weapon_category: v })}
                className="flex gap-3 mt-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="wc-simple" value="Simple" />
                  <Label htmlFor="wc-simple" className="text-xs text-slate-200">Simple</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="wc-martial" value="Martial" />
                  <Label htmlFor="wc-martial" className="text-xs text-slate-200">Martial</Label>
                </div>
              </RadioGroup>
            </Field>
            {isRanged && (
              <Field label="Range (e.g., 20/60)">
                <Input
                  value={item.range || ""}
                  onChange={(e) => patch({ range: e.target.value })}
                  placeholder="20/60"
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
            )}
          </div>
          <Field label="Properties">
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(WEAPON_PROPERTIES).map((prop) => {
                const active = Array.isArray(item.properties) && item.properties.includes(prop);
                return (
                  <button
                    key={prop}
                    type="button"
                    onClick={() => togglePropertyFlag(prop)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition-colors ${
                      active
                        ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                        : "bg-[#0b1220] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
                    }`}
                    title={WEAPON_PROPERTIES[prop]}
                  >
                    {prop}
                  </button>
                );
              })}
            </div>
          </Field>
          {Array.isArray(item.properties) && item.properties.includes("Versatile") && (
            <Field label="Versatile damage (two-handed)">
              <Input
                value={item.versatile_damage || ""}
                onChange={(e) => patch({ versatile_damage: e.target.value })}
                placeholder="e.g., 1d10"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Magic bonus (+N to hit & damage)">
              <Input
                type="number" min={0} max={5}
                value={item.magic_bonus ?? 0}
                onChange={(e) => patch({ magic_bonus: Number(e.target.value) || 0 })}
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            <Field label="Bonus damage dice (rider)">
              <Input
                value={item.bonus_damage_dice || ""}
                onChange={(e) => patch({ bonus_damage_dice: e.target.value })}
                placeholder="e.g., 1d6 (Flame Tongue)"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            <Field label="Bonus damage type">
              <Select value={item.bonus_damage_type || ""} onValueChange={(v) => patch({ bonus_damage_type: v === "__none" ? "" : v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {DAMAGE_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      )}

      {/* --- Armor / Shield --- */}
      {isArmor && (
        <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
            {item.type === "Shield" ? "Shield Details" : "Armor Details"}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={item.type === "Shield" ? "AC bonus" : "Base AC"}>
              <Input
                type="number" min={0}
                value={item.base_ac ?? 0}
                onChange={(e) => patch({ base_ac: Number(e.target.value) || 0 })}
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            {item.type !== "Shield" && (
              <Field label="Armor type">
                <RadioGroup
                  value={item.armor_type || "light"}
                  onValueChange={(v) => {
                    // Sensible DEX cap defaults by armor class.
                    const maxDex = v === "light" ? null : v === "medium" ? 2 : 0;
                    patch({ armor_type: v, max_dex_bonus: maxDex });
                  }}
                  className="flex gap-3 mt-1"
                >
                  {["light", "medium", "heavy"].map((t) => (
                    <div key={t} className="flex items-center gap-2">
                      <RadioGroupItem id={`at-${t}`} value={t} />
                      <Label htmlFor={`at-${t}`} className="text-xs text-slate-200 capitalize">{t}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </Field>
            )}
            <Field label="STR requirement">
              <Input
                type="number" min={0}
                value={item.str_requirement ?? 0}
                onChange={(e) => patch({ str_requirement: Number(e.target.value) || 0 })}
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            <Field label="Stealth disadvantage">
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={!!item.stealth_disadvantage}
                  onCheckedChange={(c) => patch({ stealth_disadvantage: c })}
                />
                <span className="text-xs text-slate-300">
                  {item.stealth_disadvantage ? "Imposed" : "None"}
                </span>
              </div>
            </Field>
            {item.type !== "Shield" && item.armor_type !== "heavy" && (
              <Field label="Max DEX bonus (blank = uncapped)">
                <Input
                  type="number" min={0}
                  value={item.max_dex_bonus ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    patch({ max_dex_bonus: v === "" ? null : Number(v) || 0 });
                  }}
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
            )}
            <Field label="Magic bonus (+N to AC)">
              <Input
                type="number" min={0} max={5}
                value={item.magic_bonus ?? 0}
                onChange={(e) => patch({ magic_bonus: Number(e.target.value) || 0 })}
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          </div>
        </div>
      )}

      {/* --- Potion --- */}
      {isPotion && (
        <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Potion Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Effect type">
              <Select value={item.potion_effect || "Healing"} onValueChange={(v) => patch({ potion_effect: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Healing">Healing</SelectItem>
                  <SelectItem value="Buff">Buff</SelectItem>
                  <SelectItem value="Utility">Utility</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {item.potion_effect === "Healing" && (
              <Field label="Healing dice">
                <Input
                  value={item.healing_dice || ""}
                  onChange={(e) => patch({ healing_dice: e.target.value })}
                  placeholder="e.g., 4d4+4"
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
            )}
            <Field label="Duration">
              <Input
                value={item.duration || ""}
                onChange={(e) => patch({ duration: e.target.value })}
                placeholder="e.g., Instantaneous, 1 hour"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          </div>
          <Field label="Effect description">
            <Textarea
              value={item.effect_description || ""}
              onChange={(e) => patch({ effect_description: e.target.value })}
              placeholder="What happens when the potion is drunk?"
              rows={3}
              className="bg-[#0b1220] border-slate-700 text-white"
            />
          </Field>
        </div>
      )}

      {/* --- Wondrous Item --- */}
      {isWondrous && (
        <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Wondrous Item Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Requires attunement">
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={!!item.requires_attunement}
                  onCheckedChange={(c) => patch({ requires_attunement: c })}
                />
                <span className="text-xs text-slate-300">
                  {item.requires_attunement ? "Yes" : "No"}
                </span>
              </div>
            </Field>
            <Field label="Charges (0 = unlimited)">
              <Input
                type="number" min={0}
                value={item.charges ?? 0}
                onChange={(e) => patch({ charges: Number(e.target.value) || 0 })}
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            <Field label="Recharge">
              <Select value={item.recharge || "Dawn"} onValueChange={(v) => patch({ recharge: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dawn">Dawn</SelectItem>
                  <SelectItem value="Short Rest">Short Rest</SelectItem>
                  <SelectItem value="Long Rest">Long Rest</SelectItem>
                  <SelectItem value="Never">Never</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Effect description">
            <Textarea
              value={item.effect_description || ""}
              onChange={(e) => patch({ effect_description: e.target.value })}
              placeholder="How does the item work? What does each charge do?"
              rows={3}
              className="bg-[#0b1220] border-slate-700 text-white"
            />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-slate-300 font-semibold">Passive bonuses (while attuned / worn)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addBonusRow}>
                <Plus className="w-3 h-3 mr-1" /> Add Bonus
              </Button>
            </div>
            {bonusRows.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">No passive bonuses.</p>
            ) : (
              <div className="space-y-1.5">
                {bonusRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-7">
                      <Select value={row.target || "AC"} onValueChange={(v) => updateBonusRow(idx, { target: v })}>
                        <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          {WONDROUS_BONUS_TARGETS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        value={row.amount ?? 0}
                        onChange={(e) => updateBonusRow(idx, { amount: Number(e.target.value) || 0 })}
                        className="bg-[#0b1220] border-slate-700 text-white h-8 text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBonusRow(idx)}
                      className="col-span-1 text-slate-400 hover:text-red-400 flex justify-center"
                      title="Remove"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Applies condition (optional)">
              <Select
                value={item.condition_applied || ""}
                onValueChange={(v) => patch({ condition_applied: v === "__none" ? "" : v })}
              >
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="__none">None</SelectItem>
                  {Object.keys(CONDITION_COLORS).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            {item.condition_applied && (
              <>
                <Field label="Save to resist">
                  <Select value={item.save_ability || "DEX"} onValueChange={(v) => patch({ save_ability: v })}>
                    <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SAVE_ABILITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Save DC">
                  <Input
                    type="number" min={1}
                    value={item.save_dc ?? ""}
                    onChange={(e) => patch({ save_dc: e.target.value === "" ? "" : Number(e.target.value) })}
                    placeholder="e.g., 13"
                    className="bg-[#0b1220] border-slate-700 text-white"
                  />
                </Field>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- Scroll --- */}
      {isScroll && (
        <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Scroll Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Spell name" required>
              <Input
                value={item.scroll_spell || ""}
                onChange={(e) => patch({ scroll_spell: e.target.value })}
                placeholder="e.g., Fireball"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            <Field label="Spell level">
              <Select
                value={String(item.scroll_level ?? 1)}
                onValueChange={(v) => patch({ scroll_level: Number(v) })}
              >
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i === 0 ? "Cantrip (0)" : `Level ${i}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <p className="text-[11px] text-slate-400">
            The scroll consumes itself on use. Damage / saves / effects
            come from the referenced spell in the spell library.
          </p>
        </div>
      )}

      <CurseFields
        value={item.curse}
        onChange={(next) => patch({ curse: next })}
      />
      <SentienceFields
        value={item.sentience}
        onChange={(next) => patch({ sentience: next })}
      />
    </div>
  );
}

// Small image-upload helper scoped to custom items. Uploads into
// campaign-assets/homebrew/items/ so item covers live alongside the
// pack cover without colliding.
function ItemImageUpload({ url, onChange }) {
  const [uploading, setUploading] = useState(false);
  const handle = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "user-assets", "homebrew/items", { uploadType: "homebrew" });
      onChange(file_url);
    } catch (err) {
      toast.error("Item image upload failed");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      {url && (
        <img
          src={url}
          alt="Item"
          className="w-16 h-16 rounded object-cover border border-slate-700"
        />
      )}
      <label className="inline-flex items-center gap-2 cursor-pointer bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-3 py-2 text-xs font-semibold text-slate-300">
        <Upload className="w-3 h-3" />
        {uploading ? "Uploading..." : url ? "Replace" : "Upload"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handle}
          disabled={uploading}
        />
      </label>
      {url && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs text-slate-400 hover:text-red-400"
        >
          Remove
        </button>
      )}
    </div>
  );
}

function serializeCurse(curse) {
  if (!curse || !curse.enabled) return null;
  const out = {
    enabled: true,
    identified_as_cursed: !!curse.identified_as_cursed,
    reveal_trigger: curse.reveal_trigger || "on_attune",
    curse_type: curse.curse_type || "stat_penalty",
    description: curse.description || "",
    cannot_unattune: !!curse.cannot_unattune,
    remove_curse_dc: curse.remove_curse_dc == null || curse.remove_curse_dc === "" ? null : Number(curse.remove_curse_dc),
  };
  if (curse.curse_type === "stat_penalty") {
    out.stat_penalty = {
      ability: curse.stat_penalty?.ability || "WIS",
      amount: Number(curse.stat_penalty?.amount ?? -2),
    };
  }
  if (curse.curse_type === "forced_behavior") {
    out.forced_behavior = {
      description: curse.forced_behavior?.description || "",
      save_to_resist: !!curse.forced_behavior?.save_to_resist,
      save_ability: curse.forced_behavior?.save_ability || "WIS",
      save_dc: Number(curse.forced_behavior?.save_dc) || 15,
    };
  }
  if (curse.curse_type === "recurring_damage") {
    out.recurring = {
      damage_dice: curse.recurring?.damage_dice || "",
      damage_type: curse.recurring?.damage_type || "",
      trigger: curse.recurring?.trigger || "dawn",
    };
  }
  if (curse.curse_type === "progressive") {
    out.progressive = {
      stages: (Array.isArray(curse.progressive?.stages) ? curse.progressive.stages : [])
        .filter((s) => s && (s.trigger || s.effect))
        .map((s) => ({ trigger: s.trigger || "", effect: s.effect || "" })),
    };
  }
  return out;
}

function serializeSentience(sentience) {
  if (!sentience || !sentience.enabled) return null;
  return {
    enabled: true,
    intelligence: Number(sentience.intelligence) || 10,
    wisdom: Number(sentience.wisdom) || 10,
    charisma: Number(sentience.charisma) || 10,
    senses: Array.isArray(sentience.senses) ? sentience.senses : [],
    communication: sentience.communication || "empathy",
    languages: Array.isArray(sentience.languages) ? sentience.languages : [],
    alignment: sentience.alignment || "True Neutral",
    personality: sentience.personality || "",
    purpose: sentience.purpose || "",
    conflict: {
      trigger_conditions: Array.isArray(sentience.conflict?.trigger_conditions)
        ? sentience.conflict.trigger_conditions.filter(Boolean)
        : [],
      contest_type: sentience.conflict?.contest_type || "charisma",
      on_loss: sentience.conflict?.on_loss || "",
    },
  };
}

// Serialize the in-form item state into a compact modifications blob
// — only the fields relevant to the chosen Type are kept, so the
// saved JSONB doesn't carry stale Armor fields for a Weapon.
export function buildItemModifications(item) {
  if (!item || typeof item !== "object") return {};
  const curse = serializeCurse(item.curse);
  const sentience = serializeSentience(item.sentience);
  const extras = {
    ...(curse ? { curse } : {}),
    ...(sentience ? { sentience } : {}),
  };
  const base = {
    name: item.name || "",
    type: item.type || "Wondrous Item",
    rarity: item.rarity || "Common",
    description: item.description || "",
    image_url: item.image_url || "",
    weight: Number.isFinite(Number(item.weight)) ? Number(item.weight) : 0,
    cost: Number.isFinite(Number(item.cost)) ? Number(item.cost) : 0,
    ...extras,
  };
  if (item.type === "Weapon") {
    return {
      ...base,
      damage: item.damage || "",
      damage_type: item.damage_type || "slashing",
      properties: Array.isArray(item.properties) ? item.properties : [],
      range: item.range || "",
      weapon_category: item.weapon_category || "Simple",
      versatile_damage: item.versatile_damage || "",
      magic_bonus: Number(item.magic_bonus) || 0,
      bonus_damage_dice: item.bonus_damage_dice || "",
      bonus_damage_type: item.bonus_damage_type || "",
    };
  }
  if (item.type === "Armor" || item.type === "Shield") {
    return {
      ...base,
      base_ac: Number(item.base_ac) || 0,
      armor_type: item.type === "Shield" ? "shield" : item.armor_type || "light",
      str_requirement: Number(item.str_requirement) || 0,
      stealth_disadvantage: !!item.stealth_disadvantage,
      max_dex_bonus:
        item.max_dex_bonus === null || item.max_dex_bonus === "" || item.max_dex_bonus === undefined
          ? null
          : Number(item.max_dex_bonus),
      magic_bonus: Number(item.magic_bonus) || 0,
    };
  }
  if (item.type === "Potion") {
    return {
      ...base,
      potion_effect: item.potion_effect || "Utility",
      healing_dice: item.potion_effect === "Healing" ? item.healing_dice || "" : "",
      effect_description: item.effect_description || "",
      duration: item.duration || "",
    };
  }
  if (item.type === "Wondrous Item") {
    return {
      ...base,
      requires_attunement: !!item.requires_attunement,
      effect_description: item.effect_description || "",
      charges: Number(item.charges) || 0,
      recharge: item.recharge || "Dawn",
      bonus_to: Array.isArray(item.bonus_to)
        ? item.bonus_to
            .filter((r) => r && r.target)
            .map((r) => ({ target: r.target, amount: Number(r.amount) || 0 }))
        : [],
      condition_applied: item.condition_applied || "",
      save_ability: item.condition_applied ? (item.save_ability || "DEX") : "",
      save_dc: item.condition_applied && item.save_dc !== "" && item.save_dc != null
        ? Number(item.save_dc) : null,
    };
  }
  if (item.type === "Scroll") {
    return {
      ...base,
      scroll_spell: item.scroll_spell || "",
      scroll_level: Number(item.scroll_level) || 0,
    };
  }
  return base;
}

// ─────────────────────────────────────────────
// Custom Monster form. Renders the base stat block + a repeatable
// Actions section. Saves a full monsters-table-shaped record into
// the modifications JSONB.
// ─────────────────────────────────────────────

function abilityMod(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return 0;
  return Math.floor((s - 10) / 2);
}

function formatMod(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function CustomMonsterForm({ monster, setMonster }) {
  const patch = (fields) => setMonster((prev) => ({ ...prev, ...fields }));
  const toggleInList = (key, value) => {
    const cur = Array.isArray(monster[key]) ? [...monster[key]] : [];
    const idx = cur.indexOf(value);
    if (idx === -1) cur.push(value);
    else cur.splice(idx, 1);
    patch({ [key]: cur });
  };

  const setAbility = (key, value) => {
    const next = { ...(monster.stats || {}) };
    next[key] = Number(value) || 0;
    patch({ stats: next });
  };

  const makeListOps = (key, defaultItem) => {
    const list = Array.isArray(monster[key]) ? monster[key] : [];
    const setList = (next) => patch({ [key]: next });
    return {
      list,
      setList,
      add: (overrides = {}) => setList([...list, { ...defaultItem, ...overrides }]),
      update: (idx, fields) => setList(list.map((a, i) => (i === idx ? { ...a, ...fields } : a))),
      remove: (idx) => setList(list.filter((_, i) => i !== idx)),
      move: (idx, direction) => {
        const target = idx + direction;
        if (target < 0 || target >= list.length) return;
        const next = [...list];
        const [moved] = next.splice(idx, 1);
        next.splice(target, 0, moved);
        setList(next);
      },
    };
  };

  const actionsOps     = makeListOps("actions",           { ...BLANK_MONSTER_ACTION });
  const bonusOps       = makeListOps("bonus_actions",     { ...BLANK_MONSTER_ACTION, action_cost: "Bonus Action" });
  const reactionsOps   = makeListOps("reactions",         { ...BLANK_MONSTER_ACTION, action_cost: "Reaction" });
  const legendaryOps   = makeListOps("legendary_actions", { ...BLANK_MONSTER_ACTION, action_cost: "Legendary", legendary_cost: 1 });
  const lairOps        = makeListOps("lair_actions",      { ...BLANK_MONSTER_ACTION, action_cost: "Free", action_type: "no_roll" });
  const aurasOps       = makeListOps("auras",             { ...BLANK_AURA });

  // Multiattack is a single embedded object, not a list.
  const multiattack = monster.multiattack || { enabled: false, description: "", attacks: [] };
  const patchMultiattack = (fields) => patch({ multiattack: { ...multiattack, ...fields } });
  const multiattackAttacks = Array.isArray(multiattack.attacks) ? multiattack.attacks : [];
  const setMultiattackAttacks = (next) => patchMultiattack({ attacks: next });

  return (
    <div className="space-y-4">
      {/* --- Identity --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Name" required>
          <Input
            value={monster.name || ""}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g., Shadow Wyrm"
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
        <Field label="Challenge Rating">
          <Select value={monster.cr} onValueChange={(v) => patch({ cr: v })}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {CR_OPTIONS.map((cr) => (
                <SelectItem key={cr} value={cr}>CR {cr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Size">
          <Select value={monster.size} onValueChange={(v) => patch({ size: v })}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Creature type">
          <Select value={monster.creature_type} onValueChange={(v) => patch({ creature_type: v })}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {CREATURE_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Alignment">
          <Select value={monster.alignment} onValueChange={(v) => patch({ alignment: v })}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {ALIGNMENTS.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Armor Class">
          <Input
            type="number" min={0}
            value={monster.armor_class ?? 0}
            onChange={(e) => patch({ armor_class: Number(e.target.value) || 0 })}
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
        <Field label="Hit Points">
          <Input
            value={monster.hit_points || ""}
            onChange={(e) => patch({ hit_points: e.target.value })}
            placeholder='e.g., 135 (18d10 + 36)'
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
        <Field label="Speed">
          <Input
            value={monster.speed || ""}
            onChange={(e) => patch({ speed: e.target.value })}
            placeholder="e.g., 30 ft, fly 60 ft"
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
      </div>

      {/* --- Ability scores with live modifier display --- */}
      <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3">
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">Ability Scores</h4>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {ABILITY_KEYS.map((key) => {
            const value = monster.stats?.[key] ?? 10;
            const mod = abilityMod(value);
            return (
              <div key={key} className="flex flex-col items-center">
                <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  {key}
                </Label>
                <Input
                  type="number" min={1} max={30}
                  value={value}
                  onChange={(e) => setAbility(key, e.target.value)}
                  className="bg-[#0b1220] border-slate-700 text-white text-center"
                />
                <span className="text-[10px] text-[#37F2D1] font-black mt-0.5">{formatMod(mod)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Saving throws + skills --- */}
      <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
        <Field label="Saving Throw Proficiencies">
          <div className="flex flex-wrap gap-1.5">
            {SAVE_ABILITIES.map((s) => {
              const active = Array.isArray(monster.saves) && monster.saves.includes(s.toLowerCase());
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleInList("saves", s.toLowerCase())}
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border transition-colors ${
                    active
                      ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                      : "bg-[#0b1220] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Skills">
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
            {ALL_SKILLS.map((skill) => {
              const active = Array.isArray(monster.skills) && monster.skills.includes(skill);
              // Find the governing ability so we can show the derived
              // modifier preview right on the chip.
              const ability = Object.keys(SKILLS_BY_ABILITY).find(
                (k) => SKILLS_BY_ABILITY[k].includes(skill),
              );
              const score = monster.stats?.[ability] ?? 10;
              const modPreview = abilityMod(score);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleInList("skills", skill)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${
                    active
                      ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                      : "bg-[#0b1220] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
                  }`}
                  title={`${skill} (${(ability || "").toUpperCase()} ${formatMod(modPreview)})`}
                >
                  {skill} <span className="opacity-70">{formatMod(modPreview)}</span>
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      {/* --- Damage + condition profile --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChipMultiSelect
          label="Damage Resistances"
          options={DAMAGE_TYPES}
          values={monster.damage_resistances}
          onChange={(next) => patch({ damage_resistances: next })}
        />
        <ChipMultiSelect
          label="Damage Immunities"
          options={DAMAGE_TYPES}
          values={monster.damage_immunities}
          onChange={(next) => patch({ damage_immunities: next })}
        />
        <ChipMultiSelect
          label="Damage Vulnerabilities"
          options={DAMAGE_TYPES}
          values={monster.damage_vulnerabilities}
          onChange={(next) => patch({ damage_vulnerabilities: next })}
        />
        <ChipMultiSelect
          label="Condition Immunities"
          options={Object.keys(CONDITION_COLORS)}
          values={monster.condition_immunities}
          onChange={(next) => patch({ condition_immunities: next })}
        />
      </div>

      {/* --- Senses + languages --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Senses">
          <Input
            value={monster.senses || ""}
            onChange={(e) => patch({ senses: e.target.value })}
            placeholder="darkvision 120 ft, passive Perception 16"
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
        <Field label="Languages">
          <Input
            value={monster.languages || ""}
            onChange={(e) => patch({ languages: e.target.value })}
            placeholder="Common, Draconic"
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
      </div>

      <Field label="Image">
        <HomebrewImageUpload
          url={monster.image_url}
          onChange={(url) => patch({ image_url: url })}
          path="homebrew/monsters"
        />
      </Field>

      <Field label="Description">
        <Textarea
          value={monster.description || ""}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="Flavor text, lore, behavior…"
          rows={3}
          className="bg-[#0b1220] border-slate-700 text-white"
        />
      </Field>

      {/* --- Multi-Attack --- */}
      <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Multi-Attack</h4>
          <div className="flex items-center gap-2">
            <Switch
              checked={!!multiattack.enabled}
              onCheckedChange={(c) => patchMultiattack({ enabled: c })}
            />
            <span className="text-[10px] text-slate-400">{multiattack.enabled ? "On" : "Off"}</span>
          </div>
        </div>
        {multiattack.enabled && (
          <>
            <Textarea
              value={multiattack.description || ""}
              onChange={(e) => patchMultiattack({ description: e.target.value })}
              placeholder='e.g., "The dragon makes three attacks: one bite and two claws."'
              rows={2}
              className="bg-[#0b1220] border-slate-700 text-white text-xs"
            />
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Component attacks</Label>
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => setMultiattackAttacks([...multiattackAttacks, { name: "", count: 1 }])}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              {multiattackAttacks.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  Add the component attacks Multi-Attack fires — name matches an Action below, count is how many times it resolves.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {multiattackAttacks.map((row, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        value={row.name || ""}
                        onChange={(e) => {
                          const next = multiattackAttacks.map((a, j) => (j === i ? { ...a, name: e.target.value } : a));
                          setMultiattackAttacks(next);
                        }}
                        placeholder="Attack name (match an Action below)"
                        className="bg-[#0b1220] border-slate-700 text-white text-xs col-span-8"
                      />
                      <Input
                        type="number" min={1}
                        value={row.count ?? 1}
                        onChange={(e) => {
                          const n = Number(e.target.value) || 1;
                          const next = multiattackAttacks.map((a, j) => (j === i ? { ...a, count: n } : a));
                          setMultiattackAttacks(next);
                        }}
                        className="bg-[#0b1220] border-slate-700 text-white text-xs col-span-3"
                      />
                      <button
                        type="button"
                        onClick={() => setMultiattackAttacks(multiattackAttacks.filter((_, j) => j !== i))}
                        className="col-span-1 text-slate-400 hover:text-red-400 flex justify-center"
                        title="Remove"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* --- Actions repeater --- */}
      <MonsterActionList
        title="Actions"
        emptyHint="Add Bite, Claw, Breath Weapon, etc."
        ops={actionsOps}
      />

      <MonsterActionList
        title="Bonus Actions"
        emptyHint="Cunning Action, Shadow Step, etc."
        ops={bonusOps}
      />

      <MonsterActionList
        title="Reactions"
        emptyHint="Parry, Shield, Uncanny Dodge, etc."
        ops={reactionsOps}
        showReactionTrigger
      />

      {/* --- Legendary Actions --- */}
      <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Legendary actions per round">
            <Input
              type="number" min={0} max={5}
              value={monster.legendary_actions_per_round ?? 0}
              onChange={(e) => patch({ legendary_actions_per_round: Number(e.target.value) || 0 })}
              className="bg-[#0b1220] border-slate-700 text-white"
            />
          </Field>
          <Field label="Legendary resistances / day">
            <Input
              type="number" min={0} max={5}
              value={monster.legendary_resistances ?? 0}
              onChange={(e) => patch({ legendary_resistances: Number(e.target.value) || 0 })}
              className="bg-[#0b1220] border-slate-700 text-white"
            />
          </Field>
        </div>
        <MonsterActionList
          title="Legendary Actions"
          emptyHint="Tail Attack, Wing Buffet, Frightful Presence, etc."
          ops={legendaryOps}
          showLegendaryCost
          flat
        />
      </div>

      {/* --- Lair Actions --- */}
      <MonsterActionList
        title="Lair Actions"
        emptyHint="On initiative count 20, the lair takes one of these actions."
        ops={lairOps}
      />

      {/* --- Auras --- */}
      <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Auras</h4>
          <Button type="button" variant="outline" size="sm" onClick={() => aurasOps.add()}>
            <Plus className="w-3 h-3 mr-1" /> Add Aura
          </Button>
        </div>
        {aurasOps.list.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic text-center py-3">
            No auras. Paladin auras, fire shroud, frightful presence, etc.
          </p>
        ) : (
          <div className="space-y-2">
            {aurasOps.list.map((aura, idx) => (
              <div key={idx} className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={aura.name || ""}
                    onChange={(e) => aurasOps.update(idx, { name: e.target.value })}
                    placeholder="Aura name (e.g., Frightful Presence)"
                    className="bg-[#050816] border-slate-700 text-white flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => aurasOps.remove(idx)}
                    className="text-slate-400 hover:text-red-400"
                    title="Remove"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
                <Textarea
                  value={aura.description || ""}
                  onChange={(e) => aurasOps.update(idx, { description: e.target.value })}
                  placeholder="What does the aura do?"
                  rows={2}
                  className="bg-[#050816] border-slate-700 text-white text-xs"
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Radius</Label>
                    <Input
                      value={aura.radius || ""}
                      onChange={(e) => aurasOps.update(idx, { radius: e.target.value })}
                      placeholder="10 ft"
                      className="bg-[#050816] border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Trigger</Label>
                    <Select
                      value={aura.trigger || "start_of_turn"}
                      onValueChange={(v) => aurasOps.update(idx, { trigger: v })}
                    >
                      <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="start_of_turn">Start of target's turn</SelectItem>
                        <SelectItem value="enter_aura">On entering the aura</SelectItem>
                        <SelectItem value="end_of_turn">End of target's turn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Damage dice</Label>
                    <Input
                      value={aura.damage_dice || ""}
                      onChange={(e) => aurasOps.update(idx, { damage_dice: e.target.value })}
                      placeholder="blank for none"
                      className="bg-[#050816] border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Damage type</Label>
                    <Select
                      value={aura.damage_type || ""}
                      onValueChange={(v) => aurasOps.update(idx, { damage_type: v === "__none" ? "" : v })}
                    >
                      <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {DAMAGE_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Save ability</Label>
                    <Select
                      value={aura.save_ability || ""}
                      onValueChange={(v) => aurasOps.update(idx, { save_ability: v === "__none" ? "" : v })}
                    >
                      <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {SAVE_ABILITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Save DC</Label>
                    <Input
                      type="number" min={1}
                      value={aura.save_dc ?? ""}
                      onChange={(e) => aurasOps.update(idx, { save_dc: e.target.value === "" ? "" : Number(e.target.value) })}
                      placeholder="blank = spell DC"
                      className="bg-[#050816] border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Applies condition</Label>
                    <Select
                      value={aura.applies_condition || ""}
                      onValueChange={(v) => aurasOps.update(idx, { applies_condition: v === "__none" ? "" : v })}
                    >
                      <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="__none">None</SelectItem>
                        {Object.keys(CONDITION_COLORS).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <VillainActionsSection
        monster={monster}
        patch={patch}
      />
    </div>
  );
}

// Small reusable chip-style multi-select. Used across the monster
// form for damage type / condition lists.
// Shared repeater for every monster action-style list (Actions, Bonus
// Actions, Reactions, Legendary Actions, Lair Actions). Each row
// reveals fields based on action_type so "Saving Throw" actions show
// save ability/DC instead of an attack bonus, and "No Roll" actions
// hide both. Condition riders and bonus damage are always available.
function MonsterActionList({ title, emptyHint, ops, showReactionTrigger, showLegendaryCost, flat }) {
  const wrapperClass = flat
    ? "space-y-2"
    : "bg-[#050816] border border-[#1e293b] rounded-lg p-3";
  return (
    <div className={wrapperClass}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">{title}</h4>
        <Button type="button" variant="outline" size="sm" onClick={() => ops.add()}>
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      </div>
      {ops.list.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic text-center py-3">{emptyHint}</p>
      ) : (
        <div className="space-y-2">
          {ops.list.map((action, idx) => (
            <MonsterActionRow
              key={idx}
              action={action}
              idx={idx}
              isFirst={idx === 0}
              isLast={idx === ops.list.length - 1}
              ops={ops}
              showReactionTrigger={showReactionTrigger}
              showLegendaryCost={showLegendaryCost}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MonsterActionRow({ action, idx, isFirst, isLast, ops, showReactionTrigger, showLegendaryCost }) {
  const type = action.action_type || "melee_attack";
  const isAttack  = type === "melee_attack" || type === "ranged_attack";
  const isSave    = type === "saving_throw";
  const isHealing = type === "healing";
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-2 space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => ops.move(idx, -1)}
          disabled={isFirst}
          className="text-slate-400 hover:text-white disabled:opacity-30"
          title="Move up"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => ops.move(idx, 1)}
          disabled={isLast}
          className="text-slate-400 hover:text-white disabled:opacity-30"
          title="Move down"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        <Input
          value={action.name || ""}
          onChange={(e) => ops.update(idx, { name: e.target.value })}
          placeholder="Name (e.g., Bite)"
          className="bg-[#050816] border-slate-700 text-white flex-1"
        />
        <button
          type="button"
          onClick={() => ops.remove(idx)}
          className="text-slate-400 hover:text-red-400"
          title="Remove"
        >
          <Trash className="w-3 h-3" />
        </button>
      </div>
      <Textarea
        value={action.description || ""}
        onChange={(e) => ops.update(idx, { description: e.target.value })}
        placeholder="Description / trigger / effect…"
        rows={2}
        className="bg-[#050816] border-slate-700 text-white text-xs"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Type</Label>
          <Select
            value={action.action_type || "melee_attack"}
            onValueChange={(v) => ops.update(idx, { action_type: v })}
          >
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Cost</Label>
          <Select
            value={action.action_cost || "Action"}
            onValueChange={(v) => ops.update(idx, { action_cost: v })}
          >
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTION_COSTS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Recharge</Label>
          <Select
            value={action.recharge || ""}
            onValueChange={(v) => ops.update(idx, { recharge: v })}
          >
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RECHARGE_OPTIONS.map((r) => (<SelectItem key={r.value || "none"} value={r.value || "__none"}>{r.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        {showLegendaryCost && action.action_cost === "Legendary" && (
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Legendary cost</Label>
            <Input
              type="number" min={1} max={3}
              value={action.legendary_cost ?? 1}
              onChange={(e) => ops.update(idx, { legendary_cost: Number(e.target.value) || 1 })}
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
        )}
      </div>

      {showReactionTrigger && action.action_cost === "Reaction" && (
        <div>
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Reaction trigger</Label>
          <Input
            value={action.reaction_trigger || ""}
            onChange={(e) => ops.update(idx, { reaction_trigger: e.target.value })}
            placeholder='e.g., "when a creature hits the dragon with a melee attack"'
            className="bg-[#050816] border-slate-700 text-white text-xs"
          />
        </div>
      )}

      {/* Attack-specific fields */}
      {isAttack && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Atk bonus</Label>
            <Input
              type="number"
              value={action.attack_bonus ?? ""}
              onChange={(e) => ops.update(idx, { attack_bonus: e.target.value === "" ? "" : Number(e.target.value) })}
              placeholder="blank for none"
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Damage</Label>
            <Input
              value={action.damage || ""}
              onChange={(e) => ops.update(idx, { damage: e.target.value })}
              placeholder="2d6+4"
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Damage type</Label>
            <Select
              value={action.damage_type || "bludgeoning"}
              onValueChange={(v) => ops.update(idx, { damage_type: v })}
            >
              <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAMAGE_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Reach / Range</Label>
            <Input
              value={action.reach || ""}
              onChange={(e) => ops.update(idx, { reach: e.target.value })}
              placeholder="5 ft / 60/120 ft"
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
        </div>
      )}

      {/* Save-specific fields */}
      {isSave && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Save ability</Label>
            <Select
              value={action.save_ability || "DEX"}
              onValueChange={(v) => ops.update(idx, { save_ability: v })}
            >
              <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SAVE_ABILITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Save DC</Label>
            <Input
              type="number" min={1}
              value={action.save_dc ?? ""}
              onChange={(e) => ops.update(idx, { save_dc: e.target.value === "" ? "" : Number(e.target.value) })}
              placeholder="e.g., 14"
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Damage</Label>
            <Input
              value={action.damage || ""}
              onChange={(e) => ops.update(idx, { damage: e.target.value })}
              placeholder="7d6"
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Damage type</Label>
            <Select
              value={action.damage_type || "fire"}
              onValueChange={(v) => ops.update(idx, { damage_type: v })}
            >
              <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAMAGE_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <Switch
              checked={!!action.half_on_save}
              onCheckedChange={(c) => ops.update(idx, { half_on_save: c })}
            />
            <Label className="text-[10px] text-slate-300">Half damage on successful save</Label>
          </div>
        </div>
      )}

      {/* Healing fields */}
      {isHealing && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Healing dice</Label>
            <Input
              value={action.healing_dice || ""}
              onChange={(e) => ops.update(idx, { healing_dice: e.target.value })}
              placeholder="3d8"
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Flat bonus</Label>
            <Input
              value={action.healing_flat || ""}
              onChange={(e) => ops.update(idx, { healing_flat: e.target.value })}
              placeholder="+5"
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Target count</Label>
            <Input
              value={action.target_count || ""}
              onChange={(e) => ops.update(idx, { target_count: e.target.value })}
              placeholder="1 / up to 6 / self"
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
        </div>
      )}

      {/* AoE shape + size (applies to save + no_roll) */}
      {(isSave || type === "no_roll" || isHealing) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">AoE shape</Label>
            <Select
              value={action.aoe_shape || ""}
              onValueChange={(v) => ops.update(idx, { aoe_shape: v === "__none" ? "" : v })}
            >
              <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None</SelectItem>
                {AOE_SHAPES.filter(Boolean).map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Size</Label>
            <Input
              value={action.aoe_size || ""}
              onChange={(e) => ops.update(idx, { aoe_size: e.target.value })}
              placeholder="15 ft cone"
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
          {!isHealing && (
            <div>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Targets</Label>
              <Input
                value={action.target_count || ""}
                onChange={(e) => ops.update(idx, { target_count: e.target.value })}
                placeholder="1 / all in area"
                className="bg-[#050816] border-slate-700 text-white text-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* Bonus damage rider (any action type that deals damage) */}
      {(isAttack || isSave) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Bonus damage dice</Label>
            <Input
              value={action.bonus_damage_dice || ""}
              onChange={(e) => ops.update(idx, { bonus_damage_dice: e.target.value })}
              placeholder="1d6"
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Bonus damage type</Label>
            <Select
              value={action.bonus_damage_type || ""}
              onValueChange={(v) => ops.update(idx, { bonus_damage_type: v === "__none" ? "" : v })}
            >
              <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None</SelectItem>
                {DAMAGE_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Rider condition (any action type can apply a condition) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="md:col-span-1">
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Applies condition</Label>
          <Select
            value={action.applies_condition || ""}
            onValueChange={(v) => ops.update(idx, { applies_condition: v === "__none" ? "" : v })}
          >
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="__none">None</SelectItem>
              {Object.keys(CONDITION_COLORS).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        {action.applies_condition && (
          <>
            <div>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Condition save</Label>
              <Select
                value={action.condition_save || ""}
                onValueChange={(v) => ops.update(idx, { condition_save: v === "__none" ? "" : v })}
              >
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="Use main save" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Use main save</SelectItem>
                  {SAVE_ABILITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Cond. DC</Label>
              <Input
                type="number" min={1}
                value={action.condition_dc ?? ""}
                onChange={(e) => ops.update(idx, { condition_dc: e.target.value === "" ? "" : Number(e.target.value) })}
                placeholder="blank = main DC"
                className="bg-[#050816] border-slate-700 text-white text-xs"
              />
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Ends</Label>
              <Select
                value={action.condition_end || "save_each_turn"}
                onValueChange={(v) => ops.update(idx, { condition_end: v })}
              >
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITION_END_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {action.condition_end === "fixed_duration" && (
              <div className="md:col-span-2">
                <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Duration</Label>
                <Input
                  value={action.condition_duration || ""}
                  onChange={(e) => ops.update(idx, { condition_duration: e.target.value })}
                  placeholder="1 minute"
                  className="bg-[#050816] border-slate-700 text-white text-xs"
                />
              </div>
            )}
          </>
        )}
      </div>

      <TriggerFields
        value={action.trigger || null}
        onChange={(next) => ops.update(idx, { trigger: next })}
      />
    </div>
  );
}

// Tier 3 — MCDM villain actions. A boss monster or villain NPC uses
// EITHER villain actions OR legendary actions; enabling villain
// actions auto-clears any legendary actions on the monster so the XOR
// invariant holds without a confirmation nag.
function VillainActionsSection({ monster, patch }) {
  const villain = monster.villain_actions || { enabled: false, actions: [] };
  const hasLegendary = Array.isArray(monster.legendary_actions) && monster.legendary_actions.length > 0;

  const setEnabled = (on) => {
    if (on && hasLegendary) {
      // XOR — dropping legendary when villain kicks on. Legendary
      // resistances stay (villains have those too).
      patch({
        villain_actions: { enabled: true, actions: villain.actions?.length ? villain.actions : [
          { ...BLANK_VILLAIN_ACTION, round: 1 },
          { ...BLANK_VILLAIN_ACTION, round: 2 },
          { ...BLANK_VILLAIN_ACTION, round: 3 },
        ] },
        legendary_actions: [],
        legendary_actions_per_round: 0,
      });
      return;
    }
    const actions = villain.actions?.length === 3 ? villain.actions : [
      { ...BLANK_VILLAIN_ACTION, round: 1 },
      { ...BLANK_VILLAIN_ACTION, round: 2 },
      { ...BLANK_VILLAIN_ACTION, round: 3 },
    ];
    patch({ villain_actions: { enabled: on, actions } });
  };

  const updateAction = (idx, fields) => {
    const next = villain.actions.map((a, i) => (i === idx ? { ...a, ...fields } : a));
    patch({ villain_actions: { ...villain, actions: next } });
  };

  return (
    <div className="bg-gradient-to-br from-[#1a0514] to-[#050816] border-2 border-rose-600/40 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[11px] uppercase tracking-widest text-rose-300 font-black">Villain Actions (MCDM)</h4>
          <p className="text-[10px] text-slate-400">Three cinematic single-use actions, one per round, fired at the end of an enemy turn.</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!villain.enabled} onCheckedChange={setEnabled} />
          <span className="text-[10px] text-slate-400">{villain.enabled ? "On" : "Off"}</span>
        </div>
      </div>
      {villain.enabled && (
        <>
          {hasLegendary && (
            <p className="text-[10px] text-amber-300 italic">
              Villain Actions replace Legendary Actions. Enabling this cleared the legendary list.
            </p>
          )}
          <p className="text-[10px] text-slate-500 italic">
            A monster uses one system or the other. Legendary Actions are disabled while Villain Actions are on.
          </p>
          <div className="space-y-2">
            {villain.actions.map((action, idx) => (
              <VillainActionCard
                key={idx}
                action={action}
                round={idx + 1}
                onChange={(fields) => updateAction(idx, fields)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function VillainActionCard({ action, round, onChange }) {
  const type = action.action_type || "no_roll";
  const isSave = type === "save";
  const isAttack = type === "attack";
  const isHealing = type === "healing";
  return (
    <div className="bg-[#0b1220] border border-rose-600/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-rose-300 bg-rose-600/20 border border-rose-600/60 rounded px-2 py-0.5">
          Round {round}
        </span>
        <Input
          value={action.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={`Villain Action ${round} name`}
          className="bg-[#050816] border-slate-700 text-white flex-1"
        />
      </div>
      <Textarea
        value={action.description || ""}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Cinematic description the GM reads aloud."
        rows={2}
        className="bg-[#050816] border-slate-700 text-white text-xs"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Resolution</Label>
          <Select value={type} onValueChange={(v) => onChange({ action_type: v })}>
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="no_roll">No Roll (narrative)</SelectItem>
              <SelectItem value="save">Saving Throw</SelectItem>
              <SelectItem value="attack">Attack Roll</SelectItem>
              <SelectItem value="healing">Healing</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isSave && (
          <>
            <div>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Save ability</Label>
              <Select value={action.save_ability || "DEX"} onValueChange={(v) => onChange({ save_ability: v })}>
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SAVE_ABILITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Save DC</Label>
              <Input
                type="number" min={1}
                value={action.save_dc ?? ""}
                onChange={(e) => onChange({ save_dc: e.target.value === "" ? "" : Number(e.target.value) })}
                placeholder="18"
                className="bg-[#050816] border-slate-700 text-white text-xs"
              />
            </div>
            <div className="col-span-2 md:col-span-1 flex items-center gap-2 mt-4">
              <Switch checked={!!action.half_on_save} onCheckedChange={(c) => onChange({ half_on_save: c })} />
              <span className="text-[10px] text-slate-300">Half on save</span>
            </div>
          </>
        )}
        {isAttack && (
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Attack bonus</Label>
            <Input
              type="number"
              value={action.attack_bonus ?? ""}
              onChange={(e) => onChange({ attack_bonus: e.target.value === "" ? "" : Number(e.target.value) })}
              placeholder="+12"
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
        )}
        {isHealing && (
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Healing dice</Label>
            <Input
              value={action.healing_dice || ""}
              onChange={(e) => onChange({ healing_dice: e.target.value })}
              placeholder="4d8+10"
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
        )}
        {(isSave || isAttack) && (
          <>
            <div>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Damage dice</Label>
              <Input
                value={action.damage_dice || ""}
                onChange={(e) => onChange({ damage_dice: e.target.value })}
                placeholder="6d6"
                className="bg-[#050816] border-slate-700 text-white text-xs"
              />
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Damage type</Label>
              <Select value={action.damage_type || "fire"} onValueChange={(v) => onChange({ damage_type: v })}>
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAMAGE_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <div>
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Applies condition</Label>
          <Select
            value={action.applies_condition || ""}
            onValueChange={(v) => onChange({ applies_condition: v === "__none" ? "" : v })}
          >
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="__none">None</SelectItem>
              {Object.keys(CONDITION_COLORS).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">AoE shape</Label>
          <Select
            value={action.aoe_shape || ""}
            onValueChange={(v) => onChange({ aoe_shape: v === "__none" ? "" : v })}
          >
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {AOE_SHAPES.filter(Boolean).map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">AoE size</Label>
          <Input
            value={action.aoe_size || ""}
            onChange={(e) => onChange({ aoe_size: e.target.value })}
            placeholder="30 ft"
            className="bg-[#050816] border-slate-700 text-white text-xs"
          />
        </div>
      </div>
    </div>
  );
}

// Tier 3 — shared Trigger authoring block. Renders into any entity
// that can react to events (monster actions, class features, item
// abilities, auras). `value` is null until the author flips the
// toggle; once enabled the object is populated from BLANK_TRIGGER.
function TriggerFields({ value, onChange }) {
  const trigger = value || null;
  const enabled = !!trigger;
  const setEnabled = (on) => onChange(on ? { ...BLANK_TRIGGER } : null);
  const patch = (fields) => onChange({ ...(trigger || BLANK_TRIGGER), ...fields });
  const patchFilters = (fields) => patch({ filters: { ...((trigger || BLANK_TRIGGER).filters), ...fields } });
  const patchEffect = (fields) => patch({ effect: { ...((trigger || BLANK_TRIGGER).effect), ...fields } });

  const event = trigger?.event || "";
  const isDamageEvent = /damage/.test(event);
  const isAttackEvent = /^on_(hit|crit|miss)/.test(event);
  const isProximityEvent = /range/.test(event);
  const isKillEvent = /kill/.test(event);
  const gate = trigger?.gate || "unlimited";
  const needsGateCount = gate === "X_per_short_rest" || gate === "X_per_long_rest";
  const effectType = trigger?.effect?.effect_type || "";

  return (
    <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Trigger (when X happens, do Y)</h4>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className="text-[10px] text-slate-400">{enabled ? "On" : "Off"}</span>
        </div>
      </div>
      {enabled && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Event">
              <Select value={event} onValueChange={(v) => patch({ event: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {TRIGGER_EVENTS.map((e) => (<SelectItem key={e.value || "none"} value={e.value || "__none"}>{e.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Gate">
              <Select value={gate} onValueChange={(v) => patch({ gate: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_GATES.map((g) => (<SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            {needsGateCount && (
              <Field label="X count">
                <Input
                  type="number" min={1} max={10}
                  value={trigger?.gate_count ?? 1}
                  onChange={(e) => patch({ gate_count: Number(e.target.value) || 1 })}
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
            )}
          </div>

          <div className="bg-[#0b1220] border border-[#1e293b] rounded p-2 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Filters (optional — narrow when it fires)</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {(isDamageEvent || isAttackEvent) && (
                <Field label="Damage type">
                  <Select
                    value={trigger?.filters?.damage_type || ""}
                    onValueChange={(v) => patchFilters({ damage_type: v === "__none" ? "" : v })}
                  >
                    <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Any</SelectItem>
                      {DAMAGE_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              {isAttackEvent && (
                <Field label="Weapon type">
                  <Select
                    value={trigger?.filters?.weapon_type || ""}
                    onValueChange={(v) => patchFilters({ weapon_type: v === "__none" ? "" : v })}
                  >
                    <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Any</SelectItem>
                      <SelectItem value="melee">Melee</SelectItem>
                      <SelectItem value="ranged">Ranged</SelectItem>
                      <SelectItem value="spell">Spell</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field label="Source">
                <Select
                  value={trigger?.filters?.source || ""}
                  onValueChange={(v) => patchFilters({ source: v === "__any" ? "" : v })}
                >
                  <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_SOURCE_TARGETS.map((o) => (<SelectItem key={o.value || "__any"} value={o.value || "__any"}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Target">
                <Select
                  value={trigger?.filters?.target || ""}
                  onValueChange={(v) => patchFilters({ target: v === "__any" ? "" : v })}
                >
                  <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_SOURCE_TARGETS.map((o) => (<SelectItem key={o.value || "__any"} value={o.value || "__any"}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
              {isProximityEvent && (
                <Field label="Range (ft)">
                  <Input
                    type="number" min={0}
                    value={trigger?.filters?.range ?? ""}
                    onChange={(e) => patchFilters({ range: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="10"
                    className="bg-[#050816] border-slate-700 text-white text-xs h-8"
                  />
                </Field>
              )}
              {isKillEvent && (
                <Field label="Creature type (optional)">
                  <Input
                    value={trigger?.filters?.creature_type || ""}
                    onChange={(e) => patchFilters({ creature_type: e.target.value })}
                    placeholder="Undead, Fiend, ..."
                    className="bg-[#050816] border-slate-700 text-white text-xs h-8"
                  />
                </Field>
              )}
            </div>
          </div>

          <div className="bg-[#0b1220] border border-[#1e293b] rounded p-2 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Effect</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Field label="Effect type">
                <Select value={effectType} onValueChange={(v) => patchEffect({ effect_type: v === "__none" ? "" : v })}>
                  <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_EFFECT_TYPES.map((t) => (<SelectItem key={t.value || "__none"} value={t.value || "__none"}>{t.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
              {effectType === "damage" && (
                <>
                  <Field label="Damage dice">
                    <Input
                      value={trigger?.effect?.damage_dice || ""}
                      onChange={(e) => patchEffect({ damage_dice: e.target.value })}
                      placeholder="2d6"
                      className="bg-[#050816] border-slate-700 text-white text-xs h-8"
                    />
                  </Field>
                  <Field label="Damage type">
                    <Select
                      value={trigger?.effect?.damage_type || "fire"}
                      onValueChange={(v) => patchEffect({ damage_type: v })}
                    >
                      <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAMAGE_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}
              {effectType === "healing" && (
                <Field label="Healing dice">
                  <Input
                    value={trigger?.effect?.healing_dice || ""}
                    onChange={(e) => patchEffect({ healing_dice: e.target.value })}
                    placeholder="1d8"
                    className="bg-[#050816] border-slate-700 text-white text-xs h-8"
                  />
                </Field>
              )}
              {effectType === "temp_hp" && (
                <Field label="Temp HP">
                  <Input
                    value={trigger?.effect?.temp_hp || ""}
                    onChange={(e) => patchEffect({ temp_hp: e.target.value })}
                    placeholder="1d4+CON"
                    className="bg-[#050816] border-slate-700 text-white text-xs h-8"
                  />
                </Field>
              )}
              {effectType === "condition" && (
                <>
                  <Field label="Condition">
                    <Select
                      value={trigger?.effect?.applies_condition || ""}
                      onValueChange={(v) => patchEffect({ applies_condition: v === "__none" ? "" : v })}
                    >
                      <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="__none">None</SelectItem>
                        {Object.keys(CONDITION_COLORS).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Save to resist">
                    <Select
                      value={trigger?.effect?.condition_save || ""}
                      onValueChange={(v) => patchEffect({ condition_save: v === "__none" ? "" : v })}
                    >
                      <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {SAVE_ABILITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="DC">
                    <Input
                      type="number" min={1}
                      value={trigger?.effect?.condition_dc ?? ""}
                      onChange={(e) => patchEffect({ condition_dc: e.target.value === "" ? null : Number(e.target.value) })}
                      placeholder="13"
                      className="bg-[#050816] border-slate-700 text-white text-xs h-8"
                    />
                  </Field>
                </>
              )}
            </div>
            <Textarea
              value={trigger?.effect?.description || ""}
              onChange={(e) => patchEffect({ description: e.target.value })}
              placeholder="Description (required for custom effects; optional otherwise)"
              rows={2}
              className="bg-[#050816] border-slate-700 text-white text-xs"
            />
          </div>
        </>
      )}
    </div>
  );
}

// Tier 3 §A — Feature Menu authoring. Drives the learn-count schedule,
// swap-on-level-up policy, and the repeatable options list. Each
// option unlocks conditional mechanical fields by effect_type the
// same way a standalone class feature does.
function MenuFields({ value, onChange }) {
  const menu = value || { enabled: true, learn_count: [{ level: 1, count: 1 }], swap_on_level_up: false, swap_count: 1, options: [] };
  const patch = (fields) => onChange({ ...menu, ...fields });
  const learnCount = Array.isArray(menu.learn_count) ? menu.learn_count : [];
  const options = Array.isArray(menu.options) ? menu.options : [];

  const updateSchedule = (idx, fields) => patch({
    learn_count: learnCount.map((r, i) => (i === idx ? { ...r, ...fields } : r)),
  });
  const addScheduleRow = () => patch({
    learn_count: [...learnCount, { level: (learnCount.at(-1)?.level ?? 0) + 2, count: (learnCount.at(-1)?.count ?? 1) + 1 }],
  });
  const removeScheduleRow = (idx) => patch({ learn_count: learnCount.filter((_, i) => i !== idx) });

  const addOption = () => patch({ options: [...options, { ...BLANK_MENU_OPTION }] });
  const updateOption = (idx, fields) => patch({
    options: options.map((o, i) => (i === idx ? { ...o, ...fields } : o)),
  });
  const removeOption = (idx) => patch({ options: options.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Learn Count Schedule</h4>
        <p className="text-[10px] text-slate-500 italic">
          At each class level, the character knows this many options from the menu. Invocations: 2, 3, 4, 5, 6, 7, 8…
        </p>
        {learnCount.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic text-center py-2">No schedule rows yet.</p>
        ) : (
          <div className="space-y-1.5">
            {learnCount.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">At level</Label>
                  <Input
                    type="number" min={1} max={20}
                    value={row.level ?? 1}
                    onChange={(e) => updateSchedule(i, { level: Number(e.target.value) || 1 })}
                    className="bg-[#0b1220] border-slate-700 text-white text-xs h-8"
                  />
                </div>
                <div className="col-span-6">
                  <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Knows</Label>
                  <Input
                    type="number" min={1} max={20}
                    value={row.count ?? 1}
                    onChange={(e) => updateSchedule(i, { count: Number(e.target.value) || 1 })}
                    className="bg-[#0b1220] border-slate-700 text-white text-xs h-8"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeScheduleRow(i)}
                  className="col-span-1 text-slate-400 hover:text-red-400 flex justify-center mt-4"
                >
                  <Trash className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={addScheduleRow}>
          <Plus className="w-3 h-3 mr-1" /> Add Schedule Row
        </Button>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1e293b]">
          <div className="flex items-center gap-2 h-10">
            <Switch
              checked={!!menu.swap_on_level_up}
              onCheckedChange={(c) => patch({ swap_on_level_up: c })}
            />
            <span className="text-xs text-slate-300">Swap one on level-up</span>
          </div>
          {menu.swap_on_level_up && (
            <Field label="Swap count">
              <Input
                type="number" min={1} max={5}
                value={menu.swap_count ?? 1}
                onChange={(e) => patch({ swap_count: Number(e.target.value) || 1 })}
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          )}
        </div>
      </div>

      <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Options</h4>
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus className="w-3 h-3 mr-1" /> Add Option
          </Button>
        </div>
        {options.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic text-center py-3">
            No options yet. Add the Invocations, Maneuvers, Metamagic choices, etc.
          </p>
        ) : (
          <div className="space-y-2">
            {options.map((option, idx) => (
              <MenuOptionCard
                key={idx}
                option={option}
                onChange={(fields) => updateOption(idx, fields)}
                onRemove={() => removeOption(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuOptionCard({ option, onChange, onRemove }) {
  const effectType = option.effect_type || "Passive Modifier";
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={option.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Option name (e.g., Agonizing Blast)"
          className="bg-[#050816] border-slate-700 text-white flex-1"
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-red-400"
          title="Remove"
        >
          <Trash className="w-3 h-3" />
        </button>
      </div>
      <Textarea
        value={option.description || ""}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="What the option does."
        rows={2}
        className="bg-[#050816] border-slate-700 text-white text-xs"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Level req</Label>
          <Input
            type="number" min={0} max={20}
            value={option.level_requirement ?? 0}
            onChange={(e) => onChange({ level_requirement: Number(e.target.value) || 0 })}
            placeholder="0 = any"
            className="bg-[#050816] border-slate-700 text-white text-xs h-8"
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Prerequisite</Label>
          <Input
            value={option.prerequisite || ""}
            onChange={(e) => onChange({ prerequisite: e.target.value })}
            placeholder="e.g., Pact of the Blade"
            className="bg-[#050816] border-slate-700 text-white text-xs h-8"
          />
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Cost</Label>
          <Select value={option.cost || "Passive"} onValueChange={(v) => onChange({ cost: v })}>
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Passive">Passive</SelectItem>
              <SelectItem value="Action">Action</SelectItem>
              <SelectItem value="Bonus Action">Bonus Action</SelectItem>
              <SelectItem value="Reaction">Reaction</SelectItem>
              <SelectItem value="Free">Free</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Effect</Label>
          <Select value={effectType} onValueChange={(v) => onChange({ effect_type: v })}>
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MENU_FEATURE_EFFECT_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {effectType === "Damage" && (
          <>
            <div>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Damage dice</Label>
              <Input
                value={option.damage_dice || ""}
                onChange={(e) => onChange({ damage_dice: e.target.value })}
                placeholder="1d6"
                className="bg-[#050816] border-slate-700 text-white text-xs h-8"
              />
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Damage type</Label>
              <Select
                value={option.damage_type || ""}
                onValueChange={(v) => onChange({ damage_type: v === "__none" ? "" : v })}
              >
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {DAMAGE_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {effectType === "Healing" && (
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Healing dice</Label>
            <Input
              value={option.healing_dice || ""}
              onChange={(e) => onChange({ healing_dice: e.target.value })}
              placeholder="1d8"
              className="bg-[#050816] border-slate-700 text-white text-xs h-8"
            />
          </div>
        )}

        {effectType === "Condition" && (
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Condition</Label>
            <Select
              value={option.applies_condition || ""}
              onValueChange={(v) => onChange({ applies_condition: v === "__none" ? "" : v })}
            >
              <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="__none">None</SelectItem>
                {Object.keys(CONDITION_COLORS).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}

        {effectType === "Spell" && (
          <>
            <div className="md:col-span-2">
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Spell reference</Label>
              <Input
                value={option.spell_reference || ""}
                onChange={(e) => onChange({ spell_reference: e.target.value })}
                placeholder="e.g., Mage Armor"
                className="bg-[#050816] border-slate-700 text-white text-xs h-8"
              />
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Spell cost</Label>
              <Select value={option.spell_cost || "slot"} onValueChange={(v) => onChange({ spell_cost: v })}>
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="slot">Uses a slot</SelectItem>
                  <SelectItem value="free">Free (at will)</SelectItem>
                  <SelectItem value="once_long">1/long rest</SelectItem>
                  <SelectItem value="once_short">1/short rest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {effectType === "Passive Modifier" && (
          <>
            <div>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Modifier target</Label>
              <Input
                value={option.modifier_target || ""}
                onChange={(e) => onChange({ modifier_target: e.target.value })}
                placeholder="eldritch_blast_damage"
                className="bg-[#050816] border-slate-700 text-white text-xs h-8"
              />
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Modifier value</Label>
              <Input
                value={option.modifier_value || ""}
                onChange={(e) => onChange({ modifier_value: e.target.value })}
                placeholder="charisma_mod / +2 / 1d6"
                className="bg-[#050816] border-slate-700 text-white text-xs h-8"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Tier 3 §B — Non-slot spell costs. Blood magic (HP), exhaustion,
// hit dice, consumed materials, and custom pools. After-effects fire
// based on trigger (on_cast / on_concentration_break / after_duration)
// with optional plain-text conditions like "spell level 6+".
function AlternativeCostFields({ value, onChange }) {
  const block = value || { enabled: false, replaces_slot: true, costs: [], after_effects: [] };
  const patch = (fields) => onChange({ ...block, ...fields });
  const costs = Array.isArray(block.costs) ? block.costs : [];
  const afterEffects = Array.isArray(block.after_effects) ? block.after_effects : [];

  const setEnabled = (on) => patch({
    enabled: on,
    costs: on && costs.length === 0 ? [{ ...BLANK_ALT_COST }] : costs,
  });

  const updateCost = (idx, fields) => patch({
    costs: costs.map((c, i) => (i === idx ? { ...c, ...fields } : c)),
  });
  const addCost = () => patch({ costs: [...costs, { ...BLANK_ALT_COST }] });
  const removeCost = (idx) => patch({ costs: costs.filter((_, i) => i !== idx) });

  const updateAfter = (idx, fields) => patch({
    after_effects: afterEffects.map((c, i) => (i === idx ? { ...c, ...fields } : c)),
  });
  const addAfter = () => patch({ after_effects: [...afterEffects, { ...BLANK_ALT_AFTER_EFFECT }] });
  const removeAfter = (idx) => patch({ after_effects: afterEffects.filter((_, i) => i !== idx) });

  return (
    <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Alternative Casting Cost</h4>
          <p className="text-[10px] text-slate-500">Blood magic, exhaustion, hit dice, consumed materials, custom pools.</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!block.enabled} onCheckedChange={setEnabled} />
          <span className="text-[10px] text-slate-400">{block.enabled ? "On" : "Off"}</span>
        </div>
      </div>
      {block.enabled && (
        <>
          <div className="flex items-center gap-2">
            <Switch
              checked={!!block.replaces_slot}
              onCheckedChange={(c) => patch({ replaces_slot: c })}
            />
            <span className="text-xs text-slate-300">
              Replaces spell slot (off = paid in addition to a slot)
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Costs</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCost}>
                <Plus className="w-3 h-3 mr-1" /> Add Cost
              </Button>
            </div>
            {costs.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic text-center py-2">No costs defined.</p>
            ) : (
              costs.map((cost, idx) => (
                <div key={idx} className="bg-[#0b1220] border border-[#1e293b] rounded p-2 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Type</Label>
                        <Select value={cost.type || "hp"} onValueChange={(v) => updateCost(idx, { type: v })}>
                          <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SPELL_COST_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Amount</Label>
                        <Input
                          value={cost.amount || ""}
                          onChange={(e) => updateCost(idx, { amount: e.target.value })}
                          placeholder='"5 per spell level" / "1d4" / "2"'
                          className="bg-[#050816] border-slate-700 text-white text-xs h-8"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCost(idx)}
                      className="text-slate-400 hover:text-red-400 mt-5"
                      title="Remove"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                  <Textarea
                    value={cost.description || ""}
                    onChange={(e) => updateCost(idx, { description: e.target.value })}
                    placeholder="Flavor / flavor text."
                    rows={2}
                    className="bg-[#050816] border-slate-700 text-white text-xs"
                  />
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">After-Effects (optional)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addAfter}>
                <Plus className="w-3 h-3 mr-1" /> Add After-Effect
              </Button>
            </div>
            {afterEffects.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic text-center py-2">No after-effects.</p>
            ) : (
              afterEffects.map((ae, idx) => (
                <div key={idx} className="bg-[#0b1220] border border-[#1e293b] rounded p-2 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Trigger</Label>
                        <Select value={ae.trigger || "on_cast"} onValueChange={(v) => updateAfter(idx, { trigger: v })}>
                          <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on_cast">On Cast</SelectItem>
                            <SelectItem value="on_concentration_break">On Concentration Break</SelectItem>
                            <SelectItem value="after_duration">After Duration Ends</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Effect</Label>
                        <Select value={ae.effect_type || "exhaustion"} onValueChange={(v) => updateAfter(idx, { effect_type: v })}>
                          <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="exhaustion">Exhaustion level</SelectItem>
                            <SelectItem value="damage">Damage</SelectItem>
                            <SelectItem value="condition">Condition</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Amount</Label>
                        <Input
                          value={ae.amount ?? ""}
                          onChange={(e) => updateAfter(idx, { amount: e.target.value })}
                          placeholder="1 / 2d6 / Blinded"
                          className="bg-[#050816] border-slate-700 text-white text-xs h-8"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Condition (when it fires)</Label>
                        <Input
                          value={ae.condition || ""}
                          onChange={(e) => updateAfter(idx, { condition: e.target.value })}
                          placeholder='"spell level 6+" / "on concentration break"'
                          className="bg-[#050816] border-slate-700 text-white text-xs h-8"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAfter(idx)}
                      className="text-slate-400 hover:text-red-400 mt-5"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Tier 3 §A — Cursed item authoring. Conditionally reveals fields
// per curse_type. The cannot_unattune flag is a separate cross-cutting
// switch that combines with any curse type so an item can be a stat-
// penalty curse AND impossible to remove without Remove Curse.
function CurseFields({ value, onChange }) {
  const curse = value || { ...BLANK_CURSE };
  const enabled = !!curse.enabled;
  const setEnabled = (on) => onChange(on ? { ...BLANK_CURSE, ...curse, enabled: true } : { ...curse, enabled: false });
  const patch = (fields) => onChange({ ...curse, ...fields });
  const patchSub = (key, fields) => patch({ [key]: { ...(curse[key] || {}), ...fields } });

  const stages = Array.isArray(curse.progressive?.stages) ? curse.progressive.stages : [];
  const addStage = () => patchSub("progressive", { stages: [...stages, { trigger: "1_week", effect: "" }] });
  const updateStage = (idx, fields) => patchSub("progressive", {
    stages: stages.map((s, i) => (i === idx ? { ...s, ...fields } : s)),
  });
  const removeStage = (idx) => patchSub("progressive", { stages: stages.filter((_, i) => i !== idx) });

  return (
    <div className="bg-gradient-to-br from-[#1a0a14]/80 to-[#0b1220] border-2 border-purple-700/50 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[11px] uppercase tracking-widest text-purple-300 font-black">Curse</h4>
          <p className="text-[10px] text-slate-500">Stat penalties, forced behavior, recurring damage, can't-unattune, progressive corruption.</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className="text-[10px] text-slate-400">{enabled ? "Cursed" : "Off"}</span>
        </div>
      </div>
      {enabled && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Reveal trigger">
              <Select value={curse.reveal_trigger || "on_attune"} onValueChange={(v) => patch({ reveal_trigger: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURSE_REVEAL_TRIGGERS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Curse type">
              <Select value={curse.curse_type || "stat_penalty"} onValueChange={(v) => patch({ curse_type: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURSE_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={!!curse.identified_as_cursed}
              onCheckedChange={(c) => patch({ identified_as_cursed: c })}
            />
            <span className="text-xs text-slate-300">Identify spell detects the curse</span>
          </div>

          {curse.curse_type === "stat_penalty" && (
            <div className="bg-[#0b1220] border border-purple-700/40 rounded p-2 grid grid-cols-2 gap-2">
              <Field label="Ability">
                <Select value={curse.stat_penalty?.ability || "WIS"} onValueChange={(v) => patchSub("stat_penalty", { ability: v })}>
                  <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SAVE_ABILITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Modifier">
                <Input
                  type="number"
                  value={curse.stat_penalty?.amount ?? -2}
                  onChange={(e) => patchSub("stat_penalty", { amount: Number(e.target.value) || 0 })}
                  className="bg-[#050816] border-slate-700 text-white text-xs h-8"
                />
              </Field>
            </div>
          )}

          {curse.curse_type === "forced_behavior" && (
            <div className="bg-[#0b1220] border border-purple-700/40 rounded p-2 space-y-2">
              <Textarea
                value={curse.forced_behavior?.description || ""}
                onChange={(e) => patchSub("forced_behavior", { description: e.target.value })}
                placeholder='"You must attack the nearest creature at the start of combat."'
                rows={2}
                className="bg-[#050816] border-slate-700 text-white text-xs"
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!curse.forced_behavior?.save_to_resist}
                  onCheckedChange={(c) => patchSub("forced_behavior", { save_to_resist: c })}
                />
                <span className="text-xs text-slate-300">Save to resist</span>
              </div>
              {curse.forced_behavior?.save_to_resist && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Save ability">
                    <Select value={curse.forced_behavior?.save_ability || "WIS"} onValueChange={(v) => patchSub("forced_behavior", { save_ability: v })}>
                      <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SAVE_ABILITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Save DC">
                    <Input
                      type="number" min={1}
                      value={curse.forced_behavior?.save_dc ?? 15}
                      onChange={(e) => patchSub("forced_behavior", { save_dc: Number(e.target.value) || 15 })}
                      className="bg-[#050816] border-slate-700 text-white text-xs h-8"
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {curse.curse_type === "recurring_damage" && (
            <div className="bg-[#0b1220] border border-purple-700/40 rounded p-2 grid grid-cols-3 gap-2">
              <Field label="Damage dice">
                <Input
                  value={curse.recurring?.damage_dice || ""}
                  onChange={(e) => patchSub("recurring", { damage_dice: e.target.value })}
                  placeholder="1d4"
                  className="bg-[#050816] border-slate-700 text-white text-xs h-8"
                />
              </Field>
              <Field label="Damage type">
                <Select
                  value={curse.recurring?.damage_type || "necrotic"}
                  onValueChange={(v) => patchSub("recurring", { damage_type: v })}
                >
                  <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAMAGE_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Trigger">
                <Select value={curse.recurring?.trigger || "dawn"} onValueChange={(v) => patchSub("recurring", { trigger: v })}>
                  <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dawn">Dawn</SelectItem>
                    <SelectItem value="dusk">Dusk</SelectItem>
                    <SelectItem value="long_rest">Long rest</SelectItem>
                    <SelectItem value="short_rest">Short rest</SelectItem>
                    <SelectItem value="on_kill">On kill</SelectItem>
                    <SelectItem value="custom">Custom (see desc)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}

          {curse.curse_type === "progressive" && (
            <div className="bg-[#0b1220] border border-purple-700/40 rounded p-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Progressive stages</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStage}>
                  <Plus className="w-3 h-3 mr-1" /> Add Stage
                </Button>
              </div>
              {stages.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic text-center py-2">No stages defined.</p>
              ) : (
                stages.map((stage, idx) => (
                  <div key={idx} className="bg-[#050816] border border-purple-700/40 rounded p-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={stage.trigger || ""}
                        onChange={(e) => updateStage(idx, { trigger: e.target.value })}
                        placeholder="1_week / 1_month / 3_months"
                        className="bg-[#0b1220] border-slate-700 text-white text-xs h-8 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeStage(idx)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                    <Textarea
                      value={stage.effect || ""}
                      onChange={(e) => updateStage(idx, { effect: e.target.value })}
                      placeholder="What happens at this stage."
                      rows={2}
                      className="bg-[#0b1220] border-slate-700 text-white text-xs"
                    />
                  </div>
                ))
              )}
            </div>
          )}

          <div className="bg-[#0b1220] border border-purple-700/40 rounded p-2 space-y-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={!!curse.cannot_unattune}
                onCheckedChange={(c) => patch({ cannot_unattune: c })}
              />
              <span className="text-xs text-slate-300">Cannot unattune (Remove Curse required)</span>
            </div>
            {curse.cannot_unattune && (
              <Field label="Remove Curse DC (blank = auto-success)">
                <Input
                  type="number" min={1}
                  value={curse.remove_curse_dc ?? ""}
                  onChange={(e) => patch({ remove_curse_dc: e.target.value === "" ? null : Number(e.target.value) })}
                  placeholder="blank"
                  className="bg-[#050816] border-slate-700 text-white text-xs h-8"
                />
              </Field>
            )}
          </div>

          <Field label="Description">
            <Textarea
              value={curse.description || ""}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder='Flavor — "The ring whispers to you in Abyssal, urging violence."'
              rows={2}
              className="bg-[#0b1220] border-slate-700 text-white text-xs"
            />
          </Field>
        </>
      )}
    </div>
  );
}

// Tier 3 §B — Sentient item authoring. Captures DMG sentient-item
// fields plus a structured conflict block so the GM-tools "Trigger
// Conflict" flow can reach into the item to find triggers + on_loss
// instead of asking the GM to retype them every session.
function SentienceFields({ value, onChange }) {
  const sentience = value || { ...BLANK_SENTIENCE };
  const enabled = !!sentience.enabled;
  const setEnabled = (on) => onChange(on ? { ...BLANK_SENTIENCE, ...sentience, enabled: true } : { ...sentience, enabled: false });
  const patch = (fields) => onChange({ ...sentience, ...fields });
  const patchConflict = (fields) => patch({ conflict: { ...(sentience.conflict || {}), ...fields } });
  const triggers = Array.isArray(sentience.conflict?.trigger_conditions) ? sentience.conflict.trigger_conditions : [];

  const addTrigger = () => patchConflict({ trigger_conditions: [...triggers, ""] });
  const updateTrigger = (idx, text) => patchConflict({
    trigger_conditions: triggers.map((t, i) => (i === idx ? text : t)),
  });
  const removeTrigger = (idx) => patchConflict({ trigger_conditions: triggers.filter((_, i) => i !== idx) });

  const toggleSense = (sense) => {
    const cur = Array.isArray(sentience.senses) ? sentience.senses : [];
    const next = cur.includes(sense) ? cur.filter((s) => s !== sense) : [...cur, sense];
    patch({ senses: next });
  };

  const languagesText = Array.isArray(sentience.languages) ? sentience.languages.join(", ") : "";

  return (
    <div className="bg-gradient-to-br from-[#0b1430]/80 to-[#050816] border-2 border-cyan-500/40 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[11px] uppercase tracking-widest text-cyan-300 font-black">Sentience</h4>
          <p className="text-[10px] text-slate-500">Mental scores, senses, communication, alignment, personality, purpose, conflict.</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className="text-[10px] text-slate-400">{enabled ? "Sentient" : "Off"}</span>
        </div>
      </div>
      {enabled && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {["intelligence", "wisdom", "charisma"].map((key) => (
              <Field key={key} label={key.toUpperCase().slice(0, 3)}>
                <Input
                  type="number" min={1} max={30}
                  value={sentience[key] ?? 10}
                  onChange={(e) => patch({ [key]: Number(e.target.value) || 10 })}
                  className="bg-[#0b1220] border-slate-700 text-white text-center"
                />
              </Field>
            ))}
          </div>

          <div>
            <Label className="block mb-1 text-xs text-slate-300 font-semibold">Senses</Label>
            <div className="flex flex-wrap gap-1.5">
              {SENTIENCE_SENSES.map((sense) => {
                const active = Array.isArray(sentience.senses) && sentience.senses.includes(sense);
                return (
                  <button
                    key={sense}
                    type="button"
                    onClick={() => toggleSense(sense)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${
                      active
                        ? "bg-cyan-400 text-[#050816] border-cyan-400"
                        : "bg-[#0b1220] border-slate-700 text-slate-300 hover:border-cyan-400/60"
                    }`}
                  >
                    {sense}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Communication">
              <Select value={sentience.communication || "empathy"} onValueChange={(v) => patch({ communication: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SENTIENCE_COMMUNICATION.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Alignment">
              <Select value={sentience.alignment || "True Neutral"} onValueChange={(v) => patch({ alignment: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {ALIGNMENTS.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Languages (comma-separated)">
              <Input
                value={languagesText}
                onChange={(e) => patch({
                  languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })}
                placeholder="Common, Elvish, Draconic"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          </div>

          <Field label="Personality">
            <Textarea
              value={sentience.personality || ""}
              onChange={(e) => patch({ personality: e.target.value })}
              placeholder="Sardonic and impatient. Values courage above all."
              rows={2}
              className="bg-[#0b1220] border-slate-700 text-white text-xs"
            />
          </Field>
          <Field label="Purpose">
            <Textarea
              value={sentience.purpose || ""}
              onChange={(e) => patch({ purpose: e.target.value })}
              placeholder="Destroy undead wherever they are found."
              rows={2}
              className="bg-[#0b1220] border-slate-700 text-white text-xs"
            />
          </Field>

          <div className="bg-[#050816] border border-cyan-500/30 rounded p-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-widest text-cyan-200 font-bold">Conflict triggers</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTrigger}>
                <Plus className="w-3 h-3 mr-1" /> Add Trigger
              </Button>
            </div>
            {triggers.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic text-center py-2">
                No triggers — the item never initiates conflict.
              </p>
            ) : (
              <div className="space-y-1">
                {triggers.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={t}
                      onChange={(e) => updateTrigger(idx, e.target.value)}
                      placeholder="Wielder allies with undead"
                      className="bg-[#0b1220] border-slate-700 text-white text-xs h-8 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeTrigger(idx)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Field label="On wielder loss (when item wins the contest)">
              <Textarea
                value={sentience.conflict?.on_loss || ""}
                onChange={(e) => patchConflict({ on_loss: e.target.value })}
                placeholder="The weapon controls the wielder for 1d4 rounds, attacking the nearest undead."
                rows={2}
                className="bg-[#0b1220] border-slate-700 text-white text-xs"
              />
            </Field>
          </div>
        </>
      )}
    </div>
  );
}

function ChipMultiSelect({ label, options, values, onChange }) {
  const selected = Array.isArray(values) ? values : [];
  const toggle = (value) => {
    const idx = selected.indexOf(value);
    const next = [...selected];
    if (idx === -1) next.push(value);
    else next.splice(idx, 1);
    onChange(next);
  };
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors capitalize ${
                active
                  ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                  : "bg-[#0b1220] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

// Shared image-upload control. Same behavior as ItemImageUpload but
// parameterized on the storage path so monster covers land in
// campaign-assets/homebrew/monsters/.
function HomebrewImageUpload({ url, onChange, path }) {
  const [uploading, setUploading] = useState(false);
  const handle = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "user-assets", path || "homebrew", { uploadType: "homebrew" });
      onChange(file_url);
    } catch (err) {
      toast.error("Image upload failed");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      {url && (
        <img src={url} alt="" className="w-16 h-16 rounded object-cover border border-slate-700" />
      )}
      <label className="inline-flex items-center gap-2 cursor-pointer bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-3 py-2 text-xs font-semibold text-slate-300">
        <Upload className="w-3 h-3" />
        {uploading ? "Uploading..." : url ? "Replace" : "Upload"}
        <input type="file" accept="image/*" className="hidden" onChange={handle} disabled={uploading} />
      </label>
      {url && (
        <button type="button" onClick={() => onChange("")} className="text-xs text-slate-400 hover:text-red-400">Remove</button>
      )}
    </div>
  );
}

// Legacy actions had { name, description, attack_bonus, damage,
// damage_type, reach }. Normalize them into the expanded shape so the
// form can edit them cleanly on load. Anything that smells like an
// attack stays an attack; everything else becomes no_roll (the old
// free-text effect entries).
function normalizeAction(a) {
  if (!a || typeof a !== "object") return { ...BLANK_MONSTER_ACTION };
  const hasAttack = a.attack_bonus !== undefined && a.attack_bonus !== null && a.attack_bonus !== "";
  const hasDamage = !!a.damage;
  const inferredType =
    a.action_type
    || (hasAttack ? "melee_attack" : hasDamage ? "saving_throw" : "no_roll");
  return {
    ...BLANK_MONSTER_ACTION,
    ...a,
    action_type: inferredType,
    trigger: a.trigger && typeof a.trigger === "object" ? a.trigger : null,
    save_tiers: Array.isArray(a.save_tiers) ? a.save_tiers : [],
  };
}

function normalizeVillainActions(value) {
  const actions = Array.isArray(value?.actions) ? value.actions : [];
  const padded = [1, 2, 3].map((round) => {
    const existing = actions.find((a) => a?.round === round) || actions[round - 1];
    return { ...BLANK_VILLAIN_ACTION, round, ...(existing || {}) };
  });
  return {
    enabled: !!value?.enabled,
    actions: padded,
  };
}

function normalizeAura(a) {
  if (!a || typeof a !== "object") return { ...BLANK_AURA };
  return { ...BLANK_AURA, ...a };
}

export function monsterFromModifications(mods) {
  if (!mods || typeof mods !== "object") return { ...BLANK_MONSTER };
  return {
    ...BLANK_MONSTER,
    ...mods,
    stats: { ...BLANK_MONSTER.stats, ...(mods.stats || mods.abilities || {}) },
    saves: Array.isArray(mods.saves || mods.saving_throws) ? (mods.saves || mods.saving_throws) : [],
    skills: Array.isArray(mods.skills) ? mods.skills : [],
    damage_resistances:    Array.isArray(mods.damage_resistances)    ? mods.damage_resistances    : [],
    damage_immunities:     Array.isArray(mods.damage_immunities)     ? mods.damage_immunities     : [],
    damage_vulnerabilities:Array.isArray(mods.damage_vulnerabilities)? mods.damage_vulnerabilities: [],
    condition_immunities:  Array.isArray(mods.condition_immunities)  ? mods.condition_immunities  : [],
    actions:           Array.isArray(mods.actions)           ? mods.actions.map(normalizeAction)           : [],
    bonus_actions:     Array.isArray(mods.bonus_actions)     ? mods.bonus_actions.map(normalizeAction)     : [],
    reactions:         Array.isArray(mods.reactions)         ? mods.reactions.map(normalizeAction)         : [],
    legendary_actions: Array.isArray(mods.legendary_actions) ? mods.legendary_actions.map(normalizeAction) : [],
    lair_actions:      Array.isArray(mods.lair_actions)      ? mods.lair_actions.map(normalizeAction)      : [],
    auras:             Array.isArray(mods.auras)             ? mods.auras.map(normalizeAura)               : [],
    multiattack: mods.multiattack && typeof mods.multiattack === "object"
      ? {
          enabled: !!mods.multiattack.enabled,
          description: mods.multiattack.description || "",
          attacks: Array.isArray(mods.multiattack.attacks) ? mods.multiattack.attacks : [],
        }
      : { ...BLANK_MONSTER.multiattack },
    legendary_actions_per_round: Number(mods.legendary_actions_per_round ?? BLANK_MONSTER.legendary_actions_per_round) || 0,
    legendary_resistances: Number(mods.legendary_resistances ?? 0) || 0,
    villain_actions: normalizeVillainActions(mods.villain_actions),
    // `cr` and `challenge_rating` are used interchangeably — honour
    // whichever the caller stored.
    cr: String(mods.cr ?? mods.challenge_rating ?? "1"),
  };
}

function serializeAction(a) {
  if (!a || typeof a !== "object") return null;
  return {
    name: a.name || "",
    description: a.description || "",
    action_type: a.action_type || "melee_attack",
    action_cost: a.action_cost || "Action",
    legendary_cost: a.action_cost === "Legendary" ? (Number(a.legendary_cost) || 1) : null,
    recharge: a.recharge || "",
    reaction_trigger: a.action_cost === "Reaction" ? (a.reaction_trigger || "") : "",
    attack_bonus: a.attack_bonus === "" || a.attack_bonus == null
      ? null
      : Number(a.attack_bonus),
    damage: a.damage || "",
    damage_type: a.damage_type || "",
    reach: a.reach || "",
    bonus_damage_dice: a.bonus_damage_dice || "",
    bonus_damage_type: a.bonus_damage_type || "",
    save_ability: a.save_ability || "",
    save_dc: a.save_dc === "" || a.save_dc == null ? null : Number(a.save_dc),
    half_on_save: !!a.half_on_save,
    aoe_shape: a.aoe_shape || "",
    aoe_size: a.aoe_size || "",
    target_count: a.target_count || "",
    applies_condition: a.applies_condition || "",
    condition_save: a.applies_condition ? (a.condition_save || "") : "",
    condition_dc: a.condition_dc === "" || a.condition_dc == null ? null : Number(a.condition_dc),
    condition_end: a.condition_end || "save_each_turn",
    condition_duration: a.condition_duration || "",
    healing_dice: a.healing_dice || "",
    healing_flat: a.healing_flat || "",
    trigger: serializeTrigger(a.trigger),
    save_tiers: Array.isArray(a.save_tiers) ? a.save_tiers : [],
  };
}

function serializeTrigger(t) {
  if (!t || typeof t !== "object" || !t.event) return null;
  const filters = t.filters || {};
  const effect = t.effect || {};
  return {
    event: t.event,
    filters: {
      damage_type:   filters.damage_type   || "",
      weapon_type:   filters.weapon_type   || "",
      source:        filters.source        || "",
      target:        filters.target        || "",
      range:         filters.range == null || filters.range === "" ? null : Number(filters.range),
      creature_type: filters.creature_type || "",
    },
    gate: t.gate || "unlimited",
    gate_count: t.gate_count == null || t.gate_count === "" ? null : Number(t.gate_count),
    effect: {
      effect_type:       effect.effect_type       || "",
      damage_dice:       effect.damage_dice       || "",
      damage_type:       effect.damage_type       || "",
      healing_dice:      effect.healing_dice      || "",
      applies_condition: effect.applies_condition || "",
      condition_save:    effect.condition_save    || "",
      condition_dc:      effect.condition_dc == null || effect.condition_dc === "" ? null : Number(effect.condition_dc),
      temp_hp:           effect.temp_hp           || "",
      description:       effect.description       || "",
    },
  };
}

function serializeVillainActions(v) {
  if (!v || typeof v !== "object" || !v.enabled) {
    return { enabled: false, actions: [] };
  }
  const actions = Array.isArray(v.actions) ? v.actions : [];
  return {
    enabled: true,
    actions: actions.slice(0, 3).map((a, i) => ({
      name: a?.name || "",
      round: Number(a?.round) || (i + 1),
      description: a?.description || "",
      action_type: a?.action_type || "no_roll",
      save_ability: a?.save_ability || "",
      save_dc: a?.save_dc === "" || a?.save_dc == null ? null : Number(a.save_dc),
      attack_bonus: a?.attack_bonus === "" || a?.attack_bonus == null ? null : Number(a.attack_bonus),
      damage_dice: a?.damage_dice || "",
      damage_type: a?.damage_type || "",
      healing_dice: a?.healing_dice || "",
      half_on_save: !!a?.half_on_save,
      applies_condition: a?.applies_condition || "",
      condition_end: a?.condition_end || "",
      aoe_shape: a?.aoe_shape || "",
      aoe_size: a?.aoe_size || "",
    })),
  };
}

function serializeAura(a) {
  if (!a || typeof a !== "object") return null;
  return {
    name: a.name || "",
    description: a.description || "",
    radius: a.radius || "",
    damage_dice: a.damage_dice || "",
    damage_type: a.damage_type || "",
    save_ability: a.save_ability || "",
    save_dc: a.save_dc === "" || a.save_dc == null ? null : Number(a.save_dc),
    trigger: a.trigger || "start_of_turn",
    applies_condition: a.applies_condition || "",
  };
}

export function buildMonsterModifications(monster) {
  if (!monster || typeof monster !== "object") return {};
  const serializeList = (list) =>
    Array.isArray(list) ? list.map(serializeAction).filter(Boolean) : [];
  const actions           = serializeList(monster.actions);
  const bonus_actions     = serializeList(monster.bonus_actions);
  const reactions         = serializeList(monster.reactions);
  const legendary_actions = serializeList(monster.legendary_actions);
  const lair_actions      = serializeList(monster.lair_actions);
  const auras             = Array.isArray(monster.auras)
    ? monster.auras.map(serializeAura).filter(Boolean)
    : [];
  const statsCopy = { ...(monster.stats || {}) };
  const multiattack = monster.multiattack && typeof monster.multiattack === "object"
    ? {
        enabled: !!monster.multiattack.enabled,
        description: monster.multiattack.description || "",
        attacks: Array.isArray(monster.multiattack.attacks)
          ? monster.multiattack.attacks
              .filter((a) => a && a.name)
              .map((a) => ({ name: a.name, count: Number(a.count) || 1 }))
          : [],
      }
    : { enabled: false, description: "", attacks: [] };
  return {
    name: monster.name || "",
    size: monster.size || "Medium",
    // Both keys kept so downstream readers that expect either work.
    type: monster.creature_type || "Humanoid",
    creature_type: monster.creature_type || "Humanoid",
    alignment: monster.alignment || "True Neutral",
    cr: String(monster.cr ?? "1"),
    challenge_rating: String(monster.cr ?? "1"),
    armor_class: Number(monster.armor_class) || 0,
    hit_points: monster.hit_points || "",
    speed: monster.speed || "",
    // Duplicate `abilities` + `stats` keys: legacy readers hit one or the other.
    abilities: statsCopy,
    stats: statsCopy,
    saving_throws: Array.isArray(monster.saves) ? monster.saves : [],
    saves: Array.isArray(monster.saves) ? monster.saves : [],
    skills: Array.isArray(monster.skills) ? monster.skills : [],
    damage_resistances:    Array.isArray(monster.damage_resistances)    ? monster.damage_resistances    : [],
    damage_immunities:     Array.isArray(monster.damage_immunities)     ? monster.damage_immunities     : [],
    damage_vulnerabilities:Array.isArray(monster.damage_vulnerabilities)? monster.damage_vulnerabilities: [],
    condition_immunities:  Array.isArray(monster.condition_immunities)  ? monster.condition_immunities  : [],
    senses: monster.senses || "",
    languages: monster.languages || "",
    image_url: monster.image_url || "",
    description: monster.description || "",
    actions,
    bonus_actions,
    reactions,
    legendary_actions,
    lair_actions,
    auras,
    multiattack,
    legendary_actions_per_round: Number(monster.legendary_actions_per_round) || 0,
    legendary_resistances: Number(monster.legendary_resistances) || 0,
    villain_actions: serializeVillainActions(monster.villain_actions),
  };
}

// Placeholder serializers for Custom Spell / Custom Ability. These
// are referenced by the init / save branches so future form work
// can land without touching that plumbing. They currently pass the
// input through untouched so any pre-existing spell/ability brew
// round-trips cleanly.
// Components may arrive as either an object ({v,s,m,material}) or a
// concatenated string ("V, S, M (a pinch of sulfur)"). Normalize on
// load so the form always edits the object shape.
function parseComponents(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      v: !!value.v,
      s: !!value.s,
      m: !!value.m,
      material: value.material || "",
    };
  }
  const str = typeof value === "string" ? value : "";
  const upper = str.toUpperCase();
  const matMatch = str.match(/\(([^)]+)\)/);
  return {
    v: /\bV\b/.test(upper),
    s: /\bS\b/.test(upper),
    m: /\bM\b/.test(upper),
    material: matMatch ? matMatch[1].trim() : "",
  };
}

function formatComponents(c) {
  if (!c) return "";
  const parts = [];
  if (c.v) parts.push("V");
  if (c.s) parts.push("S");
  if (c.m) parts.push("M");
  let out = parts.join(", ");
  if (c.m && c.material) out += ` (${c.material})`;
  return out;
}

function normalizeAlternativeCosts(value) {
  if (!value || typeof value !== "object") {
    return { enabled: false, replaces_slot: true, costs: [], after_effects: [] };
  }
  return {
    enabled: !!value.enabled,
    replaces_slot: value.replaces_slot !== false,
    costs: Array.isArray(value.costs) ? value.costs : [],
    after_effects: Array.isArray(value.after_effects) ? value.after_effects : [],
  };
}

function serializeAlternativeCosts(value) {
  if (!value || !value.enabled) return null;
  const costs = (Array.isArray(value.costs) ? value.costs : [])
    .filter((c) => c && c.type && (c.amount || c.description))
    .map((c) => ({
      type: c.type,
      amount: c.amount || "",
      amount_value: c.amount_value == null || c.amount_value === "" ? null : Number(c.amount_value),
      amount_per_level: c.amount_per_level == null || c.amount_per_level === "" ? null : Number(c.amount_per_level),
      description: c.description || "",
    }));
  const after_effects = (Array.isArray(value.after_effects) ? value.after_effects : [])
    .filter((ae) => ae && (ae.effect_type || ae.description))
    .map((ae) => ({
      trigger: ae.trigger || "on_cast",
      effect_type: ae.effect_type || "",
      amount: ae.amount === "" || ae.amount == null ? null : ae.amount,
      condition: ae.condition || "",
      description: ae.description || "",
    }));
  return {
    enabled: true,
    replaces_slot: value.replaces_slot !== false,
    costs,
    after_effects,
  };
}

export function spellFromModifications(mods) {
  if (!mods || typeof mods !== "object") return { ...BLANK_SPELL };
  // Older spells encoded concentration / ritual into the duration
  // string ("Concentration, up to 1 minute"). When the explicit
  // boolean isn't present, sniff the duration so the toggle
  // reflects the spell's actual state on first edit.
  const durationText = (mods.duration || "").toLowerCase();
  const inferredConcentration = /concentration/.test(durationText);
  const inferredRitual = /ritual/.test(durationText);
  return {
    ...BLANK_SPELL,
    ...mods,
    // Favor the explicit keys from the registry but fall back to
    // legacy aliases that older brews might have stored.
    higher_level: mods.higher_level || mods.higher_levels || "",
    components: parseComponents(mods.components),
    classes: Array.isArray(mods.classes) ? mods.classes : [],
    damage_dice: mods.damage_dice || mods.dice || mods.damage || "",
    healing_dice: mods.healing_dice || mods.healing || "",
    effect_type:
      mods.effect_type
      || (mods.damage ? "Damage" : mods.healing ? "Healing" : "Utility"),
    resolution: mods.resolution
      || (mods.attack_roll ? "attack" : mods.save ? "save" : "save"),
    save: (mods.save || "DEX").toString().toUpperCase(),
    condition_save: (mods.condition_save || "WIS").toString().toUpperCase(),
    concentration: typeof mods.concentration === "boolean" ? mods.concentration : inferredConcentration,
    ritual: typeof mods.ritual === "boolean" ? mods.ritual : inferredRitual,
    alternative_costs: normalizeAlternativeCosts(mods.alternative_costs),
  };
}

export function buildSpellModifications(spell) {
  if (!spell || typeof spell !== "object") return {};
  const altCosts = serializeAlternativeCosts(spell.alternative_costs);
  const base = {
    name: spell.name || "",
    level: Number(spell.level) || 0,
    school: spell.school || "Evocation",
    casting_time: spell.casting_time || "1 action",
    range: spell.range || "",
    components: formatComponents(spell.components),
    components_detail: { ...(spell.components || {}) }, // keep structured form for downstream consumers
    duration: spell.duration || "Instantaneous",
    // Explicit flags so combat doesn't have to parse the duration
    // string. Spells table has dedicated columns for these on the
    // SRD side; keep the names matching.
    concentration: !!spell.concentration,
    ritual: !!spell.ritual,
    description: spell.description || "",
    higher_level: spell.higher_level || "",
    classes: Array.isArray(spell.classes) ? spell.classes : [],
    effect_type: (spell.effect_type || "Utility").toLowerCase(),
    source: "homebrew",
    ...(altCosts ? { alternative_costs: altCosts } : {}),
  };
  const effect = (spell.effect_type || "").toLowerCase();
  if (effect === "damage") {
    return {
      ...base,
      damage: spell.damage_dice || "",
      damage_dice: spell.damage_dice || "",
      damage_type: spell.damage_type || "",
      save: spell.resolution === "save" ? (spell.save || "DEX") : null,
      attack_roll: spell.resolution === "attack",
      half_on_save: spell.resolution === "save" ? !!spell.half_on_save : undefined,
      cantrip_scaling: Number(spell.level) === 0 ? !!spell.cantrip_scaling : false,
      upcast_per_level: spell.upcast_per_level || "",
    };
  }
  if (effect === "healing") {
    return {
      ...base,
      healing: spell.healing_dice || "",
      healing_dice: spell.healing_dice || "",
      add_spell_mod: !!spell.add_spell_mod,
      upcast_per_level: spell.upcast_per_level || "",
    };
  }
  if (effect === "condition") {
    return {
      ...base,
      condition: spell.condition_applied || "",
      condition_applied: spell.condition_applied || "",
      save: spell.condition_save || "WIS",
      condition_duration: spell.condition_duration || "",
    };
  }
  if (effect === "buff" || effect === "debuff") {
    return {
      ...base,
      effect_description: spell.effect_description || "",
    };
  }
  // Utility — nothing extra to serialize beyond the narrative fields
  // already captured by base.
  return base;
}
export function classFeatureFromModifications(mods) {
  if (!mods || typeof mods !== "object") return { ...BLANK_CLASS_FEATURE };
  // Honour legacy field names a prior stub saved under different keys.
  const scaling_die = mods.scaling_die && typeof mods.scaling_die === "object"
    ? {
        enabled: !!mods.scaling_die.enabled,
        base_die: mods.scaling_die.base_die || "1d4",
        progression: Array.isArray(mods.scaling_die.progression) ? mods.scaling_die.progression : [],
        usage: mods.scaling_die.usage || "",
      }
    : { ...BLANK_CLASS_FEATURE.scaling_die };
  const feature_dc = mods.feature_dc && typeof mods.feature_dc === "object"
    ? {
        enabled: !!mods.feature_dc.enabled,
        formula: mods.feature_dc.formula || "8 + prof + ability",
        ability: mods.feature_dc.ability || "STR",
      }
    : { ...BLANK_CLASS_FEATURE.feature_dc };
  const menu = mods.menu && typeof mods.menu === "object"
    ? {
        enabled: mods.menu.enabled !== false,
        learn_count: Array.isArray(mods.menu.learn_count) ? mods.menu.learn_count : [],
        swap_on_level_up: !!mods.menu.swap_on_level_up,
        swap_count: Number(mods.menu.swap_count) || 1,
        options: Array.isArray(mods.menu.options) ? mods.menu.options : [],
      }
    : { ...BLANK_CLASS_FEATURE.menu };
  return {
    ...BLANK_CLASS_FEATURE,
    ...mods,
    type: mods.type || mods.source_type || "Class Feature",
    class: mods.class || mods.class_name || "Fighter",
    level: Number(mods.level ?? mods.level_requirement ?? 1),
    image_url: mods.image_url || "",
    scaling_die,
    feature_dc,
    trigger: mods.trigger && typeof mods.trigger === "object" ? mods.trigger : null,
    menu,
  };
}

// Back-compat alias for anything still importing the old name.
export const abilityFromModifications = classFeatureFromModifications;

function serializeMenu(menu) {
  if (!menu || typeof menu !== "object") return null;
  const learn_count = (Array.isArray(menu.learn_count) ? menu.learn_count : [])
    .filter((r) => r && r.level)
    .map((r) => ({ level: Number(r.level), count: Number(r.count) || 1 }));
  const options = (Array.isArray(menu.options) ? menu.options : [])
    .filter((o) => o && o.name)
    .map((o) => ({
      name: o.name || "",
      description: o.description || "",
      level_requirement: Number(o.level_requirement) || 0,
      prerequisite: o.prerequisite || "",
      effect_type: o.effect_type || "Passive Modifier",
      cost: o.cost || "Passive",
      damage_dice: o.damage_dice || "",
      damage_type: o.damage_type || "",
      healing_dice: o.healing_dice || "",
      applies_condition: o.applies_condition || "",
      spell_reference: o.spell_reference || "",
      spell_cost: o.spell_cost || "slot",
      modifier_target: o.modifier_target || "",
      modifier_value: o.modifier_value || "",
    }));
  return {
    enabled: true,
    learn_count,
    swap_on_level_up: !!menu.swap_on_level_up,
    swap_count: Number(menu.swap_count) || 1,
    options,
  };
}

export function buildClassFeatureModifications(feature) {
  if (!feature || typeof feature !== "object") return {};
  const type = feature.type || "Class Feature";
  const isMenu = type === "Feature Menu";

  if (isMenu) {
    const menu = serializeMenu(feature.menu);
    return {
      name: feature.name || "",
      type,
      class: feature.class || "Fighter",
      level: Number(feature.level) || 1,
      description: feature.description || "",
      image_url: feature.image_url || "",
      source: "homebrew",
      menu: menu || { enabled: true, learn_count: [], swap_on_level_up: false, swap_count: 1, options: [] },
    };
  }

  const effectType = feature.effect_type || "Utility";
  const resolution = feature.resolution || "no_roll";
  const base = {
    name: feature.name || "",
    type,
    level: Number(feature.level) || 1,
    description: feature.description || "",
    cost: feature.cost || "Action",
    uses: feature.uses || "At Will",
    recharge: feature.recharge || "Long Rest",
    reaction_trigger: feature.cost === "Reaction" ? (feature.reaction_trigger || "") : "",
    effect_type: effectType,
    resolution,
    image_url: feature.image_url || "",
    source: "homebrew",
  };
  // Only class features carry a class key.
  if (type === "Class Feature") base.class = feature.class || "Fighter";

  if (effectType === "Damage") {
    base.damage_dice = feature.damage_dice || "";
    base.damage_type = feature.damage_type || "slashing";
    if (resolution === "save") {
      base.save_ability = feature.save_ability || "DEX";
      base.half_on_save = !!feature.half_on_save;
    }
  }
  if (effectType === "Healing") {
    base.healing_dice = feature.healing_dice || "";
    base.add_level = !!feature.add_level;
    base.add_ability_mod = !!feature.add_ability_mod;
  }
  if (effectType === "Condition") {
    base.condition_applied = feature.condition_applied || "";
    base.condition_save = feature.condition_save || "DEX";
    base.condition_dc_source = feature.condition_dc_source || "spell_dc";
    if (base.condition_dc_source === "fixed") {
      base.condition_dc_fixed = Number(feature.condition_dc_fixed) || 13;
    }
    base.condition_duration = feature.condition_duration || "";
  }
  if (effectType === "Resource") {
    base.resource_restored = feature.resource_restored || "Hit Points";
    base.resource_amount = feature.resource_amount || "";
  }
  if (feature.scaling_die?.enabled) {
    base.scaling_die = {
      enabled: true,
      base_die: feature.scaling_die.base_die || "1d4",
      progression: Array.isArray(feature.scaling_die.progression)
        ? feature.scaling_die.progression
            .filter((r) => r && r.level)
            .map((r) => ({ level: Number(r.level), die: r.die || "" }))
        : [],
      usage: feature.scaling_die.usage || "",
    };
  }
  // Feature DC — only if enabled.
  if (feature.feature_dc?.enabled) {
    base.feature_dc = {
      enabled: true,
      formula: feature.feature_dc.formula || "8 + prof + ability",
      ability: feature.feature_dc.ability || "STR",
    };
  }
  const trigger = serializeTrigger(feature.trigger);
  if (trigger) base.trigger = trigger;
  return base;
}

// Back-compat alias for anything still importing the old name.
export const buildAbilityModifications = buildClassFeatureModifications;

function CustomSpellForm({ spell, setSpell }) {
  const patch = (fields) => setSpell((prev) => ({ ...prev, ...fields }));
  const patchComponent = (key, value) => patch({
    components: { ...(spell.components || {}), [key]: value },
  });
  const toggleClass = (cls) => {
    const cur = Array.isArray(spell.classes) ? [...spell.classes] : [];
    const idx = cur.indexOf(cls);
    if (idx === -1) cur.push(cls);
    else cur.splice(idx, 1);
    patch({ classes: cur });
  };

  const effect = (spell.effect_type || "Utility").toLowerCase();
  const isCantrip = Number(spell.level) === 0;

  return (
    <div className="space-y-4">
      {/* --- Identity --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Name" required>
          <Input
            value={spell.name || ""}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g., Arcane Barrage"
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
        <Field label="Level">
          <Select
            value={String(spell.level ?? 0)}
            onValueChange={(v) => {
              const n = Number(v);
              // Leaving cantrip scaling on for a leveled spell would
              // be a contradiction — flip it off on level change.
              patch({ level: n, cantrip_scaling: n === 0 ? spell.cantrip_scaling : false });
            }}
          >
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }).map((_, i) => (
                <SelectItem key={i} value={String(i)}>
                  {i === 0 ? "Cantrip (0)" : `Level ${i}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="School">
          <Select value={spell.school} onValueChange={(v) => patch({ school: v })}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPELL_SCHOOLS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Casting Time">
          <Select value={spell.casting_time} onValueChange={(v) => patch({ casting_time: v })}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CASTING_TIMES.map((ct) => (<SelectItem key={ct} value={ct}>{ct}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Range">
          <Input
            value={spell.range || ""}
            onChange={(e) => patch({ range: e.target.value })}
            placeholder='e.g., 60 feet, Self, Touch, Self (30-foot cone)'
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
        <Field label="Duration">
          <Input
            value={spell.duration || ""}
            onChange={(e) => patch({ duration: e.target.value })}
            placeholder="Instantaneous, up to 1 minute, 1 hour"
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
      </div>

      {/* --- Concentration + Ritual flags --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-300 bg-[#0b1220] border border-slate-700 rounded-lg p-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!spell.concentration}
            onChange={(e) => patch({ concentration: e.target.checked })}
            className="accent-[#37F2D1]"
          />
          <span>
            <span className="font-bold text-white">Concentration</span> — only one
            concentration spell can be active per caster.
          </span>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-300 bg-[#0b1220] border border-slate-700 rounded-lg p-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!spell.ritual}
            onChange={(e) => patch({ ritual: e.target.checked })}
            className="accent-[#37F2D1]"
          />
          <span>
            <span className="font-bold text-white">Ritual</span> — can also be cast
            without a spell slot, taking +10 minutes.
          </span>
        </label>
      </div>

      {/* --- Components --- */}
      <Field label="Components">
        <div className="flex flex-wrap items-center gap-3">
          {[
            { key: "v", label: "V" },
            { key: "s", label: "S" },
            { key: "m", label: "M" },
          ].map(({ key, label }) => {
            const active = !!spell.components?.[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => patchComponent(key, !active)}
                className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded border transition-colors ${
                  active
                    ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                    : "bg-[#0b1220] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
                }`}
              >
                {label}
              </button>
            );
          })}
          {spell.components?.m && (
            <Input
              value={spell.components?.material || ""}
              onChange={(e) => patchComponent("material", e.target.value)}
              placeholder="e.g., a pinch of sulfur"
              className="bg-[#0b1220] border-slate-700 text-white flex-1 min-w-[200px]"
            />
          )}
        </div>
      </Field>

      {/* --- Description + upcast narrative --- */}
      <Field label="Description" required>
        <Textarea
          value={spell.description || ""}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="What does this spell do? Save / attack details go here."
          rows={4}
          className="bg-[#0b1220] border-slate-700 text-white"
        />
      </Field>
      <Field label="At Higher Levels">
        <Textarea
          value={spell.higher_level || ""}
          onChange={(e) => patch({ higher_level: e.target.value })}
          placeholder="What changes when cast using a higher-level slot? (optional)"
          rows={2}
          className="bg-[#0b1220] border-slate-700 text-white"
        />
      </Field>

      {/* --- Classes --- */}
      <Field label="Classes that can learn this spell">
        <div className="flex flex-wrap gap-1.5">
          {SPELL_CLASSES.map((cls) => {
            const active = Array.isArray(spell.classes) && spell.classes.includes(cls);
            return (
              <button
                key={cls}
                type="button"
                onClick={() => toggleClass(cls)}
                className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${
                  active
                    ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                    : "bg-[#0b1220] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
                }`}
              >
                {cls}
              </button>
            );
          })}
        </div>
      </Field>

      {/* --- Mechanical effect --- */}
      <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Mechanical Effect</h4>
        <Field label="Effect type">
          <Select value={spell.effect_type} onValueChange={(v) => patch({ effect_type: v })}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPELL_EFFECT_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>

        {effect === "damage" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Damage dice">
              <Input
                value={spell.damage_dice || ""}
                onChange={(e) => patch({ damage_dice: e.target.value })}
                placeholder="e.g., 8d6"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            <Field label="Damage type">
              <Select value={spell.damage_type} onValueChange={(v) => patch({ damage_type: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAMAGE_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Resolution">
              <RadioGroup
                value={spell.resolution || "save"}
                onValueChange={(v) => patch({ resolution: v })}
                className="flex gap-3 mt-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="res-attack" value="attack" />
                  <Label htmlFor="res-attack" className="text-xs text-slate-200">Spell Attack Roll</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="res-save" value="save" />
                  <Label htmlFor="res-save" className="text-xs text-slate-200">Saving Throw</Label>
                </div>
              </RadioGroup>
            </Field>
            {spell.resolution === "save" && (
              <Field label="Save ability">
                <Select value={spell.save} onValueChange={(v) => patch({ save: v })}>
                  <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SAVE_ABILITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            {spell.resolution === "save" && (
              <Field label="Half damage on save">
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={!!spell.half_on_save}
                    onCheckedChange={(c) => patch({ half_on_save: c })}
                  />
                  <span className="text-xs text-slate-300">{spell.half_on_save ? "Yes" : "No"}</span>
                </div>
              </Field>
            )}
            {isCantrip ? (
              <Field label="Cantrip scaling (5/11/17)">
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={!!spell.cantrip_scaling}
                    onCheckedChange={(c) => patch({ cantrip_scaling: c })}
                  />
                  <span className="text-xs text-slate-300">{spell.cantrip_scaling ? "Scales with character level" : "No scaling"}</span>
                </div>
              </Field>
            ) : (
              <Field label="Upcast bonus">
                <Input
                  value={spell.upcast_per_level || ""}
                  onChange={(e) => patch({ upcast_per_level: e.target.value })}
                  placeholder='e.g., 1d6 per level above 3rd'
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
            )}
          </div>
        )}

        {effect === "healing" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Healing dice">
              <Input
                value={spell.healing_dice || ""}
                onChange={(e) => patch({ healing_dice: e.target.value })}
                placeholder="e.g., 1d8"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            <Field label="Add spellcasting modifier">
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={!!spell.add_spell_mod}
                  onCheckedChange={(c) => patch({ add_spell_mod: c })}
                />
                <span className="text-xs text-slate-300">{spell.add_spell_mod ? "Yes" : "No"}</span>
              </div>
            </Field>
            <Field label="Upcast bonus">
              <Input
                value={spell.upcast_per_level || ""}
                onChange={(e) => patch({ upcast_per_level: e.target.value })}
                placeholder='e.g., 1d8 per level above 1st'
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          </div>
        )}

        {effect === "condition" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Condition applied">
              <Select value={spell.condition_applied} onValueChange={(v) => patch({ condition_applied: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {Object.keys(CONDITION_COLORS).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Save to resist">
              <Select value={spell.condition_save} onValueChange={(v) => patch({ condition_save: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SAVE_ABILITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Duration">
              <Input
                value={spell.condition_duration || ""}
                onChange={(e) => patch({ condition_duration: e.target.value })}
                placeholder="e.g., 1 minute"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          </div>
        )}

        {(effect === "buff" || effect === "debuff") && (
          <Field label="Effect description">
            <Textarea
              value={spell.effect_description || ""}
              onChange={(e) => patch({ effect_description: e.target.value })}
              placeholder="What does the buff / debuff do? Mechanical details go here."
              rows={3}
              className="bg-[#0b1220] border-slate-700 text-white"
            />
          </Field>
        )}

        {effect === "utility" && (
          <p className="text-[11px] text-slate-500 italic">
            Utility spells have no extra mechanical fields — the description captures the effect.
          </p>
        )}
      </div>

      <AlternativeCostFields
        value={spell.alternative_costs}
        onChange={(next) => patch({ alternative_costs: next })}
      />
    </div>
  );
}

function CustomClassFeatureForm({ feature, setFeature }) {
  const patch = (fields) => setFeature((prev) => ({ ...prev, ...fields }));
  const patchScaling = (fields) => setFeature((prev) => ({
    ...prev,
    scaling_die: { ...(prev.scaling_die || {}), ...fields },
  }));
  const patchFeatureDC = (fields) => setFeature((prev) => ({
    ...prev,
    feature_dc: { ...(prev.feature_dc || {}), ...fields },
  }));
  const isClassFeature = feature.type === "Class Feature";
  const isMenu = feature.type === "Feature Menu";
  const effect = feature.effect_type || "Utility";
  const resolution = feature.resolution || "no_roll";

  const scaling = feature.scaling_die || { enabled: false, base_die: "1d4", progression: [], usage: "" };
  const featureDC = feature.feature_dc || { enabled: false, formula: "8 + prof + ability", ability: "STR" };
  const progression = Array.isArray(scaling.progression) ? scaling.progression : [];
  const addProgressionRow = () => patchScaling({
    progression: [...progression, { level: 5, die: "1d6" }],
  });
  const updateProgressionRow = (idx, fields) => patchScaling({
    progression: progression.map((r, i) => (i === idx ? { ...r, ...fields } : r)),
  });
  const removeProgressionRow = (idx) => patchScaling({
    progression: progression.filter((_, i) => i !== idx),
  });

  return (
    <div className="space-y-4">
      {/* --- Identity --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Name" required>
          <Input
            value={feature.name || ""}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g., Thunderous Rebuke"
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
        <Field label="Type">
          <Select value={feature.type} onValueChange={(v) => patch({ type: v })}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FEATURE_SOURCE_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        {isClassFeature && (
          <Field label="Class">
            <Select value={feature.class} onValueChange={(v) => patch({ class: v })}>
              <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {SPELL_CLASSES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="Level requirement">
          <Input
            type="number" min={1} max={20}
            value={feature.level ?? 1}
            onChange={(e) => patch({ level: Number(e.target.value) || 1 })}
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
      </div>

      <Field label="Description" required>
        <Textarea
          value={feature.description || ""}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="What does the feature do, narratively and mechanically?"
          rows={4}
          className="bg-[#0b1220] border-slate-700 text-white"
        />
      </Field>

      {isMenu ? (
        <MenuFields value={feature.menu} onChange={(menu) => patch({ menu })} />
      ) : (
        <>
      {/* --- Action Economy --- */}
      <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Action Economy</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Action cost">
            <Select value={feature.cost} onValueChange={(v) => patch({ cost: v })}>
              <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEATURE_COSTS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Uses">
            <Select value={feature.uses} onValueChange={(v) => patch({ uses: v })}>
              <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEATURE_USES.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Recharge">
            <Select value={feature.recharge} onValueChange={(v) => patch({ recharge: v })}>
              <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEATURE_RECHARGE.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        {feature.cost === "Reaction" && (
          <Field label="Reaction trigger">
            <Input
              value={feature.reaction_trigger || ""}
              onChange={(e) => patch({ reaction_trigger: e.target.value })}
              placeholder='e.g., "when you are hit by a melee attack"'
              className="bg-[#0b1220] border-slate-700 text-white"
            />
          </Field>
        )}
      </div>

      {/* --- Mechanical Shape --- */}
      <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Mechanical Shape</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Effect type">
            <Select value={feature.effect_type} onValueChange={(v) => patch({ effect_type: v })}>
              <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEATURE_EFFECT_TYPES.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>
          {(effect === "Damage" || effect === "Condition") && (
            <Field label="Resolution">
              <Select value={feature.resolution} onValueChange={(v) => patch({ resolution: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FEATURE_RESOLUTIONS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>

        {effect === "Damage" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Damage dice">
              <Input
                value={feature.damage_dice || ""}
                onChange={(e) => patch({ damage_dice: e.target.value })}
                placeholder="e.g., 2d8"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            <Field label="Damage type">
              <Select value={feature.damage_type || "slashing"} onValueChange={(v) => patch({ damage_type: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAMAGE_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            {resolution === "save" && (
              <>
                <Field label="Save ability">
                  <Select value={feature.save_ability || "DEX"} onValueChange={(v) => patch({ save_ability: v })}>
                    <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SAVE_ABILITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Half damage on save">
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      checked={!!feature.half_on_save}
                      onCheckedChange={(c) => patch({ half_on_save: c })}
                    />
                    <span className="text-xs text-slate-300">{feature.half_on_save ? "Yes" : "No"}</span>
                  </div>
                </Field>
              </>
            )}
          </div>
        )}

        {effect === "Healing" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Healing dice">
              <Input
                value={feature.healing_dice || ""}
                onChange={(e) => patch({ healing_dice: e.target.value })}
                placeholder="e.g., 1d10"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            <Field label="Add character level">
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={!!feature.add_level}
                  onCheckedChange={(c) => patch({ add_level: c })}
                />
                <span className="text-xs text-slate-300">{feature.add_level ? "Yes" : "No"}</span>
              </div>
            </Field>
            <Field label="Add ability modifier">
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={!!feature.add_ability_mod}
                  onCheckedChange={(c) => patch({ add_ability_mod: c })}
                />
                <span className="text-xs text-slate-300">{feature.add_ability_mod ? "Yes" : "No"}</span>
              </div>
            </Field>
          </div>
        )}

        {effect === "Condition" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Condition applied">
              <Select value={feature.condition_applied || "Prone"} onValueChange={(v) => patch({ condition_applied: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {Object.keys(CONDITION_COLORS).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Save to resist">
              <Select value={feature.condition_save || "STR"} onValueChange={(v) => patch({ condition_save: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SAVE_ABILITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="DC source">
              <Select value={feature.condition_dc_source || "feature_dc"} onValueChange={(v) => patch({ condition_dc_source: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITION_DC_SOURCES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            {feature.condition_dc_source === "fixed" && (
              <Field label="Fixed DC">
                <Input
                  type="number" min={1}
                  value={feature.condition_dc_fixed ?? 13}
                  onChange={(e) => patch({ condition_dc_fixed: Number(e.target.value) || 13 })}
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
            )}
            <Field label="Duration">
              <Input
                value={feature.condition_duration || ""}
                onChange={(e) => patch({ condition_duration: e.target.value })}
                placeholder="1 minute"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          </div>
        )}

        {effect === "Resource" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Resource restored">
              <Select value={feature.resource_restored || "Hit Points"} onValueChange={(v) => patch({ resource_restored: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCE_POOLS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Amount (dice or flat)">
              <Input
                value={feature.resource_amount || ""}
                onChange={(e) => patch({ resource_amount: e.target.value })}
                placeholder="1d10 + level  /  2  /  all"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          </div>
        )}
      </div>

      {/* --- Scaling die (Martial Arts, Rage damage, Bardic Inspiration) --- */}
      <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Scaling Die</h4>
          <div className="flex items-center gap-2">
            <Switch
              checked={!!scaling.enabled}
              onCheckedChange={(c) => patchScaling({ enabled: c })}
            />
            <span className="text-[10px] text-slate-400">{scaling.enabled ? "On" : "Off"}</span>
          </div>
        </div>
        {scaling.enabled && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Base die (level 1)">
                <Input
                  value={scaling.base_die || ""}
                  onChange={(e) => patchScaling({ base_die: e.target.value })}
                  placeholder="e.g., 1d4"
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
              <Field label="When used">
                <Input
                  value={scaling.usage || ""}
                  onChange={(e) => patchScaling({ usage: e.target.value })}
                  placeholder='"On unarmed strikes" / "Added to weapon damage"'
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Progression</Label>
                <Button type="button" variant="outline" size="sm" onClick={addProgressionRow}>
                  <Plus className="w-3 h-3 mr-1" /> Add Step
                </Button>
              </div>
              {progression.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No steps — die stays at the base value.</p>
              ) : (
                <div className="space-y-1.5">
                  {progression.map((row, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">At level</Label>
                        <Input
                          type="number" min={1} max={20}
                          value={row.level ?? 1}
                          onChange={(e) => updateProgressionRow(i, { level: Number(e.target.value) || 1 })}
                          className="bg-[#0b1220] border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div className="col-span-7">
                        <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Die</Label>
                        <Input
                          value={row.die || ""}
                          onChange={(e) => updateProgressionRow(i, { die: e.target.value })}
                          placeholder="1d6"
                          className="bg-[#0b1220] border-slate-700 text-white text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProgressionRow(i)}
                        className="col-span-1 text-slate-400 hover:text-red-400 flex justify-center mt-4"
                        title="Remove"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* --- Feature DC (overrides Spell DC for this feature's saves) --- */}
      <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Feature DC (optional)</h4>
          <div className="flex items-center gap-2">
            <Switch
              checked={!!featureDC.enabled}
              onCheckedChange={(c) => patchFeatureDC({ enabled: c })}
            />
            <span className="text-[10px] text-slate-400">{featureDC.enabled ? "On" : "Off"}</span>
          </div>
        </div>
        {featureDC.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Ability used">
              <Select value={featureDC.ability || "STR"} onValueChange={(v) => patchFeatureDC({ ability: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SAVE_ABILITIES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Formula">
              <Input
                value={featureDC.formula || ""}
                onChange={(e) => patchFeatureDC({ formula: e.target.value })}
                placeholder="8 + prof + ability"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          </div>
        )}
      </div>

      <TriggerFields
        value={feature.trigger || null}
        onChange={(next) => patch({ trigger: next })}
      />
        </>
      )}

      <Field label="Image">
        <HomebrewImageUpload
          url={feature.image_url}
          onChange={(url) => patch({ image_url: url })}
          path="homebrew/class-features"
        />
      </Field>
    </div>
  );
}

// Exported so the Content Pack creator (Part C3) can reuse these
// forms + their blank templates without rebuilding the monster /
// item / spell / class-feature editors from scratch. The
// buildItemModifications / buildMonsterModifications /
// buildSpellModifications / buildClassFeatureModifications
// serializers are already individually `export function` above,
// so importers can pull them in alongside the form components.
export {
  CustomItemForm,
  CustomMonsterForm,
  CustomSpellForm,
  CustomClassFeatureForm,
  BLANK_ITEM,
  BLANK_MONSTER,
  BLANK_SPELL,
  BLANK_CLASS_FEATURE,
};

