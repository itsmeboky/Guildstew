// Compute final ability scores from accumulated boosts + free boost batches.
// Lifted verbatim from the PF2eCharacterForge prototype (computeAbilityScores).
//
// Inputs:
//   data.background, data.ancestry, data.class         — selection IDs
//   data.boostBatches                                  — { [level]: { Strength: 1, ... } }
//   data.houseRules.voluntaryFlaws                     — boolean
//   data.voluntaryFlaws, data.voluntaryFlawBoost       — Voluntary Flaws variant
//
// Returns: { Strength: 18, Dexterity: 14, ... }

import { ABILITIES } from './constants.js';
import { CLASSES } from '../data/index.js';

export const computeAbilityScores = (data) => {
  const accumulated = {
    // PF2e backgrounds with structural boosts. `warrior` and `sailor`
    // both grant a Strength bias; `warrior` doubles as a Con-flavored
    // background. Pre-Phase-F this referenced `'soldier'` (a D&D 5e
    // background that doesn't exist in PF2e), which silently failed
    // every comparison and left these accumulators at zero.
    Strength: (data.background === 'warrior' || data.background === 'sailor') ? 1 : 0,
    Dexterity: (data.ancestry === 'elf' || data.ancestry === 'halfling' ? 1 : 0) + (['criminal', 'scout', 'sailor'].includes(data.background) ? 1 : 0),
    Constitution: (data.ancestry === 'dwarf' || data.ancestry === 'gnome' ? 1 : 0) + (data.background === 'warrior' ? 1 : 0),
    Intelligence: (data.ancestry === 'elf' ? 1 : 0) + (['acolyte', 'noble', 'scholar'].includes(data.background) ? 1 : 0),
    Wisdom: (data.ancestry === 'dwarf' || data.ancestry === 'halfling' ? 1 : 0) + (['scout', 'scholar', 'hermit'].includes(data.background) ? 1 : 0),
    Charisma: (data.ancestry === 'gnome' ? 1 : 0) + (data.background === 'noble' ? 1 : 0) - (data.ancestry === 'dwarf' ? 1 : 0),
  };
  // Voluntary Flaws variant: subtract one per chosen flaw ability
  if (data.houseRules?.voluntaryFlaws && Array.isArray(data.voluntaryFlaws)) {
    for (const ab of data.voluntaryFlaws) {
      accumulated[ab] = (accumulated[ab] || 0) - 1;
    }
  }
  const cls = CLASSES.find(c => c.slug === data.class);
  if (cls?.keyAbility?.length) accumulated[cls.keyAbility[0]] = (accumulated[cls.keyAbility[0]] || 0) + 1;
  const scores = {};
  for (const ab of ABILITIES) {
    let score = 10 + (accumulated[ab] || 0) * 2;
    const batches = data.boostBatches || {};
    for (const lvl of Object.keys(batches).sort((a, b) => +a - +b)) {
      const free = batches[lvl]?.[ab] || 0;
      if (free > 0) score += score >= 18 ? 1 : 2;
    }
    // Voluntary Flaws: bonus boost (counts toward batch 1 if user has flaws set)
    if (data.houseRules?.voluntaryFlaws && (data.voluntaryFlaws?.length === 2) && data.voluntaryFlawBoost === ab) {
      score += score >= 18 ? 1 : 2;
    }
    scores[ab] = score;
  }
  return scores;
};

export const modOf = (score) => Math.floor((score - 10) / 2);
export const fmtMod = (m) => (m >= 0 ? '+' : '') + m;
