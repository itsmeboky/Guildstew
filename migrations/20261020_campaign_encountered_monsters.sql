-- Pokédex-style monster encounter tracking on campaigns.
--
-- Every monster ID added to the combat queue (or manually flagged by
-- the GM) gets pushed into this array. The Monster Compendium reads
-- it to decide whether to reveal a full stat block or show the
-- greyed-out "???" silhouette card for players.
--
-- Idempotent. Run via the Supabase SQL editor.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS encountered_monsters JSONB DEFAULT '[]'::jsonb;
