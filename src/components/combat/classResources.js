/**
 * Class resource state helpers. Initialize / read / spend / reset the
 * per-character resource counters (rages, ki, action surge, etc.) that
 * live in combat_data.classResources.
 *
 * The shape is:
 *   combat_data.classResources = {
 *     [characterKey]: {
 *       ragesRemaining: N,
 *       isRaging: false,
 *       recklessActive: false,
 *       kiRemaining: N,
 *       actionSurgeRemaining: N,
 *       secondWindUsed: false,
 *       bardicInspirationRemaining: N,
 *       sorceryPointsRemaining: N,
 *       layOnHandsRemaining: N,
 *       channelDivinityRemaining: N,
 *       wildShapeRemaining: N,
 *       bonusActionSpellCast: false,
 *     }
 *   }
 */

import {
  RAGES_PER_DAY,
  RAGE_DAMAGE_BONUS,
  kiPoints,
  layOnHandsPool,
  abilityModifier,
  CLASS_ABILITY_MECHANICS,
} from '@/components/dnd5e/dnd5eRules';

/**
 * Build the initial resource block for a character based on their
 * class and level. Called when combat starts or when a character
 * enters the initiative order.
 */
export function initClassResources(character) {
  if (!character) return {};
  const cls = character.class || '';
  const level = character.level || character.stats?.level || 1;
  const resources = {};

  // Barbarian
  if (cls === 'Barbarian') {
    resources.ragesRemaining = RAGES_PER_DAY[level] || 2;
    resources.isRaging = false;
    resources.recklessActive = false;
  }

  // Fighter
  if (cls === 'Fighter') {
    resources.secondWindUsed = false;
    if (level >= 2) {
      const uses = CLASS_ABILITY_MECHANICS['Action Surge']?.uses || {};
      resources.actionSurgeRemaining = level >= 17 ? (uses[17] || 2) : (uses[2] || 1);
    }
  }

  // Monk
  if (cls === 'Monk' && level >= 2) {
    resources.kiRemaining = kiPoints(level);
  }

  // Paladin
  if (cls === 'Paladin') {
    resources.layOnHandsRemaining = layOnHandsPool(level);
  }

  // Bard
  if (cls === 'Bard') {
    const chaMod = abilityModifier(character.attributes?.cha || 10);
    resources.bardicInspirationRemaining = Math.max(1, chaMod);
  }

  // Sorcerer
  if (cls === 'Sorcerer' && level >= 2) {
    resources.sorceryPointsRemaining = level;
  }

  // Cleric
  if (cls === 'Cleric' && level >= 2) {
    resources.channelDivinityRemaining = level >= 18 ? 3 : level >= 6 ? 2 : 1;
  }

  // Druid
  if (cls === 'Druid' && level >= 2) {
    resources.wildShapeRemaining = 2;
  }

  return resources;
}

/**
 * Get a character's current resources from combat_data, falling back
 * to a fresh initialization if none exist yet.
 */
export function getClassResources(combatData, characterKey, character) {
  const existing = combatData?.classResources?.[characterKey];
  if (existing) return existing;
  return initClassResources(character);
}

/**
 * Reset resources that recharge on a short rest.
 */
export function resetShortRest(resources, character) {
  const cls = character?.class || '';
  const level = character?.level || 1;
  const next = { ...resources };

  // Fighter
  if (cls === 'Fighter') {
    next.secondWindUsed = false;
    if (level >= 2) {
      const uses = CLASS_ABILITY_MECHANICS['Action Surge']?.uses || {};
      next.actionSurgeRemaining = level >= 17 ? (uses[17] || 2) : (uses[2] || 1);
    }
  }

  // Monk
  if (cls === 'Monk' && level >= 2) {
    next.kiRemaining = kiPoints(level);
  }

  // Bard (level 5+)
  if (cls === 'Bard' && level >= 5) {
    const chaMod = abilityModifier(character.attributes?.cha || 10);
    next.bardicInspirationRemaining = Math.max(1, chaMod);
  }

  // Cleric
  if (cls === 'Cleric' && level >= 2) {
    next.channelDivinityRemaining = level >= 18 ? 3 : level >= 6 ? 2 : 1;
  }

  // Druid
  if (cls === 'Druid' && level >= 2) {
    next.wildShapeRemaining = 2;
  }

  // Rage / Reckless don't reset on short rest
  next.isRaging = false;
  next.recklessActive = false;

  return next;
}

/**
 * Reset resources that recharge on a long rest.
 */
export function resetLongRest(resources, character) {
  // Long rest resets everything a short rest does, plus more.
  const next = resetShortRest(resources, character);
  const cls = character?.class || '';
  const level = character?.level || 1;

  // Barbarian rages
  if (cls === 'Barbarian') {
    next.ragesRemaining = RAGES_PER_DAY[level] || 2;
  }

  // Bard (all levels)
  if (cls === 'Bard') {
    const chaMod = abilityModifier(character.attributes?.cha || 10);
    next.bardicInspirationRemaining = Math.max(1, chaMod);
  }

  // Sorcerer
  if (cls === 'Sorcerer' && level >= 2) {
    next.sorceryPointsRemaining = level;
  }

  // Paladin
  if (cls === 'Paladin') {
    next.layOnHandsRemaining = layOnHandsPool(level);
  }

  return next;
}

/**
 * Rage damage bonus for the character's level.
 */
export function rageDamageBonus(level) {
  return RAGE_DAMAGE_BONUS[level] || 2;
}
