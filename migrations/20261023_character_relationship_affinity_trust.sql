-- Affinity / trust meters on directional character relationships.
--
-- The Adventuring Party Relationships tab shows each pair as two
-- 0..100 progress bars plus a type + description. Adding the two
-- integer columns here so the upsert from the UI has somewhere to
-- write. Existing rows default to 50 (neutral).
--
-- Idempotent. Run via the Supabase SQL editor.

ALTER TABLE character_relationships
  ADD COLUMN IF NOT EXISTS affinity INTEGER DEFAULT 50;
ALTER TABLE character_relationships
  ADD COLUMN IF NOT EXISTS trust    INTEGER DEFAULT 50;
