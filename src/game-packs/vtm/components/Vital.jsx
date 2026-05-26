// One stat block (label + big number) used in the Embrace step's
// final stat row. `accent` colors the number and its glow.

import React from 'react';
import { V } from '../theme/colors.js';
import Label from './Label.jsx';

export default function Vital({ label, value, accent }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 70 }}>
      <div style={{
        fontSize: 32, color: accent, lineHeight: 1, fontWeight: 700,
        textShadow: `0 0 12px ${accent}60`,
      }}>
        {value}
      </div>
      <Label color={V.textMuted} style={{ fontSize: 9, marginTop: 6, marginBottom: 0 }}>
        {label}
      </Label>
    </div>
  );
}
