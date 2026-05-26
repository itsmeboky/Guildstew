// Four stacked background layers behind the creator:
//   z=-4  solid base color
//   z=-3  always-on noise / cross-hatch texture pattern
//   z=-2  random seamless tile (bgUrl is one of BACKGROUND_IMAGES,
//         picked once per character-creation session)
//   z=-1  light radial + linear gradient vignette for legibility
//
// All four are position:fixed and pointer-events:none so the scrolling
// step content above is unaffected.

import React from 'react';
import { V } from '../theme/colors.js';

export default function BackgroundLayer({ bgUrl }) {
  return (
    <>
      {/* Layer 1: Solid base color */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -4, background: V.bg }} />

      {/* Layer 2: Always-on texture pattern */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: -3,
        backgroundImage: `
          radial-gradient(rgba(196, 30, 58, 0.06) 1.5px, transparent 1.5px),
          radial-gradient(rgba(34, 211, 238, 0.04) 1px, transparent 1px),
          linear-gradient(45deg, transparent 49%, rgba(255, 255, 255, 0.025) 50%, transparent 51%),
          linear-gradient(135deg, transparent 49%, rgba(196, 30, 58, 0.02) 50%, transparent 51%)
        `,
        backgroundSize: '32px 32px, 48px 48px, 8px 8px, 8px 8px',
        backgroundPosition: '0 0, 16px 16px, 0 0, 0 0',
        pointerEvents: 'none',
      }} />

      {/* Layer 3: Seamless tile — no JS probe, browser handles it */}
      {bgUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: -2,
          backgroundImage: `url("${bgUrl}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: 'auto',
          backgroundAttachment: 'fixed',
          opacity: 0.85,
          pointerEvents: 'none',
        }} />
      )}

      {/* Layer 4: Light gradient vignette for legibility */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: -1,
        background: `
          linear-gradient(180deg, rgba(3, 2, 10, 0.25) 0%, rgba(3, 2, 10, 0.05) 40%, rgba(3, 2, 10, 0.4) 100%),
          radial-gradient(ellipse at center, transparent 50%, rgba(3, 2, 10, 0.3) 100%)
        `,
        pointerEvents: 'none',
      }} />
    </>
  );
}
