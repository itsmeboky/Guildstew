-- ============================================================================
-- Add campaign_id indexes on campaign-scoped tables
-- ============================================================================
--
-- The campaign UI filters these tables by campaign_id constantly (61 client
-- callsites across the app), but only campaign_applications and campaign_bans
-- had a campaign_id index. Every other campaign-scoped read was a sequential
-- scan. This adds a plain btree index on campaign_id for each table below.
--
-- NOTE FOR THE OPERATOR (Boky):
--   * These use CREATE INDEX IF NOT EXISTS. That guard only skips an index
--     with the SAME name (idx_<table>_campaign_id). If the original base44
--     import already created a campaign_id index under a DIFFERENT name on any
--     of these tables, this would create a redundant duplicate. Before running,
--     check existing indexes, e.g.:
--         SELECT tablename, indexname, indexdef
--         FROM pg_indexes
--         WHERE schemaname = 'public'
--           AND indexdef ILIKE '%campaign_id%'
--         ORDER BY tablename;
--     Drop any redundant duplicates afterward if found.
--
--   * Tables are small in alpha, so plain CREATE INDEX (brief lock) is fine.
--     If any of these is already large in prod, swap the relevant statement to
--     CREATE INDEX CONCURRENTLY IF NOT EXISTS ... and run it OUTSIDE a
--     transaction (CONCURRENTLY cannot run inside BEGIN/COMMIT).
--
-- Run manually in the Supabase SQL editor. Not auto-applied.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_monsters_campaign_id
  ON public.monsters (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_npcs_campaign_id
  ON public.campaign_npcs (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_maps_campaign_id
  ON public.campaign_maps (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_log_entries_campaign_id
  ON public.campaign_log_entries (campaign_id);

CREATE INDEX IF NOT EXISTS idx_world_lore_entries_campaign_id
  ON public.world_lore_entries (campaign_id);

CREATE INDEX IF NOT EXISTS idx_regions_campaign_id
  ON public.regions (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_homebrew_campaign_id
  ON public.campaign_homebrew (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_updates_campaign_id
  ON public.campaign_updates (campaign_id);

CREATE INDEX IF NOT EXISTS idx_map_entries_campaign_id
  ON public.map_entries (campaign_id);

CREATE INDEX IF NOT EXISTS idx_trade_offers_campaign_id
  ON public.trade_offers (campaign_id);

CREATE INDEX IF NOT EXISTS idx_guild_halls_campaign_id
  ON public.guild_halls (campaign_id);
