-- Enforce the 8-player + 1-GM cap at the database layer so any write
-- that slips past the UI is still rejected. The previous default and
-- any out-of-range rows get clamped before the CHECK goes on to avoid
-- failing the ALTER on historical data.
--
-- Idempotent. Run via the Supabase SQL editor.

-- Clamp existing rows into the new range so the CHECK doesn't fail
-- when applied to historical campaigns.
UPDATE campaigns SET max_players = 8 WHERE max_players > 8;
UPDATE campaigns SET max_players = 2 WHERE max_players IS NOT NULL AND max_players < 2;

-- Default new rows to 6 going forward.
ALTER TABLE campaigns ALTER COLUMN max_players SET DEFAULT 6;

-- Add the 2..8 cap. DROP first so rerunning the migration replaces
-- the constraint cleanly.
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS max_players_cap;
ALTER TABLE campaigns
  ADD CONSTRAINT max_players_cap CHECK (max_players >= 2 AND max_players <= 8);
