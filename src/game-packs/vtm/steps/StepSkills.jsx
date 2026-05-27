// CHAPTER IV — Education. Three grimoire cards across the top
// (Jack of All Trades / Balanced / Specialist) auto-distribute
// the player's existing skill ratings into the picked
// distribution; the player can then click any skill row to nudge
// individual ratings up by 1 (wraps at 4 → 0). The compact tier
// summary tracks under/over-allocation against the active
// approach.
//
// "auto-distribute" sorts existing skills by current rating
// descending and refills the highest-rated slots first — re-picking
// an approach therefore preserves the player's preferred ordering
// where possible.

import React from 'react';
import { V } from '../theme/colors.js';
import { SKILL_APPROACHES, SKILL_CATEGORIES, ALL_SKILLS } from '../data/skills.js';
import { GRIMOIRES } from '../data/assets.js';
import AmbientGlow from '../components/AmbientGlow.jsx';
import AmbientBats from '../components/AmbientBats.jsx';
import CharacterWitness from '../components/CharacterWitness.jsx';
import Art from '../components/Art.jsx';
import Dots from '../components/Dots.jsx';
import Label from '../components/Label.jsx';

export default function StepSkills({ character, update }) {
  const setApproach = (key) => {
    const dist = SKILL_APPROACHES[key].dist;
    const sorted = [...ALL_SKILLS].sort((a, b) => (character.skills[b] || 0) - (character.skills[a] || 0));
    const newSkills = {};
    const tiers = Object.keys(dist).map(Number).sort((a, b) => b - a);
    let idx = 0;
    tiers.forEach((tier) => {
      for (let i = 0; i < dist[tier]; i++) {
        if (idx < sorted.length) { newSkills[sorted[idx]] = tier; idx++; }
      }
    });
    update({ skills: newSkills, skillApproach: key });
  };
  const cycleSkill = (skill) => {
    const current = character.skills[skill] || 0;
    let next = current + 1;
    if (next > 4) next = 0;
    update({ skills: { ...character.skills, [skill]: next } });
  };

  const counts = { 4: 0, 3: 0, 2: 0, 1: 0 };
  Object.values(character.skills).forEach((v) => { if (counts[v] !== undefined) counts[v]++; });
  const approach = SKILL_APPROACHES[character.skillApproach || 'Balanced'];

  return (
    <div className="scene-in" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '60px 32px 140px' }}>
      <Art label="SCENE · LIBRARY"
        description="Dark vampire's study/library. Tall bookshelves, leather tomes, single warm desk lamp. Heavy bokeh."
        dimensions="1920 × 1080"
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', border: 'none', opacity: 0.15, zIndex: 0, padding: 0 }} />
      <AmbientGlow red={0.15} teal={0.12} />
      <AmbientBats />
      <CharacterWitness character={character} />

      <div style={{ position: 'relative', maxWidth: 1300, margin: '0 auto', zIndex: 2 }}>
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="f-mono" style={{ fontSize: 11, color: V.cyan, letterSpacing: '0.4em', marginBottom: 12 }}>CHAPTER IV · THE EDUCATION</div>
          <h1 className="outline-text" style={{ fontSize: 'clamp(48px, 7vw, 84px)', lineHeight: 0.95, fontWeight: 900, margin: 0 }}>
            WHAT YOU KNOW
          </h1>
        </div>

        <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 36 }}>
          {Object.entries(SKILL_APPROACHES).map(([key, app]) => {
            const active = character.skillApproach === key;
            return (
              <button key={key} onClick={() => setApproach(key)} className="v-card"
                style={{
                  background: active ? V.glassWarm : V.glass,
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  border: `1px solid ${active ? V.bloodBri : V.edgeGold}`,
                  padding: 0, cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden',
                  boxShadow: active ? `0 0 30px ${V.bloodBri}40` : 'none',
                }}>
                {GRIMOIRES[key] ? (
                  <div style={{
                    height: 130,
                    backgroundImage: `url("${GRIMOIRES[key]}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: active ? 'none' : 'saturate(0.7) brightness(0.85)',
                    transition: 'filter 0.3s ease',
                  }} />
                ) : (
                  <Art label={`GRIMOIRE · ${key.toUpperCase()}`}
                    description="Old leather-bound book, suggestion of pages open, ink and gilt."
                    dimensions="320 × 160"
                    style={{ height: 130, padding: 6, border: 'none', borderRadius: 0 }} />
                )}
                <div style={{ padding: 18 }}>
                  <div className="f-decorative" style={{ fontSize: 17, color: active ? V.textBri : V.gold, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>
                    {app.name.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, color: V.textMuted, lineHeight: 1.5 }}>{app.blurb}</div>
                  <div className="f-mono" style={{ marginTop: 12, fontSize: 10, color: V.cyan, letterSpacing: '0.15em' }}>
                    {Object.entries(app.dist).sort(([a], [b]) => b - a).map(([t, c]) => `${c}×${t}`).join('  ·  ')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="fade-up-2 cut-md" style={{
          background: V.glassDeep, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${V.edgeRedDim}`, padding: 14, marginBottom: 24,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
        }}>
          {[4, 3, 2, 1].map((tier) => {
            const expected = approach.dist[tier] || 0;
            const got = counts[tier];
            const ok = expected === got;
            return (
              <div key={tier} style={{ textAlign: 'center' }}>
                <Label color={V.cyan} style={{ marginBottom: 2 }}>● × {tier}</Label>
                <div style={{ fontSize: 20, color: ok ? V.cyan : got > expected ? V.bloodNeon : V.text, fontWeight: 700 }}>
                  {got}/{expected}
                </div>
              </div>
            );
          })}
        </div>

        <div className="fade-up-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {Object.entries(SKILL_CATEGORIES).map(([category, skills]) => (
            <div key={category}>
              <Label color={V.gold} style={{ textAlign: 'center', marginBottom: 10 }}>{category}</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {skills.map((skill) => {
                  const value = character.skills[skill] || 0;
                  return (
                    <button key={skill} onClick={() => cycleSkill(skill)} className="cut-sm"
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: value > 0 ? V.glass : 'transparent',
                        backdropFilter: value > 0 ? 'blur(10px)' : 'none',
                        WebkitBackdropFilter: value > 0 ? 'blur(10px)' : 'none',
                        border: `1px solid ${value > 0 ? V.edgeRedDim : 'transparent'}`,
                        padding: '7px 12px', cursor: 'pointer',
                        color: value > 0 ? V.text : V.textMuted,
                        fontSize: 14, textAlign: 'left', transition: 'all 0.2s ease',
                      }}>
                      <span>{skill}</span>
                      <Dots value={value} size={8} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="f-italic fade-up-4" style={{ color: V.textDim, fontSize: 13, textAlign: 'center', marginTop: 24 }}>
          Click any skill to cycle its rating. Choose an approach above to auto-distribute.
        </p>
      </div>
    </div>
  );
}
