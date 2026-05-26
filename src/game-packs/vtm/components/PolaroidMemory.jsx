// Read-only polaroid used in the Concept memory-lane (the system
// supplies the photo). Falls back to the dashed-border <Art>
// placeholder when no image URL is wired yet, so a missing entry
// in MEMORY_PHOTOS is obvious during development.

import React from 'react';
import Art from './Art.jsx';

export default function PolaroidMemory({ image, description, rotate = 0, size = 180, tapeColor = '#c9b98e' }) {
  return (
    <div style={{
      background: '#f5ecda',
      padding: `${size * 0.07}px ${size * 0.07}px ${size * 0.09}px`,
      boxShadow: `0 14px 36px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)`,
      transform: `rotate(${rotate}deg)`, position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: -10, left: '40%',
        width: size * 0.28, height: 20, background: tapeColor, opacity: 0.75,
        transform: 'rotate(-6deg)', boxShadow: `0 2px 4px rgba(0,0,0,0.4)`,
      }} />
      {image ? (
        <div style={{
          width: size, height: size * 1.2,
          backgroundImage: `url("${image}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: `1px solid #3a2818`,
        }} />
      ) : (
        <Art label="MEMORY" description={description}
          dimensions={`${size} × ${Math.round(size * 1.2)}`}
          style={{ width: size, height: size * 1.2, background: '#1a0a14', border: `1px solid #3a2818`, padding: 8 }} />
      )}
    </div>
  );
}
