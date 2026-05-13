-- Migration: Enable RLS on world_lore_entries
--
-- This table has four existing policies that have been DORMANT
-- because RLS was disabled at the table level. Flipping the switch
-- activates them:
--
--   gm_insert_world_lore   INSERT — only campaign GM
--   gm_update_world_lore   UPDATE — only campaign GM
--   gm_delete_world_lore   DELETE — only campaign GM
--   users_read_world_lore  SELECT — GM + listed campaign players
--
-- Before this migration: anyone with the anon key could read or
-- write any world lore in any campaign in the database.
--
-- Rollback (if needed):
--   ALTER TABLE public.world_lore_entries DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.world_lore_entries ENABLE ROW LEVEL SECURITY;

-- Verification: re-run this after the ALTER TABLE.
-- Expected result: rls_enabled = true
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'world_lore_entries';
