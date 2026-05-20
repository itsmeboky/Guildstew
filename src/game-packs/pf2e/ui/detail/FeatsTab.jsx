// Feats tab — four groups (Class / Ancestry / Skill / General) each
// sorted by level. Empty-state copy per group when nothing's been
// picked yet.
//
// Visual treatment mirrors the library shell: each group title sits
// on a thin underline, feat cards use the dark-rounded shape with a
// gray border, and the level chip lives on the left in muted gray
// while the feat name itself stays high-contrast.

import React from 'react';

export default function FeatsTab({ data }) {
  return (
    <div className="space-y-4">
      <FeatGroup label="Class Feats"    map={data.classFeats}    emptyHint="No class feats picked." />
      <FeatGroup label="Ancestry Feats" map={data.ancestryFeats} emptyHint="No ancestry feats picked." />
      <FeatGroup label="Skill Feats"    map={data.skillFeats}    emptyHint="No skill feats picked." />
      <FeatGroup label="General Feats"  map={data.generalFeats}  emptyHint="No general feats picked." />
    </div>
  );
}

function GroupHeading({ children, count }) {
  return (
    <div className="flex items-baseline justify-between border-b border-gray-700/60 pb-1 mb-2">
      <span className="font-display text-[11px] tracking-[0.2em] uppercase text-[#FF5722]">
        {children}
      </span>
      <span className="font-mono text-[10px] text-gray-500">{count}</span>
    </div>
  );
}

function FeatGroup({ label, map, emptyHint }) {
  const entries = Object.entries(map || {})
    .filter(([, name]) => !!name)
    .sort(([a], [b]) => Number(a) - Number(b));
  return (
    <div>
      <GroupHeading count={entries.length}>{label}</GroupHeading>
      {entries.length === 0 ? (
        <p className="text-gray-500 italic text-xs px-1">{emptyHint}</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map(([lvl, name]) => (
            <li
              key={lvl}
              className="flex items-baseline gap-3 bg-[#1E2430] border border-gray-700 rounded-lg px-3 py-2"
            >
              <span className="font-mono text-[10px] text-gray-500 tracking-wider w-9 shrink-0">Lv {lvl}</span>
              <span className="text-sm text-white font-medium flex-1 min-w-0">{name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
