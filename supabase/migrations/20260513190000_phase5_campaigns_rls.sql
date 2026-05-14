-- ============================================================================
-- Phase 5 RLS Migration: campaigns table
-- ============================================================================
--
-- The central hub. Enabling RLS here causes EVERY existing campaign-scoped
-- policy's subquery (SELECT id FROM campaigns WHERE ...) to start running
-- through RLS. If this policy is wrong, the entire campaign UI breaks.
--
-- Four policies:
--   1. members_read_campaigns   — GM + listed players can SELECT
--   2. gm_manage_campaigns      — GM has full control over own campaigns
--   3. admins_manage_campaigns  — platform admins can do anything
--   4. users_create_own_campaigns — authenticated users can create new
--                                    campaigns with themselves as GM
--
-- No subqueries into other tables — just direct column checks against
-- the campaigns row. No recursion risk.
--
-- Wrapped in BEGIN/COMMIT — atomic.
-- ============================================================================

BEGIN;


-- ----------------------------------------------------------------------------
-- 1. members_read_campaigns
-- ----------------------------------------------------------------------------
-- GM AND listed players can SELECT a campaign row. This is the policy that
-- determines whether subqueries from other tables (world_lore_entries,
-- characters, campaign_conditions, etc.) return the campaign ID.
--
-- Format match: existing policies use `player_ids @> to_jsonb(auth.uid()::text)`.
-- We use the same pattern. The IS NOT NULL guard protects against jsonb
-- containment on null columns.

CREATE POLICY "members_read_campaigns" ON public.campaigns
  FOR SELECT TO authenticated
  USING (
    game_master_id = auth.uid()
    OR (
      player_ids IS NOT NULL
      AND player_ids @> to_jsonb(auth.uid()::text)
    )
  );


-- ----------------------------------------------------------------------------
-- 2. gm_manage_campaigns
-- ----------------------------------------------------------------------------
-- GM has full CRUD on their own campaigns. Note WITH CHECK enforces that
-- game_master_id stays as auth.uid() — a GM cannot transfer ownership of
-- their campaign by updating game_master_id to another user (and then losing
-- access through this same policy).

CREATE POLICY "gm_manage_campaigns" ON public.campaigns
  FOR ALL TO authenticated
  USING (game_master_id = auth.uid())
  WITH CHECK (game_master_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 3. admins_manage_campaigns
-- ----------------------------------------------------------------------------
-- Platform admins (via is_admin()) can do anything to any campaign.
-- Needed for moderation, support, and admin tooling.

CREATE POLICY "admins_manage_campaigns" ON public.campaigns
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- 4. users_create_own_campaigns
-- ----------------------------------------------------------------------------
-- Any authenticated user can create a new campaign, but only with
-- themselves as GM. The gm_manage_campaigns policy already covers ongoing
-- management, but INSERT needs its own explicit policy because the row
-- doesn't yet exist for the USING check.

CREATE POLICY "users_create_own_campaigns" ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK (game_master_id = auth.uid());


-- ----------------------------------------------------------------------------
-- ENABLE RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;


COMMIT;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Should return rls_enabled = true
SELECT c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'campaigns';

-- Should show exactly 4 policies
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'campaigns'
ORDER BY policyname;


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- If anything breaks, this restores immediate access:
--
--   ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;
--
-- The four new policies stay defined but dormant. Phase 1-3 RLS on other
-- tables continues to work because their subqueries into campaigns will
-- once again bypass RLS.
-- ============================================================================
