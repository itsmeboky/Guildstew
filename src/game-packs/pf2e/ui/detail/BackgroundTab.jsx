// Background tab — ancestry / heritage / background / class /
// subclass flavor blocks, languages chip row, deity + pronouns when
// set. Visual treatment matches the library shell: rounded dark
// cards with gray borders, orange labels, white names, muted desc.

import React from 'react';
import { ANCESTRIES, HERITAGES_BY_ANCESTRY, BACKGROUNDS, CLASSES, CLASS_DETAILS } from '../../data/index.js';
import { cap } from './_shared.js';

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

      <Section label="Languages">
        <div className="flex flex-wrap gap-1.5">
          {baseLanguages.map(lang => (
            <span key={`b-${lang}`} className="px-2 py-1 text-[10px] font-display tracking-wider uppercase bg-[#37F2D1]/15 border border-[#37F2D1]/40 text-[#37F2D1] rounded">
              {lang} <span className="text-gray-400 text-[8px] ml-1">auto</span>
            </span>
          ))}
          {additional.map(lang => (
            <span key={`a-${lang}`} className="px-2 py-1 text-[10px] font-display tracking-wider uppercase bg-[#1E2430] border border-gray-700 text-gray-200 rounded">
              {lang}
            </span>
          ))}
          {baseLanguages.length === 0 && additional.length === 0 && (
            <p className="text-gray-500 italic text-xs">No languages recorded.</p>
          )}
        </div>
      </Section>

      {data.deity && (
        <Section label="Deity">
          <p className="text-sm text-gray-200">{data.deity?.name || String(data.deity)}</p>
        </Section>
      )}

      {data.pronouns && (
        <p className="text-xs text-gray-400">
          <span className="text-[#FF5722] uppercase tracking-wider font-display text-[10px] mr-2">Pronouns</span>
          {data.pronouns}
        </p>
      )}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <p className="font-display text-[11px] tracking-[0.2em] uppercase text-[#FF5722] border-b border-gray-700/60 pb-1 mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function FlavorBlock({ label, name, desc }) {
  if (!name) return null;
  return (
    <div className="bg-[#1E2430] border border-gray-700 rounded-lg p-3">
      <p className="font-display text-[10px] tracking-[0.2em] text-[#FF5722] uppercase mb-1">{label}</p>
      <p className="text-base text-white font-bold mb-1.5">{name}</p>
      {desc && (
        <p className="font-body text-xs text-gray-400 leading-relaxed line-clamp-4">{desc}</p>
      )}
    </div>
  );
}
