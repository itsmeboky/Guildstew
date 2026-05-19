// Stats tab — HP / AC / Speed / Perception / Class DC / Spell DC,
// saving throws, ability modifiers. All math comes from the creator's
// computeDerivedStats helper so the displayed values match what the
// creator's BottomBar showed during character build.

import React from 'react';
import { ANCESTRIES } from '../../data/index.js';
import { computeDerivedStats } from '../../rules/compute-derived-stats.js';
import { fmtMod, SectionHeading, StatBlock } from './_shared.js';

export default function StatsTab({ data }) {
  const stats = computeDerivedStats(data);
  const ancestry = ANCESTRIES.find(a => a.slug === data.ancestry);
  const speed = ancestry?.speed || 25;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <StatBlock label="HP" value={stats.hp} />
        <StatBlock label="AC" value={stats.ac} />
        <StatBlock label="Speed" value={`${speed} ft`} />
        <StatBlock label="Perception" value={fmtMod(stats.perception)} />
        {stats.classDC != null && <StatBlock label="Class DC" value={stats.classDC} />}
        {stats.spellDC != null && <StatBlock label="Spell DC" value={stats.spellDC} />}
      </div>

      <SectionHeading>Saving Throws</SectionHeading>
      <div className="grid grid-cols-3 gap-2">
        <StatBlock label="Fortitude" value={fmtMod(stats.fort)} />
        <StatBlock label="Reflex"    value={fmtMod(stats.ref)} />
        <StatBlock label="Will"      value={fmtMod(stats.will)} />
      </div>

      <SectionHeading>Ability Modifiers</SectionHeading>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {Object.entries(stats.mods).map(([ab, mod]) => (
          <StatBlock
            key={ab}
            label={ab.slice(0, 3)}
            value={fmtMod(mod)}
            sub={`score ${stats.scores[ab]}`}
          />
        ))}
      </div>
    </div>
  );
}
