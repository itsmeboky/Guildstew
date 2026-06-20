-- ═════════════════════════════════════════════════════════════
--   Guildstew — explicit GM INSERT policy on `deities`
--
--   The deity accept flow materializes a player-submitted deity at
--   accept time (campaignApplications.materializeJoinBonds), inserting
--   as the GM with the PLAYER's submitted_by/created_by. This makes the
--   GM's authority to insert player-submitted campaign content explicit,
--   via is_campaign_gm() (added in 20271220), mirroring the characters
--   GM INSERT fix.
--
--   NOTE: the existing `deities_gm_write` policy (20271218) is FOR ALL
--   with WITH CHECK (is_admin() OR campaign.game_master_id = auth.uid()),
--   which ALREADY permits this INSERT — so this is an explicit,
--   redundant guard, not a behavior change. (The reason player deities
--   weren't surfacing was the approval UI being mounted in the wrong
--   panel + a swallowed materialize error, both fixed in the same change
--   as this migration — not an RLS denial.)
--
--   Idempotent. Apply via the Supabase SQL editor before deploy.
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.deities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deities_gm_insert" ON public.deities;
CREATE POLICY "deities_gm_insert" ON public.deities
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (deities.campaign_id IS NOT NULL AND public.is_campaign_gm(deities.campaign_id))
  );

NOTIFY pgrst, 'reload schema';
