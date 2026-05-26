// Bloody-red lacy ornaments anchored to the four screen corners.
// Rotates slowly (180 s / full revolution) at 18 % opacity; clockwise
// at the top-left and bottom-right, counter-clockwise at the other
// two so the eye doesn't track a single motion. The pattern itself
// is per-chapter — STEP_PATTERN_KEYS in theme/lacyPatterns.js maps
// the step index to a key in LACY_PATTERNS.

import React from 'react';
import { V } from '../theme/colors.js';
import { LACY_PATTERNS, STEP_PATTERN_KEYS } from '../theme/lacyPatterns.js';

function LacyCorner({ pattern, position, color = V.bloodBri, opacity = 0.18, size = 460, rotateCCW = false }) {
  const placement = {
    tl: { top: -size / 2, left: -size / 2 },
    tr: { top: -size / 2, right: -size / 2 },
    bl: { bottom: -size / 2, left: -size / 2 },
    br: { bottom: -size / 2, right: -size / 2 },
  }[position];
  const baseRotate = { tl: 0, tr: 90, br: 180, bl: 270 }[position];
  return (
    <div style={{
      position: 'fixed', ...placement, width: size, height: size,
      pointerEvents: 'none', zIndex: 1, opacity, color,
      transform: `rotate(${baseRotate}deg)`,
    }}>
      <div style={{
        width: '100%', height: '100%',
        animation: `${rotateCCW ? 'lacyRotateCCW' : 'lacyRotateCW'} 180s linear infinite`,
      }}>
        <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%' }}>
          {pattern}
        </svg>
      </div>
    </div>
  );
}

export default function LacyCorners({ step }) {
  const patternKey = STEP_PATTERN_KEYS[step] || 'concept';
  const pattern = LACY_PATTERNS[patternKey];
  return (
    <>
      <LacyCorner pattern={pattern} position="tl" />
      <LacyCorner pattern={pattern} position="tr" rotateCCW />
      <LacyCorner pattern={pattern} position="bl" rotateCCW />
      <LacyCorner pattern={pattern} position="br" />
    </>
  );
}
