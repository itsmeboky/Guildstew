-- ═════════════════════════════════════════════════════════════
--   Guildstew — character ownership model foundation
--   (foundation for hotfix #10b lobby gate work)
--
--   PROBLEM
--   --------
--   Today the codebase has no real distinction between a character
--   row that lives in a player's library and a character row that
--   has been attached to (and is being mutated by play in) a
--   specific campaign. The same `characters` row gets its
--   `campaign_id` set on attach, then gets mutated by combat /
--   level-ups / edits, and the player's "library" version is gone.
--
--   The schema dump confirms `source_character_id` (uuid) and
--   `is_campaign_copy` (boolean) already exist on `characters` — the
--   recon report from #10's first pass had this wrong. They just
--   aren't populated; the application doesn't yet write them.
--
--   This migration is the FOUNDATION pass. It adds nothing
--   user-visible. It:
--     1. Backfills `is_campaign_copy = true` for every existing
--        campaign-attached row so the new `is_campaign_copy = false`
--        library filter (added in the application-code commit) hides
--        clones from the library list.
--     2. Standardizes session-active state on `campaigns.session_active`
--        (the column the migration history actually introduced) by
--        reconciling values from the parallel `is_session_active`
--        column the application has been writing in lockstep, then
--        drops `is_session_active`.
--     3. Canonicalizes `characters.mod_dependencies` from a mixed
--        shape (some entries are plain mod-id strings written by
--        CharacterCreator.jsx's apply flow, some are
--        `{mod_id, mod_type, mod_name}` objects written by
--        RaceStep/ClassStep/CharacterLibrary readers) into a single
--        object shape so every reader can dot-access `.mod_id`.
--
--   NOTES
--   -----
--   - Per Boky: testing-environment-only. Pre-existing
--     campaign-attached rows lose their library-original because the
--     legacy flow destroyed it; backfill leaves them as orphan
--     clones with NULL `source_character_id`.
--   - `required_mods` from the prompt is NOT added as a separate
--     column. The codebase already uses `mod_dependencies` for that
--     exact purpose (RaceStep.jsx:359-379, ClassStep.jsx:400-414,
--     modEngine.js:255-258, CampaignApplyFlow.jsx:74-87). Adding a
--     parallel field would create exactly the kind of drift this
--     hotfix is trying to undo.
--   - Idempotent on every statement.
--   - Apply via Supabase dashboard SQL editor.
-- ═════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- PART 1 — characters ownership-model columns (idempotent guards)
-- ═══════════════════════════════════════════════════════════════

-- Already in the schema per the dump, but guard anyway so re-runs
-- on a fresh DB or a partial-state DB land cleanly.
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS source_character_id uuid REFERENCES public.characters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_campaign_copy    boolean DEFAULT false;

-- ═══════════════════════════════════════════════════════════════
-- PART 2 — Backfill is_campaign_copy from campaign_id presence
-- ═══════════════════════════════════════════════════════════════
-- Every character row currently sitting in a campaign was attached
-- by the legacy mutate-in-place flow; treat all of them as orphan
-- clones now so the new library filter (is_campaign_copy = false)
-- doesn't surface them in players' library lists.
UPDATE public.characters
SET is_campaign_copy = true
WHERE campaign_id IS NOT NULL
  AND (is_campaign_copy IS DISTINCT FROM true);

-- ═══════════════════════════════════════════════════════════════
-- PART 3 — Reconcile session_active and drop is_session_active
-- ═══════════════════════════════════════════════════════════════
-- The application has been writing both columns in lockstep
-- (GMPanel.jsx:246, CampaignView.jsx:79, etc.). The migration that
-- introduced session-lifecycle state (20261022_session_lifecycle.sql)
-- only added `session_active`, so that's the canonical name.
-- Reconcile any drift, then drop the redundant column.

-- 3a. If is_session_active was true and session_active wasn't, take
--     the more permissive truth.
UPDATE public.campaigns
SET session_active = TRUE
WHERE COALESCE(is_session_active, FALSE) = TRUE
  AND COALESCE(session_active, FALSE) = FALSE;

-- 3b. Symmetric reconciliation in the other direction (so neither
--     side has a stale TRUE that the other side flipped to FALSE).
UPDATE public.campaigns
SET session_active = COALESCE(session_active, is_session_active, FALSE)
WHERE session_active IS NULL;

-- 3c. Drop the redundant column. Safe to no-op if it's already gone.
ALTER TABLE public.campaigns DROP COLUMN IF EXISTS is_session_active;

-- ═══════════════════════════════════════════════════════════════
-- PART 4 — Canonicalize characters.mod_dependencies shape
-- ═══════════════════════════════════════════════════════════════
-- The codebase reads `d.mod_id` and `d.mod_type` everywhere
-- (RaceStep, ClassStep, CharacterLibrary, modEngine). But
-- CharacterCreator.jsx's apply flow at lines 301-304 set-merges
-- plain mod-id strings from campaign_installed_mods INTO the same
-- array, producing a mixed-shape array that breaks any reader doing
-- `d.mod_id`. The application-code commit fixes the apply flow
-- writer; this migration cleans up the rows that already wrote
-- mixed shape so existing characters' compat checks work.
--
-- Plain-string entries become `{mod_id: <string>, mod_type:
-- 'unknown', mod_name: <string>}`. mod_type stays 'unknown' rather
-- than joining brewery_mods to look up the real type — that join
-- might silently lose entries that don't match a brewery_mods row,
-- which would erase legitimate compat dependencies. The application
-- writers will produce correct mod_type going forward.
WITH canonicalized AS (
  SELECT
    id,
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) = 'string' THEN jsonb_build_object(
            'mod_id',   elem #>> '{}',
            'mod_type', 'unknown',
            'mod_name', elem #>> '{}'
          )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(mod_dependencies) AS elem
    ) AS new_deps
  FROM public.characters
  WHERE jsonb_typeof(mod_dependencies) = 'array'
    AND jsonb_array_length(mod_dependencies) > 0
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(mod_dependencies) AS e
      WHERE jsonb_typeof(e) = 'string'
    )
)
UPDATE public.characters c
SET mod_dependencies = COALESCE(cz.new_deps, '[]'::jsonb)
FROM canonicalized cz
WHERE c.id = cz.id;

-- ═══════════════════════════════════════════════════════════════
-- PART 5 — Reload PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════
-- session_active drop changes the table shape PostgREST exposes;
-- without this, REST clients may keep seeing `is_session_active`
-- in introspection until the service refreshes.
NOTIFY pgrst, 'reload schema';
