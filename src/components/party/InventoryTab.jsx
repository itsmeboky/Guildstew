import React, { useMemo } from "react";
import { Package, Sword, Coins } from "lucide-react";

const CURRENCY_ORDER = [
  { key: "pp", label: "PP", color: "#e5e7eb" },
  { key: "gp", label: "GP", color: "#fbbf24" },
  { key: "ep", label: "EP", color: "#a7f3d0" },
  { key: "sp", label: "SP", color: "#cbd5e1" },
  { key: "cp", label: "CP", color: "#f97316" },
];

export default function InventoryTab({ character }) {
  const items = Array.isArray(character?.inventory) ? character.inventory : [];
  const currency = character?.currency || {};

  const { equipped, unequipped } = useMemo(() => {
    const eq = [];
    const un = [];
    for (const raw of items) {
      const item = typeof raw === "string" ? { name: raw } : (raw || {});
      if (item.equipped) eq.push(item);
      else un.push(item);
    }
    return { equipped: eq, unequipped: un };
  }, [items]);

  if (items.length === 0 && !Object.values(currency).some(Boolean)) {
    return (
      <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-10 text-center text-slate-500 text-sm">
        Inventory is empty.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {equipped.length > 0 && (
        <section>
          <div className="text-[11px] uppercase tracking-widest text-amber-400 font-bold border-b border-amber-500/20 pb-1 mb-2 flex items-center gap-2">
            <Sword className="w-3 h-3" /> Equipped
          </div>
          <ItemGrid items={equipped} />
        </section>
      )}

      {unequipped.length > 0 && (
        <section>
          <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-700 pb-1 mb-2 flex items-center gap-2">
            <Package className="w-3 h-3" /> Carried
          </div>
          <ItemGrid items={unequipped} />
        </section>
      )}

      <section>
        <div className="text-[11px] uppercase tracking-widest text-yellow-400 font-bold border-b border-yellow-500/20 pb-1 mb-2 flex items-center gap-2">
          <Coins className="w-3 h-3" /> Currency
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {CURRENCY_ORDER.map(({ key, label, color }) => (
            <div
              key={key}
              className="bg-[#0b1220] border border-[#1e293b] rounded-lg px-3 py-2 text-center min-w-[64px]"
            >
              <div className="text-[10px] uppercase tracking-widest" style={{ color }}>{label}</div>
              <div className="text-white font-bold">{Number(currency[key] || 0)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ItemGrid({ items }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {items.map((item, idx) => (
        <div
          key={`${item.name || "item"}-${idx}`}
          className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-2 flex items-center gap-2"
          title={item.description || item.desc || ""}
        >
          {item.image_url ? (
            <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-slate-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white font-bold truncate">{item.name || "Unnamed item"}</div>
            {(item.quantity ?? 1) > 1 && (
              <div className="text-[10px] text-slate-400">×{item.quantity}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
