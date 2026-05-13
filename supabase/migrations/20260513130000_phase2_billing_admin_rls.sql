-- ============================================================================
-- Phase 2 RLS Migration: Billing, Admin, Social Lockdown
-- ============================================================================
--
-- Tables affected:
--   subscriptions       — user-scoped billing data (Stripe-managed)
--   analytics_events    — telemetry (write-only from client)
--   admin_actions       — admin moderation audit log
--   friends             — social graph
--
-- IMPORTANT — RUN STEP 0 FIRST to verify the `friends` table schema.
-- The friends section assumes the column for the "other side" of a
-- friendship is `friend_id`. If your schema uses a different name
-- (e.g. `target_user_id`, `friend_user_id`), update the friends
-- section before applying.
--
-- Full rollback at the bottom of this file.
-- ============================================================================

-- ============================================================================
-- STEP 0 — Schema verification (RUN THIS FIRST, separately)
-- ============================================================================
-- Run this on its own. Confirm the friends table has a second user
-- column. Adjust the friends policies below if the column name differs.
--
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'friends'
--   ORDER BY ordinal_position;
--
-- If the column is not called `friend_id`, find-and-replace `friend_id`
-- in this file's Section 4 before running.
-- ============================================================================

-- ============================================================================
-- SECTION 1 — subscriptions (billing)
-- ============================================================================
-- Pattern: users read their own row. Writes only via service_role
-- (Stripe webhooks). Client should NEVER insert/update subscriptions
-- directly — if any client code does, it will start failing after
-- this migration.

CREATE POLICY "users_read_own_subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role bypasses RLS automatically, but adding an explicit
-- policy makes the intent visible to anyone reading the schema.
CREATE POLICY "service_role_manages_subscriptions" ON public.subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 2 — analytics_events (telemetry)
-- ============================================================================
-- Pattern: authenticated users can INSERT their own events. No client
-- reads — analytics queries happen server-side with service_role.
-- If anon page-view events are needed, add an anon insert policy.

CREATE POLICY "users_insert_own_events" ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- No SELECT policy = no client reads. Service role queries bypass RLS.

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3 — admin_actions (audit log)
-- ============================================================================
-- Pattern: only users listed in admin_users table can read or write.
-- Mirrors the existing admin_users_admin_only policy structure.

CREATE POLICY "admins_manage_admin_actions" ON public.admin_actions
  FOR ALL TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 4 — friends (social graph)
-- ============================================================================
-- Pattern: users see and manage rows where they are EITHER side of
-- the relationship. Assumes a `friend_id` column for the target user.
-- VERIFY THIS COLUMN NAME via Step 0 before running this section.

CREATE POLICY "users_read_own_friend_rows" ON public.friends
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR friend_id = auth.uid()
  );

CREATE POLICY "users_insert_own_friend_rows" ON public.friends
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_delete_own_friend_rows" ON public.friends
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR friend_id = auth.uid()
  );

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION — run after the four ALTER TABLEs above
-- ============================================================================
-- Expected: all four show rls_enabled = true

SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('subscriptions', 'analytics_events', 'admin_actions', 'friends')
ORDER BY c.relname;

-- ============================================================================
-- ROLLBACK (per table — paste the line for whichever broke)
-- ============================================================================
-- ALTER TABLE public.subscriptions     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.analytics_events  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.admin_actions     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.friends           DISABLE ROW LEVEL SECURITY;
--
-- To also drop the policies created above, prefix each with:
--   DROP POLICY "<policy_name>" ON public.<table>;
