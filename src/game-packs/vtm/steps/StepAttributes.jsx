// CHAPTER III — Anatomy. Three columns of attribute cards
// (Physical / Mental as the rail, Social on the right; Mental
// sits in a row beneath when the viewport pushes the layout) with
// the anatomy figure between Physical + Social. The priority
// summary widget below the figure tracks how many 4 / 3 / 2 / 1
// values the player has assigned and highlights over-allocations
// in blood-neon.
//
// V5 ATTRIBUTE_PRIORITY: exactly one 4, three 3s, four 2s, one 1.

import React from 'react';
import { V } from '../theme/colors.js';
import { ATTRIBUTE_CATEGORIES, ATTRIBUTE_PRIORITY } from '../data/attributes.js';
import { ANATOMY_FIGURE } from '../data/assets.js';
import AmbientGlow from '../components/AmbientGlow.jsx';
import NYCSkylineMinimal from '../components/NYCSkylineMinimal.jsx';
import AmbientBats from '../components/AmbientBats.jsx';
import CharacterWitness from '../components/CharacterWitness.jsx';
import Dots from '../components/Dots.jsx';
import Label from '../components/Label.jsx';

function AttrCard({ attr, character, setAttr }) {
  return (
    <div className="cut-sm v-card" style={{
      background: V.glass, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: `1px solid ${V.edgeRedDim}`, padding: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: V.text, fontWeight: 500 }}>{attr}</span>
        <Dots value={character.attributes[attr] || 1} />
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((v) => {
          const active = character.attributes[attr] === v;
          return (
            <button key={v} onClick={() => setAttr(attr, v)} className="cut-sm"
              style={{
                flex: 1, background: active ? V.bloodBri : 'transparent',
                border: `1px solid ${active ? V.bloodBri : V.edgeRedDim}`,
                color: active ? V.textBri : V.textMuted,
                padding: '4px 0', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                transition: 'all 0.2s ease',
                boxShadow: active ? `0 0 12px ${V.bloodBri}60` : 'none',
              }}>
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AttributeColumn({ category, attrs, character, setAttr }) {
  return (
    <div>
      <Label color={V.cyan} style={{ textAlign: 'center', marginBottom: 14 }}>{category}</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {attrs.map((attr) => <AttrCard key={attr} attr={attr} character={character} setAttr={setAttr} />)}
      </div>
    </div>
  );
}

export default function StepAttributes({ character, update }) {
  const setAttr = (name, value) => update({ attributes: { ...character.attributes, [name]: value } });
  const counts = { 4: 0, 3: 0, 2: 0, 1: 0 };
  Object.values(character.attributes).forEach((v) => { if (counts[v] !== undefined) counts[v]++; });

  return (
    <div className="scene-in" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '60px 32px 140px' }}>
      <AmbientGlow red={0.18} teal={0.14} />
      <NYCSkylineMinimal opacity={0.25} />
      <AmbientBats />
      <CharacterWitness character={character} />

      <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', zIndex: 2 }}>
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="f-mono" style={{ fontSize: 11, color: V.cyan, letterSpacing: '0.4em', marginBottom: 12 }}>
            CHAPTER III · THE ANATOMY
          </div>
          <h1 className="outline-text" style={{ fontSize: 'clamp(48px, 7vw, 84px)', lineHeight: 0.95, fontWeight: 900, margin: 0 }}>
            BODY · MIND · SOUL
          </h1>
        </div>

        <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 280px 1fr', gap: 24, alignItems: 'flex-start' }}>
          <AttributeColumn category="Physical" attrs={ATTRIBUTE_CATEGORIES.Physical} character={character} setAttr={setAttr} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{
              height: 580, width: '100%',
              backgroundImage: `url("${ANATOMY_FIGURE}")`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center top',
              boxShadow: `0 12px 36px rgba(0,0,0,0.6)`,
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
            }} />
            <div className="cut-sm" style={{
              background: V.glassDeep, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${V.edgeRedDim}`, padding: 14, width: '100%',
            }}>
              <Label color={V.cyan} style={{ textAlign: 'center' }}>Priorities</Label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[4, 3, 2, 1].map((tier) => {
                  const ok = counts[tier] === ATTRIBUTE_PRIORITY[tier];
                  const over = counts[tier] > ATTRIBUTE_PRIORITY[tier];
                  return (
                    <div key={tier} style={{ textAlign: 'center' }}>
                      <div className="f-mono" style={{ fontSize: 9, color: V.gold, letterSpacing: '0.18em' }}>●{tier > 1 ? '×' + tier : ''}</div>
                      <div style={{ fontSize: 18, color: over ? V.bloodNeon : ok ? V.cyan : V.text, fontWeight: 700 }}>
                        {counts[tier]}/{ATTRIBUTE_PRIORITY[tier]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <AttributeColumn category="Social" attrs={ATTRIBUTE_CATEGORIES.Social} character={character} setAttr={setAttr} />
        </div>

        <div className="fade-up-2" style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 800, margin: '24px auto 0' }}>
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginBottom: 8 }}>
            <Label color={V.cyan}>Mental</Label>
          </div>
          {ATTRIBUTE_CATEGORIES.Mental.map((attr) => (
            <AttrCard key={attr} attr={attr} character={character} setAttr={setAttr} />
          ))}
        </div>
      </div>
    </div>
  );
}
