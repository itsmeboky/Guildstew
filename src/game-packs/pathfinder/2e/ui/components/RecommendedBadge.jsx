// Tiny ★ chip that decorates a picker slot when it was auto-filled by
// the "Use Recommended" button. Editing the slot removes the badge.

import React from 'react';

const RecommendedBadge = ({ className = '' }) => (
  <span
    title="Auto-applied by Use Recommended"
    className={`inline-flex items-center px-1 text-[9px] font-mono uppercase tracking-wider text-pf-brass border border-pf-brass/40 bg-pf-brass/10 ${className}`}
  >
    ★ rec
  </span>
);

export default RecommendedBadge;
