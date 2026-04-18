-- World Lore v1 visibility system + character active title
--
-- Idempotent. Run via the Supabase SQL editor.

ALTER TABLE world_lore_entries
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE world_lore_entries
  ADD COLUMN IF NOT EXISTS visible_to_players JSONB DEFAULT '[]'::jsonb;
ALTER TABLE world_lore_entries
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE world_lore_rumors
  ADD COLUMN IF NOT EXISTS mole_accessible BOOLEAN DEFAULT FALSE;
ALTER TABLE world_lore_rumors
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unverified';
ALTER TABLE world_lore_rumors
  ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE world_lore_rumors
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS active_title TEXT;
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS earned_titles JSONB DEFAULT '[]'::jsonb;
