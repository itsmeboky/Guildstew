-- Community events — shown on the public /events page and managed
-- from the admin panel.

CREATE TABLE IF NOT EXISTS community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'community',  -- 'community' | 'contest' | 'game_jam' | 'spotlight'
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  image_url TEXT,
  link_url TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_events_start ON community_events(start_date DESC);

ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_read_published_events') THEN
    CREATE POLICY "anyone_read_published_events" ON community_events
      FOR SELECT USING (is_published = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admins_manage_events') THEN
    CREATE POLICY "admins_manage_events" ON community_events
      FOR ALL USING (
        lower(auth.jwt() ->> 'email') = 'itsmeboky@aetherianstudios.com'
        OR lower(auth.jwt() ->> 'email') LIKE '%@aetherianstudios.com'
        OR lower(auth.jwt() ->> 'email') LIKE '%@guildstew.com'
      );
  END IF;
END $$;
