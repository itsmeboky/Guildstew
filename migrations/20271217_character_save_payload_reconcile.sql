-- Character save payload reconciliation v2 (supersedes the field-by-field
-- approach in 20271216_character_creator_choice_columns.sql).
--
-- The earlier fix added one column per new creator field. Live testing
-- proved that's whack-a-mole: PostgREST reports one unknown key per write,
-- so each column just unblocked the next failure (asiSelections →
-- companions, on a Bard that has no companions — i.e. it's the payload
-- SHAPE, not the data). This reconciles the whole payload in one pass.
--
-- The `characters` table stores character data as flat columns with no
-- character-data jsonb blob. Two kinds of new field:
--
--   1. Cross-system fields read OUTSIDE the creator (the character sheet,
--      character library, campaign companions, GM approval). These must be
--      real top-level columns. `companions` is the one in the payload.
--
--   2. Creator-only fields with NO external reader (verified): the ASI /
--      multiclass audit trail and the equipment-selector UI state. Rather
--      than a column each — which breaks the next save the moment a new
--      creator field appears (bonds, deities, …) — these now nest in a
--      single `creator_data` jsonb blob. Future creator-only fields go
--      there too: no migration, no save breakage.
--
-- The five columns added by 20271216 (base_attributes / asi_selections /
-- multiclass_skills / equipment_choices / used_starting_gold) are
-- SUPERSEDED — buildStatsFromCharacterData now writes those values inside
-- creator_data instead. They're left in place (harmless, empty); they can
-- be dropped in a later cleanup. No data is lost because no save had
-- succeeded with them populated.

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS creator_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS companions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- PostgREST caches the schema; reload so the new columns are writable
-- immediately. (Supabase dashboard migrations reload automatically; this
-- covers the raw-SQL path.)
NOTIFY pgrst, 'reload schema';
