// Per-chapter decorative SVG patterns rendered at the four screen
// corners. Verbatim from the prototype's LACY_PATTERNS object. Each
// entry is a <g> fragment in a 400×400 viewBox; LacyCorner.jsx
// places one in each corner at 460×460 (so it bleeds off-screen)
// and slow-rotates it (180 s/turn, alternating direction per
// corner) at 18% opacity in blood-bright red.
//
// STEP_PATTERN_KEYS maps step index → pattern key. The mapping is
// hand-picked by the prototype designer and not derived from the
// STEPS array — keep them in lockstep manually.

import React from 'react';

export const LACY_PATTERNS = {
  concept: (
    <g stroke="currentColor" strokeWidth="0.6" fill="none">
      <circle cx="200" cy="200" r="60" />
      <circle cx="200" cy="200" r="50" strokeDasharray="3,4" />
      <circle cx="200" cy="200" r="80" strokeDasharray="1,8" />
      <path d="M 200 140 Q 230 170 200 200 Q 170 170 200 140 Z" fill="currentColor" opacity="0.3" />
      <path d="M 200 200 Q 240 240 280 250 Q 310 240 320 220" />
      <path d="M 200 200 Q 160 240 120 250 Q 90 240 80 220" />
      <path d="M 200 200 Q 240 160 280 150 Q 310 160 320 180" />
      <path d="M 200 200 Q 160 160 120 150 Q 90 160 80 180" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x = 200 + Math.cos(rad) * 105;
        const y = 200 + Math.sin(rad) * 105;
        return <circle key={angle} cx={x} cy={y} r="2" fill="currentColor" />;
      })}
      <path d="M 130 130 Q 200 100 270 130 Q 300 200 270 270 Q 200 300 130 270 Q 100 200 130 130 Z" />
    </g>
  ),
  bloodline: (
    <g stroke="currentColor" strokeWidth="0.6" fill="none">
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse key={angle} cx="200" cy="200" rx="25" ry="45" transform={`rotate(${angle} 200 200)`} />
      ))}
      <circle cx="200" cy="200" r="12" fill="currentColor" opacity="0.4" />
      <path d="M 200 130 Q 240 130 260 150 Q 280 170 280 200" />
      <path d="M 200 270 Q 160 270 140 250 Q 120 230 120 200" />
      <path d="M 130 200 Q 130 160 150 140 Q 170 120 200 120" />
      <path d="M 270 200 Q 270 240 250 260 Q 230 280 200 280" />
      {[[160, 140], [240, 140], [240, 260], [160, 260]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d="M 0 -6 L 3 0 L 0 6 L -3 0 Z" fill="currentColor" opacity="0.5" />
        </g>
      ))}
      <path d="M 100 200 Q 100 120 200 100" strokeDasharray="3,4" />
      <path d="M 300 200 Q 300 280 200 300" strokeDasharray="3,4" />
    </g>
  ),
  anatomy: (
    <g stroke="currentColor" strokeWidth="0.6" fill="none">
      <circle cx="200" cy="200" r="80" />
      <circle cx="200" cy="200" r="60" strokeDasharray="2,3" />
      <circle cx="200" cy="200" r="100" strokeDasharray="1,6" />
      {[0, 30, 60, 90, 120, 150].map((angle) => (
        <line key={angle} x1="200" y1="200" x2="200" y2="100" transform={`rotate(${angle} 200 200)`} />
      ))}
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x = 200 + Math.cos(rad) * 40;
        const y = 200 + Math.sin(rad) * 40;
        return <circle key={angle} cx={x} cy={y} r="2" fill="currentColor" />;
      })}
      <rect x="130" y="130" width="140" height="140" transform="rotate(45 200 200)" />
    </g>
  ),
  education: (
    <g stroke="currentColor" strokeWidth="0.6" fill="none">
      <path d="M 100 100 Q 150 80 200 100 Q 250 120 280 150 Q 310 180 300 220 Q 290 260 250 280 Q 210 300 170 290 Q 130 280 110 240 Q 90 200 100 160 Q 105 130 100 100 Z" />
      <path d="M 130 130 Q 170 110 210 130 Q 250 150 260 180 Q 270 220 240 250 Q 210 280 170 270 Q 140 260 130 220 Q 125 180 130 130 Z" strokeDasharray="3,4" />
      {[[140, 80], [260, 130], [310, 230], [220, 290], [85, 200]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="8" ry="14" transform={`rotate(${i * 60} ${x} ${y})`} />
      ))}
      <circle cx="200" cy="200" r="10" fill="currentColor" opacity="0.4" />
    </g>
  ),
  gifts: (
    <g stroke="currentColor" strokeWidth="0.6" fill="none">
      <circle cx="200" cy="200" r="80" />
      <circle cx="200" cy="200" r="70" strokeDasharray="1,4" />
      <path d="M 200 130 L 248 250 L 144 178 L 256 178 L 152 250 Z" />
      <circle cx="200" cy="200" r="110" strokeDasharray="2,8" />
      {[[200, 130], [248, 250], [144, 178], [256, 178], [152, 250]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="currentColor" opacity="0.6" />
      ))}
    </g>
  ),
  hunt: (
    <g stroke="currentColor" strokeWidth="0.6" fill="none">
      <circle cx="200" cy="200" r="80" />
      <circle cx="200" cy="200" r="50" strokeDasharray="2,3" />
      <path d="M 200 120 L 210 200 L 200 280 L 190 200 Z" fill="currentColor" opacity="0.3" />
      <path d="M 120 200 L 200 190 L 280 200 L 200 210 Z" fill="currentColor" opacity="0.3" />
      <path d="M 145 145 L 195 195 L 245 145 L 205 195 Z" strokeDasharray="2,2" />
      {[[200, 105], [295, 200], [200, 295], [105, 200]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="currentColor" />
      ))}
      <circle cx="200" cy="200" r="100" strokeDasharray="1,6" />
    </g>
  ),
  anchors: (
    <g stroke="currentColor" strokeWidth="0.6" fill="none">
      <path d="M 200 230 L 170 200 Q 150 180 170 160 Q 190 145 200 165 Q 210 145 230 160 Q 250 180 230 200 Z" />
      <path d="M 100 200 Q 120 130 200 110 Q 280 130 300 200 Q 280 270 200 290 Q 120 270 100 200 Z" />
      <path d="M 130 200 Q 145 150 200 140 Q 255 150 270 200 Q 255 250 200 260 Q 145 250 130 200 Z" strokeDasharray="2,3" />
      {[[200, 110], [290, 200], [200, 290], [110, 200]].map(([x, y], i) => (
        <path key={i} d="M 0 6 L -8 -2 Q -14 -8 -8 -14 Q 0 -18 0 -10 Q 0 -18 8 -14 Q 14 -8 8 -2 Z"
          transform={`translate(${x} ${y})`} fill="currentColor" opacity="0.3" />
      ))}
    </g>
  ),
  connections: (
    <g stroke="currentColor" strokeWidth="0.8" fill="none">
      {[{ cx: 200, cy: 140 }, { cx: 260, cy: 200 }, { cx: 200, cy: 260 }, { cx: 140, cy: 200 }].map((c, i) => (
        <ellipse key={i} cx={c.cx} cy={c.cy} rx="30" ry="18" transform={`rotate(${i * 45} ${c.cx} ${c.cy})`} />
      ))}
      <circle cx="200" cy="200" r="90" />
      <circle cx="200" cy="200" r="105" strokeDasharray="1,6" />
      <circle cx="200" cy="200" r="10" fill="currentColor" opacity="0.5" />
    </g>
  ),
  embrace: (
    <g stroke="currentColor" strokeWidth="0.7" fill="none">
      <path d="M 130 220 L 270 220 L 280 240 L 120 240 Z" />
      <path d="M 130 220 L 140 170 L 160 200 L 175 150 L 200 200 L 225 150 L 240 200 L 260 170 L 270 220" />
      {[140, 175, 200, 225, 260].map((x, i) => (
        <circle key={i} cx={x} cy={i % 2 === 0 ? 175 : 155} r="3" fill="currentColor" opacity="0.6" />
      ))}
      <circle cx="200" cy="200" r="100" />
      <circle cx="200" cy="200" r="110" strokeDasharray="3,3" />
      <path d="M 120 240 Q 200 280 280 240" strokeDasharray="2,3" />
    </g>
  ),
};

// Maps step index → pattern key. Hand-aligned with STEPS in
// ../data/steps.js — keep them in sync when adding chapters.
export const STEP_PATTERN_KEYS = [
  'concept', 'bloodline', 'anatomy', 'education', 'gifts',
  'hunt', 'anchors', 'connections', 'embrace',
];
