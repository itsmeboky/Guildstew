// Storyteller-approval modal for the Blood Leech predator type.
// In V5, diablerie is the deepest taboo a vampire can pursue and
// most Princes execute on suspicion — at the table level, picking
// Blood Leech is a player committing to a build the ST may veto.
// This modal makes the player acknowledge that before the type
// commits to character state.
//
// Once a session-zero / chronicle-config "Diablerist-friendly"
// flag exists at the platform level, this gate can short-circuit
// when the flag is true. Until then, the modal is always shown
// and the player has to acknowledge.

import React from 'react';
import { Skull } from 'lucide-react';
import { V } from '../theme/colors.js';

export default function BloodLeechGate({ open, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(3, 2, 10, 0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, backdropFilter: 'blur(6px)',
    }}>
      <div className="cut-md" style={{
        background: V.glassDeep, backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: `1px solid ${V.bloodNeon}80`, padding: 32,
        maxWidth: 540, width: '100%',
        boxShadow: `0 30px 80px rgba(0,0,0,0.9), 0 0 80px ${V.bloodNeon}50`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div className="cut-sm" style={{
            width: 48, height: 48, background: V.bloodInk,
            border: `1px solid ${V.bloodNeon}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 20px ${V.bloodNeon}60`,
          }}>
            <Skull size={22} color={V.bloodNeon} />
          </div>
          <div>
            <div className="f-mono" style={{ fontSize: 9, color: V.bloodNeon, letterSpacing: '0.3em' }}>STORYTELLER APPROVAL REQUIRED</div>
            <div className="f-decorative" style={{ fontSize: 22, color: V.textBri, fontWeight: 700, lineHeight: 1, letterSpacing: '0.06em', marginTop: 4 }}>
              BLOOD LEECH
            </div>
          </div>
        </div>

        <p className="f-italic" style={{ fontSize: 15, color: V.text, lineHeight: 1.55, marginBottom: 14 }}>
          You're committing to a diablerist build. In V5, feeding from other
          Kindred is the deepest taboo — most Princes execute on suspicion.
          Your Storyteller may veto this pick for the chronicle.
        </p>
        <p className="f-italic" style={{ fontSize: 14, color: V.textMuted, lineHeight: 1.5, marginBottom: 22 }}>
          You will lose three dots of Humanity at the Embrace and inherit a
          Dark Secret (••) — Diablerist. Continue?
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="cut-sm" style={{
            background: 'transparent', border: `1px solid ${V.edgeRedDim}`,
            color: V.textMuted, padding: '10px 22px', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: '0.22em', fontWeight: 600,
          }}>
            STEP BACK
          </button>
          <button onClick={onConfirm} className="cut-sm" style={{
            background: V.blood, border: `1px solid ${V.bloodNeon}`,
            color: V.textBri, padding: '10px 22px', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: '0.22em', fontWeight: 700,
            boxShadow: `0 0 24px ${V.bloodNeon}50`,
          }}>
            I ACCEPT THE TABOO
          </button>
        </div>
      </div>
    </div>
  );
}
