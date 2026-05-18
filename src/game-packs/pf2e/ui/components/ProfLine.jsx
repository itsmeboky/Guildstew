// One row of the class proficiency summary: label, tier name, dot ladder.
// Returns null if no tier is set. Verbatim from prototype.

import React from 'react';
import ProficiencyDots from './ProficiencyDots.jsx';

const ProfLine = ({ label, tier }) => {
  if (!tier) return null;
  const tierLabel = typeof tier === 'string' ? tier.charAt(0).toUpperCase() + tier.slice(1) : tier;
  const idx = ['untrained', 'trained', 'expert', 'master', 'legendary'].indexOf(typeof tier === 'string' ? tier.split(' ')[0].toLowerCase() : 'untrained');
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="capitalize">{label.replace(/([A-Z])/g, ' $1').trim()}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] text-pf-stone">{tierLabel}</span>
        <ProficiencyDots tier={idx >= 0 ? idx : 0} />
      </div>
    </div>
  );
};

export default ProfLine;
