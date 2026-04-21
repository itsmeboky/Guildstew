import { supabase } from "@/api/supabaseClient";
import { mergeSettings, mergeNotifications } from "@/config/settingsDefaults";

/**
 * Settings client — read / patch the `settings` and
 * `notification_preferences` JSONB columns on `user_profiles`.
 *
 * Each patch is a shallow merge at the domain level so partial writes
 * (updating a single toggle) never clobber unrelated keys.
 */

export async function getUserSettings(userId) {
  if (!userId) return { settings: mergeSettings({}), notifications: mergeNotifications({}) };
  const { data } = await supabase
    .from("user_profiles")
    .select("settings, notification_preferences")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    settings: mergeSettings(data?.settings || {}),
    notifications: mergeNotifications(data?.notification_preferences || {}),
  };
}

/**
 * Patch a single settings domain (appearance / accessibility /
 * privacy / legal). Fetches the current blob first so sibling keys
 * are preserved, then writes the merged result.
 */
export async function patchSettingsDomain(userId, domain, patch) {
  if (!userId || !domain) return null;
  const { data: row } = await supabase
    .from("user_profiles")
    .select("settings")
    .eq("user_id", userId)
    .maybeSingle();
  const current = row?.settings || {};
  const next = {
    ...current,
    [domain]: { ...(current[domain] || {}), ...patch },
  };
  await supabase.from("user_profiles").update({ settings: next }).eq("user_id", userId);
  return next;
}

export async function patchNotifications(userId, bucket, patch) {
  if (!userId || !bucket) return null;
  const { data: row } = await supabase
    .from("user_profiles")
    .select("notification_preferences")
    .eq("user_id", userId)
    .maybeSingle();
  const current = row?.notification_preferences || {};
  const next = {
    ...current,
    [bucket]: { ...(current[bucket] || {}), ...patch },
  };
  await supabase
    .from("user_profiles")
    .update({ notification_preferences: next })
    .eq("user_id", userId);
  return next;
}
