// CHAPTER II — Bloodline. Two states:
//   1) Gallery: five clan portraits in a row, slight per-card rotation,
//      click one to commit.
//   2) Reveal (ClanReveal sub-component): full portrait on the left,
//      Inheritance / Bane / Compulsion / Disciplines panels on the
//      right, dramatic accent-colored radial glow. "Reconsider" sets
//      character.clan back to null and re-renders the gallery.

import React from 'react';
import { V } from '../theme/colors.js';
import { CLANS } from '../data/clans.js';
import { DISCIPLINES } from '../data/disciplines.js';
import { CLAN_PORTRAITS } from '../data/assets.js';
import AmbientGlow from '../components/AmbientGlow.jsx';
import NYCSkylineMinimal from '../components/NYCSkylineMinimal.jsx';
import AmbientBats from '../components/AmbientBats.jsx';
import CharacterWitness from '../components/CharacterWitness.jsx';
import Art from '../components/Art.jsx';
import Label from '../components/Label.jsx';

function ClanReveal({ clan, character, update }) {
  return (
    <div className="scene-in" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '40px 32px 140px' }}>
      <div style={{
        position: 'fixed', inset: 0,
        background: `radial-gradient(ellipse at top, ${clan.accent}25 0%, transparent 50%), radial-gradient(ellipse at bottom right, ${V.bloodInk}40 0%, transparent 60%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />
      <NYCSkylineMinimal opacity={0.3} />
      <AmbientBats />
      <CharacterWitness character={character} />

      <div style={{ position: 'relative', maxWidth: 1300, margin: '0 auto', zIndex: 2 }}>
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="f-mono" style={{ fontSize: 11, color: clan.accent, letterSpacing: '0.4em', marginBottom: 10 }}>
            THE PAINTING HAS RECOGNIZED YOU
          </div>
          <h1 className="f-decorative" style={{
            fontSize: 'clamp(56px, 9vw, 110px)', fontWeight: 900, color: V.textBri,
            margin: 0, lineHeight: 0.95, letterSpacing: '0.06em',
            textShadow: `0 0 32px ${clan.accent}80, 0 0 80px ${clan.accent}40`,
          }}>
            {clan.name.toUpperCase()}
          </h1>
          <p style={{
            fontSize: 18, color: clan.accent, marginTop: 8,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            fontFamily: "'Cinzel', serif", fontWeight: 500,
          }}>
            {clan.hood}
          </p>
        </div>

        <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 36, alignItems: 'flex-start' }}>
          <div style={{
            position: 'relative',
            background: V.surface, padding: 14,
            border: `1px solid ${clan.accent}80`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 40px ${clan.accent}40`,
          }}>
            {CLAN_PORTRAITS[clan.id] ? (
              <div style={{
                width: '100%', height: 500,
                backgroundImage: `url("${CLAN_PORTRAITS[clan.id]}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
                border: `1px solid ${V.edgeGold}`,
                boxShadow: `inset 0 0 60px rgba(0,0,0,0.5)`,
              }} />
            ) : (
              <Art label={`CLAN PORTRAIT · ${clan.name.toUpperCase()}`}
                description={`Full clan portrait. Oil painting feel, dramatic chiaroscuro lighting. The clan's archetype made flesh.`}
                dimensions="640 × 800 · 4:5"
                style={{ width: '100%', height: 500, border: `1px solid ${V.edgeGold}` }} />
            )}
            <div className="f-mono" style={{ marginTop: 12, fontSize: 10, color: V.gold, letterSpacing: '0.3em', textAlign: 'center' }}>
              {clan.epithet.toUpperCase()}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="fade-up-2">
              <Label color={clan.accent}>Inheritance</Label>
              <p className="f-italic" style={{ fontSize: 19, color: V.text, lineHeight: 1.55, margin: 0, fontWeight: 400 }}>
                {clan.flavor}
              </p>
            </div>

            <div className="fade-up-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div className="cut-md" style={{
                background: V.glassDeep, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${V.bloodBri}40`, padding: 18, borderLeft: `3px solid ${V.bloodNeon}`,
              }}>
                <Label color={V.bloodNeon}>Bane · {clan.bane}</Label>
                <p style={{ margin: 0, fontSize: 14, color: V.textMuted, lineHeight: 1.55 }}>{clan.baneDesc}</p>
              </div>
              <div className="cut-md" style={{
                background: V.glassDeep, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${V.edgeGold}`, padding: 18, borderLeft: `3px solid ${V.gold}`,
              }}>
                <Label color={V.gold}>Compulsion · {clan.compulsion}</Label>
                <p style={{ margin: 0, fontSize: 14, color: V.textMuted, lineHeight: 1.55 }}>{clan.compulsionDesc}</p>
              </div>
            </div>

            <div className="fade-up-4">
              <Label color={V.cyan}>Clan Disciplines</Label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 200px',
                gap: 10, alignItems: 'stretch',
              }}>
                {clan.disciplines.map((d) => (
                  <div key={d} className="cut-sm" style={{
                    padding: '14px 16px',
                    background: V.glass, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                    border: `1px solid ${V.edgeRedDim}`,
                  }}>
                    <div className="f-display" style={{ fontSize: 13, color: clan.accent, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 4 }}>
                      {d.toUpperCase()}
                    </div>
                    <div className="f-italic" style={{ fontSize: 12, color: V.textMuted, lineHeight: 1.45 }}>
                      {DISCIPLINES[d]}
                    </div>
                  </div>
                ))}

                {/* Clan decorative element slot */}
                <Art label={`SIGIL · ${clan.name.toUpperCase()}`}
                  description={`Custom decorative element for ${clan.name}. Ornamental crest, sigil, or signature visual.`}
                  dimensions="200 × 200 · square"
                  style={{
                    width: '100%', height: '100%', minHeight: 110,
                    border: `1px dashed ${clan.accent}80`,
                    background: `radial-gradient(circle at center, ${clan.accent}20 0%, ${V.bloodInk}30 50%, transparent 80%)`,
                  }} />
              </div>
            </div>

            <div className="fade-up-4">
              <button onClick={() => update({ clan: null })} style={{
                background: 'transparent', border: `1px solid ${V.edgeRedDim}`,
                color: V.textDim, padding: '8px 16px', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: '0.2em', fontWeight: 500,
              }}>
                ← RECONSIDER
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StepClan({ character, update }) {
  const selected = CLANS.find((c) => c.id === character.clan);
  if (selected) return <ClanReveal clan={selected} character={character} update={update} />;

  return (
    <div className="scene-in" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '60px 32px 140px' }}>
      <AmbientGlow red={0.22} teal={0.16} />
      <NYCSkylineMinimal opacity={0.35} />
      <AmbientBats />
      <CharacterWitness character={character} />

      <div style={{ position: 'relative', maxWidth: 1400, margin: '0 auto', zIndex: 2 }}>
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="f-mono" style={{ fontSize: 11, color: V.cyan, letterSpacing: '0.4em', marginBottom: 12 }}>
            CHAPTER II · THE BLOODLINE
          </div>
          <h1 style={{
            fontFamily: "'Cinzel Decorative', serif",
            fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: 900, color: V.textBri,
            margin: 0, lineHeight: 1, letterSpacing: '0.04em',
          }}>
            WHO MADE YOU
          </h1>
          <p className="f-italic" style={{ fontSize: 17, color: V.textMuted, marginTop: 14, maxWidth: 640, margin: '14px auto 0', lineHeight: 1.5 }}>
            Five portraits hang on the wall. Five Sires. Five curses. The one who Embraced you stares back. Which painting holds your reflection?
          </p>
        </div>

        <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 40 }}>
          {CLANS.map((clan, i) => {
            const Icon = clan.sigil;
            return (
              <button key={clan.id} onClick={() => update({ clan: clan.id })} className="v-card cut-tl"
                style={{
                  background: V.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  border: `1px solid ${V.edgeRedDim}`,
                  padding: 0, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  transform: `rotate(${(i - 2) * 0.5}deg)`, position: 'relative',
                }}>
                {CLAN_PORTRAITS[clan.id] ? (
                  <div style={{
                    width: '100%', height: 280,
                    backgroundImage: `url("${CLAN_PORTRAITS[clan.id]}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    filter: 'saturate(0.95)',
                  }} />
                ) : (
                  <Art label={`CLAN · ${clan.name.toUpperCase()}`}
                    description={`Iconic ${clan.name} portrait — moody oil-painting style. Captures the clan's essence.`}
                    dimensions="320 × 420 · 4:5"
                    style={{ borderRadius: 0, border: 'none', width: '100%', height: 280, padding: 8 }} />
                )}
                <div style={{
                  padding: '12px 14px',
                  borderTop: `1px solid ${V.edgeGold}`,
                  background: `linear-gradient(180deg, ${V.surfaceLi} 0%, ${V.surface} 100%)`,
                  textAlign: 'center',
                }}>
                  <Icon size={16} color={clan.accent} style={{ marginBottom: 6 }} />
                  <div className="f-decorative" style={{ fontSize: 16, color: V.textBri, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>
                    {clan.name.toUpperCase()}
                  </div>
                  <div className="f-italic" style={{ fontSize: 11, color: V.textDim }}>{clan.epithet}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="fade-up-2 f-italic" style={{ textAlign: 'center', color: V.textDim, fontSize: 13 }}>
          Click a portrait. The painting will recognize you.
        </div>
      </div>
    </div>
  );
}
