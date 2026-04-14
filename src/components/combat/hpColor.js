/**
 * Returns the background color class used for a health bar fill, based on
 * the percentage of current HP remaining.
 *
 *   >= 50% → green   (#22c55e)
 *   >= 25% → yellow  (#eab308)
 *    < 25% → red     (#ef4444)
 *
 * Used by every HP bar in the app so players and monsters share the same
 * "how hurt are they" visual language. Side-flavor (ally vs enemy) is
 * conveyed through name-label bubbles instead of bar color.
 */
export function hpBarColor(percent) {
  const p = Number.isFinite(percent) ? percent : 0;
  if (p >= 50) return "bg-[#22c55e]";
  if (p >= 25) return "bg-[#eab308]";
  return "bg-[#ef4444]";
}

/** Same but returns the raw hex color (for inline styles / SVG etc.). */
export function hpBarColorHex(percent) {
  const p = Number.isFinite(percent) ? percent : 0;
  if (p >= 50) return "#22c55e";
  if (p >= 25) return "#eab308";
  return "#ef4444";
}

/** Clamp a new HP value into [0, max]. Works for damage AND healing. */
export function clampHp(current, max, delta) {
  const m = Number.isFinite(max) ? max : 0;
  const c = Number.isFinite(current) ? current : m;
  return Math.max(0, Math.min(m, c - delta));
}
