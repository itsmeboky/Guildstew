import { supabase } from "@/api/supabaseClient";

/**
 * Campaign ban-list client. One authoritative helper file so the
 * preview screen (reads), ban validator (reads), and GM ban-list
 * editor (writes) all share the same shape:
 *
 *   { id, campaign_id, ban_type, banned_name, reason, created_at }
 *
 * `ban_type` is one of:
 *   'race' | 'class' | 'subclass' | 'spell' | 'feature' | 'item'
 *
 * All comparisons are case-insensitive on `banned_name` so the GM can
 * type "Silvery Barbs" or "silvery barbs" and both match an entry.
 */

export const BAN_TYPES = ["race", "class", "subclass", "spell", "feature", "item"];

export const BAN_TYPE_LABELS = {
  race:     { singular: "Race",     plural: "Races" },
  class:    { singular: "Class",    plural: "Classes" },
  subclass: { singular: "Subclass", plural: "Subclasses" },
  spell:    { singular: "Spell",    plural: "Spells" },
  feature:  { singular: "Feature",  plural: "Features" },
  item:     { singular: "Item",     plural: "Items" },
};

export async function listCampaignBans(campaignId) {
  if (!campaignId) return [];
  const { data, error } = await supabase
    .from("campaign_bans")
    .select("id, ban_type, banned_name, reason, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listCampaignBans", error);
    return [];
  }
  return data || [];
}

/**
 * Group bans by type so the preview / editor can render them by
 * section without a per-render filter pass.
 *
 *   groupBansByType([...]) → { spell: [...], race: [...], ... }
 */
export function groupBansByType(bans = []) {
  const grouped = {};
  for (const t of BAN_TYPES) grouped[t] = [];
  for (const b of bans || []) {
    if (grouped[b.ban_type]) grouped[b.ban_type].push(b);
  }
  return grouped;
}

export async function addBan({ campaignId, ban_type, banned_name, reason = null }) {
  const payload = {
    campaign_id: campaignId,
    ban_type,
    banned_name: banned_name.trim(),
    reason: reason?.trim() || null,
  };
  const { data, error } = await supabase
    .from("campaign_bans")
    .upsert(payload, { onConflict: "campaign_id,ban_type,banned_name" })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function removeBan(banId) {
  const { error } = await supabase.from("campaign_bans").delete().eq("id", banId);
  if (error) throw error;
}

/**
 * Apply a quick-ban preset. Returns the number of entries added.
 * Each preset is a list of { ban_type, banned_name, reason } rows.
 */
export const BAN_PRESETS = {
  no_flying_races: {
    label: "No Flying Races",
    description: "Bans Aarakocra and other innate-flight races.",
    entries: [
      { ban_type: "race", banned_name: "Aarakocra", reason: "Innate flight at level 1 trivializes many encounters." },
      { ban_type: "race", banned_name: "Fairy",      reason: "Innate flight at level 1 trivializes many encounters." },
    ],
  },
  no_silvery_barbs: {
    label: "No Silvery Barbs",
    description: "Bans the most commonly-banned spell.",
    entries: [
      { ban_type: "spell", banned_name: "Silvery Barbs", reason: "Banned for balance reasons." },
    ],
  },
  no_wish_simulacrum: {
    label: "No Wish / Simulacrum",
    description: "Bans the most campaign-breaking combo.",
    entries: [
      { ban_type: "spell", banned_name: "Wish",        reason: "Campaign-breaking spell." },
      { ban_type: "spell", banned_name: "Simulacrum",  reason: "Enables infinite-stack exploits." },
      { ban_type: "spell", banned_name: "True Polymorph", reason: "Unbounded combo with Simulacrum." },
    ],
  },
};

export async function applyBanPreset(campaignId, presetKey) {
  const preset = BAN_PRESETS[presetKey];
  if (!preset) return 0;
  let added = 0;
  for (const row of preset.entries) {
    try {
      await addBan({ campaignId, ...row });
      added += 1;
    } catch (err) {
      console.error("applyBanPreset", row, err);
    }
  }
  return added;
}
