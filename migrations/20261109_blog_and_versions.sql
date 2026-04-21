-- Blog posts + version history.
-- The homepage shows both (Blog card bottom-right, Version History
-- card top-right); the admin panel writes to both. Public read for
-- published posts and all versions; writes are admin-only.
--
-- Admin identity in Guildstew is determined by email domain
-- (`@aetherianstudios.com` / `@guildstew.com`) plus a hard-coded
-- override list — see `src/pages/Admin.jsx`. The RLS policy below
-- mirrors that rule by matching the JWT's `email` claim, so we don't
-- need to back-fill a `role` column on `user_profiles`.

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'article',
  summary TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,

  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT false,

  tags TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  full_notes TEXT,
  release_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_major BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_version_history_date ON version_history(release_date DESC);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_history ENABLE ROW LEVEL SECURITY;

-- Public (even anonymous) reads — the homepage is a public surface.
CREATE POLICY "anyone_read_published_posts" ON blog_posts
  FOR SELECT USING (is_published = true);

CREATE POLICY "anyone_read_versions" ON version_history
  FOR SELECT USING (true);

-- Admin writes — matched via JWT email claim. Any of:
--   * explicit override (itsmeboky@aetherianstudios.com)
--   * any @aetherianstudios.com address
--   * any @guildstew.com address
CREATE POLICY "admins_manage_posts" ON blog_posts
  FOR ALL USING (
    lower(auth.jwt() ->> 'email') = 'itsmeboky@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@guildstew.com'
  );

CREATE POLICY "admins_manage_versions" ON version_history
  FOR ALL USING (
    lower(auth.jwt() ->> 'email') = 'itsmeboky@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@guildstew.com'
  );

-- Authors bump view_count on their own entry at render time — that
-- write isn't covered by the select-only policy above, so expose it
-- via an rpc-style update policy that only allows bumping view_count.
-- Implemented as a SECURITY DEFINER function to keep RLS intact.
CREATE OR REPLACE FUNCTION increment_blog_view(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE blog_posts
     SET view_count = COALESCE(view_count, 0) + 1
   WHERE slug = p_slug AND is_published = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
