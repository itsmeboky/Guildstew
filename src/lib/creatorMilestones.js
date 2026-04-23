import { supabase } from "@/api/supabaseClient";

/**
 * Creator milestone tracking — the client-side half of the
 * schema added in migrations/20261122_creator_milestones.sql.
 *
 * Two entry points:
 *   recordCreatorSale(creatorId)  — call from the purchase flow after
 *                                    the creator earns any amount on a
 *                                    sale. Increments
 *                                    creator_total_sales and awards
 *                                    badge slugs as thresholds are
 *                                    crossed.
 *   grantPioneerIfEligible(creatorId) — call when a creator lists
 *                                       their first item. Stamps
 *                                       is_pioneer_creator=true if
 *                                       fewer than 100 distinct
 *                                       creators have ever listed.
 *
 * Both are non-fatal: they log + swallow errors so a milestone write
 * can never block the underlying purchase or listing from landing.
 *
 * Badge slugs (match the Creator Program page's MILESTONES array):
 *   rising_creator       → 10 sales
 *   established_creator  → 50 sales
 *   master_creator       → 100 sales
 *   legendary_creator    → 500 sales
 *
 * The 1-sale milestone ("Creator" title) is granted via the existing
 * display-title flow (migrations/20261120_user_titles.sql) and is not
 * a badge slug here.
 */

export const CREATOR_BADGE_THRESHOLDS = [
  { at: 10,  slug: "rising_creator"      },
  { at: 50,  slug: "established_creator" },
  { at: 100, slug: "master_creator"      },
  { at: 500, slug: "legendary_creator"   },
];

const PIONEER_CAP = 100;

/**
 * Increment a creator's lifetime sale count and append any newly-
 * earned badge slugs. No-ops when `creatorId` is falsy (e.g.
 * Guildstew-official items that skip the creator split).
 */
export async function recordCreatorSale(creatorId, { increment = 1 } = {}) {
  if (!creatorId) return;
  try {
    // Read-modify-write — the critical section is small enough that
    // concurrent sales on the same creator collapse to one effective
    // append. Row-level RLS limits who can see/write these anyway.
    const { data: profile, error: readErr } = await supabase
      .from("user_profiles")
      .select("creator_total_sales, creator_badges")
      .eq("user_id", creatorId)
      .maybeSingle();
    if (readErr) throw readErr;

    const prevSales  = Number(profile?.creator_total_sales) || 0;
    const prevBadges = Array.isArray(profile?.creator_badges) ? profile.creator_badges : [];
    const nextSales  = prevSales + increment;

    const earned = CREATOR_BADGE_THRESHOLDS
      .filter(({ at, slug }) => nextSales >= at && prevSales < at && !prevBadges.includes(slug))
      .map(({ slug }) => slug);

    const nextBadges = earned.length > 0
      ? Array.from(new Set([...prevBadges, ...earned]))
      : prevBadges;

    const patch = { creator_total_sales: nextSales };
    if (earned.length > 0) patch.creator_badges = nextBadges;

    const { error: writeErr } = await supabase
      .from("user_profiles")
      .update(patch)
      .eq("user_id", creatorId);
    if (writeErr) throw writeErr;
  } catch (err) {
    console.error("recordCreatorSale", err);
  }
}

/**
 * Pioneer Creator grant — runs on first listing. Counts the number
 * of distinct `creator_id`s currently in `tavern_items`; if that's
 * still below `PIONEER_CAP` and the user isn't already flagged, set
 * is_pioneer_creator=true.
 */
export async function grantPioneerIfEligible(creatorId) {
  if (!creatorId) return false;
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_pioneer_creator")
      .eq("user_id", creatorId)
      .maybeSingle();
    if (profile?.is_pioneer_creator) return true;

    // Count distinct creators by pulling all creator_id rows and
    // deduping client-side. Cheaper than a DISTINCT query for <1000
    // creators, which is the universe we're gating on.
    const { data: rows } = await supabase
      .from("tavern_items")
      .select("creator_id");
    const distinct = new Set((rows || []).map((r) => r.creator_id).filter(Boolean));

    // The CURRENT listing has already landed by the time we call
    // this, so `distinct` already contains creatorId. That means the
    // Nth distinct creator sees distinct.size === N.
    if (distinct.size > PIONEER_CAP) return false;

    const { error } = await supabase
      .from("user_profiles")
      .update({ is_pioneer_creator: true })
      .eq("user_id", creatorId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("grantPioneerIfEligible", err);
    return false;
  }
}

/**
 * Ensure the signed-in user has a referral code; generates a
 * 6-character A-Z0-9 code if missing. Called from the Creator
 * Program page so anyone who visits the page ends up with one.
 */
const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function ensureReferralCode(userId) {
  if (!userId) return null;
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("creator_referral_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile?.creator_referral_code) return profile.creator_referral_code;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      let code = "";
      for (let i = 0; i < 6; i += 1) {
        code += REFERRAL_ALPHABET[Math.floor(Math.random() * REFERRAL_ALPHABET.length)];
      }
      const { error } = await supabase
        .from("user_profiles")
        .update({ creator_referral_code: code })
        .eq("user_id", userId);
      if (!error) return code;
      // On collision (unique-index hit) retry with a fresh code.
    }
    return null;
  } catch (err) {
    console.error("ensureReferralCode", err);
    return null;
  }
}
