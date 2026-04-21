-- Community forums: categories, threads, replies, likes.
--
-- Public read for everything (forums are a public surface). Writes
-- require an authenticated user matching the author_id. Dev-only
-- categories (Announcements) are enforced in the app layer since the
-- admin gate uses email-domain, not a `role` column — the posting
-- form simply doesn't render for non-admins there.

CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  icon TEXT,
  color TEXT DEFAULT '#f8a47c',
  is_dev_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES forum_categories(id),
  author_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_dev_post BOOLEAN DEFAULT false,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  last_reply_by UUID,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Thread slugs aren't globally unique — they're scoped per category
-- so two categories can have an "intro" thread. Enforced with a
-- partial UNIQUE index.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_forum_thread_slug_per_category
  ON forum_threads(category_id, slug);

CREATE TABLE IF NOT EXISTS forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_dev_reply BOOLEAN DEFAULT false,
  is_solution BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  reply_id UUID NOT NULL REFERENCES forum_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, reply_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON forum_threads(category_id, is_pinned DESC, last_reply_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread ON forum_replies(thread_id, created_at);

ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_forum_categories" ON forum_categories FOR SELECT USING (true);
CREATE POLICY "anyone_read_forum_threads"    ON forum_threads    FOR SELECT USING (true);
CREATE POLICY "anyone_read_forum_replies"    ON forum_replies    FOR SELECT USING (true);

CREATE POLICY "auth_users_write_threads" ON forum_threads
  FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "auth_users_write_replies" ON forum_replies
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "users_manage_own_threads" ON forum_threads
  FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "users_manage_own_replies" ON forum_replies
  FOR UPDATE USING (auth.uid() = author_id);

-- Admin moderation (pin / lock / dev-post / solution / delete) uses
-- the same email-domain gate as the other admin surfaces. Mirrors
-- the pattern used by `admins_manage_posts` on blog_posts.
CREATE POLICY "admins_manage_forum_categories" ON forum_categories
  FOR ALL USING (
    lower(auth.jwt() ->> 'email') = 'itsmeboky@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@guildstew.com'
  );
CREATE POLICY "admins_manage_forum_threads" ON forum_threads
  FOR ALL USING (
    lower(auth.jwt() ->> 'email') = 'itsmeboky@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@guildstew.com'
  );
CREATE POLICY "admins_manage_forum_replies" ON forum_replies
  FOR ALL USING (
    lower(auth.jwt() ->> 'email') = 'itsmeboky@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@guildstew.com'
  );

CREATE POLICY "auth_users_like" ON forum_likes
  FOR ALL USING (auth.uid() = user_id);

-- Anonymous readers bump `view_count` via this definer RPC — gives
-- us analytics without opening a write policy on threads.
CREATE OR REPLACE FUNCTION increment_forum_thread_view(p_thread_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_threads
     SET view_count = COALESCE(view_count, 0) + 1
   WHERE id = p_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed the default category list. `ON CONFLICT DO NOTHING` so the
-- migration is idempotent across environments.
INSERT INTO forum_categories (name, description, slug, sort_order, icon, is_dev_only) VALUES
  ('Announcements',      'Official news and updates from the Guildstew team.',                   'announcements', 1, 'Megaphone',     true),
  ('General Discussion', 'Chat about TTRPGs, campaigns, and anything tabletop.',                  'general',       2, 'MessageCircle', false),
  ('Feature Requests',   'Suggest new features and vote on community ideas.',                    'features',      3, 'Lightbulb',     false),
  ('Bug Reports',        'Found something broken? Let us know here.',                            'bugs',          4, 'Bug',           false),
  ('The Brewery',        'Share your homebrew mods, get feedback, and discuss modding.',         'brewery',       5, 'Beaker',        false),
  ('Campaign Stories',   'Share your epic moments, funny fails, and campaign tales.',            'stories',       6, 'BookOpen',      false),
  ('Tavern Creators',    'For creators — share your work, get feedback, discuss the marketplace.','creators',     7, 'Palette',       false),
  ('Off-Topic',          'Video games, movies, memes, and whatever else.',                       'off-topic',     8, 'Coffee',        false)
ON CONFLICT (slug) DO NOTHING;
