// Section heading with brass divider lines on either side of the label.
// Verbatim from prototype.

import React from 'react';

const SectionHeader = ({ children, className = '' }) => (
  <div className={`flex items-center gap-3 mb-4 ${className}`}>
    <span className="h-px bg-pf-brass-dim/40 w-6" />
    <h3 className="font-display tracking-[0.25em] text-xs text-pf-brass uppercase">{children}</h3>
    <span className="h-px bg-pf-brass-dim/40 flex-1" />
  </div>
);

export default SectionHeader;
