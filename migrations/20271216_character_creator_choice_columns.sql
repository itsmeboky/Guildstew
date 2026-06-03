-- Character-creator choice columns (Phase 5b save-schema fix).
--
-- Phase 5b started persisting five creator fields so a saved character
-- reopens intact (ASI/multiclass audit trail + equipment-selector state).
-- The `characters` table stores character data as flat top-level columns
-- (each payload key = a column; there is no catch-all jsonb blob), so the
-- new keys had no home and every PC write was rejected with
--   "Could not find the 'asiSelections' column of 'characters'".
--
-- This adds the five columns. The payload emits them in the table's
-- snake_case convention (asi_selections / base_attributes /
-- multiclass_skills); the in-creator state keeps the camelCase form and
-- the reload path maps between them. campaign_npcs is unaffected — it
-- stores the whole stats object inside a `stats` jsonb column.

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS base_attributes JSONB DEFAULT '{}'::jsonb;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS asi_selections JSONB DEFAULT '{}'::jsonb;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS multiclass_skills JSONB DEFAULT '{}'::jsonb;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS equipment_choices JSONB DEFAULT '{}'::jsonb;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS used_starting_gold BOOLEAN DEFAULT false;

-- PostgREST caches the schema; reload it so the new columns are writable
-- immediately. (Supabase dashboard migrations reload automatically; this
-- line covers the raw-SQL path.)
NOTIFY pgrst, 'reload schema';
