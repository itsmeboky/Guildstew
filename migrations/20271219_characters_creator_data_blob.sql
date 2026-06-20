-- Consolidate flexible creator fields into a single `creator_data` jsonb
-- blob on `characters` (supersedes the v1 per-field snake columns).
--
-- v1 (migrations/20271216_character_creator_choice_columns.sql) homed five
-- creator fields as top-level columns. That's the fragile path — every new
-- flexible field (companions, allies/bonds, deities, …) needs another
-- column or the save breaks. This adds ONE jsonb blob that holds them all,
-- so future creator fields never need a migration. Brief B's `allies`
-- (deity/companion/mount flavor) — currently dropped on save — now has a
-- home here.
--
-- Idempotent (CREATE/ADD COLUMN IF NOT EXISTS) — safe whether or not the
-- column already exists (e.g. if the earlier v2 migration was applied to a
-- live DB while its code stayed unmerged). Apply via the Supabase SQL
-- editor.

-- The blob that holds all creator-only flexible fields (baseAttributes,
-- asiSelections, multiclassSkills, equipment_choices, used_starting_gold,
-- allies, and any future ones). camelCase keys live inside the jsonb;
-- no column quoting concerns.
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS creator_data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- `companions` is cross-system (read by the character sheet, library,
-- campaign companions, GM approval) so it stays a real top-level column,
-- not in the blob. It's emitted by the save builder but has no checked-in
-- migration — this homes it for fresh environments (no-op where it already
-- exists on a live DB).
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS companions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- NOTE: the v1 per-field columns (base_attributes / asi_selections /
-- multiclass_skills / equipment_choices / used_starting_gold) are
-- intentionally LEFT IN PLACE this pass — the reload path still reads them
-- as a fallback for any character saved under v1. A later cleanup
-- migration can drop them once confirmed unused.

-- RLS: creator_data / companions are same-row data on `characters`; the
-- existing characters row-level policies (users_manage_own_characters,
-- campaign-member SELECT) already cover every column on the row, so no new
-- policy is required. (Verify in the dashboard that RLS is enabled on
-- characters — it is for the existing columns this rides alongside.)

-- PostgREST caches the schema; reload so the new columns are writable.
NOTIFY pgrst, 'reload schema';
