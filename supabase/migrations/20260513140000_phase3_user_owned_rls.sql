-- ============================================================================
-- Phase 3 RLS Migration: User-Owned Data
-- ============================================================================
--
-- Sections 1–5 are EMPTY TABLES (0 rows) — low blast radius.
-- Section 6 (characters) has 25 live rows and is queried throughout
-- the app. You can pause after Section 5, run the smoke tests for
-- Sections 1–5, and only run Section 6 once those pass.
--
-- Full rollback at the bottom.
-- ============================================================================

-- ============================================================================
-- SECTION 1 — achievements (user_id)
-- ============================================================================
-- Server awards achievements via service_role. Users read their own.

CREATE POLICY "users_read_own_achievements" ON public.achievements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "service_role_manages_achievements" ON public.achievements
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 2 — player_diaries (user_id)
-- ============================================================================
-- STRICTLY PRIVATE. GMs do not get to read player diaries — that's the
-- whole point of the table. Player owns it absolutely.

CREATE POLICY "users_manage_own_diaries" ON public.player_diaries
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.player_diaries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3 — player_notes (author_id)
-- ============================================================================
-- Private to the author. Note the column is `author_id`, not `user_id`.

CREATE POLICY "users_manage_own_notes" ON public.player_notes
  FOR ALL TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

ALTER TABLE public.player_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 4 — user_owned_effects (user_id)
-- ============================================================================
-- Marketplace ownership records. User reads own. Service_role writes
-- (from Tavern purchase webhooks / Spice grants).

CREATE POLICY "users_read_own_effects" ON public.user_owned_effects
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "service_role_manages_effects" ON public.user_owned_effects
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE public.user_owned_effects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 5 — session_reminders (user_id)
-- ============================================================================
-- User manages own reminders.

CREATE POLICY "users_manage_own_reminders" ON public.session_reminders
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.session_reminders ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ⚠️  STOP HERE IF YOU WANT TO TEST SECTIONS 1–5 FIRST
-- ============================================================================
-- Sections 1–5 affect empty or near-empty tables. Section 6 affects
-- 25 live character rows that drive character sheets, combat, party
-- displays, GM panels, and player panels. If you want extra caution,
-- pause here, run the smoke tests for Sections 1–5, and only run
-- Section 6 below once you're confident.
-- ============================================================================

-- ============================================================================
-- SECTION 6 — characters (user_id, campaign_id)
-- ============================================================================
-- HIGHEST BLAST RADIUS IN THIS PHASE.
--
-- Three policies:
--   1. campaign_members_read_characters — any member of a campaign can
--      SEE all characters in that campaign (party UI, GM panel, etc.)
--   2. users_manage_own_characters      — player owns their own
--      characters fully (library + campaign chars)
--   3. gm_manage_campaign_characters    — GM has full control over
--      characters in their campaigns
--
-- Library characters (campaign_id IS NULL) are visible ONLY to their
-- owner — they're personal drafts not yet attached to a campaign.

-- READ: campaign members can see all characters in their campaigns
CREATE POLICY "campaign_members_read_characters" ON public.characters
  FOR SELECT TO authenticated
  USING (
    campaign_id IS NOT NULL
    AND campaign_id IN (
      SELECT id FROM campaigns
      WHERE game_master_id = auth.uid()
         OR player_ids @> to_jsonb(auth.uid()::text)
    )
  );

-- READ + WRITE: users manage their own characters (library or campaign)
CREATE POLICY "users_manage_own_characters" ON public.characters
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- READ + WRITE: GMs manage all characters in their campaigns
CREATE POLICY "gm_manage_campaign_characters" ON public.characters
  FOR ALL TO authenticated
  USING (
    campaign_id IS NOT NULL
    AND campaign_id IN (SELECT id FROM campaigns WHERE game_master_id = auth.uid())
  )
  WITH CHECK (
    campaign_id IS NOT NULL
    AND campaign_id IN (SELECT id FROM campaigns WHERE game_master_id = auth.uid())
  );

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION — run after each ALTER TABLE
-- ============================================================================
-- Expected: all six show rls_enabled = true

SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'achievements', 'player_diaries', 'player_notes',
    'user_owned_effects', 'session_reminders', 'characters'
  )
ORDER BY c.relname;

-- ============================================================================
-- ROLLBACK (per table — paste the line for whichever broke)
-- ============================================================================
-- ALTER TABLE public.achievements        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.player_diaries      DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.player_notes        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_owned_effects  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.session_reminders   DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.characters          DISABLE ROW LEVEL SECURITY;
