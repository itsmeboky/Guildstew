// Bottom step navigator. Back button on the left, current chapter
// title + segmented progress bar in the center, Continue (or
// "Embrace" on the penultimate step) on the right.
//
// The pf2e pack ships its own BottomBar with a brass/oxblood
// palette and a different step-indicator shape — fork rather than
// share. Per-step navigation rules and `canNext` gating live in
// the parent (VTMCharacterCreator); this component only renders.

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { V } from '../theme/colors.js';
import { STEPS } from '../data/steps.js';

export default function NavBar({ step, total, onBack, onNext, canNext = true, nextLabel = 'CONTINUE' }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      padding: '16px 32px',
      background: `linear-gradient(to top, ${V.bg} 0%, ${V.bg}E0 60%, transparent 100%)`,
      pointerEvents: 'none',
    }}>
      <div style={{
        maxWidth: 1400, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, pointerEvents: 'auto',
      }}>
        <button onClick={onBack} disabled={step === 0} className="v-btn cut-sm"
          style={{
            background: V.glassDeep, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${V.edgeRedDim}`,
            color: step === 0 ? V.textDim : V.textMuted,
            padding: '12px 22px', cursor: step === 0 ? 'not-allowed' : 'pointer',
            fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: '0.22em',
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
            opacity: step === 0 ? 0.4 : 1,
          }}>
          <ChevronLeft size={14} /> BACK
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="f-mono" style={{ fontSize: 10, color: V.cyan, letterSpacing: '0.3em' }}>{STEPS[step].num}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{
                width: i === step ? 22 : 8, height: 2,
                background: i === step ? V.bloodNeon : i < step ? V.cyan : V.edgeRedDim,
                transition: 'all 0.4s ease',
                boxShadow: i === step ? `0 0 8px ${V.bloodNeon}` : 'none',
              }} />
            ))}
          </div>
          <span className="f-mono" style={{ fontSize: 10, color: V.gold, letterSpacing: '0.3em' }}>{STEPS[step].name.toUpperCase()}</span>
        </div>
        <button onClick={onNext} disabled={!canNext || step === total - 1} className="v-btn cut-sm"
          style={{
            background: step === total - 1 ? V.glassDeep : V.blood,
            backdropFilter: step === total - 1 ? 'blur(20px)' : 'none',
            border: `1px solid ${step === total - 1 ? V.edgeRedDim : V.bloodBri}`,
            color: step === total - 1 ? V.textDim : V.textBri,
            padding: '12px 28px', cursor: !canNext || step === total - 1 ? 'not-allowed' : 'pointer',
            fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: '0.22em',
            fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
            opacity: !canNext || step === total - 1 ? 0.4 : 1,
            boxShadow: !canNext || step === total - 1 ? 'none' : `0 0 24px ${V.bloodBri}50`,
          }}>
          {nextLabel} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
