// CHAPTER IX — Embrace. The final reveal screen. Big portrait on
// the left, name + clan/predator/epithet header, the V5 stat row
// (Health = Stamina+3, Willpower = Composure+Resolve, Humanity
// starts at 7, Hunger 1, Blood Potency 1) — then full attribute
// grid, top skills, disciplines, connections, and the touchstone
// quote panel.
//
// The save is fired by the explicit "WELCOME TO THE LONG NIGHT"
// button at the bottom of this screen (NavBar's forward button is
// hidden on Step IX). Mirrors the 5e / pf2e creator pattern where
// the final step is review-then-confirm rather than save-on-advance.

import React from 'react';
import { V } from '../theme/colors.js';
import { CLANS } from '../data/clans.js';
import { PREDATOR_TYPES } from '../data/predatorTypes.js';
import { ATTRIBUTE_CATEGORIES } from '../data/attributes.js';
import { ALL_SKILLS } from '../data/skills.js';
import { BACKGROUNDS } from '../data/backgrounds.js';
import AmbientGlow from '../components/AmbientGlow.jsx';
import NYCSkylineMinimal from '../components/NYCSkylineMinimal.jsx';
import AmbientBats from '../components/AmbientBats.jsx';
import Art from '../components/Art.jsx';
import Dots from '../components/Dots.jsx';
import Label from '../components/Label.jsx';
import Vital from '../components/Vital.jsx';

