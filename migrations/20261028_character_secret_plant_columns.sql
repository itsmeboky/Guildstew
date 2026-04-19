-- Secret villain + mole-to-plant pipeline columns (Part 5)
-- Mirrors the same columns on campaign_npcs (next migration) because
-- the NPC library is where most villain data actually lands; the
-- `characters` columns are for PCs promoted to villain via the
-- character library (Tier 3 §B5).

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS villain_secret BOOLEAN DEFAULT false;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS is_plant BOOLEAN DEFAULT false;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS source_character_id UUID REFERENCES characters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_characters_source_character
  ON characters(source_character_id);
