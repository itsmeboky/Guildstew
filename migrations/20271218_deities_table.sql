-- Deity system Phase 1 — campaign-scoped `deities` table.
--
-- The DeityEditor / PantheonViewer components and the `Deity` entity
-- (entities.js: createEntity('deities')) already exist but were never
-- wired up, and no migration ever created the table. This creates it,
-- scoped to a campaign, matching the editor's shape and baking in the
-- approval/source workflow columns now so Phase 3 (GM acceptance) needs
-- no second migration.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS, so
-- it's safe whether or not a base44-created `deities` table already
-- exists. Apply via the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.deities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name          text NOT NULL,
  title         text,
  image_url     text,
  symbol_url    text,
  domains       jsonb DEFAULT '[]'::jsonb,
  alignment     text,
  holy_text     text,
  description   text,
  followers     text,
  relationships jsonb DEFAULT '[]'::jsonb,
  religion      text,
  entry_id      uuid,
  discovered    boolean DEFAULT true,
  -- Workflow columns (used by feature Phase 3 — GM acceptance — but
  -- present from day one so player-submitted deities have a home).
  source          text NOT NULL DEFAULT 'gm-authored'
                    CHECK (source IN ('gm-authored', 'player-submitted')),
  approval_status text NOT NULL DEFAULT 'accepted'
                    CHECK (approval_status IN ('accepted', 'pending', 'rejected')),
  submitted_by  uuid,
  created_by    uuid,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Belt-and-suspenders for a pre-existing base44 table missing columns.
ALTER TABLE public.deities ADD COLUMN IF NOT EXISTS campaign_id      uuid REFERENCES public.campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.deities ADD COLUMN IF NOT EXISTS religion         text;
ALTER TABLE public.deities ADD COLUMN IF NOT EXISTS discovered       boolean DEFAULT true;
ALTER TABLE public.deities ADD COLUMN IF NOT EXISTS source           text DEFAULT 'gm-authored';
ALTER TABLE public.deities ADD COLUMN IF NOT EXISTS approval_status  text DEFAULT 'accepted';
ALTER TABLE public.deities ADD COLUMN IF NOT EXISTS submitted_by     uuid;
ALTER TABLE public.deities ADD COLUMN IF NOT EXISTS created_by       uuid;
ALTER TABLE public.deities ADD COLUMN IF NOT EXISTS created_at       timestamptz DEFAULT now();
ALTER TABLE public.deities ADD COLUMN IF NOT EXISTS updated_at       timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS deities_campaign_idx ON public.deities (campaign_id);
CREATE INDEX IF NOT EXISTS deities_campaign_status_idx ON public.deities (campaign_id, approval_status);

-- ─── RLS ─────────────────────────────────────────────────────────────
-- Mirrors the campaigns membership pattern (phase5_campaigns_rls):
-- game_master_id = GM, player_ids @> auth.uid() = listed player,
-- public.is_admin() = platform admin.
ALTER TABLE public.deities ENABLE ROW LEVEL SECURITY;

-- SELECT — the campaign GM reads everything in their pantheon; listed
-- players read only ACCEPTED deities (the player-facing view further
-- respects `discovered` in the UI). Admins read all.
DROP POLICY IF EXISTS "deities_read" ON public.deities;
CREATE POLICY "deities_read" ON public.deities
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = deities.campaign_id
        AND (
          c.game_master_id = auth.uid()
          OR (
            c.player_ids IS NOT NULL
            AND c.player_ids @> to_jsonb(auth.uid()::text)
            AND deities.approval_status = 'accepted'
          )
        )
    )
  );

-- INSERT / UPDATE / DELETE — only the campaign GM (and admins). Player
-- submission (source = 'player-submitted') is a feature-Phase-3 concern
-- and will get its own scoped policy then.
DROP POLICY IF EXISTS "deities_gm_write" ON public.deities;
CREATE POLICY "deities_gm_write" ON public.deities
  FOR ALL
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = deities.campaign_id
        AND c.game_master_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = deities.campaign_id
        AND c.game_master_id = auth.uid()
    )
  );

-- PostgREST caches the schema; reload so the new table/columns are
-- writable immediately.
NOTIFY pgrst, 'reload schema';
