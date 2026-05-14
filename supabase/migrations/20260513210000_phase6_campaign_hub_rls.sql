-- ============================================================================
-- Phase 6 RLS Migration: Campaign Hub Tables
-- ============================================================================
--
-- Six tables joining through campaigns:
--   campaign_invitations      — GM manages, invitee reads/responds
--   campaign_log_entries      — members read, author manages own, GM all
--   campaign_updates          — same pattern as log entries
--   campaign_update_comments  — joins thru campaign_updates (2-level chain)
--   campaign_update_reads     — per-user read receipts
--   campaign_archives         — GM-only manages, members read
--
-- All policies leverage the campaigns RLS established in Phase 5.
-- The campaigns SELECT policy filters subqueries to only campaigns
-- the calling user can see (GM or listed player).
--
-- Wrapped in BEGIN/COMMIT — atomic.
-- ============================================================================

BEGIN;


-- ============================================================================
-- SECTION 1 — campaign_invitations
-- ============================================================================
-- VERIFY: invitee column name (assumed invited_user_id below). If your
-- schema uses a different name, find-and-replace in this section before
-- running.

-- GM manages all invitations for their campaigns
CREATE POLICY "gm_manage_invitations" ON public.campaign_invitations
  FOR ALL TO authenticated
  USING (
    campaign_id IN (SELECT id FROM public.campaigns WHERE game_master_id = auth.uid())
  )
  WITH CHECK (
    campaign_id IN (SELECT id FROM public.campaigns WHERE game_master_id = auth.uid())
  );

-- Invitee reads own pending invitations
CREATE POLICY "invitee_reads_own_invitations" ON public.campaign_invitations
  FOR SELECT TO authenticated
  USING (invited_user_id = auth.uid());

-- Invitee updates (accept/decline) their own invitations
CREATE POLICY "invitee_responds_to_invitations" ON public.campaign_invitations
  FOR UPDATE TO authenticated
  USING (invited_user_id = auth.uid())
  WITH CHECK (invited_user_id = auth.uid());

-- Admin override for moderation
CREATE POLICY "admins_manage_invitations" ON public.campaign_invitations
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.campaign_invitations ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SECTION 2 — campaign_log_entries (THE BIG ONE — 782 rows)
-- ============================================================================
-- Chronicle entries, combat logs, session notes. Highest data volume
-- in this phase. Members read all entries in their campaigns; authors
-- manage their own entries; GMs have full control.

-- Members can read all log entries in their campaigns
CREATE POLICY "members_read_log_entries" ON public.campaign_log_entries
  FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns
      WHERE game_master_id = auth.uid()
         OR (player_ids IS NOT NULL AND player_ids @> to_jsonb(auth.uid()::text))
    )
  );

-- Authors manage their own entries (must be in the campaign to write)
CREATE POLICY "authors_manage_own_log_entries" ON public.campaign_log_entries
  FOR ALL TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (
    author_id = auth.uid()
    AND campaign_id IN (
      SELECT id FROM public.campaigns
      WHERE game_master_id = auth.uid()
         OR (player_ids IS NOT NULL AND player_ids @> to_jsonb(auth.uid()::text))
    )
  );

-- GM has full control
CREATE POLICY "gm_manage_log_entries" ON public.campaign_log_entries
  FOR ALL TO authenticated
  USING (
    campaign_id IN (SELECT id FROM public.campaigns WHERE game_master_id = auth.uid())
  )
  WITH CHECK (
    campaign_id IN (SELECT id FROM public.campaigns WHERE game_master_id = auth.uid())
  );

-- Admin override for moderation
CREATE POLICY "admins_manage_log_entries" ON public.campaign_log_entries
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.campaign_log_entries ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SECTION 3 — campaign_updates
-- ============================================================================
-- Status updates, session announcements, recaps posted to the campaign
-- feed. Same pattern as log_entries.

CREATE POLICY "members_read_updates" ON public.campaign_updates
  FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns
      WHERE game_master_id = auth.uid()
         OR (player_ids IS NOT NULL AND player_ids @> to_jsonb(auth.uid()::text))
    )
  );

