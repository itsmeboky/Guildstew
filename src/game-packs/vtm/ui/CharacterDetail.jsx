// Placeholder character-detail panel for VTM characters in the
// library. Renders inside the right-hand slot of CharacterLibrary
// when a VTM character is selected (CharacterDetailDispatcher
// routes packs here via the pack registry's detailComponent
// field).
//
// This is intentionally a placeholder, not a full V5 character
// sheet — the full sheet is a separate downstream project. What
// the player gets here:
//   - Portrait centered with a soft blood/teal vignette
//   - Name + clan + predator type header
//   - Compact-of-Night text (chronicle, sire, concept, ambition,
//     desire) if any were filled in
//   - V5 stat strip (Health / Willpower / Humanity / Hunger /
//     Blood Potency) computed from the resolved overlay state
//     persisted on save
//   - 'Full sheet ships at public launch — your data is
//     preserved' note + Delete button (the dispatcher's
//     onDelete contract)
//
// Reads from `character.system_data.*` since that's where the
// VTM save handler writes everything. Falls back to top-level
// fields if a future migration flattens system_data.

import React from 'react';
import { Trash2, ArrowLeft, Skull } from 'lucide-react';
import { CLANS } from '../data/clans.js';
import { PREDATOR_TYPES } from '../data/predatorTypes.js';
import { V } from '../theme/colors.js';

function readSystemData(character) {
  return character?.system_data || {};
}

function Vital({ label, value, accent }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 56 }}>
      <div style={{
        fontSize: 26, color: accent, lineHeight: 1, fontWeight: 700,
        textShadow: `0 0 12px ${accent}60`,
      }}>
        {value}
      </div>
      <div className="font-display" style={{
        fontSize: 9, color: V.textMuted,
        letterSpacing: '0.28em', marginTop: 6,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
    </div>
  );
}

