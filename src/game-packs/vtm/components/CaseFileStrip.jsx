// Case-file strip — the redacted-document slab that sits behind a
// narrative or instructional blurb in the VTM creator. Lifts the
// text off the patterned background so it's actually readable.
//
// Visual: a near-opaque ink panel with a small per-instance rotation
// (between -2° and +2°, picked once via useMemo so it doesn't dance
// on every render — same pattern as the existing creator's
// pseudo-random tile/gradient rotations). A soft drop-shadow makes
// the strip read as a physical label pinned over the surface.
//
// What to wrap: chapter-intro blurbs ("Tonight you bury who you
// were…"), section-framing instructions ("Click any skill to cycle
// its rating"), and the closing flavor lines. Anything that's
// narrative or instructional text.
//
// What NOT to wrap: decorative chapter titles, form-field labels,
// small-caps mono ribbons, polaroid captions, body content inside
// summary cards. Those have their own styling and stacking another
// frame on them just adds noise.

import React, { useMemo } from 'react';
import { V } from '../theme/colors.js';

export default function CaseFileStrip({
  children,
  fontSize = 16,
  accent,
  className = '',
  style = {},
}) {
  // Per-instance rotation, fixed for the component's lifetime. The
  // empty dep array is the whole point — re-randomizing on every
  // render would make the strips flicker each time a parent rerendered.
  const rotation = useMemo(() => (Math.random() * 4) - 2, []);
  return (
    <span
      className={`f-italic ${className}`}
      style={{
        display: 'inline-block',
        // Near-opaque ink panel. 0.88 alpha is high enough that the
        // patterned background doesn't bleed through and compete with
        // the text, while a hint of transparency keeps the strip from
        // looking like a flat-painted box on top of the scene.
        background: accent || 'rgba(8, 4, 12, 0.88)',
        color: V.textBri,
        padding: '10px 22px',
        transform: `rotate(${rotation}deg)`,
        boxShadow: '0 4px 14px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.35)',
        border: `1px solid ${V.edgeGold}`,
        lineHeight: 1.45,
        maxWidth: '720px',
        fontSize,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
