// Larger proficiency row variant used on the Class step. Accepts either
// a numeric rank 0-4 (Foundry-native) or a tier label string ("Trained",
// "Expert", ...) and renders both the label and the dot ladder.

import React from 'react';
import ProficiencyDots from './ProficiencyDots.jsx';
import { tierToIndex, PROFICIENCY_TIER_LABELS } from '../../rules/proficiency.js';

const toIndex = (tier) => {
  if (typeof tier === 'number') return tier;
  if (typeof tier === 'string') {
    const idx = tierToIndex(tier);
    return idx >= 0 ? idx : 0;
  }
  return 0;
};

const ProfRow = ({ label, tier }) => {
  const idx = toIndex(tier);
  const tierLabel = PROFICIENCY_TIER_LABELS[idx];
  return (
    <div className="flex items-center justify-between py-1 border-b border-pf-brass-dim/10">
      <span className="text-pf-parchment">{label}</span>
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[10px] text-pf-stone">{tierLabel}</span>
        <ProficiencyDots tier={idx} />
      </div>
    </div>
  );
};

export default ProfRow;
