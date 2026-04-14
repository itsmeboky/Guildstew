/**
 * Combat Queue storage helpers.
 *
 * The Combat Queue is per-campaign localStorage that holds every non-PC
 * combatant the GM has lined up for a session — monsters, NPCs, animals,
 * allies, summoned creatures, anything. It used to be called the
 * "Monster Queue"; the legacy localStorage key is read once at migration
 * time and then rewritten under the new key, so existing data isn't lost.
 *
 * Each entry carries a `faction` string ∈ {'enemy','player','ally','neutral'}.
 * Player characters always get faction 'player' at combatant build time.
 * Monsters default to 'enemy' but can be set to 'ally' or 'neutral' when
 * added (or later via the right-click context menu on initiative
 * portraits). Charmed allies additionally track a charmDuration (integer
 * number of turns) and an originalFaction to revert to when the charm
 * wears off.
 */

const LEGACY_PREFIX = "gm_monster_queue";
const STORAGE_PREFIX = "gm_combat_queue";

const key = (campaignId) => `${STORAGE_PREFIX}_${campaignId}`;
const legacyKey = (campaignId) => `${LEGACY_PREFIX}_${campaignId}`;

/**
 * Read the combat queue for a campaign, doing a one-time migration from
 * the legacy monster-queue key if necessary. Returns an array (never null).
 */
export function readCombatQueue(campaignId) {
  if (!campaignId) return [];
  const current = localStorage.getItem(key(campaignId));
  if (current) {
    try {
      return JSON.parse(current) || [];
    } catch {
      return [];
    }
  }
  // One-time migration from the legacy "gm_monster_queue_<id>" key.
  const legacy = localStorage.getItem(legacyKey(campaignId));
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) || [];
      localStorage.setItem(key(campaignId), JSON.stringify(parsed));
      localStorage.removeItem(legacyKey(campaignId));
      return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Persist the queue and fire a synthetic `storage` event so every open
 * consumer (the CombatQueue component, TurnOrderBar HP lookups, etc.)
 * refetches.
 */
export function writeCombatQueue(campaignId, queue) {
  if (!campaignId) return;
  localStorage.setItem(key(campaignId), JSON.stringify(queue));
  // `storage` events normally only fire cross-tab; dispatch manually so
  // same-tab consumers can still react via a window listener.
  window.dispatchEvent(new Event("storage"));
}

/** Drop the whole queue (and any lingering legacy key) for a campaign. */
export function clearCombatQueue(campaignId) {
  if (!campaignId) return;
  localStorage.removeItem(key(campaignId));
  localStorage.removeItem(legacyKey(campaignId));
  window.dispatchEvent(new Event("storage"));
}

/** Available factions, in the order they appear in UI pickers. */
export const FACTIONS = ["enemy", "ally", "neutral"];

/**
 * Tailwind classes for a faction's name pill / portrait outline. `pill`
 * is the soft background+text combo used on name labels. `outline` is
 * the solid border color used on targeting outlines and badges.
 */
export const FACTION_STYLES = {
  enemy: {
    label: "Enemy",
    pill: "bg-[#FF5722]/20 text-[#FF5722]",
    pillStrong: "bg-[#FF5722] text-white",
    outline: "border-[#FF5722]",
    ring: "ring-[#FF5722]",
    hex: "#FF5722",
  },
  player: {
    label: "Player",
    pill: "bg-[#37F2D1]/20 text-[#37F2D1]",
    pillStrong: "bg-[#37F2D1] text-[#1E2430]",
    outline: "border-[#37F2D1]",
    ring: "ring-[#37F2D1]",
    hex: "#37F2D1",
  },
  ally: {
    label: "Ally",
    pill: "bg-[#22c55e]/20 text-[#22c55e]",
    pillStrong: "bg-[#22c55e] text-[#052e16]",
    outline: "border-[#22c55e]",
    ring: "ring-[#22c55e]",
    hex: "#22c55e",
  },
  neutral: {
    label: "Neutral",
    pill: "bg-[#60a5fa]/20 text-[#60a5fa]",
    pillStrong: "bg-[#60a5fa] text-[#0b1220]",
    outline: "border-[#60a5fa]",
    ring: "ring-[#60a5fa]",
    hex: "#60a5fa",
  },
};

/** Resolve a combatant/entity to its faction. Defaults to 'enemy'. */
export function getFaction(entity) {
  if (!entity) return "enemy";
  if (entity.type === "player") return "player";
  if (entity.faction && FACTION_STYLES[entity.faction]) return entity.faction;
  return "enemy";
}

/** Resolve the display style bundle for a given combatant. */
export function getFactionStyle(entity) {
  return FACTION_STYLES[getFaction(entity)] || FACTION_STYLES.enemy;
}
