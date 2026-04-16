/**
 * Achievement evaluator. Pulls a character's stats row, the user's
 * already-earned achievements, and runs every definition's `check`
 * predicate. New hits are inserted into the achievements table.
 *
 * Errors never bubble — combat / rest flows that call this should
 * not be allowed to fail because of stat tracking.
 */

import { ACHIEVEMENT_DEFINITIONS } from '@/data/achievementDefinitions';
import { base44 } from '@/api/base44Client';

/**
 * Aggregate every character_stats row a character has across
 * campaigns. Achievement thresholds are lifetime totals so we can't
 * just read one row.
 */
async function loadAggregateStats(characterId, campaignId) {
  // First try to grab every row for the character (the union of
  // every campaign they've played in). Fall back to the single
  // (character, campaign) row if the broader query fails.
  let rows = [];
  try {
    rows = await base44.entities.CharacterStat.filter({ character_id: characterId });
  } catch {
    if (campaignId) {
      rows = await base44.entities.CharacterStat
        .filter({ character_id: characterId, campaign_id: campaignId })
        .catch(() => []);
    }
  }
  if (rows.length === 0) return null;
  return rows.reduce((acc, r) => {
    for (const key of Object.keys(r)) {
      if (typeof r[key] === 'number') {
        acc[key] = (acc[key] || 0) + r[key];
      }
    }
    // High-water marks aren't summed — they're maxed.
    acc.highest_single_damage = Math.max(
      Number(acc.highest_single_damage || 0),
      Number(r.highest_single_damage || 0),
    );
    acc.most_healing_single_spell = Math.max(
      Number(acc.most_healing_single_spell || 0),
      Number(r.most_healing_single_spell || 0),
    );
    return acc;
  }, {});
}

/**
 * Run every achievement check against the given character's stats
 * and create rows for any newly-passed predicates. Returns the new
 * achievement records (after creation) so callers can fire toast
 * notifications.
 */
export async function checkAchievements(userId, characterId, campaignId) {
  if (!userId || !characterId) return [];
  try {
    const stats = await loadAggregateStats(characterId, campaignId);
    if (!stats) return [];

    // Pull the user's already-earned set so we don't double-award
    // anything. The unique constraint on (user_id, achievement_key)
    // would catch duplicates but checking up front avoids the
    // round-trip + spurious error toast.
    const earned = await base44.entities.Achievement
      .filter({ user_id: userId })
      .catch(() => []);
    const earnedKeys = new Set(earned.map((a) => a.achievement_key));

    const newAwards = [];
    for (const [key, def] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
      if (earnedKeys.has(key)) continue;
      let qualifies = false;
      try { qualifies = !!def.check(stats); } catch { qualifies = false; }
      if (!qualifies) continue;
      try {
        const created = await base44.entities.Achievement.create({
          user_id: userId,
          character_id: characterId,
          campaign_id: campaignId || null,
          achievement_key: key,
          title: def.title,
          description: def.description,
          rarity: def.rarity,
          icon: def.icon,
          earned_at: new Date().toISOString(),
        });
        newAwards.push(created || {
          achievement_key: key,
          title: def.title,
          description: def.description,
          rarity: def.rarity,
          icon: def.icon,
        });
      } catch (err) {
        // Most likely a unique constraint clash (parallel runs) —
        // ignore and let the existing row stand.
        // eslint-disable-next-line no-console
        console.warn('Achievement create skipped:', key, err?.message || err);
      }
    }
    return newAwards;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Achievement check error:', err);
    return [];
  }
}

/**
 * Convenience wrapper: run checks for a list of (userId,
 * characterId) pairs and return the flattened award list with the
 * combatant name folded in for toast formatting.
 */
export async function checkAchievementsForCombatants(combatants, campaignId) {
  const out = [];
  for (const c of combatants) {
    if (!c?.userId || !c?.characterId) continue;
    const awards = await checkAchievements(c.userId, c.characterId, campaignId);
    for (const a of awards) {
      out.push({ ...a, combatantName: c.name });
    }
  }
  return out;
}
