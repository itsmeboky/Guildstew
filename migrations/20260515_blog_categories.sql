-- Custom blog post categories.
--
-- The admin Blog tab previously hard-coded a five-entry CATEGORIES
-- list (tutorial / article / announcement / patch_notes / community)
-- and stored the slug string directly on blog_posts.category. This
-- migration introduces a managed lookup table so admins can rename,
-- recolor, and add categories without a code change.
--
-- blog_posts.category continues to hold a slug-style string (e.g.
-- 'announcement') for backward compatibility with existing rows. New
-- categories created through the admin UI get inserted here with a
-- slug that the post form references the same way; the public
-- Blog / BlogPost pages render label + color from the lookup at read
-- time. Deleting a category that's still referenced by published
-- posts is blocked at the admin UI level (and by the foreign-key
-- check via the slug column being non-FK — admins see the count and
-- can reassign before deleting).
--
-- Admin write policy mirrors blog_posts: JWT email claim against
-- @aetherianstudios.com / @guildstew.com / explicit override.

CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  -- Tailwind-friendly hex color used by the public category pill.
  -- Defaults to the existing #37F2D1 (teal) so untouched seeded
  -- categories look exactly as they did before.
  color TEXT NOT NULL DEFAULT '#37F2D1',
  -- Soft sort key for the admin list + the public picker.
  sort_order INTEGER NOT NULL DEFAULT 100,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_sort ON blog_categories(sort_order, label);

ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

-- Public read — anonymous visitors render the category pill on
-- /blog and /blog/:slug, so the category catalog must be readable
-- without auth.
CREATE POLICY "anyone_read_categories" ON blog_categories
  FOR SELECT USING (true);

-- Admin writes — same email rule as blog_posts.
CREATE POLICY "admins_manage_categories" ON blog_categories
  FOR ALL USING (
    lower(auth.jwt() ->> 'email') = 'itsmeboky@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@guildstew.com'
  );

-- Seed the previously-hardcoded five entries so existing posts keep
-- their pretty labels + the teal default color. INSERT...ON CONFLICT
-- means re-running this migration is a no-op.
INSERT INTO blog_categories (slug, label, color, sort_order) VALUES
  ('tutorial',     'Tutorial',      '#37F2D1', 10),
  ('article',      'Article',       '#37F2D1', 20),
  ('announcement', 'Announcement',  '#37F2D1', 30),
  ('patch_notes',  'Patch Notes',   '#37F2D1', 40),
  ('community',    'Community',     '#37F2D1', 50)
ON CONFLICT (slug) DO NOTHING;
