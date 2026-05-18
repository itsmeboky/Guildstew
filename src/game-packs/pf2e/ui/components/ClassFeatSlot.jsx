// One slot in the class-feats grid. Toggles between Class feats and Archetype
// (dedication) feats at level 2+. Locks the Archetype tab when the two-feat
// rule is active. Verbatim from prototype.

import React, { useState } from 'react';
import ThreeActionGlyph from './ThreeActionGlyph.jsx';

const ClassFeatSlot = ({ fLvl, picked, classOptions, dedicationOptions, onPick, dedicationLocked }) => {
  // Detect mode from existing pick, default to 'class'
  const initialMode = dedicationOptions.some(d => d.name === picked) ? 'archetype' : 'class';
  const [mode, setMode] = useState(initialMode);
  const showTabs = fLvl >= 2;
  const options = mode === 'archetype' ? dedicationOptions : classOptions;
  const lockArchetypeTab = dedicationLocked && mode === 'class';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase">
          Level {fLvl} Feat
        </p>
        {showTabs && (
          <div className="flex border border-pf-brass-dim/30">
            <button
              onClick={() => setMode('class')}
              className={`px-2 py-0.5 font-display text-[9px] tracking-[0.15em] uppercase transition-colors
                          ${mode === 'class' ? 'bg-pf-brass/10 text-pf-bone' : 'text-pf-stone hover:text-pf-parchment'}`}
            >
              Class
            </button>
            <button
              onClick={() => !lockArchetypeTab && setMode('archetype')}
              disabled={lockArchetypeTab}
              className={`px-2 py-0.5 font-display text-[9px] tracking-[0.15em] uppercase transition-colors border-l border-pf-brass-dim/30
                          ${mode === 'archetype' ? 'bg-pf-brass/10 text-pf-bone'
                            : lockArchetypeTab ? 'text-pf-stone/40 cursor-not-allowed'
                            : 'text-pf-stone hover:text-pf-parchment'}`}
              title={lockArchetypeTab ? 'Two-feat rule: take 2 more archetype feats before a new Dedication' : ''}
            >
              {lockArchetypeTab ? '🔒 Archetype' : 'Archetype'}
            </button>
          </div>
        )}
      </div>
      <div className="space-y-1">
        {options.map(feat => {
          const active = picked === feat.name;
          return (
            <button
              key={feat.name}
              onClick={() => onPick(feat.name)}
              className={`w-full text-left p-2 border transition-all flex items-start justify-between gap-3
                          ${active
                            ? 'border-pf-brass bg-pf-brass/5'
                            : 'border-pf-brass-dim/20 hover:border-pf-brass-dim'}`}
            >
              <div className="flex-1 min-w-0">
                <span className="font-body text-xs text-pf-parchment">{feat.name}</span>
                {mode === 'archetype' && feat.desc && (
                  <p className="text-[10px] text-pf-stone leading-snug mt-0.5">{feat.desc}</p>
                )}
              </div>
              <ThreeActionGlyph count={feat.actions} className="shrink-0 mt-0.5" />
            </button>
          );
        })}
      </div>
      {fLvl > 1 && mode === 'class' && (
        <p className="text-[10px] text-pf-stone/70 font-body italic mt-1">
          (Full level-{fLvl} class feat catalog wires in via SRD import.)
        </p>
      )}
      {mode === 'archetype' && (
        <p className="text-[10px] text-pf-stone/70 font-body italic mt-1">
          Dedication feats give you cross-class abilities. After taking one, you must take 2+ more feats from that archetype before picking a new Dedication.
        </p>
      )}
    </div>
  );
};

export default ClassFeatSlot;
