/**
 * Display-name policy helpers — single source of truth so the
 * "no email, no real name in public surfaces" rule lives in one
 * place and every surface can stop hand-rolling its own fallback
 * chain.
 *
 * Rules (per product spec):
 *   - OUTSIDE a campaign (forums, Tavern, friends list, sidebars,
 *     leaderboards, profile pages, creator surfaces, support inbox):
 *     ALWAYS show user_profiles.username. Never the email, never
 *     the legal name. Falls back to "Adventurer" or a UUID slice
 *     when a profile hasn't picked a username yet.
 *   - INSIDE a campaign (party tracker, initiative bar, chat,
 *     session view, character cards, GM screens): show the
 *     character name. The GM gets "<Character> (<username>)" so
 *     they know which player is which; everyone else sees only
 *     the character name.
 *
 * Email / full_name are intentionally NOT consulted here — even as
 * fallbacks — so a stale screenshot or shared device never leaks
 * personally-identifying information.
 */

/**
 * Public username display (forums, Tavern, friends, profile pages,
 * etc). Pass the user_profiles row OR the AuthContext user object.
 *
 *   displayName(profile)
 *   displayName(profile, { fallback: "Anonymous" })
 */
export function displayName(profile, { fallback = "Adventurer" } = {}) {
  if (!profile) return fallback;
  const name = (profile.username || "").trim();
  if (name) return name;
  // Identify the user by a short id slice when there's literally no
  // username yet — readable but not personally identifying.
  const uid = profile.user_id || profile.id;
  return uid ? `${fallback} ${String(uid).slice(0, 4)}` : fallback;
}

/**
 * First-letter avatar fallback. Mirrors displayName so empty initials
 * don't blank-out badges.
 */
export function displayInitial(profile) {
  return displayName(profile).charAt(0).toUpperCase() || "?";
}

/**
 * In-campaign display. Pass { character, profile, asGM }:
 *   - everyone sees the character name
 *   - the GM additionally sees "(username)" suffix
 *   - falls back to the public displayName when there's no character
 *     yet (joined campaign, hasn't built a PC)
 */
export function playerDisplayName({ character, profile, asGM = false } = {}) {
  const charName = (character?.name || "").trim();
  const userName = (profile?.username || "").trim();
  if (charName) {
    if (asGM && userName && userName.toLowerCase() !== charName.toLowerCase()) {
      return `${charName} (${userName})`;
    }
    return charName;
  }
  return displayName(profile, { fallback: "Player" });
}
