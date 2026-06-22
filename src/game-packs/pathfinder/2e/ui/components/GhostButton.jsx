// Outline-only secondary button. Verbatim from prototype.

import React from 'react';

const GhostButton = ({ children, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 font-display tracking-[0.2em] text-sm uppercase text-pf-stone hover:text-pf-bone border border-pf-brass-dim/30 hover:border-pf-brass transition-all ${className}`}
  >
    {children}
  </button>
);

export default GhostButton;
