-- Active-session lifecycle columns.
--
-- `session_active`          — whether the GM has the panel open and
--                             the party is locked into the session.
-- `session_started_at`      — when the GM flipped it on. Resets
--                             when the session ends.
-- `active_session_players`  — snapshot of player_ids at start-time
--                             so late-arrival / mid-session roster
--                             changes can still resolve "who's in".
-- `disconnected_players`    — subset of active_session_players the
--                             GM is currently controlling (via the
--                             presence channel's `leave` event or an
--                             explicit Leave Session click).
--
-- `characters.active_session_id` — campaign id the character is
--                             currently locked into. Prevents the
--                             same user from joining two sessions
--                             at once.
--
-- Idempotent. Run via the Supabase SQL editor.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS session_active BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ;
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS active_session_players JSONB DEFAULT '[]'::jsonb;
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS disconnected_players JSONB DEFAULT '[]'::jsonb;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS active_session_id TEXT;
