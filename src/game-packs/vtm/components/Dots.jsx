// V5 dot rating display — `value` filled circles out of `max`,
// rendered as glowing blood-bright orbs with a thin red rim on
// empty slots. Verbatim from the prototype's Dots() helper.
//
// The pf2e pack ships its own ProficiencyDots (square brass tiles,
// max=5 tier ladder) — fork rather than reuse because the visual
// is fundamentally different.

import React from 'react';
import { V } from '../theme/colors.js';

export default function Dots({ value, max = 5, size = 9, filled = V.bloodBri, empty = V.edgeRed }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{
          width: size, height: size, borderRadius: '50%',
          background: i < value ? filled : 'transparent',
          border: `1px solid ${i < value ? filled : empty}`,
          display: 'inline-block',
          boxShadow: i < value ? `0 0 6px ${filled}80` : 'none',
          transition: 'all 0.3s ease',
        }} />
      ))}
    </span>
  );
}
