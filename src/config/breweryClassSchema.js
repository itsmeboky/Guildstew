/**
 * Brewery class mod schema — Part 3A.
 *
 * Custom classes live on `brewery_mods` rows with `mod_type: 'class'`;
 * the structured class data is stored in `brewery_mods.metadata`. The
 * shape in this file is what the character creator + class engine
 * expect from SRD classes (see modEngine.getModdedClasses) so a
 * modded class can drop into the selection UI with no special-casing.
 *
 * Data-only. The creator form (Part 3B) reads these exports for its
 * dropdowns, level grids, and the starting state of a new class.
 */

export const HIT_DICE = ['d6', 'd8', 'd10', 'd12'];
export const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
export const CASTER_TYPES = ['none', 'full', 'half', 'third', 'pact', 'custom'];
export const SPELL_KNOWLEDGE_TYPES = ['prepared', 'known', 'ritual_only'];
export const SPELL_LIST_SOURCES = ['cleric', 'wizard', 'druid', 'bard', 'sorcerer', 'warlock', 'paladin', 'ranger', 'custom'];

export const STANDARD_ASI_LEVELS = [4, 8, 12, 16, 19];

// Standard 5e spell slot tables
export const FULL_CASTER_SLOTS = [
  { level: 1,  slots: [2, 0, 0, 0, 0, 0, 0, 0, 0] },
  { level: 2,  slots: [3, 0, 0, 0, 0, 0, 0, 0, 0] },
  { level: 3,  slots: [4, 2, 0, 0, 0, 0, 0, 0, 0] },
  { level: 4,  slots: [4, 3, 0, 0, 0, 0, 0, 0, 0] },
  { level: 5,  slots: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
  { level: 6,  slots: [4, 3, 3, 0, 0, 0, 0, 0, 0] },
  { level: 7,  slots: [4, 3, 3, 1, 0, 0, 0, 0, 0] },
  { level: 8,  slots: [4, 3, 3, 2, 0, 0, 0, 0, 0] },
  { level: 9,  slots: [4, 3, 3, 3, 1, 0, 0, 0, 0] },
  { level: 10, slots: [4, 3, 3, 3, 2, 0, 0, 0, 0] },
  { level: 11, slots: [4, 3, 3, 3, 2, 1, 0, 0, 0] },
  { level: 12, slots: [4, 3, 3, 3, 2, 1, 0, 0, 0] },
  { level: 13, slots: [4, 3, 3, 3, 2, 1, 1, 0, 0] },
  { level: 14, slots: [4, 3, 3, 3, 2, 1, 1, 0, 0] },
  { level: 15, slots: [4, 3, 3, 3, 2, 1, 1, 1, 0] },
  { level: 16, slots: [4, 3, 3, 3, 2, 1, 1, 1, 0] },
  { level: 17, slots: [4, 3, 3, 3, 2, 1, 1, 1, 1] },
  { level: 18, slots: [4, 3, 3, 3, 3, 1, 1, 1, 1] },
  { level: 19, slots: [4, 3, 3, 3, 3, 2, 1, 1, 1] },
  { level: 20, slots: [4, 3, 3, 3, 3, 2, 2, 1, 1] },
];

export const HALF_CASTER_SLOTS = [
  { level: 1,  slots: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { level: 2,  slots: [2, 0, 0, 0, 0, 0, 0, 0, 0] },
  { level: 3,  slots: [3, 0, 0, 0, 0, 0, 0, 0, 0] },
  { level: 4,  slots: [3, 0, 0, 0, 0, 0, 0, 0, 0] },
  { level: 5,  slots: [4, 2, 0, 0, 0, 0, 0, 0, 0] },
  { level: 6,  slots: [4, 2, 0, 0, 0, 0, 0, 0, 0] },
  { level: 7,  slots: [4, 3, 0, 0, 0, 0, 0, 0, 0] },
  { level: 8,  slots: [4, 3, 0, 0, 0, 0, 0, 0, 0] },
  { level: 9,  slots: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
  { level: 10, slots: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
  { level: 11, slots: [4, 3, 3, 0, 0, 0, 0, 0, 0] },
  { level: 12, slots: [4, 3, 3, 0, 0, 0, 0, 0, 0] },
  { level: 13, slots: [4, 3, 3, 1, 0, 0, 0, 0, 0] },
  { level: 14, slots: [4, 3, 3, 1, 0, 0, 0, 0, 0] },
  { level: 15, slots: [4, 3, 3, 2, 0, 0, 0, 0, 0] },
  { level: 16, slots: [4, 3, 3, 2, 0, 0, 0, 0, 0] },
  { level: 17, slots: [4, 3, 3, 3, 1, 0, 0, 0, 0] },
  { level: 18, slots: [4, 3, 3, 3, 1, 0, 0, 0, 0] },
  { level: 19, slots: [4, 3, 3, 3, 2, 0, 0, 0, 0] },
  { level: 20, slots: [4, 3, 3, 3, 2, 0, 0, 0, 0] },
];

export const BLANK_CLASS = {
  mod_type: 'class',
  name: '',
  description: '',
  image_url: '',
  hit_die: 'd8',
  armor_proficiencies: [],
  weapon_proficiencies: [],
  tool_proficiencies: [],
  saving_throws: [],
  skill_proficiencies: { choose: 2, from: [] },
  starting_equipment: { choices: [], fixed: [] },
  spellcasting: {
    enabled: false,
    ability: 'INT',
    type: 'prepared',
    slot_progression: 'none',
    custom_slots: null,
    spells_known_schedule: [],
    spell_list_source: 'custom',
    custom_spell_list: [],
    ritual_casting: false,
  },
  features: [],
  subclass: { name: '', choose_at_level: 3, options: [] },
  asi_levels: [...STANDARD_ASI_LEVELS],
  class_resource: {
    enabled: false,
    name: '',
    abbreviation: '',
    count_by_level: Array.from({ length: 20 }, (_, i) => ({ level: i + 1, count: 0 })),
    recharge: 'long_rest',
  },
  multiclass: { ability_requirement: {}, proficiencies_gained: [] },
};

export const BLANK_FEATURE = {
  level: 1,
  name: '',
  description: '',
  is_asi: false,
  is_subclass_choice: false,
  mechanical: {
    effect_type: 'utility',
    cost: 'passive',
    uses: 'At Will',
    recharge: '',
    damage_dice: '',
    damage_type: '',
    healing_dice: '',
  },
  scaling_die: { enabled: false, progression: [] },
  menu_feature: null,
};

export const BLANK_SUBCLASS_OPTION = {
  name: '',
  description: '',
  features: [],
};
