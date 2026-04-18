/**
 * Title catalogue for the Legend Tracker. Each entry has:
 *   - id: stable key persisted on character.earned_titles
 *   - title: the display suffix ("the Butcher")
 *   - category: groups titles in the UI
 *   - description: surfaced as hover text
 *   - rumorFlavor: text plugged into auto-generated rumors when
 *     this title is earned
 *   - condition({ stats, achievements }): returns true when the
 *     character has earned the title
 *   - progress({ stats, achievements }): returns { current, target }
 *     for the progress bar while the title is still unearned
 */
export const LEGEND_TITLES = [
  // ─── Combat ─────────────────────────────────────────────────────
  {
    id: "the_butcher",
    title: "the Butcher",
    category: "Combat",
    description: "Dealt 500+ total damage across their career.",
    rumorFlavor: "The trail of broken foes behind them tells the tale.",
    condition: ({ stats }) => Number(stats?.total_damage_dealt || 0) >= 500,
    progress: ({ stats }) => ({ current: Number(stats?.total_damage_dealt || 0), target: 500 }),
  },
  {
    id: "the_slayer",
    title: "the Slayer",
    category: "Combat",
    description: "Personally finished off 50+ enemies.",
    rumorFlavor: "Their blade has settled more scores than most make in a lifetime.",
    condition: ({ stats }) => Number(stats?.kills || stats?.total_kills || 0) >= 50,
    progress: ({ stats }) => ({ current: Number(stats?.kills || stats?.total_kills || 0), target: 50 }),
  },
  {
    id: "the_untouchable",
    title: "the Untouchable",
    category: "Combat",
    description: "Survived 10+ fights without ever going down.",
    rumorFlavor: "They say they dance through arrows without breaking stride.",
    condition: ({ stats }) => Number(stats?.times_downed || 0) === 0
      && Number(stats?.rounds_in_combat || 0) >= 40,
    progress: ({ stats }) => ({
      current: Math.min(40, Number(stats?.rounds_in_combat || 0)),
      target: 40,
    }),
  },

  // ─── Luck ───────────────────────────────────────────────────────
  {
    id: "the_lucky",
    title: "the Lucky",
    category: "Luck",
    description: "Rolled 20+ natural 20s.",
    rumorFlavor: "Whatever favour they bought, it paid out in gold.",
    condition: ({ stats }) => Number(stats?.nat_20s || 0) >= 20,
    progress: ({ stats }) => ({ current: Number(stats?.nat_20s || 0), target: 20 }),
  },
  {
    id: "the_cursed",
    title: "the Cursed",
    category: "Luck",
    description: "Rolled 20+ natural 1s.",
    rumorFlavor: "Every table they sit at seems to roll a little colder.",
    condition: ({ stats }) => Number(stats?.nat_1s || 0) >= 20,
    progress: ({ stats }) => ({ current: Number(stats?.nat_1s || 0), target: 20 }),
  },

  // ─── Support ────────────────────────────────────────────────────
  {
    id: "the_mender",
    title: "the Mender",
    category: "Support",
    description: "Healed 200+ total HP across the campaign.",
    rumorFlavor: "Their hands have stitched together more than one torn hero.",
    condition: ({ stats }) => Number(stats?.total_healing_done || 0) >= 200,
    progress: ({ stats }) => ({ current: Number(stats?.total_healing_done || 0), target: 200 }),
  },
  {
    id: "the_lifegiver",
    title: "the Lifegiver",
    category: "Support",
    description: "Healed 1,000+ total HP across the campaign.",
    rumorFlavor: "Where they walk, even the dying find another day.",
    condition: ({ stats }) => Number(stats?.total_healing_done || 0) >= 1000,
    progress: ({ stats }) => ({ current: Number(stats?.total_healing_done || 0), target: 1000 }),
  },

  // ─── Survival ───────────────────────────────────────────────────
  {
    id: "the_survivor",
    title: "the Survivor",
    category: "Survival",
    description: "Succeeded on 5 death saves.",
    rumorFlavor: "Whatever keeps them alive, it wants them breathing for a reason.",
    condition: ({ stats }) => Number(stats?.death_saves_passed || stats?.death_save_successes || 0) >= 5,
    progress: ({ stats }) => ({
      current: Number(stats?.death_saves_passed || stats?.death_save_successes || 0),
      target: 5,
    }),
  },
  {
    id: "the_immortal",
    title: "the Immortal",
    category: "Survival",
    description: "Gone down 10+ times and lived to tell about it.",
    rumorFlavor: "They say death turned away at the door.",
    condition: ({ stats }) => Number(stats?.times_downed || 0) >= 10
      && Number(stats?.deaths || 0) === 0,
    progress: ({ stats }) => ({ current: Number(stats?.times_downed || 0), target: 10 }),
  },

  // ─── Achievement-based ─────────────────────────────────────────
  {
    id: "the_legendary",
    title: "the Legendary",
    category: "Achievement",
    description: "Earned 3+ legendary-tier achievements.",
    rumorFlavor: "Their name is already spoken in the same breath as the heroes of old.",
    condition: ({ achievements }) => {
      const list = Array.isArray(achievements) ? achievements : [];
      return list.filter((a) => (a.rarity || a.tier) === "legendary").length >= 3;
    },
    progress: ({ achievements }) => {
      const list = Array.isArray(achievements) ? achievements : [];
      const earned = list.filter((a) => (a.rarity || a.tier) === "legendary").length;
      return { current: earned, target: 3 };
    },
  },
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
