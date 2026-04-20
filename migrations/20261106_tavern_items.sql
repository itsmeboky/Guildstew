-- The Tavern Part 2 — marketplace items, purchases, ratings.
-- Spice-priced cosmetic items (themes, portraits, dice, sounds…).
-- Purchases can be personal (user_id) or shared-guild (guild_id).

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

CREATE INDEX IF NOT EXISTS idx_tavern_items_category ON tavern_items(category);
CREATE INDEX IF NOT EXISTS idx_tavern_items_creator ON tavern_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_tavern_items_featured ON tavern_items(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_tavern_items_official ON tavern_items(is_official) WHERE is_official = true;
CREATE INDEX IF NOT EXISTS idx_tavern_purchases_user ON tavern_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_tavern_purchases_guild ON tavern_purchases(guild_id);

ALTER TABLE tavern_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tavern_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tavern_ratings ENABLE ROW LEVEL SECURITY;

-- Non-creators see only active listings; creators always see their
-- own (so they can verify a pending / rejected / removed listing).
CREATE POLICY "anyone_read_active_items" ON tavern_items
  FOR SELECT USING (status = 'active' OR creator_id = auth.uid());

CREATE POLICY "creators_manage_items" ON tavern_items
  FOR ALL USING (creator_id = auth.uid());

CREATE POLICY "users_read_own_purchases" ON tavern_purchases
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "anyone_read_ratings" ON tavern_ratings
  FOR SELECT USING (true);

CREATE POLICY "users_manage_own_ratings" ON tavern_ratings
  FOR ALL USING (user_id = auth.uid());
