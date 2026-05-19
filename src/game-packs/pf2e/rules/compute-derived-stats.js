// Compute derived statistics for the character sheet snapshot.
// Lifted verbatim from the PF2eCharacterForge prototype (computeDerivedStats).

import { ABILITIES } from './constants.js';
import { profBonus } from './proficiency.js';
import { computeAbilityScores, modOf } from './compute-ability-scores.js';
import {
  ANCESTRIES,
  CLASSES,
  CLASS_DETAILS,
  ANCESTRY_LANGUAGES,
  CASTING_TRADITION_BY_CLASS,
} from '../data/index.js';

export const computeDerivedStats = (data) => {
  const level = data.level || 1;
  const scores = computeAbilityScores(data);
  const mods = Object.fromEntries(ABILITIES.map(ab => [ab, modOf(scores[ab])]));
  const cls = CLASSES.find(c => c.slug === data.class);
  const details = cls ? CLASS_DETAILS[cls.id] : null;
  const profs = details?.proficiencies || {};
  const opts = { proficiencyWithoutLevel: !!data.houseRules?.proficiencyWithoutLevel };

  // AC: 10 + DEX (limited by armor) + armor proficiency + armor item bonus
  // Simplified: use unarmored proficiency. Real implementation reads from equipped armor.
  const acProfTier = profs.armor?.unarmored || 'untrained';
  const ac = 10 + mods.Dexterity + profBonus(acProfTier, level, opts);

  // Saves
  const fortTier = profs.saves?.fortitude || 'untrained';
  const refTier  = profs.saves?.reflex || 'untrained';
  const willTier = profs.saves?.will || 'untrained';
  const fort = mods.Constitution + profBonus(fortTier, level, opts);
  const ref  = mods.Dexterity    + profBonus(refTier, level, opts);
  const will = mods.Wisdom       + profBonus(willTier, level, opts);

  // Perception
  const percTier = profs.perception || 'untrained';
  const perception = mods.Wisdom + profBonus(percTier, level, opts);

  // Class DC and spell DC (uses key ability + level + proficiency)
  const keyAb = cls?.keyAbility?.[0];
  const classDC = keyAb ? 10 + mods[keyAb] + profBonus(profs.classDC || 'untrained', level, opts) : null;
  let spellDC = null;
  let spellAttack = null;
  const tradition = cls && CASTING_TRADITION_BY_CLASS[cls.id];
  if (tradition) {
    const castProfKey = tradition.tradition + 'Spellcasting';
    const castTier = profs[castProfKey] || 'trained';
    spellDC = 10 + mods[tradition.keyAbility] + profBonus(castTier, level, opts);
    spellAttack = mods[tradition.keyAbility] + profBonus(castTier, level, opts);
  }

  // HP
  const ancestry = ANCESTRIES.find(a => a.slug === data.ancestry);
  const hp = (ancestry?.hp || 0) + (cls?.hp || 0) * level + mods.Constitution * level;

  // Languages count = base ancestry + max(0, INT mod)
  const baseLanguages = ANCESTRY_LANGUAGES[data.ancestry]?.base || [];
  const bonusLangSlots = Math.max(0, mods.Intelligence);

  return {
    level, scores, mods, ac, fort, ref, will, perception, classDC,
    spellDC, spellAttack, hp, baseLanguages, bonusLangSlots,
    initiative: perception, opts,
  };
};
