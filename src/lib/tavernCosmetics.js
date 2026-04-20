import { supabase } from "@/api/supabaseClient";
import { listEntitlements } from "@/lib/tavernEntitlements";
import { getActiveCosmetics, slotForCategory } from "@/lib/activeCosmetics";

/**
 * Slot-aware cosmetic lookups.
 *
 * Reusable fetchers for the character-creator / profile / dice roller
 * so each surface doesn't redo the "which items are mine + which are
 * active" plumbing. Returns plain arrays + a couple of helper shapes
 * each caller can render however it likes.
 */

/**
 * All Tavern items the user owns (personal + current guild) within
 * the given categories. Pass a single category or an array.
 */
export async function getOwnedItemsByCategories(userId, categories, { currentGuildId = null } = {}) {
  if (!userId) return [];
  const cats = Array.isArray(categories) ? categories : [categories];

  const entitlements = await listEntitlements(userId, { currentGuildId });
  if (entitlements.length === 0) return [];

  const ids = entitlements.map((e) => e.item_id);
  const { data } = await supabase
    .from("tavern_items")
    .select("*")
    .in("id", ids)
    .in("category", cats);

  return (data || []).map((item) => {
    const ent = entitlements.find((e) => e.item_id === item.id);
    return { ...item, _source: ent?.source || "personal" };
  });
}

/**
 * Active cosmetic *item* (not just id) for a given category. Used by
 * the dice roller to read the active dice skin's `file_data`, the
 * profile to render the banner image, etc.
 */
export async function getActiveCosmeticItem(userId, category) {
  if (!userId) return null;
  const slot = slotForCategory(category);
  if (!slot) return null;

  const cosmetics = await getActiveCosmetics(userId);
  const itemId = cosmetics?.[slot];
  if (!itemId) return null;

  const { data } = await supabase
    .from("tavern_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  return data || null;
}

/**
 * Dice skin helper — returns a normalized `{ color, texture, glow }`
 * object that the dice roller can consume. Defaults survive missing
 * fields so the roller can always render something.
 */
export async function getActiveDiceSkin(userId) {
  const item = await getActiveCosmeticItem(userId, "dice_skin");
  const fd = item?.file_data || {};
  return {
    id: item?.id || null,
    name: item?.name || null,
    color: fd.color || "#1a1a2e",
    texture: fd.texture || "plastic",
    glow: fd.glow || null,
  };
}

/**
 * Profile banner helper — returns the banner image URL for the given
 * user (the owner / viewed-profile user), or null if none applied.
 */
export async function getActiveProfileBannerUrl(userId) {
  const item = await getActiveCosmeticItem(userId, "profile_banner");
  return item?.file_url || item?.preview_image_url || null;
}

/**
 * Character-creator helper — all owned portraits + portrait packs,
 * flattened to a list of `{ id, image_url, source, item_id }`.
 * Portrait packs explode into one entry per image in the pack's
 * `preview_images` (or `file_data.images` if the creator stored them
 * there).
 */
export async function getOwnedPortraitOptions(userId, { currentGuildId = null } = {}) {
  const items = await getOwnedItemsByCategories(
    userId,
    ["portrait", "portrait_pack"],
    { currentGuildId },
  );
  const out = [];
  for (const item of items) {
    if (item.category === "portrait") {
      const url = item.file_url || item.preview_image_url;
      if (url) {
        out.push({
          id: item.id,
          item_id: item.id,
          name: item.name,
          image_url: url,
          source: item._source,
        });
      }
      continue;
    }
    // portrait_pack: prefer file_data.images, else preview_images.
    const images =
      (Array.isArray(item.file_data?.images) && item.file_data.images) ||
      item.preview_images ||
      [];
    images.forEach((url, idx) => {
      if (!url) return;
      out.push({
        id: `${item.id}:${idx}`,
        item_id: item.id,
        name: `${item.name} · ${idx + 1}`,
        image_url: url,
        source: item._source,
      });
    });
  }
  return out;
}
