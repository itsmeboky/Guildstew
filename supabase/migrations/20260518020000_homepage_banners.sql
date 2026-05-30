-- Homepage hero carousel — admin-managed rotating banners.
--
-- This table's CREATE + RLS originally shipped only in the untracked
-- migrations/ dir (migrations/20261117_homepage_banners.sql) and was
-- never added to the CLI-tracked supabase/migrations/ set, so a fresh
-- CLI rebuild wouldn't create it. This migration reproduces it here.
--
-- The public Home page pulls where is_active = true ordered by
-- sort_order; title / subtitle render as overlay text and link_url
-- wraps the whole banner in a link.
--
-- Fully idempotent: safe to run where the table already exists.

CREATE TABLE IF NOT EXISTS homepage_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  link_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_banners_order
  ON homepage_banners(sort_order) WHERE is_active = true;

ALTER TABLE homepage_banners ENABLE ROW LEVEL SECURITY;

-- Public/anon SELECT of active banners — the homepage reads
-- unauthenticated.
DROP POLICY IF EXISTS "anyone_read_active_banners" ON homepage_banners;
CREATE POLICY "anyone_read_active_banners" ON homepage_banners
  FOR SELECT USING (is_active = true);

-- Admin write — gated by team email domain in the JWT. WITH CHECK
-- mirrors USING so inserts/updates are held to the same predicate.
DROP POLICY IF EXISTS "admins_manage_banners" ON homepage_banners;
CREATE POLICY "admins_manage_banners" ON homepage_banners
  FOR ALL
  USING (
    lower(auth.jwt() ->> 'email') = 'itsmeboky@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@guildstew.com'
  )
  WITH CHECK (
    lower(auth.jwt() ->> 'email') = 'itsmeboky@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@guildstew.com'
  );
