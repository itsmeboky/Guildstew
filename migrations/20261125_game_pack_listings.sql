-- Game Pack Listings — the marketing/presentation layer for game packs.
--
-- The existing game_packs table (20261119) holds the gameplay/mechanics
-- side of a pack: rules, stripe price, system identity, etc. The listing
-- layer is split into its own table because the product-page presentation
-- (hero copy, theme tokens, image paths, narrative paragraphs) has very
-- different cardinality, edit cadence, and access patterns than the
-- mechanics side. Keeping them apart lets marketing edit the listing
-- without touching gameplay.
--
-- One listing per pack today; the FK is unique on game_pack_id, but the
-- table is structured to allow lifting that constraint later if we ever
-- want regional / language variants.

CREATE TABLE IF NOT EXISTS game_pack_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_pack_id UUID NOT NULL REFERENCES game_packs(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  subtitle TEXT,
  genre_tag TEXT,
  publisher_name TEXT,
  publisher_origin TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden')),
  price_cents INTEGER,
  stripe_price_id TEXT,

  -- Imagery: storage paths inside the user-assets bucket. Public URLs are
  -- resolved on the client via supabase.storage.getPublicUrl.
  hero_image_path TEXT,
  pack_feature_1_image_path TEXT,
  pack_feature_2_image_path TEXT,
  theme_dice_image_path TEXT,
  book_cover_image_path TEXT,

  -- Voice / copy
  hero_pull_quote TEXT,
  about_paragraphs JSONB,
  pack_feature_1_title TEXT,
  pack_feature_1_body TEXT,
  pack_feature_2_title TEXT,
  pack_feature_2_body TEXT,
  theme_section_header TEXT,
  theme_section_tagline TEXT,
  theme_section_body TEXT,
  book_section_header TEXT,
  book_section_tagline TEXT,
  book_section_body TEXT,
  book_cta_label TEXT,
  book_purchase_url TEXT,

  -- CTA labels
  cta_primary_label TEXT DEFAULT 'Buy Pack',
  cta_secondary_label TEXT DEFAULT 'Preview',

  -- Theme tokens: bg/text/accent colors, font stacks, layout flavor.
  -- Stored as a single jsonb so the admin Theme tab can edit it as a
  -- form and the product page can spread it as CSS custom properties.
  theme_tokens JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_pack_listings_slug ON game_pack_listings(slug);
CREATE INDEX IF NOT EXISTS idx_game_pack_listings_pack ON game_pack_listings(game_pack_id);
CREATE INDEX IF NOT EXISTS idx_game_pack_listings_status ON game_pack_listings(status);

-- Standard updated_at trigger. There isn't a shared handle_updated_at
-- helper anywhere earlier in the migration history, so we define a
-- table-local one rather than introducing a cross-cutting function in
-- this slice.
CREATE OR REPLACE FUNCTION game_pack_listings_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_game_pack_listings_updated_at ON game_pack_listings;
CREATE TRIGGER trg_game_pack_listings_updated_at
BEFORE UPDATE ON game_pack_listings
FOR EACH ROW EXECUTE FUNCTION game_pack_listings_set_updated_at();

-- Per project decisions, the app runs in dev-mode RLS posture. We
-- intentionally do NOT enable RLS on this table for now. When we lock
-- down RLS site-wide, this table will get reads-for-everyone and
-- writes-for-admins policies in line with game_packs.
