// Spell slots / known by rank for a given level (simplified PF2e progression).
// Verbatim from the prototype.

import HIGHEST_SPELL_RANK from './highest-spell-rank.js';
import CASTING_TRADITION_BY_CLASS from '../casting-traditions.json';

const SPELLS_KNOWN_BY_RANK = (level, classId) => {
  if (!CASTING_TRADITION_BY_CLASS[classId]) return {};
  const slots = { cantrips: 5 };
  // Standard progression: 2 slots at the level it unlocks, 3 the next, 4 thereafter
  for (let r = 1; r <= HIGHEST_SPELL_RANK(level); r++) {
    const unlockLevel = (r - 1) * 2 + 1;
    const lvlsSince = level - unlockLevel;
    if (lvlsSince < 0) continue;
    if (r === HIGHEST_SPELL_RANK(level) && r > 1 && level === unlockLevel) slots[r] = 2;
    else if (r === HIGHEST_SPELL_RANK(level) && r > 1) slots[r] = Math.min(3, 1 + lvlsSince);
    else slots[r] = lvlsSince === 0 ? 2 : lvlsSince === 1 ? 3 : 4;
  }
  return slots;
};

export default SPELLS_KNOWN_BY_RANK;
