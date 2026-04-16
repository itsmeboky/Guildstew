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
