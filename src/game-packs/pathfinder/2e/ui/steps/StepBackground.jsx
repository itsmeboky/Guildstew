// Step III — Before the Adventure (background pick + lore subskill).
// Verbatim from the PF2eCharacterForge prototype.

import React, { useEffect } from 'react';
import { Compass } from 'lucide-react';
import GMWhisper from '../components/GMWhisper.jsx';
import AnnotatedText from '@/components/glossary/AnnotatedText';
import ThumbnailStrip from '../components/ThumbnailStrip.jsx';
import CornerBrackets from '../components/CornerBrackets.jsx';
import ComplexityBadge from '../components/ComplexityBadge.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import MechanicRow from '../components/MechanicRow.jsx';
import UnknownEntityError from '../components/UnknownEntityError.jsx';
import { BACKGROUNDS, BACKGROUND_DETAILS, LORES } from '../../data/index.js';
import { getBackgroundTip } from '../../content/backgroundTips.js';
import { STEPS } from '../../config/steps.js';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
// Mirror of normalizeSlug in content/backgroundTips.js — the tip
// lookup runs the input through its own normalizer too, so this is
// defense-in-depth: if the import ever ships a name with stray
// whitespace or underscores the lookup still resolves.
const slugify = (s) => String(s || '')
  .toLowerCase()
  .trim()
  .replace(/[\s_]+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const StepBackground = ({ data, update }) => {
  useEffect(() => {
    if (!data.background && BACKGROUNDS.length > 0) {
      update({ background: BACKGROUNDS[0].slug });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = BACKGROUNDS.find(b => b.slug === data.background);
  if (data.background && !selected) {
    console.error('[pf2e] Unknown background slug:', data.background, '— available count:', BACKGROUNDS.length);
    return (
      <UnknownEntityError
        kind="background"
        slug={data.background}
        available={BACKGROUNDS.map(b => b.slug)}
        onReset={() => update({ background: null })}
      />
    );
  }
  if (!selected) return null;

  const flavor = selected.desc || '';
  // Curated tip per background slug; falls back to a generic framing
  // line when a tip hasn't been written yet (better than echoing the
  // first sentence of the SRD prose).
  const helpfulTip = getBackgroundTip(slugify(selected.name));
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
              <ComplexityBadge level={selected.rarity} />
            </div>
            <p className="font-body text-sm text-pf-parchment italic leading-relaxed mb-4">{flavor}</p>

            <div className="mt-6">
              <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-2">Helpful Tip</p>
              <p className="font-body text-sm text-pf-parchment leading-relaxed italic"><AnnotatedText text={helpfulTip} /></p>
            </div>
          </div>

          {/* Mechanics */}
          <div className="col-span-12 md:col-span-7">
            <SectionHeader>Grants</SectionHeader>
            <div className="space-y-3 text-sm font-body">
              <MechanicRow label="Ability Boosts" value={(selected.boosts || []).map(cap).join(' · ')} />
              <MechanicRow label="Trained Skill" value={cap(trainedSkill)} highlight />
              <LoreSkillRow selected={selected} data={data} update={update} />
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

/**
 * Lore subskill row. Some backgrounds grant a specific Lore (Acolyte →
 * Scribing Lore); others let the player pick freely. When the
 * background's `loreSubskill` is set, render a locked chip; when it's
 * null, render a dropdown sourced from the static LORES list.
 *
 * Persists the chosen Lore as `data.backgroundLoreSubskill` (string).
 * Auto-clears when the background changes — the locked chip path
 * stamps the granted Lore back onto the field so downstream consumers
 * (sheet rendering, Step-9 validator) read it uniformly.
 */
function LoreSkillRow({ selected, data, update }) {
  const granted = selected?.loreSubskill;

  React.useEffect(() => {
    if (granted && data.backgroundLoreSubskill !== granted) {
      update({ backgroundLoreSubskill: granted });
    }
    if (!granted && data.backgroundLoreSubskill && !LORES.includes(data.backgroundLoreSubskill)) {
      // Background changed to one that doesn't grant the previously
      // stored subskill — wipe it so the picker shows empty.
      update({ backgroundLoreSubskill: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, granted]);

  if (granted) {
    return (
      <div className="flex items-center justify-between border-b border-pf-brass-dim/10 py-1">
        <span className="text-pf-stone">Lore Skill</span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-display tracking-wider uppercase bg-pf-brass/15 border border-pf-brass/40 text-pf-bone">
          {granted} Lore
          <span className="text-[8px] text-pf-brass">auto</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-pf-brass-dim/10 py-1">
      <span className="text-pf-stone shrink-0">Lore Skill</span>
      <select
        value={data.backgroundLoreSubskill || ''}
        onChange={e => update({ backgroundLoreSubskill: e.target.value })}
        className="flex-1 max-w-[16rem] bg-pf-bg-elev border border-pf-brass-dim/30 px-2 py-1 text-[11px] font-body text-pf-bone
                   focus:border-pf-brass focus:outline-none transition-all"
      >
        <option value="">— Pick a Lore subskill —</option>
        {LORES.map(name => (
          <option key={name} value={name}>{name} Lore</option>
        ))}
      </select>
    </div>
  );
}

export default StepBackground;
