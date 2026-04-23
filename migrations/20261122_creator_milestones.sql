-- ═════════════════════════════════════════════════════════════
--   Creator milestone tracking
--
--   Adds four columns to user_profiles that power the Creator
--   Program's badge / milestone / referral systems:
--     * creator_total_sales   — lifetime sale count for milestones
--     * creator_badges        — TEXT[] holding the badge slugs
--                               ('rising_creator', 'established_creator',
--                                'master_creator', 'legendary_creator')
--     * is_pioneer_creator    — set on first listing for the first
--                               100 unique creator_ids in tavern_items
--     * creator_referral_code — 6-char alphanumeric, unique, used by
--                               the "invite another creator" bonus
--     * referred_by_creator   — the referring creator's user_id (set
--                               at signup or first listing)
--
--   All idempotent; re-running is safe.
-- ═════════════════════════════════════════════════════════════

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS creator_total_sales   INTEGER    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creator_badges        TEXT[]     NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_pioneer_creator    BOOLEAN    NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS creator_referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_creator   UUID;

-- Unique index (not a UNIQUE constraint) so NULLs are allowed while
-- real codes still collide on re-insert. Partial unique-on-not-null.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_creator_referral_code
  ON user_profiles(creator_referral_code)
  WHERE creator_referral_code IS NOT NULL;

-- Backfill a referral code for every existing user who doesn't have
-- one yet. Uses a safe uppercase alphanumeric seed; the app will
-- also generate one at first-listing time for users added later.
UPDATE user_profiles
   SET creator_referral_code = UPPER(SUBSTRING(REPLACE(user_id::text, '-', ''), 1, 6))
 WHERE creator_referral_code IS NULL;
