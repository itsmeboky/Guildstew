// Sticky bottom summary bar. Avatar + level pip on the left, name/lineage in
// the middle, deity chip + back/continue buttons on the right. Verbatim from prototype.
//
// Co-located `LevelStat` helper is currently unused by BottomBar itself — it
// belongs to the per-level breakdown panel on the review step. Kept here per
// the Phase 3.1 spec ("BottomBar.jsx plus LevelStat helper").

import React from 'react';
import { User, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import PrimaryButton from './PrimaryButton.jsx';
import GhostButton from './GhostButton.jsx';
import { ANCESTRIES, CLASSES, BACKGROUNDS } from '../../data/index.js';

export const LevelStat = ({ label, value }) => (
  <div className="flex items-baseline justify-between border-b border-pf-brass-dim/10 py-0.5">
    <span className="text-pf-stone">{label}</span>
    <span className="font-mono text-pf-bone">{value}</span>
  </div>
);

const BottomBar = ({ data, step, totalSteps, onBack, onNext }) => {
  const ancestry = ANCESTRIES.find(a => a.slug === data.ancestry);
  const cls = CLASSES.find(c => c.slug === data.class);
  const bg = BACKGROUNDS.find(b => b.slug === data.background);

  return (
    <div className="sticky bottom-0 z-30 bg-pf-bg-card/95 backdrop-blur-md border-t border-pf-brass-dim/30">
      <div className="max-w-7xl mx-auto px-8 py-3 flex items-center gap-6">
        {/* Summary chips */}
        <div className="flex items-center gap-4 flex-1 min-w-0 overflow-x-auto">
          <div className="w-10 h-10 rounded-full bg-pf-bg-elev border border-pf-brass-dim/40 flex items-center justify-center shrink-0 relative">
            {data.avatar ? <User size={18} className="text-pf-brass" /> : <User size={18} className="text-pf-stone/50" />}
            <span className="absolute -bottom-1.5 -right-1.5 px-1 min-w-[18px] h-[18px] flex items-center justify-center bg-pf-oxblood border border-pf-bg-card font-mono text-[10px] text-pf-bone leading-none">
              {data.level || 1}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-display text-sm text-pf-bone truncate">{data.name || 'Unnamed'}</span>
            <span className="font-display text-[10px] tracking-[0.15em] text-pf-stone uppercase truncate">
              Lv {data.level || 1} · {[ancestry?.name, cls?.name, bg?.name].filter(Boolean).join(' · ') || 'Forging…'}
            </span>
          </div>

          {data.deity && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-pf-brass/10 border border-pf-brass/30 text-[10px] font-mono text-pf-brass shrink-0">
              <Crown size={11} />
              {data.deity.name}
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="flex items-center gap-3 shrink-0">
          <GhostButton onClick={onBack} className={`${step === 0 ? 'invisible' : ''} !py-2 !px-4 !text-xs`}>
            <ChevronLeft size={12} className="inline-block mr-1.5 -mt-0.5" />
            Back
          </GhostButton>
          {step < totalSteps - 1 && (
            <PrimaryButton onClick={onNext} className="!py-2 !px-5 !text-xs">
              Continue
              <ChevronRight size={12} className="inline-block ml-1.5 -mt-0.5" />
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default BottomBar;
