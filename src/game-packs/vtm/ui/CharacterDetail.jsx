// Placeholder character-detail panel for VTM characters in the
// library. Renders inside the right-hand slot of CharacterLibrary
// when a VTM character is selected (CharacterDetailDispatcher
// routes packs here via the pack registry's detailComponent
// field).
//
// This is intentionally a placeholder, not a full V5 character
// sheet — the full sheet is a separate downstream project. What
// the player gets here:
//   - Square TOKEN at the top (1:1, no portrait duplicate — the
//     library's center column already shows the portrait at full
//     size, so duplicating it in the sidebar was wasted space)
//   - Edit + Delete buttons in the header row, matching the
//     pf2e / dnd5e detail layouts so the action chrome is
//     consistent across packs
//   - Name + clan + predator type identity block
//   - V5 stat strip (Health / Willpower / Humanity / Hunger /
//     Blood Potency) computed from the resolved overlay state
//     persisted on save
//   - Compact-of-Night text (chronicle, sire, concept, ambition,
//     desire) if any were filled in
//   - 'Full sheet ships at public launch — your data is
//     preserved' note (no Back-to-Library button — the left
//     sidebar already lets the player pick another character)
//
// Reads from `character.system_data.*` since that's where the
// VTM save handler writes everything. Falls back to top-level
// fields if a future migration flattens system_data.

import React from 'react';
import { Trash2, Edit, Skull } from 'lucide-react';
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
        fontSize: 32, color: accent, lineHeight: 1, fontWeight: 700,
        textShadow: `0 0 12px ${accent}60`,
      }}>
        {value}
      </div>
      <div className="font-display" style={{
        fontSize: 10, color: V.textMuted,
        letterSpacing: '0.28em', marginTop: 6,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
    </div>
  );
}

