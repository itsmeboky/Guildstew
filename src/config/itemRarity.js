/**
 * Item rarity styling — single source of truth for the gradient
 * borders, badge colors, and label formatting that show up on every
 * item card / row across the app.
 *
 * The gradient pair is rendered with bg-gradient-to-br on a 2px
 * outer wrapper around the icon/card so callers can drop in:
 *   <div className={`rounded-lg p-[2px] bg-gradient-to-br ${rarityFrameClasses(item.rarity)}`}>
 *     <div className="rounded-md bg-[#0f1219]">…icon…</div>
 *   </div>
 */

export const RARITY_STYLES = {
  common:    { label: "Common",    from: "from-[#9ca3af]", to: "to-[#6b7280]", badge: "bg-slate-700 text-slate-200 border-slate-500/40" },
  uncommon:  { label: "Uncommon",  from: "from-[#22c55e]", to: "to-[#16a34a]", badge: "bg-emerald-900/40 text-emerald-300 border-emerald-500/40" },
  rare:      { label: "Rare",      from: "from-[#3b82f6]", to: "to-[#2563eb]", badge: "bg-blue-900/40 text-blue-300 border-blue-500/40" },
  very_rare: { label: "Very Rare", from: "from-[#8b5cf6]", to: "to-[#7c3aed]", badge: "bg-violet-900/40 text-violet-300 border-violet-500/40" },
  legendary: { label: "Legendary", from: "from-[#f59e0b]", to: "to-[#d97706]", badge: "bg-amber-900/40 text-amber-300 border-amber-500/40" },
  artifact:  { label: "Artifact",  from: "from-[#dc2626]", to: "to-[#991b1b]", badge: "bg-red-900/40 text-red-300 border-red-500/40" },
};

const FALLBACK = RARITY_STYLES.common;

export function rarityKey(rarity) {
  if (!rarity) return "common";
  return String(rarity).toLowerCase().replace(/\s+/g, "_");
}

export function rarityStyle(rarity) {
  return RARITY_STYLES[rarityKey(rarity)] || FALLBACK;
}

export function rarityFrameClasses(rarity) {
  const s = rarityStyle(rarity);
  return `${s.from} ${s.to}`;
}

export function rarityBadgeClasses(rarity) {
  return rarityStyle(rarity).badge;
}

export function rarityLabel(rarity) {
  return rarityStyle(rarity).label;
}
