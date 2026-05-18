-- ============================================================================
-- Seed public.game_packs + Add Public Read Policy
-- ============================================================================
--
-- Why this exists:
--
--   Save Game Pack Listing form (admin tab) was failing with the client-side
--   error "Game pack is required." Root cause: src/components/admin/
--   GamePackListingsTab.jsx (BasicsTab, ~374-384) populates its dropdown from
--   public.game_packs:
--
--     SELECT id, slug, name FROM public.game_packs ORDER BY sort_order
--
--   The table was created out-of-band (Supabase dashboard) but never seeded
--   via migration discipline — `grep -rln "INSERT INTO.*game_packs" supabase/`
--   returns zero hits. The query silently returns []; the <SelectContent>
--   renders no options; the admin can't pick a pack; the validator at line
--   288 (`if (!payload.game_pack_id) throw new Error("Game pack is required.")`)
--   rejects the save.
--
--   Same empty-state hits public players on /tavern via
--   src/components/tavern/GamePacksGrid.jsx (~29) which filters by
--   is_active = true. Without a public read policy, that grid is also blank.
--
-- What this migration does:
--
--   1. Inserts the two known SRD packs (dnd5e_2014, dnd5e_2024) so the
--      admin dropdown has something to pick. ON CONFLICT (slug) DO NOTHING
--      keeps it idempotent — safe to re-apply, safe if the dashboard already
--      seeded rows manually.
--
--   2. Adds a public_reads_active_game_packs SELECT policy so any
--      authenticated user can read active rows. The existing
--      admins_manage_game_packs FOR ALL policy still gates writes.
--
-- Wrapped in BEGIN/COMMIT — atomic.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Seed the two SRD game packs.
-- ----------------------------------------------------------------------------
--
-- Columns assumed to exist on public.game_packs (based on every call site):
--   id           (uuid, default gen_random_uuid)
--   slug         (text, UNIQUE — ON CONFLICT target)
--   name         (text)
--   is_active    (boolean)
--   sort_order   (int)
--
-- Other columns the Tavern grid renders (price_usd, image_url, etc.) are
-- intentionally left null — admins fill them via the listings form. The
-- minimum here is what makes the admin dropdown populate.

INSERT INTO public.game_packs (slug, name, is_active, sort_order)
VALUES
  ('dnd5e_2014', 'D&D 5e (2014 PHB)', true, 10),
  ('dnd5e_2024', 'D&D 5e (2024 PHB)', true, 20)
ON CONFLICT (slug) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 2. Public read policy so authenticated users can read active rows.
-- ----------------------------------------------------------------------------
--
-- Drop+create (Postgres has no CREATE POLICY IF NOT EXISTS).
-- WRITE access stays gated by the existing admins_manage_game_packs FOR ALL
-- policy — only the SELECT half opens up here.

DROP POLICY IF EXISTS public_reads_active_game_packs ON public.game_packs;

CREATE POLICY public_reads_active_game_packs ON public.game_packs
  FOR SELECT TO authenticated
  USING (is_active = true);


COMMIT;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Should return 2 rows minimum (more if the dashboard had seeded others).
SELECT id, slug, name, is_active, sort_order
FROM public.game_packs
ORDER BY sort_order;

-- Should list both admins_manage_game_packs (FOR ALL) and
-- public_reads_active_game_packs (FOR SELECT).
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'game_packs'
ORDER BY policyname;


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- BEGIN;
--   DROP POLICY IF EXISTS public_reads_active_game_packs ON public.game_packs;
--   DELETE FROM public.game_packs WHERE slug IN ('dnd5e_2014', 'dnd5e_2024');
-- COMMIT;
-- ============================================================================
