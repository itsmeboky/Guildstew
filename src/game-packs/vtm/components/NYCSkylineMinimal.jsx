// Stylized New York skyline silhouetted across the bottom 22 vh of
// the viewport. Five overlapping polygon strips with scattered
// gold/cyan/blood-neon point-lights gridded onto them, then faded
// to opaque black at the bottom via the skyFade gradient. Pure
// decoration, position:fixed, pointer-events:none.

import React from 'react';
import { V } from '../theme/colors.js';

export default function NYCSkylineMinimal({ opacity = 0.4 }) {
  return (
    <svg viewBox="0 0 1600 200" preserveAspectRatio="xMidYMax slice"
      style={{ position: 'fixed', bottom: 0, left: 0, width: '100vw', height: '22vh', pointerEvents: 'none', opacity, zIndex: 0 }}>
      <defs>
        <linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={V.bg} stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <g fill="#000" opacity="0.85">
        <polygon points="0,200 0,150 60,150 65,135 120,135 125,145 180,145 185,125 240,125 245,140 300,140 305,135 360,135 365,150 420,150 420,200" />
        <polygon points="420,200 420,140 480,140 485,120 545,120 550,135 610,135 620,105 680,105 685,125 740,125 745,140 800,140 800,200" />
        <polygon points="800,200 800,130 860,130 865,105 925,105 935,90 990,90 995,120 1050,120 1055,135 1110,135 1110,200" />
        <polygon points="1110,200 1110,135 1170,135 1175,115 1230,115 1235,130 1290,130 1295,140 1350,140 1355,125 1420,125 1420,200" />
        <polygon points="1420,200 1420,135 1480,135 1485,115 1540,115 1545,135 1600,135 1600,200" />
      </g>
      <g opacity="0.85">
        {[
          [50, 175, V.gold], [110, 175, V.cyan], [170, 170, V.gold], [230, 180, V.gold], [430, 110, V.bloodNeon],
          [510, 165, V.gold], [560, 175, V.cyan], [720, 110, V.cyan], [800, 120, V.bloodNeon], [920, 115, V.gold],
          [1130, 130, V.cyan], [1240, 140, V.bloodNeon], [1310, 120, V.gold], [1420, 125, V.gold], [85, 190, V.cyan],
          [225, 192, V.gold], [510, 188, V.bloodNeon], [780, 188, V.cyan], [1010, 190, V.gold], [1280, 188, V.cyan],
        ].map(([x, y, c], i) => <circle key={i} cx={x} cy={y} r="1.3" fill={c} opacity="0.85" />)}
      </g>
      <rect x="0" y="0" width="1600" height="200" fill="url(#skyFade)" />
    </svg>
  );
}
