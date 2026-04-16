// ============================================================================
// D&D 5e COMPLETE RULES REGISTRY
// ============================================================================
// This file is the single source of truth for ALL D&D 5e rules in Guildstew.
// The combat system, character system, and every game mechanic reads from here.
// Homebrew overrides sit ON TOP of these defaults via getCampaignRules().
// 
// Structure:
//   CORE        - Ability scores, proficiency, skills, saving throws
//   COMBAT      - Attacks, damage, actions, reactions, movement, cover
//   CONDITIONS  - (references conditions.js for mechanical effects)
//   CLASSES     - Hit dice, proficiencies, features, spell slots per class
//   RACES       - Ability bonuses, features, speeds, sizes
//   SPELLCASTING - Spell slots, DC, components, concentration
//   EQUIPMENT   - Armor, weapons, encumbrance, currency
//   REST        - Short rest, long rest, hit dice recovery
//   DEATH       - Death saves, instant death, massive damage
//   PROGRESSION - XP thresholds, proficiency by level, CR/XP tables
//   MODIFIABLE  - Rules GMs can override via homebrew
// ============================================================================

// ─────────────────────────────────────────────
// CORE MECHANICS
// ─────────────────────────────────────────────

/** Ability score → modifier */
export function abilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

/** Proficiency bonus by character level */
export const PROFICIENCY_BY_LEVEL = {
  1: 2, 2: 2, 3: 2, 4: 2,
  5: 3, 6: 3, 7: 3, 8: 3,
  9: 4, 10: 4, 11: 4, 12: 4,
  13: 5, 14: 5, 15: 5, 16: 5,
  17: 6, 18: 6, 19: 6, 20: 6,
};

export function proficiencyBonus(level) {
  return PROFICIENCY_BY_LEVEL[Math.min(Math.max(level, 1), 20)] || 2;
}

/** The six ability scores */
export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const ABILITY_NAMES = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

/** Skill → governing ability */
export const SKILL_ABILITIES = {
  'Athletics':        'str',
  'Acrobatics':       'dex',
  'Sleight of Hand':  'dex',
  'Stealth':          'dex',
  'Arcana':           'int',
  'History':          'int',
  'Investigation':    'int',
  'Nature':           'int',
  'Religion':         'int',
  'Animal Handling':  'wis',
  'Insight':          'wis',
  'Medicine':         'wis',
  'Perception':       'wis',
  'Survival':         'wis',
  'Deception':        'cha',
  'Intimidation':     'cha',
  'Performance':      'cha',
  'Persuasion':       'cha',
};

export const ALL_SKILLS = Object.keys(SKILL_ABILITIES);

/** Passive check = 10 + modifier (+ proficiency if proficient) */
export function passiveCheck(abilityMod, proficient, profBonus, advantage = false, disadvantage = false) {
  let base = 10 + abilityMod + (proficient ? profBonus : 0);
  if (advantage) base += 5;
  if (disadvantage) base -= 5;
  return base;
}

/** Standard array for ability score generation */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/** Point buy costs */
export const POINT_BUY_COSTS = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};
export const POINT_BUY_TOTAL = 27;


// ─────────────────────────────────────────────
// COMBAT RULES
// ─────────────────────────────────────────────

/** Actions available on your turn */
export const ACTIONS_IN_COMBAT = {
  Attack:     { cost: 'action', requiresTarget: true, description: 'Make a melee or ranged attack' },
  'Cast a Spell': { cost: 'varies', requiresTarget: 'varies', description: 'Cast a spell with appropriate casting time' },
  Dash:       { cost: 'action', requiresTarget: false, description: 'Double your movement speed this turn' },
  Disengage:  { cost: 'action', requiresTarget: false, description: 'Movement doesn\'t provoke opportunity attacks this turn' },
  Dodge:      { cost: 'action', requiresTarget: false, description: 'Attacks against you have disadvantage, DEX saves have advantage until next turn' },
  Help:       { cost: 'action', requiresTarget: true, description: 'Give an ally advantage on their next ability check or attack' },
  Hide:       { cost: 'action', requiresTarget: false, description: 'Make a Stealth check to become hidden' },
  Ready:      { cost: 'action', requiresTarget: false, description: 'Prepare an action triggered by a specified event' },
  Search:     { cost: 'action', requiresTarget: false, description: 'Make a Perception or Investigation check' },
  'Use an Object': { cost: 'action', requiresTarget: 'varies', description: 'Interact with a second object or use a special object' },
  Grapple:    { cost: 'action', requiresTarget: true, contested: 'Athletics vs Athletics or Acrobatics', description: 'Grab a creature. Target\'s speed becomes 0.' },
  Shove:      { cost: 'action', requiresTarget: true, contested: 'Athletics vs Athletics or Acrobatics', description: 'Push a creature 5ft away or knock prone' },
};

/** Bonus actions — available to all characters */
export const BONUS_ACTIONS = {
  'Two-Weapon Fighting': {
    cost: 'bonus',
    requirement: 'Attacked with a light melee weapon in main hand',
    description: 'Attack with a different light melee weapon in off hand. Don\'t add ability mod to damage unless negative.',
  },
};

/** Reactions — available to all characters */
export const REACTIONS = {
  'Opportunity Attack': {
    trigger: 'A hostile creature you can see moves out of your reach',
    description: 'Make one melee attack against the triggering creature',
    exceptions: ['Target used Disengage', 'Target was teleported', 'Target was moved against its will'],
  },
};

/** Attack roll = d20 + ability mod + proficiency (if proficient) */
export function attackBonus(abilityMod, profBonus, magicBonus = 0) {
  return abilityMod + profBonus + magicBonus;
}

/** Melee attack: STR mod (or DEX for Finesse weapons) */
/** Ranged attack: DEX mod (or STR for Thrown weapons) */
export function getAttackAbility(weapon, characterClass) {
  if (!weapon) return 'str'; // unarmed default
  const props = weapon.properties || [];
  const isFinesse = props.includes('Finesse') || props.includes('finesse');
  const isRanged = weapon.category === 'Ranged' || weapon.type === 'Ranged';
  const isThrown = props.includes('Thrown') || props.includes('thrown');

  if (isFinesse) return 'best'; // use higher of STR/DEX
  if (isRanged && !isThrown) return 'dex';
  if (isThrown) return 'best'; // can use STR or DEX for thrown
  return 'str';
}

/** Damage modifier: same ability as attack, except off-hand doesn't add mod */
export function damageModifier(abilityMod, isOffHand, hasTwoWeaponFighting = false) {
  if (isOffHand && !hasTwoWeaponFighting) {
    return Math.min(abilityMod, 0); // only add if negative
  }
  return abilityMod;
}

/** Critical hits: natural 20 (or 19-20 for Champion Fighters etc.) */
export const CRIT_RANGE = {
  default: 20,
  'Champion (Improved Critical)': 19,
  'Champion (Superior Critical)': 18,
};

/** On a critical hit, double all damage dice (not modifiers) */
export function criticalDamage(baseDice, bonusDice = '') {
  // Double the number of dice in each term
  const doubled = baseDice.replace(/(\d+)d(\d+)/g, (match, num, faces) => {
    return `${parseInt(num) * 2}d${faces}`;
  });
  if (bonusDice) {
    const doubledBonus = bonusDice.replace(/(\d+)d(\d+)/g, (match, num, faces) => {
      return `${parseInt(num) * 2}d${faces}`;
    });
    return `${doubled}+${doubledBonus}`;
  }
  return doubled;
}

/** Damage types */
export const DAMAGE_TYPES = [
  'bludgeoning', 'piercing', 'slashing',     // physical
  'acid', 'cold', 'fire', 'lightning', 'thunder', // elemental
  'force', 'necrotic', 'poison', 'psychic', 'radiant', // magical
];

/** Resistance = half damage, Vulnerability = double damage, Immunity = no damage */
export function applyDamageModifiers(damage, damageType, resistances = [], vulnerabilities = [], immunities = []) {
  if (immunities.includes(damageType)) return 0;
  if (resistances.includes(damageType)) damage = Math.floor(damage / 2);
  if (vulnerabilities.includes(damageType)) damage = damage * 2;
  return damage;
}

/** Cover bonuses */
export const COVER = {
  none:          { acBonus: 0, dexSaveBonus: 0, description: 'No cover' },
  half:          { acBonus: 2, dexSaveBonus: 2, description: 'Half cover — obstacle blocks at least half the body' },
  three_quarters: { acBonus: 5, dexSaveBonus: 5, description: 'Three-quarters cover — about three-quarters blocked' },
  full:          { acBonus: Infinity, dexSaveBonus: Infinity, description: 'Full cover — completely concealed, can\'t be targeted' },
};

/** Movement costs */
export const MOVEMENT = {
  normal: 1,           // 1 foot of movement per foot traveled
  difficult_terrain: 2, // 2 feet per foot traveled
  crawling: 2,         // 2 feet per foot traveled
  swimming: 2,         // 2 feet per foot (without swim speed)
  climbing: 2,         // 2 feet per foot (without climb speed)
  standing_from_prone: 'half', // costs half your movement speed
};

/** Size categories */
export const SIZE_CATEGORIES = {
  Tiny:       { space: '2.5 ft', examples: 'Imp, Sprite', carryMultiplier: 0.5 },
  Small:      { space: '5 ft', examples: 'Goblin, Halfling', carryMultiplier: 1 },
  Medium:     { space: '5 ft', examples: 'Human, Orc', carryMultiplier: 1 },
  Large:      { space: '10 ft', examples: 'Ogre, Horse', carryMultiplier: 2 },
  Huge:       { space: '15 ft', examples: 'Treant, Giant', carryMultiplier: 4 },
  Gargantuan: { space: '20 ft', examples: 'Dragon, Kraken', carryMultiplier: 8 },
};

/** Grapple rules */
export const GRAPPLE_RULES = {
  check: 'Athletics vs Athletics or Acrobatics',
  targetSizeMax: 1, // can grapple up to one size larger than you
  condition: 'Grappled', // target's speed = 0
  escape: 'Athletics or Acrobatics vs grappler\'s Athletics',
  cost: 'action', // replaces one attack if you have Extra Attack
};

/** Shove rules */
export const SHOVE_RULES = {
  check: 'Athletics vs Athletics or Acrobatics',
  targetSizeMax: 1, // one size larger max
  effects: ['Knock prone', 'Push 5 feet away'],
  cost: 'action', // replaces one attack if you have Extra Attack
};


// ─────────────────────────────────────────────
// CLASS DATA
// ─────────────────────────────────────────────

export const CLASS_HIT_DICE = {
  Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
  Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
  Sorcerer: 6, Wizard: 6,
};

export const CLASS_PRIMARY_ABILITY = {
  Barbarian: 'str', Bard: 'cha', Cleric: 'wis', Druid: 'wis',
  Fighter: 'str', Monk: 'dex', Paladin: 'str', Ranger: 'dex',
  Rogue: 'dex', Sorcerer: 'cha', Warlock: 'cha', Wizard: 'int',
};

export const CLASS_SAVING_THROWS = {
  Barbarian: ['str', 'con'], Bard: ['dex', 'cha'], Cleric: ['wis', 'cha'],
  Druid: ['int', 'wis'], Fighter: ['str', 'con'], Monk: ['str', 'dex'],
  Paladin: ['wis', 'cha'], Ranger: ['str', 'dex'], Rogue: ['dex', 'int'],
  Sorcerer: ['con', 'cha'], Warlock: ['wis', 'cha'], Wizard: ['int', 'wis'],
};

export const CLASS_ARMOR_PROFICIENCIES = {
  Barbarian: ['light', 'medium', 'shields'],
  Bard: ['light'],
  Cleric: ['light', 'medium', 'shields'],
  Druid: ['light', 'medium', 'shields'], // no metal
  Fighter: ['light', 'medium', 'heavy', 'shields'],
  Monk: [],
  Paladin: ['light', 'medium', 'heavy', 'shields'],
  Ranger: ['light', 'medium', 'shields'],
  Rogue: ['light'],
  Sorcerer: [],
  Warlock: ['light'],
  Wizard: [],
};

export const CLASS_WEAPON_PROFICIENCIES = {
  Barbarian: ['simple', 'martial'],
  Bard: ['simple', 'hand crossbow', 'longsword', 'rapier', 'shortsword'],
  Cleric: ['simple'],
  Druid: ['club', 'dagger', 'dart', 'javelin', 'mace', 'quarterstaff', 'scimitar', 'sickle', 'sling', 'spear'],
  Fighter: ['simple', 'martial'],
  Monk: ['simple', 'shortsword'],
  Paladin: ['simple', 'martial'],
  Ranger: ['simple', 'martial'],
  Rogue: ['simple', 'hand crossbow', 'longsword', 'rapier', 'shortsword'],
  Sorcerer: ['dagger', 'dart', 'sling', 'quarterstaff', 'light crossbow'],
  Warlock: ['simple'],
  Wizard: ['dagger', 'dart', 'sling', 'quarterstaff', 'light crossbow'],
};

/** Spellcasting ability per class */
export const SPELLCASTING_ABILITY = {
  Bard: 'cha', Cleric: 'wis', Druid: 'wis', Paladin: 'cha',
  Ranger: 'wis', Sorcerer: 'cha', Warlock: 'cha', Wizard: 'int',
};

/** Caster type determines spell slot progression */
export const CASTER_TYPE = {
  Barbarian: 'none', Fighter: 'none', Monk: 'none', Rogue: 'none',
  Bard: 'full', Cleric: 'full', Druid: 'full', Sorcerer: 'full', Wizard: 'full',
  Paladin: 'half', Ranger: 'half',
  Warlock: 'pact',
};

/** Full caster spell slots by level (index = character level) */
export const FULL_CASTER_SLOTS = {
  1:  [2],
  2:  [3],
  3:  [4, 2],
  4:  [4, 3],
  5:  [4, 3, 2],
  6:  [4, 3, 3],
  7:  [4, 3, 3, 1],
  8:  [4, 3, 3, 2],
  9:  [4, 3, 3, 3, 1],
  10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1],
  12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1],
  14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1],
  16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

/** Half caster slots — use character level / 2 rounded up in the full caster table */
export function halfCasterSlots(characterLevel) {
  const effectiveLevel = Math.max(1, Math.ceil(characterLevel / 2));
  return FULL_CASTER_SLOTS[effectiveLevel] || [];
}

/** Warlock pact magic slots */
export const WARLOCK_PACT_SLOTS = {
  1:  { slots: 1, level: 1 },
  2:  { slots: 2, level: 1 },
  3:  { slots: 2, level: 2 },
  4:  { slots: 2, level: 2 },
  5:  { slots: 2, level: 3 },
  6:  { slots: 2, level: 3 },
  7:  { slots: 2, level: 4 },
  8:  { slots: 2, level: 4 },
  9:  { slots: 2, level: 5 },
  10: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 },
  14: { slots: 3, level: 5 },
  15: { slots: 3, level: 5 },
  16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 },
  18: { slots: 4, level: 5 },
  19: { slots: 4, level: 5 },
  20: { slots: 4, level: 5 },
};

/** Get spell slots for any class at any level */
export function getSpellSlots(className, level) {
  const type = CASTER_TYPE[className];
  if (type === 'none') return [];
  if (type === 'full') return FULL_CASTER_SLOTS[level] || [];
  if (type === 'half') return level >= 2 ? halfCasterSlots(level) : [];
  if (type === 'pact') {
    const pact = WARLOCK_PACT_SLOTS[level];
    return pact ? Array(pact.slots).fill(pact.level) : [];
  }
  return [];
}

/** Cantrips known by level (full casters) */
export const CANTRIPS_KNOWN = {
  Bard:     { 1: 2, 4: 3, 10: 4 },
  Cleric:   { 1: 3, 4: 4, 10: 5 },
  Druid:    { 1: 2, 4: 3, 10: 4 },
  Sorcerer: { 1: 4, 4: 5, 10: 6 },
  Warlock:  { 1: 2, 4: 3, 10: 4 },
  Wizard:   { 1: 3, 4: 4, 10: 5 },
};

/** Class features that affect combat — key features the app should track */
export const CLASS_COMBAT_FEATURES = {
  Barbarian: {
    1:  ['Rage', 'Unarmored Defense (CON)'],
    2:  ['Reckless Attack', 'Danger Sense'],
    5:  ['Extra Attack', 'Fast Movement (+10 ft)'],
    11: ['Relentless Rage'],
    20: ['Primal Champion (+4 STR, +4 CON)'],
  },
  Bard: {
    1:  ['Bardic Inspiration (d6)'],
    5:  ['Bardic Inspiration (d8)', 'Font of Inspiration'],
    6:  ['Countercharm'],
    10: ['Bardic Inspiration (d10)', 'Magical Secrets'],
    15: ['Bardic Inspiration (d12)'],
  },
  Cleric: {
    1:  ['Spellcasting', 'Divine Domain'],
    2:  ['Channel Divinity (1/rest)', 'Turn Undead'],
    5:  ['Destroy Undead (CR 1/2)'],
    6:  ['Channel Divinity (2/rest)'],
    8:  ['Destroy Undead (CR 1)'],
    10: ['Divine Intervention'],
    18: ['Channel Divinity (3/rest)'],
  },
  Druid: {
    1:  ['Druidic', 'Spellcasting'],
    2:  ['Wild Shape (CR 1/4, no swim/fly)', 'Druid Circle'],
    4:  ['Wild Shape (CR 1/2, no fly)'],
    8:  ['Wild Shape (CR 1, fly)'],
    18: ['Timeless Body', 'Beast Spells'],
    20: ['Archdruid (unlimited Wild Shape)'],
  },
  Fighter: {
    1:  ['Fighting Style', 'Second Wind'],
    2:  ['Action Surge (1/rest)'],
    3:  ['Martial Archetype'],
    5:  ['Extra Attack'],
    9:  ['Indomitable (1/rest)'],
    11: ['Extra Attack (2)'],
    13: ['Indomitable (2/rest)'],
    17: ['Action Surge (2/rest)', 'Indomitable (3/rest)'],
    20: ['Extra Attack (3)'],
  },
  Monk: {
    1:  ['Unarmored Defense (WIS)', 'Martial Arts'],
    2:  ['Ki', 'Flurry of Blows', 'Patient Defense', 'Step of the Wind'],
    3:  ['Monastic Tradition', 'Deflect Missiles'],
    4:  ['Slow Fall'],
    5:  ['Extra Attack', 'Stunning Strike'],
    6:  ['Ki-Empowered Strikes'],
    7:  ['Evasion', 'Stillness of Mind'],
    10: ['Purity of Body'],
    13: ['Tongue of the Sun and Moon'],
    14: ['Diamond Soul (proficient in all saves)'],
    15: ['Timeless Body'],
    18: ['Empty Body'],
    20: ['Perfect Self'],
  },
  Paladin: {
    1:  ['Divine Sense', 'Lay on Hands'],
    2:  ['Fighting Style', 'Spellcasting', 'Divine Smite'],
    3:  ['Sacred Oath', 'Channel Divinity'],
    5:  ['Extra Attack'],
    6:  ['Aura of Protection (+CHA to saves, 10ft)'],
    10: ['Aura of Courage (immune to Frightened, 10ft)'],
    11: ['Improved Divine Smite (+1d8 radiant on all melee)'],
    14: ['Cleansing Touch'],
    18: ['Aura range increases to 30ft'],
  },
  Ranger: {
    1:  ['Favored Enemy', 'Natural Explorer'],
    2:  ['Fighting Style', 'Spellcasting'],
    3:  ['Ranger Archetype', 'Primeval Awareness'],
    5:  ['Extra Attack'],
    8:  ['Land\'s Stride'],
    10: ['Hide in Plain Sight'],
    14: ['Vanish'],
    18: ['Feral Senses'],
    20: ['Foe Slayer'],
  },
  Rogue: {
    1:  ['Expertise', 'Sneak Attack (1d6)', 'Thieves\' Cant'],
    2:  ['Cunning Action (Dash, Disengage, Hide as bonus)'],
    3:  ['Roguish Archetype', 'Sneak Attack (2d6)'],
    5:  ['Uncanny Dodge', 'Sneak Attack (3d6)'],
    7:  ['Evasion', 'Sneak Attack (4d6)'],
    9:  ['Sneak Attack (5d6)'],
    11: ['Reliable Talent', 'Sneak Attack (6d6)'],
    13: ['Sneak Attack (7d6)'],
    14: ['Blindsense'],
    15: ['Slippery Mind', 'Sneak Attack (8d6)'],
    17: ['Sneak Attack (9d6)'],
    18: ['Elusive'],
    19: ['Sneak Attack (10d6)'],
    20: ['Stroke of Luck'],
  },
  Sorcerer: {
    1:  ['Spellcasting', 'Sorcerous Origin'],
    2:  ['Font of Magic', 'Sorcery Points'],
    3:  ['Metamagic (2 options)'],
    10: ['Metamagic (3 options)'],
    17: ['Metamagic (4 options)'],
    20: ['Sorcerous Restoration'],
  },
  Warlock: {
    1:  ['Otherworldly Patron', 'Pact Magic'],
    2:  ['Eldritch Invocations (2)'],
    3:  ['Pact Boon'],
    5:  ['Eldritch Invocations (3)'],
    7:  ['Eldritch Invocations (4)'],
    9:  ['Eldritch Invocations (5)'],
    11: ['Mystic Arcanum (6th level)'],
    12: ['Eldritch Invocations (6)'],
    13: ['Mystic Arcanum (7th level)'],
    15: ['Eldritch Invocations (7)', 'Mystic Arcanum (8th level)'],
    17: ['Mystic Arcanum (9th level)'],
    18: ['Eldritch Invocations (8)'],
    20: ['Eldritch Master'],
  },
  Wizard: {
    1:  ['Spellcasting', 'Arcane Recovery'],
    2:  ['Arcane Tradition'],
    18: ['Spell Mastery'],
    20: ['Signature Spells'],
  },
};

/** Sneak Attack dice by rogue level */
export function sneakAttackDice(rogueLevel) {
  return Math.ceil(rogueLevel / 2);
}

/** Monk martial arts die by level */
export const MONK_MARTIAL_ARTS_DIE = {
  1: 4, 2: 4, 3: 4, 4: 4,
  5: 6, 6: 6, 7: 6, 8: 6, 9: 6, 10: 6,
  11: 8, 12: 8, 13: 8, 14: 8, 15: 8, 16: 8,
  17: 10, 18: 10, 19: 10, 20: 10,
};

/** Ki points = monk level */
export function kiPoints(monkLevel) {
  return monkLevel >= 2 ? monkLevel : 0;
}

/** Barbarian rage damage bonus */
export const RAGE_DAMAGE_BONUS = {
  1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2,
  9: 3, 10: 3, 11: 3, 12: 3, 13: 3, 14: 3, 15: 3,
  16: 4, 17: 4, 18: 4, 19: 4, 20: 4,
};

/** Barbarian rages per day */
export const RAGES_PER_DAY = {
  1: 2, 2: 2, 3: 3, 4: 3, 5: 3, 6: 4, 7: 4, 8: 4,
  9: 4, 10: 4, 11: 4, 12: 5, 13: 5, 14: 5, 15: 5,
  16: 5, 17: 6, 18: 6, 19: 6, 20: Infinity,
};

/** Paladin lay on hands pool = paladin level × 5 */
export function layOnHandsPool(paladinLevel) {
  return paladinLevel * 5;
}

/** Divine Smite damage: 2d8 base + 1d8 per slot level above 1st (max 5d8), +1d8 vs undead/fiend */
export function divineSmiteDice(slotLevel, isUndeadOrFiend = false) {
  const base = Math.min(1 + slotLevel, 5); // 2d8 at 1st, 3d8 at 2nd, etc., max 5d8
  const bonus = isUndeadOrFiend ? 1 : 0;
  return `${base + bonus}d8`;
}

/** Extra Attack — number of attacks per Attack action */
export function attacksPerAction(className, level) {
  if (className === 'Fighter') {
    if (level >= 20) return 4;
    if (level >= 11) return 3;
    if (level >= 5) return 2;
    return 1;
  }
  if (['Barbarian', 'Monk', 'Paladin', 'Ranger'].includes(className)) {
    return level >= 5 ? 2 : 1;
  }
  return 1;
}


