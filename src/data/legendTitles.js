/**
 * Title catalogue for the Legend Tracker. Each entry has:
 *   - id: stable key persisted on character.earned_titles
 *   - title: the display suffix ("the Butcher")
 *   - category: groups titles in the UI
 *   - description: surfaced under the title
 *   - icon: emoji badge rendered in the title card
 *   - rumorFlavor: text plugged into auto-generated rumors when
 *     this title is earned. Supports {name} / {pronoun} placeholders.
 *   - condition({ stats, achievements }): returns true when the
 *     character has earned the title
 *   - progress({ stats, achievements }): returns { current, target }
 *     for the progress bar while the title is still unearned
 */
export const LEGEND_TITLES = [
  // ─── Combat ─────────────────────────────────────────────────────
  {
    id: "butcher", title: "the Butcher", icon: "⚔️", category: "combat",
    description: "Deal 500+ total damage",
    rumorFlavor: "They say {name} has left a trail of blood across the land. Their blade knows no mercy.",
    condition: ({ stats }) => Number(stats?.total_damage_dealt || 0) >= 500,
    progress: ({ stats }) => ({ current: Number(stats?.total_damage_dealt || 0), target: 500 }),
  },
  {
    id: "slayer", title: "the Slayer", icon: "💀", category: "combat",
    description: "Kill 50+ enemies",
    rumorFlavor: "Whatever draws breath near {name} best not overstay. Fifty graves have already answered.",
    condition: ({ stats }) => Number(stats?.kills || stats?.total_kills || 0) >= 50,
    progress: ({ stats }) => ({ current: Number(stats?.kills || stats?.total_kills || 0), target: 50 }),
  },
  {
    id: "untouchable", title: "the Untouchable", icon: "🛡️", category: "combat",
    description: "Never downed in 10+ combats",
    rumorFlavor: "Arrows and axes alike seem to lose their nerve around {name}.",
    condition: ({ stats }) => Number(stats?.times_downed || 0) === 0
      && Number(stats?.combats_participated || stats?.rounds_in_combat || 0) >= 10,
    progress: ({ stats }) => ({
      current: Math.min(10, Number(stats?.combats_participated || stats?.rounds_in_combat || 0)),
      target: 10,
    }),
  },
  {
    id: "berserker", title: "the Berserker", icon: "🔥", category: "combat",
    description: "Deal 100+ damage in a single combat",
    rumorFlavor: "When the red mist takes {name}, the survivors learn to run first and count the dead later.",
    condition: ({ stats }) => Number(stats?.highest_single_combat_damage || 0) >= 100,
    progress: ({ stats }) => ({ current: Number(stats?.highest_single_combat_damage || 0), target: 100 }),
  },

  // ─── Luck ───────────────────────────────────────────────────────
  {
    id: "lucky", title: "the Lucky", icon: "🎲", category: "luck",
    description: "Roll 20+ natural 20s",
    rumorFlavor: "Fortune favours {name}, or so the gamblers whisper. Some say the gods tip the dice.",
    condition: ({ stats }) => Number(stats?.nat_20s || 0) >= 20,
    progress: ({ stats }) => ({ current: Number(stats?.nat_20s || 0), target: 20 }),
  },
  {
    id: "cursed", title: "the Cursed", icon: "🌑", category: "luck",
    description: "Roll 20+ natural 1s",
    rumorFlavor: "Every table {name} sits at seems to roll a little colder.",
    condition: ({ stats }) => Number(stats?.nat_1s || 0) >= 20,
    progress: ({ stats }) => ({ current: Number(stats?.nat_1s || 0), target: 20 }),
  },
  {
    id: "balanced", title: "the Balanced", icon: "⚖️", category: "luck",
    description: "10+ nat 20s and nat 1s, near-even",
    rumorFlavor: "Light and shadow argue in {name}'s wake; neither seems to win.",
    condition: ({ stats }) => {
      const up = Number(stats?.nat_20s || 0);
      const down = Number(stats?.nat_1s || 0);
      return up >= 10 && down >= 10 && Math.abs(up - down) <= 2;
    },
    progress: ({ stats }) => {
      const up = Number(stats?.nat_20s || 0);
      const down = Number(stats?.nat_1s || 0);
      return { current: Math.min(up, down), target: 10 };
    },
  },

  // ─── Support ────────────────────────────────────────────────────
  {
    id: "mender", title: "the Mender", icon: "💚", category: "support",
    description: "Heal 200+ total HP",
    rumorFlavor: "Their hands have stitched together more than one torn hero.",
    condition: ({ stats }) => Number(stats?.total_healing_done || 0) >= 200,
    progress: ({ stats }) => ({ current: Number(stats?.total_healing_done || 0), target: 200 }),
  },
  {
    id: "lifegiver", title: "the Lifegiver", icon: "✨", category: "support",
    description: "Heal 1000+ total HP",
    rumorFlavor: "Where {name} walks, even the dying find another day.",
    condition: ({ stats }) => Number(stats?.total_healing_done || 0) >= 1000,
    progress: ({ stats }) => ({ current: Number(stats?.total_healing_done || 0), target: 1000 }),
  },
  {
    id: "guardian", title: "the Guardian", icon: "🛡️", category: "support",
    description: "Absorb 500+ damage for allies",
    rumorFlavor: "Stand near {name} and the blow always seems to land a shoulder over.",
    condition: ({ stats }) => Number(stats?.damage_absorbed_for_allies || 0) >= 500,
    progress: ({ stats }) => ({ current: Number(stats?.damage_absorbed_for_allies || 0), target: 500 }),
  },

  // ─── Mental ─────────────────────────────────────────────────────
  {
    id: "wise", title: "the Wise", icon: "🦉", category: "mental",
    description: "15+ successful Wisdom saves",
    rumorFlavor: "Tricks and charms slide off {name} like rain off slate.",
    condition: ({ stats }) => Number(stats?.successful_wisdom_saves || 0) >= 15,
    progress: ({ stats }) => ({ current: Number(stats?.successful_wisdom_saves || 0), target: 15 }),
  },
  {
    id: "clever", title: "the Clever", icon: "🧠", category: "mental",
    description: "15+ successful Intelligence checks",
    rumorFlavor: "{name} sees two moves ahead while the rest of us still squint at the board.",
    condition: ({ stats }) => Number(stats?.successful_intelligence_checks || 0) >= 15,
    progress: ({ stats }) => ({ current: Number(stats?.successful_intelligence_checks || 0), target: 15 }),
  },
  {
    id: "iron_willed", title: "the Iron-Willed", icon: "💎", category: "mental",
    description: "15+ successful Charisma saves",
    rumorFlavor: "No charm bends {name}. We've stopped trying.",
    condition: ({ stats }) => Number(stats?.successful_charisma_saves || 0) >= 15,
    progress: ({ stats }) => ({ current: Number(stats?.successful_charisma_saves || 0), target: 15 }),
  },

  // ─── Social ─────────────────────────────────────────────────────
  {
    id: "silver_tongued", title: "the Silver-Tongued", icon: "👑", category: "social",
    description: "15+ successful Persuasion checks",
    rumorFlavor: "Watch your coin purse around {name}. That one could talk a dragon out of its hoard.",
    condition: ({ stats }) => Number(stats?.successful_persuasion_checks || 0) >= 15,
    progress: ({ stats }) => ({ current: Number(stats?.successful_persuasion_checks || 0), target: 15 }),
  },
  {
    id: "intimidating", title: "the Intimidating", icon: "😈", category: "social",
    description: "10+ successful Intimidation checks",
    rumorFlavor: "Hard folk soften when {name} asks a question the second time.",
    condition: ({ stats }) => Number(stats?.successful_intimidation_checks || 0) >= 10,
    progress: ({ stats }) => ({ current: Number(stats?.successful_intimidation_checks || 0), target: 10 }),
  },
  {
    id: "deceptive", title: "the Deceptive", icon: "🎭", category: "social",
    description: "10+ successful Deception checks",
    rumorFlavor: "Never play cards with {name}. Never.",
    condition: ({ stats }) => Number(stats?.successful_deception_checks || 0) >= 10,
    progress: ({ stats }) => ({ current: Number(stats?.successful_deception_checks || 0), target: 10 }),
  },

  // ─── Wealth ─────────────────────────────────────────────────────
  {
    id: "wealthy", title: "the Wealthy", icon: "💰", category: "wealth",
    description: "Earn 5,000+ gold",
    rumorFlavor: "The merchants straighten their collars when {name} enters a room.",
    condition: ({ stats }) => Number(stats?.total_gold_earned || 0) >= 5000,
    progress: ({ stats }) => ({ current: Number(stats?.total_gold_earned || 0), target: 5000 }),
  },
  {
    id: "generous", title: "the Generous", icon: "🤝", category: "wealth",
    description: "Give away 1,000+ gold",
    rumorFlavor: "Coin doesn't linger in {name}'s pocket — it's already halfway to some orphanage.",
    condition: ({ stats }) => Number(stats?.total_gold_given || 0) >= 1000,
    progress: ({ stats }) => ({ current: Number(stats?.total_gold_given || 0), target: 1000 }),
  },

  // ─── Survival ───────────────────────────────────────────────────
  {
    id: "survivor", title: "the Survivor", icon: "💪", category: "survival",
    description: "5+ death save successes",
    rumorFlavor: "Whatever keeps {name} alive, it wants them breathing for a reason.",
    condition: ({ stats }) =>
      Number(stats?.death_saves_passed || stats?.death_save_successes || 0) >= 5,
    progress: ({ stats }) => ({
      current: Number(stats?.death_saves_passed || stats?.death_save_successes || 0),
      target: 5,
    }),
  },
  {
    id: "immortal", title: "the Immortal", icon: "♾️", category: "survival",
    description: "Downed 10+ times, never died",
    rumorFlavor: "They say death turned away at {name}'s door.",
    condition: ({ stats }) =>
      Number(stats?.times_downed || 0) >= 10 && Number(stats?.deaths || 0) === 0,
    progress: ({ stats }) => ({ current: Number(stats?.times_downed || 0), target: 10 }),
  },
  {
    id: "phoenix", title: "the Phoenix", icon: "🔥", category: "survival",
    description: "Revived from death",
    rumorFlavor: "Ash still clings to {name}'s cloak, and they won't say whose it was.",
    condition: ({ stats }) => Number(stats?.times_revived || 0) >= 1,
    progress: ({ stats }) => ({ current: Number(stats?.times_revived || 0), target: 1 }),
  },

  // ─── Achievement-based ─────────────────────────────────────────
  {
    id: "legendary", title: "the Legendary", icon: "⭐", category: "achievement",
    description: "3+ legendary achievements",
    rumorFlavor: "{name}'s name is already spoken in the same breath as the heroes of old.",
    condition: ({ achievements }) => {
      const list = Array.isArray(achievements) ? achievements : [];
      return list.filter((a) => (a.rarity || a.tier) === "legendary").length >= 3;
    },
    progress: ({ achievements }) => {
      const list = Array.isArray(achievements) ? achievements : [];
      return {
        current: list.filter((a) => (a.rarity || a.tier) === "legendary").length,
        target: 3,
      };
    },
  },
  {
    id: "completionist", title: "the Completionist", icon: "🏆", category: "achievement",
    description: "25+ total achievements",
    rumorFlavor: "If there's a deed worth doing, {name} has already carved their name beside it.",
    condition: ({ achievements }) => (Array.isArray(achievements) ? achievements.length : 0) >= 25,
    progress: ({ achievements }) => ({
      current: Array.isArray(achievements) ? achievements.length : 0,
      target: 25,
    }),
  },
];

