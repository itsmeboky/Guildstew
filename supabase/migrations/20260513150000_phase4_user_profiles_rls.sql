-- ============================================================================
-- Phase 4 RLS Migration: user_profiles Rewrite
-- ============================================================================
--
-- 22 rows. Most-touched table in the app. This migration:
--   1. DROPs the two existing permit-all policies
--   2. CREATEs five real policies (anon read, own insert/update/delete,
--      admin manage)
--   3. ENABLEs RLS
--
-- Wrapped in BEGIN/COMMIT — if any statement fails, nothing is applied.
--
-- Why anon can still read profiles:
--   Forums (anyone_read_threads) and blog posts (anyone_read_published_posts)
--   display author names + avatars to logged-out visitors. Anon profile
--   reads are required to keep those public pages working.
--
-- Rollback at the bottom.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- DROP the garbage
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all access to user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON public.user_profiles;

-- ----------------------------------------------------------------------------
-- CREATE the real policies
-- ----------------------------------------------------------------------------

-- READ: anyone (authenticated or anon) can read profiles.
-- Required for public forum/blog author displays and any cross-user UI.
CREATE POLICY "anyone_reads_profiles" ON public.user_profiles
  FOR SELECT
  USING (true);

-- INSERT: users create their own profile row (signup flow).
CREATE POLICY "users_insert_own_profile" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: users update their own profile (Settings, TOS reconsent).
-- Note: the LegalReconsentGate filters by `id` (profile_id) in its WHERE,
-- but the policy USING checks `user_id`. That's fine — the policy still
-- enforces ownership at the row level regardless of which column the
-- client filters on.
CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: users delete their own profile (account deletion).
CREATE POLICY "users_delete_own_profile" ON public.user_profiles
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ADMIN: users in admin_users table can do anything.
-- Cross-reference admin_users (which has its own self-referential RLS).
CREATE POLICY "admins_manage_profiles" ON public.user_profiles
  FOR ALL TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- ----------------------------------------------------------------------------
-- ENABLE RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- VERIFICATION — run after the transaction commits
-- ============================================================================

-- Should return rls_enabled = true
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'user_profiles';

-- Should return exactly 5 policies, no permit-all ones
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles'
ORDER BY policyname;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- If something breaks and you need to revert immediately:
--
--   BEGIN;
--     ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
--     DROP POLICY IF EXISTS "anyone_reads_profiles"     ON public.user_profiles;
--     DROP POLICY IF EXISTS "users_insert_own_profile"  ON public.user_profiles;
--     DROP POLICY IF EXISTS "users_update_own_profile"  ON public.user_profiles;
--     DROP POLICY IF EXISTS "users_delete_own_profile"  ON public.user_profiles;
--     DROP POLICY IF EXISTS "admins_manage_profiles"    ON public.user_profiles;
--
--     -- Restore the original (broken) policies if you really need to:
--     CREATE POLICY "Allow all access to user_profiles" ON public.user_profiles
--       FOR ALL USING (true) WITH CHECK (true);
--     CREATE POLICY "Authenticated users can view public profiles" ON public.user_profiles
--       FOR SELECT TO authenticated USING (true);
--   COMMIT;
--
-- Or the nuclear option (just turn RLS off, leave policies dormant):
--
--   ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
-- ============================================================================
