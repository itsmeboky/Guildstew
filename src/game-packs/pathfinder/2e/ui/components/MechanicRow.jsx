// One labeled mechanic row (e.g. "Hit Points 10 + CON"). 32-char label column,
// value right-aligned. Verbatim from prototype.

import React from 'react';

const MechanicRow = ({ label, value, highlight }) => (
  <div className="flex items-baseline gap-4 py-2 border-b border-pf-brass-dim/15">
    <span className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase w-32 shrink-0">{label}</span>
    <span className={`${highlight ? 'text-pf-bone' : 'text-pf-parchment'}`}>{value}</span>
  </div>
);

export default MechanicRow;
