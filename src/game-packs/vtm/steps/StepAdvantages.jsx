// CHAPTER VIII — Connections. The player allocates seven dots
// across eleven backgrounds (Allies, Contacts, Fame, Haven, Herd,
// Influence, Mask, Mawla, Resources, Retainers, Status). Each row
// caps at 3. The budget summary at the top tracks under/over
// allocation and prevents adding past 7.

import React from 'react';
import { V } from '../theme/colors.js';
import { BACKGROUNDS } from '../data/backgrounds.js';
import AmbientGlow from '../components/AmbientGlow.jsx';
import AmbientBats from '../components/AmbientBats.jsx';
import CharacterWitness from '../components/CharacterWitness.jsx';
import Art from '../components/Art.jsx';
import Dots from '../components/Dots.jsx';
import Label from '../components/Label.jsx';

export default function StepAdvantages({ character, update }) {
  const ADVANTAGE_BUDGET = 7;
  const totalSpent = Object.values(character.backgrounds || {}).reduce((a, b) => a + b, 0);
  const remaining = ADVANTAGE_BUDGET - totalSpent;
  const setBg = (id, value) => {
    if (value < 0 || value > 3) return;
    const newTotal = totalSpent - (character.backgrounds[id] || 0) + value;
    if (newTotal > ADVANTAGE_BUDGET) return;
    update({ backgrounds: { ...character.backgrounds, [id]: value } });
  };

  return (
    <div className="scene-in" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '60px 32px 140px' }}>
      <Art label="SCENE · CONTACT BOOK"
        description="An open leather-bound ledger or rolodex on a desk. Warm lamp light, scattered business cards, fountain pen."
        dimensions="1920 × 1080"
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', border: 'none', opacity: 0.14, zIndex: 0, padding: 0 }} />
      <AmbientGlow red={0.18} teal={0.14} />
      <AmbientBats />
      <CharacterWitness character={character} />

      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', zIndex: 2 }}>
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="f-mono" style={{ fontSize: 11, color: V.cyan, letterSpacing: '0.4em', marginBottom: 12 }}>CHAPTER VIII · CONNECTIONS</div>
          <h1 className="outline-text" style={{ fontSize: 'clamp(48px, 7vw, 84px)', lineHeight: 0.95, fontWeight: 900, margin: 0 }}>WHO ANSWERS</h1>
          <p className="f-italic" style={{ fontSize: 17, color: V.textMuted, marginTop: 14, maxWidth: 640, margin: '14px auto 0' }}>
            Seven dots' worth of leverage. The threads that tie you to the city.
          </p>
        </div>

        <div className="fade-up-1 cut-md" style={{
          background: V.glassDeep, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${V.edgeGold}`, padding: 16, marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          maxWidth: 500, margin: '0 auto 24px',
        }}>
          <div>
            <Label color={V.cyan}>Dots Spent</Label>
            <div style={{ fontSize: 28, color: remaining === 0 ? V.cyan : V.text, fontWeight: 700, lineHeight: 1 }}>
              {totalSpent} / {ADVANTAGE_BUDGET}
            </div>
          </div>
          <div className="f-italic" style={{ fontSize: 14, color: V.textMuted, textAlign: 'right' }}>
            {remaining > 0 ? `${remaining} unspent` : remaining === 0 ? 'All pulled' : 'Over budget'}
          </div>
        </div>

        <div className="fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {BACKGROUNDS.map((bg) => {
            const value = character.backgrounds[bg.id] || 0;
            return (
              <div key={bg.id} className="cut-md v-card" style={{
                background: V.glass, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${value > 0 ? V.bloodBri : V.edgeRedDim}`,
                padding: 14, boxShadow: value > 0 ? `0 0 16px ${V.bloodBri}30` : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div className="f-decorative" style={{ fontSize: 15, color: V.textBri, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 3 }}>
                      {bg.name.toUpperCase()}
                    </div>
                    <p className="f-italic" style={{ margin: 0, fontSize: 15, color: V.textMuted, lineHeight: 1.4 }}>{bg.desc}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setBg(bg.id, value - 1)} disabled={value === 0} className="cut-sm"
                      style={{
                        width: 24, height: 24, background: 'transparent',
                        border: `1px solid ${value === 0 ? V.edgeRedDim : V.bloodBri}`,
                        color: value === 0 ? V.textDim : V.text,
                        cursor: value === 0 ? 'not-allowed' : 'pointer',
                        fontSize: 13, fontWeight: 600,
                      }}>−</button>
                    <div style={{ minWidth: 50 }}><Dots value={value} max={3} size={8} /></div>
                    <button onClick={() => setBg(bg.id, value + 1)} disabled={remaining <= 0 || value >= 3} className="cut-sm"
                      style={{
                        width: 24, height: 24, background: 'transparent',
                        border: `1px solid ${remaining <= 0 || value >= 3 ? V.edgeRedDim : V.bloodBri}`,
                        color: remaining <= 0 || value >= 3 ? V.textDim : V.text,
                        cursor: remaining <= 0 || value >= 3 ? 'not-allowed' : 'pointer',
                        fontSize: 13, fontWeight: 600,
                      }}>+</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
