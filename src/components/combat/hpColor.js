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

/**
 * Normalize HP from any of the wild-data shapes we see on characters and
 * monsters into { current, max, temporary }. Use this whenever a queue
 * entry is added or whenever a renderer needs HP and can't trust the
 * incoming field name.
 *
 * Handles:
 *   { hit_points: { current, max, temporary } }       — PC canonical
 *   { hit_points: "135 (18d10 + 36)" }                — SRD monster string
 *   { hit_points: 42 }                                — bare number
 *   { hp: { … } } / { hp: "42" } / { hp: 42 }         — alt field name
 *   { stats: { hit_points / hp: … } }                 — nested in stats
 */
export function normalizeHp(entity) {
  const empty = { current: 0, max: 0, temporary: 0 };
  if (!entity) return empty;

  // Already-normalized shape wins if the max looks like a real number.
  const direct = entity.hit_points;
  if (direct && typeof direct === "object" && typeof direct.max === "number") {
    const max = direct.max || 0;
    const current = Number.isFinite(direct.current) ? direct.current : max;
    return { current, max, temporary: direct.temporary || 0 };
  }

  const candidates = [
    entity.hit_points,
    entity.hp,
    entity.stats?.hit_points,
    entity.stats?.hp,
  ];
  for (const raw of candidates) {
    if (raw == null) continue;
    if (typeof raw === "object") {
      const max =
        typeof raw.max === "number"
          ? raw.max
          : typeof raw.average === "number"
          ? raw.average
          : typeof raw.value === "number"
          ? raw.value
          : 0;
      if (!max) continue;
      const current = Number.isFinite(raw.current) ? raw.current : max;
      return { current, max, temporary: raw.temporary || 0 };
    }
    if (typeof raw === "number") {
      return { current: raw, max: raw, temporary: 0 };
    }
    if (typeof raw === "string") {
      // SRD style: "135 (18d10 + 36)" → first integer is the total.
      const match = raw.match(/\d+/);
      if (match) {
        const n = parseInt(match[0], 10);
        return { current: n, max: n, temporary: 0 };
      }
    }
  }
  return empty;
}
