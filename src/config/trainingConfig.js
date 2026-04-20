/**
 * Xanathar's training rules + Guild Hall reductions.
 *
 * Base rule: learning a new language / tool / proficiency takes 10
 * weeks at 25 gp/week, minus INT modifier in weeks (min 1 week).
 *
 * Guild Hall upgrades reduce the final week count by a multiplier
 * depending on which tier is owned. Upgrade IDs here match the
 * Part 1 catalog (src/config/guildHallUpgrades.js): basic_library
 * / scholars_archive / grand_library, sparring_ring / combat_arena
 * / war_room, basic_workshop / artisans_hall / master_forge.
 */

export const BASE_TRAINING_WEEKS = 10;
export const COST_PER_WEEK = 25; // gp

export const TRAINABLE_LANGUAGES = {
  standard: ['Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc'],
  rare: ['Abyssal', 'Celestial', 'Deep Speech', 'Draconic', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon'],
};

export const TRAINABLE_TOOLS = [
  "Alchemist's Supplies", "Brewer's Supplies", "Calligrapher's Supplies",
  "Carpenter's Tools", "Cartographer's Tools", "Cobbler's Tools",
  "Cook's Utensils", "Glassblower's Tools", "Jeweler's Tools",
  "Leatherworker's Tools", "Mason's Tools", "Painter's Supplies",
  "Potter's Tools", "Smith's Tools", "Tinker's Tools",
  "Weaver's Tools", "Woodcarver's Tools",
  "Disguise Kit", "Forgery Kit", "Herbalism Kit",
  "Navigator's Tools", "Poisoner's Kit", "Thieves' Tools",
];

// Kept split so the training picker can show martial weapons behind
// a gate.
export const TRAINABLE_SIMPLE_WEAPONS = [
  'Simple Weapons',
];

export const TRAINABLE_MARTIAL_WEAPONS = [
  'Martial Weapons',
  'Longsword', 'Shortsword', 'Rapier', 'Scimitar', 'Greatsword',
  'Longbow', 'Shortbow', 'Hand Crossbow', 'Heavy Crossbow',
  'Battleaxe', 'Greataxe', 'Warhammer', 'Maul', 'Halberd',
  'Whip', 'Trident', 'Lance', 'War Pick',
];

export const TRAINABLE_WEAPONS = [
  ...TRAINABLE_SIMPLE_WEAPONS,
  ...TRAINABLE_MARTIAL_WEAPONS,
];

export const TRAINABLE_ARMOR = ['Light Armor', 'Medium Armor', 'Heavy Armor', 'Shields'];

/**
 * Calculate training time with Guild Hall reductions applied.
 *
 * @param {object} characterStats — reads stats.int, attributes.int,
 *   or a top-level `int` field, whichever exists.
 * @param {'language'|'tool'|'weapon'|'armor'} trainingType
 * @param {string[]} purchasedUpgrades — Guild Hall upgrade ids.
 * @returns {{ weeks, totalCost, reduction, baseWeeks }}
 */
export function calculateTrainingTime(characterStats, trainingType, purchasedUpgrades = []) {
  const intScore =
    characterStats?.attributes?.int
    ?? characterStats?.stats?.attributes?.int
    ?? characterStats?.int
    ?? 10;
  const intMod = Math.floor((Number(intScore) - 10) / 2);
  const baseWeeks = Math.max(1, BASE_TRAINING_WEEKS - intMod);

  let reduction = 0;
  if (trainingType === 'language') {
    if (purchasedUpgrades.includes('grand_library')) reduction = 0.60;
    else if (purchasedUpgrades.includes('scholars_archive')) reduction = 0.40;
    else if (purchasedUpgrades.includes('basic_library')) reduction = 0.20;
  } else if (trainingType === 'tool') {
    if (purchasedUpgrades.includes('master_forge')) reduction = 0.60;
    else if (purchasedUpgrades.includes('artisans_hall')) reduction = 0.40;
    else if (purchasedUpgrades.includes('basic_workshop')) reduction = 0.20;
  } else if (trainingType === 'weapon' || trainingType === 'armor') {
    if (purchasedUpgrades.includes('war_room')) reduction = 0.60;
    else if (purchasedUpgrades.includes('combat_arena')) reduction = 0.40;
    else if (purchasedUpgrades.includes('sparring_ring')) reduction = 0.20;
  }

  const finalWeeks = Math.max(1, Math.ceil(baseWeeks * (1 - reduction)));
  const totalCost = finalWeeks * COST_PER_WEEK;

  return {
    weeks: finalWeeks,
    totalCost,
    reduction: Math.round(reduction * 100),
    baseWeeks,
  };
}

/** Rare languages require Scholar's Archive or higher. */
export function canTrainRareLanguages(purchasedUpgrades = []) {
  return purchasedUpgrades.includes('scholars_archive')
      || purchasedUpgrades.includes('grand_library');
}

/** Martial weapons require Combat Arena or higher. */
export function canTrainMartialWeapons(purchasedUpgrades = []) {
  return purchasedUpgrades.includes('combat_arena')
      || purchasedUpgrades.includes('war_room');
}

/**
 * Simultaneous training slots — Grand Library / War Room each unlock
 * a parallel slot for their training type so two characters can
 * train at once.
 */
export function getSimultaneousSlots(trainingType, purchasedUpgrades = []) {
  if (trainingType === 'language' && purchasedUpgrades.includes('grand_library')) return 2;
  if ((trainingType === 'weapon' || trainingType === 'armor') && purchasedUpgrades.includes('war_room')) return 2;
  return 1;
}

/**
 * True when any training category has at least its tier-1 upgrade
 * owned — gates the whole Training section on the Guild Hall panel.
 */
export function anyTrainingUnlocked(purchasedUpgrades = []) {
  return [
    'basic_library', 'scholars_archive', 'grand_library',
    'sparring_ring', 'combat_arena', 'war_room',
    'basic_workshop', 'artisans_hall', 'master_forge',
  ].some((id) => purchasedUpgrades.includes(id));
}

/** Which training types are available given what's owned. */
export function availableTrainingTypes(purchasedUpgrades = []) {
  const types = [];
  if (['basic_library', 'scholars_archive', 'grand_library'].some((id) => purchasedUpgrades.includes(id))) {
    types.push('language');
  }
  if (['basic_workshop', 'artisans_hall', 'master_forge'].some((id) => purchasedUpgrades.includes(id))) {
    types.push('tool');
  }
  if (['sparring_ring', 'combat_arena', 'war_room'].some((id) => purchasedUpgrades.includes(id))) {
    types.push('weapon');
    types.push('armor');
  }
  return types;
}
