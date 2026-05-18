// Build-type classifier + feat-driven HP/speed bonuses.
// Lifted verbatim from the prototype.
//
//   computeBuildType  — auto-tags the character as Caster / Striker / Skill Monkey / Support.
//   computeFeatHPBonus — adds level × Toughness (currently the only HP-mod feat).
//   computeSpeedBonus  — adds +5 ft for Fleet.

import { CLASSES } from '../data/index.js';

export const computeBuildType = (data) => {
  const cls = CLASSES.find(c => c.id === data.class);
  if (!cls) return null;
  const castersFull = ['wizard', 'cleric', 'sorcerer', 'druid', 'bard', 'witch', 'oracle', 'psychic'];
  const martials = ['fighter', 'barbarian', 'monk', 'champion', 'ranger', 'gunslinger', 'swashbuckler'];
  const supports = ['cleric', 'bard', 'investigator', 'thaumaturge'];
  const skillMonkeys = ['rogue', 'investigator', 'thaumaturge'];

  if (castersFull.includes(cls.id) && supports.includes(cls.id)) return 'Support / Caster';
  if (castersFull.includes(cls.id)) return 'Caster';
  if (martials.includes(cls.id)) return 'Striker';
  if (skillMonkeys.includes(cls.id)) return 'Skill Monkey';
  return cls.name;
};

export const computeFeatHPBonus = (data) => {
  const level = data.level || 1;
  let bonus = 0;
  const allFeats = [
    ...Object.values(data.skillFeats || {}),
    ...Object.values(data.generalFeats || {}),
    ...Object.values(data.classFeats || {}),
    ...Object.values(data.ancestryFeats || {}),
  ];
  if (allFeats.includes('Toughness')) bonus += level;
  return bonus;
};

export const computeSpeedBonus = (data) => {
  const allFeats = [
    ...Object.values(data.generalFeats || {}),
    ...Object.values(data.ancestryFeats || {}),
  ];
  let bonus = 0;
  if (allFeats.includes('Fleet')) bonus += 5;
  return bonus;
};
