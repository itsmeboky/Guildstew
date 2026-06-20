-- ═════════════════════════════════════════════════════════════
--   Guildstew — clone-on-join: campaign-GM policy on characters
--
--   CONTEXT
--   -------
--   The character-ownership-model foundation (20261128) added
--   `source_character_id` + `is_campaign_copy` so a campaign can hold
--   a CLONE of a player's library character instead of mutating the
--   library row in place. The lobby attach path
--   (CharacterPickerView.cloneMutation) already clones; the
--   application-accept path (campaignApplications.acceptApplication)
--   did not — it stamped `campaign_id` onto the library row. The
--   application-code change in this branch makes accept clone too, and
--   makes kick DELETE the campaign clone.
--
--   For the GM to manage those campaign-owned clones — create one at
--   accept (with the PLAYER's user_id, so the owner INSERT policy
--   `user_id = auth.uid()` can't cover it), read its creator_data for
--   the deity materialize, and delete it on kick — the `characters`
--   table needs GM policies scoped to campaign-attached rows.
--
--   Library characters have `campaign_id IS NULL`, so none of these
--   policies ever touch them; the existing owner policies are unchanged.
--
--   is_campaign_gm() is SECURITY DEFINER (mirrors the is_admin()
--   pattern these policies already lean on) so the campaigns lookup
--   inside a characters policy can't trip recursive-RLS evaluation.
--
--   Idempotent. The columns already exist on the live DB; the guards
--   are for fresh / partial environments. Apply via the SQL editor.
-- ═════════════════════════════════════════════════════════════

-- Ownership-model columns (already present per 20261128; guarded for
-- fresh environments).
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS source_character_id uuid REFERENCES public.characters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_campaign_copy    boolean DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- is_campaign_gm(campaign_id): true when the current user is the GM
-- of that campaign. SECURITY DEFINER bypasses RLS on `campaigns` so a
-- `characters` policy can call it without recursive policy evaluation.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_campaign_gm(p_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE id = p_campaign_id
      AND game_master_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_campaign_gm(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- GM policies on `characters`, scoped to campaign-attached rows only.
-- (SELECT for campaign members already exists as
-- campaign_members_read_characters; the GM SELECT here is an explicit,
-- redundant guard so GM access holds even if that policy drifts.)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- INSERT: the GM creates the clone at accept time, with the PLAYER's
-- user_id — the owner INSERT policy can't authorize that, so this does.
DROP POLICY IF EXISTS "gm_create_campaign_characters" ON public.characters;
CREATE POLICY "gm_create_campaign_characters" ON public.characters
  FOR INSERT
  WITH CHECK (campaign_id IS NOT NULL AND public.is_campaign_gm(campaign_id));

-- SELECT: GM reads campaign clones (e.g. the deity materialize reads
-- the clone's creator_data).
DROP POLICY IF EXISTS "gm_read_campaign_characters" ON public.characters;
CREATE POLICY "gm_read_campaign_characters" ON public.characters
  FOR SELECT
  USING (campaign_id IS NOT NULL AND public.is_campaign_gm(campaign_id));

-- UPDATE: GM may mutate campaign clones (and detach if ever needed).
DROP POLICY IF EXISTS "gm_update_campaign_characters" ON public.characters;
CREATE POLICY "gm_update_campaign_characters" ON public.characters
  FOR UPDATE
  USING (campaign_id IS NOT NULL AND public.is_campaign_gm(campaign_id))
  WITH CHECK (campaign_id IS NOT NULL AND public.is_campaign_gm(campaign_id));

-- DELETE: kick deletes the campaign clone (the 403 this whole change
-- closes). Library originals (campaign_id IS NULL) are never matched.
DROP POLICY IF EXISTS "gm_delete_campaign_characters" ON public.characters;
CREATE POLICY "gm_delete_campaign_characters" ON public.characters
  FOR DELETE
  USING (campaign_id IS NOT NULL AND public.is_campaign_gm(campaign_id));

NOTIFY pgrst, 'reload schema';
