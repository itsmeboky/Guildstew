// Proficiency tier table + bonus math. Supports the Proficiency Without Level
// variant (Gamemastery Guide): drop the level component, untrained becomes −2.
//
// Accepts both representations in the wild:
//   - String labels: 'untrained' | 'trained' | 'expert' | 'master' | 'legendary'
//     (hand-curated class-details.json shape)
//   - Numeric ranks: 0 | 1 | 2 | 3 | 4
//     (imported classes.json shape — Foundry-native)
// `normalizeRank` collapses both into a numeric 0-4 so downstream math
// doesn't have to care which source the value came from.

export const PROFICIENCY_TIERS = ['untrained', 'trained', 'expert', 'master', 'legendary'];
export const PROF_BONUS = { untrained: 0, trained: 2, expert: 4, master: 6, legendary: 8 };
export const PROF_TIER_INDEX = Object.fromEntries(PROFICIENCY_TIERS.map((t, i) => [t, i]));

// Display labels (title-cased) — separate from the lowercase machine keys above.
export const PROFICIENCY_TIER_LABELS = ['Untrained', 'Trained', 'Expert', 'Master', 'Legendary'];

export const tierToIndex = (label) => PROFICIENCY_TIER_LABELS.indexOf(label);

export const normalizeRank = (tier) => {
  if (typeof tier === 'number') {
    return tier >= 0 && tier <= 4 ? tier : 0;
  }
  if (typeof tier === 'string') {
    const idx = PROFICIENCY_TIERS.indexOf(tier.toLowerCase());
    return idx >= 0 ? idx : 0;
  }
  return 0;
};

export const profBonus = (tier, level, opts = {}) => {
  const withoutLevel = !!opts.proficiencyWithoutLevel;
  const rank = normalizeRank(tier);
  if (rank === 0) return withoutLevel ? -2 : 0;
  const tierBonus = rank * 2; // 2 / 4 / 6 / 8 for trained / expert / master / legendary
  return (withoutLevel ? 0 : level) + tierBonus;
};
