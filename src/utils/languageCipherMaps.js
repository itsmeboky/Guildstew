import { base44 } from "@/api/base44Client";
import { THIEVES_CANT_SYMBOLS } from "@/config/thievesCantSymbols";
import { DRUIDIC_SYMBOLS } from "@/config/druidicSymbols";

/**
 * Per-campaign cipher mappings for Thieves' Cant + Druidic.
 *
 * The 30 Druidic and 42 Cant symbol shapes are stable across all
 * campaigns; what changes per campaign is the symbol→meaning
 * mapping. Two campaigns with the same shape will assign different
 * meanings, so cross-campaign decoding doesn't work — each table
 * has its own dialect.
 *
 * Storage: campaigns.language_cipher_maps JSONB. Shape:
 *   {
 *     thieves_cant: { <symbol_id>: <meaning_label>, ... },
 *     druidic:      { <symbol_id>: <meaning_label>, ... }
 *   }
 *
 * Visibility: GMs always see the mapping; class-eligible players
 * see it via their cypher inventory items. Other characters never
 * decode — they see raw symbols on the entry without any aid.
 */

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Builds a single cipher: symbol_id → meaning_label. Each symbol's
 * own canonical name (e.g. "Safe Path") is used as the meaning pool;
 * shuffling those names across the symbol IDs is what makes the
 * cipher cipher.
 */
export function generateCipherMap(symbols) {
  const ids = symbols.map((s) => s.id);
  const meanings = shuffle(symbols.map((s) => s.name));
  const map = {};
  ids.forEach((id, i) => {
    map[id] = meanings[i];
  });
  return map;
}

export function generateCipherMaps() {
  return {
    thieves_cant: generateCipherMap(THIEVES_CANT_SYMBOLS),
    druidic: generateCipherMap(DRUIDIC_SYMBOLS),
  };
}

function isCompleteMap(map, expectedCount) {
  return (
    map &&
    typeof map === "object" &&
    Object.keys(map).length >= expectedCount
  );
}

/**
 * Returns true if the campaign already has both ciphers populated
 * with the right number of entries. Treats partial / empty maps as
 * needing regeneration.
 */
export function hasCompleteCipherMaps(campaign) {
  const maps = campaign?.language_cipher_maps || {};
  return (
    isCompleteMap(maps.thieves_cant, THIEVES_CANT_SYMBOLS.length) &&
    isCompleteMap(maps.druidic, DRUIDIC_SYMBOLS.length)
  );
}

/**
 * Lazy-generation path for campaigns that pre-date this feature.
 * Call this on the GM's first authenticated access to world lore on
 * the campaign — it'll generate any missing ciphers and persist them
 * via Campaign.update. Returns the (possibly updated) campaign row.
 *
 * Safe to call when maps already exist: the helper short-circuits.
 * Should NOT be invoked from non-GM render paths (RLS will block
 * the write anyway, but we don't want extra failed-update noise in
 * the console).
 */
export async function ensureCipherMapsForCampaign(campaign) {
  if (!campaign?.id) return campaign;
  if (hasCompleteCipherMaps(campaign)) return campaign;

  const existing = campaign.language_cipher_maps || {};
  const next = {
    thieves_cant: isCompleteMap(existing.thieves_cant, THIEVES_CANT_SYMBOLS.length)
      ? existing.thieves_cant
      : generateCipherMap(THIEVES_CANT_SYMBOLS),
    druidic: isCompleteMap(existing.druidic, DRUIDIC_SYMBOLS.length)
      ? existing.druidic
      : generateCipherMap(DRUIDIC_SYMBOLS),
  };

  const updated = await base44.entities.Campaign.update(campaign.id, {
    language_cipher_maps: next,
  });
  return updated || { ...campaign, language_cipher_maps: next };
}
