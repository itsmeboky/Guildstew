-- Content pack provenance tag — canonical column name.
--
-- Earlier migration (20261103_brewery_content_pack_tag.sql) added a
-- brewery_pack_mod_id column on the four campaign content tables.
-- The spec settled on `source_mod_id` as the canonical name so the
-- same provenance stamp can be reused by future mod types that
-- want to write into the same tables. Both columns coexist; the
-- install/uninstall code writes + reads source_mod_id going
-- forward and the old column is dead.
ALTER TABLE monsters
  ADD COLUMN IF NOT EXISTS source_mod_id UUID;
ALTER TABLE campaign_items
  ADD COLUMN IF NOT EXISTS source_mod_id UUID;
ALTER TABLE spells
  ADD COLUMN IF NOT EXISTS source_mod_id UUID;
ALTER TABLE campaign_class_features
  ADD COLUMN IF NOT EXISTS source_mod_id UUID;

CREATE INDEX IF NOT EXISTS idx_monsters_source_mod_id
  ON monsters (source_mod_id);
CREATE INDEX IF NOT EXISTS idx_campaign_items_source_mod_id
  ON campaign_items (source_mod_id);
CREATE INDEX IF NOT EXISTS idx_spells_source_mod_id
  ON spells (source_mod_id);
CREATE INDEX IF NOT EXISTS idx_campaign_class_features_source_mod_id
  ON campaign_class_features (source_mod_id);