export default function VTMCharacterDetail({ character, pack, onDelete }) {
  const sd = readSystemData(character);
  const clan = CLANS.find((c) => c.id === sd.clan);
  const predator = PREDATOR_TYPES.find((p) => p.id === sd.predatorType);
  const portraitUrl = sd.portrait_url || sd.portrait || character?.portrait_url || null;
  const tokenUrl = sd.token_url || sd.token || character?.token_url || null;

  // V5 derived stats from the overlay-resolved state.
  const attrs = sd.attributes || {};
  const health    = (attrs.Stamina   || 1) + 3;
  const willpower = (attrs.Composure || 1) + (attrs.Resolve || 1);
  const humanity  = sd.humanity != null ? sd.humanity : 7;
  const hunger    = 1; // V5 chargen baseline
  const potency   = 1; // V5 chargen baseline

  const accent = clan?.accent || '#c41e3a';

  return (
    <div style={{
      width: '100%', minHeight: '100%',
      background: `radial-gradient(ellipse at top, ${accent}25 0%, transparent 50%), linear-gradient(180deg, #03020a 0%, #0a0408 100%)`,
      color: V.text, padding: '24px 8px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <style>{`
        .font-display { font-family: 'Cinzel', serif; letter-spacing: 0.08em; }
        .font-decorative { font-family: 'Cinzel Decorative', serif; }
        .font-italic { font-family: 'Cormorant Garamond', serif; font-style: italic; }
        .font-mono { font-family: 'JetBrains Mono', monospace; letter-spacing: 0.15em; }
      `}</style>

      {/* Header: pack tag + delete */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, padding: '0 4px',
      }}>
        <div className="font-mono" style={{
          fontSize: 9, color: accent, letterSpacing: '0.3em',
          textTransform: 'uppercase',
        }}>
          {pack?.tagAbbreviation || 'VTM V5'} · The Childe
        </div>
        {onDelete && (
          <button onClick={onDelete} title="Delete character"
            style={{
              background: 'transparent', border: `1px solid ${V.edgeRedDim}`,
              color: V.textMuted, padding: '6px 10px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
              fontFamily: 'inherit',
            }}>
            <Trash2 size={12} /> Delete
          </button>
        )}
      </div>

      {/* Portrait */}
      <div style={{
        position: 'relative', maxWidth: 320, margin: '0 auto 20px',
        aspectRatio: '3 / 4', overflow: 'hidden',
        border: `1px solid ${accent}80`,
        boxShadow: `0 16px 40px rgba(0,0,0,0.7), 0 0 32px ${accent}40`,
      }}>
        {portraitUrl ? (
          <img src={portraitUrl} alt={character.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`,
          }}>
            <Skull size={64} color={accent} style={{ opacity: 0.5 }} />
          </div>
        )}
        {tokenUrl && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            width: 48, height: 48, borderRadius: '50%',
            border: `2px solid ${V.gold}`, overflow: 'hidden',
            boxShadow: `0 0 16px ${V.gold}60, 0 4px 12px rgba(0,0,0,0.7)`,
          }}>
            <img src={tokenUrl} alt="token"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
      </div>

      {/* Identity */}
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <h2 className="font-decorative" style={{
          fontSize: 28, color: V.textBri, fontWeight: 800,
          margin: 0, lineHeight: 1, letterSpacing: '0.04em',
          textShadow: `0 0 24px ${accent}60`,
        }}>
          {character?.name || sd.name || 'Unnamed Childe'}
        </h2>
        {(clan || predator) && (
          <div className="font-italic" style={{ fontSize: 14, color: accent, marginTop: 6 }}>
            {clan?.name}{clan?.epithet ? ` · ${clan.epithet}` : ''}{predator ? ` · ${predator.name}` : ''}
          </div>
        )}
        {sd.chronicle && (
          <div className="font-mono" style={{
            fontSize: 9, color: V.gold, marginTop: 10,
            letterSpacing: '0.3em', textTransform: 'uppercase',
          }}>
            Chronicle · {sd.chronicle}
          </div>
        )}
      </div>

      {/* Stat strip */}
      <div style={{
        display: 'flex', gap: 8, justifyContent: 'space-around',
        padding: '14px 8px', marginBottom: 22,
        borderTop: `1px solid ${V.edgeRedDim}`,
        borderBottom: `1px solid ${V.edgeRedDim}`,
        background: 'rgba(8, 4, 12, 0.4)',
      }}>
        <Vital label="Health"    value={health}    accent={V.cyan} />
        <Vital label="Willpower" value={willpower} accent={V.cyan} />
        <Vital label="Humanity"  value={humanity}  accent={V.gold} />
        <Vital label="Hunger"    value={hunger}    accent={V.bloodNeon} />
        <Vital label="Potency"   value={potency}   accent={V.bloodNeon} />
      </div>

      {/* Compact text */}
      {(sd.concept || sd.ambition || sd.desire || sd.sire) && (
        <div style={{
          padding: 14, marginBottom: 22,
          background: 'rgba(8, 4, 12, 0.5)',
          border: `1px solid ${V.edgeGold}`,
        }}>
          {sd.concept && (
            <div style={{ marginBottom: 10 }}>
              <div className="font-mono" style={{ fontSize: 9, color: V.gold, letterSpacing: '0.3em', marginBottom: 4 }}>CONCEPT</div>
              <div className="font-italic" style={{ fontSize: 14, color: V.text }}>{sd.concept}</div>
            </div>
          )}
          {sd.sire && (
            <div style={{ marginBottom: 10 }}>
              <div className="font-mono" style={{ fontSize: 9, color: V.gold, letterSpacing: '0.3em', marginBottom: 4 }}>SIRE</div>
              <div className="font-italic" style={{ fontSize: 14, color: V.text }}>{sd.sire}</div>
            </div>
          )}
          {sd.ambition && (
            <div style={{ marginBottom: 10 }}>
              <div className="font-mono" style={{ fontSize: 9, color: V.cyan, letterSpacing: '0.3em', marginBottom: 4 }}>AMBITION</div>
              <div className="font-italic" style={{ fontSize: 14, color: V.text }}>{sd.ambition}</div>
            </div>
          )}
          {sd.desire && (
            <div>
              <div className="font-mono" style={{ fontSize: 9, color: V.bloodNeon, letterSpacing: '0.3em', marginBottom: 4 }}>DESIRE</div>
              <div className="font-italic" style={{ fontSize: 14, color: V.text }}>{sd.desire}</div>
            </div>
          )}
        </div>
      )}

      {/* Pre-launch notice */}
      <div className="font-italic" style={{
        padding: 16, marginBottom: 14,
        background: `linear-gradient(135deg, rgba(196, 30, 58, 0.08) 0%, rgba(34, 211, 238, 0.05) 100%)`,
        border: `1px dashed ${V.edgeGold}`,
        fontSize: 13, color: V.textMuted, lineHeight: 1.55, textAlign: 'center',
      }}>
        Full character sheet arrives with public launch — your data is preserved.
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => { if (typeof window !== 'undefined') window.history.back(); }}
          style={{
            background: 'transparent', border: `1px solid ${V.edgeRedDim}`,
            color: V.textMuted, padding: '10px 22px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.22em',
            fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8,
            textTransform: 'uppercase',
          }}>
          <ArrowLeft size={12} /> Back to Library
        </button>
      </div>
    </div>
  );
}
