-- Consolidated ensure-tables migration.
--
-- Every table + column the app's save paths depend on. All
-- statements are idempotent (CREATE TABLE IF NOT EXISTS, ADD COLUMN
-- IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, ON CONFLICT DO
-- NOTHING). Run this once against any Guildstew environment that's
-- missing newer migrations and the app-load crashes should stop
-- without needing to replay every individual migration.
--
-- Columns / tables covered here were originally introduced by:
--   20261105 spice wallets
--   20261106 tavern items
--   20261107 active cosmetics
--   20261108 cashout requests
--   20261109 blog + versions
--   20261110 admin tier override
--   20261111 forums
--   20261112 support tickets / FAQ / docs
--   20261113 user settings

-- user_profiles columns ------------------------------------------------
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS active_cosmetics JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS admin_tier_override TEXT
    CHECK (admin_tier_override IS NULL
           OR admin_tier_override IN ('free', 'adventurer', 'veteran', 'guild'));

-- Spice wallets --------------------------------------------------------
CREATE TABLE IF NOT EXISTS spice_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  balance BIGINT NOT NULL DEFAULT 0,
  lifetime_earned BIGINT NOT NULL DEFAULT 0,
  lifetime_spent BIGINT NOT NULL DEFAULT 0,
  lifetime_purchased BIGINT NOT NULL DEFAULT 0,
  last_stipend_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guild_spice_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL UNIQUE,
  balance BIGINT NOT NULL DEFAULT 0,
  lifetime_total BIGINT NOT NULL DEFAULT 0,
  spending_restricted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spice_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  guild_id UUID,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tavern marketplace ---------------------------------------------------
CREATE TABLE IF NOT EXISTS tavern_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  price BIGINT NOT NULL,
  preview_image_url TEXT,
  preview_images TEXT[] DEFAULT '{}',
  file_url TEXT,
  file_data JSONB DEFAULT '{}',
  is_official BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  featured_month TEXT,
  purchase_count INTEGER DEFAULT 0,
  rating_sum INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  creator_tier TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tavern_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  guild_id UUID,
  item_id UUID NOT NULL REFERENCES tavern_items(id),
  price_paid BIGINT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id)
);

CREATE TABLE IF NOT EXISTS tavern_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  item_id UUID NOT NULL REFERENCES tavern_items(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Creator cashouts -----------------------------------------------------
CREATE TABLE IF NOT EXISTS cashout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  spice_amount BIGINT NOT NULL,
  usd_amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Blog + versions ------------------------------------------------------
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

-- Forums ---------------------------------------------------------------
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

-- Support + FAQ + docs -------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  assigned_to UUID,
  screenshot_urls TEXT[] DEFAULT '{}',
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faq_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documentation_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partial uniqueness for thread slugs (scoped per category).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_forum_thread_slug_per_category'
  ) THEN
    CREATE UNIQUE INDEX uniq_forum_thread_slug_per_category
      ON forum_threads(category_id, slug);
  END IF;
END $$;

-- Useful indexes (idempotent).
CREATE INDEX IF NOT EXISTS idx_spice_wallets_user           ON spice_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_spice_transactions_user      ON spice_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_spice_transactions_type      ON spice_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_tavern_items_category        ON tavern_items(category);
CREATE INDEX IF NOT EXISTS idx_tavern_items_creator         ON tavern_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_tavern_purchases_user        ON tavern_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_tavern_purchases_guild       ON tavern_purchases(guild_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_user        ON cashout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_status      ON cashout_requests(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published         ON blog_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug              ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_version_history_date         ON version_history(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category       ON forum_threads(category_id, is_pinned DESC, last_reply_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread         ON forum_replies(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_user                 ON support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_status               ON support_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_messages              ON ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_faq_category                 ON faq_entries(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_docs_category                ON documentation_pages(category, sort_order);
