-- ═════════════════════════════════════════════════════════════
--   Game packs — spice pricing + Pathfinder 2e seed
--
--   Game packs were USD-only via Stripe Checkout. Pathfinder 2e
--   ships with an alternative spice price equivalent to $7.99 at
--   the SPICE_RATE=250 conversion (rounded to 2000 spice for a
--   clean number). The Stripe USD path stays alongside — both
--   checkout flows live on the same card.
--
--   `paid_with` on game_pack_purchases records which path closed
--   the sale. `price_paid_usd` becomes nullable so spice-only
--   purchases don't have to fake a USD price.
--
--   Idempotent. Apply via Supabase dashboard SQL editor.
-- ═════════════════════════════════════════════════════════════

ALTER TABLE game_packs
  ADD COLUMN IF NOT EXISTS price_spice INTEGER;

ALTER TABLE game_pack_purchases
  ADD COLUMN IF NOT EXISTS paid_with TEXT NOT NULL DEFAULT 'usd';

ALTER TABLE game_pack_purchases
  ADD COLUMN IF NOT EXISTS spice_paid BIGINT;

-- Constrain paid_with after the column exists so the ADD COLUMN
-- itself is idempotent. The CHECK is added inside a DO block so
-- re-runs don't error on duplicate constraints.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'game_pack_purchases_paid_with_check'
  ) THEN
    ALTER TABLE game_pack_purchases
      ADD CONSTRAINT game_pack_purchases_paid_with_check
      CHECK (paid_with IN ('usd', 'spice'));
  END IF;
END $$;

-- The original column was NOT NULL with no default; relax that
-- so spice-only purchases don't carry a placeholder USD value.
ALTER TABLE game_pack_purchases
  ALTER COLUMN price_paid_usd DROP NOT NULL;

-- Seed Pathfinder 2e. Idempotent on slug.
INSERT INTO game_packs (slug, name, description, price_usd, price_spice, is_free, sort_order)
VALUES (
  'pathfinder2e',
  'Pathfinder 2e',
  'Tactical fantasy with deep customization — three-action economy, ancestries instead of races, feats every other level. ORC-licensed Remaster ruleset.',
  7.99,
  2000,
  false,
  2
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_usd = EXCLUDED.price_usd,
  price_spice = EXCLUDED.price_spice,
  sort_order = EXCLUDED.sort_order;

NOTIFY pgrst, 'reload schema';
