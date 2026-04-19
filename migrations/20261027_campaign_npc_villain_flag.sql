-- Villain flag on NPC library entries (Tier 3 §B5 — NPC library side)
-- Mirrors the characters.is_villain / villain_data columns added in
-- 20261026. The NPC library (campaign_npcs) is the primary store for
-- per-campaign NPCs, so its rows need the same villain plumbing to
-- show the toggle + persist the JSONB.

ALTER TABLE campaign_npcs
  ADD COLUMN IF NOT EXISTS is_villain BOOLEAN DEFAULT false;

ALTER TABLE campaign_npcs
  ADD COLUMN IF NOT EXISTS villain_data JSONB DEFAULT '{}'::jsonb;
