-- Homepage hero carousel — admin-managed rotating banners.
-- The public Home page pulls where is_active = true ordered by
-- sort_order; title / subtitle render as overlay text and link_url
-- wraps the whole banner in a link.

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_read_active_banners') THEN
    CREATE POLICY "anyone_read_active_banners" ON homepage_banners
      FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admins_manage_banners') THEN
    CREATE POLICY "admins_manage_banners" ON homepage_banners
      FOR ALL USING (
        lower(auth.jwt() ->> 'email') = 'itsmeboky@aetherianstudios.com'
        OR lower(auth.jwt() ->> 'email') LIKE '%@aetherianstudios.com'
        OR lower(auth.jwt() ->> 'email') LIKE '%@guildstew.com'
      );
  END IF;
END $$;
