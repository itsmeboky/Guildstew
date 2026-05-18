// Proficiency tier table + bonus math. Supports the Proficiency Without Level
// variant (Gamemastery Guide): drop the level component, untrained becomes −2.

export const PROFICIENCY_TIERS = ['untrained', 'trained', 'expert', 'master', 'legendary'];
export const PROF_BONUS = { untrained: 0, trained: 2, expert: 4, master: 6, legendary: 8 };
export const PROF_TIER_INDEX = Object.fromEntries(PROFICIENCY_TIERS.map((t, i) => [t, i]));

// Display labels (title-cased) — separate from the lowercase machine keys above.
export const PROFICIENCY_TIER_LABELS = ['Untrained', 'Trained', 'Expert', 'Master', 'Legendary'];

export const tierToIndex = (label) => PROFICIENCY_TIER_LABELS.indexOf(label);

export const profBonus = (tier, level, opts = {}) => {
  const withoutLevel = !!opts.proficiencyWithoutLevel;
  if (!tier || tier === 'untrained') return withoutLevel ? -2 : 0;
  const tierBonus = PROF_BONUS[tier] || 0;
  return (withoutLevel ? 0 : level) + tierBonus;
};
