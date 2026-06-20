import React from "react";
import { OrnateHeading } from "@/components/characterCreator/chrome/Ornaments";

// ============================================================================
// Level picker — relocated unchanged from ClassFeaturesStep so the level
// input lives in exactly one place (the Class step). Multiclass-aware: the
// "(total − multiclass levels)" note only appears when multiclasses are
// present, so it renders cleanly on the Class step where none exist yet.
// ============================================================================
export function LevelPicker({ totalLevel, primaryClassName, primaryClassLevel, multiclasses = [], onChange }) {
  return (
    <div>
      <OrnateHeading>The Ledger</OrnateHeading>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <div className="label" style={{ color: 'var(--text-dim)' }}>
          Character Level
        </div>
        <select
          value={String(totalLevel)}
          onChange={(e) => onChange(e.target.value)}
          className="input"
          style={{
            width: 110,
            textAlign: 'center',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'var(--display)',
          }}
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map((l) => (
            <option key={l} value={String(l)}>Level {l}</option>
          ))}
        </select>
        <div
          className="italic-serif"
          style={{ fontSize: 13, color: 'var(--text-dim)' }}
        >
          {primaryClassName}{' '}
          <span style={{ color: 'var(--teal)', fontWeight: 700 }}>L{primaryClassLevel}</span>
          {multiclasses.filter((mc) => mc.class).length > 0 && (
            <span style={{ marginLeft: 6, color: 'var(--text-faint)' }}>
              (total − multiclass levels)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