// ─────────────────────────────────────────────
// RACE DATA
// ─────────────────────────────────────────────

export const RACES = {
  Dragonborn: {
    abilityBonuses: { str: 2, cha: 1 },
    speed: 30,
    size: 'Medium',
    features: ['Breath Weapon', 'Damage Resistance'],
    languages: ['Common', 'Draconic'],
  },
  Dwarf: {
    abilityBonuses: { con: 2 },
    speed: 25, // not reduced by heavy armor
    size: 'Medium',
    features: ['Darkvision', 'Dwarven Resilience', 'Stonecunning'],
    languages: ['Common', 'Dwarvish'],
    subraces: {
      'Hill Dwarf':     { abilityBonuses: { wis: 1 }, features: ['Dwarven Toughness (+1 HP/level)'] },
      'Mountain Dwarf':  { abilityBonuses: { str: 2 }, features: ['Dwarven Armor Training'] },
    },
  },
  Elf: {
    abilityBonuses: { dex: 2 },
    speed: 30,
    size: 'Medium',
    features: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance'],
    languages: ['Common', 'Elvish'],
    subraces: {
      'High Elf':  { abilityBonuses: { int: 1 }, features: ['Elf Weapon Training', 'Cantrip', 'Extra Language'] },
      'Wood Elf':  { abilityBonuses: { wis: 1 }, features: ['Elf Weapon Training', 'Fleet of Foot (35 ft)', 'Mask of the Wild'], speed: 35 },
      'Drow':      { abilityBonuses: { cha: 1 }, features: ['Superior Darkvision', 'Sunlight Sensitivity', 'Drow Magic'] },
    },
  },
  Gnome: {
    abilityBonuses: { int: 2 },
    speed: 25,
    size: 'Small',
    features: ['Darkvision', 'Gnome Cunning'],
    languages: ['Common', 'Gnomish'],
    subraces: {
      'Forest Gnome': { abilityBonuses: { dex: 1 }, features: ['Natural Illusionist', 'Speak with Small Beasts'] },
      'Rock Gnome':   { abilityBonuses: { con: 1 }, features: ['Artificer\'s Lore', 'Tinker'] },
    },
  },
  'Half-Elf': {
    abilityBonuses: { cha: 2 }, // +1 to two other abilities of choice
    speed: 30,
    size: 'Medium',
    features: ['Darkvision', 'Fey Ancestry', 'Skill Versatility (2 skills)'],
    languages: ['Common', 'Elvish', '+1 choice'],
  },
  'Half-Orc': {
    abilityBonuses: { str: 2, con: 1 },
    speed: 30,
    size: 'Medium',
    features: ['Darkvision', 'Menacing', 'Relentless Endurance', 'Savage Attacks'],
    languages: ['Common', 'Orc'],
  },
  Halfling: {
    abilityBonuses: { dex: 2 },
    speed: 25,
    size: 'Small',
    features: ['Lucky', 'Brave', 'Halfling Nimbleness'],
    languages: ['Common', 'Halfling'],
    subraces: {
      'Lightfoot': { abilityBonuses: { cha: 1 }, features: ['Naturally Stealthy'] },
      'Stout':     { abilityBonuses: { con: 1 }, features: ['Stout Resilience'] },
    },
  },
  Human: {
    abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    speed: 30,
    size: 'Medium',
    features: [],
    languages: ['Common', '+1 choice'],
    variant: {
      abilityBonuses: {}, // +1 to two of choice
      features: ['Skill proficiency', 'Feat'],
    },
  },
  Tiefling: {
    abilityBonuses: { cha: 2, int: 1 },
    speed: 30,
    size: 'Medium',
    features: ['Darkvision', 'Hellish Resistance (fire)', 'Infernal Legacy'],
    languages: ['Common', 'Infernal'],
  },
};


// ─────────────────────────────────────────────
// SPELLCASTING RULES
// ─────────────────────────────────────────────

/** Spell save DC = 8 + proficiency + spellcasting ability modifier */
export function spellSaveDC(profBonus, abilityMod) {
  return 8 + profBonus + abilityMod;
}

/** Spell attack modifier = proficiency + spellcasting ability modifier */
export function spellAttackMod(profBonus, abilityMod) {
  return profBonus + abilityMod;
}

/** Concentration rules */
export const CONCENTRATION = {
  maxSpells: 1, // can only concentrate on one spell at a time
  saveAbility: 'con',
  saveDC: (damageTaken) => Math.max(10, Math.floor(damageTaken / 2)),
  breakConditions: ['Incapacitated', 'killed', 'new concentration spell'],
  description: 'Taking damage forces CON save. Incapacitation breaks it. Only one at a time.',
};

/** Cantrip damage scaling by character level */
export function cantripScaling(characterLevel) {
  if (characterLevel >= 17) return 4;
  if (characterLevel >= 11) return 3;
  if (characterLevel >= 5) return 2;
  return 1;
}

/** Spell component types */
export const SPELL_COMPONENTS = {
  V: 'Verbal — must be able to speak',
  S: 'Somatic — must have a free hand',
  M: 'Material — requires specific components or a focus',
};

/** Ritual casting: takes 10 extra minutes, doesn't consume a spell slot */
export const RITUAL_CASTING = {
  extraTime: 10, // minutes
  consumesSlot: false,
  classes: ['Bard', 'Cleric', 'Druid', 'Wizard'], // Bard and Wizard can ritual cast known/prepared spells
};

/** Spell schools */
export const SPELL_SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
];


// ─────────────────────────────────────────────
// EQUIPMENT RULES
// ─────────────────────────────────────────────

/** Armor types and AC calculation */
export const ARMOR_TABLE = {
  // Light armor — AC = base + DEX mod
  'Padded':         { ac: 11, type: 'light', stealthDisadvantage: true, strReq: 0, weight: 8, cost: 5 },
  'Leather':        { ac: 11, type: 'light', stealthDisadvantage: false, strReq: 0, weight: 10, cost: 10 },
  'Studded Leather': { ac: 12, type: 'light', stealthDisadvantage: false, strReq: 0, weight: 13, cost: 45 },
  // Medium armor — AC = base + DEX mod (max 2)
  'Hide':           { ac: 12, type: 'medium', stealthDisadvantage: false, strReq: 0, weight: 12, cost: 10 },
  'Chain Shirt':    { ac: 13, type: 'medium', stealthDisadvantage: false, strReq: 0, weight: 20, cost: 50 },
  'Scale Mail':     { ac: 14, type: 'medium', stealthDisadvantage: true, strReq: 0, weight: 45, cost: 50 },
  'Breastplate':    { ac: 14, type: 'medium', stealthDisadvantage: false, strReq: 0, weight: 20, cost: 400 },
  'Half Plate':     { ac: 15, type: 'medium', stealthDisadvantage: true, strReq: 0, weight: 40, cost: 750 },
  // Heavy armor — AC = base (no DEX)
  'Ring Mail':      { ac: 14, type: 'heavy', stealthDisadvantage: true, strReq: 0, weight: 40, cost: 30 },
  'Chain Mail':     { ac: 16, type: 'heavy', stealthDisadvantage: true, strReq: 13, weight: 55, cost: 75 },
  'Splint':         { ac: 17, type: 'heavy', stealthDisadvantage: true, strReq: 15, weight: 60, cost: 200 },
  'Plate':          { ac: 18, type: 'heavy', stealthDisadvantage: true, strReq: 15, weight: 65, cost: 1500 },
  // Shield
  'Shield':         { ac: 2, type: 'shield', stealthDisadvantage: false, strReq: 0, weight: 6, cost: 10 },
};

/** Calculate AC from armor + DEX + shield */
export function calculateAC(armor, dexMod, hasShield = false, otherBonuses = 0) {
  let ac = 10 + dexMod; // unarmored default

  if (armor) {
    const armorData = ARMOR_TABLE[armor.name] || armor;
    if (armorData.type === 'light') {
      ac = armorData.ac + dexMod;
    } else if (armorData.type === 'medium') {
      ac = armorData.ac + Math.min(dexMod, 2);
    } else if (armorData.type === 'heavy') {
      ac = armorData.ac;
    }
  }

  if (hasShield) ac += 2;
  ac += otherBonuses;

  return ac;
}

/** Unarmored Defense — Barbarian: 10 + DEX + CON, Monk: 10 + DEX + WIS */
export function unarmoredDefense(className, dexMod, secondMod) {
  if (className === 'Barbarian' || className === 'Monk') {
    return 10 + dexMod + secondMod;
  }
  return 10 + dexMod; // standard unarmored
}

/** Weapon properties */
export const WEAPON_PROPERTIES = {
  Ammunition: 'Requires ammunition; loading with each attack',
  Finesse: 'Use STR or DEX for attack and damage',
  Heavy: 'Small creatures have disadvantage',
  Light: 'Can be used for two-weapon fighting',
  Loading: 'One attack per action regardless of Extra Attack (without Crossbow Expert)',
  Range: 'Has normal and long range; long range = disadvantage',
  Reach: 'Adds 5 feet to reach (10ft total)',
  Special: 'See weapon description',
  Thrown: 'Can throw for ranged attack using STR',
  'Two-Handed': 'Requires two hands to attack',
  Versatile: 'Can use one or two hands; two-handed uses larger damage die',
};

/** Simple weapons */
export const SIMPLE_WEAPONS = {
  'Club':           { damage: '1d4', type: 'bludgeoning', properties: ['Light'], weight: 2, cost: 0.1 },
  'Dagger':         { damage: '1d4', type: 'piercing', properties: ['Finesse', 'Light', 'Thrown'], range: '20/60', weight: 1, cost: 2 },
  'Greatclub':      { damage: '1d8', type: 'bludgeoning', properties: ['Two-Handed'], weight: 10, cost: 0.2 },
  'Handaxe':        { damage: '1d6', type: 'slashing', properties: ['Light', 'Thrown'], range: '20/60', weight: 2, cost: 5 },
  'Javelin':        { damage: '1d6', type: 'piercing', properties: ['Thrown'], range: '30/120', weight: 2, cost: 0.5 },
  'Light Hammer':   { damage: '1d4', type: 'bludgeoning', properties: ['Light', 'Thrown'], range: '20/60', weight: 2, cost: 2 },
  'Mace':           { damage: '1d6', type: 'bludgeoning', properties: [], weight: 4, cost: 5 },
  'Quarterstaff':   { damage: '1d6', type: 'bludgeoning', properties: ['Versatile'], versatileDamage: '1d8', weight: 4, cost: 0.2 },
  'Sickle':         { damage: '1d4', type: 'slashing', properties: ['Light'], weight: 2, cost: 1 },
  'Spear':          { damage: '1d6', type: 'piercing', properties: ['Thrown', 'Versatile'], versatileDamage: '1d8', range: '20/60', weight: 3, cost: 1 },
  // Simple ranged
  'Light Crossbow': { damage: '1d8', type: 'piercing', properties: ['Ammunition', 'Loading', 'Two-Handed'], range: '80/320', weight: 5, cost: 25 },
  'Dart':           { damage: '1d4', type: 'piercing', properties: ['Finesse', 'Thrown'], range: '20/60', weight: 0.25, cost: 0.05 },
  'Shortbow':       { damage: '1d6', type: 'piercing', properties: ['Ammunition', 'Two-Handed'], range: '80/320', weight: 2, cost: 25 },
  'Sling':          { damage: '1d4', type: 'bludgeoning', properties: ['Ammunition'], range: '30/120', weight: 0, cost: 0.1 },
};

/** Martial weapons */
export const MARTIAL_WEAPONS = {
  'Battleaxe':      { damage: '1d8', type: 'slashing', properties: ['Versatile'], versatileDamage: '1d10', weight: 4, cost: 10 },
  'Flail':          { damage: '1d8', type: 'bludgeoning', properties: [], weight: 2, cost: 10 },
  'Glaive':         { damage: '1d10', type: 'slashing', properties: ['Heavy', 'Reach', 'Two-Handed'], weight: 6, cost: 20 },
  'Greataxe':       { damage: '1d12', type: 'slashing', properties: ['Heavy', 'Two-Handed'], weight: 7, cost: 30 },
  'Greatsword':     { damage: '2d6', type: 'slashing', properties: ['Heavy', 'Two-Handed'], weight: 6, cost: 50 },
  'Halberd':        { damage: '1d10', type: 'slashing', properties: ['Heavy', 'Reach', 'Two-Handed'], weight: 6, cost: 20 },
  'Lance':          { damage: '1d12', type: 'piercing', properties: ['Reach', 'Special'], weight: 6, cost: 10 },
  'Longsword':      { damage: '1d8', type: 'slashing', properties: ['Versatile'], versatileDamage: '1d10', weight: 3, cost: 15 },
  'Maul':           { damage: '2d6', type: 'bludgeoning', properties: ['Heavy', 'Two-Handed'], weight: 10, cost: 10 },
  'Morningstar':    { damage: '1d8', type: 'piercing', properties: [], weight: 4, cost: 15 },
  'Pike':           { damage: '1d10', type: 'piercing', properties: ['Heavy', 'Reach', 'Two-Handed'], weight: 18, cost: 5 },
  'Rapier':         { damage: '1d8', type: 'piercing', properties: ['Finesse'], weight: 2, cost: 25 },
  'Scimitar':       { damage: '1d6', type: 'slashing', properties: ['Finesse', 'Light'], weight: 3, cost: 25 },
  'Shortsword':     { damage: '1d6', type: 'piercing', properties: ['Finesse', 'Light'], weight: 2, cost: 10 },
  'Trident':        { damage: '1d6', type: 'piercing', properties: ['Thrown', 'Versatile'], versatileDamage: '1d8', range: '20/60', weight: 4, cost: 5 },
  'War Pick':       { damage: '1d8', type: 'piercing', properties: [], weight: 2, cost: 5 },
  'Warhammer':      { damage: '1d8', type: 'bludgeoning', properties: ['Versatile'], versatileDamage: '1d10', weight: 2, cost: 15 },
  'Whip':           { damage: '1d4', type: 'slashing', properties: ['Finesse', 'Reach'], weight: 3, cost: 2 },
  // Martial ranged
  'Blowgun':        { damage: '1', type: 'piercing', properties: ['Ammunition', 'Loading'], range: '25/100', weight: 1, cost: 10 },
  'Hand Crossbow':  { damage: '1d6', type: 'piercing', properties: ['Ammunition', 'Light', 'Loading'], range: '30/120', weight: 3, cost: 75 },
  'Heavy Crossbow': { damage: '1d10', type: 'piercing', properties: ['Ammunition', 'Heavy', 'Loading', 'Two-Handed'], range: '100/400', weight: 18, cost: 50 },
  'Longbow':        { damage: '1d8', type: 'piercing', properties: ['Ammunition', 'Heavy', 'Two-Handed'], range: '150/600', weight: 2, cost: 50 },
  'Net':            { damage: '0', type: 'none', properties: ['Special', 'Thrown'], range: '5/15', weight: 3, cost: 1 },
};

/** Unarmed strike */
export const UNARMED_STRIKE = {
  damage: '1',
  type: 'bludgeoning',
  modifier: 'str', // monks can use DEX
  description: 'Punch, kick, headbutt, or similar. 1 + STR mod bludgeoning damage.',
};

/** Encumbrance rules */
export const ENCUMBRANCE = {
  standard: {
    carryCapacity: (str) => str * 15, // pounds
    pushDragLift: (str) => str * 30,
  },
  variant: {
    encumbered: (str) => str * 5, // speed -10
    heavilyEncumbered: (str) => str * 10, // speed -20, disadvantage on STR/DEX/CON checks/saves/attacks
  },
};

/** Currency conversion */
export const CURRENCY = {
  cp: { name: 'Copper', gpValue: 0.01 },
  sp: { name: 'Silver', gpValue: 0.1 },
  ep: { name: 'Electrum', gpValue: 0.5 },
  gp: { name: 'Gold', gpValue: 1 },
  pp: { name: 'Platinum', gpValue: 10 },
};


// ─────────────────────────────────────────────
// REST AND RECOVERY
// ─────────────────────────────────────────────

export const REST_RULES = {
  short_rest: {
    duration: 60, // minutes (1 hour)
    hp_recovery: 'spend_hit_dice', // roll hit die + CON mod per die spent
    spell_slot_recovery: false, // except Warlock pact slots
    warlock_slots_recover: true,
    hit_dice_recover: false,
    abilities_recharge: [
      'Fighter: Second Wind',
      'Fighter: Action Surge',
      'Monk: Ki Points',
      'Bard: Bardic Inspiration (level 5+)',
      'Cleric: Channel Divinity',
      'Druid: Wild Shape',
      'Warlock: Pact Magic Slots',
    ],
  },
  long_rest: {
    duration: 480, // minutes (8 hours)
    hp_recovery: 'full', // regain all HP
    spell_slot_recovery: true, // all slots restored
    hit_dice_recover: 'half', // regain half your total hit dice (minimum 1)
    abilities_recharge: ['all'], // everything recharges
    restrictions: 'Can only benefit from one long rest per 24 hours. Must have at least 1 HP.',
  },
};


// ─────────────────────────────────────────────
// DEATH AND DYING
// ─────────────────────────────────────────────

export const DEATH_RULES = {
  death_saves: {
    dc: 10,
    successes_needed: 3,
    failures_needed: 3,
    nat20: 'Regain 1 HP, conscious, clear all saves',
    nat1: 'Counts as 2 failures',
    damage_at_0hp: '1 automatic failure',
    crit_at_0hp: '2 automatic failures',
    healing_at_0hp: 'Regain consciousness with healed HP, clear all saves',
    stable: 'At 3 successes: stable, unconscious, no more saves. Regain 1 HP after 1d4 hours.',
  },
  instant_death: {
    rule: 'If remaining damage after hitting 0 HP equals or exceeds your max HP, you die instantly',
    example: 'A character with 30 max HP at 10 HP takes 40 damage → 0 HP with 30 remaining → equals max HP → instant death',
  },
  massive_damage: {
    optional: true,
    rule: 'When you take damage equal to half your max HP or more from a single hit, make a DC 15 CON save or suffer a random effect',
    effects: [
      'DC 5: drops to 0 HP',
      'DC 10: drops to 0 HP but stable',
      'DC 15: stunned until end of next turn',
      'Other: no additional effect',
    ],
  },
};


// ─────────────────────────────────────────────
// LEVEL PROGRESSION
// ─────────────────────────────────────────────

/** XP thresholds for leveling */
export const XP_THRESHOLDS = {
  1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500,
  6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000,
  11: 85000, 12: 100000, 13: 120000, 14: 140000, 15: 165000,
  16: 195000, 17: 225000, 18: 265000, 19: 305000, 20: 355000,
};

/** CR to XP mapping for encounter building */
export const CR_XP_TABLE = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
  '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
  '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
  '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
  '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000,
  '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000,
};

