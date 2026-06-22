// Stats tab — HP / AC / Speed / Perception / Class DC / Spell DC,
// saving throws, ability modifiers. All math comes from the creator's
// computeDerivedStats helper so the displayed values match what the
// creator's BottomBar showed during character build.
//
// Visual treatment mirrors the D&D 5e library detail's card-with-
// icon + accent-color shape so the two systems feel like the same
// app surface even though the field set differs (PF2e replaces D&D's
// Hit Dice with Class DC, surfaces Spell DC explicitly for casters,
// uses Saves cards in place of D&D's implicit save row).

import React from 'react';
import { Shield, Heart, Zap, Footprints, Eye, Crosshair, Sparkles, BookOpen } from 'lucide-react';
import { ANCESTRIES } from '../../data/index.js';
import { computeDerivedStats } from '../../rules/compute-derived-stats.js';
import { fmtMod, SectionHeading, StatCard } from './_shared.jsx';

// Accent palette mirrors D&D 5e: teal=AC, red=HP, orange=Initiative,
// brass=Class DC / Spell DC, gray=Speed/Perception. Keeps the two
// systems visually unified on the library shelf.
const TEAL   = '#37F2D1';
const RED    = '#EF4444';
const ORANGE = '#FF5722';
const BRASS  = '#C9A961';
const GRAY   = '#9CA3AF';
const VIOLET = '#A78BFA';

export default function StatsTab({ data }) {
  const stats = computeDerivedStats(data);
  const ancestry = ANCESTRIES.find(a => a.slug === data.ancestry);
  const speed = ancestry?.speed || 25;

  return (
    <div className="space-y-3">
      {/* HP gets a full-width banner card matching D&D 5e's prominence */}
      <StatCard icon={Heart} label="Hit Points" value={stats.hp} accent={RED} tall />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <StatCard icon={Shield}     label="Armor Class"  value={stats.ac}                accent={TEAL} />
        <StatCard icon={Footprints} label="Speed"        value={`${speed} ft`}           accent={GRAY} />
        <StatCard icon={Eye}        label="Perception"   value={fmtMod(stats.perception)} accent={GRAY} />
        <StatCard icon={Zap}        label="Initiative"   value={fmtMod(stats.initiative)} accent={ORANGE} />
        {stats.classDC != null && (
          <StatCard icon={Crosshair} label="Class DC"    value={stats.classDC}            accent={BRASS} />
        )}
        {stats.spellDC != null && (
          <StatCard icon={Sparkles}  label="Spell DC"    value={stats.spellDC}            accent={VIOLET} />
        )}
      </div>

      <SectionHeading>Saving Throws</SectionHeading>
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Fortitude" value={fmtMod(stats.fort)} accent={RED} />
        <StatCard label="Reflex"    value={fmtMod(stats.ref)}  accent={ORANGE} />
        <StatCard label="Will"      value={fmtMod(stats.will)} accent={VIOLET} />
      </div>

      <SectionHeading>Ability Modifiers</SectionHeading>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {Object.entries(stats.mods).map(([ab, mod]) => (
          <StatCard
            key={ab}
            label={ab.slice(0, 3)}
            value={fmtMod(mod)}
            sub={`score ${stats.scores[ab]}`}
            accent={ORANGE}
          />
        ))}
      </div>
    </div>
  );
}
