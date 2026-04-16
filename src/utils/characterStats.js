/**
 * Combat-stat tracking helper. Reads the character_stats row for a
 * (character, campaign) pair, increments the requested field, and
 * tracks `highest_single_damage` / `most_healing_single_spell` as
 * derived high-water marks.
 *
 * Stat tracking is fire-and-forget: every caller wraps this in
 * `trackStat()` so a failed write never blocks combat. Pass null /
 * undefined characterId for non-player combatants — the helper
 * exits silently in that case so monster damage doesn't churn the
 * table.
 */

import { base44 } from '@/api/base44Client';

const STATS_CACHE = new Map(); // `${charId}:${campId}` → row.id

async function ensureStatsRow(characterId, campaignId) {
  if (!characterId || !campaignId) return null;
  const cacheKey = `${characterId}:${campaignId}`;
  if (STATS_CACHE.has(cacheKey)) return STATS_CACHE.get(cacheKey);
  const existing = await base44.entities.CharacterStat
    .filter({ character_id: characterId, campaign_id: campaignId })
    .catch(() => []);
  if (existing.length > 0) {
    STATS_CACHE.set(cacheKey, existing[0].id);
    return existing[0].id;
  }
  const created = await base44.entities.CharacterStat
    .create({
      character_id: characterId,
      campaign_id: campaignId,
    })
    .catch(() => null);
  if (created?.id) STATS_CACHE.set(cacheKey, created.id);
  return created?.id || null;
}

export async function ensureCharacterStats(characterId, campaignId) {
  return ensureStatsRow(characterId, campaignId);
}

/**
 * Increment a counter on the (character, campaign) stats row. Also
 * bumps `highest_single_damage` / `most_healing_single_spell` when
 * the per-call amount beats the stored max.
 *
 * Returns a Promise but most callers should fire-and-forget via
 * `trackStat()` below.
 */
export async function incrementStat(characterId, campaignId, field, amount = 1) {
  if (!characterId || !campaignId || !field) return;
  await ensureStatsRow(characterId, campaignId);
  // Re-fetch the row so the increment uses the latest server value.
  // The campaign-stats table is small enough that this round-trip
  // doesn't matter for combat performance.
  const rows = await base44.entities.CharacterStat
    .filter({ character_id: characterId, campaign_id: campaignId })
    .catch(() => []);
  const row = rows[0];
  if (!row) return;
  const current = Number(row[field] || 0);
  const update = { [field]: current + amount };
  if (field === 'total_damage_dealt' && amount > Number(row.highest_single_damage || 0)) {
    update.highest_single_damage = amount;
  }
  if (field === 'total_healing_done' && amount > Number(row.most_healing_single_spell || 0)) {
    update.most_healing_single_spell = amount;
  }
  await base44.entities.CharacterStat.update(row.id, update).catch(() => {});
}

/**
 * Fire-and-forget wrapper around incrementStat. Errors are logged
 * but never re-thrown so combat flow can't stall on stats.
 */
export function trackStat(characterId, campaignId, field, amount = 1) {
  if (!characterId || !campaignId || !field) return;
  incrementStat(characterId, campaignId, field, amount).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Stat tracking error:', err);
  });
}

// Drop the cache when combat ends or the user changes campaign so
// the next session re-resolves stats rows freshly.
export function clearStatsCache() {
  STATS_CACHE.clear();
}
