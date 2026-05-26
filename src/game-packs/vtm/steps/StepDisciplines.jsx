// CHAPTER V — Gifts. The player allocates two dots between the
// three in-clan disciplines (one-per-clan; no out-of-clan picks
// here — those happen at later experience spends). A pulsing
// clan-sigil ritual circle sits above the three cards.
//
// BUDGET = 2 is the V5 starting allotment. setDots clamps to that
// total across the three values.

import React from 'react';
import { Wand2 } from 'lucide-react';
import { V } from '../theme/colors.js';
import { CLANS } from '../data/clans.js';
import { DISCIPLINES } from '../data/disciplines.js';
import AmbientGlow from '../components/AmbientGlow.jsx';
import AmbientBats from '../components/AmbientBats.jsx';
import CharacterWitness from '../components/CharacterWitness.jsx';
import Dots from '../components/Dots.jsx';
import Label from '../components/Label.jsx';

export default function StepDisciplines({ character, update }) {
  const clan = CLANS.find((c) => c.id === character.clan);
  if (!clan) {
    return (
      <div style={{ minHeight: '100vh', padding: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 500 }}>
          <Wand2 size={48} color={V.textDim} style={{ marginBottom: 18, opacity: 0.5 }} />
          <h2 className="f-decorative" style={{ fontSize: 28, color: V.text, margin: 0 }}>NO BLOODLINE</h2>
          <p className="f-italic" style={{ color: V.textMuted, fontSize: 16, marginTop: 14 }}>
            Choose a clan in Chapter II. The Disciplines wait for blood that knows their name.
          </p>
        </div>
      </div>
    );
  }

  const totalDots = Object.values(character.disciplines).reduce((a, b) => a + b, 0);
  const BUDGET = 2;
  const setDots = (disc, value) => {
    const others = Object.entries(character.disciplines).filter(([d]) => d !== disc).reduce((a, b) => a + b[1], 0);
    if (others + value > BUDGET) return;
    update({ disciplines: { ...character.disciplines, [disc]: value } });
  };

  const Sigil = clan.sigil;

  return (
    <div className="scene-in" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '60px 32px 140px' }}>
      <div style={{
        position: 'fixed', inset: 0,
        background: `radial-gradient(circle at center 45%, ${clan.accent}25 0%, transparent 40%), radial-gradient(circle at center 45%, ${V.bloodInk}60 0%, transparent 25%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />
      <AmbientGlow red={0.3} teal={0.1} />
      <AmbientBats />
      <CharacterWitness character={character} />

      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', zIndex: 2 }}>
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="f-mono" style={{ fontSize: 11, color: clan.accent, letterSpacing: '0.4em', marginBottom: 12 }}>
            CHAPTER V · {clan.name.toUpperCase()} GIFTS
          </div>
          <h1 className="outline-red" style={{ fontSize: 'clamp(48px, 7vw, 84px)', lineHeight: 0.95, fontWeight: 900, margin: 0 }}>
            INHUMAN GIFTS
          </h1>
          <p className="f-italic" style={{ fontSize: 17, color: V.textMuted, marginTop: 12, maxWidth: 640, margin: '12px auto 0' }}>
            Two dots among the clan's powers. Pour both into one, or split them. Every gift becomes a need.
          </p>
        </div>

        <div className="fade-up-1" style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{
            width: 140, height: 140, borderRadius: '50%',
            background: `radial-gradient(circle, ${clan.accent}40 0%, ${V.bgDeep} 70%)`,
            border: `2px solid ${clan.accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'sigilPulse 3s ease-in-out infinite',
            boxShadow: `0 0 60px ${clan.accent}60`, position: 'relative',
          }}>
            <Sigil size={56} color={clan.accent} />
            <div style={{ position: 'absolute', inset: -16, border: `1px solid ${clan.accent}40`, borderRadius: '50%', animation: 'glowPulse 4s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', inset: -32, border: `1px dashed ${clan.accent}20`, borderRadius: '50%' }} />
          </div>
        </div>

        <div className="fade-up-2 cut-md" style={{
          background: V.glassDeep, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${clan.accent}40`,
          padding: 16, marginBottom: 24, maxWidth: 320, margin: '0 auto 24px', textAlign: 'center',
        }}>
          <Label color={V.cyan}>Gifts Allocated</Label>
          <div style={{ fontSize: 28, color: totalDots === BUDGET ? V.cyan : V.text, fontWeight: 700, lineHeight: 1 }}>
            {totalDots} / {BUDGET}
          </div>
        </div>

        <div className="fade-up-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {clan.disciplines.map((disc) => {
            const value = character.disciplines[disc] || 0;
            return (
              <div key={disc} className="cut-md v-card" style={{
                background: V.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${value > 0 ? clan.accent : V.edgeRedDim}`,
                padding: 22, position: 'relative', overflow: 'hidden',
                boxShadow: value > 0 ? `0 0 30px ${clan.accent}30, inset 0 0 60px ${V.bloodInk}40` : 'none',
              }}>
                {value > 0 && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `radial-gradient(circle at center top, ${clan.accent}20 0%, transparent 60%)`,
                    pointerEvents: 'none',
                  }} />
                )}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div className="f-decorative" style={{
                    fontSize: 20, color: value > 0 ? V.textBri : V.text, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8,
                    textShadow: value > 0 ? `0 0 12px ${clan.accent}60` : 'none',
                  }}>
                    {disc.toUpperCase()}
                  </div>
                  <p className="f-italic" style={{ margin: '0 0 16px 0', fontSize: 13, color: V.textMuted, lineHeight: 1.5, minHeight: 60 }}>
                    {DISCIPLINES[disc]}
                  </p>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    {[0, 1, 2].map((dotVal) => (
                      <button key={dotVal} onClick={() => setDots(disc, dotVal)} className="cut-sm"
                        style={{
                          background: value === dotVal ? V.bloodBri : 'transparent',
                          border: `1px solid ${value === dotVal ? V.bloodBri : V.edgeRedDim}`,
                          color: value === dotVal ? V.textBri : V.textMuted,
                          padding: '8px 22px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                          transition: 'all 0.2s ease',
                          boxShadow: value === dotVal ? `0 0 14px ${V.bloodBri}60` : 'none',
                        }}>
                        {dotVal}
                      </button>
                    ))}
                  </div>
                  {value > 0 && <div style={{ marginTop: 12, textAlign: 'center' }}><Dots value={value} max={2} size={11} /></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
