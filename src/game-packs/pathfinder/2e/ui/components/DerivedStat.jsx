// Small bordered tile showing one derived stat (label above, value below).
// Used on the review/sheet step. Verbatim from prototype.

import React from 'react';

const DerivedStat = ({ label, value }) => (
  <div className="relative p-2 bg-pf-bg-elev border border-pf-brass-dim/30 text-center">
    <p className="font-display text-[9px] tracking-[0.15em] text-pf-brass uppercase">{label}</p>
    <p className="font-mono text-xl text-pf-bone leading-tight mt-0.5">{value}</p>
  </div>
);

export default DerivedStat;
