-- Guild Hall opt-in flag.
--
-- Campaign Settings → House Rules now exposes a "Guild Hall &
-- Training" toggle. When off, the Guild Hall category is hidden
-- from World Lore. Existing campaigns keep the tab because the
-- default is true; the client also treats missing/undefined as
-- enabled so a deploy that races the migration doesn't hide the
-- panel for anyone.
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS guild_hall_enabled BOOLEAN NOT NULL DEFAULT TRUE;
