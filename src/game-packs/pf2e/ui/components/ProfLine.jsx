// One row of the class proficiency summary: label, tier name, dot ladder.
// Accepts numeric rank (0-4) or string tier label.

import React from 'react';
import ProficiencyDots from './ProficiencyDots.jsx';
import { PROFICIENCY_TIER_LABELS } from '../../rules/proficiency.js';

const ProfLine = ({ label, tier }) => {
  if (tier === undefined || tier === null) return null;
  let idx;
  if (typeof tier === 'number') {
    idx = tier;
  } else if (typeof tier === 'string') {
    idx = ['untrained', 'trained', 'expert', 'master', 'legendary']
      .indexOf(tier.split(' ')[0].toLowerCase());
    if (idx < 0) idx = 0;
  } else {
    idx = 0;
  }
  const tierLabel = PROFICIENCY_TIER_LABELS[idx] || 'Untrained';
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="capitalize">{label.replace(/([A-Z])/g, ' $1').trim()}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] text-pf-stone">{tierLabel}</span>
        <ProficiencyDots tier={idx} />
      </div>
    </div>
  );
};

export default ProfLine;
