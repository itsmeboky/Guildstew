-- ═════════════════════════════════════════════════════════════
--   Campaign approval / join pipeline
--
--   Two schema updates:
--     1. campaign_applications gains the columns the approval flow
--        needs — user_id (alongside the legacy applicant_id), the
--        character being presented, GM feedback, cached ban-violation
--        results, a modded-campaign flag, a resubmission counter, and
--        an updated_at stamp. Every column is added idempotently.
--     2. New campaign_bans table storing each restriction the GM
--        has turned on for their campaign.
--
--   Idempotent — re-running is a no-op.
-- ═════════════════════════════════════════════════════════════

-- ── campaign_applications ─────────────────────────────────
ALTER TABLE campaign_applications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gm_message TEXT,
  ADD COLUMN IF NOT EXISTS ban_violations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_modded_campaign BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill user_id from the legacy applicant_id column so existing
-- rows satisfy the new NOT-NULL-ish invariant. Only sets rows where
-- user_id hasn't already been populated.
UPDATE campaign_applications
   SET user_id = applicant_id
 WHERE user_id IS NULL
   AND applicant_id IS NOT NULL;

-- Unique constraint pivots from (campaign_id, applicant_id) to
-- (campaign_id, user_id). The old constraint stays for legacy
-- compatibility; we just add the new one alongside it, guarded so
-- the DDL is safe on re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaign_applications_campaign_user_unique'
  ) THEN
    ALTER TABLE campaign_applications
      ADD CONSTRAINT campaign_applications_campaign_user_unique
      UNIQUE (campaign_id, user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_campaign_apps_user ON campaign_applications(user_id, created_at DESC);

-- ── campaign_bans ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  -- 'race' | 'class' | 'subclass' | 'spell' | 'feature' | 'item'
  ban_type TEXT NOT NULL,
  -- The canonical name the validator case-insensitive-compares against.
  banned_name TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, ban_type, banned_name)
);

CREATE INDEX IF NOT EXISTS idx_campaign_bans_campaign ON campaign_bans(campaign_id, ban_type);

ALTER TABLE campaign_bans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_reads_bans') THEN
    -- Players reading a campaign's ban list from the preview screen
    -- don't need write access; the list is intentionally public so a
    -- would-be applicant can check before applying.
    CREATE POLICY "anyone_reads_bans" ON campaign_bans
      FOR SELECT USING (TRUE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gm_manages_bans') THEN
    CREATE POLICY "gm_manages_bans" ON campaign_bans
      FOR ALL USING (
        campaign_id IN (SELECT id FROM campaigns WHERE game_master_id = auth.uid())
      )
      WITH CHECK (
        campaign_id IN (SELECT id FROM campaigns WHERE game_master_id = auth.uid())
      );
  END IF;
END $$;
