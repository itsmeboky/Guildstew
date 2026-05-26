// Tiny floating identity badge in the top-right corner — once the
// player has uploaded a portrait, their name + clan + circular
// portrait follow them through the rest of the chapters so the
// character feels present even on attribute/skill screens.

import React from 'react';
import { V } from '../theme/colors.js';
import { CLANS } from '../data/clans.js';

export default function CharacterWitness({ character }) {
  if (!character.portrait) return null;
  return (
    <div style={{
      position: 'fixed', top: 28, right: 28, zIndex: 4,
      display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none',
    }}>
      <div style={{ textAlign: 'right' }}>
        <div className="f-mono" style={{ fontSize: 9, color: V.cyan, letterSpacing: '0.28em' }}>THE CHILDE</div>
        <div className="f-decorative" style={{ fontSize: 16, color: V.textBri, fontWeight: 700, marginTop: 2 }}>
          {character.name || 'Unnamed'}
        </div>
        {character.clan && (
          <div className="f-italic" style={{ fontSize: 12, color: V.textMuted, marginTop: 1 }}>
            {CLANS.find((c) => c.id === character.clan)?.name}
          </div>
        )}
      </div>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        border: `2px solid ${V.bloodBri}`, overflow: 'hidden', background: V.bg,
        boxShadow: `0 0 20px ${V.bloodBri}50, 0 4px 12px rgba(0,0,0,0.6)`,
      }}>
        <img src={character.portrait} alt="witness" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </div>
  );
}
