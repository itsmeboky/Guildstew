-- 20261123_guilds_table.sql
-- Guild identity + leader-only settings that previously had no home.
--
-- The app already treats the Guild-tier subscriber's `user_id` as the
-- guild's primary key (see `subscriptions.guild_owner_id`), and the
-- shared wallet row (`guild_spice_wallets.guild_id`) reuses that same
-- id. What's been missing is a table holding the guild-level fields
-- that the Hall page exposes: name, crest, founded-on date, officer
-- roster, invite code, and a spending-restriction flag that mirrors
-- the wallet's own flag for easy reads.
--
-- Rows are created lazily by the app the first time the leader saves
-- any guild setting — no backfill needed. `owner_user_id` doubles as
-- the primary key so it joins cleanly to subscriptions + the wallet.

CREATE TABLE IF NOT EXISTS guilds (
  owner_user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT,
  crest_url           TEXT,
  crest               JSONB DEFAULT '{}'::jsonb,
  founded_at          TIMESTAMPTZ DEFAULT now(),
  invite_code         TEXT UNIQUE,
  spending_restricted BOOLEAN DEFAULT FALSE,
  officer_ids         UUID[] DEFAULT ARRAY[]::UUID[],
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guilds_invite_code ON guilds(invite_code);

ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;

-- Members of the guild (including the owner) can read the row.
DROP POLICY IF EXISTS "guild_members_read_guild" ON guilds;
CREATE POLICY "guild_members_read_guild" ON guilds
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.guild_owner_id = guilds.owner_user_id
    )
  );

-- Only the guild owner can mutate settings.
DROP POLICY IF EXISTS "guild_owner_write_guild" ON guilds;
CREATE POLICY "guild_owner_write_guild" ON guilds
  FOR ALL USING (owner_user_id = auth.uid())
         WITH CHECK (owner_user_id = auth.uid());
