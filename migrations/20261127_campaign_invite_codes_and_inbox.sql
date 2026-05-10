-- ═════════════════════════════════════════════════════════════
--   Guildstew — campaign invite codes + invitations inbox.
--
--   The campaigns.invite_code column already exists (added in
--   20261115_schema_fixes.sql with a UNIQUE partial index).
--   New-campaign creation sets it client-side in CreateCampaign.jsx.
--   What is still missing — and what this migration adds — is:
--
--     * A DB-side generator with collision retry, so the source of
--       truth for code generation lives next to the uniqueness
--       constraint instead of in client RNG that can theoretically
--       race a duplicate.
--     * An auto-set trigger on campaigns INSERT for any path that
--       omits invite_code (server-side jobs, future seed scripts).
--     * A regenerate RPC (SECURITY DEFINER, GM-only) so the GM can
--       rotate a leaked code without writing UPDATE statements.
--     * A backfill for any pre-existing campaign rows that still
--       have a NULL invite_code (rows created before the client
--       generator landed).
--
--   And on the invitations side, the campaign_invitations table
--   has no migration in this repo's history at all — it lives on
--   the DB from earlier Base44 carryover with only the relational
--   columns (id, campaign_id, invited_by, invited_user_id, status,
--   created_at). The app needs:
--
--     * updated_at + a BEFORE UPDATE trigger so accept / decline
--       writes don't 400 the way friend updates did.
--     * Denormalized campaign_name, inviter_username, inviter_avatar
--       so the pending-invites inbox renders without a JOIN per row.
--     * A backfill of those denormalized fields on existing
--       invitation rows.
--
--   Idempotent — every statement is safe to re-run.
--
--   Apply via Supabase dashboard SQL editor (this repo's migration
--   files are run manually by the project owner per convention).
-- ═════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- PART 1 — Campaign invite code infrastructure
-- ═══════════════════════════════════════════════════════════════

-- 1a. DB-side code generator. 6-character alphanumeric uppercase,
-- excluding ambiguous characters (0/O, 1/I/L). 31^6 = ~887M
-- combinations; retry-on-collision keeps the rare double-write safe.
CREATE OR REPLACE FUNCTION public.generate_campaign_invite_code()
RETURNS text AS $$
DECLARE
  chars text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  charcount int := length(chars);  -- 31
  code text;
  attempts int := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * charcount)::int + 1, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.campaigns WHERE invite_code = code) THEN
      RETURN code;
    END IF;
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Could not generate unique invite code after 50 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 1b. Auto-set trigger — fires only when invite_code is NULL on
-- insert. Existing client paths in CreateCampaign.jsx set the code
-- before .create(), so the trigger is a fallback for direct DB
-- inserts and any future code path that forgets to set it.
CREATE OR REPLACE FUNCTION public.set_campaign_invite_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := public.generate_campaign_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaigns_set_invite_code ON public.campaigns;
CREATE TRIGGER campaigns_set_invite_code
  BEFORE INSERT ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.set_campaign_invite_code();

-- 1c. Regenerate RPC. SECURITY DEFINER so the function can update
-- the row even when the caller's RLS would normally restrict it,
-- but the body's GM check (game_master_id = auth.uid()) ensures
-- only the GM of the campaign can rotate its code. Returns the new
-- code so the client can update the displayed value without a
-- separate refetch.
CREATE OR REPLACE FUNCTION public.regenerate_campaign_invite_code(p_campaign_id uuid)
RETURNS text AS $$
DECLARE
  new_code text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE id = p_campaign_id AND game_master_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to regenerate code for this campaign';
  END IF;
  new_code := public.generate_campaign_invite_code();
  UPDATE public.campaigns SET invite_code = new_code WHERE id = p_campaign_id;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1d. Backfill any campaigns with a NULL invite_code. The unique
-- partial index on (invite_code) WHERE invite_code IS NOT NULL
-- already permits multiple NULLs, so existing rows from before the
-- client generator landed may still be code-less.
UPDATE public.campaigns
SET invite_code = public.generate_campaign_invite_code()
WHERE invite_code IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- PART 2 — campaign_invitations schema gaps
-- ═══════════════════════════════════════════════════════════════

-- 2a. Add the missing columns. updated_at lets accept/decline
-- writes succeed without 400'ing on schema cache. The three
-- denormalized fields let the inbox render in one round-trip.
ALTER TABLE public.campaign_invitations
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS campaign_name     text,
  ADD COLUMN IF NOT EXISTS inviter_username  text,
  ADD COLUMN IF NOT EXISTS inviter_avatar    text;

-- 2b. updated_at trigger. Following the existing repo pattern from
-- 20261125_game_pack_listings.sql (table-local trigger function
-- rather than a shared helper) so this migration carries everything
-- it needs without depending on prior work that may or may not
-- have landed.
CREATE OR REPLACE FUNCTION public.campaign_invitations_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaign_invitations_set_updated_at ON public.campaign_invitations;
CREATE TRIGGER campaign_invitations_set_updated_at
  BEFORE UPDATE ON public.campaign_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.campaign_invitations_set_updated_at();

-- 2c. Backfill the denormalized fields on existing invitation rows.
-- COALESCE on campaigns.title / campaigns.name covers historical
-- rows where the canonical column may have been either; the
-- application reads `campaign.title || campaign.name` everywhere so
-- the same fallback applies here. Username falls back to the email
-- local-part for legacy profiles without a username.
UPDATE public.campaign_invitations ci
SET
  campaign_name = COALESCE(c.title, c.name),
  inviter_username = COALESCE(
    NULLIF(up.username, ''),
    split_part(up.email, '@', 1)
  ),
  inviter_avatar = up.avatar_url
FROM public.campaigns c, public.user_profiles up
WHERE ci.campaign_id = c.id
  AND up.user_id = ci.invited_by
  AND (
    ci.campaign_name IS NULL
    OR ci.inviter_username IS NULL
    OR ci.inviter_avatar IS NULL
  );

-- ═══════════════════════════════════════════════════════════════
-- PART 3 — Reload PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════
-- Without this, the new columns / functions may not appear to the
-- REST API until the service restarts or hits its periodic refresh.
NOTIFY pgrst, 'reload schema';
