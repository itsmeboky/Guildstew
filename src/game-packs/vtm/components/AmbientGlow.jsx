// Two large radial-gradient glow blobs (red top-right, cyan
// bottom-left) that breathe via glowPulse. Used on the brighter
// scenes (Embrace, the clan reveal) — the per-step `red` / `teal`
// opacity is overridden per-mount to dial intensity.

import React from 'react';
import { V } from '../theme/colors.js';

export default function AmbientGlow({ red = 0.25, teal = 0.18 }) {
  const redHex = Math.round(red * 100).toString(16).padStart(2, '0');
  const tealHex = Math.round(teal * 100).toString(16).padStart(2, '0');
  return (
    <>
      <div style={{
        position: 'fixed', top: '-15%', right: '-10%', width: '55vw', height: '55vw',
        background: `radial-gradient(circle, ${V.bloodBri}${redHex} 0%, transparent 65%)`,
        pointerEvents: 'none', zIndex: 0, animation: 'glowPulse 14s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', bottom: '5%', left: '-15%', width: '60vw', height: '60vw',
        background: `radial-gradient(circle, ${V.cyan}${tealHex} 0%, transparent 60%)`,
        pointerEvents: 'none', zIndex: 0, animation: 'glowPulse 18s ease-in-out infinite 4s',
      }} />
    </>
  );
}
