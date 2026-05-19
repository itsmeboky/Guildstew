// One slot in the class-feats grid. Toggles between Class feats and Archetype
// (dedication) feats at level 2+. Locks the Archetype tab when the two-feat
// rule is active. Includes a per-slot search + trait filter so a Witch slot
// (5-15 class feats at level 1) is browsable, and dedications (~24 entries
// at level 2) are searchable by name.

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import ThreeActionGlyph from './ThreeActionGlyph.jsx';
import RecommendedBadge from './RecommendedBadge.jsx';

const ClassFeatSlot = ({ fLvl, picked, classOptions, dedicationOptions, onPick, dedicationLocked, recommendedName }) => {
  const initialMode = dedicationOptions.some(d => d.name === picked) ? 'archetype' : 'class';
  const [mode, setMode] = useState(initialMode);
  const [query, setQuery] = useState('');
  const [traitFilter, setTraitFilter] = useState(null);

  const showTabs = fLvl >= 2;
  const sourceOptions = mode === 'archetype' ? dedicationOptions : classOptions;
  const lockArchetypeTab = dedicationLocked && mode === 'class';

  // Top-N trait chips drawn from the current option set. Skips the
  // class slug itself (already implied by the slot) and the always-on
  // 'class'/'archetype' meta-traits.
  const traitChips = useMemo(() => {
    const counts = new Map();
    for (const opt of sourceOptions) {
      for (const t of opt.traits || []) {
        if (['class', 'archetype'].includes(t)) continue;
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t]) => t);
  }, [sourceOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sourceOptions.filter(f => {
      if (q && !(f.name || '').toLowerCase().includes(q) && !(f.desc || '').toLowerCase().includes(q)) {
        return false;
      }
      if (traitFilter && !(f.traits || []).includes(traitFilter)) return false;
      return true;
    });
  }, [sourceOptions, query, traitFilter]);

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

      {sourceOptions.length === 0 ? (
        <div className="px-3 py-2 border border-dashed border-pf-brass-dim/30 text-pf-stone text-[11px] italic">
          No {mode === 'archetype' ? 'archetype dedications' : 'class feats'} available at level {fLvl}.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 flex items-center gap-1.5 border border-pf-brass-dim/30 bg-pf-bg-elev px-2">
              <Search size={12} className="text-pf-stone" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${sourceOptions.length} feats…`}
                className="flex-1 bg-transparent py-1 text-[11px] font-body text-pf-bone placeholder:text-pf-stone/60 focus:outline-none"
              />
            </div>
            {traitFilter && (
              <button
                onClick={() => setTraitFilter(null)}
                className="px-2 py-0.5 text-[10px] font-display tracking-wider uppercase border border-pf-brass text-pf-bone hover:bg-pf-brass/10"
              >
                clear ×
              </button>
            )}
          </div>

          {traitChips.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {traitChips.map(t => (
                <button
                  key={t}
                  onClick={() => setTraitFilter(traitFilter === t ? null : t)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border transition-colors
                              ${traitFilter === t
                                ? 'border-pf-brass bg-pf-brass/10 text-pf-bone'
                                : 'border-pf-brass-dim/30 text-pf-stone hover:text-pf-parchment'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            {filtered.length === 0 ? (
              <p className="text-[10px] text-pf-stone italic px-2 py-1">No feats match this filter.</p>
            ) : filtered.map(feat => {
              const active = picked === feat.name;
              return (
                <button
                  key={feat.id || feat.name}
                  onClick={() => onPick(feat.name)}
                  className={`w-full text-left p-2 border transition-all flex items-start justify-between gap-3
                              ${active
                                ? 'border-pf-brass bg-pf-brass/5'
                                : 'border-pf-brass-dim/20 hover:border-pf-brass-dim'}`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-body text-xs text-pf-parchment inline-flex items-center gap-1.5">
                      {feat.name}
                      {recommendedName && recommendedName === feat.name && <RecommendedBadge />}
                    </span>
                    {feat.desc && (
                      <p className="text-[10px] text-pf-stone leading-snug mt-0.5 line-clamp-3">{feat.desc}</p>
                    )}
                  </div>
                  <ThreeActionGlyph count={feat.actions} className="shrink-0 mt-0.5" />
                </button>
              );
            })}
          </div>
        </>
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
