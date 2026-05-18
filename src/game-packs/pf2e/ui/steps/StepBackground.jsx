// Step III — Before the Adventure (background pick + lore subskill).
// Verbatim from the PF2eCharacterForge prototype.

import React, { useEffect } from 'react';
import { Compass } from 'lucide-react';
import GMWhisper from '../components/GMWhisper.jsx';
import ThumbnailStrip from '../components/ThumbnailStrip.jsx';
import CornerBrackets from '../components/CornerBrackets.jsx';
import ComplexityBadge from '../components/ComplexityBadge.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import MechanicRow from '../components/MechanicRow.jsx';
import { BACKGROUNDS, BACKGROUND_DETAILS } from '../../data/index.js';
import { STEPS } from '../../config/steps.js';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const firstSentence = (text) => {
  if (!text) return '';
  const trimmed = text.trim();
  const idx = trimmed.search(/[.!?](\s|$)/);
  return idx > -1 ? trimmed.slice(0, idx + 1) : trimmed;
};

const StepBackground = ({ data, update }) => {
  const selected = BACKGROUNDS.find(b => b.id === data.background) || BACKGROUNDS[0];

  useEffect(() => {
    if (!data.background) update({ background: BACKGROUNDS[0].id });
  }, []);

  const flavor = selected.desc || '';
  // Until curated GM tips ship per background, fall back to the
  // first sentence of the SRD description so the whisper panel
  // never renders blank.
  const gmWhisper = selected.tip || firstSentence(flavor);
  const trainedSkill = (selected.trainedSkills || [])[0];
  const grantedFeat = selected.grantedFeat || selected.feat;

  return (
    <div>
      <div className="mb-6">
        <p className="font-display text-xs tracking-[0.3em] text-pf-brass uppercase mb-1">Step the Third</p>
        <h2 className="font-display text-3xl text-pf-bone">Before the Adventure</h2>
      </div>

      <GMWhisper>{STEPS[2].whisper}</GMWhisper>

      <ThumbnailStrip
        items={BACKGROUNDS}
        selectedId={selected.id}
        onSelect={id => update({ background: id })}
        getIcon={() => Compass}
      />

      <div className="relative bg-pf-bg-card border border-pf-brass-dim/30 p-6">
        <CornerBrackets active />
        <div className="grid grid-cols-12 gap-6">
          {/* Identity */}
          <div className="col-span-12 md:col-span-5 md:border-r md:border-pf-brass-dim/20 md:pr-6">
            <div className="flex items-baseline justify-between mb-3 gap-3">
              <h3 className="font-display text-3xl text-pf-bone">{selected.name}</h3>
              <ComplexityBadge level={selected.complexity} />
            </div>
            <p className="font-body text-sm text-pf-parchment italic leading-relaxed mb-4">{flavor}</p>

            <div className="mt-6">
              <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-2">GM's Whisper</p>
              <p className="font-body text-sm text-pf-parchment leading-relaxed italic">{gmWhisper}</p>
            </div>
          </div>

          {/* Mechanics */}
          <div className="col-span-12 md:col-span-7">
            <SectionHeader>Grants</SectionHeader>
            <div className="space-y-3 text-sm font-body">
              <MechanicRow label="Ability Boosts" value={(selected.boosts || []).map(cap).join(' · ')} />
              <MechanicRow label="Trained Skill" value={cap(trainedSkill)} highlight />
              <MechanicRow label="Skill Feat" value={grantedFeat} highlight />
            </div>
          </div>
        </div>
      </div>

      {/* Lore subskill picker + granted skill feat detail */}
      {(() => {
        const detail = BACKGROUND_DETAILS[selected.id];
        if (!detail) return null;
        const pickedLore = data.backgroundLore;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative bg-pf-bg-card border border-pf-brass-dim/30 p-4">
              <CornerBrackets active={!!pickedLore} />
              <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-2">Choose a Lore Specialty</p>
              <p className="font-body text-xs text-pf-stone mb-3 italic">Your background grants one trained Lore subskill. Pick what fits your story.</p>
              <div className="space-y-1.5">
                {detail.loreOptions.map(opt => {
                  const active = pickedLore === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => update({ backgroundLore: opt })}
                      className={`w-full text-left px-3 py-2 border transition-all text-xs font-body
                                  ${active ? 'border-pf-brass bg-pf-brass/10 text-pf-bone' : 'border-pf-brass-dim/30 hover:border-pf-brass-dim text-pf-parchment'}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative bg-pf-bg-card border border-pf-brass-dim/30 p-4">
              <CornerBrackets />
              <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-2">Granted Skill Feat</p>
              <h4 className="font-display text-lg text-pf-bone mb-1">{detail.skillFeat.name}</h4>
              <p className="font-body text-xs text-pf-parchment leading-relaxed">{detail.skillFeat.desc}</p>
              <p className="font-body text-[10px] text-pf-stone italic mt-3">Automatically added at 1st level. Counts as your background-granted skill feat — separate from skill feats earned by leveling.</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default StepBackground;
