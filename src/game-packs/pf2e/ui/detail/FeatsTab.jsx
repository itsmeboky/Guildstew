// Feats tab — four groups (Class / Ancestry / Skill / General) each
// sorted by level. Empty-state copy per group when nothing's been
// picked yet.

import React from 'react';
import { SectionHeading } from './_shared.js';

export default function FeatsTab({ data }) {
  return (
    <div className="space-y-3">
      <FeatGroup label="Class Feats"    map={data.classFeats}    emptyHint="No class feats picked." />
      <FeatGroup label="Ancestry Feats" map={data.ancestryFeats} emptyHint="No ancestry feats picked." />
      <FeatGroup label="Skill Feats"    map={data.skillFeats}    emptyHint="No skill feats picked." />
      <FeatGroup label="General Feats"  map={data.generalFeats}  emptyHint="No general feats picked." />
    </div>
  );
}

function FeatGroup({ label, map, emptyHint }) {
  const entries = Object.entries(map || {})
    .filter(([, name]) => !!name)
    .sort(([a], [b]) => Number(a) - Number(b));
  return (
    <div>
      <SectionHeading>{label}</SectionHeading>
      {entries.length === 0 ? (
        <p className="text-pf-stone italic text-xs px-1 mt-1">{emptyHint}</p>
      ) : (
        <ul className="space-y-1 mt-1">
          {entries.map(([lvl, name]) => (
            <li key={lvl} className="flex items-baseline gap-2 bg-[#1E2430] border border-pf-brass-dim/30 px-3 py-1.5">
              <span className="font-mono text-[10px] text-pf-brass tracking-wider w-10">Lv {lvl}</span>
              <span className="text-sm text-pf-bone">{name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
