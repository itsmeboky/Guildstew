// CHAPTER VII — Anchors. Up to three touchstone polaroids. Each
// card carries a B&W photo, the touchstone's name, a "who they
// are to you" line, and a single Conviction the character refuses
// to cross while that touchstone is alive.
//
// V5 rule: 1-3 touchstones at character creation. The picker
// enforces that — the "+ ADD POLAROID" tile only renders while
// touchstones.length < 3.

import React from 'react';
import { Heart, Plus } from 'lucide-react';
import { V } from '../theme/colors.js';
import AmbientGlow from '../components/AmbientGlow.jsx';
import AmbientBats from '../components/AmbientBats.jsx';
import CharacterWitness from '../components/CharacterWitness.jsx';
import Art from '../components/Art.jsx';
import PolaroidCard from '../components/PolaroidCard.jsx';

export default function StepTouchstones({ character, update, uploadTouchstone }) {
  const touchstones = character.touchstones || [];
  const updateTouchstone = (idx, key, value) => {
    const next = [...touchstones];
    next[idx] = { ...next[idx], [key]: value };
    update({ touchstones: next });
  };
  const addTouchstone = () => {
    if (touchstones.length >= 3) return;
    update({ touchstones: [...touchstones, { name: '', description: '', conviction: '' }] });
  };
  const removeTouchstone = (idx) => update({ touchstones: touchstones.filter((_, i) => i !== idx) });

  return (
    <div className="scene-in" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '60px 32px 140px' }}>
      <Art label="SCENE · BRICK WALL"
        description="Dark exposed brick wall, like a Brooklyn warehouse. Slight grunge, atmospheric lighting."
        dimensions="1920 × 1080"
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', border: 'none', opacity: 0.18, zIndex: 0, padding: 0 }} />
      <AmbientGlow red={0.2} teal={0.12} />
      <AmbientBats />
      <CharacterWitness character={character} />

      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', zIndex: 2 }}>
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="f-mono" style={{ fontSize: 11, color: V.cyan, letterSpacing: '0.4em', marginBottom: 12 }}>CHAPTER VII · THE ANCHORS</div>
          <h1 className="outline-text" style={{ fontSize: 'clamp(48px, 7vw, 84px)', lineHeight: 0.95, fontWeight: 900, margin: 0 }}>WHO KEEPS YOU HUMAN</h1>
          <p className="f-italic" style={{ fontSize: 17, color: V.textMuted, marginTop: 14, maxWidth: 640, margin: '14px auto 0' }}>
            One to three mortals keep you from drowning. Each carries a Conviction — the line you refuse to cross while they live.
          </p>
        </div>

        {touchstones.length === 0 && (
          <div className="fade-up-1 cut-md" style={{
            background: V.glassDeep, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: `1px dashed ${V.edgeRedDim}`, padding: 60, textAlign: 'center',
            maxWidth: 600, margin: '0 auto',
          }}>
            <Heart size={36} color={V.textMuted} style={{ marginBottom: 16, opacity: 0.6 }} />
            <p className="f-italic" style={{ color: V.textMuted, fontSize: 17, margin: '0 0 22px 0' }}>The wall is empty. The Beast notices.</p>
            <button onClick={addTouchstone} className="cut-sm"
              style={{
                background: V.blood, border: `1px solid ${V.bloodBri}`,
                color: V.textBri, padding: '12px 28px', cursor: 'pointer',
                fontSize: 12, letterSpacing: '0.22em', fontWeight: 700,
                boxShadow: `0 0 20px ${V.bloodBri}40`,
              }}>
              + PIN FIRST POLAROID
            </button>
          </div>
        )}

        {touchstones.length > 0 && (
          <div className="fade-up-1" style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, padding: '20px 40px',
          }}>
            {touchstones.map((ts, idx) => (
              <PolaroidCard key={idx} idx={idx} ts={ts}
                onUpdate={(key, value) => updateTouchstone(idx, key, value)}
                onRemove={() => removeTouchstone(idx)}
                onUploadImage={uploadTouchstone}
                rotate={(idx - 1) * 3} />
            ))}
            {touchstones.length < 3 && (
              <button onClick={addTouchstone}
                style={{
                  background: 'transparent', border: `2px dashed ${V.edgeRedDim}`,
                  color: V.textMuted, padding: '40px 20px', cursor: 'pointer',
                  fontSize: 13, letterSpacing: '0.2em', fontWeight: 600,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  minHeight: 360, transform: `rotate(${(touchstones.length - 1) * 3}deg)`,
                  fontFamily: "'Inter', sans-serif",
                }}>
                <Plus size={28} />
                ADD POLAROID
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
