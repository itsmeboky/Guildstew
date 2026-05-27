// The serif/italic "compact-of-night" field used on Step I. A small
// preamble + accent-colored label sit above the textarea/input; the
// input itself uses Old Standard TT in italic to evoke handwritten
// blood-on-parchment.

import React from 'react';
import { V } from '../theme/colors.js';

export default function CompactField({ preamble, label, value, onChange, placeholder, multi = false, accent = V.gold }) {
  const Tag = multi ? 'textarea' : 'input';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span className="f-italic" style={{ fontSize: 15, color: V.textMuted }}>{preamble}</span>
        <span className="f-mono" style={{ fontSize: 10, color: accent, letterSpacing: '0.3em' }}>{label}</span>
      </div>
      <Tag
        className={multi ? 'v-textarea' : 'v-input'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={multi ? 2 : undefined}
        style={{
          background: 'rgba(8, 4, 12, 0.4)',
          border: `1px solid ${V.edgeGold}`,
          fontFamily: "'Old Standard TT', serif",
          fontSize: 18, fontStyle: 'italic',
          color: V.textBone, letterSpacing: '0.01em',
        }}
      />
    </div>
  );
}
