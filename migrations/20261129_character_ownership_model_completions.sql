-- ═════════════════════════════════════════════════════════════
--   Guildstew — character ownership model completions
--
--   Follow-up to 20261128_character_ownership_model_foundation.sql.
--   That migration backfilled is_campaign_copy + standardized
--   session_active + canonicalized mod_dependencies. This one
--   closes three completion deltas the foundation skipped:
--
--     1. Adds the `required_mods jsonb` column the lobby gate work
--        will read for mod-compatibility filters in #10b.
--     2. Adds query indexes on the new ownership-model columns.
--     3. Tightens NOT NULL on is_campaign_copy now that the backfill
--        has populated every row (the foundation migration left it
--        nullable to avoid a NOT NULL violation during backfill).
--
--   Idempotent. Apply via Supabase dashboard SQL editor.
-- ═════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- PART 1 — required_mods column
-- ═══════════════════════════════════════════════════════════════
-- Purpose: the lobby's library-import compatibility check (#10b)
-- needs a denormalized "what mods does this character require to
-- function" array on the character row. We're keeping
-- mod_dependencies as the per-content-piece tracking (race mod,
-- class mod, etc., with rich {mod_id, mod_type, mod_name} entries)
-- AND adding required_mods as a flat list of mod ids the character
-- depends on for campaign-compat filtering. The lobby gate reads
-- required_mods.every(id => campaignInstalledMods.has(id)).
--
-- New character creation populates this from
-- campaign_installed_mods at apply-flow save time; the
-- application-code commit lands that wiring.
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS required_mods jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill required_mods from the existing mod_dependencies
-- objects so #10b's compat check works against historical
-- characters. Pull just the mod_id off each dependency entry.
-- Skip rows that already have required_mods populated (re-run
-- safety) and rows where mod_dependencies is empty/null.
UPDATE public.characters
SET required_mods = (
  SELECT COALESCE(jsonb_agg(DISTINCT (elem->>'mod_id')), '[]'::jsonb)
  FROM jsonb_array_elements(mod_dependencies) AS elem
  WHERE elem ? 'mod_id'
    AND (elem->>'mod_id') IS NOT NULL
)
WHERE jsonb_typeof(mod_dependencies) = 'array'
  AND jsonb_array_length(mod_dependencies) > 0
  AND jsonb_array_length(required_mods) = 0;

-- ═══════════════════════════════════════════════════════════════
-- PART 2 — Indexes on ownership-model columns
-- ═══════════════════════════════════════════════════════════════

-- For "what clones exist for this library character?" lookups
-- and reverse-pointer integrity checks. Partial index — most rows
-- are library originals with NULL source_character_id, so the
-- B-tree only carries clones, keeping the index small.
CREATE INDEX IF NOT EXISTS characters_source_character_id_idx
  ON public.characters(source_character_id)
  WHERE source_character_id IS NOT NULL;

-- For "list this user's library characters" — the most common
-- post-fix filter (CharacterLibrary, JoinCampaign, future #10b
-- picker). Composite (user_id, is_campaign_copy) lets the
-- planner serve both library scans and clone-counting queries
-- off the same index.
CREATE INDEX IF NOT EXISTS characters_user_id_is_campaign_copy_idx
  ON public.characters(user_id, is_campaign_copy);

-- ═══════════════════════════════════════════════════════════════
-- PART 3 — Reload PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
