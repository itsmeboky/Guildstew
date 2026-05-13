-- ============================================================================
-- Rewrite is_admin() to Match Real Admin System (Email Domain)
-- + Migrate blog_posts and version_history admin policies
-- ============================================================================
--
-- Why this exists:
--   Diagnostic confirmed admin_users is empty (0 rows). The platform's
--   actual admin system identifies admins by email domain via JWT.
--   This pattern appears in existing policies on:
--     - community_events.admins_manage_events
--     - game_packs.admins_manage_game_packs
--     - homepage_banners.admins_manage_banners
--     - site_config.admins_manage_site_config
--
--   is_admin() needs to match that pattern, otherwise it returns false
--   for everyone (including platform owner) and locks admin tooling out
--   of every table that uses is_admin() in its policies.
--
-- Admin domains:
--     itsmeboky@aetherianstudios.com  (explicit)
--     %@aetherianstudios.com           (team)
--     %@guildstew.com                  (team)
--
-- admin_users membership is kept as an OR fallback — the table is still
-- usable for granting admin status to someone without a team email
-- (community moderators, contractors, etc.).
--
-- Wrapped in BEGIN/COMMIT — atomic.
-- ============================================================================

BEGIN;


-- ----------------------------------------------------------------------------
-- 1. Rewrite is_admin() with email-domain + admin_users fallback
-- ----------------------------------------------------------------------------
-- SET search_path = '' for safety. All references are fully qualified.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT
    -- Team admin via email domain
    (
      lower((auth.jwt() ->> 'email')) = 'itsmeboky@aetherianstudios.com'
      OR lower((auth.jwt() ->> 'email')) LIKE '%@aetherianstudios.com'
      OR lower((auth.jwt() ->> 'email')) LIKE '%@guildstew.com'
    )
    -- OR explicitly granted via admin_users (for non-team admins)
    OR EXISTS (
      SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;


-- ----------------------------------------------------------------------------
-- 2. blog_posts.admins_manage_posts → is_admin()
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS admins_manage_posts ON public.blog_posts;

CREATE POLICY admins_manage_posts ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- 3. version_history.admins_manage_versions → is_admin()
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS admins_manage_versions ON public.version_history;

CREATE POLICY admins_manage_versions ON public.version_history
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


COMMIT;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Should now return true for any team email account
SELECT public.is_admin() AS am_i_admin;

-- Confirm policies updated
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('blog_posts', 'version_history')
ORDER BY tablename, policyname;

-- Confirm the JWT email is what we expect
SELECT
  auth.uid() AS user_id,
  auth.jwt() ->> 'email' AS jwt_email,
  public.is_admin() AS is_admin_result;


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- If is_admin() needs to revert to admin_users-only behavior:
--
--   CREATE OR REPLACE FUNCTION public.is_admin()
--   RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE
--   AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()); $$;
--
-- If blog_posts / version_history need to revert to the role='admin' pattern,
-- use the rollback block from migration 20260513170000.
-- ============================================================================
