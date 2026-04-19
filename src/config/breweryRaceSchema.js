/**
 * Brewery race mod schema — Part 2A.
 *
 * Custom races live on `brewery_mods` rows with `mod_type: 'race'`;
 * the structured race data is stored in `brewery_mods.metadata`. The
 * shape in this file is what the character creator expects from SRD
 * races (see `modEngine.getModdedRaces`) so a modded race can drop
 * into the selection UI with no special-casing.
 *
 * Data-only. The creator form (Part 2B) reads these exports for its
 * dropdowns, radio groups, and the starting state of a new race.
 */

export const RACE_ABILITY_MODES = ['fixed', 'choose', 'custom'];
export const RACE_SIZES = ['Small', 'Medium', 'Large'];
export const DARKVISION_OPTIONS = [0, 30, 60, 120];
export const SPEED_TYPES = ['climb', 'fly', 'swim', 'burrow'];

export const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
  'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
];

export const TRAIT_EFFECT_TYPES = ['damage', 'healing', 'buff', 'condition', 'utility'];
export const TRAIT_COSTS = ['passive', 'free', 'action', 'bonus_action', 'reaction'];
export const TRAIT_RECHARGE = ['at_will', 'short_rest', 'long_rest', 'special'];

export const BLANK_RACE = {
  mod_type: 'race',
  name: '',
  description: '',
  image_url: '',

  ability_score_increases: {
    mode: 'fixed',
    fixed: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    choose: { count: 2, amount: 1 },
    custom: { fixed: {}, choose: { count: 2, amount: 1, exclude: [] } },
  },

  size: 'Medium',
  speed: 30,
  additional_speeds: { climb: 0, fly: 0, swim: 0, burrow: 0 },
  darkvision: 0,

  languages: { fixed: ['Common'], bonus_picks: 0, restricted_to: [] },

  skill_proficiencies: { fixed: [], choose: 0, choose_from: [] },
  weapon_proficiencies: [],
  armor_proficiencies: [],
  tool_proficiencies: [],

  damage_resistances: [],
  damage_immunities: [],
  condition_resistances: [],

  traits: [],
  subraces: [],

  age_description: '',
  alignment_description: '',
  size_description: '',
};

export const BLANK_TRAIT = {
  name: '',
  description: '',
  level: 1,
  mechanical: {
    effect_type: 'utility',
    cost: 'passive',
    uses: 'At Will',
    recharge: '',
    damage_dice: '',
    damage_type: '',
    healing_dice: '',
  },
};

export const BLANK_SUBRACE = {
  name: '',
  description: '',
  ability_score_bonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  speed_override: null,
  darkvision_override: null,
  additional_traits: [],
  replaced_traits: [],
};
