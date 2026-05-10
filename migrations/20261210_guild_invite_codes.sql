-- Guild invite codes — shareable join codes for the subscription
-- Guild tier (NOT the campaign-scoped guild_halls minigame).
--
-- Active code = one row per guild_id with revoked_at IS NULL.
-- Regenerate = revoke the current row + insert a new one. Revoke =
-- set revoked_at, no replacement.  use_count is a redemption tally.
--
-- Membership in this product is tracked on the subscriptions row,
-- NOT on a guild_members table — see SubscriptionContext / billingClient
-- listGuildMembers. The redemption RPC mirrors what guild-accept does
-- to that row: sets guild_owner_id + is_guild_member on the joiner.
-- The 6-member cap (owner + 5) is enforced via the canonical
-- subscriptions .or() query so this RPC counts the same way the UI does.

CREATE TABLE IF NOT EXISTS guild_invite_codes (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id    UUID         NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  code        TEXT         NOT NULL UNIQUE,
  created_by  UUID         NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ,
  use_count   INTEGER      NOT NULL DEFAULT 0
);

-- Hot paths: (1) "what's this guild's active code" lookup by owner,
-- (2) "is this code valid + which guild does it point to" by code.
-- Both are partial indexes filtered to active codes only.
CREATE INDEX IF NOT EXISTS idx_guild_invite_codes_active_by_guild
  ON guild_invite_codes (guild_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_guild_invite_codes_active_by_code
  ON guild_invite_codes (code) WHERE revoked_at IS NULL;

ALTER TABLE guild_invite_codes ENABLE ROW LEVEL SECURITY;

-- Only the guild owner can SEE their guild's codes. Non-members and
-- members alike must redeem blind — they enter the code, the
-- SECURITY DEFINER RPC validates it server-side. RLS deliberately
-- does NOT expose the code by guild_id to anyone but the owner.
CREATE POLICY "Owners read own guild codes" ON guild_invite_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_invite_codes.guild_id
        AND g.owner_user_id = auth.uid()
    )
  );

-- Owners can insert / update (for revoke) their own guild's codes.
CREATE POLICY "Owners insert own guild codes" ON guild_invite_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_invite_codes.guild_id
        AND g.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners update own guild codes" ON guild_invite_codes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_invite_codes.guild_id
        AND g.owner_user_id = auth.uid()
    )
  );

-- Redemption RPC. SECURITY DEFINER so the joiner can flip their own
-- subscription row (guild_owner_id + is_guild_member) without needing
-- direct UPDATE rights, and so we can read across guilds + auth.users
-- to validate. Returns a JSONB envelope with status + (on success)
-- the guild_id so the client can redirect.
CREATE OR REPLACE FUNCTION redeem_guild_invite_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID;
  v_guild_id     UUID;
  v_owner_id     UUID;
  v_member_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_authenticated');
  END IF;

  -- Resolve the active code → guild → owner. revoked_at IS NULL is
  -- the active filter; the partial index serves the lookup.
  SELECT c.guild_id, g.owner_user_id
    INTO v_guild_id, v_owner_id
    FROM guild_invite_codes c
    JOIN guilds g ON g.id = c.guild_id
   WHERE c.code = p_code
     AND c.revoked_at IS NULL
   LIMIT 1;

  IF v_guild_id IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_code');
  END IF;

  -- Owner can't redeem their own code.
  IF v_user_id = v_owner_id THEN
    RETURN jsonb_build_object('status', 'already_member');
  END IF;

  -- Already a member of THIS guild?
  IF EXISTS (
    SELECT 1 FROM subscriptions
     WHERE user_id = v_user_id
       AND guild_owner_id = v_owner_id
       AND is_guild_member = TRUE
  ) THEN
    RETURN jsonb_build_object('status', 'already_member');
  END IF;

  -- Member of a different guild already? Block — leaving has its own flow.
  IF EXISTS (
    SELECT 1 FROM subscriptions
     WHERE user_id = v_user_id
       AND is_guild_member = TRUE
       AND guild_owner_id IS NOT NULL
       AND guild_owner_id <> v_owner_id
  ) THEN
    RETURN jsonb_build_object('status', 'already_in_other_guild');
  END IF;

  -- Cap check — same .or() shape the UI uses to count members
  -- (owner's own row + every member row pointing at this owner).
  SELECT COUNT(DISTINCT user_id) INTO v_member_count
    FROM subscriptions
   WHERE user_id = v_owner_id
      OR guild_owner_id = v_owner_id;

  IF v_member_count >= 6 THEN
    RETURN jsonb_build_object('status', 'guild_full');
  END IF;

  -- Flip the joiner's subscription row. UPSERT so a free user with
  -- no row yet still becomes a guild member; status='active' tracks
  -- the canonical subscription state used by the rest of the UI.
  INSERT INTO subscriptions (user_id, guild_owner_id, is_guild_member, status)
  VALUES (v_user_id, v_owner_id, TRUE, 'active')
  ON CONFLICT (user_id) DO UPDATE
    SET guild_owner_id   = EXCLUDED.guild_owner_id,
        is_guild_member  = TRUE;

  -- Tally the redemption for owner's "Used N times" display.
  UPDATE guild_invite_codes
     SET use_count = use_count + 1
   WHERE code = p_code
     AND revoked_at IS NULL;

  RETURN jsonb_build_object(
    'status',   'joined',
    'guild_id', v_guild_id,
    'owner_id', v_owner_id
  );
END;
$$;

REVOKE ALL ON FUNCTION redeem_guild_invite_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_guild_invite_code(TEXT) TO authenticated;
