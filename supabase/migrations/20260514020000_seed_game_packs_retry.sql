-- ============================================================================
-- Seed public.game_packs (retry) + Add Pathfinder
-- ============================================================================
--
-- Why this exists:
--
--   The earlier seed migration (20260514010000_seed_game_packs.sql) used
--   `ON CONFLICT (slug) DO NOTHING` which requires a UNIQUE constraint on
--   the slug column. If the table was created via the dashboard without
--   that constraint, the INSERT raises:
--
--     ERROR: there is no unique or exclusion constraint matching
--            the ON CONFLICT specification
--
--   The whole transaction rolls back, no rows get seeded, and the admin
--   form's dropdown stays empty — same player-facing symptom ("Game pack
--   is required" on Save) as the original report.
--
--   This migration retries the seed using `WHERE NOT EXISTS (...)` so it
--   works regardless of whether the slug column has a unique constraint.
--   It also adds the Pathfinder 2nd Edition pack alongside the D&D 5e
--   entries, since the report mentions Pathfinder is missing from the list.
--
-- What this migration does:
--
--   For each of the three packs (D&D 5e 2014, D&D 5e 2024, Pathfinder 2e):
--   inserts a row only if no row with that slug exists yet. The values
--   are deliberately minimal — id is left to the table default, optional
--   columns (price_usd, image_url, description, etc.) stay null for admins
--   to fill via the Game Pack Listings form.
--
-- Wrapped in BEGIN/COMMIT — atomic.
-- ============================================================================

BEGIN;

-- D&D 5e (2014) ---------------------------------------------------------------
INSERT INTO public.game_packs (slug, name, is_active, sort_order)
SELECT 'dnd5e_2014', 'D&D 5e (2014 PHB)', true, 10
WHERE NOT EXISTS (
  SELECT 1 FROM public.game_packs WHERE slug = 'dnd5e_2014'
);

-- D&D 5e (2024) ---------------------------------------------------------------
INSERT INTO public.game_packs (slug, name, is_active, sort_order)
SELECT 'dnd5e_2024', 'D&D 5e (2024 PHB)', true, 20
WHERE NOT EXISTS (
  SELECT 1 FROM public.game_packs WHERE slug = 'dnd5e_2024'
);

-- Pathfinder 2nd Edition ------------------------------------------------------
-- No data module ships under src/data/games/pathfinder_2e/ yet — adding the
-- row makes the admin form able to draft a public listing for the pack
-- (image, price, description copy, etc.) ahead of the data module landing.
INSERT INTO public.game_packs (slug, name, is_active, sort_order)
SELECT 'pathfinder_2e', 'Pathfinder (2nd Edition)', true, 30
WHERE NOT EXISTS (
  SELECT 1 FROM public.game_packs WHERE slug = 'pathfinder_2e'
);

COMMIT;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Should return at least these three rows (more if the dashboard had
-- seeded others).
SELECT id, slug, name, is_active, sort_order
FROM public.game_packs
ORDER BY sort_order, slug;


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- BEGIN;
--   DELETE FROM public.game_packs
--   WHERE slug IN ('dnd5e_2014', 'dnd5e_2024', 'pathfinder_2e');
-- COMMIT;
-- ============================================================================
