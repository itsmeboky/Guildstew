/**
 * Display-title catalog (mirrors the seed in
 * `migrations/20261120_user_titles.sql`).
 *
 * Source of truth at runtime is the `title_catalog` table — this file
 * exists so the app can render the title selector without a roundtrip
 * and so we never have to ship UI without the rules.
 *
 * `unlock_rule` controls how `computeEarnedTitleIds()` decides
 * whether the current user has it:
 *
 *   default       → always available
 *   tier          → user.tier matches `unlock_value`
 *                   ('adventurer', 'veteran') or higher
 *   guild_member  → user is in any guild
 *   guild_owner   → user owns a guild
 *   manual        → must appear in the user_titles grant table
 *                   (Chef de Cuisine, Founding Backer, admin awards)
 */
export const TITLE_CATALOG = [
  { id: "wanderer",        label: "Wanderer",        description: "Default for new arrivals.",                             unlock_rule: "default",      unlock_value: null,         is_exclusive: false, sort_order: 0 },
  { id: "player",          label: "Player",          description: "Anyone who plays the game.",                            unlock_rule: "default",      unlock_value: null,         is_exclusive: false, sort_order: 1 },
  { id: "artist",          label: "Artist",          description: "For the creatively-inclined.",                          unlock_rule: "default",      unlock_value: null,         is_exclusive: false, sort_order: 2 },
  { id: "game_master",     label: "Game Master",     description: "For those who run the table.",                          unlock_rule: "default",      unlock_value: null,         is_exclusive: false, sort_order: 3 },
  { id: "adventurer",      label: "Adventurer",      description: "Unlocked when you reach the Adventurer tier.",          unlock_rule: "tier",         unlock_value: "adventurer", is_exclusive: false, sort_order: 10 },
  { id: "veteran",         label: "Veteran",         description: "Unlocked when you reach the Veteran tier.",             unlock_rule: "tier",         unlock_value: "veteran",    is_exclusive: false, sort_order: 11 },
  { id: "guild_member",    label: "Guild Member",    description: "Unlocked by joining a guild.",                          unlock_rule: "guild_member", unlock_value: null,         is_exclusive: false, sort_order: 20 },
  { id: "guild_leader",    label: "Guild Leader",    description: "Unlocked by founding a guild.",                         unlock_rule: "guild_owner",  unlock_value: null,         is_exclusive: false, sort_order: 21 },
  { id: "chef_de_cuisine", label: "Chef de Cuisine", description: "For Aetherian Studios staff and core developers.",     unlock_rule: "manual",       unlock_value: null,         is_exclusive: true,  sort_order: 90 },
  { id: "founding_backer", label: "Founding Backer", description: "Kickstarter backer — never granted again.",             unlock_rule: "manual",       unlock_value: null,         is_exclusive: true,  sort_order: 91 },
];

const TITLE_BY_ID = Object.fromEntries(TITLE_CATALOG.map((t) => [t.id, t]));

export function getTitle(id) {
  return TITLE_BY_ID[id] || null;
}

/**
 * Tier ordering used to satisfy the `tier` unlock rule. Anything at
 * or above the rule's tier counts as unlocked.
 */
const TIER_RANK = { free: 0, adventurer: 1, veteran: 2, guild: 3 };

/**
 * Decide which catalog ids the user has earned. `grantedIds` is the
 * set of title_ids from `user_titles` for this user — this lets the
 * UI light up Founding Backer / admin-granted titles.
 *
 *   ctx = { tier, isGuildMember, isGuildOwner, grantedIds: Set<string> }
 */
export function computeEarnedTitleIds(ctx = {}) {
  const tierRank = TIER_RANK[ctx.tier] ?? 0;
  const grants = ctx.grantedIds instanceof Set ? ctx.grantedIds : new Set(ctx.grantedIds || []);
  const earned = new Set();
  for (const t of TITLE_CATALOG) {
    if (t.unlock_rule === "default") earned.add(t.id);
    else if (t.unlock_rule === "tier" && (TIER_RANK[t.unlock_value] ?? 99) <= tierRank) earned.add(t.id);
    else if (t.unlock_rule === "guild_member" && (ctx.isGuildMember || ctx.isGuildOwner)) earned.add(t.id);
    else if (t.unlock_rule === "guild_owner" && ctx.isGuildOwner) earned.add(t.id);
    else if (t.unlock_rule === "manual" && grants.has(t.id)) earned.add(t.id);
  }
  return earned;
}

/**
 * Human-readable tier label for the lock copy ("Unlock by reaching
 * Adventurer tier") — surfaced from the settings selector.
 */
export function unlockHintFor(title) {
  if (!title) return "";
  switch (title.unlock_rule) {
    case "tier":         return `Unlock by reaching ${capitalize(title.unlock_value)} tier`;
    case "guild_member": return "Unlock by joining a guild";
    case "guild_owner":  return "Unlock by founding a guild";
    case "manual":       return "Awarded by Aetherian Studios";
    default:             return "";
  }
}

function capitalize(s = "") {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
