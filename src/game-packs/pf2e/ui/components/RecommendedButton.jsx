// Compact "★ Use Recommended" button that lives in section headers.
// Hides itself if `disabled` is set (e.g., the current class has no
// curated build for this section yet).

import React from 'react';
import { Star } from 'lucide-react';

const RecommendedButton = ({ onClick, disabled, title }) => {
  if (disabled) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || 'Apply the recommended new-player picks for this class'}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-display tracking-wider uppercase
                 border border-pf-brass text-pf-bone hover:bg-pf-brass/15 transition-colors"
    >
      <Star size={11} className="text-pf-brass" />
      Use Recommended
    </button>
  );
};

export default RecommendedButton;
