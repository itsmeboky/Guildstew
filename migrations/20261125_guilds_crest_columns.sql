-- 20261125_guilds_crest_columns.sql
-- Crest builder storage on the subscription-tier `guilds` row.
--
-- Mirrors the same column shape we added to `guild_halls` in
-- 20261124, but on the `guilds` table that the Guild Hall page
-- (and AppSidebar / member cards / profile) actually reads from.
-- Keeping the names identical so any helper that takes a row from
-- either table can read crest_data + crest_image_url the same way.
--
-- The previous `crest_url` / `crest` columns added in 20261123 stay
-- in place for backwards compatibility — the Hall reads
-- `crest_image_url ?? crest_url` so older rows render without a
-- backfill step.

ALTER TABLE guilds
  ADD COLUMN IF NOT EXISTS crest_data      JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS crest_image_url TEXT;