export const LEGEND_CATEGORIES = [
  { id: "combat",       label: "Combat" },
  { id: "luck",         label: "Luck" },
  { id: "support",      label: "Support" },
  { id: "mental",       label: "Mental" },
  { id: "social",       label: "Social" },
  { id: "wealth",       label: "Wealth" },
  { id: "survival",     label: "Survival" },
  { id: "achievement",  label: "Achievement" },
];

export function titleById(id) {
  return LEGEND_TITLES.find((t) => t.id === id) || null;
}

/**
 * Return the set of earned title ids given the character's current
 * stats + achievements. Pure function — callers persist the diff.
 */
export function evaluateTitles({ stats, achievements }) {
  return LEGEND_TITLES
    .filter((t) => {
      try { return !!t.condition({ stats: stats || {}, achievements: achievements || [] }); }
      catch { return false; }
    })
    .map((t) => t.id);
}

/** Format a rumor line from the title's flavor template. */
export function buildTitleRumor(character, titleMeta) {
  const name = character?.name || "A hero";
  const flavor = titleMeta?.rumorFlavor || "";
  return `Word has spread of ${name} ${titleMeta?.title || ""}. ${flavor.replaceAll("{name}", name)}`.trim();
}

/**
 * Short-form auto-rumor strings keyed by title display text. These
 * are the exact snippets the World Lore Task 4 spec lists for the
 * most commonly-earned titles; other titles fall back to the richer
 * per-title rumorFlavor via `buildTitleRumor`. Consumers that want
 * the exact spec phrasing (e.g. a combat-end hook that picks the
 * canonical line) can read from this map first.
 */
