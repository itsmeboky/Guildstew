import { supabase } from "@/api/supabaseClient";

/**
 * Active cosmetics slot layout — one per cosmetic category.
 *
 * Every Tavern category maps to exactly one slot, and each slot
 * holds a single item id. Setting a slot to `null` clears the
 * cosmetic back to the Guildstew default.
 *
 * Slot key is persisted on `user_profiles.active_cosmetics` so the
 * rest of the app (theme loader, dice roller, profile banner, etc.)
 * can read the user's preferences in a single round-trip.
 */
export const COSMETIC_SLOTS = {
  ui_theme:       "theme_id",
  dice_skin:      "dice_skin_id",
  cursor_set:     "cursor_set_id",
  profile_banner: "profile_banner_id",
  sound_pack:     "sound_pack_id",
  animation:      "animation_id",
  portrait:       "portrait_id",
  // portrait_pack doesn't take a slot — its contents are browsable
  // from the character creator, not "applied" globally.
};

export function slotForCategory(category) {
  return COSMETIC_SLOTS[category] || null;
}

export async function getActiveCosmetics(userId) {
  if (!userId) return {};
  // `active_cosmetics` is an optional migration; tolerate its absence
  // so the rest of the app still loads when it hasn't been applied.
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("active_cosmetics")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return {};
    return data?.active_cosmetics || {};
  } catch {
    return {};
  }
}

/**
 * Set a single slot to an item id (or clear it with `null`). Merges
 * with the existing cosmetics blob — any sibling slots are
 * preserved. Returns the new merged blob.
 */
export async function setActiveCosmetic(userId, slotKey, itemId) {
  if (!userId || !slotKey) return null;
  const current = await getActiveCosmetics(userId);
  const next = { ...current, [slotKey]: itemId || null };
  try {
    await supabase
      .from("user_profiles")
      .update({ active_cosmetics: next })
      .eq("user_id", userId);
  } catch { /* column not migrated yet — fail quiet so callers aren't blocked */ }
  return next;
}

/**
 * Convenience — given a category (e.g. "ui_theme") and an item id,
 * set the right slot to that item. Returns the new merged blob.
 */
export async function applyCosmetic(userId, category, itemId) {
  const slot = slotForCategory(category);
  if (!slot) return null;
  return setActiveCosmetic(userId, slot, itemId);
}

export async function clearCosmetic(userId, category) {
  const slot = slotForCategory(category);
  if (!slot) return null;
  return setActiveCosmetic(userId, slot, null);
}

export function isItemActive(activeCosmetics, category, itemId) {
  const slot = slotForCategory(category);
  if (!slot) return false;
  return activeCosmetics?.[slot] === itemId;
}
