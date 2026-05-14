-- ============================================================================
-- Realtime fix: REPLICA IDENTITY FULL on campaigns
-- ============================================================================
--
-- After Phase 5 enabled RLS on public.campaigns, Realtime postgres_changes
-- UPDATE events stopped reaching subscribed players. Symptom: GM clicks
-- "Roll for Initiative" (which writes combat_data.initiative_call onto the
-- campaign row) and player browsers never see the prompt — even though
-- their RLS policy clearly allows them to SELECT the row.
--
-- Root cause: Realtime evaluates RLS per-subscriber on the WAL payload.
-- With the default REPLICA IDENTITY (primary key only), the WAL UPDATE
-- record only carries the row's id — not game_master_id or player_ids.
-- The SELECT policy (members_read_campaigns) needs those columns to
-- decide whether to deliver the event, can't find them, and silently
-- drops the change.
--
-- REPLICA IDENTITY FULL writes every column on UPDATE so the policy has
-- the data it needs. Cost: slightly larger WAL records on UPDATE; for a
-- table with ~14 rows updated a few times per session this is negligible.
--
-- The single Realtime subscription on campaigns lives at
-- src/lib/useCampaignRealtime.js — it's the carrier for live campaign
-- state (combat_data, initiative_call, dice rolls, etc.).
-- ============================================================================

BEGIN;

ALTER TABLE public.campaigns REPLICA IDENTITY FULL;

COMMIT;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Should show 'full (all columns)' for campaigns
SELECT relname,
  CASE relreplident
    WHEN 'd' THEN 'default (primary key only)'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full (all columns)'
    WHEN 'i' THEN 'index'
  END AS replica_identity
FROM pg_class
WHERE relname = 'campaigns'
  AND relkind = 'r';

-- Confirm campaigns is in the Realtime publication. If this returns
-- zero rows, postgres_changes won't fire at all and the fix below
-- needs to run too:
--
--   ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
--
-- (If it's already there, the ADD TABLE will error harmlessly.)
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'campaigns';


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- ALTER TABLE public.campaigns REPLICA IDENTITY DEFAULT;
--
-- Reverting will reintroduce the silent-drop bug while RLS stays on,
-- so only roll back if also reverting Phase 5.
-- ============================================================================
