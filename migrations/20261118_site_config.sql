-- Site-wide key/value config.
--
-- One-row-per-setting table that pieces of the app (especially the
-- marketing homepage) read to decide what to render. Values are
-- JSONB so each setting can carry whatever shape it needs without
-- a schema change.
--
-- Current consumers:
--   homepage_newest_gamepack → { name, image, description, link_url }
--   homepage_top_selling     → { name, image, description, link_url }
-- (Blog / Version history / forums etc. have their own dedicated
-- tables; site_config is for singleton content.)

CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_read_site_config') THEN
    CREATE POLICY "anyone_read_site_config" ON site_config
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admins_manage_site_config') THEN
    CREATE POLICY "admins_manage_site_config" ON site_config
      FOR ALL USING (
        lower(auth.jwt() ->> 'email') = 'itsmeboky@aetherianstudios.com'
        OR lower(auth.jwt() ->> 'email') LIKE '%@aetherianstudios.com'
        OR lower(auth.jwt() ->> 'email') LIKE '%@guildstew.com'
      );
  END IF;
END $$;
