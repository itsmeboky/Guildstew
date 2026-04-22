-- ═════════════════════════════════════════════════════════════
--   Guildstew consolidated schema fix — run once.
--
--   Idempotent: every statement uses IF NOT EXISTS so running this
--   on a database that already has some of these tables/columns is
--   a no-op. Covers everything the app's save paths touch:
--     - user_profiles columns (settings, cosmetics, status, etc.)
--     - campaigns columns (discovery + application flow)
--     - support_tickets.screenshot_urls
--     - every table the code inserts/updates
--
--   New since `20261114_ensure_all_tables.sql`:
--     - user_profiles.status, user_profiles.display_title
--     - campaigns.invite_code, is_public, looking_for_players,
--       max_players, campaign_description
--     - campaign_applications table
-- ═════════════════════════════════════════════════════════════

-- ── user_profiles ─────────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS active_cosmetics JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS admin_tier_override TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS display_title TEXT DEFAULT 'Wanderer';

-- Tighten `admin_tier_override` values to the subscription tier set.
-- Guard against re-adding when the constraint already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_admin_tier_override_check'
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_admin_tier_override_check
      CHECK (admin_tier_override IS NULL
             OR admin_tier_override IN ('free', 'adventurer', 'veteran', 'guild'));
  END IF;
END $$;

-- ── campaigns ─────────────────────────────────────────────
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS looking_for_players BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 6,
  ADD COLUMN IF NOT EXISTS campaign_description TEXT;

-- Unique invite codes (nullable — existing campaigns without a code
-- don't conflict). Only enforced where the column is non-null.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_campaigns_invite_code'
  ) THEN
    CREATE UNIQUE INDEX uniq_campaigns_invite_code
      ON campaigns(invite_code)
      WHERE invite_code IS NOT NULL;
  END IF;
END $$;

-- ── support_tickets — screenshot column ──────────────────
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS screenshot_urls TEXT[] DEFAULT '{}';

-- ── campaign_applications ────────────────────────────────
-- Players apply to public campaigns; GM accepts / rejects.
CREATE TABLE IF NOT EXISTS campaign_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT,
  status TEXT DEFAULT 'pending',   -- 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(campaign_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_apps_campaign ON campaign_applications(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_apps_applicant ON campaign_applications(applicant_id, created_at DESC);

ALTER TABLE campaign_applications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'applicants_manage_own_applications') THEN
    CREATE POLICY "applicants_manage_own_applications" ON campaign_applications
      FOR ALL USING (applicant_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gm_manages_campaign_applications') THEN
    CREATE POLICY "gm_manages_campaign_applications" ON campaign_applications
      FOR ALL USING (
        campaign_id IN (SELECT id FROM campaigns WHERE game_master_id = auth.uid())
      );
  END IF;
END $$;
