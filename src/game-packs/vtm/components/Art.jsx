// Developer-mode placeholder for missing imagery. Renders a dashed
// blood-on-cyan gradient panel with the asset's intended label and
// description, so missing/unmapped art is obvious during development
// without breaking the layout. Once every asset is wired to a real
// Supabase URL, this component is unused — kept for the
// PolaroidMemory fallback (touchstone photo wall) and for any
// future asset slot that hasn't been filled yet.

import React from 'react';
import { Camera } from 'lucide-react';
import { V } from '../theme/colors.js';

export default function Art({ width = '100%', height = 200, label, description, dimensions, style = {} }) {
  return (
    <div style={{
      width, height,
      background: `linear-gradient(135deg, ${V.bloodInk}40 0%, ${V.cyanDeep}30 50%, ${V.bloodInk}40 100%)`,
      border: `2px dashed ${V.bloodBri}80`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden',
      ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 30% 30%, ${V.bloodBri}20 0%, transparent 60%)`,
        pointerEvents: 'none',
      }} />
      <Camera size={28} color={V.bloodBri} style={{ opacity: 0.7, position: 'relative', zIndex: 1 }} />
      <div className="f-mono" style={{ fontSize: 10, color: V.bloodBri, marginTop: 10, letterSpacing: '0.25em', position: 'relative', zIndex: 1 }}>
        ART · {label}
      </div>
      {description && (
        <div style={{ fontSize: 12, color: V.textMuted, textAlign: 'center', marginTop: 6, maxWidth: 320, lineHeight: 1.4, position: 'relative', zIndex: 1 }}>
          {description}
        </div>
      )}
      {dimensions && (
        <div className="f-mono" style={{ fontSize: 9, color: V.textDim, marginTop: 8, letterSpacing: '0.2em', position: 'relative', zIndex: 1 }}>
          {dimensions}
        </div>
      )}
    </div>
  );
}
