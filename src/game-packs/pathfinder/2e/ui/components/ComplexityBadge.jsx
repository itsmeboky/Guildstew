// Small pill showing class/ancestry complexity (beginner/intermediate/advanced).
// Verbatim from prototype.

import React from 'react';

const ComplexityBadge = ({ level }) => {
  const map = {
    // Complexity tiers
    easy:         { label: 'Easy',              cls: 'bg-pf-sage/15 text-pf-sage border-pf-sage/40' },
    beginner:     { label: 'Beginner-Friendly', cls: 'bg-pf-sage/15 text-pf-sage border-pf-sage/40' },
    intermediate: { label: 'Intermediate',      cls: 'bg-pf-brass/10 text-pf-brass border-pf-brass/40' },
    advanced:     { label: 'Advanced',          cls: 'bg-pf-oxblood/15 text-pf-oxblood-glow border-pf-oxblood/40' },
    master:       { label: 'Master',            cls: 'bg-purple-500/15 text-purple-300 border-purple-400/40' },
    // PF2e rarity → complexity mapping (used for backgrounds today;
    // any data layer that surfaces `system.traits.rarity` can pass it
    // straight through.)
    common:       { label: 'Easy',              cls: 'bg-pf-sage/15 text-pf-sage border-pf-sage/40' },
    uncommon:     { label: 'Intermediate',      cls: 'bg-pf-brass/10 text-pf-brass border-pf-brass/40' },
    rare:         { label: 'Advanced',          cls: 'bg-pf-oxblood/15 text-pf-oxblood-glow border-pf-oxblood/40' },
    unique:       { label: 'Unique',            cls: 'bg-purple-500/15 text-purple-300 border-purple-400/40' },
  };
  const cfg = map[level] || map.intermediate;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-display tracking-[0.18em] uppercase border ${cfg.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
};

export default ComplexityBadge;
