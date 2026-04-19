/**
 * Shared AM/PM session-time options for the Session Time dropdown.
 * The storage format stays 24-hour HH:MM (what Supabase already has)
 * so existing rows keep rendering; the display label converts to a
 * 12-hour clock with AM/PM.
 */
export const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      out.push({ label, value });
    }
  }
  return out;
})();

/** Safe label lookup so the current value renders nicely in a
 *  SelectValue even when the stored string doesn't line up to a
 *  30-minute slot. */
export function sessionTimeLabel(value) {
  if (!value) return "";
  const hit = TIME_OPTIONS.find((t) => t.value === value);
  if (hit) return hit.label;
  return value;
}
