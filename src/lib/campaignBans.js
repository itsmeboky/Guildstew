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
 * Convenience wrapper: load and group bans into a structured object
 * keyed by ban_type. Returns:
 *   {
 *     races:      [{name, reason}, …],
 *     classes:    [{name, reason}, …],
 *     subclasses: [{name, reason}, …],
 *     spells:     [{name, reason}, …],
 *     features:   [{name, reason}, …],
 *     items:      [{name, reason}, …],
 *   }
 *
 * Hotfix #10b's library-import incompatibility check consumes this.
 * One round-trip; structured at the boundary so call sites don't
 * have to filter the flat list themselves.
 */
export async function loadCampaignBans(campaignId) {
  const flat = await listCampaignBans(campaignId);
  const out = {
    races: [],
    classes: [],
    subclasses: [],
    spells: [],
    features: [],
    items: [],
  };
  // ban_type strings on the row are the same singulars used as
  // BAN_TYPES; map to the plural buckets above.
  const bucket = {
    race: "races",
    class: "classes",
    subclass: "subclasses",
    spell: "spells",
    feature: "features",
    item: "items",
  };
  for (const row of flat) {
    const key = bucket[row.ban_type];
    if (!key) continue;
    out[key].push({ name: row.banned_name, reason: row.reason || null });
  }
  return out;
}

// Case-insensitive name comparison so the GM can type "silvery
// barbs" or "Silvery Barbs" interchangeably.
const matches = (list, name) =>
  Array.isArray(list)
    && typeof name === "string"
    && list.some((entry) => entry?.name?.toLowerCase?.() === name.toLowerCase());

export const isBannedRace      = (bans, name) => matches(bans?.races,      name);
export const isBannedClass     = (bans, name) => matches(bans?.classes,    name);
export const isBannedSubclass  = (bans, name) => matches(bans?.subclasses, name);
export const isBannedSpell     = (bans, name) => matches(bans?.spells,     name);
export const isBannedFeature   = (bans, name) => matches(bans?.features,   name);
export const isBannedItem      = (bans, name) => matches(bans?.items,      name);

/**
 * Walk a character record against a structured bans object and
 * return every violation as a `{field, ban_type, banned_name,
 * reason}` entry. Empty array means the character is fully
 * compatible with the campaign's ban list.
 *
 * Covers the six ban_types in the campaign_bans schema (race,
 * class, subclass, spell, feature, item) for the obvious character
 * fields. Spells and features are surveyed across both the flat
 * fields used by the SRD path (race, class, subclass, background)
 * and the JSONB collections written by the apply flow
 * (known_spells, prepared_spells, features, class_features). Item
 * checks scan inventory + equipped slots.
 */
export function findCharacterIncompatibilities(bans, character) {
  if (!bans || !character) return [];
  const violations = [];
  const push = (field, ban_type, banned_name, reason) =>
    violations.push({ field, ban_type, banned_name, reason });

  if (isBannedRace(bans, character.race)) {
    push("race", "race", character.race,
      bans.races.find((r) => r.name?.toLowerCase() === character.race?.toLowerCase())?.reason || null);
  }
  if (isBannedClass(bans, character.class)) {
    push("class", "class", character.class,
      bans.classes.find((r) => r.name?.toLowerCase() === character.class?.toLowerCase())?.reason || null);
  }
  if (isBannedSubclass(bans, character.subclass)) {
    push("subclass", "subclass", character.subclass,
      bans.subclasses.find((r) => r.name?.toLowerCase() === character.subclass?.toLowerCase())?.reason || null);
  }

  const collectNames = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((v) => (typeof v === "string" ? v : v?.name)).filter(Boolean);
    return [];
  };

  for (const spellName of collectNames(character.known_spells)
    .concat(collectNames(character.prepared_spells))
    .concat(collectNames(character.spells))) {
    if (isBannedSpell(bans, spellName)) {
      push("spells", "spell", spellName,
        bans.spells.find((r) => r.name?.toLowerCase() === spellName.toLowerCase())?.reason || null);
    }
  }

  for (const featName of collectNames(character.features)
    .concat(collectNames(character.class_features))
    .concat(collectNames(character.feats))
    .concat(collectNames(character.background_features))) {
    if (isBannedFeature(bans, featName)) {
      push("features", "feature", featName,
        bans.features.find((r) => r.name?.toLowerCase() === featName.toLowerCase())?.reason || null);
    }
  }

  const itemNames = [
    ...collectNames(character.inventory),
    ...Object.values(character.equipped || {}).map((it) => (typeof it === "string" ? it : it?.name)).filter(Boolean),
  ];
  for (const itemName of itemNames) {
    if (isBannedItem(bans, itemName)) {
      push("inventory", "item", itemName,
        bans.items.find((r) => r.name?.toLowerCase() === itemName.toLowerCase())?.reason || null);
    }
  }

  return violations;
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
