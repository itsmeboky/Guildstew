-- Fix: companions table is missing columns the app writes on every
-- save, so inserts/updates from the Adventuring Party panel's
-- CompanionTab are rejected wholesale by PostgREST ("Could not find
-- the 'approval_status' column of 'companions' in the schema cache").
--
-- Root cause: the live DB drifted from the repo. The approval-workflow
-- migration (supabase/migrations/20260513230000_approval_workflow.sql)
-- was never applied here, and the generic entity layer's update path
-- (src/api/entities.js stamps updated_at on every .update()) needs an
-- updated_at column that this table never had.
--
-- What CompanionTab writes vs. what existed before this migration:
--   create -> approval_status / approved_at / approved_by  (all missing)
--   update -> updated_at                                   (missing)
-- Everything else (name, type, description, stats, image_url,
-- hp_current, hp_max) already exists.
--
-- Safe to re-run: every add is IF NOT EXISTS and the default swap is
-- idempotent. Run in the Supabase SQL editor.

BEGIN;

-- approval_status — added with DEFAULT 'approved' first so any existing
-- companion rows grandfather in as approved, then the default flips to
-- 'pending' so future inserts start in the GM approval queue.
ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.companions
  ALTER COLUMN approval_status SET DEFAULT 'pending';

-- audit columns the approval flow / GM queue read and write
ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- updated_at — required by the generic entity update path; without it
-- every companion EDIT fails the same way creates currently do.
ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Partial index for the GM pending-approval queue
-- (SELECT ... WHERE campaign_id = $1 AND approval_status = 'pending').
CREATE INDEX IF NOT EXISTS companions_pending_idx
  ON public.companions (campaign_id, approval_status)
  WHERE approval_status = 'pending';

COMMIT;

-- Verify the columns landed:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'companions'
-- ORDER BY ordinal_position;
