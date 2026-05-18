// Larger proficiency row variant used on the Class step. Verbatim from prototype.

import React from 'react';
import ProficiencyDots from './ProficiencyDots.jsx';
import { tierToIndex } from '../../rules/proficiency.js';

const ProfRow = ({ label, tier }) => (
  <div className="flex items-center justify-between py-1 border-b border-pf-brass-dim/10">
    <span className="text-pf-parchment">{label}</span>
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-[10px] text-pf-stone">{tier}</span>
      <ProficiencyDots tier={tierToIndex(tier)} />
    </div>
  </div>
);

export default ProfRow;