CREATE POLICY "authors_manage_own_updates" ON public.campaign_updates
  FOR ALL TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (
    author_id = auth.uid()
    AND campaign_id IN (
      SELECT id FROM public.campaigns
      WHERE game_master_id = auth.uid()
         OR (player_ids IS NOT NULL AND player_ids @> to_jsonb(auth.uid()::text))
    )
  );

CREATE POLICY "gm_manage_updates" ON public.campaign_updates
  FOR ALL TO authenticated
  USING (
    campaign_id IN (SELECT id FROM public.campaigns WHERE game_master_id = auth.uid())
  )
  WITH CHECK (
    campaign_id IN (SELECT id FROM public.campaigns WHERE game_master_id = auth.uid())
  );

CREATE POLICY "admins_manage_updates" ON public.campaign_updates
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SECTION 4 — campaign_update_comments (2-level join through campaign_updates)
-- ============================================================================
-- Comments on update feed posts. Joins to campaign_updates, which joins
-- to campaigns. Two-level subquery — leverages campaign_updates RLS so
-- the inner SELECT returns only updates the caller can see.

-- Members can read comments on updates they can see
-- (subquery filtered by campaign_updates RLS, which filters by campaign membership)
CREATE POLICY "members_read_update_comments" ON public.campaign_update_comments
  FOR SELECT TO authenticated
  USING (
    campaign_update_id IN (SELECT id FROM public.campaign_updates)
  );

-- Users manage their own comments
CREATE POLICY "users_manage_own_update_comments" ON public.campaign_update_comments
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND campaign_update_id IN (SELECT id FROM public.campaign_updates)
  );

-- GM manages all comments in their campaigns (explicit JOIN for clarity)
CREATE POLICY "gm_manage_update_comments" ON public.campaign_update_comments
  FOR ALL TO authenticated
  USING (
    campaign_update_id IN (
      SELECT cu.id FROM public.campaign_updates cu
      JOIN public.campaigns c ON c.id = cu.campaign_id
      WHERE c.game_master_id = auth.uid()
    )
  )
  WITH CHECK (
    campaign_update_id IN (
      SELECT cu.id FROM public.campaign_updates cu
      JOIN public.campaigns c ON c.id = cu.campaign_id
      WHERE c.game_master_id = auth.uid()
    )
  );

CREATE POLICY "admins_manage_update_comments" ON public.campaign_update_comments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.campaign_update_comments ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SECTION 5 — campaign_update_reads
-- ============================================================================
-- Per-user read receipts. Each user owns their own rows.

CREATE POLICY "users_manage_own_reads" ON public.campaign_update_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.campaign_update_reads ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SECTION 6 — campaign_archives
-- ============================================================================
-- GM tool for archiving content within a campaign. Has a self-FK
-- (parent_id) for nested archive structures. Members can read,
-- GM manages.

CREATE POLICY "members_read_archives" ON public.campaign_archives
  FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns
      WHERE game_master_id = auth.uid()
         OR (player_ids IS NOT NULL AND player_ids @> to_jsonb(auth.uid()::text))
    )
  );

CREATE POLICY "gm_manage_archives" ON public.campaign_archives
  FOR ALL TO authenticated
  USING (
    campaign_id IN (SELECT id FROM public.campaigns WHERE game_master_id = auth.uid())
  )
  WITH CHECK (
    campaign_id IN (SELECT id FROM public.campaigns WHERE game_master_id = auth.uid())
  );

CREATE POLICY "admins_manage_archives" ON public.campaign_archives
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.campaign_archives ENABLE ROW LEVEL SECURITY;


COMMIT;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- All six tables should show rls_enabled = true
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'campaign_invitations', 'campaign_log_entries', 'campaign_updates',
    'campaign_update_comments', 'campaign_update_reads', 'campaign_archives'
  )
ORDER BY c.relname;

-- Policy summary
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'campaign_invitations', 'campaign_log_entries', 'campaign_updates',
    'campaign_update_comments', 'campaign_update_reads', 'campaign_archives'
  )
GROUP BY tablename
ORDER BY tablename;


-- ============================================================================
-- ROLLBACK (per table)
-- ============================================================================
-- ALTER TABLE public.campaign_invitations     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.campaign_log_entries     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.campaign_updates         DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.campaign_update_comments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.campaign_update_reads    DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.campaign_archives        DISABLE ROW LEVEL SECURITY;
-- ============================================================================
