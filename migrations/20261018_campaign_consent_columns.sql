-- Campaign consent + player content preferences
--
-- Adds the GM-side content-planning columns and the matching
-- player-side preference column so the consent-conflict detection
-- has somewhere to read from. The existing `consent_rating` and
-- `consent_checklist` columns stay in place for backwards compat —
-- these new columns sit alongside them and are read by the newer
-- conflict-detection flow.
--
-- Apply via the Supabase SQL editor or `psql`. Idempotent —
-- re-running is safe.

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS player_expectations TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS gm_responsibilities TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_rating TEXT DEFAULT 'Family Friendly';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_settings JSONB DEFAULT '{}'::jsonb;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS content_preference TEXT DEFAULT 'Teen';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS content_preferences JSONB DEFAULT '{}'::jsonb;
