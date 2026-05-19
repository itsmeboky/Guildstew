// Inventory tab — loadout list with quantity + bulk per item, plus a
// "Equipped via the X class kit" callout when the kit's been taken.

import React from 'react';
import { SectionHeading } from './_shared.js';

export default function InventoryTab({ data }) {
  const loadout = data.loadout || [];
  const kit = data.kitTaken;

  return (
    <div className="space-y-3">
      {kit && (
        <p className="text-xs text-pf-stone italic">
          Equipped via the <span className="text-pf-brass uppercase tracking-wider">{kit}</span> class kit.
        </p>
      )}

      <SectionHeading>Loadout ({loadout.length})</SectionHeading>
      {loadout.length === 0 ? (
        <p className="text-pf-stone italic text-xs px-1 mt-1">No equipment recorded.</p>
      ) : (
        <ul className="space-y-1 mt-1">
          {loadout.map((item, idx) => (
            <li key={`${item.name}-${idx}`} className="flex items-center justify-between bg-[#1E2430] border border-pf-brass-dim/30 px-3 py-1.5 text-sm">
              <span className="text-pf-parchment">
                {item.name}
                {(item.qty || 1) > 1 && <span className="text-pf-brass text-xs ml-2">×{item.qty}</span>}
              </span>
              <span className="font-mono text-[10px] text-pf-stone">
                {item.bulk === 'L' ? 'L' : item.bulk === '—' ? '—' : (item.bulk ?? '')} bulk
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
