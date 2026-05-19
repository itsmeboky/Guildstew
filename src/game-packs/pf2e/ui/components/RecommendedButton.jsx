// Compact "★ Use Recommended" button that lives in section headers.
// Renders in a visible disabled state when no recommendation is
// available for the current class (instead of hiding) so the
// affordance is always present — players learn the button exists
// even before content covers every class. The tooltip carries the
// "not yet available" explanation; the click handler is gated by
// the native `disabled` attribute.

import React from 'react';
import { Star } from 'lucide-react';

const RecommendedButton = ({ onClick, disabled, title }) => {
  const baseClass = 'inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-display tracking-wider uppercase border transition-colors';
  const activeClass   = 'border-pf-brass text-pf-bone hover:bg-pf-brass/15 cursor-pointer';
  const disabledClass = 'border-pf-brass-dim/30 text-pf-stone/60 cursor-not-allowed';
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={!!disabled}
      title={title || (disabled
        ? 'Recommendation not yet available for this class'
        : 'Apply the recommended new-player picks for this class')}
      className={`${baseClass} ${disabled ? disabledClass : activeClass}`}
    >
      <Star size={11} className={disabled ? 'text-pf-stone/60' : 'text-pf-brass'} />
      Use Recommended
    </button>
  );
};

export default RecommendedButton;
