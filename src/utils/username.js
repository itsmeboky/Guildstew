import { supabase } from "@/api/supabaseClient";

const AETHERIAN_DOMAINS = ["@aetherianstudios.com", "@guildstew.com"];

/**
 * True for employees of Aetherian / Guildstew. Used to bypass
 * restrictions on the reserved `itsme` prefix and to auto-grant admin
 * in other places.
 */
export function isAetherianEmail(email) {
  const e = (email || "").toLowerCase();
  return AETHERIAN_DOMAINS.some((domain) => e.endsWith(domain));
}

/**
 * Returns `{ ok, error }` describing whether this username is
 * syntactically and policy-wise allowed for this email. Length, char
 * set, and the reserved `itsme` prefix are checked here; uniqueness
 * is separate (involves a Supabase round-trip).
 */
export function validateUsername(username, email) {
  const name = (username || "").trim();
  if (name.length < 3) return { ok: false, error: "Username must be at least 3 characters." };
  if (name.length > 24) return { ok: false, error: "Username is too long (24 chars max)." };
  if (!/^[a-zA-Z0-9_.\-]+$/.test(name)) {
    return { ok: false, error: "Letters, numbers, _, - and . only." };
  }
  if (name.toLowerCase().startsWith("itsme") && !isAetherianEmail(email)) {
    return { ok: false, error: "Usernames starting with \"itsme\" are reserved for Aetherian staff." };
  }
  return { ok: true };
}

/**
 * Checks whether `username` is already claimed by another user. Pass
 * `excludeUserId` on profile edit so the caller doesn't flag their
 * own current username as taken.
 *
 * Returns `{ available, error }` — error is null on a clean query,
 * populated when Supabase failed outright so the caller can decide
 * whether to block or fall open.
 */
export async function isUsernameAvailable(username, excludeUserId = null) {
  const name = (username || "").trim();
  if (!name) return { available: false, error: null };
  let query = supabase
    .from("user_profiles")
    .select("id, user_id")
    .ilike("username", name)
    .limit(1);
  const { data, error } = await query;
  if (error) return { available: false, error };
  const hit = (data || []).find((row) => row.user_id !== excludeUserId);
  return { available: !hit, error: null };
}
