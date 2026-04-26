-- 20261124_guild_hall_crest.sql
-- Crest builder storage on the guild_halls row.
--
-- The crest builder lives on the campaign-scoped `guild_halls` table
-- (one row per campaign) so each adventuring party can design their
-- own heraldic device. `crest_data` holds the JSON layer stack the
-- builder produces (shield shape + colors + patterns + emblems +
-- text + transforms); `crest_image_url` caches a flattened render
-- so the Guild Hall + dashboards can display the crest without the
-- canvas pipeline rehydrating every component layer.
--
-- Storage paths (no SQL needed — buckets already exist):
--   user-assets/guilds/{guild_id}/        — flattened crest renders
--   app-assets/guild/guildcrest/          — official emblem catalog

ALTER TABLE guild_halls
  ADD COLUMN IF NOT EXISTS crest_data      JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS crest_image_url TEXT;