/** Encounter difficulty thresholds by character level */
export const ENCOUNTER_DIFFICULTY = {
  1:  { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2:  { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3:  { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4:  { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5:  { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6:  { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7:  { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8:  { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9:  { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
};

/** Encounter multiplier based on number of monsters */
export const ENCOUNTER_MULTIPLIER = {
  1: 1,
  2: 1.5,
  '3-6': 2,
  '7-10': 2.5,
  '11-14': 3,
  '15+': 4,
};


// ─────────────────────────────────────────────
// MULTICLASSING RULES
// ─────────────────────────────────────────────

/** Ability score prerequisites for multiclassing */
export const MULTICLASS_REQUIREMENTS = {
  Barbarian: { str: 13 },
  Bard:      { cha: 13 },
  Cleric:    { wis: 13 },
  Druid:     { wis: 13 },
  Fighter:   { str: 13 }, // or DEX 13
  Monk:      { dex: 13, wis: 13 },
  Paladin:   { str: 13, cha: 13 },
  Ranger:    { dex: 13, wis: 13 },
  Rogue:     { dex: 13 },
  Sorcerer:  { cha: 13 },
  Warlock:   { cha: 13 },
  Wizard:    { int: 13 },
};


// ─────────────────────────────────────────────
// MODIFIABLE RULES (Homebrew overrides these)
// ─────────────────────────────────────────────

export const MODIFIABLE_RULES = {
  combat: {
    flanking: {
      enabled: false,
      bonus: 0,
      grants_advantage: false,
      description: 'When you and an ally are on opposite sides of an enemy',
    },
    critical_hits: {
      double_dice: true,
      max_first_roll_second: false,
      max_all: false,
      additional_effects: [],
    },
    critical_fumbles: {
      enabled: false,
      fumble_table: false,
      drop_weapon: false,
      hit_ally: false,
    },
    death_saves: {
      dc: 10,
      visible_to_party: true,
      monsters_make_saves: false,
    },
    initiative: {
      dex_tiebreaker: true,
      group_initiative: false,
      side_initiative: false,
    },
    opportunity_attacks: {
      enabled: true,
      provoked_by_movement: true,
      provoked_by_ranged: false,
    },
    healing_potions: {
      action_cost: 'action',
      bonus_action_self: false,
    },
  },
  resting: {
    short_rest_minutes: 60,
    long_rest_hours: 8,
    full_hp_on_long_rest: true,
    gritty_realism: false,
    epic_heroism: false,
  },
  character: {
    stat_generation: 'standard_array',
    hp_on_level_up: 'average',
    multiclass_allowed: true,
    feats_allowed: true,
    starting_equipment: 'class_default',
    encumbrance_variant: false,
  },
  spellcasting: {
    component_tracking: false,
    identify_before_counterspell: false,
    spell_points_variant: false,
  },
};


// ─────────────────────────────────────────────
// RULES LOOKUP SYSTEM
// ─────────────────────────────────────────────

/**
 * Get a modifiable rule value, checking campaign overrides first.
 * @param {object} campaignRules - campaign.homebrew_rules JSONB (can be null/undefined)
 * @param {string} path - dot-notation like "combat.flanking.enabled"
 * @returns {*} the rule value (override if set, default if not)
 */
export function getRule(campaignRules, path) {
  const keys = path.split('.');

  // Check campaign overrides
  let override = campaignRules || {};
  for (const key of keys) {
    if (override && typeof override === 'object' && key in override) {
      override = override[key];
    } else {
      override = undefined;
      break;
    }
  }
  if (override !== undefined) return override;

  // Fall back to defaults
  let defaultVal = MODIFIABLE_RULES;
  for (const key of keys) {
    if (defaultVal && typeof defaultVal === 'object' && key in defaultVal) {
      defaultVal = defaultVal[key];
    } else {
      return undefined;
    }
  }
  return defaultVal;
}

/**
 * Deep merge campaign overrides onto defaults
 */
export function getCampaignRules(campaignRules) {
  return deepMerge(structuredClone(MODIFIABLE_RULES), campaignRules || {});
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
// ============================================================================
// D&D 5e RULES REGISTRY — PART 2
// ============================================================================
// Append this to dnd5eRules.js after the existing content.
// Covers: Feats, Fighting Styles, Exhaustion, Detailed Class Ability Mechanics,
// Environmental Rules, Vision, Backgrounds, Subclass Features
// ============================================================================


// ─────────────────────────────────────────────
// FEATS
// ─────────────────────────────────────────────
// Characters can take a feat instead of an ASI at levels 4, 8, 12, 16, 19
// (or level 1 for Variant Humans)

export const ABILITY_SCORE_IMPROVEMENT_LEVELS = {
  Barbarian: [4, 8, 12, 16, 19],
  Bard:      [4, 8, 12, 16, 19],
  Cleric:    [4, 8, 12, 16, 19],
  Druid:     [4, 8, 12, 16, 19],
  Fighter:   [4, 6, 8, 12, 14, 16, 19], // Fighters get extra ASIs
  Monk:      [4, 8, 12, 16, 19],
  Paladin:   [4, 8, 12, 16, 19],
  Ranger:    [4, 8, 12, 16, 19],
  Rogue:     [4, 8, 10, 12, 16, 19], // Rogues get extra ASI at 10
  Sorcerer:  [4, 8, 12, 16, 19],
  Warlock:   [4, 8, 12, 16, 19],
  Wizard:    [4, 8, 12, 16, 19],
};

export const FEATS = {
  Alert: {
    prerequisite: null,
    effects: [
      { type: 'initiative_bonus', value: 5 },
      { type: 'immunity', condition: 'surprised' },
      { type: 'special', description: 'Hidden attackers don\'t gain advantage against you' },
    ],
    description: '+5 initiative. Can\'t be surprised while conscious. Hidden creatures don\'t gain advantage on attacks against you.',
  },
  Athlete: {
    prerequisite: null,
    effects: [
      { type: 'asi', choices: ['str', 'dex'], value: 1 },
      { type: 'special', description: 'Standing from prone costs 5ft. Climbing doesn\'t cost extra. Running jump with 5ft start.' },
    ],
    description: '+1 STR or DEX. Standing from prone costs only 5ft. Climbing doesn\'t halve speed. Running long jump with only 5ft running start.',
  },
  Actor: {
    prerequisite: null,
    effects: [
      { type: 'asi', ability: 'cha', value: 1 },
      { type: 'advantage', on: 'Deception and Performance checks when pretending to be someone else' },
      { type: 'special', description: 'Mimic speech/sounds of other creatures' },
    ],
    description: '+1 CHA. Advantage on Deception and Performance when passing as a different person. Can mimic speech of others.',
  },
  Charger: {
    prerequisite: null,
    effects: [
      { type: 'special', description: 'After Dash, bonus action melee attack with +5 damage OR shove 10ft' },
    ],
    description: 'When you Dash, you can make one melee attack or shove as a bonus action. +5 damage on the attack, or push 10 feet on the shove.',
  },
  'Crossbow Expert': {
    prerequisite: null,
    effects: [
      { type: 'ignore', property: 'Loading', description: 'Ignore loading property of crossbows you\'re proficient with' },
      { type: 'special', description: 'No disadvantage on ranged attacks within 5ft of hostile creature' },
      { type: 'bonus_attack', weapon: 'hand crossbow', description: 'After attacking with one-handed weapon, bonus action attack with hand crossbow' },
    ],
    description: 'Ignore loading on crossbows. No disadvantage on ranged within 5ft. Bonus action hand crossbow attack after one-handed weapon attack.',
  },
  'Defensive Duelist': {
    prerequisite: { dex: 13 },
    effects: [
      { type: 'reaction', description: 'Add proficiency bonus to AC against one melee attack that hits you. Must be wielding a finesse weapon.' },
    ],
    description: 'Reaction: add proficiency to AC vs one melee attack. Requires finesse weapon.',
  },
  'Dual Wielder': {
    prerequisite: null,
    effects: [
      { type: 'ac_bonus', value: 1, condition: 'Wielding a melee weapon in each hand' },
      { type: 'special', description: 'Two-weapon fighting with non-light weapons' },
      { type: 'special', description: 'Draw or stow two weapons at once' },
    ],
    description: '+1 AC when dual wielding. Can two-weapon fight without Light property. Draw/stow two weapons at once.',
  },
  'Dungeon Delver': {
    prerequisite: null,
    effects: [
      { type: 'advantage', on: 'Perception and Investigation to detect secret doors' },
      { type: 'advantage', on: 'Saving throws vs traps' },
      { type: 'resistance', against: 'trap damage' },
      { type: 'special', description: 'Search for traps at normal pace' },
    ],
    description: 'Advantage to detect secret doors. Advantage on saves vs traps. Resist trap damage. Search for traps at normal travel pace.',
  },
  Durable: {
    prerequisite: null,
    effects: [
      { type: 'asi', ability: 'con', value: 1 },
      { type: 'special', description: 'Minimum hit die recovery = 2 × CON modifier' },
    ],
    description: '+1 CON. When rolling hit dice, minimum recovery per die = 2 × CON modifier.',
  },
  'Elemental Adept': {
    prerequisite: { spellcasting: true },
    effects: [
      { type: 'special', description: 'Choose acid, cold, fire, lightning, or thunder. Spells ignore resistance to that type. Treat 1s as 2s on damage dice.' },
    ],
    description: 'Choose a damage type. Your spells ignore resistance to it. Treat damage roll 1s as 2s. Can take multiple times for different types.',
  },
  Grappler: {
    prerequisite: { str: 13 },
    effects: [
      { type: 'advantage', on: 'Attack rolls against creatures you\'re grappling' },
      { type: 'special', description: 'Can pin a grappled creature (both restrained)' },
    ],
    description: 'Advantage on attacks vs creatures you grapple. Can pin (restrain both yourself and the grappled creature).',
  },
  'Great Weapon Master': {
    prerequisite: null,
    effects: [
      { type: 'bonus_attack', trigger: 'crit or kill with melee', description: 'Bonus action melee attack on crit or kill' },
      { type: 'power_attack', penalty: -5, bonus: 10, description: '-5 to attack roll, +10 to damage with heavy weapon' },
    ],
    description: 'On crit or kill with melee: bonus action melee attack. Before attacking with heavy weapon: -5 to hit, +10 damage.',
  },
  Healer: {
    prerequisite: null,
    effects: [
      { type: 'special', description: 'Use healer\'s kit to stabilize AND restore 1 HP' },
      { type: 'special', description: 'Use healer\'s kit as action: target regains 1d6+4+target\'s HD HP. Once per rest per creature.' },
    ],
    description: 'Healer\'s kit stabilizes AND restores 1 HP. As action, heal 1d6+4+target HD (once per rest per creature).',
  },
  'Heavily Armored': {
    prerequisite: { proficiency: 'medium armor' },
    effects: [
      { type: 'asi', ability: 'str', value: 1 },
      { type: 'proficiency', armor: 'heavy' },
    ],
    description: '+1 STR. Gain heavy armor proficiency.',
  },
  'Heavy Armor Master': {
    prerequisite: { proficiency: 'heavy armor' },
    effects: [
      { type: 'asi', ability: 'str', value: 1 },
      { type: 'damage_reduction', value: 3, types: ['bludgeoning', 'piercing', 'slashing'], condition: 'nonmagical, while wearing heavy armor' },
    ],
    description: '+1 STR. While wearing heavy armor, reduce nonmagical bludgeoning/piercing/slashing by 3.',
  },
  'Inspiring Leader': {
    prerequisite: { cha: 13 },
    effects: [
      { type: 'special', description: '10 min speech gives up to 6 allies temp HP = your level + CHA mod. Once per short/long rest.' },
    ],
    description: '10 min speech. Up to 6 creatures gain temp HP = your level + CHA modifier. Once per rest.',
  },
  'Keen Mind': {
    prerequisite: null,
    effects: [
      { type: 'asi', ability: 'int', value: 1 },
      { type: 'special', description: 'Always know north. Always know hours until sunrise/sunset. Recall anything seen/heard in past month.' },
    ],
    description: '+1 INT. Always know north, time until sunrise/sunset. Perfect recall of past month.',
  },
  'Lightly Armored': {
    prerequisite: null,
    effects: [
      { type: 'asi', choices: ['str', 'dex'], value: 1 },
      { type: 'proficiency', armor: 'light' },
    ],
    description: '+1 STR or DEX. Gain light armor proficiency.',
  },
  Linguist: {
    prerequisite: null,
    effects: [
      { type: 'asi', ability: 'int', value: 1 },
      { type: 'languages', count: 3 },
      { type: 'special', description: 'Create written ciphers. DC = INT score + proficiency.' },
    ],
    description: '+1 INT. Learn 3 languages. Create written ciphers (INT + proficiency DC to decipher).',
  },
  Lucky: {
    prerequisite: null,
    effects: [
      { type: 'luck_points', count: 3, recharge: 'long rest' },
      { type: 'special', description: 'Spend a luck point to roll extra d20 on attack, check, or save — choose which d20 to use. Can also spend on attack roll made against you.' },
    ],
    description: '3 luck points/long rest. Spend to roll extra d20 on attacks, checks, saves (choose which). Can force reroll on attacks against you.',
  },
  'Mage Slayer': {
    prerequisite: null,
    effects: [
      { type: 'reaction', description: 'Melee attack when creature within 5ft casts a spell' },
      { type: 'special', description: 'Target has disadvantage on concentration saves from your damage' },
      { type: 'advantage', on: 'Saving throws vs spells cast by creatures within 5ft' },
    ],
    description: 'Reaction melee attack on nearby spellcaster. Disadvantage on their concentration saves from your damage. Advantage on saves vs spells within 5ft.',
  },
  'Magic Initiate': {
    prerequisite: null,
    effects: [
      { type: 'special', description: 'Learn 2 cantrips and 1 first-level spell from one class spell list. Cast the 1st-level spell once per long rest.' },
    ],
    description: 'Learn 2 cantrips + 1 first-level spell from a class. Cast the spell once/long rest.',
  },
  'Martial Adept': {
    prerequisite: null,
    effects: [
      { type: 'special', description: 'Learn 2 Battle Master maneuvers. Gain 1 superiority die (d6).' },
    ],
    description: '2 Battle Master maneuvers. 1 superiority die (d6), recharges on short/long rest.',
  },
  'Medium Armor Master': {
    prerequisite: { proficiency: 'medium armor' },
    effects: [
      { type: 'special', description: 'Medium armor DEX cap becomes +3 instead of +2' },
      { type: 'special', description: 'Medium armor doesn\'t impose stealth disadvantage' },
    ],
    description: 'Medium armor: DEX max +3 (not +2). No stealth disadvantage from medium armor.',
  },
  Mobile: {
    prerequisite: null,
    effects: [
      { type: 'speed_bonus', value: 10 },
      { type: 'special', description: 'Dash through difficult terrain without extra cost' },
      { type: 'special', description: 'When you melee attack a creature, it can\'t opportunity attack you for the rest of your turn' },
    ],
    description: '+10 speed. Dash ignores difficult terrain. Melee target can\'t opportunity attack you this turn.',
  },
  'Moderately Armored': {
    prerequisite: { proficiency: 'light armor' },
    effects: [
      { type: 'asi', choices: ['str', 'dex'], value: 1 },
      { type: 'proficiency', armor: ['medium', 'shields'] },
    ],
    description: '+1 STR or DEX. Gain medium armor and shield proficiency.',
  },
  'Mounted Combatant': {
    prerequisite: null,
    effects: [
      { type: 'advantage', on: 'Melee attacks vs unmounted creatures smaller than mount' },
      { type: 'special', description: 'Force attacks on mount to target you instead' },
      { type: 'special', description: 'Mount takes no damage on DEX save success (half on fail)' },
    ],
    description: 'Advantage vs smaller unmounted creatures. Redirect attacks on mount to you. Mount gets Evasion.',
  },
  Observant: {
    prerequisite: null,
    effects: [
      { type: 'asi', choices: ['int', 'wis'], value: 1 },
      { type: 'special', description: 'Read lips if you can see the speaker\'s mouth' },
      { type: 'passive_bonus', skills: ['Perception', 'Investigation'], value: 5 },
    ],
    description: '+1 INT or WIS. Read lips. +5 to passive Perception and Investigation.',
  },
  'Polearm Master': {
    prerequisite: null,
    effects: [
      { type: 'bonus_attack', weapon: ['glaive', 'halberd', 'quarterstaff', 'spear'], damage: '1d4 bludgeoning', description: 'Bonus action attack with opposite end' },
      { type: 'opportunity_attack', trigger: 'Creature enters your reach', description: 'OA when enemy enters reach, not just leaves' },
    ],
    description: 'Bonus action 1d4 butt-end attack with polearm. Opportunity attack when creatures ENTER your reach.',
  },
  Resilient: {
    prerequisite: null,
    effects: [
      { type: 'asi', choices: ['str', 'dex', 'con', 'int', 'wis', 'cha'], value: 1 },
      { type: 'save_proficiency', ability: 'chosen' },
    ],
    description: '+1 to chosen ability. Gain saving throw proficiency in that ability.',
  },
  'Ritual Caster': {
    prerequisite: { int_or_wis: 13 },
    effects: [
      { type: 'special', description: 'Ritual book with 2 first-level ritual spells. Can add more rituals found during adventure.' },
    ],
    description: 'Ritual book with 2 first-level rituals. Can copy more into it.',
  },
  'Savage Attacker': {
    prerequisite: null,
    effects: [
      { type: 'special', description: 'Once per turn, reroll melee weapon damage dice and use either total' },
    ],
    description: 'Once per turn: reroll melee damage dice, take either result.',
  },
  Sentinel: {
    prerequisite: null,
    effects: [
      { type: 'special', description: 'Creatures you hit with OA have speed = 0 for the rest of the turn' },
      { type: 'special', description: 'Disengage doesn\'t prevent your opportunity attacks' },
      { type: 'reaction', description: 'When a creature within 5ft attacks a target other than you, melee attack against it' },
    ],
    description: 'OA reduces target speed to 0. Disengage doesn\'t stop your OA. Reaction attack when enemy attacks someone else near you.',
  },
  Sharpshooter: {
    prerequisite: null,
    effects: [
      { type: 'special', description: 'No disadvantage at long range' },
      { type: 'special', description: 'Ignore half and three-quarters cover' },
      { type: 'power_attack', penalty: -5, bonus: 10, description: '-5 to attack, +10 damage with ranged weapon' },
    ],
    description: 'No disadvantage at long range. Ignore half/three-quarters cover. -5 to hit, +10 damage on ranged attacks.',
  },
  'Shield Master': {
    prerequisite: null,
    effects: [
      { type: 'bonus_action', description: 'Shove as bonus action after Attack action' },
      { type: 'special', description: 'Add shield\'s AC bonus to DEX saves vs single-target effects' },
      { type: 'special', description: 'On successful DEX save: reaction to take no damage (Evasion with shield)' },
    ],
    description: 'Bonus action shove after Attack. Add shield AC to DEX saves. Reaction: no damage on DEX save success.',
  },
  'Skulker': {
    prerequisite: { dex: 13 },
    effects: [
      { type: 'special', description: 'Can hide when lightly obscured' },
      { type: 'special', description: 'Missing a ranged attack doesn\'t reveal your position' },
      { type: 'special', description: 'No disadvantage on Perception in dim light' },
    ],
    description: 'Hide in light obscurement. Missed ranged attacks don\'t reveal you. No dim light Perception penalty.',
  },
  'Spell Sniper': {
    prerequisite: { spellcasting: true },
    effects: [
      { type: 'special', description: 'Double range of attack roll spells' },
      { type: 'special', description: 'Ranged spell attacks ignore half and three-quarters cover' },
      { type: 'special', description: 'Learn one attack roll cantrip from any class' },
    ],
    description: 'Double spell attack range. Ignore half/three-quarters cover. Learn one attack cantrip.',
  },
  Tough: {
    prerequisite: null,
    effects: [
      { type: 'hp_bonus', perLevel: 2 },
    ],
    description: 'HP max increases by 2 per level (including retroactively).',
  },
  'War Caster': {
    prerequisite: { spellcasting: true },
    effects: [
      { type: 'advantage', on: 'Concentration saving throws' },
      { type: 'special', description: 'Can perform somatic components with weapons/shield in hands' },
      { type: 'special', description: 'Can cast a spell as opportunity attack instead of melee attack' },
    ],
    description: 'Advantage on concentration saves. Somatic components with full hands. Cast spell as opportunity attack.',
  },
  'Weapon Master': {
    prerequisite: null,
    effects: [
      { type: 'asi', choices: ['str', 'dex'], value: 1 },
      { type: 'proficiency', weapons: '4 weapons of choice' },
    ],
    description: '+1 STR or DEX. Gain proficiency with 4 weapons of your choice.',
  },
};


// ─────────────────────────────────────────────
// FIGHTING STYLES
// ─────────────────────────────────────────────

export const FIGHTING_STYLES = {
  Archery: {
    classes: ['Fighter', 'Ranger'],
    effect: { type: 'attack_bonus', value: 2, condition: 'ranged weapon attacks' },
    description: '+2 bonus to attack rolls with ranged weapons.',
  },
  Defense: {
    classes: ['Fighter', 'Paladin', 'Ranger'],
    effect: { type: 'ac_bonus', value: 1, condition: 'wearing armor' },
    description: '+1 AC while wearing armor.',
  },
  Dueling: {
    classes: ['Fighter', 'Paladin', 'Ranger'],
    effect: { type: 'damage_bonus', value: 2, condition: 'melee weapon in one hand, no other weapons' },
    description: '+2 damage when wielding a melee weapon in one hand and no other weapons.',
  },
  'Great Weapon Fighting': {
    classes: ['Fighter', 'Paladin'],
    effect: { type: 'reroll_damage', rerollOn: [1, 2], condition: 'two-handed or versatile melee weapon' },
    description: 'Reroll 1s and 2s on damage dice with two-handed/versatile melee weapons. Must use new roll.',
  },
  Protection: {
    classes: ['Fighter', 'Paladin'],
    effect: { type: 'reaction', description: 'When adjacent ally is attacked, impose disadvantage on the attack. Requires shield.' },
    description: 'Reaction: impose disadvantage on attack against adjacent ally. Requires shield.',
  },
  'Two-Weapon Fighting': {
    classes: ['Fighter', 'Ranger'],
    effect: { type: 'offhand_damage_mod', description: 'Add ability modifier to off-hand attack damage' },
    description: 'Add ability modifier to the damage of your off-hand attack.',
  },
};


// ─────────────────────────────────────────────
// EXHAUSTION
// ─────────────────────────────────────────────

export const EXHAUSTION_LEVELS = {
  0: { effects: [], description: 'No exhaustion' },
  1: { effects: [{ type: 'disadvantage', on: 'ability_checks' }], description: 'Disadvantage on ability checks' },
  2: { effects: [{ type: 'disadvantage', on: 'ability_checks' }, { type: 'speed_halved' }], description: 'Speed halved' },
  3: { effects: [{ type: 'disadvantage', on: 'ability_checks' }, { type: 'speed_halved' }, { type: 'disadvantage', on: 'attack_rolls' }, { type: 'disadvantage', on: 'saving_throws' }], description: 'Disadvantage on attacks and saves' },
  4: { effects: [{ type: 'disadvantage', on: 'ability_checks' }, { type: 'speed_halved' }, { type: 'disadvantage', on: 'attack_rolls' }, { type: 'disadvantage', on: 'saving_throws' }, { type: 'hp_max_halved' }], description: 'HP maximum halved' },
  5: { effects: [{ type: 'disadvantage', on: 'ability_checks' }, { type: 'speed_halved' }, { type: 'disadvantage', on: 'attack_rolls' }, { type: 'disadvantage', on: 'saving_throws' }, { type: 'hp_max_halved' }, { type: 'speed_zero' }], description: 'Speed reduced to 0' },
  6: { effects: [{ type: 'death' }], description: 'Death' },
};

export const EXHAUSTION_RULES = {
  reduction: 'One level removed per long rest (with food and water)',
  causes: [
    'Forced march beyond 8 hours (CON save DC 10 + 1 per hour past 8)',
    'Going without food (after CON mod + 3 days)',
    'Going without water (after 1 day, or half day in hot weather)',
    'Berserker Barbarian Frenzy (1 level after rage ends)',
    'Some spells and monster abilities',
  ],
  stacking: 'Effects are cumulative — level 3 includes level 1 and 2 effects',
};


// ─────────────────────────────────────────────
// DETAILED CLASS ABILITY MECHANICS
// ─────────────────────────────────────────────

export const CLASS_ABILITY_MECHANICS = {
  // BARBARIAN
  Rage: {
    class: 'Barbarian',
    level: 1,
    cost: 'bonus action',
    duration: '1 minute',
    endConditions: ['unconscious', 'turn ends without attacking or taking damage', 'voluntary'],
    effects: [
      { type: 'advantage', on: 'STR checks and STR saves' },
      { type: 'resistance', against: ['bludgeoning', 'piercing', 'slashing'] },
      { type: 'damage_bonus', value: 'RAGE_DAMAGE_BONUS[level]', condition: 'melee STR attacks' },
      { type: 'restriction', description: 'Can\'t cast or concentrate on spells' },
    ],
    usesPerDay: 'RAGES_PER_DAY[level]',
    description: 'Bonus action. Advantage on STR checks/saves. Resistance to physical damage. Bonus melee damage. Can\'t cast spells.',
  },
  'Reckless Attack': {
    class: 'Barbarian',
    level: 2,
    cost: 'free (on first attack of turn)',
    effects: [
      { type: 'advantage', on: 'All STR melee attack rolls this turn' },
      { type: 'penalty', description: 'All attacks against you have advantage until your next turn' },
    ],
    description: 'Advantage on all STR melee attacks this turn. Attacks against you have advantage until next turn.',
  },
  'Danger Sense': {
    class: 'Barbarian',
    level: 2,
    effects: [
      { type: 'advantage', on: 'DEX saves against effects you can see (traps, spells, etc.)' },
    ],
    restrictions: ['Not blinded', 'Not deafened', 'Not incapacitated'],
    description: 'Advantage on DEX saves against effects you can see.',
  },

  // BARD
  'Bardic Inspiration': {
    class: 'Bard',
    level: 1,
    cost: 'bonus action',
    range: '60 feet',
    target: 'One creature other than yourself',
    die: { 1: 'd6', 5: 'd8', 10: 'd10', 15: 'd12' },
    duration: '10 minutes',
    uses: 'CHA modifier per long rest (min 1). At level 5, recharges on short rest.',
    effect: 'Target can add the die to one ability check, attack roll, or saving throw within 10 minutes',
    description: 'Bonus action: give ally a die they can add to a check, attack, or save.',
  },
  Countercharm: {
    class: 'Bard',
    level: 6,
    cost: 'action',
    duration: 'Until start of your next turn',
    effects: [
      { type: 'advantage', on: 'Saving throws vs being frightened or charmed', targets: 'You and allies within 30ft who can hear you' },
    ],
    description: 'Action: you and allies within 30ft have advantage vs charm/frighten saves until your next turn.',
  },

  // CLERIC
  'Turn Undead': {
    class: 'Cleric',
    level: 2,
    cost: 'action (Channel Divinity)',
    range: '30 feet',
    save: 'WIS',
    effects: [
      { type: 'condition', condition: 'Turned', duration: '1 minute', description: 'Must Dash away, can\'t move toward you, can\'t take reactions' },
    ],
    description: 'Action: each undead within 30ft makes WIS save or is turned for 1 minute.',
  },
  'Destroy Undead': {
    class: 'Cleric',
    level: 5,
    crThresholds: { 5: '1/2', 8: 1, 11: 2, 14: 3, 17: 4 },
    description: 'Undead that fail Turn Undead save are instantly destroyed if their CR is at or below the threshold.',
  },

  // FIGHTER
  'Second Wind': {
    class: 'Fighter',
    level: 1,
    cost: 'bonus action',
    healing: '1d10 + fighter level',
    recharge: 'short rest',
    description: 'Bonus action: regain 1d10 + Fighter level HP. Recharges on short rest.',
  },
  'Action Surge': {
    class: 'Fighter',
    level: 2,
    cost: 'free',
    effect: 'One additional action on your turn',
    recharge: 'short rest',
    uses: { 2: 1, 17: 2 },
    description: 'Take one additional action. Short rest recharge. Two uses at level 17.',
  },
  Indomitable: {
    class: 'Fighter',
    level: 9,
    cost: 'free',
    effect: 'Reroll a failed saving throw (must use new roll)',
    recharge: 'long rest',
    uses: { 9: 1, 13: 2, 17: 3 },
    description: 'Reroll a failed save. Long rest recharge. More uses at higher levels.',
  },

  // MONK
  'Martial Arts': {
    class: 'Monk',
    level: 1,
    effects: [
      { type: 'special', description: 'Use DEX instead of STR for unarmed/monk weapon attacks' },
      { type: 'special', description: 'Unarmed/monk weapon damage die = MONK_MARTIAL_ARTS_DIE[level]' },
      { type: 'bonus_attack', description: 'Bonus action unarmed strike after attacking with unarmed/monk weapon' },
    ],
    description: 'DEX for monk weapons/unarmed. Improved damage die. Bonus action unarmed strike.',
  },
  'Flurry of Blows': {
    class: 'Monk',
    level: 2,
    cost: '1 ki point + bonus action',
    effect: 'Two unarmed strikes as a bonus action (instead of one from Martial Arts)',
    description: 'After Attack action, spend 1 ki: bonus action for two unarmed strikes.',
  },
  'Patient Defense': {
    class: 'Monk',
    level: 2,
    cost: '1 ki point + bonus action',
    effect: 'Take the Dodge action as a bonus action',
    description: 'Spend 1 ki: Dodge as bonus action.',
  },
  'Step of the Wind': {
    class: 'Monk',
    level: 2,
    cost: '1 ki point + bonus action',
    effect: 'Take the Dash or Disengage action as a bonus action. Jump distance doubled this turn.',
    description: 'Spend 1 ki: Dash or Disengage as bonus action. Double jump distance.',
  },
  'Deflect Missiles': {
    class: 'Monk',
    level: 3,
    cost: 'reaction',
    reduction: '1d10 + DEX mod + monk level',
    throwBack: { cost: '1 ki point', damage: 'martial arts die + DEX mod', range: '20/60' },
    description: 'Reaction: reduce ranged attack damage by 1d10+DEX+level. If reduced to 0, spend 1 ki to throw it back.',
  },
  'Slow Fall': {
    class: 'Monk',
    level: 4,
    cost: 'reaction',
    reduction: 'monk level × 5',
    description: 'Reaction: reduce falling damage by 5 × monk level.',
  },
  'Stunning Strike': {
    class: 'Monk',
    level: 5,
    cost: '1 ki point',
    trigger: 'Hit a creature with a melee weapon attack',
    save: 'CON',
    effect: 'Target is stunned until the end of your next turn',
    description: 'On melee hit, spend 1 ki: target makes CON save or is stunned until end of your next turn.',
  },
  'Evasion': {
    class: ['Monk', 'Rogue'],
    level: { Monk: 7, Rogue: 7 },
    effect: 'DEX save for half damage → take no damage on success, half on failure (instead of half/full)',
    description: 'DEX save: success = 0 damage, failure = half damage.',
  },

  // PALADIN
  'Divine Sense': {
    class: 'Paladin',
    level: 1,
    cost: 'action',
    range: '60 feet',
    uses: '1 + CHA modifier per long rest',
    effect: 'Know the location and type of any celestial, fiend, or undead within 60ft. Detect consecrated/desecrated ground.',
    description: 'Action: detect celestials, fiends, undead within 60ft.',
  },
  'Lay on Hands': {
    class: 'Paladin',
    level: 1,
    cost: 'action',
    pool: 'paladin level × 5 HP',
    effects: [
      { type: 'heal', description: 'Restore HP from pool (any amount)' },
      { type: 'cure', description: 'Spend 5 HP from pool to cure one disease or neutralize one poison' },
    ],
    recharge: 'long rest',
    description: 'Action: heal from pool (level × 5). Spend 5 points to cure disease/poison.',
  },
  'Divine Smite': {
    class: 'Paladin',
    level: 2,
    cost: 'spell slot (on hit)',
    damage: '2d8 + 1d8 per slot level above 1st (max 5d8)',
    bonusDamage: '+1d8 vs undead or fiend',
    description: 'On melee hit, expend spell slot: 2d8 radiant + 1d8/level above 1st. +1d8 vs undead/fiend.',
  },
  'Aura of Protection': {
    class: 'Paladin',
    level: 6,
    range: { 6: 10, 18: 30 },
    effect: 'You and friendly creatures within range add your CHA modifier to saving throws',
    condition: 'You must be conscious',
    description: '+CHA mod to all saves for you and allies within 10ft (30ft at 18).',
  },

  // RANGER
  'Favored Enemy': {
    class: 'Ranger',
    level: 1,
    effect: 'Advantage on Survival checks to track, INT checks to recall info about chosen enemy type',
    description: 'Choose enemy type. Advantage on tracking and knowledge checks about them.',
  },
  'Natural Explorer': {
    class: 'Ranger',
    level: 1,
    effect: 'Favored terrain benefits: double proficiency on INT/WIS checks, difficult terrain doesn\'t slow party, can\'t get lost (nonmagical), alert to danger while traveling',
    description: 'Choose terrain type. Various travel and navigation benefits in that terrain.',
  },

  // ROGUE
  'Cunning Action': {
    class: 'Rogue',
    level: 2,
    cost: 'bonus action',
    options: ['Dash', 'Disengage', 'Hide'],
    description: 'Bonus action: Dash, Disengage, or Hide.',
  },
  'Sneak Attack': {
    class: 'Rogue',
    level: 1,
    damage: 'sneakAttackDice(rogueLevel) d6',
    conditions: [
      'Must use finesse or ranged weapon',
      'Must have advantage on the attack',
      'OR an ally is within 5ft of the target and you don\'t have disadvantage',
    ],
    frequency: 'Once per turn',
    description: 'Extra damage on attacks with advantage or ally near target. Once per turn.',
  },
  'Uncanny Dodge': {
    class: 'Rogue',
    level: 5,
    cost: 'reaction',
    trigger: 'An attacker you can see hits you with an attack',
    effect: 'Halve the attack\'s damage against you',
    description: 'Reaction: halve damage from one attack you can see.',
  },
  'Reliable Talent': {
    class: 'Rogue',
    level: 11,
    effect: 'Any ability check using a skill you\'re proficient in: treat d20 roll of 9 or lower as 10',
    description: 'Proficient skill checks: minimum d20 roll is 10.',
  },
  'Blindsense': {
    class: 'Rogue',
    level: 14,
    range: '10 feet',
    effect: 'Aware of hidden and invisible creatures within 10ft',
    description: 'Detect hidden/invisible creatures within 10ft.',
  },
  Elusive: {
    class: 'Rogue',
    level: 18,
    effect: 'No attack roll has advantage against you while you aren\'t incapacitated',
    description: 'Attacks never have advantage against you.',
  },

  // SORCERER
  'Font of Magic': {
    class: 'Sorcerer',
    level: 2,
    sorceryPoints: 'sorcerer level',
    convertSlotToPoints: { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 },
    convertPointsToSlot: { 2: 1, 3: 2, 5: 3, 6: 4, 7: 5 },
    description: 'Sorcery points = level. Convert spell slots to points or points to slots.',
  },
  Metamagic: {
    class: 'Sorcerer',
    level: 3,
    options: {
      'Careful Spell':    { cost: 1, description: 'CHA mod creatures auto-succeed on save from your spell' },
      'Distant Spell':    { cost: 1, description: 'Double spell range (touch becomes 30ft)' },
      'Empowered Spell':  { cost: 1, description: 'Reroll up to CHA mod damage dice' },
      'Extended Spell':   { cost: 1, description: 'Double spell duration (max 24 hours)' },
      'Heightened Spell': { cost: 3, description: 'One target has disadvantage on first save vs spell' },
      'Quickened Spell':  { cost: 2, description: 'Change casting time from 1 action to 1 bonus action' },
      'Subtle Spell':     { cost: 1, description: 'Cast without V or S components' },
      'Twinned Spell':    { cost: 'spell level (1 for cantrip)', description: 'Target a second creature with a single-target spell' },
    },
    known: { 3: 2, 10: 3, 17: 4 },
    description: 'Modify spells by spending sorcery points.',
  },

  // WARLOCK
  'Eldritch Invocations': {
    class: 'Warlock',
    level: 2,
    known: { 2: 2, 5: 3, 7: 4, 9: 5, 12: 6, 15: 7, 18: 8 },
    popular: {
      'Agonizing Blast':  { prerequisite: 'Eldritch Blast cantrip', effect: 'Add CHA mod to Eldritch Blast damage' },
      'Armor of Shadows':  { prerequisite: null, effect: 'Cast Mage Armor on self at will' },
      'Devil\'s Sight':    { prerequisite: null, effect: 'See normally in magical and nonmagical darkness to 120ft' },
      'Eldritch Sight':    { prerequisite: null, effect: 'Cast Detect Magic at will' },
      'Mask of Many Faces': { prerequisite: null, effect: 'Cast Disguise Self at will' },
      'Repelling Blast':   { prerequisite: 'Eldritch Blast cantrip', effect: 'Push target 10ft on Eldritch Blast hit' },
      'Thirsting Blade':   { prerequisite: 'Pact of the Blade, level 5', effect: 'Attack twice with pact weapon' },
    },
    description: 'Passive abilities that modify your warlock features.',
  },

  // WIZARD
  'Arcane Recovery': {
    class: 'Wizard',
    level: 1,
    recharge: 'long rest',
    slotsRecovered: 'Combined spell slot levels = ceil(wizard level / 2). No slot above 5th.',
    description: 'Once per day after short rest: recover spell slots totaling up to half wizard level (no 6th+).',
  },
  'Spell Mastery': {
    class: 'Wizard',
    level: 18,
    effect: 'Choose one 1st-level and one 2nd-level spell. Cast at lowest level without expending a slot.',
    description: 'At-will casting of one 1st-level and one 2nd-level spell.',
  },
};


// ─────────────────────────────────────────────
// ENVIRONMENTAL AND SITUATIONAL RULES
// ─────────────────────────────────────────────

export const FALLING_DAMAGE = {
  perFeet: 10,
  dicePerIncrement: '1d6',
  maxDice: 20,
  calculate: (feet) => `${Math.min(Math.floor(feet / 10), 20)}d6`,
  landing: 'Prone if any damage taken',
  description: '1d6 bludgeoning per 10 feet fallen, max 20d6. Land prone.',
};

export const SUFFOCATION = {
  holdBreath: (conMod) => Math.max(1 + conMod, 0.5), // minutes
  afterBreathRuns: 'Can survive CON mod rounds (min 1). At 0 rounds: drop to 0 HP and dying.',
  description: 'Hold breath: 1 + CON mod minutes. Then CON mod rounds before 0 HP.',
};

export const VISION_AND_LIGHT = {
  bright_light: { description: 'Normal vision. Most creatures see normally.' },
  dim_light: {
    description: 'Lightly obscured. Disadvantage on Perception checks relying on sight.',
    examples: 'Twilight, bright moonlight, within 5ft of torchlight edge',
  },
  darkness: {
    description: 'Heavily obscured. Effectively blinded without darkvision or light.',
    blindedEffects: 'Auto-fail checks requiring sight. Attack rolls against have advantage, your attacks have disadvantage.',
  },
  darkvision: {
    description: 'See in dim light as bright, darkness as dim (greyscale only) within range',
    range: 60, // most races; some have 120
  },
  blindsight: {
    description: 'Perceive surroundings without sight (echolocation, acute senses, etc.)',
  },
  truesight: {
    description: 'See in normal and magical darkness, see invisible creatures, see through illusions, detect shapechangers, see into Ethereal Plane',
    range: 120,
  },
};

export const OBSCUREMENT = {
  lightly_obscured: {
    description: 'Dim light, patchy fog, moderate foliage',
    effect: 'Disadvantage on Perception checks relying on sight',
  },
  heavily_obscured: {
    description: 'Darkness, opaque fog, dense foliage',
    effect: 'Effectively blinded when trying to see into the area',
  },
};

export const SURPRISE = {
  determination: 'DM compares Stealth checks of hiding side vs passive Perception of other side',
  surprised_creatures: 'Can\'t move or take actions on first turn of combat. Can\'t take reactions until first turn ends.',
  not_universal: 'Some members of a group may be surprised while others aren\'t',
  description: 'If caught off guard, can\'t act on first turn and no reactions until it ends.',
};

export const MOUNTED_COMBAT = {
  mounting: 'Costs half your movement speed. Must be within 5ft of willing mount.',
  dismounting: 'Costs half your movement speed.',
  controlling_mount: 'Mount acts on your initiative. Can only Dash, Disengage, or Dodge. You direct it.',
  independent_mount: 'Mount acts independently on its own initiative with full actions.',
  forced_dismount: 'If mount is moved against its will, DC 10 DEX save or fall prone within 5ft. Same if knocked prone.',
  mount_attacked: 'Attacker can target rider or mount.',
  description: 'Mount on initiative, control or let act independently. Fall off if mount moved/knocked prone.',
};

export const UNDERWATER_COMBAT = {
  melee: {
    normal: ['trident', 'javelin', 'shortsword', 'dagger', 'spear'],
    disadvantage: 'All other melee weapons unless wielder has swim speed',
  },
  ranged: {
    auto_miss: 'Beyond normal range',
    disadvantage: 'Within normal range unless crossbow, net, or thrown weapon (javelin, trident, dart, spear)',
  },
  breathing: 'Can hold breath for 1 + CON mod minutes. Dropping to 0 = drowning (0 HP).',
  fire_resistance: 'Creatures/objects fully submerged have resistance to fire damage',
  description: 'Most melee at disadvantage. Ranged auto-miss beyond normal range. Fire resistance.',
};

export const OBJECT_INTERACTION = {
  free: 'One free object interaction per turn (draw/stow weapon, open door, pick up item)',
  action: 'Second interaction requires your Action (Use an Object)',
  examples: [
    'Draw or sheathe a sword',
    'Open or close a door',
    'Withdraw a potion from your backpack',
    'Pick up a dropped axe',
    'Hand an item to another character',
    'Pull a lever or flip a switch',
    'Don or doff a shield (1 action)',
  ],
};

export const DON_DOFF_ARMOR = {
  light:  { don: '1 minute', doff: '1 minute' },
  medium: { don: '5 minutes', doff: '1 minute' },
  heavy:  { don: '10 minutes', doff: '5 minutes' },
  shield: { don: '1 action', doff: '1 action' },
};

export const IMPROVISED_WEAPONS = {
  damage: '1d4',
  type: 'DM discretion (bludgeoning most common)',
  proficiency: 'Not proficient unless DM rules similar to a real weapon',
  thrown: { range: '20/60' },
  description: 'Bottles, table legs, frying pans, etc. 1d4 damage, no proficiency bonus.',
};


// ─────────────────────────────────────────────
// INSPIRATION
// ─────────────────────────────────────────────

export const INSPIRATION = {
  source: 'Awarded by the DM for good roleplaying, creative thinking, or staying in character',
  effect: 'Advantage on one attack roll, ability check, or saving throw',
  stacking: false, // can only have inspiration or not; can\'t stack
  sharing: 'Can give your inspiration to another player character',
  description: 'DM awards it. Spend for advantage on one roll. Can\'t stack. Can give to another player.',
};


// ─────────────────────────────────────────────
// BACKGROUNDS (Skill/Tool proficiencies)
// ─────────────────────────────────────────────

export const BACKGROUNDS = {
  Acolyte: {
    skills: ['Insight', 'Religion'],
    tools: [],
    languages: 2,
    equipment: 'Holy symbol, prayer book, incense, vestments, common clothes, 15 GP',
    feature: 'Shelter of the Faithful',
  },
  Charlatan: {
    skills: ['Deception', 'Sleight of Hand'],
    tools: ['Disguise kit', 'Forgery kit'],
    languages: 0,
    equipment: 'Fine clothes, disguise kit, con tools, 15 GP',
    feature: 'False Identity',
  },
  Criminal: {
    skills: ['Deception', 'Stealth'],
    tools: ['Thieves\' tools', 'Gaming set (one)'],
    languages: 0,
    equipment: 'Crowbar, dark common clothes with hood, 15 GP',
    feature: 'Criminal Contact',
  },
  Entertainer: {
    skills: ['Acrobatics', 'Performance'],
    tools: ['Disguise kit', 'Musical instrument (one)'],
    languages: 0,
    equipment: 'Musical instrument, favor of an admirer, costume, 15 GP',
    feature: 'By Popular Demand',
  },
  'Folk Hero': {
    skills: ['Animal Handling', 'Survival'],
    tools: ['Artisan\'s tools (one)', 'Vehicles (land)'],
    languages: 0,
    equipment: 'Artisan\'s tools, shovel, iron pot, common clothes, 10 GP',
    feature: 'Rustic Hospitality',
  },
  'Guild Artisan': {
    skills: ['Insight', 'Persuasion'],
    tools: ['Artisan\'s tools (one)'],
    languages: 1,
    equipment: 'Artisan\'s tools, letter of introduction, traveler\'s clothes, 15 GP',
    feature: 'Guild Membership',
  },
  Hermit: {
    skills: ['Medicine', 'Religion'],
    tools: ['Herbalism kit'],
    languages: 1,
    equipment: 'Herbalism kit, winter blanket, common clothes, 5 GP',
    feature: 'Discovery',
  },
  Noble: {
    skills: ['History', 'Persuasion'],
    tools: ['Gaming set (one)'],
    languages: 1,
    equipment: 'Fine clothes, signet ring, scroll of pedigree, 25 GP',
    feature: 'Position of Privilege',
  },
  Outlander: {
    skills: ['Athletics', 'Survival'],
    tools: ['Musical instrument (one)'],
    languages: 1,
    equipment: 'Staff, hunting trap, animal trophy, traveler\'s clothes, 10 GP',
    feature: 'Wanderer',
  },
  Sage: {
    skills: ['Arcana', 'History'],
    tools: [],
    languages: 2,
    equipment: 'Ink, quill, small knife, letter from dead colleague, common clothes, 10 GP',
    feature: 'Researcher',
  },
  Sailor: {
    skills: ['Athletics', 'Perception'],
    tools: ['Navigator\'s tools', 'Vehicles (water)'],
    languages: 0,
    equipment: 'Belaying pin (club), silk rope 50ft, lucky charm, common clothes, 10 GP',
    feature: 'Ship\'s Passage',
  },
  Soldier: {
    skills: ['Athletics', 'Intimidation'],
    tools: ['Gaming set (one)', 'Vehicles (land)'],
    languages: 0,
    equipment: 'Insignia of rank, trophy from fallen enemy, dice/cards, common clothes, 10 GP',
    feature: 'Military Rank',
  },
  Urchin: {
    skills: ['Sleight of Hand', 'Stealth'],
    tools: ['Disguise kit', 'Thieves\' tools'],
    languages: 0,
    equipment: 'Small knife, map of home city, pet mouse, parents\' token, common clothes, 10 GP',
    feature: 'City Secrets',
  },
};


// ─────────────────────────────────────────────
// LANGUAGES
// ─────────────────────────────────────────────

export const LANGUAGES = {
  standard: ['Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc'],
  exotic: ['Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon'],
  primordial_dialects: ['Aquan', 'Auran', 'Ignan', 'Terran'],
  script: {
    Common: 'Common', Dwarvish: 'Dwarvish', Elvish: 'Elvish', Giant: 'Dwarvish',
    Gnomish: 'Dwarvish', Goblin: 'Dwarvish', Halfling: 'Common', Orc: 'Dwarvish',
    Abyssal: 'Infernal', Celestial: 'Celestial', Draconic: 'Draconic',
    'Deep Speech': 'none', Infernal: 'Infernal', Primordial: 'Dwarvish',
    Sylvan: 'Elvish', Undercommon: 'Elvish',
  },
};


// ─────────────────────────────────────────────
// TOOL PROFICIENCIES
// ─────────────────────────────────────────────

export const TOOLS = {
  artisan: [
    'Alchemist\'s supplies', 'Brewer\'s supplies', 'Calligrapher\'s supplies',
    'Carpenter\'s tools', 'Cartographer\'s tools', 'Cobbler\'s tools',
    'Cook\'s utensils', 'Glassblower\'s tools', 'Jeweler\'s tools',
    'Leatherworker\'s tools', 'Mason\'s tools', 'Painter\'s supplies',
    'Potter\'s tools', 'Smith\'s tools', 'Tinker\'s tools', 'Weaver\'s tools', 'Woodcarver\'s tools',
  ],
  gaming: ['Dice set', 'Dragonchess set', 'Playing card set', 'Three-Dragon Ante set'],
  musical: [
    'Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Lute',
    'Lyre', 'Horn', 'Pan flute', 'Shawm', 'Viol',
  ],
  other: [
    'Disguise kit', 'Forgery kit', 'Herbalism kit',
    'Navigator\'s tools', 'Poisoner\'s kit', 'Thieves\' tools',
    'Vehicles (land)', 'Vehicles (water)',
  ],
};


// ─────────────────────────────────────────────
// LIFESTYLE EXPENSES
// ─────────────────────────────────────────────

export const LIFESTYLE_EXPENSES = {
  Wretched:     { costPerDay: 0, description: 'Homeless, exposed to elements and disease' },
  Squalid:      { costPerDay: 0.1, description: 'Leaking shelter, minimal food, dangerous area' },
  Poor:         { costPerDay: 0.2, description: 'Shared room, simple food, worn clothes' },
  Modest:       { costPerDay: 1, description: 'Simple room, adequate food, ordinary clothes' },
  Comfortable:  { costPerDay: 2, description: 'Private room, good food, decent clothes' },
  Wealthy:      { costPerDay: 4, description: 'Fine home, excellent food, servants' },
  Aristocratic: { costPerDay: 10, description: 'Mansion, feasts, finest clothes, social influence' },
};


// ─────────────────────────────────────────────
// SUBCLASS FEATURES (Combat-relevant only)
// ─────────────────────────────────────────────

export const SUBCLASS_COMBAT_FEATURES = {
  // BARBARIAN
  'Path of the Berserker': {
    3:  { name: 'Frenzy', description: 'While raging, bonus action melee attack each turn. 1 level exhaustion when rage ends.' },
    6:  { name: 'Mindless Rage', description: 'Can\'t be charmed or frightened while raging.' },
    10: { name: 'Intimidating Presence', description: 'Action: frighten one creature within 30ft. WIS save vs 8 + prof + CHA.' },
    14: { name: 'Retaliation', description: 'Reaction: melee attack against creature that damages you within 5ft.' },
  },
  'Path of the Totem Warrior': {
    3:  { name: 'Totem Spirit', options: {
      Bear: 'While raging, resistance to all damage except psychic',
      Eagle: 'While raging, opportunity attacks against you have disadvantage. Dash as bonus action.',
      Wolf: 'While raging, allies have advantage on melee attacks vs enemies within 5ft of you.',
    }},
    6:  { name: 'Aspect of the Beast', options: {
      Bear: 'Double carrying capacity, advantage on STR checks to push/pull/lift/break',
      Eagle: 'See 1 mile clearly, no dim light Perception disadvantage',
      Wolf: 'Track creatures at fast pace, stealth at normal pace',
    }},
    14: { name: 'Totemic Attunement', options: {
      Bear: 'While raging, enemies within 5ft have disadvantage on attacks vs targets other than you',
      Eagle: 'While raging, gain flying speed equal to walking speed',
      Wolf: 'While raging, bonus action to knock Large or smaller creature prone on melee hit',
    }},
  },

  // FIGHTER
  Champion: {
    3:  { name: 'Improved Critical', description: 'Critical hit on 19 or 20', critRange: 19 },
    7:  { name: 'Remarkable Athlete', description: 'Add half proficiency (round up) to STR/DEX/CON checks you\'re not proficient in. Running long jump +STR mod feet.' },
    10: { name: 'Additional Fighting Style', description: 'Choose a second fighting style.' },
    15: { name: 'Superior Critical', description: 'Critical hit on 18, 19, or 20', critRange: 18 },
    18: { name: 'Survivor', description: 'At start of turn, if below half HP: regain 5 + CON mod HP. Must have at least 1 HP.' },
  },
  'Battle Master': {
    3:  { name: 'Combat Superiority', description: '4 superiority dice (d8). Learn 3 maneuvers. Short rest recharge.',
      superiority: { dice: 4, dieSize: 8, maneuvers: 3 } },
    7:  { name: 'Know Your Enemy', description: 'Study creature for 1 min: learn if equal/superior/inferior in two characteristics.' },
    10: { name: 'Improved Combat Superiority', description: 'Superiority dice become d10.', dieSize: 10, maneuvers: 5 },
    15: { name: 'Relentless', description: 'Regain 1 superiority die on initiative if you have none.', maneuvers: 7 },
    18: { name: 'Superior Combat Superiority', description: 'Superiority dice become d12.', dieSize: 12 },
  },

  // ROGUE
  Thief: {
    3:  { name: 'Fast Hands', description: 'Cunning Action also: Sleight of Hand, use thieves\' tools, Use an Object.' },
    9:  { name: 'Supreme Sneak', description: 'Advantage on Stealth if you move no more than half speed.' },
    13: { name: 'Use Magic Device', description: 'Ignore class/race/level requirements on magic items.' },
    17: { name: 'Thief\'s Reflexes', description: 'Two turns in first round of combat (first at normal, second at initiative minus 10).' },
  },
  Assassin: {
    3:  { name: 'Assassinate', description: 'Advantage on attacks vs creatures that haven\'t acted yet. Hits on surprised creatures are automatic crits.' },
    9:  { name: 'Infiltration Expertise', description: 'Create false identity over 7 days.' },
    13: { name: 'Impostor', description: 'Mimic another person\'s speech, writing, and behavior.' },
    17: { name: 'Death Strike', description: 'On hit against surprised target, DC 8+DEX+prof CON save or double all damage.' },
  },

  // WIZARD
  'School of Evocation': {
    2:  { name: 'Sculpt Spells', description: 'Choose up to 1 + spell level creatures to auto-succeed on evocation save and take no damage.' },
    6:  { name: 'Potent Cantrip', description: 'Cantrip save: target takes half damage on success instead of none.' },
    10: { name: 'Empowered Evocation', description: 'Add INT mod to damage of wizard evocation spells.' },
    14: { name: 'Overchannel', description: 'Maximize damage of 5th-level or lower spell. After first use per long rest, 2d12 necrotic per spell level.' },
  },
  'School of Abjuration': {
    2:  { name: 'Arcane Ward', description: 'When casting abjuration spell, create ward with HP = 2 × wizard level + INT mod. Absorbs damage.' },
    6:  { name: 'Projected Ward', description: 'Reaction: ward absorbs damage for ally within 30ft.' },
    10: { name: 'Improved Abjuration', description: 'Add proficiency to ability checks for abjuration spells (Counterspell, Dispel Magic).' },
    14: { name: 'Spell Resistance', description: 'Advantage on saves vs spells. Resistance to spell damage.' },
  },

  // CLERIC
  'Life Domain': {
    1:  { name: 'Bonus Proficiency + Disciple of Life', description: 'Heavy armor proficiency. Healing spells heal extra 2 + spell level HP.' },
    2:  { name: 'Preserve Life', description: 'Channel Divinity: distribute up to 5 × cleric level HP among allies within 30ft (max half their max HP each).' },
    6:  { name: 'Blessed Healer', description: 'When you cast a healing spell on another creature, you also heal 2 + spell level HP.' },
    8:  { name: 'Divine Strike', description: '+1d8 radiant damage once per turn on weapon attacks. +2d8 at level 14.' },
    17: { name: 'Supreme Healing', description: 'Maximize healing dice instead of rolling.' },
  },

  // PALADIN
  'Oath of Devotion': {
    3:  { name: 'Sacred Weapon', description: 'Channel Divinity: add CHA mod to attack rolls for 1 minute. Weapon emits bright light 20ft.' },
    7:  { name: 'Aura of Devotion', description: 'You and allies within 10ft can\'t be charmed. 30ft at 18.' },
    15: { name: 'Purity of Spirit', description: 'Always under Protection from Evil and Good.' },
    20: { name: 'Holy Nimbus', description: '1 min: 30ft bright light. Enemies in light take 10 radiant at start of their turn. Advantage on saves vs fiend/undead spells.' },
  },

  // MONK
  'Way of the Open Hand': {
    3:  { name: 'Open Hand Technique', description: 'On Flurry hit: knock prone (DEX save), push 15ft (STR save), or prevent reactions.' },
    6:  { name: 'Wholeness of Body', description: 'Action: heal 3 × monk level HP. Long rest recharge.' },
    11: { name: 'Tranquility', description: 'Sanctuary spell effect at end of long rest (WIS save).' },
    17: { name: 'Quivering Palm', description: 'On hit, set vibrations. Action later: target makes CON save or drops to 0 HP.' },
  },

  // RANGER
  Hunter: {
    3:  { name: 'Hunter\'s Prey', options: {
      'Colossus Slayer': 'Once per turn, +1d8 damage to creatures below max HP',
      'Giant Killer': 'Reaction: attack Large+ creature that attacks you',
      'Horde Breaker': 'Once per turn, attack a second creature within 5ft of first target',
    }},
    7:  { name: 'Defensive Tactics', options: {
      'Escape the Horde': 'Opportunity attacks against you have disadvantage',
      'Multiattack Defense': 'After creature hits you, +4 AC vs its subsequent attacks this turn',
      'Steel Will': 'Advantage on saves vs being frightened',
    }},
    11: { name: 'Multiattack', options: {
      'Volley': 'Ranged attack against each creature within 10ft of a point in range',
      'Whirlwind Attack': 'Melee attack against each creature within 5ft',
    }},
    15: { name: 'Superior Hunter\'s Defense', options: {
      'Evasion': 'DEX save: success = 0 damage, fail = half',
      'Stand Against the Tide': 'Reaction: force missed melee attack to hit another creature',
      'Uncanny Dodge': 'Reaction: halve attack damage',
    }},
  },

  // WARLOCK
  'The Fiend': {
    1:  { name: 'Dark One\'s Blessing', description: 'When you reduce a hostile creature to 0 HP, gain temp HP = CHA mod + warlock level.' },
    6:  { name: 'Dark One\'s Own Luck', description: 'Add d10 to ability check or save. Short rest recharge.' },
    10: { name: 'Fiendish Resilience', description: 'After short/long rest, choose a damage type: gain resistance to it (not magical bludgeoning/piercing/slashing).' },
    14: { name: 'Hurl Through Hell', description: 'On hit, send target to lower planes. 10d10 psychic damage on return. Long rest recharge.' },
  },
};


// ─────────────────────────────────────────────
// BATTLE MASTER MANEUVERS
// ─────────────────────────────────────────────

export const BATTLE_MASTER_MANEUVERS = {
  'Commander\'s Strike':     { cost: 'bonus action + 1 die', description: 'Ally uses reaction to attack, adding superiority die to damage.' },
  'Disarming Attack':        { cost: '1 die', description: 'Add die to damage. Target STR save or drops held item.' },
  'Distracting Strike':      { cost: '1 die', description: 'Add die to damage. Next ally attack vs target has advantage.' },
  'Evasive Footwork':        { cost: '1 die', description: 'Add die to AC while moving.' },
  'Feinting Attack':         { cost: 'bonus action + 1 die', description: 'Advantage on next attack vs target. Add die to damage on hit.' },
  'Goading Attack':          { cost: '1 die', description: 'Add die to damage. Target WIS save or disadvantage on attacks vs others.' },
  'Lunging Attack':          { cost: '1 die', description: 'Add 5ft reach to melee attack. Add die to damage.' },
  'Maneuvering Attack':      { cost: '1 die', description: 'Add die to damage. Ally moves half speed without provoking OA from target.' },
  'Menacing Attack':         { cost: '1 die', description: 'Add die to damage. Target WIS save or frightened until end of next turn.' },
  'Parry':                   { cost: 'reaction + 1 die', description: 'Reduce melee damage by die + DEX mod.' },
  'Precision Attack':        { cost: '1 die', description: 'Add die to attack roll (after roll, before knowing hit/miss).' },
  'Pushing Attack':          { cost: '1 die', description: 'Add die to damage. Large or smaller target STR save or pushed 15ft.' },
  'Rally':                   { cost: 'bonus action + 1 die', description: 'Ally gains temp HP = die + CHA mod.' },
  'Riposte':                 { cost: 'reaction + 1 die', description: 'When creature misses you with melee, attack it. Add die to damage.' },
  'Sweeping Attack':         { cost: '1 die', description: 'On hit, deal die damage to another creature within 5ft (if attack roll hits its AC).' },
  'Trip Attack':             { cost: '1 die', description: 'Add die to damage. Large or smaller target STR save or knocked prone.' },
};
// ============================================================================
// D&D 5e RULES REGISTRY — PART 3 (REMAINING GAPS)
// ============================================================================
// Append this to the combined dnd5eRules.js after Part 2.
// Covers: Wild Shape, Pact Boons, Dragonborn Ancestry, Tiefling Infernal
// Legacy, Starting Equipment, remaining subclasses, ASI rules
// ============================================================================


// ─────────────────────────────────────────────
// WILD SHAPE (Druid)
// ─────────────────────────────────────────────

export const WILD_SHAPE = {
  uses: 2,  // per short/long rest
  duration: (druidLevel) => Math.floor(druidLevel / 2), // hours
  cost: 'action (bonus action at level 18+)',
  revert: 'Bonus action voluntarily, or when HP = 0, or when duration expires',
  rules: {
    hp: 'You assume the beast\'s HP. When you revert, you return to the HP you had before transforming. Excess damage carries over.',
    stats: 'You use the beast\'s STR, DEX, CON. You keep your INT, WIS, CHA.',
    proficiencies: 'You keep your skill/save proficiencies if the beast\'s are lower. You also gain the beast\'s proficiencies.',
    features: 'You keep racial/class features if the beast form can physically perform them. Can\'t cast spells (until Beast Spells at 18).',
    equipment: 'Equipment merges into new form (can\'t use it) or falls to the ground (your choice).',
    concentration: 'Transforming doesn\'t break concentration. You can maintain concentration in beast form.',
  },
  crLimits: {
    2:  { maxCR: '1/4', limitations: 'No swimming or flying speed', examples: ['Cat', 'Deer', 'Wolf'] },
    4:  { maxCR: '1/2', limitations: 'No flying speed', examples: ['Crocodile', 'Ape', 'Black Bear'] },
    8:  { maxCR: 1, limitations: 'None', examples: ['Giant Eagle', 'Giant Spider', 'Dire Wolf', 'Brown Bear'] },
  },
  moonDruid: {
    description: 'Circle of the Moon druids have enhanced Wild Shape',
    changes: {
      2:  { maxCR: 1, cost: 'bonus action', special: 'Can use Wild Shape as bonus action' },
      6:  { maxCR: (druidLevel) => Math.floor(druidLevel / 3), special: 'Beast attacks count as magical' },
      10: { special: 'Can expend 2 spell slots to Wild Shape into an elemental (CR 5): Air, Earth, Fire, Water' },
    },
  },
  commonBeastForms: {
    // CR 0
    'Cat':            { cr: 0, ac: 12, hp: 2, speed: '40 ft, climb 30 ft', size: 'Tiny' },
    'Frog':           { cr: 0, ac: 11, hp: 1, speed: '20 ft, swim 20 ft', size: 'Tiny' },
    'Hawk':           { cr: 0, ac: 13, hp: 1, speed: '10 ft, fly 60 ft', size: 'Tiny' },
    'Spider':         { cr: 0, ac: 12, hp: 1, speed: '20 ft, climb 20 ft', size: 'Tiny' },
    // CR 1/8
    'Blood Hawk':     { cr: '1/8', ac: 12, hp: 7, speed: '10 ft, fly 60 ft', size: 'Small' },
    'Flying Snake':   { cr: '1/8', ac: 14, hp: 5, speed: '30 ft, fly 60 ft, swim 30 ft', size: 'Tiny' },
    'Poisonous Snake': { cr: '1/8', ac: 13, hp: 2, speed: '30 ft, swim 30 ft', size: 'Tiny' },
    'Stirge':         { cr: '1/8', ac: 14, hp: 2, speed: '10 ft, fly 40 ft', size: 'Tiny' },
    // CR 1/4
    'Boar':           { cr: '1/4', ac: 11, hp: 11, speed: '40 ft', size: 'Medium' },
    'Constrictor Snake': { cr: '1/4', ac: 12, hp: 13, speed: '30 ft, swim 30 ft', size: 'Large' },
    'Draft Horse':    { cr: '1/4', ac: 10, hp: 19, speed: '40 ft', size: 'Large' },
    'Elk':            { cr: '1/4', ac: 10, hp: 13, speed: '50 ft', size: 'Large' },
    'Giant Frog':     { cr: '1/4', ac: 11, hp: 18, speed: '30 ft, swim 30 ft', size: 'Medium' },
    'Giant Wolf Spider': { cr: '1/4', ac: 13, hp: 11, speed: '40 ft, climb 40 ft', size: 'Medium' },
    'Panther':        { cr: '1/4', ac: 12, hp: 13, speed: '50 ft, climb 40 ft', size: 'Medium' },
    'Wolf':           { cr: '1/4', ac: 13, hp: 11, speed: '40 ft', size: 'Medium' },
    // CR 1/2
    'Ape':            { cr: '1/2', ac: 12, hp: 19, speed: '30 ft, climb 30 ft', size: 'Medium' },
    'Black Bear':     { cr: '1/2', ac: 11, hp: 19, speed: '40 ft, climb 30 ft', size: 'Medium' },
    'Crocodile':      { cr: '1/2', ac: 12, hp: 19, speed: '20 ft, swim 30 ft', size: 'Large' },
    'Giant Goat':     { cr: '1/2', ac: 11, hp: 19, speed: '40 ft', size: 'Large' },
    'Giant Wasp':     { cr: '1/2', ac: 12, hp: 13, speed: '10 ft, fly 50 ft', size: 'Medium' },
    'Warhorse':       { cr: '1/2', ac: 11, hp: 19, speed: '60 ft', size: 'Large' },
    // CR 1
    'Brown Bear':     { cr: 1, ac: 11, hp: 34, speed: '40 ft, climb 30 ft', size: 'Large' },
    'Dire Wolf':      { cr: 1, ac: 14, hp: 37, speed: '50 ft', size: 'Large' },
    'Giant Eagle':    { cr: 1, ac: 13, hp: 26, speed: '10 ft, fly 80 ft', size: 'Large' },
    'Giant Hyena':    { cr: 1, ac: 12, hp: 45, speed: '50 ft', size: 'Large' },
    'Giant Spider':   { cr: 1, ac: 14, hp: 26, speed: '30 ft, climb 30 ft', size: 'Large' },
    'Lion':           { cr: 1, ac: 12, hp: 26, speed: '50 ft', size: 'Large' },
    'Tiger':          { cr: 1, ac: 12, hp: 37, speed: '40 ft', size: 'Large' },
    // CR 2
    'Giant Boar':     { cr: 2, ac: 12, hp: 42, speed: '40 ft', size: 'Large' },
    'Giant Constrictor Snake': { cr: 2, ac: 12, hp: 60, speed: '30 ft, swim 30 ft', size: 'Huge' },
    'Giant Elk':      { cr: 2, ac: 14, hp: 42, speed: '60 ft', size: 'Huge' },
    'Polar Bear':     { cr: 2, ac: 12, hp: 42, speed: '40 ft, swim 30 ft', size: 'Large' },
    'Rhinoceros':     { cr: 2, ac: 11, hp: 45, speed: '40 ft', size: 'Large' },
    'Saber-Toothed Tiger': { cr: 2, ac: 12, hp: 52, speed: '40 ft', size: 'Large' },
    // CR 3+ (Moon Druid only)
    'Giant Scorpion':  { cr: 3, ac: 15, hp: 52, speed: '40 ft', size: 'Large' },
    'Killer Whale':    { cr: 3, ac: 12, hp: 90, speed: 'swim 60 ft', size: 'Huge' },
    'Elephant':        { cr: 4, ac: 12, hp: 76, speed: '40 ft', size: 'Huge' },
    'Giant Crocodile':  { cr: 5, ac: 14, hp: 85, speed: '30 ft, swim 50 ft', size: 'Huge' },
    'Giant Shark':      { cr: 5, ac: 13, hp: 126, speed: 'swim 50 ft', size: 'Huge' },
    'Triceratops':      { cr: 5, ac: 13, hp: 95, speed: '50 ft', size: 'Huge' },
    'Mammoth':          { cr: 6, ac: 13, hp: 126, speed: '40 ft', size: 'Huge' },
  },
  elementalForms: {
    'Air Elemental':   { cr: 5, ac: 15, hp: 90, speed: 'fly 90 ft (hover)', size: 'Large', resistances: ['lightning', 'thunder', 'bludgeoning/piercing/slashing (nonmagical)'], immunities: ['poison'], conditionImmunities: ['exhaustion', 'grappled', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'unconscious'] },
    'Earth Elemental': { cr: 5, ac: 17, hp: 126, speed: '30 ft, burrow 30 ft', size: 'Large', resistances: ['bludgeoning/piercing/slashing (nonmagical)'], immunities: ['poison'], vulnerabilities: ['thunder'] },
    'Fire Elemental':  { cr: 5, ac: 13, hp: 102, speed: '50 ft', size: 'Large', resistances: ['bludgeoning/piercing/slashing (nonmagical)'], immunities: ['fire', 'poison'], vulnerabilities: ['cold'] },
    'Water Elemental': { cr: 5, ac: 14, hp: 114, speed: '30 ft, swim 90 ft', size: 'Large', resistances: ['acid', 'bludgeoning/piercing/slashing (nonmagical)'], immunities: ['poison'] },
  },
};


// ─────────────────────────────────────────────
// WARLOCK PACT BOONS
// ─────────────────────────────────────────────

export const PACT_BOONS = {
  'Pact of the Blade': {
    level: 3,
    description: 'Create a magical melee weapon in your hand as an action. You\'re proficient with it. It counts as magical. You can transform a magic weapon into your pact weapon via a 1-hour ritual.',
    mechanics: {
      createWeapon: 'Action: create any melee weapon form. It disappears if 5+ ft away for 1 min or you dismiss/create another.',
      proficiency: true,
      magical: true,
      bondMagicWeapon: '1-hour ritual to bond a magic weapon. Can\'t bond sentient or artifact weapons.',
    },
    invocations: ['Thirsting Blade (Extra Attack)', 'Lifedrinker (+CHA necrotic on pact weapon hits)'],
  },
  'Pact of the Chain': {
    level: 3,
    description: 'Learn Find Familiar spell. Cast as ritual. Your familiar can be an imp, pseudodragon, quasit, or sprite in addition to normal forms.',
    mechanics: {
      specialForms: ['Imp', 'Pseudodragon', 'Quasit', 'Sprite'],
      attackAction: 'You can forgo one attack to let your familiar attack with its reaction.',
    },
    invocations: ['Voice of the Chain Master (telepathy + senses through familiar at any distance)'],
  },
  'Pact of the Tome': {
    level: 3,
    description: 'Receive a Book of Shadows. Choose 3 cantrips from any class\'s spell list. They count as warlock cantrips and don\'t count against cantrips known.',
    mechanics: {
      extraCantrips: 3,
      source: 'Any class spell list',
      countAsWarlock: true,
    },
    invocations: ['Book of Ancient Secrets (copy ritual spells from any class into your book)'],
  },
};


// ─────────────────────────────────────────────
// DRAGONBORN ANCESTRY
// ─────────────────────────────────────────────

export const DRAGONBORN_ANCESTRY = {
  Black:    { damageType: 'acid',      breathWeapon: { shape: '5 × 30 ft line', save: 'DEX' } },
  Blue:     { damageType: 'lightning', breathWeapon: { shape: '5 × 30 ft line', save: 'DEX' } },
  Brass:    { damageType: 'fire',      breathWeapon: { shape: '5 × 30 ft line', save: 'DEX' } },
  Bronze:   { damageType: 'lightning', breathWeapon: { shape: '5 × 30 ft line', save: 'DEX' } },
  Copper:   { damageType: 'acid',      breathWeapon: { shape: '5 × 30 ft line', save: 'DEX' } },
  Gold:     { damageType: 'fire',      breathWeapon: { shape: '15 ft cone', save: 'DEX' } },
  Green:    { damageType: 'poison',    breathWeapon: { shape: '15 ft cone', save: 'CON' } },
  Red:      { damageType: 'fire',      breathWeapon: { shape: '15 ft cone', save: 'DEX' } },
  Silver:   { damageType: 'cold',      breathWeapon: { shape: '15 ft cone', save: 'CON' } },
  White:    { damageType: 'cold',      breathWeapon: { shape: '15 ft cone', save: 'CON' } },
};

export const BREATH_WEAPON = {
  damage: {
    1:  '2d6',
    6:  '3d6',
    11: '4d6',
    16: '5d6',
  },
  getDamage: (level) => {
    if (level >= 16) return '5d6';
    if (level >= 11) return '4d6';
    if (level >= 6) return '3d6';
    return '2d6';
  },
  saveDC: (conMod, profBonus) => 8 + conMod + profBonus,
  uses: 1, // per short or long rest
  cost: 'action',
  halfDamageOnSave: true,
  description: 'Action: all creatures in area make save. Full damage on fail, half on success. Recharges on short/long rest.',
};


// ─────────────────────────────────────────────
// TIEFLING INFERNAL LEGACY
// ─────────────────────────────────────────────

export const TIEFLING_INFERNAL_LEGACY = {
  1:  { cantrip: 'Thaumaturgy', description: 'Know the Thaumaturgy cantrip' },
  3:  { spell: 'Hellish Rebuke', level: 2, uses: 1, recharge: 'long rest', description: 'Cast Hellish Rebuke as 2nd-level spell once per long rest' },
  5:  { spell: 'Darkness', uses: 1, recharge: 'long rest', description: 'Cast Darkness once per long rest' },
  spellcastingAbility: 'cha',
};


// ─────────────────────────────────────────────
// HALF-ELF VERSATILITY
// ─────────────────────────────────────────────

export const HALF_ELF_RULES = {
  abilityBonuses: {
    fixed: { cha: 2 },
    choice: { count: 2, value: 1, from: ['str', 'dex', 'con', 'int', 'wis'] }, // +1 to two abilities of choice (not CHA)
  },
  skillVersatility: 2, // proficiency in 2 skills of choice
};


// ─────────────────────────────────────────────
// STARTING EQUIPMENT BY CLASS
// ─────────────────────────────────────────────

export const STARTING_EQUIPMENT = {
  Barbarian: {
    choices: [
      { option1: 'Greataxe', option2: 'Any martial melee weapon' },
      { option1: '2 Handaxes', option2: 'Any simple weapon' },
    ],
    fixed: ['Explorer\'s pack', '4 Javelins'],
    startingGold: { dice: '2d4', multiplier: 10 }, // alternative: 2d4 × 10 gp
  },
  Bard: {
    choices: [
      { option1: 'Rapier', option2: 'Longsword', option3: 'Any simple weapon' },
      { option1: 'Diplomat\'s pack', option2: 'Entertainer\'s pack' },
      { option1: 'Lute', option2: 'Any musical instrument' },
    ],
    fixed: ['Leather armor', 'Dagger'],
    startingGold: { dice: '5d4', multiplier: 10 },
  },
  Cleric: {
    choices: [
      { option1: 'Mace', option2: 'Warhammer (if proficient)' },
      { option1: 'Scale mail', option2: 'Leather armor', option3: 'Chain mail (if proficient)' },
      { option1: 'Light crossbow + 20 bolts', option2: 'Any simple weapon' },
      { option1: 'Priest\'s pack', option2: 'Explorer\'s pack' },
    ],
    fixed: ['Shield', 'Holy symbol'],
    startingGold: { dice: '5d4', multiplier: 10 },
  },
  Druid: {
    choices: [
      { option1: 'Wooden shield', option2: 'Any simple weapon' },
      { option1: 'Scimitar', option2: 'Any simple melee weapon' },
    ],
    fixed: ['Leather armor', 'Explorer\'s pack', 'Druidic focus'],
    startingGold: { dice: '2d4', multiplier: 10 },
  },
  Fighter: {
    choices: [
      { option1: 'Chain mail', option2: 'Leather armor + longbow + 20 arrows' },
      { option1: 'Martial weapon + shield', option2: 'Two martial weapons' },
      { option1: 'Light crossbow + 20 bolts', option2: '2 Handaxes' },
      { option1: 'Dungeoneer\'s pack', option2: 'Explorer\'s pack' },
    ],
    fixed: [],
    startingGold: { dice: '5d4', multiplier: 10 },
  },
  Monk: {
    choices: [
      { option1: 'Shortsword', option2: 'Any simple weapon' },
      { option1: 'Dungeoneer\'s pack', option2: 'Explorer\'s pack' },
    ],
    fixed: ['10 Darts'],
    startingGold: { dice: '5d4', multiplier: 1 },
  },
  Paladin: {
    choices: [
      { option1: 'Martial weapon + shield', option2: 'Two martial weapons' },
      { option1: '5 Javelins', option2: 'Any simple melee weapon' },
      { option1: 'Priest\'s pack', option2: 'Explorer\'s pack' },
    ],
    fixed: ['Chain mail', 'Holy symbol'],
    startingGold: { dice: '5d4', multiplier: 10 },
  },
  Ranger: {
    choices: [
      { option1: 'Scale mail', option2: 'Leather armor' },
      { option1: '2 Shortswords', option2: '2 Simple melee weapons' },
      { option1: 'Dungeoneer\'s pack', option2: 'Explorer\'s pack' },
    ],
    fixed: ['Longbow', '20 Arrows'],
    startingGold: { dice: '5d4', multiplier: 10 },
  },
  Rogue: {
    choices: [
      { option1: 'Rapier', option2: 'Shortsword' },
      { option1: 'Shortbow + 20 arrows', option2: 'Shortsword' },
      { option1: 'Burglar\'s pack', option2: 'Dungeoneer\'s pack', option3: 'Explorer\'s pack' },
    ],
    fixed: ['Leather armor', '2 Daggers', 'Thieves\' tools'],
    startingGold: { dice: '4d4', multiplier: 10 },
  },
  Sorcerer: {
    choices: [
      { option1: 'Light crossbow + 20 bolts', option2: 'Any simple weapon' },
      { option1: 'Component pouch', option2: 'Arcane focus' },
      { option1: 'Dungeoneer\'s pack', option2: 'Explorer\'s pack' },
    ],
    fixed: ['2 Daggers'],
    startingGold: { dice: '3d4', multiplier: 10 },
  },
  Warlock: {
    choices: [
      { option1: 'Light crossbow + 20 bolts', option2: 'Any simple weapon' },
      { option1: 'Component pouch', option2: 'Arcane focus' },
      { option1: 'Scholar\'s pack', option2: 'Dungeoneer\'s pack' },
    ],
    fixed: ['Leather armor', 'Any simple weapon', '2 Daggers'],
    startingGold: { dice: '4d4', multiplier: 10 },
  },
  Wizard: {
    choices: [
      { option1: 'Quarterstaff', option2: 'Dagger' },
      { option1: 'Component pouch', option2: 'Arcane focus' },
      { option1: 'Scholar\'s pack', option2: 'Explorer\'s pack' },
    ],
    fixed: ['Spellbook'],
    startingGold: { dice: '4d4', multiplier: 10 },
  },
};


// ─────────────────────────────────────────────
// EQUIPMENT PACKS
// ─────────────────────────────────────────────

export const EQUIPMENT_PACKS = {
  "Burglar's pack": {
    cost: 16,
    contents: ['Backpack', 'Bag of 1000 ball bearings', '10 ft string', 'Bell', '5 Candles', 'Crowbar', 'Hammer', '10 Pitons', 'Hooded lantern', '2 Flasks of oil', '5 Days rations', 'Tinderbox', 'Waterskin', '50 ft hempen rope'],
  },
  "Diplomat's pack": {
    cost: 39,
    contents: ['Chest', '2 Cases for maps/scrolls', 'Fine clothes', 'Ink bottle', 'Ink pen', 'Lamp', '2 Flasks of oil', '5 Sheets of paper', 'Perfume vial', 'Sealing wax', 'Soap'],
  },
  "Dungeoneer's pack": {
    cost: 12,
    contents: ['Backpack', 'Crowbar', 'Hammer', '10 Pitons', '10 Torches', 'Tinderbox', '10 Days rations', 'Waterskin', '50 ft hempen rope'],
  },
  "Entertainer's pack": {
    cost: 40,
    contents: ['Backpack', 'Bedroll', '2 Costumes', '5 Candles', '5 Days rations', 'Waterskin', 'Disguise kit'],
  },
  "Explorer's pack": {
    cost: 10,
    contents: ['Backpack', 'Bedroll', 'Mess kit', 'Tinderbox', '10 Torches', '10 Days rations', 'Waterskin', '50 ft hempen rope'],
  },
  "Priest's pack": {
    cost: 19,
    contents: ['Backpack', 'Blanket', '10 Candles', 'Tinderbox', 'Alms box', '2 Blocks of incense', 'Censer', 'Vestments', '2 Days rations', 'Waterskin'],
  },
  "Scholar's pack": {
    cost: 40,
    contents: ['Backpack', 'Book of lore', 'Ink bottle', 'Ink pen', '10 Sheets of parchment', 'Little bag of sand', 'Small knife'],
  },
};


// ─────────────────────────────────────────────
// REMAINING SUBCLASS FEATURES
// ─────────────────────────────────────────────

export const ADDITIONAL_SUBCLASS_FEATURES = {
  // BARBARIAN — Path of the Berserker and Totem Warrior already in Part 2
  // No third PHB barbarian subclass (Zealot etc. are from Xanathar's)

  // BARD
  'College of Lore': {
    3:  { name: 'Bonus Proficiencies', description: '3 additional skill proficiencies of your choice.' },
    3.1: { name: 'Cutting Words', description: 'Reaction: when creature within 60ft makes attack, check, or damage roll, spend Bardic Inspiration die. Subtract the roll from their total.' },
    6:  { name: 'Additional Magical Secrets', description: 'Learn 2 spells from any class at level 6 (in addition to level 10 Magical Secrets).' },
    14: { name: 'Peerless Skill', description: 'Spend Bardic Inspiration die on your own ability checks.' },
  },
  'College of Valor': {
    3:  { name: 'Bonus Proficiencies', description: 'Medium armor, shields, martial weapons.' },
    3.1: { name: 'Combat Inspiration', description: 'Bardic Inspiration die can be added to weapon damage or AC (reaction vs one attack).' },
    6:  { name: 'Extra Attack', description: 'Attack twice when taking the Attack action.' },
    14: { name: 'Battle Magic', description: 'When you cast a bard spell as an action, bonus action weapon attack.' },
  },

  // CLERIC — Life Domain already in Part 2
  'Light Domain': {
    1:  { name: 'Warding Flare', description: 'Reaction: impose disadvantage on attack roll against you. Uses = WIS mod/long rest.' },
    2:  { name: 'Radiance of the Dawn', description: 'Channel Divinity: dispel magical darkness within 30ft. Hostiles make CON save: 2d10+cleric level radiant damage (half on save).' },
    6:  { name: 'Improved Flare', description: 'Warding Flare can protect allies within 30ft, not just you.' },
    8:  { name: 'Potent Spellcasting', description: 'Add WIS mod to cleric cantrip damage.' },
    17: { name: 'Corona of Light', description: 'Action: 60ft bright light, 30ft dim. Enemies in bright light have disadvantage on saves vs fire/radiant spells.' },
  },
  'Tempest Domain': {
    1:  { name: 'Wrath of the Storm', description: 'Reaction when hit by creature within 5ft: target makes DEX save, 2d8 lightning or thunder damage (half on save). Uses = WIS mod/long rest.' },
    2:  { name: 'Destructive Wrath', description: 'Channel Divinity: maximize lightning or thunder damage instead of rolling.' },
    6:  { name: 'Thunderbolt Strike', description: 'When you deal lightning damage to Large or smaller creature, push it 10ft.' },
    8:  { name: 'Divine Strike', description: '+1d8 thunder damage once per turn on weapon attacks. +2d8 at 14.' },
    17: { name: 'Stormborn', description: 'Flying speed equal to walking speed outdoors when not underground.' },
  },

  // DRUID — Circle of the Moon is embedded in WILD_SHAPE above
  'Circle of the Land': {
    2:  { name: 'Natural Recovery', description: 'During short rest, recover spell slot levels totaling up to half druid level (no 6th+). Like Arcane Recovery.' },
    3:  { name: 'Circle Spells', description: 'Bonus prepared spells based on chosen terrain (Arctic, Coast, Desert, Forest, Grassland, Mountain, Swamp, Underdark).' },
    6:  { name: 'Land\'s Stride', description: 'Moving through nonmagical difficult terrain costs no extra movement. Advantage on saves vs magical plant effects.' },
    10: { name: 'Nature\'s Ward', description: 'Immune to poison, disease. Can\'t be charmed or frightened by elementals or fey.' },
    14: { name: 'Nature\'s Sanctuary', description: 'Beasts and plants must make WIS save to attack you. On fail, must choose new target.' },
  },

  // FIGHTER — Champion and Battle Master already in Part 2
  'Eldritch Knight': {
    3:  { name: 'Spellcasting', description: 'Learn wizard spells. Mostly abjuration and evocation. INT-based. Use Fighter 1/3 caster table for slots.' },
    3.1: { name: 'Weapon Bond', description: 'Bond with weapon over 1-hour ritual. Can\'t be disarmed. Summon to hand as bonus action.' },
    7:  { name: 'War Magic', description: 'When you cast a cantrip, bonus action weapon attack.' },
    10: { name: 'Eldritch Strike', description: 'When you hit with weapon, target has disadvantage on next save vs your spells before end of your next turn.' },
    15: { name: 'Arcane Charge', description: 'When you Action Surge, teleport up to 30ft to an unoccupied space.' },
    18: { name: 'Improved War Magic', description: 'When you cast a spell (not just cantrip), bonus action weapon attack.' },
  },

  // MONK — Way of the Open Hand already in Part 2
  'Way of Shadow': {
    3:  { name: 'Shadow Arts', description: 'Spend 2 ki: cast Darkness, Darkvision, Pass without Trace, or Silence without components. Minor Illusion cantrip for free.' },
    6:  { name: 'Shadow Step', description: 'In dim light or darkness: bonus action teleport 60ft to another dim/dark space. Advantage on first melee attack after.' },
    11: { name: 'Cloak of Shadows', description: 'In dim light or darkness: action to become invisible until you attack, cast, or enter bright light.' },
    17: { name: 'Opportunist', description: 'Reaction: melee attack vs creature within 5ft that is hit by another creature\'s attack.' },
  },
  'Way of the Four Elements': {
    3:  { name: 'Disciple of the Elements', description: 'Learn elemental disciplines. Spend ki to cast spells. Learn more at 6, 11, 17.' },
    disciplines: {
      'Fangs of the Fire Snake': { ki: 1, description: 'Unarmed reach becomes 10ft this turn. Deal fire damage. Spend 1 ki for +1d10 fire.' },
      'Fist of Four Thunders': { ki: 2, description: 'Cast Thunderwave.' },
      'Fist of Unbroken Air': { ki: 2, description: 'Ranged 30ft: 3d10 bludgeoning, STR save or pushed 20ft and knocked prone. +1d10 per extra ki.' },
      'Rush of the Gale Spirits': { ki: 2, description: 'Cast Gust of Wind.' },
      'Shape the Flowing River': { ki: 1, description: 'Control water/ice in 30ft cube.' },
      'Sweeping Cinder Strike': { ki: 2, description: 'Cast Burning Hands.' },
      'Water Whip': { ki: 2, description: 'Ranged 30ft: 3d10 bludgeoning, STR save or pulled 25ft or knocked prone. +1d10 per extra ki.' },
    },
  },

  // PALADIN — Oath of Devotion already in Part 2
  'Oath of the Ancients': {
    3:  { name: 'Nature\'s Wrath', description: 'Channel Divinity: restrain creature within 10ft. STR/DEX save each turn to escape.' },
    3.1: { name: 'Turn the Faithless', description: 'Channel Divinity: turn fey and fiends within 30ft. WIS save or turned for 1 minute.' },
    7:  { name: 'Aura of Warding', description: 'You and allies within 10ft have resistance to spell damage. 30ft at 18.' },
    15: { name: 'Undying Sentinel', description: 'Drop to 1 HP instead of 0 once per long rest. No old age drawbacks.' },
    20: { name: 'Elder Champion', description: '1 min: regain 10 HP/turn start, paladin spells as bonus action, enemies within 10ft have disadvantage on saves vs your spells.' },
  },
  'Oath of Vengeance': {
    3:  { name: 'Abjure Enemy', description: 'Channel Divinity: one creature within 60ft makes WIS save or is frightened and speed = 0. Fiends/undead have disadvantage.' },
    3.1: { name: 'Vow of Enmity', description: 'Channel Divinity: bonus action, advantage on attacks vs one creature within 10ft for 1 minute.' },
    7:  { name: 'Relentless Avenger', description: 'When you hit with opportunity attack, move up to half your speed immediately after (no OA provoked).' },
    15: { name: 'Soul of Vengeance', description: 'When Vow of Enmity target attacks, reaction melee attack against it.' },
    20: { name: 'Avenging Angel', description: '1 hour: wings (60ft fly), 30ft aura of menace (WIS save or frightened for 1 min).' },
  },

  // RANGER — Hunter already in Part 2
  'Beast Master': {
    3:  { name: 'Ranger\'s Companion', description: 'Gain a beast companion (CR 1/4 or lower, Medium or smaller). HP = max(normal, 4 × ranger level). Add proficiency to AC, attacks, damage, saves, skills. Obeys commands. Takes turn on your initiative.' },
    7:  { name: 'Exceptional Training', description: 'When companion doesn\'t attack, command it to Dash/Disengage/Dodge/Help as bonus action. Its attacks count as magical.' },
    11: { name: 'Bestial Fury', description: 'Companion makes two attacks when you command Attack.' },
    15: { name: 'Share Spells', description: 'When you cast a spell targeting yourself, companion also benefits if within 30ft.' },
  },

  // ROGUE — Thief and Assassin already in Part 2
  'Arcane Trickster': {
    3:  { name: 'Spellcasting', description: 'Learn wizard spells. Mostly enchantment and illusion. INT-based. Use Rogue 1/3 caster table.' },
    3.1: { name: 'Mage Hand Legerdemain', description: 'Mage Hand is invisible. Can stow/retrieve objects, pick locks, disarm traps at range. Bonus action to control.' },
    9:  { name: 'Magical Ambush', description: 'If hidden when casting spell, target has disadvantage on save.' },
    13: { name: 'Versatile Trickster', description: 'Bonus action: Mage Hand gives you advantage on attack against creature within 5ft of the hand.' },
    17: { name: 'Spell Thief', description: 'Reaction when target casts spell at you: save DC 8+INT+prof. On success, negate the spell and you can cast it once within 8 hours.' },
  },

  // SORCERER
  'Draconic Bloodline': {
    1:  { name: 'Dragon Ancestor', description: 'Choose dragon type. Learn Draconic language. Double proficiency bonus on CHA checks with dragons.' },
    1.1: { name: 'Draconic Resilience', description: 'HP max +1 per sorcerer level. Unarmored AC = 13 + DEX mod.' },
    6:  { name: 'Elemental Affinity', description: 'Add CHA mod to damage of spells matching your dragon type. Spend 1 sorcery point: resistance to that type for 1 hour.' },
    14: { name: 'Dragon Wings', description: 'Bonus action: sprout wings. Fly speed = walking speed. Can\'t use in medium/heavy armor.' },
    18: { name: 'Draconic Presence', description: '5 sorcery points + action: 60ft aura of awe/fear. WIS save or charmed/frightened for 1 min.' },
  },
  'Wild Magic': {
    1:  { name: 'Wild Magic Surge', description: 'After casting 1st+ level sorcerer spell, DM can have you roll d20. On 1, roll on Wild Magic Surge table.' },
    1.1: { name: 'Tides of Chaos', description: 'Advantage on one attack, check, or save. Recharges on long rest OR when DM triggers a Wild Magic Surge.' },
    6:  { name: 'Bend Luck', description: '2 sorcery points + reaction: add or subtract 1d4 to another creature\'s attack, check, or save.' },
    14: { name: 'Controlled Chaos', description: 'Roll twice on Wild Magic Surge table, choose either result.' },
    18: { name: 'Spell Bombardment', description: 'When you roll max on a spell damage die, roll one additional die of that type.' },
  },

  // WARLOCK — The Fiend already in Part 2
  'The Great Old One': {
    1:  { name: 'Awakened Mind', description: 'Telepathy with any creature within 30ft. Don\'t need to share a language.' },
    6:  { name: 'Entropic Ward', description: 'Reaction: impose disadvantage on attack roll against you. If it misses, advantage on your next attack vs them.' },
    10: { name: 'Thought Shield', description: 'Resistance to psychic damage. Your thoughts can\'t be read telepathically.' },
    14: { name: 'Create Thrall', description: 'Touch incapacitated humanoid: charmed indefinitely. Telepathy at any distance on same plane.' },
  },
  'The Archfey': {
    1:  { name: 'Fey Presence', description: 'Action: creatures in 10ft cube make WIS save or charmed/frightened until end of next turn. Short rest recharge.' },
    6:  { name: 'Misty Escape', description: 'Reaction when taking damage: turn invisible and teleport 60ft. Invisible until start of next turn.' },
    10: { name: 'Beguiling Defenses', description: 'Immune to being charmed. Reaction: reflect charm back (WIS save or charmed for 1 minute).' },
    14: { name: 'Dark Delirium', description: 'Action: creature within 60ft makes WIS save or charmed/frightened for 1 minute (sees illusory horror). Short rest recharge.' },
  },

  // WIZARD — Evocation and Abjuration already in Part 2
  'School of Divination': {
    2:  { name: 'Portent', description: 'After long rest, roll 2d20 and record. Replace any attack, save, or check roll with a portent die before rolling.' },
    6:  { name: 'Expert Divination', description: 'When you cast divination spell of 2nd+, regain a spell slot of lower level (max 5th).' },
    10: { name: 'The Third Eye', description: 'Action: gain darkvision 60ft, see Ethereal Plane 60ft, read any language, or see invisible within 10ft. Until concentration ends.' },
    14: { name: 'Greater Portent', description: 'Roll 3d20 for portent instead of 2.' },
  },
  'School of Conjuration': {
    2:  { name: 'Minor Conjuration', description: 'Action: conjure a nonmagical object up to 3ft per side, 10lbs, worth 10gp max. Lasts 1 hour.' },
    6:  { name: 'Benign Transposition', description: 'Teleport 30ft to unoccupied space, or swap with willing Small/Medium creature. Recharges on long rest or conjuration spell cast.' },
    10: { name: 'Focused Conjuration', description: 'Concentration on conjuration spells can\'t be broken by taking damage.' },
    14: { name: 'Durable Summons', description: 'Creatures you conjure have 30 temporary HP.' },
  },
  'School of Enchantment': {
    2:  { name: 'Hypnotic Gaze', description: 'Action: charm creature within 5ft (WIS save). Incapacitated and speed 0 while you maintain (action each turn, within 5ft).' },
    6:  { name: 'Instinctive Charm', description: 'Reaction when attacked by creature within 30ft: WIS save or it targets nearest creature instead. Once per long rest.' },
    10: { name: 'Split Enchantment', description: 'Single-target enchantment spells can target two creatures.' },
    14: { name: 'Alter Memories', description: 'When you charm a creature, erase its memory of being charmed. CHA check vs INT: erase up to 1 + CHA mod hours of memory.' },
  },
  'School of Illusion': {
    2:  { name: 'Improved Minor Illusion', description: 'Minor Illusion can create both sound AND image simultaneously.' },
    6:  { name: 'Malleable Illusions', description: 'Action: change the nature of an ongoing illusion spell.' },
    10: { name: 'Illusory Self', description: 'Reaction: create duplicate when attacked. Attack auto-misses. Short rest recharge.' },
    14: { name: 'Illusory Reality', description: 'Bonus action: make one nonliving, nonmagical object in an illusion spell REAL for 1 minute.' },
  },
  'School of Necromancy': {
    2:  { name: 'Grim Harvest', description: 'When you kill with a spell (1st+), regain HP = 2 × spell level (3 × for necromancy). Not on constructs/undead.' },
    6:  { name: 'Undead Thralls', description: 'Animate Dead: create one extra undead. Your undead get +wizard level HP and add proficiency to damage.' },
    10: { name: 'Inured to Undeath', description: 'Resistance to necrotic damage. HP max can\'t be reduced.' },
    14: { name: 'Command Undead', description: 'Action: one undead makes CHA save or is permanently controlled by you. Intelligent undead (INT 8+) save with advantage and can repeat.' },
  },
  'School of Transmutation': {
    2:  { name: 'Minor Alchemy', description: '10 minutes: transform up to 1 cubic foot of wood/stone/iron/copper/silver to another of those materials. Lasts 1 hour.' },
    6:  { name: 'Transmuter\'s Stone', description: 'Over 8 hours, create stone with one benefit: darkvision 60ft, +10 speed, CON save proficiency, or resistance to one elemental type.' },
    10: { name: 'Shapechanger', description: 'Add Polymorph to spellbook. Can cast on self without spell slot to become a beast (CR = level or lower).' },
    14: { name: 'Master Transmuter', description: 'Destroy transmuter\'s stone for one: transmute nonmagical object (up to 5ft cube), remove all curses/diseases/poisons, cast Raise Dead (no component), or reduce apparent age by 3d10 years.' },
  },
};


// ─────────────────────────────────────────────
// THIRD-CASTER SPELL SLOTS (Eldritch Knight / Arcane Trickster)
// ─────────────────────────────────────────────

export const THIRD_CASTER_SLOTS = {
  3:  [2],
  4:  [3],
  7:  [4, 2],
  8:  [4, 2],  // added for consistency
  10: [4, 3],
  13: [4, 3, 2],
  16: [4, 3, 3],
  19: [4, 3, 3, 1],
};

export function thirdCasterSlots(classLevel) {
  if (classLevel < 3) return [];
  const keys = Object.keys(THIRD_CASTER_SLOTS).map(Number).sort((a, b) => a - b);
  let bestKey = keys[0];
  for (const k of keys) {
    if (k <= classLevel) bestKey = k;
  }
  return THIRD_CASTER_SLOTS[bestKey] || [];
}


// ─────────────────────────────────────────────
// MULTICLASS SPELL SLOT TABLE
// ─────────────────────────────────────────────

export function multiclassSpellSlots(totalCasterLevel) {
  // totalCasterLevel = sum of: full caster levels + half caster levels/2 + third caster levels/3
  // Round down. Use the full caster table with this combined level.
  const level = Math.max(1, Math.min(20, Math.floor(totalCasterLevel)));
  return FULL_CASTER_SLOTS[level] || [];
}

export function calculateMulticlassCasterLevel(classes) {
  // classes = [{ name: 'Wizard', level: 5 }, { name: 'Fighter', level: 3, subclass: 'Eldritch Knight' }]
  let total = 0;
  for (const cls of classes) {
    const type = CASTER_TYPE[cls.name];
    if (type === 'full') total += cls.level;
    else if (type === 'half') total += Math.floor(cls.level / 2);
    else if (type === 'none') {
      // Check for third-caster subclasses
      if (cls.subclass === 'Eldritch Knight' || cls.subclass === 'Arcane Trickster') {
        total += Math.floor(cls.level / 3);
      }
    }
    // Warlock pact magic is separate — doesn't add to multiclass caster level
  }
  return total;
}


// ─────────────────────────────────────────────
// ASI RULES
// ─────────────────────────────────────────────

export const ASI_RULES = {
  maxAbilityScore: 20, // hard cap without magic items
  improvement: '+2 to one ability score, OR +1 to two, OR take a feat',
  levels: 'See ABILITY_SCORE_IMPROVEMENT_LEVELS per class',
  description: 'At ASI levels, choose: +2 to one score (max 20), +1 to two scores (max 20 each), or gain a feat.',
};


// ─────────────────────────────────────────────
// ADVENTURING GEAR (common items with mechanical effects)
// ─────────────────────────────────────────────

export const ADVENTURING_GEAR_EFFECTS = {
  'Acid (vial)':          { cost: 25, weight: 1, description: 'Ranged attack (20/60), 2d6 acid damage on hit.' },
  'Alchemist\'s Fire':    { cost: 50, weight: 1, description: 'Ranged attack (20/60), 1d4 fire damage at start of target\'s turns. DC 10 DEX to extinguish.' },
  'Antitoxin':            { cost: 50, weight: 0, description: 'Advantage on saves vs poison for 1 hour.' },
  'Ball Bearings (bag)':  { cost: 1, weight: 2, description: '10ft square: DEX DC 10 save or fall prone.' },
  'Caltrops (bag)':       { cost: 1, weight: 2, description: '5ft square: 1 piercing, DC 15 DEX or stop moving, speed -10 until healed.' },
  'Climber\'s Kit':       { cost: 25, weight: 12, description: 'Advantage on climbing checks. Pitons anchor you.' },
  'Crowbar':              { cost: 2, weight: 5, description: 'Advantage on STR checks where leverage applies.' },
  'Healer\'s Kit':        { cost: 5, weight: 3, description: '10 uses. Action: stabilize a creature at 0 HP without Medicine check.' },
  'Holy Water (flask)':   { cost: 25, weight: 1, description: 'Ranged attack (20/60), 2d6 radiant vs fiend or undead.' },
  'Hunting Trap':         { cost: 5, weight: 25, description: 'DC 13 STR save or restrained. Creature can break free with DC 13 STR check.' },
  'Lantern, Bullseye':    { cost: 10, weight: 2, description: 'Bright 60ft cone, dim 60ft more. 6 hours on 1 pint oil.' },
  'Lantern, Hooded':      { cost: 5, weight: 2, description: 'Bright 30ft, dim 30ft more. Hood reduces to 5ft dim. 6 hours on 1 pint oil.' },
  'Magnifying Glass':     { cost: 10, weight: 0, description: 'Start fire in bright light. +5 to Perception/Investigation of small objects.' },
  'Manacles':             { cost: 2, weight: 6, description: 'DC 20 STR to break, DC 15 DEX to escape. AC 19, 15 HP.' },
  'Oil (flask)':          { cost: 0.1, weight: 1, description: 'Splash 5ft: if ignited, 5 fire damage for 2 rounds.' },
  'Poison, Basic (vial)': { cost: 100, weight: 0, description: 'Apply to weapon/ammo (1 min). Next hit: DC 10 CON save or 1d4 poison + poisoned for 1 round.' },
  'Potion of Healing':    { cost: 50, weight: 0.5, description: 'Action to drink or administer. Regain 2d4+2 HP.' },
  'Rope, Hempen (50ft)':  { cost: 1, weight: 10, description: 'AC 11, 2 HP. Can be burst with DC 17 STR.' },
  'Rope, Silk (50ft)':    { cost: 10, weight: 5, description: 'AC 11, 2 HP. Can be burst with DC 17 STR. Advantage on climbing checks when used.' },
  'Spyglass':             { cost: 1000, weight: 1, description: 'Objects appear twice as close.' },
  'Tinderbox':            { cost: 0.5, weight: 1, description: 'Light a torch or fire as an action.' },
  'Torch':                { cost: 0.01, weight: 1, description: 'Bright 20ft, dim 20ft more. 1 hour. Melee: 1 fire damage.' },
};

export const HEALING_POTIONS = {
  'Potion of Healing':          { rarity: 'Common',    healing: '2d4+2',  cost: 50 },
  'Potion of Greater Healing':  { rarity: 'Uncommon',  healing: '4d4+4',  cost: 100 },
  'Potion of Superior Healing': { rarity: 'Rare',      healing: '8d4+8',  cost: 500 },
  'Potion of Supreme Healing':  { rarity: 'Very Rare', healing: '10d4+20', cost: 5000 },
};


// ─────────────────────────────────────────────
// MAGIC ITEM RARITY
// ─────────────────────────────────────────────

export const MAGIC_ITEM_RARITY = {
  Common:      { characterLevel: '1+', gpRange: '50-100',     description: 'Minor trinkets, cantrip-level effects' },
  Uncommon:    { characterLevel: '1+', gpRange: '101-500',    description: '+1 weapons/armor, minor wondrous items' },
  Rare:        { characterLevel: '5+', gpRange: '501-5000',   description: '+2 weapons/armor, significant wondrous items' },
  'Very Rare': { characterLevel: '11+', gpRange: '5001-50000', description: '+3 weapons/armor, powerful items' },
  Legendary:   { characterLevel: '17+', gpRange: '50001+',    description: 'Artifacts, world-shaping items' },
};


// ─────────────────────────────────────────────
// TRAVEL RULES
// ─────────────────────────────────────────────

export const TRAVEL_PACE = {
  fast:   { milesPerHour: 4, milesPerDay: 30, effect: '-5 penalty to passive Perception' },
  normal: { milesPerHour: 3, milesPerDay: 24, effect: 'No penalty' },
  slow:   { milesPerHour: 2, milesPerDay: 18, effect: 'Can use Stealth' },
};

export const FORCED_MARCH = {
  after: 8, // hours of travel
  save: 'CON',
  dc: (hoursOver) => 10 + hoursOver, // DC 11 for hour 9, DC 12 for hour 10, etc.
  failure: '1 level of exhaustion',
  description: 'After 8+ hours of travel, CON save each additional hour or gain 1 exhaustion.',
};


// ─────────────────────────────────────────────
// FOOD AND WATER REQUIREMENTS
// ─────────────────────────────────────────────

export const FOOD_AND_WATER = {
  food: {
    requirement: '1 pound per day',
    halfRation: 'Half ration counts as half a day without food',
    starvation: {
      grace: (conMod) => Math.max(3 + conMod, 1), // days before exhaustion
      effect: '1 level of exhaustion per day after grace period',
      reset: 'Full day of eating resets the count',
    },
  },
  water: {
    requirement: '1 gallon per day (2 in hot weather)',
    halfRation: 'Half ration with no strenuous activity: DC 15 CON save or 1 exhaustion at day end',
    noWater: '1 level exhaustion at end of day (2 if hot or strenuous)',
    description: 'Dehydration is faster than starvation',
  },
};


// ─────────────────────────────────────────────
// TRAPS
// ─────────────────────────────────────────────

export const TRAP_SEVERITY = {
  setback:   { saveDC: '10-11', attackBonus: '+3-5',  damage: { levels_1_4: '1d10', levels_5_10: '2d10', levels_11_16: '4d10', levels_17_20: '10d10' } },
  dangerous: { saveDC: '12-15', attackBonus: '+6-8',  damage: { levels_1_4: '2d10', levels_5_10: '4d10', levels_11_16: '10d10', levels_17_20: '18d10' } },
  deadly:    { saveDC: '16-20', attackBonus: '+9-12', damage: { levels_1_4: '4d10', levels_5_10: '10d10', levels_11_16: '18d10', levels_17_20: '24d10' } },
};
// ============================================================================
// D&D 5e RULES REGISTRY — PART 4 (FINAL GAPS)
// ============================================================================
// Append this to dnd5eRules.js after Part 3.
// Covers all 18 remaining SRD gaps.
// ============================================================================


// ─────────────────────────────────────────────
// GAP 1: RACIAL FEATURE MECHANICS
// ─────────────────────────────────────────────

export const RACIAL_FEATURE_MECHANICS = {
  // HALFLING
  Lucky: {
    race: 'Halfling',
    trigger: 'Roll a 1 on the d20 for an attack roll, ability check, or saving throw',
    effect: 'Reroll the die. Must use the new roll.',
    frequency: 'Every occurrence',
    description: 'Reroll natural 1s on d20 attack/check/save rolls.',
  },
  Brave: {
    race: 'Halfling',
    effect: { type: 'advantage', on: 'Saving throws against being frightened' },
    description: 'Advantage on saves vs frightened.',
  },
  'Halfling Nimbleness': {
    race: 'Halfling',
    effect: 'Can move through the space of any creature that is of a size larger than yours',
    description: 'Move through spaces of Medium or larger creatures.',
  },
  'Naturally Stealthy': {
    race: 'Halfling',
    subrace: 'Lightfoot',
    effect: 'Can attempt to hide even when obscured only by a creature that is at least one size larger than you',
    description: 'Hide behind Medium+ creatures.',
  },
  'Stout Resilience': {
    race: 'Halfling',
    subrace: 'Stout',
    effects: [
      { type: 'advantage', on: 'Saving throws against poison' },
      { type: 'resistance', against: 'poison' },
    ],
    description: 'Advantage on saves vs poison. Resistance to poison damage.',
  },

  // DWARF
  'Dwarven Resilience': {
    race: 'Dwarf',
    effects: [
      { type: 'advantage', on: 'Saving throws against poison' },
      { type: 'resistance', against: 'poison' },
    ],
    description: 'Advantage on saves vs poison. Resistance to poison damage.',
  },
  'Dwarven Toughness': {
    race: 'Dwarf',
    subrace: 'Hill Dwarf',
    effect: { type: 'hp_bonus', perLevel: 1 },
    description: '+1 HP per level (including retroactively).',
  },
  Stonecunning: {
    race: 'Dwarf',
    effect: 'When making an Intelligence (History) check related to the origin of stonework, add double your proficiency bonus instead of normal proficiency',
    mechanicalType: 'expertise',
    skill: 'History',
    condition: 'Related to stonework origin',
    description: 'Double proficiency on History checks about stonework.',
  },
  'Dwarven Combat Training': {
    race: 'Dwarf',
    effect: { type: 'proficiency', weapons: ['Battleaxe', 'Handaxe', 'Light Hammer', 'Warhammer'] },
    description: 'Proficiency with battleaxe, handaxe, light hammer, warhammer.',
  },
  'Dwarven Armor Training': {
    race: 'Dwarf',
    subrace: 'Mountain Dwarf',
    effect: { type: 'proficiency', armor: ['light', 'medium'] },
    description: 'Proficiency with light and medium armor.',
  },
  'Dwarven Speed': {
    race: 'Dwarf',
    effect: 'Speed is not reduced by wearing heavy armor',
    description: 'Heavy armor doesn\'t reduce your speed.',
  },

  // ELF
  'Keen Senses': {
    race: 'Elf',
    effect: { type: 'proficiency', skill: 'Perception' },
    description: 'Proficiency in Perception.',
  },
  'Fey Ancestry': {
    race: ['Elf', 'Half-Elf'],
    effects: [
      { type: 'advantage', on: 'Saving throws against being charmed' },
      { type: 'immunity', condition: 'Magical sleep' },
    ],
    description: 'Advantage on saves vs charmed. Can\'t be put to sleep by magic.',
  },
  Trance: {
    race: 'Elf',
    effect: 'Don\'t need to sleep. Instead, meditate deeply (semiconscious) for 4 hours. Gain the same benefit a human gets from 8 hours of sleep.',
    longRestTime: 4, // hours instead of 8
    description: '4 hours of trance = 8 hours of sleep.',
  },
  'Elf Weapon Training': {
    race: 'Elf',
    subrace: ['High Elf', 'Wood Elf'],
    effect: { type: 'proficiency', weapons: ['Longsword', 'Shortsword', 'Shortbow', 'Longbow'] },
    description: 'Proficiency with longsword, shortsword, shortbow, longbow.',
  },
  'Mask of the Wild': {
    race: 'Elf',
    subrace: 'Wood Elf',
    effect: 'Can attempt to hide when only lightly obscured by natural phenomena (foliage, rain, falling snow, mist, etc.)',
    description: 'Hide in light natural obscurement.',
  },
  'Sunlight Sensitivity': {
    race: 'Elf',
    subrace: 'Drow',
    effects: [
      { type: 'disadvantage', on: 'Attack rolls', condition: 'You or your target is in direct sunlight' },
      { type: 'disadvantage', on: 'Perception checks relying on sight', condition: 'In direct sunlight' },
    ],
    description: 'Disadvantage on attacks and sight-based Perception in direct sunlight.',
  },
  'Superior Darkvision': {
    race: 'Elf',
    subrace: 'Drow',
    range: 120,
    description: 'Darkvision out to 120 feet (instead of 60).',
  },
  'Drow Magic': {
    race: 'Elf',
    subrace: 'Drow',
    spells: {
      1: { cantrip: 'Dancing Lights' },
      3: { spell: 'Faerie Fire', uses: 1, recharge: 'long rest' },
      5: { spell: 'Darkness', uses: 1, recharge: 'long rest' },
    },
    spellcastingAbility: 'cha',
    description: 'Dancing Lights cantrip. Faerie Fire at 3, Darkness at 5 (1/long rest each). CHA-based.',
  },
  'High Elf Cantrip': {
    race: 'Elf',
    subrace: 'High Elf',
    effect: 'Learn one wizard cantrip of your choice. INT is the spellcasting ability.',
    description: 'One free wizard cantrip. INT-based.',
  },

  // GNOME
  'Gnome Cunning': {
    race: 'Gnome',
    effect: { type: 'advantage', on: 'All Intelligence, Wisdom, and Charisma saving throws against magic' },
    description: 'Advantage on INT/WIS/CHA saves vs magic.',
  },
  'Natural Illusionist': {
    race: 'Gnome',
    subrace: 'Forest Gnome',
    effect: 'Know the Minor Illusion cantrip. INT is the spellcasting ability.',
    description: 'Free Minor Illusion cantrip. INT-based.',
  },
  'Speak with Small Beasts': {
    race: 'Gnome',
    subrace: 'Forest Gnome',
    effect: 'Can communicate simple ideas with Small or smaller beasts',
    description: 'Communicate simple ideas with tiny beasts.',
  },
  "Artificer's Lore": {
    race: 'Gnome',
    subrace: 'Rock Gnome',
    effect: 'Add twice your proficiency to History checks related to magic items, alchemical objects, or technological devices',
    description: 'Double proficiency on History for magic items and tech.',
  },
  Tinker: {
    race: 'Gnome',
    subrace: 'Rock Gnome',
    effect: 'Proficiency with tinker\'s tools. Spend 1 hour + 10 GP to create a Tiny clockwork device (AC 5, 1 HP): clockwork toy, fire starter, or music box.',
    description: 'Tinker\'s tools proficiency. Create tiny clockwork devices.',
  },

  // HALF-ORC
  'Relentless Endurance': {
    race: 'Half-Orc',
    trigger: 'Reduced to 0 HP but not killed outright',
    effect: 'Drop to 1 HP instead',
    frequency: 'Once per long rest',
    description: 'Once/long rest: drop to 1 HP instead of 0.',
  },
  'Savage Attacks': {
    race: 'Half-Orc',
    trigger: 'Score a critical hit with a melee weapon attack',
    effect: 'Roll one additional weapon damage die and add it to the critical hit damage',
    description: 'On melee crit: roll one extra weapon die.',
  },
  Menacing: {
    race: 'Half-Orc',
    effect: { type: 'proficiency', skill: 'Intimidation' },
    description: 'Proficiency in Intimidation.',
  },

  // HALF-ELF
  'Skill Versatility': {
    race: 'Half-Elf',
    effect: { type: 'proficiency', skills: 2, choice: true },
    description: 'Proficiency in two skills of your choice.',
  },

  // HUMAN
  'Human Versatility': {
    race: 'Human',
    effect: '+1 to all ability scores',
    description: '+1 to every ability score.',
  },
  'Variant Human': {
    race: 'Human',
    variant: true,
    effects: [
      { type: 'asi', choices: 2, value: 1, description: '+1 to two different ability scores' },
      { type: 'proficiency', skills: 1, choice: true },
      { type: 'feat', count: 1 },
    ],
    description: '+1 to two scores, one skill proficiency, one feat.',
  },

  // DRAGONBORN
  'Draconic Resistance': {
    race: 'Dragonborn',
    effect: { type: 'resistance', against: 'damage type matching your draconic ancestry' },
    description: 'Resistance to your ancestry\'s damage type.',
  },

  // TIEFLING
  'Hellish Resistance': {
    race: 'Tiefling',
    effect: { type: 'resistance', against: 'fire' },
    description: 'Resistance to fire damage.',
  },
};


// ─────────────────────────────────────────────
// GAP 2: SPELLS KNOWN / PREPARED FORMULAS
// ─────────────────────────────────────────────

export const SPELLS_KNOWN_TABLE = {
  // Bard: knows a fixed number of spells
  Bard: {
    type: 'known',
    cantrips: { 1: 2, 4: 3, 10: 4 },
    spellsKnown: {
      1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10, 8: 11, 9: 12, 10: 14,
      11: 15, 12: 15, 13: 16, 14: 18, 15: 19, 16: 19, 17: 20, 18: 22, 19: 22, 20: 22,
    },
    swapOnLevelUp: 1, // can replace 1 known spell when you gain a level
    description: 'Knows a fixed number. Swap one on level up.',
  },
  // Cleric: prepares from full class list
  Cleric: {
    type: 'prepared',
    cantrips: { 1: 3, 4: 4, 10: 5 },
    preparedFormula: (wisMod, clericLevel) => Math.max(1, wisMod + clericLevel),
    source: 'Entire cleric spell list',
    changeDaily: true,
    description: 'Prepare WIS mod + cleric level spells from the full cleric list after each long rest.',
  },
  // Druid: prepares from full class list
  Druid: {
    type: 'prepared',
    cantrips: { 1: 2, 4: 3, 10: 4 },
    preparedFormula: (wisMod, druidLevel) => Math.max(1, wisMod + druidLevel),
    source: 'Entire druid spell list',
    changeDaily: true,
    description: 'Prepare WIS mod + druid level spells from the full druid list after each long rest.',
  },
  // Paladin: prepares from full class list (half caster, gets spells at 2)
  Paladin: {
    type: 'prepared',
    cantrips: null, // no cantrips
    preparedFormula: (chaMod, paladinLevel) => Math.max(1, chaMod + Math.floor(paladinLevel / 2)),
    source: 'Entire paladin spell list',
    changeDaily: true,
    startLevel: 2,
    description: 'Prepare CHA mod + half paladin level from the full paladin list after each long rest.',
  },
  // Ranger: knows a fixed number (half caster, gets spells at 2)
  Ranger: {
    type: 'known',
    cantrips: null,
    spellsKnown: {
      2: 2, 3: 3, 4: 3, 5: 4, 6: 4, 7: 5, 8: 5, 9: 6, 10: 6,
      11: 7, 12: 7, 13: 8, 14: 8, 15: 9, 16: 9, 17: 10, 18: 10, 19: 11, 20: 11,
    },
    swapOnLevelUp: 1,
    startLevel: 2,
    description: 'Knows a fixed number. Swap one on level up.',
  },
  // Sorcerer: knows a fixed number
  Sorcerer: {
    type: 'known',
    cantrips: { 1: 4, 4: 5, 10: 6 },
    spellsKnown: {
      1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11,
      11: 12, 12: 12, 13: 13, 14: 13, 15: 14, 16: 14, 17: 15, 18: 15, 19: 15, 20: 15,
    },
    swapOnLevelUp: 1,
    description: 'Knows a fixed number. Swap one on level up.',
  },
  // Warlock: knows a fixed number (pact magic)
  Warlock: {
    type: 'known',
    cantrips: { 1: 2, 4: 3, 10: 4 },
    spellsKnown: {
      1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 10,
      11: 11, 12: 11, 13: 12, 14: 12, 15: 13, 16: 13, 17: 14, 18: 14, 19: 15, 20: 15,
    },
    swapOnLevelUp: 1,
    mysticArcanum: { 11: 1, 13: 1, 15: 1, 17: 1 }, // one spell each of 6th, 7th, 8th, 9th
    description: 'Knows a fixed number. Pact slots recharge on short rest. Mystic Arcanum at 11+.',
  },
  // Wizard: spellbook system
  Wizard: {
    type: 'spellbook',
    cantrips: { 1: 3, 4: 4, 10: 5 },
    startingSpells: 6, // 1st level spells in spellbook at character creation
    spellsPerLevel: 2, // add 2 wizard spells per wizard level gained
    preparedFormula: (intMod, wizardLevel) => Math.max(1, intMod + wizardLevel),
    copySpellCost: '2 hours + 50 GP per spell level', // to copy a found spell into spellbook
    source: 'Spellbook (must prepare from spellbook after long rest)',
    changeDaily: true,
    description: 'Spellbook starts with 6 spells. +2 per level. Prepare INT mod + wizard level after long rest. Can copy found spells.',
  },
  // Eldritch Knight (Fighter subclass): knows fixed number, mostly abjuration/evocation
  'Eldritch Knight': {
    type: 'known',
    cantrips: { 3: 2, 10: 3 },
    spellsKnown: {
      3: 3, 4: 4, 7: 5, 8: 6, 10: 7, 11: 8, 13: 9, 14: 10, 16: 11, 19: 12, 20: 13,
    },
    restriction: 'Spells must be abjuration or evocation (except at levels 3, 8, 14, 20 — any wizard school)',
    swapOnLevelUp: 1,
    spellcastingAbility: 'int',
    description: 'Wizard spells, mostly abjuration/evocation. INT-based.',
  },
  // Arcane Trickster (Rogue subclass): knows fixed number, mostly enchantment/illusion
  'Arcane Trickster': {
    type: 'known',
    cantrips: { 3: 3, 10: 4 }, // includes Mage Hand which is mandatory
    spellsKnown: {
      3: 3, 4: 4, 7: 5, 8: 6, 10: 7, 11: 8, 13: 9, 14: 10, 16: 11, 19: 12, 20: 13,
    },
    restriction: 'Spells must be enchantment or illusion (except at levels 3, 8, 14, 20 — any wizard school)',
    mandatoryCantrip: 'Mage Hand',
    swapOnLevelUp: 1,
    spellcastingAbility: 'int',
    description: 'Wizard spells, mostly enchantment/illusion. INT-based. Must know Mage Hand.',
  },
};

/** Helper to get number of cantrips known for any class at any level */
export function cantripsKnown(className, level) {
  const classData = SPELLS_KNOWN_TABLE[className];
  if (!classData || !classData.cantrips) return 0;
  const thresholds = Object.keys(classData.cantrips).map(Number).sort((a, b) => b - a);
  for (const threshold of thresholds) {
    if (level >= threshold) return classData.cantrips[threshold];
  }
  return 0;
}

/** Helper to get spells known (for 'known' type casters) */
export function spellsKnown(className, level) {
  const classData = SPELLS_KNOWN_TABLE[className];
  if (!classData || classData.type !== 'known') return null;
  return classData.spellsKnown?.[level] || 0;
}

/** Helper to get spells prepared (for 'prepared' type casters) */
export function spellsPrepared(className, level, abilityMod) {
  const classData = SPELLS_KNOWN_TABLE[className];
  if (!classData || classData.type !== 'prepared') return null;
  if (classData.startLevel && level < classData.startLevel) return 0;
  return classData.preparedFormula(abilityMod, level);
}


// ─────────────────────────────────────────────
// GAP 3: CLASS TOOL PROFICIENCIES
// ─────────────────────────────────────────────

export const CLASS_TOOL_PROFICIENCIES = {
  Barbarian: [],
  Bard:      { type: 'choice', options: 'Three musical instruments of your choice' },
  Cleric:    [],
  Druid:     ['Herbalism kit'],
  Fighter:   [],
  Monk:      { type: 'choice', options: 'One artisan\'s tools or one musical instrument' },
  Paladin:   [],
  Ranger:    [],
  Rogue:     ['Thieves\' tools'],
  Sorcerer:  [],
  Warlock:   [],
  Wizard:    [],
};

export const CLASS_SKILL_CHOICES = {
  Barbarian: { count: 2, from: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'] },
  Bard:      { count: 3, from: 'any' },
  Cleric:    { count: 2, from: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'] },
  Druid:     { count: 2, from: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'] },
  Fighter:   { count: 2, from: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'] },
  Monk:      { count: 2, from: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'] },
  Paladin:   { count: 2, from: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'] },
  Ranger:    { count: 3, from: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'] },
  Rogue:     { count: 4, from: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'] },
  Sorcerer:  { count: 2, from: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'] },
  Warlock:   { count: 2, from: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'] },
  Wizard:    { count: 2, from: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'] },
};


// ─────────────────────────────────────────────
// GAP 4: BONUS ACTION SPELL RESTRICTION
// ─────────────────────────────────────────────

export const BONUS_ACTION_SPELL_RULE = {
  rule: 'If you cast a spell as a bonus action, you can\'t cast another spell during the same turn except a cantrip with a casting time of 1 action.',
  details: [
    'This applies even if you haven\'t used your action yet.',
    'If you cast a bonus action cantrip (e.g., Shillelagh), you can still cast a leveled spell with your action — this rule only triggers on bonus action SPELLS, and cantrips are still spells.',
    'Actually no — the rule is clear: if you cast ANY spell as a bonus action (including cantrips), the only other spell you can cast that turn is a cantrip with a casting time of 1 action.',
    'Reaction spells (Shield, Counterspell) on your own turn also count — if you cast a bonus action spell and then use Counterspell as a reaction on the same turn, that violates this rule.',
  ],
  implementation: 'When a bonus action spell is cast, flag the turn. Block casting leveled spells as an action. Only allow cantrips.',
};


// ─────────────────────────────────────────────
// GAP 5: SPELL AREAS OF EFFECT
// ─────────────────────────────────────────────

export const SPELL_AREAS_OF_EFFECT = {
  Cone: {
    origin: 'You (the caster)',
    shape: 'Width at any point = distance from origin. So a 15ft cone is 15ft wide at 15ft away.',
    measurement: 'A cone\'s width at a given point along its length is equal to that point\'s distance from the point of origin.',
    example: '15 ft cone: covers a triangle-shaped area from you to 15 ft, reaching 15 ft wide at its farthest point.',
  },
  Cube: {
    origin: 'A point on one face of the cube',
    shape: 'Equal length, width, height. The point of origin is on one face.',
    measurement: 'A cube\'s size is the length of each side.',
    example: '10 ft cube: 10 × 10 × 10 ft area originating from a face.',
  },
  Cylinder: {
    origin: 'Center of the circle forming the top or bottom',
    shape: 'Circle base with a height. The point of origin is the center of one end.',
    measurement: 'Defined by radius and height.',
    example: '20 ft radius, 40 ft high: a circle 40 ft wide (diameter), 40 ft tall.',
  },
  Line: {
    origin: 'You (the caster)',
    shape: 'A straight line extending from you to its maximum length, with a specified width.',
    measurement: 'Defined by length and width.',
    example: '5 × 30 ft line: a beam 5 ft wide and 30 ft long from you.',
  },
  Sphere: {
    origin: 'Center of the sphere',
    shape: 'Extends outward from center point in all directions to the radius.',
    measurement: 'Defined by radius. Diameter = 2 × radius.',
    example: '20 ft radius sphere: affects everything within 20 ft of the center point (40 ft diameter).',
  },
};


// ─────────────────────────────────────────────
// GAP 6: SAVING THROW NAT 20/1 CLARIFICATION
// ─────────────────────────────────────────────

export const SAVING_THROW_RULES = {
  nat20: {
    effect: 'NO automatic success on saving throws (unlike attack rolls)',
    clarification: 'A natural 20 on a saving throw is NOT an auto-success in RAW D&D 5e. You add your modifier and compare to the DC. If the total doesn\'t meet or exceed the DC, you still fail. The ONLY exception is death saving throws, where a nat 20 has a special effect.',
  },
  nat1: {
    effect: 'NO automatic failure on saving throws (unlike attack rolls)',
    clarification: 'A natural 1 on a saving throw is NOT an auto-failure in RAW D&D 5e. You add your modifier and compare to the DC. The ONLY exception is death saving throws, where a nat 1 counts as two failures.',
  },
  attack_rolls: {
    nat20: 'Auto-hit AND critical hit (double damage dice), regardless of AC',
    nat1: 'Auto-miss, regardless of modifiers vs AC',
  },
  ability_checks: {
    nat20: 'No special effect in RAW. Just adds 20 + modifier.',
    nat1: 'No special effect in RAW. Just adds 1 + modifier.',
  },
  death_saves: {
    nat20: 'Regain 1 HP, clear all death saves, regain consciousness',
    nat1: 'Counts as two failures instead of one',
  },
  implementation: 'The combat system should NOT auto-succeed/fail saves on nat 20/1 unless homebrew rules enable it.',
};


// ─────────────────────────────────────────────
// GAP 7: COMBINING MAGICAL EFFECTS
// ─────────────────────────────────────────────

export const COMBINING_MAGICAL_EFFECTS = {
  sameSpell: 'The effects of the same spell cast multiple times DON\'T combine. The most potent instance applies while overlapping. Example: two Bless spells on the same target — only one applies.',
  differentSpells: 'The effects of different spells DO stack. Example: Bless (+1d4 to attacks/saves) and Shield of Faith (+2 AC) both apply simultaneously.',
  sameNameFeature: 'If a game feature has the same name as a spell, they are treated as separate sources and DO stack unless specifically stated otherwise.',
  magicItemBonuses: 'Bonuses from multiple magic items generally stack unless they provide the same named effect (e.g., two Rings of Protection — only one +1 AC applies).',
  implementation: 'When applying spell effects, check if the same spell is already active on the target. If so, use the stronger instance. Different spells always stack.',
};


// ─────────────────────────────────────────────
// GAP 8: READY ACTION DETAILS
// ─────────────────────────────────────────────

export const READY_ACTION = {
  cost: 'action',
  description: 'Prepare an action to take later in the round in response to a specific trigger.',
  trigger: 'You define a perceivable circumstance. Example: "If the goblin moves, I attack" or "If the door opens, I cast Fireball".',
  response: 'When the trigger occurs, you can use your REACTION to perform the readied action, OR choose to ignore it.',
  spellRules: {
    concentrating: 'Readying a spell requires CONCENTRATION from when you ready it until the trigger (or you lose it).',
    slotConsumed: 'The spell slot is consumed when you BEGIN readying, not when you release.',
    lostOnBreak: 'If concentration is broken before the trigger, the spell and slot are wasted.',
    action: 'Releasing the spell uses your REACTION, not an action.',
  },
  movementReady: 'You can also ready a movement. Use your reaction to move up to your speed in response to a trigger.',
  implementation: 'When Ready is used: consume the Action, store the trigger and the prepared action/spell. On trigger: consume the Reaction to execute. If spell: begin concentration immediately and consume slot.',
};


// ─────────────────────────────────────────────
// GAP 9: UNSEEN ATTACKERS AND TARGETS
// ─────────────────────────────────────────────

export const UNSEEN_ATTACKERS_AND_TARGETS = {
  attackingUnseenTarget: {
    effect: 'Disadvantage on the attack roll',
    guessing: 'If you guess the target\'s location incorrectly, the attack automatically misses. The DM does NOT reveal whether you guessed right or wrong — just that the attack missed.',
    description: 'When you attack a target you can\'t see: disadvantage. Wrong location guess = auto-miss (no reveal).',
  },
  attackingAsUnseenAttacker: {
    effect: 'Advantage on the attack roll',
    reveal: 'Whether you hit or miss, your location is revealed when you attack (the sound, flash, etc.).',
    exception: 'The Skulker feat means missing a ranged attack doesn\'t reveal your position.',
    description: 'Attack roll with advantage when target can\'t see you. You\'re revealed after attacking.',
  },
  invisibleCreatures: {
    location: 'An invisible creature\'s location can be detected by noise or tracks. Hiding (Stealth check) is separate from being invisible.',
    attacking: 'An invisible creature has advantage on attacks. Attacks against it have disadvantage (if you know its location).',
    spells: 'Some spells require you to SEE the target. You can\'t target an invisible creature with such spells unless you have truesight, blindsight, etc.',
  },
  heavilyObscured: {
    effect: 'A creature in a heavily obscured area is effectively blinded for the purposes of sight.',
    description: 'In darkness or heavy fog: blinded when trying to see.',
  },
};


// ─────────────────────────────────────────────
// GAP 10: OPPORTUNITY ATTACK CLARIFICATION
// ─────────────────────────────────────────────

export const OPPORTUNITY_ATTACK_RULES = {
  trigger: 'A hostile creature that you can see moves out of your reach',
  cost: 'reaction',
  attacks: 1, // ALWAYS one melee weapon attack — Extra Attack doesn't apply
  doesNotApplyWhen: [
    'Target used the Disengage action',
    'Target was teleported (Misty Step, etc.)',
    'Target was moved against its will (shoved, Thunderwave, etc.)',
    'Target is leaving your reach involuntarily',
  ],
  sentinel: 'Sentinel feat: OA reduces target speed to 0. Disengage doesn\'t prevent your OA. Can OA when enemy attacks someone else.',
  polearmMaster: 'Polearm Master feat: OA triggers when creature ENTERS your reach (not just leaves).',
  warCaster: 'War Caster feat: cast a spell (single target, 1 action casting time) instead of melee attack for your OA.',
  description: 'Reaction: ONE melee weapon attack when an enemy you can see leaves your reach. Extra Attack doesn\'t apply.',
};


// ─────────────────────────────────────────────
// GAP 11: CONTESTS (OPPOSED CHECKS)
// ─────────────────────────────────────────────

export const CONTEST_RULES = {
  procedure: 'Both participants roll ability checks. Higher total wins.',
  ties: 'On a tie, the situation remains as it was. The creature trying to change things FAILS.',
  examples: [
    { name: 'Grapple', attacker: 'Athletics', defender: 'Athletics or Acrobatics (defender\'s choice)' },
    { name: 'Shove', attacker: 'Athletics', defender: 'Athletics or Acrobatics (defender\'s choice)' },
    { name: 'Hide vs Perception', attacker: 'Stealth', defender: 'Perception (passive or active)' },
    { name: 'Escape grapple', attacker: 'Athletics or Acrobatics', defender: 'Athletics' },
  ],
  description: 'Both roll. Higher wins. Ties go to the status quo (the one trying to change things fails).',
};


// ─────────────────────────────────────────────
// GAP 12: TEMPORARY HP RULES
// ─────────────────────────────────────────────

export const TEMPORARY_HP_RULES = {
  stacking: false, // NEVER stack. If you gain temp HP while you have temp HP, choose which to keep (usually the higher).
  notHealing: 'Temporary HP is NOT healing. It can\'t restore you above 0 HP if you\'re making death saves.',
  absorbDamage: 'Temp HP absorbs damage first, before your real HP.',
  duration: 'Last until depleted or until you finish a long rest, unless a feature specifies a shorter duration.',
  deathSaves: 'If you\'re at 0 HP and gain temp HP, you\'re still unconscious and making death saves. Temp HP just absorbs more incoming damage.',
  cantExceedMax: false, // Temp HP doesn\'t have to stay under your max HP — it stacks on top.
  description: 'Don\'t stack (pick higher). Not healing. Absorb damage before real HP. Drop on long rest.',
};


// ─────────────────────────────────────────────
// GAP 13: ADVANTAGE/DISADVANTAGE GENERAL RULES
// ─────────────────────────────────────────────

export const ADVANTAGE_DISADVANTAGE_RULES = {
  advantage: 'Roll two d20s, take the HIGHER result',
  disadvantage: 'Roll two d20s, take the LOWER result',
  cancellation: 'If you have ANY source of advantage and ANY source of disadvantage, they cancel — regardless of how many sources of each. Roll normally with one d20.',
  multipleSources: 'Having 3 sources of advantage and 1 source of disadvantage = roll normally (they cancel). There is no "net advantage".',
  noStacking: 'You never roll more than two d20s. Multiple sources of advantage don\'t mean 3+ dice.',
  withLucky: 'The Lucky feat lets you roll a THIRD d20 and pick which of the three to use — this is a special exception.',
  criticals: 'Advantage makes crits more likely (two chances at a 20). Disadvantage makes them less likely.',
  statisticalImpact: 'Advantage is roughly equivalent to +5. Disadvantage is roughly -5.',
  description: 'Any advantage + any disadvantage = cancel, roll normally. Never more than 2d20. No stacking.',
};


// ─────────────────────────────────────────────
// GAP 14: DIFFICULTY CLASS TABLE
// ─────────────────────────────────────────────

export const DIFFICULTY_CLASS_TABLE = {
  5:  'Very Easy',
  10: 'Easy',
  15: 'Medium',
  20: 'Hard',
  25: 'Very Hard',
  30: 'Nearly Impossible',
};

export function getDifficultyLabel(dc) {
  if (dc <= 5) return 'Very Easy';
  if (dc <= 10) return 'Easy';
  if (dc <= 15) return 'Medium';
  if (dc <= 20) return 'Hard';
  if (dc <= 25) return 'Very Hard';
  return 'Nearly Impossible';
}


// ─────────────────────────────────────────────
// GAP 15: ATTUNEMENT
// ─────────────────────────────────────────────

export const ATTUNEMENT_RULES = {
  maxAttuned: 3,
  process: 'Short rest spent focused on the item (not the same short rest where you learn its properties)',
  endAttunement: [
    'You voluntarily end it (no action required)',
    'You die',
    'Another creature attunes to the item',
    'You are more than 100 feet from the item for more than 24 hours',
    'You no longer satisfy the prerequisites (if any)',
  ],
  restrictions: 'Some items require you to be a specific class, alignment, or creature type to attune',
  sameItem: 'Only one creature can be attuned to a given item at a time',
  description: 'Max 3 attuned items. Short rest to attune. Ends if you die, someone else attunes, or 100+ ft away for 24+ hours.',
};


// ─────────────────────────────────────────────
// GAP 16: COMPLETE ELDRITCH INVOCATIONS
// ─────────────────────────────────────────────

export const ELDRITCH_INVOCATIONS = {
  'Agonizing Blast': {
    prerequisite: 'Eldritch Blast cantrip',
    effect: 'Add CHA modifier to Eldritch Blast damage',
    description: '+CHA to each Eldritch Blast beam\'s damage.',
  },
  'Armor of Shadows': {
    prerequisite: null,
    effect: 'Cast Mage Armor on yourself at will without a spell slot or material components',
    description: 'At-will Mage Armor on self.',
  },
  'Ascendant Step': {
    prerequisite: 'Level 9',
    effect: 'Cast Levitate on yourself at will without a spell slot or material components',
    description: 'At-will Levitate on self.',
  },
  'Beast Speech': {
    prerequisite: null,
    effect: 'Cast Speak with Animals at will without a spell slot',
    description: 'At-will Speak with Animals.',
  },
  'Beguiling Influence': {
    prerequisite: null,
    effect: 'Gain proficiency in Deception and Persuasion',
    description: 'Proficiency in Deception and Persuasion.',
  },
  'Bewitching Whispers': {
    prerequisite: 'Level 7',
    effect: 'Cast Compulsion once using a warlock spell slot. Can\'t do so again until long rest.',
    description: 'Once/long rest: Compulsion using a slot.',
  },
  'Book of Ancient Secrets': {
    prerequisite: 'Pact of the Tome',
    effect: 'Choose two 1st-level ritual spells from any class. They appear in your Book of Shadows. Can cast them as rituals. Can add other ritual spells you find (2 hours + 50 GP per spell level to copy).',
    description: 'Two free ritual spells + copy more into Book of Shadows.',
  },
  'Chains of Carceri': {
    prerequisite: 'Level 15, Pact of the Chain',
    effect: 'Cast Hold Monster at will on celestials, fiends, or elementals without a spell slot or material components',
    description: 'At-will Hold Monster vs celestials/fiends/elementals.',
  },
  "Devil's Sight": {
    prerequisite: null,
    effect: 'See normally in darkness, both magical and nonmagical, to 120 feet',
    description: 'See in all darkness (including magical) to 120 ft.',
  },
  'Dreadful Word': {
    prerequisite: 'Level 7',
    effect: 'Cast Confusion once using a warlock spell slot. Can\'t do so again until long rest.',
    description: 'Once/long rest: Confusion using a slot.',
  },
  'Eldritch Sight': {
    prerequisite: null,
    effect: 'Cast Detect Magic at will without a spell slot',
    description: 'At-will Detect Magic.',
  },
  'Eldritch Spear': {
    prerequisite: 'Eldritch Blast cantrip',
    effect: 'Eldritch Blast range becomes 300 feet',
    description: 'Eldritch Blast range = 300 ft.',
  },
  'Eyes of the Rune Keeper': {
    prerequisite: null,
    effect: 'Read all writing',
    description: 'Can read any writing.',
  },
  'Fiendish Vigor': {
    prerequisite: null,
    effect: 'Cast False Life on yourself at will as 1st-level spell without a spell slot or material components',
    description: 'At-will False Life (1d4+4 temp HP) on self.',
  },
  'Gaze of Two Minds': {
    prerequisite: null,
    effect: 'Action: touch willing humanoid and perceive through its senses until end of your next turn. You\'re blinded and deafened to your own senses.',
    description: 'Action: see/hear through touched humanoid\'s senses.',
  },
  'Lifedrinker': {
    prerequisite: 'Level 12, Pact of the Blade',
    effect: 'Pact weapon deals extra necrotic damage = CHA modifier (minimum 1)',
    description: '+CHA necrotic damage with pact weapon.',
  },
  'Mask of Many Faces': {
    prerequisite: null,
    effect: 'Cast Disguise Self at will without a spell slot',
    description: 'At-will Disguise Self.',
  },
  'Master of Myriad Forms': {
    prerequisite: 'Level 15',
    effect: 'Cast Alter Self at will without a spell slot',
    description: 'At-will Alter Self.',
  },
  'Minions of Chaos': {
    prerequisite: 'Level 9',
    effect: 'Cast Conjure Elemental once using a warlock spell slot. Can\'t do so again until long rest.',
    description: 'Once/long rest: Conjure Elemental using a slot.',
  },
  'Mire the Mind': {
    prerequisite: 'Level 5',
    effect: 'Cast Slow once using a warlock spell slot. Can\'t do so again until long rest.',
    description: 'Once/long rest: Slow using a slot.',
  },
  'Misty Visions': {
    prerequisite: null,
    effect: 'Cast Silent Image at will without a spell slot or material components',
    description: 'At-will Silent Image.',
  },
  'One with Shadows': {
    prerequisite: 'Level 5',
    effect: 'In dim light or darkness, action to become invisible until you move or take an action/reaction',
    description: 'Action: invisible in dim light/darkness until you act.',
  },
  'Otherworldly Leap': {
    prerequisite: 'Level 9',
    effect: 'Cast Jump on yourself at will without a spell slot or material components',
    description: 'At-will Jump on self.',
  },
  'Repelling Blast': {
    prerequisite: 'Eldritch Blast cantrip',
    effect: 'Each Eldritch Blast hit pushes target 10 feet straight away',
    description: 'Eldritch Blast pushes 10 ft per hit.',
  },
  'Sculptor of Flesh': {
    prerequisite: 'Level 7',
    effect: 'Cast Polymorph once using a warlock spell slot. Can\'t do so again until long rest.',
    description: 'Once/long rest: Polymorph using a slot.',
  },
  'Sign of Ill Omen': {
    prerequisite: 'Level 5',
    effect: 'Cast Bestow Curse once using a warlock spell slot. Can\'t do so again until long rest.',
    description: 'Once/long rest: Bestow Curse using a slot.',
  },
  'Thirsting Blade': {
    prerequisite: 'Level 5, Pact of the Blade',
    effect: 'Attack twice when you take the Attack action with your pact weapon',
    description: 'Extra Attack with pact weapon.',
  },
  'Visions of Distant Realms': {
    prerequisite: 'Level 15',
    effect: 'Cast Arcane Eye at will without a spell slot',
    description: 'At-will Arcane Eye.',
  },
  'Voice of the Chain Master': {
    prerequisite: 'Pact of the Chain',
    effect: 'Communicate telepathically with familiar. Perceive through familiar\'s senses. While perceiving, can speak through familiar. All work on any plane.',
    description: 'Telepathy + senses through familiar on any plane.',
  },
  'Whispers of the Grave': {
    prerequisite: 'Level 9',
    effect: 'Cast Speak with Dead at will without a spell slot',
    description: 'At-will Speak with Dead.',
  },
  'Witch Sight': {
    prerequisite: 'Level 15',
    effect: 'See the true form of any shapechanger or creature concealed by illusion or transmutation magic within 30 feet',
    description: 'See true form of shapechangers and disguised creatures within 30 ft.',
  },
};


// ─────────────────────────────────────────────
// GAP 17: CIRCLE OF THE LAND TERRAIN SPELLS
// ─────────────────────────────────────────────

export const CIRCLE_OF_THE_LAND_SPELLS = {
  Arctic: {
    3: ['Hold Person', 'Spike Growth'],
    5: ['Sleet Storm', 'Slow'],
    7: ['Freedom of Movement', 'Ice Storm'],
    9: ['Commune with Nature', 'Cone of Cold'],
  },
  Coast: {
    3: ['Mirror Image', 'Misty Step'],
    5: ['Water Breathing', 'Water Walk'],
    7: ['Control Water', 'Freedom of Movement'],
    9: ['Conjure Elemental', 'Scrying'],
  },
  Desert: {
    3: ['Blur', 'Silence'],
    5: ['Create Food and Water', 'Protection from Energy'],
    7: ['Blight', 'Hallucinatory Terrain'],
    9: ['Insect Plague', 'Wall of Stone'],
  },
  Forest: {
    3: ['Barkskin', 'Spider Climb'],
    5: ['Call Lightning', 'Plant Growth'],
    7: ['Divination', 'Freedom of Movement'],
    9: ['Commune with Nature', 'Tree Stride'],
  },
  Grassland: {
    3: ['Invisibility', 'Pass without Trace'],
    5: ['Daylight', 'Haste'],
    7: ['Divination', 'Freedom of Movement'],
    9: ['Dream', 'Insect Plague'],
  },
  Mountain: {
    3: ['Spider Climb', 'Spike Growth'],
    5: ['Lightning Bolt', 'Meld into Stone'],
    7: ['Stone Shape', 'Stoneskin'],
    9: ['Passwall', 'Wall of Stone'],
  },
  Swamp: {
    3: ['Darkness', 'Melf\'s Acid Arrow'],
    5: ['Water Walk', 'Stinking Cloud'],
    7: ['Freedom of Movement', 'Locate Creature'],
    9: ['Insect Plague', 'Scrying'],
  },
  Underdark: {
    3: ['Spider Climb', 'Web'],
    5: ['Gaseous Form', 'Stinking Cloud'],
    7: ['Greater Invisibility', 'Stone Shape'],
    9: ['Cloudkill', 'Insect Plague'],
  },
};


// ─────────────────────────────────────────────
// GAP 18: SPELL SCROLL RULES
// ─────────────────────────────────────────────

export const SPELL_SCROLL_RULES = {
  usage: 'If the spell is on your class spell list, you can read the scroll and cast the spell without providing material components. Otherwise, the scroll is unintelligible.',
  higherLevel: {
    rule: 'If the spell is on your list but of a higher level than you can normally cast, you must make an ability check using your spellcasting ability.',
    dc: (scrollSpellLevel) => 10 + scrollSpellLevel,
    failure: 'The spell disappears from the scroll with no effect.',
  },
  consumed: 'The scroll crumbles to dust after the spell is cast (whether successful or not for higher-level checks).',
  saveDC: {
    cantrip: { saveDC: 13, attackBonus: 5 },
    1: { saveDC: 13, attackBonus: 5 },
    2: { saveDC: 13, attackBonus: 5 },
    3: { saveDC: 15, attackBonus: 7 },
    4: { saveDC: 15, attackBonus: 7 },
    5: { saveDC: 17, attackBonus: 9 },
    6: { saveDC: 17, attackBonus: 9 },
    7: { saveDC: 18, attackBonus: 10 },
    8: { saveDC: 18, attackBonus: 10 },
    9: { saveDC: 19, attackBonus: 11 },
  },
  craftingCost: {
    cantrip: { time: '1 day', cost: 15 },
    1: { time: '1 day', cost: 25 },
    2: { time: '3 days', cost: 250 },
    3: { time: '1 week', cost: 500 },
    4: { time: '2 weeks', cost: 2500 },
    5: { time: '4 weeks', cost: 5000 },
    6: { time: '8 weeks', cost: 15000 },
    7: { time: '16 weeks', cost: 25000 },
    8: { time: '32 weeks', cost: 50000 },
    9: { time: '48 weeks', cost: 250000 },
  },
  rarity: {
    cantrip: 'Common', 1: 'Common', 2: 'Uncommon', 3: 'Uncommon',
    4: 'Rare', 5: 'Rare', 6: 'Very Rare', 7: 'Very Rare',
    8: 'Very Rare', 9: 'Legendary',
  },
  description: 'Cast a spell from a scroll if it\'s on your class list. Higher level than you can cast? Ability check DC 10 + spell level. Scroll is consumed either way.',
};
