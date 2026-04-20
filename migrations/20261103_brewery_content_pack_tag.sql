-- Brewery content pack provenance tag.
--
-- Content packs (brewery_mods.mod_type = 'content_pack') ship a
-- bundle of pre-made monsters / items / spells / class features.
-- On install, each entry is copied into the corresponding
-- campaign-scoped table and stamped with the pack's mod id so the
-- uninstall path can bulk-remove just the pack's contributions
-- without touching the GM's own homebrew.
ALTER TABLE monsters
  ADD COLUMN IF NOT EXISTS brewery_pack_mod_id UUID;
ALTER TABLE campaign_items
  ADD COLUMN IF NOT EXISTS brewery_pack_mod_id UUID;
ALTER TABLE spells
  ADD COLUMN IF NOT EXISTS brewery_pack_mod_id UUID;
ALTER TABLE campaign_class_features
  ADD COLUMN IF NOT EXISTS brewery_pack_mod_id UUID;

CREATE INDEX IF NOT EXISTS idx_monsters_brewery_pack_mod_id
  ON monsters (brewery_pack_mod_id);
CREATE INDEX IF NOT EXISTS idx_campaign_items_brewery_pack_mod_id
  ON campaign_items (brewery_pack_mod_id);
CREATE INDEX IF NOT EXISTS idx_spells_brewery_pack_mod_id
  ON spells (brewery_pack_mod_id);
CREATE INDEX IF NOT EXISTS idx_campaign_class_features_brewery_pack_mod_id
  ON campaign_class_features (brewery_pack_mod_id);
