import { supabase } from "@/api/supabaseClient";
import { mergeSettings, mergeNotifications } from "@/config/settingsDefaults";

/**
 * Settings client — read / patch the `settings` and
 * `notification_preferences` JSONB columns on `user_profiles`.
 *
 * Each patch is a shallow merge at the domain level so partial writes
 * (updating a single toggle) never clobber unrelated keys.
 *
 * Both columns are recent migrations — the client tolerates their
 * absence so the rest of the app still boots when the migration
 * hasn't been applied in the target database yet. Reads fall back
 * to defaults; writes swallow the error.
 */

export async function getUserSettings(userId) {
  if (!userId) return { settings: mergeSettings({}), notifications: mergeNotifications({}) };
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("settings, notification_preferences")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return {
      settings: mergeSettings(data?.settings || {}),
      notifications: mergeNotifications(data?.notification_preferences || {}),
    };
  } catch {
    return { settings: mergeSettings({}), notifications: mergeNotifications({}) };
  }
}

async function readJson(userId, column) {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select(column)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return {};
    return data?.[column] || {};
  } catch {
    return {};
  }
}

async function writeJson(userId, column, value) {
  try {
    await supabase.from("user_profiles").update({ [column]: value }).eq("user_id", userId);
  } catch { /* column not migrated — fail quiet */ }
}

/**
 * Patch a single settings domain (appearance / accessibility /
 * privacy / legal). Fetches the current blob first so sibling keys
 * are preserved, then writes the merged result.
 */
export async function patchSettingsDomain(userId, domain, patch) {
  if (!userId || !domain) return null;
  const current = await readJson(userId, "settings");
  const next = {
    ...current,
    [domain]: { ...(current[domain] || {}), ...patch },
  };
  await writeJson(userId, "settings", next);
  return next;
}

export async function patchNotifications(userId, bucket, patch) {
  if (!userId || !bucket) return null;
  const current = await readJson(userId, "notification_preferences");
  const next = {
    ...current,
    [bucket]: { ...(current[bucket] || {}), ...patch },
  };
  await writeJson(userId, "notification_preferences", next);
  return next;
}
