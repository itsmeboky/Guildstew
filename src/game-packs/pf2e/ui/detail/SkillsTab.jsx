// Skills tab — every PF2e skill with its proficiency tier label and
// computed modifier (ability mod + proficiency bonus + level). Pulls
// the class auto-trained + background auto-trained lists into the
// "trained" set so background-granted skills render correctly even
// before the player adds any picks of their own.

import React from 'react';
import { SKILLS, CLASSES, BACKGROUNDS } from '../../data/index.js';
import { computeDerivedStats } from '../../rules/compute-derived-stats.js';
import { PROFICIENCY_TIER_LABELS, PROF_TIER_INDEX, profBonus } from '../../rules/proficiency.js';
import { fmtMod, SectionHeading } from './_shared.js';

const abilityKey = (short) => ({
  Str: 'Strength', Dex: 'Dexterity', Con: 'Constitution',
  Int: 'Intelligence', Wis: 'Wisdom', Cha: 'Charisma',
}[short] || short);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {SKILLS.map(skill => {
          const slug = skill.name.toLowerCase();
          const isTrained = trained.has(slug) || classAuto.has(slug) || bgAuto.has(slug);
          const tier = tiers[skill.name] || (isTrained ? 'trained' : 'untrained');
          const rank = PROF_TIER_INDEX[tier] ?? 0;
          const abMod = stats.mods[abilityKey(skill.ability)] || 0;
          const modifier = abMod + profBonus(tier, level, stats.opts);
          return (
            <div key={skill.name} className="flex items-center justify-between bg-[#1E2430] border border-pf-brass-dim/30 px-3 py-1.5">
              <span className="text-sm text-pf-parchment">{skill.name} <span className="text-pf-stone text-[10px] font-mono">({skill.ability})</span></span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] text-pf-stone uppercase tracking-wider">{PROFICIENCY_TIER_LABELS[rank]}</span>
                <span className="font-mono text-sm text-pf-bone tabular-nums w-8 text-right">{fmtMod(modifier)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {loreSubskill && (
        <div>
          <SectionHeading>Lore Subskills</SectionHeading>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-display tracking-wider uppercase bg-pf-brass/15 border border-pf-brass/40 text-pf-bone">
              {loreSubskill} Lore
              <span className="text-[8px] text-pf-brass">auto</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
