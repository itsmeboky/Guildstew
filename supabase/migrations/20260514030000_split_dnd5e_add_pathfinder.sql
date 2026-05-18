-- ============================================================================
-- Split dnd5e → dnd5e_2014 + dnd5e_2024, add pathfinder_2e
-- ============================================================================
--
-- Current state (per the user's table snapshot):
--   slug                | name                | sort_order
--   --------------------+---------------------+------------
--   dnd5e               | D&D 5e              | 1
--   mork-borg           | Mörk Borg           | 2
--   blades-in-the-dark  | Blades in the Dark  | 3
--
-- Earlier seed migrations (20260514010000 / 20260514020000) clearly did
-- NOT take effect — otherwise there'd be additional rows for dnd5e_2014 /
-- dnd5e_2024 / pathfinder_2e. Likely the deploy pipeline didn't apply
-- them, or they errored on a column the dashboard-created table doesn't
-- have. Either way, this migration brings the table to the intended
-- shape and is safe to re-run.
--
-- Desired end state:
--   slug                | name                       | sort_order
--   --------------------+----------------------------+------------
--   dnd5e_2014          | D&D 5e (2014 PHB)          | 1   ← renamed from dnd5e
--   dnd5e_2024          | D&D 5e (2024 PHB)          | 2   ← new
--   pathfinder_2e       | Pathfinder (2nd Edition)   | 3   ← new
--   mork-borg           | Mörk Borg                  | 4   ← bumped from 2
--   blades-in-the-dark  | Blades in the Dark         | 5   ← bumped from 3
--
-- Why rename rather than delete + insert: any row in game_pack_listings
-- whose game_pack_id points at the existing dnd5e row's UUID keeps
-- pointing at the same UUID. Renaming preserves the FK link; delete+
-- insert would orphan it.
--
-- Only columns referenced anywhere in src/ are touched: slug, name,
-- sort_order. Other columns the dashboard added (is_active,
-- price_usd, image_url, description, ...) stay untouched on existing
-- rows. New rows inherit table defaults for those.
--
-- Wrapped in BEGIN/COMMIT — atomic.
-- ============================================================================

BEGIN;


-- 1. Rename existing dnd5e → dnd5e_2014 (only if it still has the
--    legacy slug — safe to re-run after the rename has happened).
UPDATE public.game_packs
SET slug = 'dnd5e_2014',
    name = 'D&D 5e (2014 PHB)',
    sort_order = 1
WHERE slug = 'dnd5e';


-- 2. Insert dnd5e_2024 if missing.
INSERT INTO public.game_packs (slug, name, sort_order)
SELECT 'dnd5e_2024', 'D&D 5e (2024 PHB)', 2
WHERE NOT EXISTS (
  SELECT 1 FROM public.game_packs WHERE slug = 'dnd5e_2024'
);


-- 3. Insert pathfinder_2e if missing. No data module ships under
--    src/data/games/pathfinder_2e/ yet — admins can draft the public
--    Tavern listing copy ahead of the data landing.
INSERT INTO public.game_packs (slug, name, sort_order)
SELECT 'pathfinder_2e', 'Pathfinder (2nd Edition)', 3
WHERE NOT EXISTS (
  SELECT 1 FROM public.game_packs WHERE slug = 'pathfinder_2e'
);


-- 4. Re-sort the remaining live packs so D&D + Pathfinder lead and
--    the indie systems trail in their original relative order.
UPDATE public.game_packs SET sort_order = 4 WHERE slug = 'mork-borg';
UPDATE public.game_packs SET sort_order = 5 WHERE slug = 'blades-in-the-dark';


COMMIT;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Should return exactly five rows, sorted as documented above.
SELECT slug, name, sort_order
FROM public.game_packs
ORDER BY sort_order;


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- BEGIN;
--   DELETE FROM public.game_packs
--   WHERE slug IN ('dnd5e_2024', 'pathfinder_2e');
--
--   UPDATE public.game_packs SET sort_order = 2 WHERE slug = 'mork-borg';
--   UPDATE public.game_packs SET sort_order = 3 WHERE slug = 'blades-in-the-dark';
--
--   UPDATE public.game_packs
--   SET slug = 'dnd5e', name = 'D&D 5e', sort_order = 1
--   WHERE slug = 'dnd5e_2014';
-- COMMIT;
-- ============================================================================
