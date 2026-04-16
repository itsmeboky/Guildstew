/**
 * Achievement catalog. Each entry has:
 *   - title / description / rarity / icon — what the achievement
 *     looks like in the UI.
 *   - check(stats) — pure predicate run against a character_stats
 *     row. If it returns true and the achievement isn't already
 *     awarded, the checker creates an `achievements` row.
 *   - progress(stats) — optional. Returns { current, target } so
 *     the Achievements page can render a "next milestone" hint.
 *
 * Keep entries data-only. The checker imports this module from
 * everywhere — combat end, rests, and the Achievements page on
 * mount — so it must stay side-effect free.
 */

export const ACHIEVEMENT_DEFINITIONS = {
  // ─── COMBAT — Common ──────────────────────────────────────────
  first_blood: {
    title: 'First Blood',
    description: 'Deal damage for the first time in combat.',
    rarity: 'common',
    icon: '⚔️',
    check: (s) => Number(s.total_damage_dealt || 0) > 0,
    progress: (s) => ({ current: Math.min(1, Number(s.total_damage_dealt || 0)), target: 1 }),
  },
  natural_born_killer: {
    title: 'Natural Born Killer',
    description: 'Score your first kill.',
    rarity: 'common',
    icon: '💀',
    check: (s) => Number(s.kills || 0) >= 1,
    progress: (s) => ({ current: Math.min(1, Number(s.kills || 0)), target: 1 }),
  },
  dice_roller: {
    title: 'Dice Roller',
    description: 'Participate in 10 rounds of combat.',
    rarity: 'common',
    icon: '🎲',
    check: (s) => Number(s.rounds_in_combat || 0) >= 10,
    progress: (s) => ({ current: Number(s.rounds_in_combat || 0), target: 10 }),
  },
  spell_slinger: {
    title: 'Spell Slinger',
    description: 'Cast 10 spells.',
    rarity: 'common',
    icon: '✨',
    check: (s) => Number(s.spells_cast || 0) >= 10,
    progress: (s) => ({ current: Number(s.spells_cast || 0), target: 10 }),
  },
  field_medic: {
    title: 'Field Medic',
    description: 'Heal 50 total HP.',
    rarity: 'common',
    icon: '💚',
    check: (s) => Number(s.total_healing_done || 0) >= 50,
    progress: (s) => ({ current: Number(s.total_healing_done || 0), target: 50 }),
  },

  // ─── COMBAT — Rare ────────────────────────────────────────────
  critical_master: {
    title: 'Critical Master',
    description: 'Land 10 critical hits.',
    rarity: 'rare',
    icon: '🎯',
    check: (s) => Number(s.crits_landed || 0) >= 10,
    progress: (s) => ({ current: Number(s.crits_landed || 0), target: 10 }),
  },
  sharpshooter_achievement: {
    title: 'Sharpshooter',
    description: 'Maintain 75% accuracy over 50+ attacks.',
    rarity: 'rare',
    icon: '🏹',
    check: (s) => {
      const total = Number(s.attacks_hit || 0) + Number(s.attacks_missed || 0);
      return total >= 50 && Number(s.attacks_hit || 0) / total >= 0.75;
    },
    progress: (s) => {
      const total = Number(s.attacks_hit || 0) + Number(s.attacks_missed || 0);
      return { current: total, target: 50 };
    },
  },
  tank: {
    title: 'Tank',
    description: 'Take 500 total damage and survive.',
    rarity: 'rare',
    icon: '🛡️',
    check: (s) => Number(s.total_damage_taken || 0) >= 500,
    progress: (s) => ({ current: Number(s.total_damage_taken || 0), target: 500 }),
  },
  battle_hardened: {
    title: 'Battle Hardened',
    description: 'Fight through 100 rounds of combat.',
    rarity: 'rare',
    icon: '⚔️',
    check: (s) => Number(s.rounds_in_combat || 0) >= 100,
    progress: (s) => ({ current: Number(s.rounds_in_combat || 0), target: 100 }),
  },
  slayer: {
    title: 'Slayer',
    description: 'Score 25 kills.',
    rarity: 'rare',
    icon: '🗡️',
    check: (s) => Number(s.kills || 0) >= 25,
    progress: (s) => ({ current: Number(s.kills || 0), target: 25 }),
  },
  healer_supreme: {
    title: 'Healer Supreme',
    description: 'Heal 500 total HP.',
    rarity: 'rare',
    icon: '💖',
    check: (s) => Number(s.total_healing_done || 0) >= 500,
    progress: (s) => ({ current: Number(s.total_healing_done || 0), target: 500 }),
  },

  // ─── COMBAT — Epic ────────────────────────────────────────────
  one_hit_wonder: {
    title: 'One-Hit Wonder',
    description: 'Deal 50+ damage in a single hit.',
    rarity: 'epic',
    icon: '💥',
    check: (s) => Number(s.highest_single_damage || 0) >= 50,
    progress: (s) => ({ current: Number(s.highest_single_damage || 0), target: 50 }),
  },
  untouchable: {
    title: 'Untouchable',
    description: 'Go 50 rounds without being downed.',
    rarity: 'epic',
    icon: '👻',
    check: (s) => Number(s.rounds_in_combat || 0) >= 50 && Number(s.times_downed || 0) === 0,
    progress: (s) => ({ current: Number(s.rounds_in_combat || 0), target: 50 }),
  },
  warlord: {
    title: 'Warlord',
    description: 'Score 100 kills across all campaigns.',
    rarity: 'epic',
    icon: '👑',
    check: (s) => Number(s.kills || 0) >= 100,
    progress: (s) => ({ current: Number(s.kills || 0), target: 100 }),
  },
  archmage: {
    title: 'Archmage',
    description: 'Cast 100 spells.',
    rarity: 'epic',
    icon: '🧙',
    check: (s) => Number(s.spells_cast || 0) >= 100,
    progress: (s) => ({ current: Number(s.spells_cast || 0), target: 100 }),
  },

  // ─── LUCK — Rare ──────────────────────────────────────────────
  lucky_streak: {
    title: 'Lucky Streak',
    description: 'Roll 5 natural 20s.',
    rarity: 'rare',
    icon: '🍀',
    check: (s) => Number(s.nat_20s || 0) >= 5,
    progress: (s) => ({ current: Number(s.nat_20s || 0), target: 5 }),
  },
  cursed_dice: {
    title: 'Cursed Dice',
    description: 'Roll 5 natural 1s. Hang in there.',
    rarity: 'rare',
    icon: '🪦',
    check: (s) => Number(s.nat_1s || 0) >= 5,
    progress: (s) => ({ current: Number(s.nat_1s || 0), target: 5 }),
  },

  // ─── SURVIVAL — Epic ─────────────────────────────────────────
  back_from_the_brink: {
    title: 'Back From the Brink',
    description: 'Pass 10 death saving throws.',
    rarity: 'epic',
    icon: '💀',
    check: (s) => Number(s.death_saves_passed || 0) >= 10,
    progress: (s) => ({ current: Number(s.death_saves_passed || 0), target: 10 }),
  },
  unkillable: {
    title: 'Unkillable',
    description: 'Get downed 10 times and keep fighting.',
    rarity: 'epic',
    icon: '🔥',
    check: (s) => Number(s.times_downed || 0) >= 10,
    progress: (s) => ({ current: Number(s.times_downed || 0), target: 10 }),
  },

  // ─── LEGENDARY ────────────────────────────────────────────────
  legend: {
    title: 'Legend',
    description: 'Deal 10,000 total damage.',
    rarity: 'legendary',
    icon: '⭐',
    check: (s) => Number(s.total_damage_dealt || 0) >= 10000,
    progress: (s) => ({ current: Number(s.total_damage_dealt || 0), target: 10000 }),
  },
  twenty_twenties: {
    title: 'Twenty Twenties',
    description: 'Roll 20 natural 20s.',
    rarity: 'legendary',
    icon: '🎰',
    check: (s) => Number(s.nat_20s || 0) >= 20,
    progress: (s) => ({ current: Number(s.nat_20s || 0), target: 20 }),
  },
  thousand_kills: {
    title: 'The Thousand',
    description: 'Score 1,000 kills. You monster.',
    rarity: 'legendary',
    icon: '☠️',
    check: (s) => Number(s.kills || 0) >= 1000,
    progress: (s) => ({ current: Number(s.kills || 0), target: 1000 }),
  },
};

/**
 * Return the unearned achievement closest to completion based on
 * `current / target`. Used by the Achievements page to render a
 * "next" hint above the rarity tabs. Returns null if there are no
 * progressable unearned definitions left.
 */
export function nextClosestAchievement(stats, earnedKeys) {
  const candidates = [];
  for (const [key, def] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
    if (earnedKeys.has(key)) continue;
    if (typeof def.progress !== 'function') continue;
    const { current, target } = def.progress(stats || {});
    if (!Number.isFinite(target) || target <= 0) continue;
    const ratio = Math.min(1, Math.max(0, current / target));
    candidates.push({ key, def, current, target, ratio });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.ratio - a.ratio);
  return candidates[0];
}
