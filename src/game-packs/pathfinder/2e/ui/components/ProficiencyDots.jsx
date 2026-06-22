// PF2e proficiency dot ladder. Five diamonds, filled up to `tier` (0–4).
// Verbatim from prototype.

import React from 'react';

const ProficiencyDots = ({ tier = 0 }) => (
  <span className="inline-flex gap-[3px] items-center">
    {[0, 1, 2, 3, 4].map(i => (
      <span
        key={i}
        className={`w-2 h-2 ${i <= tier ? 'bg-pf-brass' : 'bg-pf-brass-dim/20 border border-pf-brass-dim/40'}`}
        style={{ transform: 'rotate(45deg)' }}
      />
    ))}
  </span>
);

export default ProficiencyDots;
