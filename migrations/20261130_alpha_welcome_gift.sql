-- Alpha welcome gift — 10K spice on first home-page visit.
--
-- Two flags on user_profiles drive the modal:
--   has_seen_alpha_welcome — modal stops appearing once true
--   alpha_gift_claimed     — RPC refuses to grant a second time
-- Two flags (not one) so a player can dismiss the modal without
-- claiming and still get a "Claim your gift" affordance later.
-- Today the modal closes only after the gift is claimed; the
-- separate flag is the durable record so future UI changes
-- (notification dot, profile-page button, etc.) have a single
-- source of truth.
--
-- The grant_alpha_welcome_gift(uuid) function is SECURITY DEFINER
-- so it runs with the table owner's privileges, bypassing RLS.
-- Idempotency check on alpha_gift_claimed prevents 10K-spice
-- farming via DevTools / direct API hits.
--
-- Apply via the Supabase SQL editor or `psql`. Idempotent —
-- re-running is safe.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS has_seen_alpha_welcome BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alpha_gift_claimed     BOOLEAN NOT NULL DEFAULT false;

-- Drop-and-recreate so re-running picks up any tweaks to the
-- function body without ALTER FUNCTION incantations.
DROP FUNCTION IF EXISTS grant_alpha_welcome_gift(UUID);

CREATE OR REPLACE FUNCTION grant_alpha_welcome_gift(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_claimed BOOLEAN;
  v_new_balance     BIGINT;
BEGIN
  -- Caller must match the user being granted (auth.uid() guard
  -- for the RPC). SECURITY DEFINER runs as table owner; this
  -- check keeps user A from claiming user B's gift.
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot grant the welcome gift for another user.';
  END IF;

  -- Idempotency: short-circuit if already claimed.
  SELECT alpha_gift_claimed
    INTO v_already_claimed
    FROM user_profiles
   WHERE user_id = p_user_id;

  IF COALESCE(v_already_claimed, false) THEN
    RETURN jsonb_build_object(
      'granted', false,
      'reason',  'already_claimed'
    );
  END IF;

  -- Ensure the wallet row exists, then bump the balance. Same
  -- shape add_spice uses internally so downstream consumers
  -- (lifetime_earned, transaction log, etc.) stay consistent.
  INSERT INTO spice_wallets (user_id, balance, lifetime_earned, created_at, updated_at)
  VALUES (p_user_id, 10000, 10000, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET balance         = spice_wallets.balance + 10000,
        lifetime_earned = COALESCE(spice_wallets.lifetime_earned, 0) + 10000,
        updated_at      = NOW()
  RETURNING balance INTO v_new_balance;

  -- Audit row in spice_transactions so the gift shows up in any
  -- player's transaction history.
  INSERT INTO spice_transactions (user_id, amount, balance_after, transaction_type, description)
  VALUES (
    p_user_id,
    10000,
    v_new_balance,
    'alpha_welcome_gift',
    'Welcome to the Guildstew alpha — thanks for being here.'
  );

  -- Mark both flags so the modal stops showing AND the gift
  -- can't be claimed twice even if the modal logic is bypassed.
  UPDATE user_profiles
     SET has_seen_alpha_welcome = true,
         alpha_gift_claimed     = true,
         updated_at             = NOW()
   WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'granted',     true,
    'amount',      10000,
    'new_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION grant_alpha_welcome_gift(UUID) TO authenticated;
