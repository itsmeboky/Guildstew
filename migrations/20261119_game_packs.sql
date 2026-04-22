-- Game packs — real-money Stripe-priced TTRPG system bundles.
-- Separate from tavern_items (Spice-priced cosmetics) because the
-- purchase flow is different (USD via Stripe, not Spice debit) and
-- the unlock grants system-wide access to content (races/classes/
-- monster libraries) rather than a cosmetic.

CREATE TABLE IF NOT EXISTS game_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- 'dnd5e', 'pathfinder2e', …
  name TEXT NOT NULL,                  -- 'D&D 5e', 'Pathfinder 2e'
  description TEXT,
  image_url TEXT,
  logo_url TEXT,
  price_usd NUMERIC(10,2) NOT NULL DEFAULT 7.99,
  stripe_price_id TEXT,                -- null until Stripe product exists
  is_free BOOLEAN DEFAULT false,       -- D&D 5e is free/included
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_pack_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  pack_id UUID NOT NULL REFERENCES game_packs(id) ON DELETE CASCADE,
  price_paid_usd NUMERIC(10,2) NOT NULL,
  stripe_session_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_game_pack_purchases_user ON game_pack_purchases(user_id);

ALTER TABLE game_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_pack_purchases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_read_active_packs') THEN
    CREATE POLICY "anyone_read_active_packs" ON game_packs
      FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_own_pack_purchases') THEN
    CREATE POLICY "users_read_own_pack_purchases" ON game_pack_purchases
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admins_manage_game_packs') THEN
    CREATE POLICY "admins_manage_game_packs" ON game_packs
      FOR ALL USING (
        lower(auth.jwt() ->> 'email') = 'itsmeboky@aetherianstudios.com'
        OR lower(auth.jwt() ->> 'email') LIKE '%@aetherianstudios.com'
        OR lower(auth.jwt() ->> 'email') LIKE '%@guildstew.com'
      );
  END IF;
END $$;

-- Seed the D&D 5e free/included pack so the Tavern has at least
-- one pack to render out of the box.
INSERT INTO game_packs (slug, name, description, price_usd, is_free, sort_order)
VALUES ('dnd5e', 'D&D 5e', 'The default Guildstew system. Included for every account — full races, classes, monsters, and spells.', 0.00, true, 1)
ON CONFLICT (slug) DO NOTHING;
