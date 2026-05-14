-- ============================================================================
-- Approval workflow — companions table
-- ============================================================================
--
-- Custom companions added through the Party panel's CompanionTab go
-- straight into the `companions` table with no review step. GMs need a
-- pending/approved/rejected state so the existing approval queue can
-- surface them alongside the JSONB-shape customs that come out of the
-- character creator's CompanionPicker.
--
-- Familiars come through the same companions table (or the JSONB shape on
-- the character row) — they ride on this same flag.
--
-- Patron content is narrative-only in our schema, so it gets no approval
-- column here.
--
-- Safe to re-run: every column add uses IF NOT EXISTS, and the default
-- swap is idempotent.
-- ============================================================================

BEGIN;


-- ----------------------------------------------------------------------------
-- 1. approval_status
-- ----------------------------------------------------------------------------
-- Added with DEFAULT 'approved' on purpose so all 14 existing companion
-- rows backfill to 'approved' automatically (grandfathered — pre-flow
-- companions are assumed legitimate). We then flip the column default to
-- 'pending' so anything inserted from now on starts in the GM queue.

ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.companions
  ALTER COLUMN approval_status SET DEFAULT 'pending';


-- ----------------------------------------------------------------------------
-- 2. Audit columns
-- ----------------------------------------------------------------------------

ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);


-- ----------------------------------------------------------------------------
-- 3. Index for the GM queue query
-- ----------------------------------------------------------------------------
-- The approval queue reads:
--   SELECT ... FROM companions WHERE campaign_id = $1 AND approval_status = 'pending'
-- A partial index on the pending slice keeps the scan tight even when
-- the approved set grows large.

CREATE INDEX IF NOT EXISTS companions_pending_idx
  ON public.companions (campaign_id, approval_status)
  WHERE approval_status = 'pending';


COMMIT;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Confirm columns landed
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'companions'
  AND column_name IN ('approval_status', 'approved_at', 'approved_by')
ORDER BY column_name;

-- Existing rows should all show 'approved'
SELECT approval_status, COUNT(*) AS row_count
FROM public.companions
GROUP BY approval_status
ORDER BY approval_status;


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP INDEX IF EXISTS public.companions_pending_idx;
-- ALTER TABLE public.companions DROP COLUMN IF EXISTS approved_by;
-- ALTER TABLE public.companions DROP COLUMN IF EXISTS approved_at;
-- ALTER TABLE public.companions DROP COLUMN IF EXISTS approval_status;
-- ============================================================================
