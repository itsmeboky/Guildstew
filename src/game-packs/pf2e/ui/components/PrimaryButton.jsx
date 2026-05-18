// Filled oxblood action button. Used for primary CTAs (Continue, Forge, etc.).
// Verbatim from prototype.

import React from 'react';

const PrimaryButton = ({ children, onClick, disabled = false, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative px-6 py-3 font-display tracking-[0.2em] text-sm uppercase transition-all
                ${disabled
                  ? 'bg-pf-bg-elev text-pf-stone/40 cursor-not-allowed'
                  : 'bg-pf-oxblood text-pf-bone hover:bg-pf-oxblood-glow hover:shadow-[0_0_24px_-8px_rgba(200,50,62,0.6)]'}
                ${className}`}
  >
    {children}
  </button>
);

export default PrimaryButton;
