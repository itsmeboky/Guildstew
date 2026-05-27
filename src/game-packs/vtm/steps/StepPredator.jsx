// CHAPTER VI — Hunt. NYC map on the left with ten pinned predator
// types; details panel on the right shows the picked type's pitch,
// pool, grants, and cost. A fallback list under the detail panel
// catches any pin the player can't see at a glance (helps on
// small screens).
//
// Blood Leech carries a `notice: 'STORYTELLER APPROVAL'` warning —
// the picker just renders that banner in the detail panel; the
// modal confirmation flow lives in VTMCharacterCreator.jsx, which
// listens for `predatorType` changes and pops the gate before the
// state actually commits.

import React from 'react';
import { MapPin } from 'lucide-react';
import { V } from '../theme/colors.js';
import { PREDATOR_TYPES } from '../data/predatorTypes.js';
import { HUNT_MAP } from '../data/assets.js';
import AmbientGlow from '../components/AmbientGlow.jsx';
import AmbientBats from '../components/AmbientBats.jsx';
import CharacterWitness from '../components/CharacterWitness.jsx';
import Label from '../components/Label.jsx';
import PredatorChoiceResolver from '../components/PredatorChoiceResolver.jsx';

function PredatorDetail({ predator }) {
  const Icon = predator.sigil;
  return (
    <div className="cut-md fade-up" style={{
      background: V.glassDeep, backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      border: `1px solid ${V.bloodBri}50`, padding: 22, position: 'relative', overflow: 'hidden',
      boxShadow: `0 0 30px ${V.bloodBri}20, inset 0 0 60px ${V.bloodInk}40`,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 10% 0%, ${V.bloodBri}25 0%, transparent 60%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div className="cut-sm" style={{
            width: 40, height: 40, background: V.bloodInk, border: `1px solid ${V.bloodBri}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 16px ${V.bloodBri}40`,
          }}>
            <Icon size={18} color={V.bloodNeon} />
          </div>
          <div>
            <div className="f-mono" style={{ fontSize: 9, color: V.cyan, letterSpacing: '0.25em' }}>{predator.neighborhood}</div>
            <div className="f-decorative" style={{ fontSize: 22, color: V.textBri, fontWeight: 700, lineHeight: 1, letterSpacing: '0.06em' }}>{predator.name.toUpperCase()}</div>
          </div>
        </div>
        {predator.notice && (
          <div className="f-mono" style={{ background: V.bloodInk, border: `1px solid ${V.bloodNeon}40`, padding: '6px 10px', fontSize: 9, color: V.bloodNeon, letterSpacing: '0.2em', marginBottom: 12, textAlign: 'center' }}>
            ⚠ {predator.notice}
          </div>
        )}
        <p className="f-italic" style={{ margin: '0 0 14px 0', fontSize: 14, color: V.text, lineHeight: 1.5 }}>{predator.pitch}</p>
        <div style={{ marginBottom: 12 }}>
          <Label color={V.cyan} style={{ fontSize: 9 }}>Hunting Pool</Label>
          <div style={{ fontSize: 14, color: V.textMuted, lineHeight: 1.4 }}>{predator.pool}</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label color={V.gold} style={{ fontSize: 9 }}>Grants</Label>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {predator.grants.map((g, i) => (
              <li key={i} style={{ fontSize: 14, color: V.text, padding: '3px 0 3px 12px', position: 'relative', lineHeight: 1.5 }}>
                <span style={{ position: 'absolute', left: 0, top: 9, width: 4, height: 4, background: V.gold, boxShadow: `0 0 6px ${V.gold}` }} />
                {g}
              </li>
            ))}
          </ul>
        </div>
        {predator.cost.length > 0 && (
          <div>
            <Label color={V.bloodNeon} style={{ fontSize: 9 }}>Cost</Label>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {predator.cost.map((c, i) => (
                <li key={i} style={{ fontSize: 14, color: V.text, padding: '3px 0 3px 12px', position: 'relative', lineHeight: 1.5 }}>
                  <span style={{ position: 'absolute', left: 0, top: 9, width: 4, height: 4, background: V.bloodNeon, boxShadow: `0 0 6px ${V.bloodNeon}` }} />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StepPredator({ character, update, requestPredatorPick }) {
  const selected = PREDATOR_TYPES.find((p) => p.id === character.predatorType);
  // requestPredatorPick is the parent-supplied wrapper that runs
  // the storyteller-approval gate for Blood Leech before committing
  // the new type. When not provided (preview / standalone) the
  // picker writes the field directly so the rest of the step still
  // demos cleanly.
  const choose = (id) => {
    if (requestPredatorPick) requestPredatorPick(id);
    else update({ predatorType: id });
  };

  const setResolutions = (next) => update({ predatorResolutions: next });

  return (
    <div className="scene-in" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '60px 32px 140px' }}>
      <AmbientGlow red={0.2} teal={0.18} />
      <AmbientBats />
      <CharacterWitness character={character} />

      <div style={{ position: 'relative', maxWidth: 1400, margin: '0 auto', zIndex: 2 }}>
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="f-mono" style={{ fontSize: 11, color: V.cyan, letterSpacing: '0.4em', marginBottom: 12 }}>CHAPTER VI · THE HUNT</div>
          <h1 className="outline-text" style={{ fontSize: 'clamp(48px, 7vw, 84px)', lineHeight: 0.95, fontWeight: 900, margin: 0 }}>HUNTING GROUNDS</h1>
        </div>

        <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'flex-start' }}>
          <div style={{
            position: 'relative',
            background: V.glassDeep, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${V.edgeGold}`, aspectRatio: '4/5',
            backgroundImage: `url("${HUNT_MAP}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: `inset 0 0 80px rgba(0,0,0,0.6)`,
          }} className="cut-md">
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at center, transparent 40%, rgba(3, 2, 10, 0.5) 100%)`,
              pointerEvents: 'none',
            }} />
            {PREDATOR_TYPES.map((pred) => {
              const isSelected = character.predatorType === pred.id;
              return (
                <button key={pred.id} onClick={() => choose(pred.id)}
                  style={{
                    position: 'absolute',
                    left: `${pred.coord.x}%`, top: `${pred.coord.y}%`,
                    transform: 'translate(-50%, -100%)',
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                    zIndex: isSelected ? 3 : 2,
                  }}>
                  <div style={{
                    width: isSelected ? 36 : 24, height: isSelected ? 36 : 24, borderRadius: '50%',
                    background: isSelected ? V.bloodNeon : V.blood,
                    border: `2px solid ${isSelected ? V.textBri : V.bloodBri}`,
                    boxShadow: isSelected
                      ? `0 0 24px ${V.bloodNeon}, 0 0 60px ${V.bloodBri}80, 0 4px 12px rgba(0,0,0,0.8)`
                      : `0 0 12px ${V.bloodBri}80, 0 2px 6px rgba(0,0,0,0.6)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s ease',
                  }}>
                    <pred.sigil size={isSelected ? 18 : 12} color={V.textBri} />
                  </div>
                  <div style={{ width: 2, height: 8, background: isSelected ? V.bloodNeon : V.bloodBri, margin: '0 auto', boxShadow: `0 0 6px ${V.bloodBri}` }} />
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {selected ? <PredatorDetail predator={selected} /> : (
              <div className="cut-md" style={{
                background: V.glassDeep, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${V.edgeRedDim}`, padding: 32, textAlign: 'center',
              }}>
                <MapPin size={32} color={V.textDim} style={{ marginBottom: 14, opacity: 0.6 }} />
                <p className="f-italic" style={{ color: V.textMuted, fontSize: 16, margin: 0, lineHeight: 1.55 }}>
                  Click a pin on the map. Each neighborhood holds a different way to feed.
                </p>
              </div>
            )}

            {selected && (
              <PredatorChoiceResolver
                predatorType={selected}
                resolutions={character.predatorResolutions || {}}
                onChange={setResolutions}
              />
            )}

            <div className="cut-md" style={{
              background: V.glass, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${V.edgeRedDim}`, padding: 14, maxHeight: 280, overflowY: 'auto',
            }}>
              <Label color={V.cyan} style={{ marginBottom: 8 }}>All Hunting Grounds</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {PREDATOR_TYPES.map((p) => {
                  const isSelected = character.predatorType === p.id;
                  const Icon = p.sigil;
                  return (
                    <button key={p.id} onClick={() => choose(p.id)} className="cut-sm"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: isSelected ? `${V.bloodBri}20` : 'transparent',
                        border: `1px solid ${isSelected ? V.bloodBri : 'transparent'}`,
                        padding: '6px 10px', cursor: 'pointer',
                        color: isSelected ? V.textBri : V.textMuted,
                        fontSize: 13, textAlign: 'left', transition: 'all 0.2s ease',
                        fontWeight: isSelected ? 600 : 400,
                      }}>
                      <Icon size={12} color={isSelected ? V.bloodNeon : V.cyan} />
                      <span style={{ flex: 1 }}>{p.name}</span>
                      <span className="f-mono" style={{ fontSize: 9, color: V.gold, opacity: 0.6 }}>
                        {p.neighborhood.split('·')[0].trim().slice(0, 12)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