export const AUTO_RUMOR_TEMPLATES = {
  "the Butcher":         "They say {name} has left a trail of blood across the land.",
  "the Lucky":           "Fortune favors {name}, or so the gamblers whisper.",
  "the Silver-Tongued":  "Watch your coin purse around {name}. That one could talk a dragon out of its hoard.",
  "the Wise":            "The counsel of {name} is sought by lords and beggars alike.",
  "the Immortal":        "{name} has cheated death so many times, even the Raven Queen has stopped counting.",
  "the Mender":          "Where {name} walks, the wounded rise again.",
  "the Survivor":        "They keep trying to kill {name}. It never sticks.",
  "the Cursed":          "Stay away from {name} at the gambling table. Bad luck follows that one like a shadow.",
};

/**
 * Returns a 0-100 number describing how close the character is to
 * earning this title. Matches the Task 4 spec's helper signature.
 * Leans on each title's `progress({stats,achievements})` function
 * when available; falls back to a binary 0/100 for titles that
 * don't expose progress (rare corner-cases).
 */
export function getProgress(title, stats, achievements) {
  if (!title) return 0;
  if (typeof title.progress === "function") {
    try {
      const { current = 0, target = 1 } = title.progress({
        stats: stats || {},
        achievements: achievements || [],
      }) || {};
      if (!target) return 0;
      return Math.max(0, Math.min(100, Math.round((Number(current) / Number(target)) * 100)));
    } catch {
      return 0;
    }
  }
  if (typeof title.condition === "function") {
    try {
      return title.condition({ stats: stats || {}, achievements: achievements || [] }) ? 100 : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}
