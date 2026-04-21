-- Admin-assignable subscription tier override.
--
-- When set on `user_profiles.admin_tier_override`, it wins over any
-- Stripe-backed tier for that user. Used to manually hand out tiers
-- (comps, beta testers, staff accounts) without needing a real
-- subscription row. Null = no override — the user's actual
-- subscription (or free default) applies.
--
-- Enforced at read time in `src/api/billingClient.js →
-- getSubscriptionStatus`, so every code path that resolves tier
-- through the subscription context picks it up automatically.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS admin_tier_override TEXT
  CHECK (admin_tier_override IS NULL
         OR admin_tier_override IN ('free', 'adventurer', 'veteran', 'guild'));
