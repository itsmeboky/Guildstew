// Small all-caps tracked-out cyan label used throughout the
// creator (above field groups, on cards, etc.). Default color is
// the cyan accent — bone, gold, and muted tones are overridden at
// each call site.

import React from 'react';
import { V } from '../theme/colors.js';

export default function Label({ children, color = V.cyan, style }) {
  return (
    <div className="f-mono" style={{
      fontSize: 10, color, textTransform: 'uppercase',
      marginBottom: 8, letterSpacing: '0.28em', fontWeight: 500, ...style,
    }}>
      {children}
    </div>
  );
}
