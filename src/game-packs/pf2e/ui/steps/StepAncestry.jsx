// Step II — Bloodline & Bone (ancestry + heritage + ancestry feats).
// Verbatim from the PF2eCharacterForge prototype.

import React, { useEffect } from 'react';
import GMWhisper from '../components/GMWhisper.jsx';
import ThumbnailStrip from '../components/ThumbnailStrip.jsx';
import CornerBrackets from '../components/CornerBrackets.jsx';
import ComplexityBadge from '../components/ComplexityBadge.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import ThreeActionGlyph from '../components/ThreeActionGlyph.jsx';
import {
  ANCESTRIES,
  HERITAGES_BY_ANCESTRY,
  ANCESTRY_FEATS,
  ANCESTRY_FEAT_LEVELS,
} from '../../data/index.js';
import { getAncestryTip } from '../../content/ancestryTips.js';
import { STEPS } from '../../config/steps.js';

const StepAncestry = ({ data, update }) => {
  const selected = ANCESTRIES.find(a => a.id === data.ancestry) || ANCESTRIES[0];
  const heritages = HERITAGES_BY_ANCESTRY[selected.id] || [];
  const Icon = selected.icon;
  const tipEntry = getAncestryTip(selected.id);

  // auto-select first ancestry on mount if none picked
  useEffect(() => {
    if (!data.ancestry) update({ ancestry: ANCESTRIES[0].id });
  }, []);

  return (
    <div>
      <div className="mb-6">
        <p className="font-display text-xs tracking-[0.3em] text-pf-brass uppercase mb-1">Step the Second</p>
        <h2 className="font-display text-3xl text-pf-bone">Bloodline & Bone</h2>
      </div>

      <GMWhisper>{STEPS[1].whisper}</GMWhisper>

      {/* Thumbnail strip */}
      <ThumbnailStrip
        items={ANCESTRIES}
        selectedId={selected.id}
        onSelect={id => update({ ancestry: id, heritage: null })}
      />

      {/* Detail panel */}
      <div className="relative bg-pf-bg-card border border-pf-brass-dim/30 p-6 mb-5">
        <CornerBrackets active />
        <div className="grid grid-cols-12 gap-6">
          {/* Identity column */}
          <div className="col-span-12 md:col-span-4 flex flex-col gap-3 md:border-r md:border-pf-brass-dim/20 md:pr-6">
            {Icon && <Icon size={48} className="text-pf-brass" strokeWidth={1.2} />}
            <h3 className="font-display text-3xl text-pf-bone">{selected.name}</h3>
            <ComplexityBadge level={tipEntry.complexity} />
            <p className="font-body text-sm text-pf-parchment leading-relaxed">{selected.description}</p>
          </div>

          {/* Stats column */}
          <div className="col-span-12 md:col-span-4">
            <SectionHeader>Statblock</SectionHeader>
            <div className="grid grid-cols-2 gap-y-2 text-xs font-body">
              <span className="text-pf-stone">Hit Points</span><span className="text-pf-parchment text-right font-mono">{selected.hp}</span>
              <span className="text-pf-stone">Size</span><span className="text-pf-parchment text-right">{selected.size}</span>
              <span className="text-pf-stone">Speed</span><span className="text-pf-parchment text-right font-mono">{selected.speed} ft.</span>
              <span className="text-pf-stone">Vision</span><span className="text-pf-parchment text-right capitalize">{selected.vision}</span>
              <span className="text-pf-stone">Languages</span><span className="text-pf-parchment text-right">{selected.languages.join(', ')}</span>
            </div>

            <div className="mt-4 pt-4 border-t border-pf-brass-dim/20">
              <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-2">Ability Modifiers</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.boosts.map((b, i) => (
                  <span key={i} className="px-2 py-0.5 text-[11px] font-mono bg-pf-brass/10 text-pf-brass border border-pf-brass/30">
                    {b === 'free' ? '+ FREE' : `+ ${b.slice(0, 3).toUpperCase()}`}
                  </span>
                ))}
                {selected.flaws.map((f, i) => (
                  <span key={`f${i}`} className="px-2 py-0.5 text-[11px] font-mono bg-pf-oxblood/20 text-pf-oxblood-glow border border-pf-oxblood/40">
                    − {f.slice(0, 3).toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tip column */}
          <div className="col-span-12 md:col-span-4">
            <SectionHeader>For New Players</SectionHeader>
            <p className="font-body text-sm text-pf-parchment leading-relaxed italic">
              "{tipEntry.tip}"
            </p>
          </div>
        </div>
      </div>

      {/* Heritage row */}
      <SectionHeader>Heritage — {selected.name}</SectionHeader>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {heritages.map(h => {
          const active = data.heritage === h.id;
          return (
            <button
              key={h.id}
              onClick={() => update({ heritage: h.id })}
              className={`relative text-left p-4 bg-pf-bg-card border transition-all
                          ${active ? 'border-pf-brass bg-pf-brass/5' : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
            >
              {active && <CornerBrackets active />}
              <h5 className="font-display text-base text-pf-bone mb-1.5">{h.name}</h5>
              <p className="text-xs text-pf-stone font-body leading-relaxed">{h.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Ancestry Feats — multi-picker per feat level */}
      {(() => {
        const level = data.level || 1;
        const paragonLevels = [1, 3, 7, 11, 15];
        const standardLevels = ANCESTRY_FEAT_LEVELS;
        const featLevels = (data.houseRules?.ancestryParagon ? paragonLevels : standardLevels).filter(l => l <= level);
        const ancestryFeats = data.ancestryFeats || {};
        const featOptions = ANCESTRY_FEATS[selected.id] || [];

        return (
          <>
            <SectionHeader>Ancestry Feats ({featLevels.length}){data.houseRules?.ancestryParagon && <span className="font-body text-xs italic text-pf-brass-dim ml-3 normal-case tracking-normal">⊕ Ancestry Paragon</span>}</SectionHeader>
            <p className="font-body text-xs text-pf-stone mb-3 italic">
              Ancestry feats arrive at levels {featLevels.join(', ')}. At each slot, pick one. The {selected.name} 1st-level options are shown below; higher-level slots will populate with their proper catalogs from the SRD import.
            </p>
            <div className="space-y-5">
              {featLevels.map(fLvl => {
                const picked = ancestryFeats[fLvl];
                return (
                  <div key={fLvl}>
                    <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-2">
                      Level {fLvl} Ancestry Feat
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {featOptions.map(feat => {
                        const active = picked === feat.name;
                        return (
                          <button
                            key={feat.name}
                            onClick={() => update({ ancestryFeats: { ...ancestryFeats, [fLvl]: feat.name } })}
                            className={`relative p-3 bg-pf-bg-card border text-left transition-all
                                        ${active ? 'border-pf-brass bg-pf-brass/5' : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
                          >
                            {active && <CornerBrackets active />}
                            <div className="flex items-baseline justify-between mb-1">
                              <span className="font-display text-sm text-pf-bone">{feat.name}</span>
                              <ThreeActionGlyph count={feat.actions} />
                            </div>
                            <p className="font-body text-[11px] text-pf-stone leading-snug">{feat.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                    {fLvl > 1 && (
                      <p className="text-[10px] text-pf-stone/70 font-body italic mt-1">
                        (Full level-{fLvl} ancestry feat catalog wires in via SRD import.)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default StepAncestry;
