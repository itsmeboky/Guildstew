// Five stacked background layers behind the creator:
//   z=-4  solid base color
//   z=-3  always-on noise / cross-hatch texture pattern
//   z=-2  random seamless tile (bgUrl is one of BACKGROUND_IMAGES,
//         picked once per character-creation session)
//   z=-1  clan-tinted top-to-bottom gradient overlay (overlayAccent
//         is a clan accent picked once per session in the parent,
//         same useMemo pattern as bgUrl). Darkens the tile and
//         flavors the page with the player's chosen clan color
//         so the pattern stops fighting the polaroids / anatomical
//         figure for attention.
//   z=-1  light radial + linear gradient vignette for legibility
//         (source-order-after the overlay, same z = stacks on top)
//
// All layers are position:fixed and pointer-events:none so the
// scrolling step content above is unaffected. The overlay's accent
// defaults to V.bloodBri if no clan color was provided so the
// layer still renders during the first frame before clans load.

import React from 'react';
import { V } from '../theme/colors.js';

export default function BackgroundLayer({ bgUrl, overlayAccent }) {
  const accent = overlayAccent || V.bloodBri;

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

      {/* Layer 4: Clan-tinted top-to-bottom darkening overlay.
          60% opacity so the tile is muted but still readable as
          texture. Bottom anchors to V.bg (the same near-black the
          base layer uses) so the page hue lands on the existing
          palette. */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: -1,
        background: `linear-gradient(180deg, ${accent} 0%, ${V.bg} 100%)`,
        opacity: 0.6,
        pointerEvents: 'none',
      }} />

      {/* Layer 5: Light gradient vignette for legibility */}
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
