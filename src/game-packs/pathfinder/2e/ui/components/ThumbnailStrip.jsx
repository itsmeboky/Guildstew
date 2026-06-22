// Horizontal master-detail thumbnail strip. Each thumb is an icon + label;
// active state shows CornerBrackets and a brass glow. Verbatim from prototype.

import React from 'react';
import CornerBrackets from './CornerBrackets.jsx';

const ThumbnailStrip = ({ items, selectedId, onSelect, getIcon, getLabel }) => (
  <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
    {items.map(item => {
      const Icon = getIcon ? getIcon(item) : item.icon;
      const isActive = selectedId === item.id;
      return (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`relative shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 border transition-all min-w-[100px]
                      ${isActive
                        ? 'border-pf-brass bg-pf-brass/10 shadow-[0_0_24px_-12px_rgba(201,169,97,0.6)]'
                        : 'border-pf-brass-dim/30 hover:border-pf-brass-dim bg-pf-bg-card'}`}
        >
          {isActive && <CornerBrackets active />}
          {Icon && (
            <Icon
              size={20}
              className={isActive ? 'text-pf-brass' : 'text-pf-stone group-hover:text-pf-parchment'}
              strokeWidth={1.5}
            />
          )}
          <span className={`font-display text-xs tracking-wider ${isActive ? 'text-pf-bone' : 'text-pf-parchment'}`}>
            {getLabel ? getLabel(item) : item.name}
          </span>
        </button>
      );
    })}
  </div>
);

export default ThumbnailStrip;
