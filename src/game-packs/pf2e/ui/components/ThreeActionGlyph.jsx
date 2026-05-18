// PF2e three-action glyph. Renders the diamond symbols that mark Actions /
// Reactions / Free Actions on feats, abilities, and spells. Verbatim from prototype.

import React from 'react';

const ThreeActionGlyph = ({ count = 1, className = '' }) => {
  if (count === 'reaction') return <span className={`text-pf-brass font-mono ${className}`} title="Reaction">⟳</span>;
  if (count === 'free') return <span className={`text-pf-brass font-mono ${className}`} title="Free Action">◇</span>;
  if (count === 'passive' || count === '—' || count === 0) return <span className={`text-pf-stone/50 font-mono text-[10px] ${className}`} title="Passive ability">—</span>;
  return (
    <span className={`inline-flex gap-[2px] ${className}`} title={`${count} Action${count > 1 ? 's' : ''}`}>
      {[...Array(typeof count === 'number' ? count : 1)].map((_, i) => (
        <span key={i} className="text-pf-oxblood-glow leading-none" style={{ fontSize: '0.9em' }}>◆</span>
      ))}
    </span>
  );
};

export default ThreeActionGlyph;
