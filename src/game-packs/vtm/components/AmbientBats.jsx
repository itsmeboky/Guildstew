// Four bats crossing the screen on staggered keyframes (batFly1/2/3
// + a delayed batFly1). Each one flaps via the nested batFlap
// animation while it translates. All four are position:fixed and
// pointer-events:none — purely decorative.

import React from 'react';

function Bat({ animation }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: 30, height: 18, pointerEvents: 'none', zIndex: 3, animation: `${animation} linear infinite` }}>
      <svg viewBox="0 0 30 18" style={{ width: '100%', height: '100%', animation: 'batFlap 0.32s ease-in-out infinite', transformOrigin: 'center' }}>
        <path d="M 15 8 C 13 6, 11 4, 9 4 C 7 4, 5 5, 3 4 C 2 3, 1 3, 1 5 C 1 7, 2 8, 4 9 C 6 10, 8 9, 10 10 C 12 11, 13 9, 15 10 C 17 9, 18 11, 20 10 C 22 9, 24 10, 26 9 C 28 8, 29 7, 29 5 C 29 3, 28 3, 27 4 C 25 5, 23 4, 21 4 C 19 4, 17 6, 15 8 Z" fill="#000" />
        <ellipse cx="15" cy="8" rx="1.5" ry="2.5" fill="#000" />
      </svg>
    </div>
  );
}

export default function AmbientBats() {
  return (
    <>
      <Bat animation="batFly1 22s 0s" />
      <Bat animation="batFly2 28s 8s" />
      <Bat animation="batFly3 20s 14s" />
      <Bat animation="batFly1 24s 18s" />
    </>
  );
}
