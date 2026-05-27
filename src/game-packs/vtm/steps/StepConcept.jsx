// CHAPTER I — Concept. The "memory lane" scattered-polaroid layout
// + the Compact of Night identity form. Two columns: left has the
// portrait + token uploaders mixed in with seven decorative memory
// polaroids and two ephemera (MTA ticket + gold key); right has
// the parchment compact with the player's six identity fields.
//
// The uploader props (`onUpload` on each PolaroidUpload) come from
// the parent VTMCharacterCreator and are bound to the Supabase
// upload helper — see VTMCharacterCreator.jsx for the wiring.

import React from 'react';
import { V } from '../theme/colors.js';
import { MEMORY_PHOTOS } from '../data/assets.js';
import AmbientGlow from '../components/AmbientGlow.jsx';
import NYCSkylineMinimal from '../components/NYCSkylineMinimal.jsx';
import AmbientBats from '../components/AmbientBats.jsx';
import PolaroidUpload from '../components/PolaroidUpload.jsx';
import PolaroidMemory from '../components/PolaroidMemory.jsx';
import CompactField from '../components/CompactField.jsx';
import CaseFileStrip from '../components/CaseFileStrip.jsx';

export default function StepConcept({ character, update, uploadPortraitToken }) {
  return (
    <div className="scene-in" style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      padding: '40px 32px 140px',
    }}>
      <AmbientGlow red={0.2} teal={0.12} />
      <NYCSkylineMinimal opacity={0.3} />
      <AmbientBats />

      <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', zIndex: 2 }}>
        <div className="fade-up" style={{ marginBottom: 36, textAlign: 'center' }}>
          <div className="f-mono" style={{ fontSize: 11, color: V.cyan, letterSpacing: '0.4em', marginBottom: 12 }}>
            CHAPTER I · WHAT YOU LEFT BEHIND
          </div>
          <h1 className="outline-text" style={{ fontSize: 'clamp(48px, 8vw, 92px)', lineHeight: 0.95, fontWeight: 900, margin: 0 }}>
            BEFORE THE KISS
          </h1>
          <div style={{ marginTop: 14 }}>
            <CaseFileStrip fontSize={17}>
              Tonight you bury who you were. Lay out the photographs while you still remember the warmth of them. Sign the Compact when you're ready.
            </CaseFileStrip>
          </div>
        </div>

        <div className="fade-up-1" style={{
          position: 'relative',
          display: 'grid', gridTemplateColumns: '1fr 1.1fr',
          gap: 40, alignItems: 'flex-start',
        }}>
          {/* LEFT: Scattered polaroids */}
          <div style={{ position: 'relative', minHeight: 760, padding: '20px 0' }}>
            {/* Memory polaroid sitting BEHIND portrait + token, peeking out between them */}
            <div style={{ position: 'absolute', top: 35, left: '34%', zIndex: 6 }}>
              <PolaroidMemory image={MEMORY_PHOTOS[6]} rotate={2} size={135} tapeColor="#d4b06a" />
            </div>

            {/* TOP ROW: Portrait + Token (labeled, the only labels).
                Each polaroid also threads position/zoom so the player
                can pan + scale the image inside the well after upload;
                values persist on the character record and the library /
                detail panel honor the same transform at render time. */}
            <div style={{ position: 'absolute', top: 20, left: '6%', zIndex: 8 }}>
              <PolaroidUpload
                value={character.portrait}
                onChange={(v) => update({ portrait: v })}
                onUpload={uploadPortraitToken ? (file) => uploadPortraitToken(file, 'portrait') : undefined}
                label={character.name ? character.name.toUpperCase() : '— PORTRAIT —'}
                hint="upload portrait"
                rotate={-3}
                size={210}
                tapeColor="#c41e3a"
                position={character.portrait_position}
                zoom={character.portrait_zoom}
                onPositionChange={(v) => update({ portrait_position: v })}
                onZoomChange={(v) => update({ portrait_zoom: v })}
              />
            </div>

            <div style={{ position: 'absolute', top: 0, right: '8%', zIndex: 9 }}>
              <PolaroidUpload
                value={character.token}
                onChange={(v) => update({ token: v })}
                onUpload={uploadPortraitToken ? (file) => uploadPortraitToken(file, 'token') : undefined}
                label="— TOKEN —"
                hint="combat icon"
                rotate={6}
                size={130}
                tapeColor="#b8985a"
                position={character.token_position}
                zoom={character.token_zoom}
                onPositionChange={(v) => update({ token_position: v })}
                onZoomChange={(v) => update({ token_zoom: v })}
              />
            </div>

            {/* MIDDLE/BOTTOM: Memory polaroids, no labels */}
            <div style={{ position: 'absolute', top: 285, left: '2%', zIndex: 5 }}>
              <PolaroidMemory image={MEMORY_PHOTOS[0]} rotate={-9} size={140} tapeColor="#c9b98e" />
            </div>
            <div style={{ position: 'absolute', top: 320, left: '32%', zIndex: 4 }}>
              <PolaroidMemory image={MEMORY_PHOTOS[1]} rotate={5} size={150} tapeColor="#7f77dd" />
            </div>
            <div style={{ position: 'absolute', top: 270, right: '14%', zIndex: 6 }}>
              <PolaroidMemory image={MEMORY_PHOTOS[2]} rotate={11} size={135} tapeColor="#5DCAA5" />
            </div>
            <div style={{ position: 'absolute', bottom: 80, left: '10%', zIndex: 3 }}>
              <PolaroidMemory image={MEMORY_PHOTOS[3]} rotate={-5} size={130} tapeColor="#c41e3a" />
            </div>
            <div style={{ position: 'absolute', bottom: 30, left: '38%', zIndex: 4 }}>
              <PolaroidMemory image={MEMORY_PHOTOS[4]} rotate={8} size={120} tapeColor="#d4537e" />
            </div>
            <div style={{ position: 'absolute', bottom: 50, right: '6%', zIndex: 5 }}>
              <PolaroidMemory image={MEMORY_PHOTOS[5]} rotate={-7} size={135} tapeColor="#AFA9EC" />
            </div>

            {/* Ephemera — ticket stub */}
            <div style={{
              position: 'absolute', bottom: 5, left: '60%',
              transform: 'rotate(-22deg)', zIndex: 2,
            }}>
              <div style={{
                background: '#e8dcc4', padding: '8px 14px',
                fontFamily: "'Special Elite', monospace", fontSize: 10,
                color: V.parchInk, letterSpacing: '0.1em',
                border: `1px dashed ${V.parchInk}40`,
                boxShadow: `0 4px 12px rgba(0,0,0,0.5)`, opacity: 0.85,
              }}>
                MTA · 1 RIDE · ADMIT ONE
              </div>
            </div>

            {/* Ephemera — gold key */}
            <svg style={{
              position: 'absolute', top: 200, right: '40%',
              width: 50, height: 18, opacity: 0.4,
              transform: 'rotate(35deg)',
              zIndex: 2, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))',
            }} viewBox="0 0 50 18">
              <circle cx="9" cy="9" r="7" fill="none" stroke={V.gold} strokeWidth="1.5" />
              <circle cx="9" cy="9" r="3" fill="none" stroke={V.gold} strokeWidth="1" />
              <line x1="16" y1="9" x2="46" y2="9" stroke={V.gold} strokeWidth="2" />
              <line x1="40" y1="9" x2="40" y2="14" stroke={V.gold} strokeWidth="1.5" />
              <line x1="44" y1="9" x2="44" y2="13" stroke={V.gold} strokeWidth="1.5" />
            </svg>
          </div>

          {/* RIGHT: The Compact */}
          <div style={{
            position: 'relative',
            background: `
              radial-gradient(ellipse at top left, rgba(196, 30, 58, 0.06) 0%, transparent 50%),
              linear-gradient(180deg, ${V.surface} 0%, ${V.bgWarm} 100%)
            `,
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            border: `1px solid ${V.edgeGold}`,
            padding: '32px 36px 80px',
            boxShadow: `0 24px 60px rgba(0,0,0,0.7), inset 0 0 80px rgba(196, 30, 58, 0.08)`,
            transform: 'rotate(0.5deg)',
          }} className="cut-md">
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `radial-gradient(rgba(184, 152, 90, 0.04) 1px, transparent 1px)`,
              backgroundSize: '8px 8px', pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1, marginBottom: 22, textAlign: 'center' }}>
              <div className="f-mono" style={{ fontSize: 10, color: V.gold, letterSpacing: '0.4em', marginBottom: 6 }}>
                ✦ THE COMPACT OF NIGHT ✦
              </div>
              <h2 className="f-decorative" style={{
                fontSize: 28, color: V.textBri, fontWeight: 700,
                margin: 0, lineHeight: 1, letterSpacing: '0.06em',
                textShadow: `0 0 24px ${V.bloodBri}40`,
              }}>
                The Childe's Inheritance
              </h2>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                <div style={{ flex: 1, height: 1, background: V.edgeGold, maxWidth: 80 }} />
                <span className="f-italic" style={{ fontSize: 12, color: V.textMuted }}>
                  signed in vitae, witnessed by night
                </span>
                <div style={{ flex: 1, height: 1, background: V.edgeGold, maxWidth: 80 }} />
              </div>
            </div>

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <CompactField preamble="The Childe shall henceforth be known as" label="NAME"
                value={character.name} onChange={(v) => update({ name: v })}
                placeholder="What name will the Kindred whisper?" />
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                <CompactField preamble="bound to the city of" label="CHRONICLE"
                  value={character.chronicle} onChange={(v) => update({ chronicle: v })}
                  placeholder="New York. Or another." />
                <CompactField preamble="by the hand of" label="SIRE"
                  value={character.sire} onChange={(v) => update({ sire: v })}
                  placeholder="Who Embraced them?" />
              </div>
              <CompactField preamble="whose mortal life was" label="CONCEPT"
                value={character.concept} onChange={(v) => update({ concept: v })}
                placeholder="‘A grad student who can't go home.’" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CompactField preamble="whose eternal pursuit shall be" label="AMBITION"
                  value={character.ambition} onChange={(v) => update({ ambition: v })}
                  placeholder="A century from now." multi />
                <CompactField preamble="and whose hunger tonight demands" label="DESIRE"
                  value={character.desire} onChange={(v) => update({ desire: v })}
                  placeholder="Before sunrise." multi accent={V.bloodNeon} />
              </div>
            </div>

            <div style={{
              position: 'absolute', bottom: 18, left: 24, right: 24,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
              zIndex: 1, paddingTop: 18, borderTop: `1px dashed ${V.edgeGold}`,
            }}>
              <div style={{ flex: 1, maxWidth: 240 }}>
                <div style={{
                  borderBottom: `1px solid ${V.edgeGold}`,
                  paddingBottom: 2, marginBottom: 4,
                  fontFamily: "'Cinzel', serif", fontStyle: 'italic',
                  color: V.bloodBri, fontSize: 16, letterSpacing: '0.04em',
                  minHeight: 22,
                }}>
                  {character.sire || ''}
                </div>
                <div className="f-mono" style={{ fontSize: 9, color: V.textDim, letterSpacing: '0.25em' }}>
                  ✦ BY THE SIRE
                </div>
              </div>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${V.bloodBri} 0%, ${V.blood} 50%, ${V.bloodDeep} 100%)`,
                border: `2px solid ${V.bloodDeep}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `inset 0 -4px 8px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.6)`,
                transform: 'rotate(-12deg)', position: 'relative',
              }}>
                <span style={{
                  fontFamily: "'Cinzel Decorative', serif",
                  fontSize: 22, color: V.bloodDeep, fontWeight: 900,
                  textShadow: `0 1px 1px rgba(0,0,0,0.4)`,
                  letterSpacing: '-0.02em',
                }}>
                  ✦
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="fade-up-3 f-italic" style={{
          marginTop: 48, textAlign: 'center', color: V.textDim, fontSize: 14,
          maxWidth: 600, margin: '48px auto 0',
        }}>
          “The first thing you forget is what you wanted before the Hunger taught you to want again.”
        </div>
      </div>
    </div>
  );
}
