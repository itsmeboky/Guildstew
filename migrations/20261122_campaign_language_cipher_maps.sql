-- Per-campaign language cipher mappings
--
-- Each campaign carries its own random symbol→meaning mapping for
-- both Thieves' Cant and Druidic. Same symbol shape across campaigns,
-- different meaning per campaign — so a "danger-path" rune in
-- Campaign A might mean "Storm Coming" while in Campaign B it means
-- "Hostile Settlement". GMs always see the mapping; class-eligible
-- players reach it via their cypher inventory items (a separate
-- commit). The shape data itself is stable and lives in code
-- (src/config/druidicShapes.js + the static Cant SVGs).
--
-- Schema:
--   {
--     "thieves_cant": { "<symbol_id>": "<meaning_label>", ... },
--     "druidic":      { "<symbol_id>": "<meaning_label>", ... }
--   }
--
-- Defaults to '{}'. Empty maps are populated lazily the first time
-- the GM opens world lore on the campaign — no backfill migration.
--
-- Apply via the Supabase SQL editor or `psql`. Idempotent —
-- re-running is safe.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS language_cipher_maps JSONB DEFAULT '{}'::jsonb;
