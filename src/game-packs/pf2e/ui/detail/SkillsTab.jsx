// Skills tab — every PF2e skill with its proficiency tier label and
// computed modifier (ability mod + proficiency bonus + level). Pulls
// the class auto-trained + background auto-trained lists into the
// "trained" set so background-granted skills render correctly even
// before the player adds any picks of their own.
//
// Visual treatment matches the library shell's dark-card / orange-
// accent vocabulary: trained+ skills get a brighter card and an
// orange-tinted modifier, untrained skills sit muted. Proficiency
// rank renders as a small bordered chip so the tier is glanceable.

import React from 'react';
import { SKILLS, CLASSES, BACKGROUNDS } from '../../data/index.js';
import { computeDerivedStats } from '../../rules/compute-derived-stats.js';
import { PROFICIENCY_TIER_LABELS, PROF_TIER_INDEX, profBonus } from '../../rules/proficiency.js';
import { fmtMod, SectionHeading } from './_shared.js';

const abilityKey = (short) => ({
  Str: 'Strength', Dex: 'Dexterity', Con: 'Constitution',
  Int: 'Intelligence', Wis: 'Wisdom', Cha: 'Charisma',
}[short] || short);

// Per-tier chip styling. Untrained is faded; everything else gets a
// progressively brighter accent matching the library's orange/teal
// palette.
const TIER_CHIP = [
  'border-gray-700 text-gray-500',          // untrained
  'border-[#37F2D1]/40 text-[#37F2D1]',     // trained
  'border-[#37F2D1]/70 text-[#37F2D1]',     // expert
  'border-[#FFB347]/70 text-[#FFB347]',     // master
  'border-[#FF5722] text-[#FF5722]',        // legendary
];

export default function SkillsTab({ data }) {
  const stats = computeDerivedStats(data);
  const level = data.level || 1;
  const trained = new Set((data.trainedSkills || []).map(s => String(s).toLowerCase()));
  const cls = CLASSES.find(c => c.slug === data.class);
  const classAuto = new Set((cls?.trainedSkills?.value || []).map(s => String(s).toLowerCase()));
  const background = BACKGROUNDS.find(b => b.slug === data.background);
  const bgAuto = new Set((background?.trainedSkills || []).map(s => String(s).toLowerCase()));
  const tiers = data.skillTiers || {};
  const loreSubskill = data.backgroundLoreSubskill || background?.loreSubskill;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {SKILLS.map(skill => {
          const slug = skill.name.toLowerCase();
          const isTrained = trained.has(slug) || classAuto.has(slug) || bgAuto.has(slug);
          const tier = tiers[skill.name] || (isTrained ? 'trained' : 'untrained');
          const rank = PROF_TIER_INDEX[tier] ?? 0;
          const abMod = stats.mods[abilityKey(skill.ability)] || 0;
          const modifier = abMod + profBonus(tier, level, stats.opts);
          const trainedPlus = rank > 0;
          return (
            <div
              key={skill.name}
              className={`flex items-center justify-between rounded-lg px-3 py-2 border transition-colors
                          ${trainedPlus
                            ? 'bg-[#1E2430] border-gray-700'
                            : 'bg-[#1E2430]/40 border-gray-800'}`}
            >
              <div className="flex items-baseline gap-2 min-w-0">
                <span className={`text-sm ${trainedPlus ? 'text-white font-medium' : 'text-gray-500'}`}>
                  {skill.name}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                  {skill.ability}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[9px] font-display tracking-[0.15em] uppercase px-1.5 py-0.5 border rounded ${TIER_CHIP[rank] || TIER_CHIP[0]}`}>
                  {PROFICIENCY_TIER_LABELS[rank]}
                </span>
                <span
                  className={`font-mono text-base tabular-nums w-9 text-right font-bold
                              ${trainedPlus ? 'text-[#FF5722]' : 'text-gray-600'}`}
                >
                  {fmtMod(modifier)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {loreSubskill && (
        <div>
          <SectionHeading>Lore Subskills</SectionHeading>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-display tracking-wider uppercase bg-[#FF5722]/15 border border-[#FF5722]/40 text-[#FF5722] rounded">
              {loreSubskill} Lore
              <span className="text-[8px] text-gray-400">auto</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
