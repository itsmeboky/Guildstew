-- Artist & attribution registry.
--
-- Two purposes in one table, split by `category`:
--   - asset_credit  : legally-required CC-BY 3.0 credits for the
--                     game-icons.net monster-type icons. These are
--                     is_protected = true — editable but NOT deletable
--                     (a BEFORE DELETE trigger is the backstop).
--   - studio_artist : team / contributor credits, freely managed.
--
-- Ships with RLS ON from creation: public read (anon + authenticated),
-- admin-only write via the centralized public.is_admin() gate. This is
-- NOT an RLS-disabled alpha table.

CREATE TABLE IF NOT EXISTS public.artist_attributions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  role          TEXT,
  category      TEXT NOT NULL DEFAULT 'studio_artist'
                  CHECK (category IN ('studio_artist', 'asset_credit')),
  portfolio_url TEXT,
  contact       TEXT,
  credit_note   TEXT,
  source        TEXT,
  source_url    TEXT,
  license       TEXT,
  license_url   TEXT,
  is_protected  BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artist_attributions_category
  ON public.artist_attributions (category, sort_order, name);

-- ----------------------------------------------------------------------------
-- updated_at auto-touch (table-local, matching the repo pattern — there is
-- no shared handle_updated_at helper in the migration history).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.artist_attributions_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_artist_attributions_updated_at ON public.artist_attributions;
CREATE TRIGGER trg_artist_attributions_updated_at
BEFORE UPDATE ON public.artist_attributions
FOR EACH ROW EXECUTE FUNCTION public.artist_attributions_set_updated_at();

-- ----------------------------------------------------------------------------
-- Protected rows (legal credits) can be edited but not deleted.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.artist_attributions_block_protected_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_protected THEN
    RAISE EXCEPTION 'Cannot delete a protected attribution (%). Legal credits are editable but not deletable.', OLD.name
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_artist_attributions_block_protected_delete ON public.artist_attributions;
CREATE TRIGGER trg_artist_attributions_block_protected_delete
BEFORE DELETE ON public.artist_attributions
FOR EACH ROW EXECUTE FUNCTION public.artist_attributions_block_protected_delete();

-- ----------------------------------------------------------------------------
-- RLS: public read, admin write (centralized public.is_admin()).
-- ----------------------------------------------------------------------------
ALTER TABLE public.artist_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_attributions" ON public.artist_attributions;
CREATE POLICY "anyone_read_attributions" ON public.artist_attributions
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "admins_manage_attributions" ON public.artist_attributions;
CREATE POLICY "admins_manage_attributions" ON public.artist_attributions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- Seed.
-- ----------------------------------------------------------------------------

-- Legal asset credits — CC BY 3.0 game-icons.net monster-type icons.
-- is_protected = true. Idempotent on (name, category).
INSERT INTO public.artist_attributions
  (name, category, credit_note, source, source_url, license, license_url, is_protected, sort_order)
SELECT v.name, 'asset_credit', v.credit_note, 'game-icons.net',
       v.source_url, 'CC BY 3.0', 'http://creativecommons.org/licenses/by/3.0/',
       true, v.sort_order
FROM (VALUES
  ('Lorc',
   'Aberration, Beast, Celestial, Construct, Elemental, Fey, Fiend, Humanoid, Monstrosity, Plant monster-type icons',
   'https://lorcblog.blogspot.com/', 0),
  ('Delapouite',
   'Dragon, Giant, Ooze monster-type icons',
   'https://delapouite.com/', 1),
  ('Skoll',
   'Undead monster-type icon',
   'https://game-icons.net/', 2)
) AS v(name, credit_note, source_url, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.artist_attributions a
  WHERE a.name = v.name AND a.category = 'asset_credit'
);

-- Studio artists — portfolio_url / contact left NULL for admin to fill in.
INSERT INTO public.artist_attributions
  (name, role, category, is_protected, sort_order)
SELECT v.name, v.role, 'studio_artist', false, v.sort_order
FROM (VALUES
  ('Boky', 'Creative Director', 0),
  ('June', 'Artist', 1),
  ('Vee',  'Artist', 2)
) AS v(name, role, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.artist_attributions a
  WHERE a.name = v.name AND a.category = 'studio_artist'
);
