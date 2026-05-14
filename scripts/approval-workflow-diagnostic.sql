-- ============================================================================
-- Approval workflow — pre-migration diagnostic
-- ============================================================================
-- Run BEFORE applying 20260513230000_approval_workflow.sql.
--
-- The migration assumes Path B (no approval columns exist on companions).
-- If this returns rows for `companions`, surface them to Boky — Path A
-- (columns already exist) means we should adapt the migration rather than
-- add duplicate columns.
-- ----------------------------------------------------------------------------

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'companions',
    'homebrew_rules',
    'brewery_mods',
    'characters'
  )
  AND (
    column_name LIKE '%approv%'
    OR column_name LIKE '%status%'
    OR column_name LIKE '%review%'
    OR column_name = 'is_pending'
  )
ORDER BY table_name, column_name;


-- Sanity check: how many existing companions will be grandfathered?
SELECT COUNT(*) AS existing_companions FROM public.companions;
