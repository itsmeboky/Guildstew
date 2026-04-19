-- Villain flag on NPC characters (Tier 3 §B5)
-- An NPC built on a character sheet can be promoted to a villain — it
-- then unlocks the same boss-fight systems (villain actions, legendary
-- resistances, phases, auras) that monster stat blocks use. Villain-
-- specific JSONB data lives in `villain_data` so the characters table
-- stays clean instead of sprouting ten narrow columns.

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS is_villain BOOLEAN DEFAULT false;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS villain_data JSONB DEFAULT '{}'::jsonb;
