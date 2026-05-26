// Renders one card per unresolved predator-type choice on Step VI.
// Two choice shapes are supported, matching the parser output in
// rules/predatorBonuses.js:
//
//   { kind: 'or', options: [...] }
//     Pill-button group. User picks exactly one. Resolution stored
//     as { picked: <index> }.
//
//   { kind: 'distribute', budget, targets: [...] }
//     Per-target [−] / dots / [+] row, with budget counter. User
//     allocates exactly `budget` dots, capped at each target's
//     max. Resolution stored as { distribution: [<dots>, ...] }.
//
// The resolver is purely controlled — it owns no internal state.
// The parent (Step VI / VTMCharacterCreator) stores resolutions on
// character.predatorResolutions and passes the slice in.
//
// Visual styling matches the rest of Step VI: glass surfaces,
// cut-md clip-path, V.bloodBri accents. Dots reuses the same
// component the Advantages step uses for consistency.

import React from 'react';
import { V } from '../theme/colors.js';
import { parsePredatorGrants, isResolutionComplete } from '../rules/predatorBonuses.js';
import Dots from './Dots.jsx';
import Label from './Label.jsx';

function OrChoice({ choice, resolution, onChange }) {
  const picked = typeof resolution?.picked === 'number' ? resolution.picked : null;
  return (
    <div>
      <Label color={V.cyan} style={{ marginBottom: 10 }}>{choice.prompt}</Label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {choice.options.map((opt, i) => {
          const active = picked === i;
          return (
            <button key={i} onClick={() => onChange({ picked: i })} className="cut-sm"
              style={{
                flex: '1 1 0', minWidth: 140,
                background: active ? V.blood : 'transparent',
                border: `1px solid ${active ? V.bloodBri : V.edgeRedDim}`,
                color: active ? V.textBri : V.textMuted,
                padding: '10px 14px', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif", fontSize: 13,
                letterSpacing: '0.06em', fontWeight: 600, textAlign: 'left',
                transition: 'all 0.2s ease',
                boxShadow: active ? `0 0 14px ${V.bloodBri}50` : 'none',
              }}>
              {renderOptionLabel(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function renderOptionLabel(opt) {
  if (opt.kind === 'discipline') return `${opt.target} (•)`;
  if (opt.kind === 'specialty')  return opt.value;
  if (opt.kind === 'background') return `${capitalize(opt.target)} (${'•'.repeat(opt.dots)})`;
  if (opt.kind === 'flaw')       return opt.value || opt.target;
  return JSON.stringify(opt);
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function DistributeChoice({ choice, resolution, onChange }) {
  const distribution = Array.isArray(resolution?.distribution)
    ? resolution.distribution
    : choice.targets.map(() => 0);
  const spent = distribution.reduce((a, b) => a + b, 0);
  const remaining = choice.budget - spent;

  const adjust = (i, delta) => {
    const next = [...distribution];
    const target = choice.targets[i];
    const cap = target.max ?? 3;
    const newVal = next[i] + delta;
    if (newVal < 0 || newVal > cap) return;
    if (delta > 0 && remaining <= 0) return;
    next[i] = newVal;
    onChange({ distribution: next });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <Label color={V.cyan} style={{ marginBottom: 0 }}>{choice.prompt}</Label>
        <span className="f-mono" style={{
          fontSize: 11,
          color: remaining === 0 ? V.cyan : remaining > 0 ? V.gold : V.bloodNeon,
          letterSpacing: '0.2em', fontWeight: 600,
        }}>
          {spent} / {choice.budget}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {choice.targets.map((target, i) => {
          const value = distribution[i] || 0;
          const cap = target.max ?? 3;
          return (
            <div key={i} className="cut-sm" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: value > 0 ? V.glass : 'transparent',
              border: `1px solid ${value > 0 ? V.edgeRedDim : 'transparent'}`,
              padding: '6px 10px',
              transition: 'all 0.2s ease',
            }}>
              <span style={{ flex: 1, fontSize: 13, color: V.text }}>
                {capitalize(target.target)}
              </span>
              <button onClick={() => adjust(i, -1)} disabled={value === 0} className="cut-sm"
                style={{
                  width: 24, height: 24, background: 'transparent',
                  border: `1px solid ${value === 0 ? V.edgeRedDim : V.bloodBri}`,
                  color: value === 0 ? V.textDim : V.text,
                  cursor: value === 0 ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600,
                }}>−</button>
              <div style={{ minWidth: 50, display: 'flex', justifyContent: 'center' }}>
                <Dots value={value} max={cap} size={8} />
              </div>
              <button onClick={() => adjust(i, +1)} disabled={value >= cap || remaining <= 0} className="cut-sm"
                style={{
                  width: 24, height: 24, background: 'transparent',
                  border: `1px solid ${value >= cap || remaining <= 0 ? V.edgeRedDim : V.bloodBri}`,
                  color: value >= cap || remaining <= 0 ? V.textDim : V.text,
                  cursor: value >= cap || remaining <= 0 ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600,
                }}>+</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PredatorChoiceResolver({ predatorType, resolutions, onChange }) {
  const parsed = React.useMemo(() => parsePredatorGrants(predatorType), [predatorType]);
  if (!predatorType || parsed.choices.length === 0) return null;

  const complete = isResolutionComplete(parsed, resolutions);

  const setOne = (id, next) => {
    onChange({ ...resolutions, [id]: next });
  };

  return (
    <div className="cut-md fade-up" style={{
      background: V.glassDeep, backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      border: `1px solid ${complete ? V.cyan : V.bloodBri}80`,
      padding: 22, position: 'relative', overflow: 'hidden',
      boxShadow: complete
        ? `0 0 24px ${V.cyan}30, inset 0 0 60px ${V.cyanDeep}40`
        : `0 0 30px ${V.bloodBri}20, inset 0 0 60px ${V.bloodInk}40`,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 10% 0%, ${complete ? V.cyan : V.bloodBri}20 0%, transparent 60%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="f-mono" style={{
          fontSize: 10, color: complete ? V.cyan : V.bloodNeon,
          letterSpacing: '0.28em', marginBottom: 16, fontWeight: 600,
        }}>
          {complete ? '✓ CHOICES RESOLVED' : '◆ RESOLVE YOUR HUNT'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {parsed.choices.map((choice) => (
            <div key={choice.id}>
              {choice.kind === 'or' && (
                <OrChoice choice={choice} resolution={resolutions[choice.id]} onChange={(next) => setOne(choice.id, next)} />
              )}
              {choice.kind === 'distribute' && (
                <DistributeChoice choice={choice} resolution={resolutions[choice.id]} onChange={(next) => setOne(choice.id, next)} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
