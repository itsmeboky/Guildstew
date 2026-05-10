-- Alpha launch — comp every user to Veteran tier.
--
-- The subscription system already supports admin-driven tier
-- overrides through user_profiles.admin_tier_override. The
-- billingClient's getSubscriptionStatus() checks the override
-- BEFORE invoking the edge function, so setting it to 'veteran'
-- gives the user full Veteran-tier access without payment
-- processing. Idempotent: running twice doesn't downgrade or
-- erase anyone whose override was hand-set to something else
-- intentionally, since the WHERE clause skips already-set rows.
--
-- Existing users:
--   Backfilled here.
-- New users:
--   Signup flow (src/pages/Signup.jsx) inserts a user_profiles
--   row with admin_tier_override='veteran' on signup.
--
-- Reverting alpha comp later: ALTER … set NULL where status =
-- 'admin_override'. The billing path then resumes resolving each
-- user's real tier from the edge function once it ships.
--
-- Apply via the Supabase SQL editor or `psql`. Idempotent —
-- re-running is safe.

-- Backfill — set admin_tier_override='veteran' on every profile
-- that doesn't already have an override. Skipping rows that
-- already have a value preserves any hand-set non-veteran
-- overrides (admin testing, edge cases).
UPDATE user_profiles
SET admin_tier_override = 'veteran',
    updated_at = NOW()
WHERE admin_tier_override IS NULL
   OR admin_tier_override = '';

-- Defensive: any auth.users without a user_profiles row at all
-- get one with the override pre-set. This catches accounts that
-- existed before the user_profiles row-insert was added to
-- signup, or rows that were deleted manually.
INSERT INTO user_profiles (user_id, email, admin_tier_override, created_at, updated_at)
SELECT
  u.id,
  u.email,
  'veteran',
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;
