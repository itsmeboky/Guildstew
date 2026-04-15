import React from "react";

/**
 * Rarity palette used across every item tooltip + card in the GM /
 * player panels. Matches the 5e color convention the task brief
 * expects: common grey, uncommon green, rare blue, very rare purple,
 * legendary orange. Unrecognised rarities fall back to common.
 */
export const RARITY_COLORS = {
  common: "#94a3b8",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  "very rare": "#a855f7",
  legendary: "#f97316",
  artifact: "#f43f5e",
};

export function getRarityColor(rarity) {
  if (!rarity) return RARITY_COLORS.common;
  const key = String(rarity).toLowerCase();
  return RARITY_COLORS[key] || RARITY_COLORS.common;
}

/**
 * Rich item tooltip. Pops out of its parent on hover (or by external
 * toggle) and shows name, type, rarity, weight, cost, properties, and
 * description. Works with the ad-hoc item objects from the loot pool,
 * the campaign_items database rows, and the itemData.jsx hardcoded
 * catalog — all three share the same key names.
 *
 * Usage:
 *   <div className="relative group">
 *     <SomeSlot />
 *     <ItemTooltip item={item} />
 *   </div>
 *
 * The `show` prop lets a parent force-show the tooltip (used by
 * InventorySlot which already manages its own hover state). When
 * omitted the component falls back to CSS group-hover so a wrapping
 * `.group` div triggers it on mouse-enter.
 */
export default function ItemTooltip({ item, show, placement = "top" }) {
  if (!item) return null;

  const rarityColor = getRarityColor(item.rarity);
  const visibilityClass = show === undefined
    ? "opacity-0 group-hover:opacity-100 pointer-events-none"
    : show
    ? "opacity-100"
    : "opacity-0 pointer-events-none";

  const placementClass =
    placement === "bottom"
      ? "top-full mt-2"
      : placement === "left"
      ? "right-full mr-2 top-1/2 -translate-y-1/2"
      : placement === "right"
      ? "left-full ml-2 top-1/2 -translate-y-1/2"
      : "bottom-full mb-2";

  return (
    <div
      className={`absolute ${placementClass} left-1/2 -translate-x-1/2 z-[120] w-60 max-w-[240px] rounded-xl border bg-[#050816]/97 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-3 text-left transition-opacity duration-150 ${visibilityClass}`}
      style={{ borderColor: `${rarityColor}80` }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-black uppercase tracking-wide truncate"
            style={{ color: rarityColor }}
          >
            {item.name || "Unknown"}
          </span>
          {item.quantity > 1 && (
            <span className="text-[9px] text-slate-400 bg-[#111827] rounded px-1.5 py-0.5 flex-shrink-0">
              ×{item.quantity}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 text-[9px] uppercase tracking-wider">
          {item.type && (
            <span className="text-slate-400">{item.type}</span>
          )}
          {item.rarity && (
            <>
              {item.type && <span className="text-slate-700">•</span>}
              <span style={{ color: rarityColor }}>
                {item.rarity}
              </span>
            </>
          )}
        </div>

        {/* Weight + cost line */}
        {(item.weight != null || item.cost != null) && (
          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
            {item.weight != null && (
              <span>
                <span className="text-slate-500">Wt:</span> {item.weight} lb
              </span>
            )}
            {item.cost != null && (
              <span>
                <span className="text-slate-500">Cost:</span> {item.cost}
              </span>
            )}
          </div>
        )}

        {/* Damage / armor class line for weapons and armor */}
        {item.damage && (
          <div className="text-[10px] text-orange-300 mt-1">
            <span className="text-slate-500">Damage:</span> {item.damage}
          </div>
        )}
        {item.armorClass && (
          <div className="text-[10px] text-sky-300 mt-1">
            <span className="text-slate-500">AC:</span> {item.armorClass}
          </div>
        )}

        {/* Properties */}
        {item.properties && (
          <div className="text-[10px] text-slate-300 mt-1 italic">
            {item.properties}
          </div>
        )}

        {/* Description (longer prose, capped height) */}
        {item.description && (
          <div className="text-[10px] text-slate-400 leading-snug mt-1 max-h-32 overflow-y-auto custom-scrollbar">
            {item.description}
          </div>
        )}

        {item.homebrew && (
          <div className="mt-1 text-[8px] uppercase tracking-[0.2em] text-amber-400 font-bold border-t border-amber-500/30 pt-1">
            Homebrew
          </div>
        )}
      </div>
    </div>
  );
}
