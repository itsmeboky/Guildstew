/**
 * Filter a list of world-lore entries based on the viewer's role.
 * Rules per spec:
 *   - Public entries: everyone
 *   - GM Only: GM + co-DMs only
 *   - Selected Players: listed user ids + anyone flagged as mole
 *
 * GMs always see everything — so they can edit entries they don't
 * personally fall inside `visible_to_players`.
 */
export function filterByVisibility(entries, { userId, isGM, isMole }) {
  if (!Array.isArray(entries)) return [];
  if (isGM) return entries;
  return entries.filter((entry) => {
    const visibility = entry?.visibility || "public";
    if (visibility === "public") return true;
    if (visibility === "gm_only") return false;
    if (visibility === "selected") {
      const allowed = Array.isArray(entry?.visible_to_players) ? entry.visible_to_players : [];
      if (userId && allowed.includes(userId)) return true;
      return !!isMole;
    }
    return true;
  });
}

export const VISIBILITY_OPTIONS = [
  { value: "public",    label: "🌍 Public",           hint: "All campaign members can see it." },
  { value: "gm_only",   label: "👁️ GM Only",          hint: "Only the GM and co-DMs." },
  { value: "selected",  label: "🔒 Selected Players", hint: "Pick specific players. Moles also see these." },
];

export function visibilityBadge(value) {
  if (value === "gm_only")  return { label: "👁️ GM Only",           cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
  if (value === "selected") return { label: "🔒 Selected Players",  cls: "bg-purple-500/20 text-purple-300 border-purple-500/40" };
  return { label: "🌍 Public", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
}

/** Strip HTML tags for preview rendering in lists / timelines. */
export function stripHtml(html) {
  if (!html) return "";
  return String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
