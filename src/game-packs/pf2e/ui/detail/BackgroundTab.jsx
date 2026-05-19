// Background tab — ancestry / heritage / background / class /
// subclass flavor blocks, languages chip row, deity + pronouns when
// set. Pulls from the cleaned-up flat data shape after Phase J.2 (no
// nested system_data probes here — the SkillsTab/StatsTab kept their
// callers on the same shape).

import React from 'react';
import { ANCESTRIES, HERITAGES_BY_ANCESTRY, BACKGROUNDS, CLASSES, CLASS_DETAILS } from '../../data/index.js';
import { cap, SectionHeading } from './_shared.js';

export default function BackgroundTab({ data }) {
  const ancestry = ANCESTRIES.find(a => a.slug === data.ancestry);
  const heritageList = HERITAGES_BY_ANCESTRY[data.ancestry] || [];
  const heritage = heritageList.find(h => h.slug === data.heritage);
  const background = BACKGROUNDS.find(b => b.slug === data.background);
  const cls = CLASSES.find(c => c.slug === data.class);
  const details = cls && CLASS_DETAILS[data.class];
  const subclass = details?.subclasses?.options?.find(o => o.id === data.subclass);

  const baseLanguages = (ancestry?.languages || []).map(cap);
  const additional = (data.languages || []).map(cap);

  return (
    <div className="space-y-3">
      <FlavorBlock label="Ancestry"   name={ancestry?.name}   desc={ancestry?.desc} />
      {heritage && <FlavorBlock label="Heritage" name={heritage.name} desc={heritage.desc} />}
      <FlavorBlock label="Background" name={background?.name} desc={background?.desc} />
      <FlavorBlock label="Class"      name={cls?.name}        desc={cls?.desc} />
      {subclass && <FlavorBlock label="Subclass" name={subclass.name} desc={subclass.desc} />}

      <SectionHeading>Languages</SectionHeading>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {baseLanguages.map(lang => (
          <span key={`b-${lang}`} className="px-2 py-1 text-[10px] font-display tracking-wider uppercase bg-pf-sage/15 border border-pf-sage/40 text-pf-bone">
            {lang} <span className="text-pf-sage text-[8px] ml-1">auto</span>
          </span>
        ))}
        {additional.map(lang => (
          <span key={`a-${lang}`} className="px-2 py-1 text-[10px] font-display tracking-wider uppercase bg-pf-brass/10 border border-pf-brass/40 text-pf-bone">
            {lang}
          </span>
        ))}
        {baseLanguages.length === 0 && additional.length === 0 && (
          <p className="text-pf-stone italic text-xs">No languages recorded.</p>
        )}
      </div>

      {data.deity && (
        <div>
          <SectionHeading>Deity</SectionHeading>
          <p className="text-sm text-pf-parchment mt-1">{data.deity?.name || String(data.deity)}</p>
        </div>
      )}

      {data.pronouns && (
        <p className="text-xs text-pf-stone"><span className="text-pf-brass uppercase tracking-wider">Pronouns:</span> {data.pronouns}</p>
      )}
    </div>
  );
}

function FlavorBlock({ label, name, desc }) {
  if (!name) return null;
  return (
    <div className="bg-[#1E2430] border border-pf-brass-dim/30 p-3">
      <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-1">{label}</p>
      <p className="font-display text-base text-pf-bone mb-1">{name}</p>
      {desc && (
        <p className="font-body text-xs text-pf-stone leading-snug line-clamp-4">{desc}</p>
      )}
    </div>
  );
}
