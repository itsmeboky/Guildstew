-- Secret villain + plant clone columns on the NPC library.
-- The NPC library (campaign_npcs) is the primary store for per-
-- campaign NPCs, including plant NPCs cloned from mole player
-- characters. villain_secret hides villain status from players;
-- is_plant + source_character_id link the clone back to the mole's
-- live character so "Sync from Player" can pull updated stats.

ALTER TABLE campaign_npcs
  ADD COLUMN IF NOT EXISTS villain_secret BOOLEAN DEFAULT false;

ALTER TABLE campaign_npcs
  ADD COLUMN IF NOT EXISTS is_plant BOOLEAN DEFAULT false;

ALTER TABLE campaign_npcs
  ADD COLUMN IF NOT EXISTS source_character_id UUID REFERENCES characters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_npcs_source_character
  ON campaign_npcs(source_character_id);