export default function VTMCharacterDetail({ character, pack, onEdit, onDelete }) {
  const sd = readSystemData(character);
  const clan = CLANS.find((c) => c.id === sd.clan);
  const predator = PREDATOR_TYPES.find((p) => p.id === sd.predatorType);
  // Prefer the square token; fall back to the portrait only when
  // the player didn't upload a dedicated token, so the sidebar
  // square doesn't end up empty. When falling back to the portrait
  // we also pick up that image's transform so the framing the player
  // set in their polaroid still applies.
  const usingTokenSource = !!(sd.token_url || sd.token || character?.token_url);
  const tokenUrl = usingTokenSource
    ? (sd.token_url || sd.token || character?.token_url)
    : (sd.portrait_url || sd.portrait || character?.portrait_url || null);
  const tokenPos = usingTokenSource
    ? (sd.token_position || character?.token_position)
    : (sd.portrait_position || character?.portrait_position);
  const tokenZoom = usingTokenSource
    ? (sd.token_zoom || character?.token_zoom)
    : (sd.portrait_zoom || character?.portrait_zoom);
  const tokenTransform = tokenPos && tokenZoom
    ? `translate(${tokenPos.x}px, ${tokenPos.y}px) scale(${tokenZoom})`
    : 'none';

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
      // No outer background — the library's right-panel wrapper
      // (CharacterLibrary.jsx ~line 395, 500px-wide div with the
      // standard `rgba(30, 36, 48, ...)` panel gradient) is the
      // chrome every detail surface sits in. Painting a VTM-themed
      // radial+linear over it made the right sidebar look like a
      // distinct red-tinted column instead of the library's normal
      // panel — the clan flavor now lives on the portrait frame
      // and the identity text shadows only.
      color: V.text, padding: '24px 8px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <style>{`
        .font-display { font-family: 'Cinzel', serif; letter-spacing: 0.08em; }
        .font-decorative { font-family: 'Cinzel Decorative', serif; }
        .font-italic { font-family: 'Cormorant Garamond', serif; font-style: italic; }
        .font-mono { font-family: 'JetBrains Mono', monospace; letter-spacing: 0.15em; }
      `}</style>

      {/* Header: pack tag + edit + delete (mirrors pf2e/dnd5e layout) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, padding: '0 4px', gap: 8,
      }}>
        <div className="font-mono" style={{
          fontSize: 11, color: accent, letterSpacing: '0.3em',
          textTransform: 'uppercase',
        }}>
          {pack?.tagAbbreviation || 'VTM V5'} · The Childe
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onEdit && (
            <button onClick={onEdit} title="Edit Character"
              style={{
                background: '#37F2D1', border: 'none',
                color: '#1E2430', padding: '8px',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                borderRadius: 8, transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2dd9bd'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#37F2D1'; }}>
              <Edit size={16} />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} title="Delete Character"
              style={{
                background: V.blood, border: 'none',
                color: V.textBri, padding: '8px',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                borderRadius: 8, transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = V.bloodBri; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = V.blood; }}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Token — square 1:1; the portrait already lives in the
          library's center column, so duplicating it here was waste. */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 220, margin: '0 auto 22px',
        aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: 12,
        border: `1px solid ${accent}80`,
        boxShadow: `0 16px 40px rgba(0,0,0,0.7), 0 0 32px ${accent}40`,
      }}>
        {tokenUrl ? (
          <img src={tokenUrl} alt={character?.name || 'Token'}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: tokenTransform, transformOrigin: 'center center',
            }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`,
          }}>
            <Skull size={56} color={accent} style={{ opacity: 0.5 }} />
          </div>
        )}
      </div>

      {/* Identity */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 className="font-decorative" style={{
          fontSize: 34, color: V.textBri, fontWeight: 800,
          margin: 0, lineHeight: 1.05, letterSpacing: '0.04em',
          textShadow: `0 0 24px ${accent}60`,
        }}>
          {character?.name || sd.name || 'Unnamed Childe'}
        </h2>
        {(clan || predator) && (
          <div className="font-italic" style={{ fontSize: 17, color: accent, marginTop: 8 }}>
            {clan?.name}{clan?.epithet ? ` · ${clan.epithet}` : ''}{predator ? ` · ${predator.name}` : ''}
          </div>
        )}
        {sd.chronicle && (
          <div className="font-mono" style={{
            fontSize: 11, color: V.gold, marginTop: 12,
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
          padding: 16, marginBottom: 22,
          background: 'rgba(8, 4, 12, 0.5)',
          border: `1px solid ${V.edgeGold}`,
        }}>
          {sd.concept && (
            <div style={{ marginBottom: 12 }}>
              <div className="font-mono" style={{ fontSize: 10, color: V.gold, letterSpacing: '0.3em', marginBottom: 4 }}>CONCEPT</div>
              <div className="font-italic" style={{ fontSize: 16, color: V.text }}>{sd.concept}</div>
            </div>
          )}
          {sd.sire && (
            <div style={{ marginBottom: 12 }}>
              <div className="font-mono" style={{ fontSize: 10, color: V.gold, letterSpacing: '0.3em', marginBottom: 4 }}>SIRE</div>
              <div className="font-italic" style={{ fontSize: 16, color: V.text }}>{sd.sire}</div>
            </div>
          )}
          {sd.ambition && (
            <div style={{ marginBottom: 12 }}>
              <div className="font-mono" style={{ fontSize: 10, color: V.cyan, letterSpacing: '0.3em', marginBottom: 4 }}>AMBITION</div>
              <div className="font-italic" style={{ fontSize: 16, color: V.text }}>{sd.ambition}</div>
            </div>
          )}
          {sd.desire && (
            <div>
              <div className="font-mono" style={{ fontSize: 10, color: V.bloodNeon, letterSpacing: '0.3em', marginBottom: 4 }}>DESIRE</div>
              <div className="font-italic" style={{ fontSize: 16, color: V.text }}>{sd.desire}</div>
            </div>
          )}
        </div>
      )}

      {/* Pre-launch notice */}
      <div className="font-italic" style={{
        padding: 16,
        background: `linear-gradient(135deg, rgba(196, 30, 58, 0.08) 0%, rgba(34, 211, 238, 0.05) 100%)`,
        border: `1px dashed ${V.edgeGold}`,
        fontSize: 14, color: V.textMuted, lineHeight: 1.55, textAlign: 'center',
      }}>
        Full character sheet arrives with public launch — your data is preserved.
      </div>
    </div>
  );
}
