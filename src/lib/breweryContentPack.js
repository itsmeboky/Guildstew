/**
 * Brewery content pack schema + install/uninstall helpers.
 *
 * A content pack is a `brewery_mods` row with `mod_type =
 * 'content_pack'`. Its metadata bundles pre-made campaign content
 * (monsters, items, spells, class features). Installing the pack
 * copies each entry into the corresponding campaign-scoped table
 * with `is_system: false` and a `brewery_pack_mod_id` tag so the
 * uninstall path can bulk-remove just this pack's contributions
 * without touching the GM's own homebrew.
 */

import { supabase } from "@/api/supabaseClient";

export const BLANK_CONTENT_PACK = {
  mod_type: "content_pack",
  name: "",
  description: "",
  image_url: "",
  contents: {
    monsters: [],
    items: [],
    spells: [],
    class_features: [],
  },
};

/**
 * Total number of entries the pack ships across all four buckets.
 */
export function contentPackSize(metadata) {
  const c = metadata?.contents || {};
  return (
    (c.monsters?.length || 0)
    + (c.items?.length || 0)
    + (c.spells?.length || 0)
    + (c.class_features?.length || 0)
  );
}

/**
 * Install a content pack into a campaign. Each entry is stamped
 * with the pack's mod_id so uninstall can target just this pack's
 * rows. is_system stays false — these are user-installed.
 *
 * Returns { success, counts: { monsters, items, spells, class_features } }
 * or { success: false, reason }.
 */
export async function installContentPack(campaignId, modId, metadata) {
  if (!campaignId || !modId || !metadata?.contents) {
    return { success: false, reason: "Missing campaign, mod id, or contents." };
  }
  const c = metadata.contents;
  const counts = { monsters: 0, items: 0, spells: 0, class_features: 0 };

  // Monsters → `monsters` table.
  if (Array.isArray(c.monsters) && c.monsters.length > 0) {
    const rows = c.monsters.map((m) => ({
      campaign_id: campaignId,
      name: m.name || "Pack Monster",
      description: m.description || "",
      stats: m,
      image_url: m.image_url || null,
      is_system: false,
      is_active: true,
      brewery_pack_mod_id: modId,
    }));
    const { error } = await supabase.from("monsters").insert(rows);
    if (error) return { success: false, reason: `monsters: ${error.message}` };
    counts.monsters = rows.length;
  }

  // Items → `campaign_items`.
  if (Array.isArray(c.items) && c.items.length > 0) {
    const rows = c.items.map((it) => ({
      campaign_id: campaignId,
      name: it.name || "Pack Item",
      type: it.type || "Wondrous Item",
      rarity: (it.rarity || "Common").toString().toLowerCase().replace(/ /g, "_"),
      description: it.description || "",
      properties: it,
      image_url: it.image_url || null,
      is_system: false,
      brewery_pack_mod_id: modId,
    }));
    const { error } = await supabase.from("campaign_items").insert(rows);
    if (error) return { success: false, reason: `items: ${error.message}` };
    counts.items = rows.length;
  }

  // Spells → `spells`.
  if (Array.isArray(c.spells) && c.spells.length > 0) {
    const rows = c.spells.map((sp) => ({
      campaign_id: campaignId,
      name: sp.name || "Pack Spell",
      level: Number(sp.level ?? 0),
      school: sp.school || "Evocation",
      casting_time: sp.casting_time || "1 action",
      range: sp.range || "",
      components: sp.components || "",
      duration: sp.duration || "Instantaneous",
      description: sp.description || "",
      higher_level: sp.higher_level || sp.higher_levels || "",
      classes: Array.isArray(sp.classes) ? sp.classes : [],
      source: "brewery_pack",
      is_system: false,
      brewery_pack_mod_id: modId,
    }));
    const { error } = await supabase.from("spells").insert(rows);
    if (error) return { success: false, reason: `spells: ${error.message}` };
    counts.spells = rows.length;
  }

  // Class features → `campaign_class_features`.
  if (Array.isArray(c.class_features) && c.class_features.length > 0) {
    const rows = c.class_features.map((cf) => ({
      campaign_id: campaignId,
      name: cf.name || "Pack Feature",
      description: cf.description || "",
      type: cf.type || "General Ability",
      class_name: cf.type === "Class Feature" ? (cf.class || null) : null,
      level: Number(cf.level) || 1,
      properties: cf,
      is_system: false,
      brewery_pack_mod_id: modId,
    }));
    const { error } = await supabase.from("campaign_class_features").insert(rows);
    if (error) return { success: false, reason: `class_features: ${error.message}` };
    counts.class_features = rows.length;
  }

  return { success: true, counts };
}

/**
 * Uninstall removes every row across the four campaign tables that
 * carries this pack's mod id. The GM's own homebrew (no
 * brewery_pack_mod_id set) is untouched.
 */
export async function uninstallContentPack(campaignId, modId) {
  if (!campaignId || !modId) return { success: false, reason: "Missing campaign or mod id." };
  const tables = ["monsters", "campaign_items", "spells", "campaign_class_features"];
  for (const t of tables) {
    const { error } = await supabase
      .from(t)
      .delete()
      .eq("campaign_id", campaignId)
      .eq("brewery_pack_mod_id", modId);
    if (error) {
      console.warn(`uninstallContentPack(${t}) failed:`, error.message);
    }
  }
  return { success: true };
}
