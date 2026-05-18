-- ============================================================================
-- Mark dnd5e_2014 / dnd5e_2024 / pathfinder_2e as free so they auto-grant
-- ============================================================================
--
-- Root cause of "no game packs in the picker":
--
--   useUserGamePacks() (src/lib/useUserGamePacks.js) maps DB slugs to
--   picker IDs through the GAME_PACKS catalog's `entitlementSlug` field.
--   The free-pack auto-grant branch runs:
--
--     SELECT slug FROM public.game_packs
--      WHERE is_active = true AND is_free = true;
--
--   Migration 20260514030000 split the original `dnd5e` row into
--   `dnd5e_2014` + `dnd5e_2024` and added `pathfinder_2e`, but it
--   never set `is_free = true` on any of them. The default for the
--   column is false (it was on the original `dnd5e` row though), so
--   the auto-grant query returns nothing, ownedPackIds = [], and the
--   character-creator picker shows no D&D / PF2e cards.
--
--   The config side (src/config/gamePacks.js entitlementSlug values)
--   is being fixed in the same PR — both halves are required:
--   matching slug *and* is_free=true.
--
-- Wrapped in BEGIN/COMMIT — atomic.
-- ============================================================================

BEGIN;

UPDATE public.game_packs
SET is_free = true,
    is_active = true
WHERE slug IN ('dnd5e_2014', 'dnd5e_2024', 'pathfinder_2e');

COMMIT;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Should show is_free = true for all three.
SELECT slug, name, is_active, is_free, sort_order
FROM public.game_packs
WHERE slug IN ('dnd5e_2014', 'dnd5e_2024', 'pathfinder_2e')
ORDER BY sort_order;


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- BEGIN;
--   UPDATE public.game_packs
--   SET is_free = false
--   WHERE slug IN ('dnd5e_2014', 'dnd5e_2024', 'pathfinder_2e');
-- COMMIT;
-- ============================================================================
