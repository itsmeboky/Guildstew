// Inventory tab — loadout list with quantity + bulk per item, plus a
// "Equipped via the X class kit" callout when the kit's been taken
// and a currency row at the bottom.
//
// Visual treatment matches the library shell: dark item cards with
// gray borders, bulk rendered as a small bordered chip, currency
// shown as compact CP/SP/GP/PP pills.

import React from 'react';

export default function InventoryTab({ data }) {
  const loadout = data.loadout || [];
  const kit = data.kitTaken;
  const currency = data.currency || {};

  return (
    <div className="space-y-3">
      {kit && (
        <div className="bg-[#FF5722]/10 border border-[#FF5722]/40 rounded-lg px-3 py-2 text-xs text-gray-300">
          Equipped via the <span className="text-[#FF5722] uppercase tracking-wider font-display">{kit}</span> class kit.
        </div>
      )}

      <div className="flex items-baseline justify-between border-b border-gray-700/60 pb-1">
        <span className="font-display text-[11px] tracking-[0.2em] uppercase text-[#FF5722]">
          Loadout
        </span>
        <span className="font-mono text-[10px] text-gray-500">{loadout.length}</span>
      </div>

      {loadout.length === 0 ? (
        <p className="text-gray-500 italic text-xs px-1">No equipment recorded.</p>
      ) : (
        <ul className="space-y-1.5">
          {loadout.map((item, idx) => (
            <li
              key={`${item.name}-${idx}`}
              className="flex items-center justify-between bg-[#1E2430] border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <span className="text-white">
                {item.name}
                {(item.qty || 1) > 1 && (
                  <span className="text-[#FF5722] text-xs ml-2 font-mono">×{item.qty}</span>
                )}
              </span>
              <BulkChip bulk={item.bulk} />
            </li>
          ))}
        </ul>
      )}

      <CurrencyRow currency={currency} />
    </div>
  );
}

function BulkChip({ bulk }) {
  const value = bulk === 'L' ? 'L' : bulk === '—' ? '—' : (bulk ?? '');
  if (value === '' || value === '—') {
    return <span className="font-mono text-[10px] text-gray-600">—</span>;
  }
  return (
    <span className="font-mono text-[10px] text-gray-300 px-1.5 py-0.5 border border-gray-700 rounded">
      {value} bulk
    </span>
  );
}

function CurrencyRow({ currency }) {
  const slots = [
    ['pp', 'PP', '#9CA3AF'],
    ['gp', 'GP', '#FFB347'],
    ['sp', 'SP', '#E5E7EB'],
    ['cp', 'CP', '#B45309'],
  ];
  const total = slots.reduce((acc, [k]) => acc + (currency[k] || 0), 0);
  if (total === 0) return null;
  return (
    <div className="flex gap-2 pt-2 border-t border-gray-700/60">
      {slots.map(([key, label, color]) => {
        const value = currency[key] || 0;
        if (value === 0) return null;
        return (
          <span
            key={key}
            className="font-mono text-[11px] px-2 py-1 border rounded"
            style={{ color, borderColor: `${color}55` }}
          >
            {value} {label}
          </span>
        );
      })}
    </div>
  );
}
