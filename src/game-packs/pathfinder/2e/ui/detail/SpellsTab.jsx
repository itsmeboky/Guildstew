// Spells tab — surfaces tradition + prep style at the top, then
// cantrips, rank-1 spells, any higher ranks present, and focus
// spells if any. Mounted by CharacterSheet only when isCaster()
// resolves true, so it doesn't render for martial-only classes.

import React from 'react';
import { CASTING_TRADITION_BY_CLASS } from '../../data/index.js';
import { cap, SectionHeading } from './_shared.jsx';

export default function SpellsTab({ data }) {
  const tradition = CASTING_TRADITION_BY_CLASS[data.class];
  const cantrips = data.cantripsKnown || [];
  const spellsByRank = data.spellsByRank || {};
  const rank1 = spellsByRank[1] || data.rank1Known || [];
  const otherRanks = Object.entries(spellsByRank)
    .filter(([rank]) => Number(rank) > 1)
    .sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="space-y-3">
      {tradition && (
        <p className="font-body text-xs text-pf-stone italic">
          {cap(tradition.tradition)} caster · {cap(tradition.prep)} · key {tradition.keyAbility}
        </p>
      )}

      <SpellList label={`Cantrips (${cantrips.length})`} spells={cantrips} />
      <SpellList label={`Rank 1 (${rank1.length})`} spells={rank1} />
      {otherRanks.map(([rank, spells]) => (
        <SpellList key={rank} label={`Rank ${rank} (${spells.length})`} spells={spells} />
      ))}

      {data.focusSpells?.length > 0 && (
        <SpellList label={`Focus Spells (${data.focusSpells.length})`} spells={data.focusSpells} />
      )}
    </div>
  );
}

function SpellList({ label, spells }) {
  return (
    <div>
      <SectionHeading>{label}</SectionHeading>
      {(!spells || spells.length === 0) ? (
        <p className="text-pf-stone italic text-xs px-1 mt-1">None.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {spells.map(name => (
            <span key={name} className="px-2 py-1 text-xs bg-[#1E2430] border border-pf-brass-dim/30 text-pf-parchment">
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