export default function StepEmbrace({ character, onConfirm, saving = false }) {
  const clan = CLANS.find((c) => c.id === character.clan);
  const predator = PREDATOR_TYPES.find((p) => p.id === character.predatorType);
  const health = (character.attributes.Stamina || 1) + 3;
  const willpower = (character.attributes.Composure || 1) + (character.attributes.Resolve || 1);
  // Humanity defaults to 7 but the predator-type bonus pass may
  // have nudged it; whatever the parent committed to character
  // state wins.
  const humanity = character.humanity != null ? character.humanity : 7;
  const activeDisciplines = Object.entries(character.disciplines).filter(([, v]) => v > 0);
  const activeBackgrounds = Object.entries(character.backgrounds || {}).filter(([, v]) => v > 0);

  return (
    <div className="scene-in" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '40px 32px 140px' }}>
      <Art label="SCENE · EMBRACE FINALE"
        description="Dramatic backdrop for the reveal. NYC skyline at deepest night, blood-moon, or grand cathedral interior."
        dimensions="1920 × 1080"
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', border: 'none', opacity: 0.16, zIndex: 0, padding: 0 }} />
      {clan && (
        <div style={{ position: 'fixed', inset: 0, background: `radial-gradient(ellipse at center, ${clan.accent}30 0%, transparent 50%)`, pointerEvents: 'none', zIndex: 0 }} />
      )}
      <AmbientGlow red={0.3} teal={0.15} />
      <NYCSkylineMinimal opacity={0.45} />
      <AmbientBats />

      <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', zIndex: 2 }}>
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="f-mono" style={{ fontSize: 12, color: V.bloodNeon, letterSpacing: '0.5em', marginBottom: 16, textShadow: `0 0 16px ${V.bloodNeon}80` }}>
            CHAPTER IX · IT IS DONE
          </div>
          <h1 className="f-decorative" style={{
            fontSize: 'clamp(60px, 10vw, 130px)', fontWeight: 900, color: V.textBri,
            margin: 0, lineHeight: 0.9, letterSpacing: '0.06em',
            textShadow: `0 0 40px ${V.bloodBri}80, 0 0 100px ${V.bloodBri}40`,
          }}>
            THE EMBRACE
          </h1>
        </div>

        <div className="fade-up-1 cut-lg" style={{
          background: V.glassDeep, backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: `1px solid ${V.bloodBri}60`, overflow: 'hidden',
          boxShadow: `0 30px 80px rgba(0,0,0,0.8), 0 0 80px ${V.bloodBri}30`,
          marginBottom: 24,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', minHeight: 540 }}>
            <div style={{ position: 'relative', background: V.bgDeep, borderRight: `1px solid ${V.edgeGold}` }}>
              {character.portrait ? (
                <img src={character.portrait} alt="portrait" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
              ) : (
                <Art label="UPLOADED PORTRAIT" description="Player uploaded from Chapter I" style={{ position: 'absolute', inset: 0, border: 'none', borderRadius: 0, padding: 0 }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, transparent 60%, ${V.bg}80 100%), radial-gradient(ellipse at center, transparent 40%, ${V.bg}50 100%)`, pointerEvents: 'none' }} />
              {character.token && (
                <div style={{
                  position: 'absolute', bottom: 18, left: 18, width: 64, height: 64,
                  borderRadius: '50%', border: `2px solid ${V.gold}`, overflow: 'hidden',
                  background: V.bg, boxShadow: `0 0 20px ${V.gold}60, 0 4px 12px rgba(0,0,0,0.7)`,
                }}>
                  <img src={character.token} alt="token" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            <div style={{ padding: 36, display: 'flex', flexDirection: 'column', gap: 22, position: 'relative' }}>
              {clan && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 0%, ${clan.accent}25 0%, transparent 60%)`, pointerEvents: 'none' }} />}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <Label color={V.cyan}>The Childe</Label>
                <h2 className="f-decorative" style={{
                  fontSize: 'clamp(34px, 4vw, 54px)', color: V.textBri,
                  margin: 0, lineHeight: 1, fontWeight: 800, letterSpacing: '0.04em',
                  textShadow: `0 0 24px ${V.bloodBri}60`,
                }}>
                  {character.name || 'UNNAMED CHILDE'}
                </h2>
                {clan && (
                  <div className="f-italic" style={{ fontSize: 18, color: clan.accent, marginTop: 8, fontWeight: 500 }}>
                    {clan.name} · {clan.epithet}{predator && ` · ${predator.name}`}
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex', gap: 28, padding: '18px 0', position: 'relative', zIndex: 1,
                borderTop: `1px solid ${V.edgeRedDim}`, borderBottom: `1px solid ${V.edgeRedDim}`,
              }}>
                <Vital label="HEALTH" value={health} accent={V.cyan} />
                <Vital label="WILLPOWER" value={willpower} accent={V.cyan} />
                <Vital label="HUMANITY" value={humanity} accent={V.gold} />
                <Vital label="HUNGER" value={1} accent={V.bloodNeon} />
                <Vital label="POTENCY" value={1} accent={V.bloodNeon} />
              </div>

              {(character.ambition || character.desire || character.concept) && (
                <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  {character.concept && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <Label color={V.gold}>Concept</Label>
                      <p className="f-italic" style={{ margin: 0, fontSize: 14, color: V.text }}>{character.concept}</p>
                    </div>
                  )}
                  {character.ambition && (
                    <div>
                      <Label>Ambition</Label>
                      <p className="f-italic" style={{ margin: 0, fontSize: 14, color: V.text, lineHeight: 1.45 }}>{character.ambition}</p>
                    </div>
                  )}
                  {character.desire && (
                    <div>
                      <Label color={V.bloodNeon}>Desire</Label>
                      <p className="f-italic" style={{ margin: 0, fontSize: 14, color: V.text, lineHeight: 1.45 }}>{character.desire}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="fade-up-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="cut-md" style={{
              background: V.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${V.edgeRedDim}`, padding: 18,
            }}>
              <Label color={V.cyan}>Attributes</Label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 12 }}>
                {Object.entries(ATTRIBUTE_CATEGORIES).map(([cat, attrs]) => (
                  <div key={cat}>
                    <Label color={V.gold} style={{ fontSize: 9, marginBottom: 6 }}>{cat}</Label>
                    {attrs.map((a) => (
                      <div key={a} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13, color: V.text }}>
                        <span>{a}</span>
                        <Dots value={character.attributes[a] || 1} size={7} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {clan && (
              <div className="cut-md" style={{
                background: V.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${V.edgeRedDim}`, borderLeft: `3px solid ${V.bloodNeon}`,
                padding: 18,
              }}>
                <Label color={V.bloodNeon}>Clan Bane · {clan.bane}</Label>
                <p className="f-italic" style={{ margin: 0, fontSize: 14, color: V.textMuted, lineHeight: 1.5 }}>{clan.baneDesc}</p>
              </div>
            )}
          </div>
          <div className="cut-md" style={{
            background: V.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${V.edgeRedDim}`, padding: 18,
          }}>
            <Label color={V.cyan}>Top Skills</Label>
            <div style={{ marginTop: 10 }}>
              {ALL_SKILLS.filter((s) => (character.skills[s] || 0) > 0)
                .sort((a, b) => (character.skills[b] || 0) - (character.skills[a] || 0))
                .slice(0, 9)
                .map((s) => (
                  <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13, color: V.text }}>
                    <span>{s}</span>
                    <Dots value={character.skills[s]} size={7} />
                  </div>
                ))}
              {ALL_SKILLS.filter((s) => (character.skills[s] || 0) > 0).length === 0 && (
                <p className="f-italic" style={{ color: V.textDim, fontSize: 13, margin: 0 }}>No skills selected yet.</p>
              )}
            </div>
          </div>
        </div>

        {(activeDisciplines.length > 0 || activeBackgrounds.length > 0) && (
          <div className="fade-up-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="cut-md" style={{
              background: V.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${V.edgeRedDim}`, padding: 18,
            }}>
              <Label color={V.bloodNeon}>Disciplines</Label>
              {activeDisciplines.length > 0 ? (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeDisciplines.map(([d, v]) => (
                    <div key={d} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: V.text }}>
                      <span>{d}</span>
                      <Dots value={v} max={5} size={8} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="f-italic" style={{ color: V.textDim, fontSize: 13, margin: '10px 0 0 0' }}>No Disciplines yet.</p>
              )}
            </div>
            <div className="cut-md" style={{
              background: V.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${V.edgeRedDim}`, padding: 18,
            }}>
              <Label color={V.gold}>Connections</Label>
              {activeBackgrounds.length > 0 ? (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeBackgrounds.map(([id, v]) => {
                    const bg = BACKGROUNDS.find((b) => b.id === id);
                    return (
                      <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: V.text }}>
                        <span>{bg?.name || id}</span>
                        <Dots value={v} max={3} size={8} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="f-italic" style={{ color: V.textDim, fontSize: 13, margin: '10px 0 0 0' }}>No advantages yet.</p>
              )}
            </div>
          </div>
        )}

        {character.touchstones && character.touchstones.length > 0 && (
          <div className="fade-up-3 cut-md" style={{
            background: V.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${V.edgeRedDim}`, padding: 18, marginBottom: 14,
          }}>
            <Label color={V.cyan}>Touchstones & Convictions</Label>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {character.touchstones.map((ts, i) => (
                <div
                  key={i}
                  className="cut-sm"
                  style={{
                    width: 320, height: 150,
                    padding: 0,
                    background: V.glassWarm, border: `1px solid ${V.edgeRedDim}`,
                    display: 'flex',
                    overflow: 'hidden',
                  }}
                >
                  {ts.image && (
                    <div style={{
                      width: 130, height: '100%',
                      flexShrink: 0,
                      backgroundImage: `url("${ts.image}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'grayscale(1) contrast(1.05) brightness(0.92)',
                      borderRight: `1px solid ${V.edgeGold}`,
                    }} />
                  )}
                  <div style={{
                    flex: 1, minWidth: 0,
                    padding: '10px 12px',
                    overflowY: 'auto',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    <div className="f-decorative" style={{
                      fontSize: 13, color: V.textBone, letterSpacing: '0.08em', fontWeight: 600,
                      lineHeight: 1.2,
                    }}>
                      {(ts.name || `Touchstone ${i + 1}`).toUpperCase()}
                    </div>
                    {ts.description && (
                      <div className="f-italic" style={{ fontSize: 12, color: V.textMuted, lineHeight: 1.35 }}>
                        {ts.description}
                      </div>
                    )}
                    {ts.conviction && (
                      <div style={{
                        marginTop: 'auto', paddingTop: 6,
                        borderTop: `1px dashed ${V.edgeGold}`,
                        fontSize: 11, color: V.gold, fontStyle: 'italic',
                        lineHeight: 1.3,
                      }}>
                        “{ts.conviction}”
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="f-italic fade-up-4" style={{
          color: V.textMuted, fontSize: 18, margin: '20px 0 0 0', textAlign: 'center', fontStyle: 'italic',
          textShadow: `0 0 12px ${V.bloodInk}`,
        }}>
          &ldquo;Welcome to the long, long night.&rdquo;
        </p>

        {/* Explicit confirm. NavBar's forward button is hidden on
            Step IX so this is the only path that fires the save.
            Disabled while saving to prevent double-submit. */}
        {onConfirm && (
          <div className="fade-up-4" style={{ textAlign: 'center', marginTop: 32 }}>
            <button
              onClick={onConfirm}
              disabled={saving}
              className="v-btn cut-lg"
              style={{
                background: V.blood,
                border: `1px solid ${V.bloodBri}`,
                color: V.textBri,
                padding: '20px 48px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                letterSpacing: '0.32em',
                fontWeight: 800,
                textTransform: 'uppercase',
                opacity: saving ? 0.5 : 1,
                boxShadow: saving ? 'none' : `0 0 32px ${V.bloodBri}80, 0 0 80px ${V.bloodBri}40`,
                transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              {saving ? 'Binding the Childe…' : 'Welcome to the Long Night'}
            </button>
            <div className="f-mono" style={{
              fontSize: 9, color: V.textMuted, letterSpacing: '0.3em',
              marginTop: 14, textTransform: 'uppercase',
            }}>
              Confirms the Embrace · saves to your library
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
