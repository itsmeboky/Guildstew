-- ═════════════════════════════════════════════════════════════
--   Spice ledger — atomic SECURITY DEFINER RPCs
--
--   Console log was showing 403s on:
--     POST /rest/v1/spice_transactions          (creator credit,
--                                                cashout reject)
--     PATCH /rest/v1/spice_wallets?on_conflict=user_id
--                                               (stipend stamp)
--
--   Root cause: hybrid pattern. The wallet update went through
--   the add_spice / spend_spice SECURITY DEFINER RPCs (which
--   bypass RLS, so writing to someone else's wallet was fine),
--   but the spice_transactions audit-row insert went DIRECT from
--   JS — subject to RLS. The INSERT policy required
--   `user_id = auth.uid()`, which fails for creator credit
--   (auth.uid()=buyer, user_id=creator) and admin refund
--   (auth.uid()=admin, user_id=refundee). The wallet got
--   credited; the audit row was rejected. .catch(() => {}) in
--   tavernClient.js silently swallowed it. Matches the smell
--   filed in a6be5f0.
--
--   Fix: ledger ops are atomic. add_spice and spend_spice now
--   handle wallet UPDATE *and* spice_transactions INSERT inside
--   one DEFINER body, so both succeed or both fail. Stipend
--   stamp moved into mark_stipend_granted. Guild credit / spend
--   wrapped in add_guild_spice / spend_guild_spice. Direct
--   INSERT / UPDATE policies on spice_wallets and
--   spice_transactions are dropped — all writes go through
--   RPCs by design. SELECT policies are untouched.
--
--   guild_spice_wallets policies are intentionally untouched.
--   The spending_restricted UPDATE in GuildSettingsDialog.jsx
--   still needs that direct path; tightening that table is a
--   separate scope.
--
--   add_spice's lifetime accounting now branches on p_type:
--   p_type='purchase' bumps lifetime_purchased; everything else
--   bumps lifetime_earned. The standalone lifetime_purchased
--   UPDATE in SpiceEmporium.jsx is removed — same fact, written
--   once, atomically.
--
--   Idempotent. Apply via Supabase dashboard SQL editor.
-- ═════════════════════════════════════════════════════════════

-- ── Drop the legacy 2-arg signatures so the new signatures
--    with defaulted params are unambiguous. ──────────────────
DROP FUNCTION IF EXISTS public.add_spice(uuid, bigint);
DROP FUNCTION IF EXISTS public.spend_spice(uuid, bigint);

-- ── add_spice ────────────────────────────────────────────────
-- Credit p_amount to p_user_id's personal wallet AND insert the
-- matching spice_transactions row in one DEFINER body. Returns
-- the new balance. Branches lifetime_earned vs lifetime_purchased
-- on p_type so SpiceEmporium's real-money credits don't inflate
-- the gameplay-earned figure.
CREATE OR REPLACE FUNCTION public.add_spice(
  p_user_id      uuid,
  p_amount       bigint,
  p_type         text DEFAULT 'credit',
  p_description  text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'add_spice: amount must be positive';
  END IF;

  INSERT INTO spice_wallets (user_id, balance, lifetime_earned, lifetime_purchased)
  VALUES (
    p_user_id,
    p_amount,
    CASE WHEN p_type = 'purchase' THEN 0 ELSE p_amount END,
    CASE WHEN p_type = 'purchase' THEN p_amount ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    balance = spice_wallets.balance + p_amount,
    lifetime_earned = spice_wallets.lifetime_earned
      + CASE WHEN p_type = 'purchase' THEN 0 ELSE p_amount END,
    lifetime_purchased = spice_wallets.lifetime_purchased
      + CASE WHEN p_type = 'purchase' THEN p_amount ELSE 0 END,
    updated_at = now()
  RETURNING balance INTO new_balance;

  INSERT INTO spice_transactions (
    user_id, amount, balance_after, transaction_type, description, reference_id
  ) VALUES (
    p_user_id, p_amount, new_balance, p_type, p_description, p_reference_id
  );

  RETURN new_balance;
END;
$$;

-- ── spend_spice ──────────────────────────────────────────────
-- Debit p_amount from p_user_id's personal wallet AND insert the
-- matching spice_transactions row (with negative amount) in one
-- DEFINER body. Raises 'Insufficient Spice balance' if the wallet
-- can't cover it; callers catch the exception to render a toast.
CREATE OR REPLACE FUNCTION public.spend_spice(
  p_user_id      uuid,
  p_amount       bigint,
  p_type         text DEFAULT 'debit',
  p_description  text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance bigint;
  new_balance     bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'spend_spice: amount must be positive';
  END IF;

  SELECT balance INTO current_balance
    FROM spice_wallets WHERE user_id = p_user_id
    FOR UPDATE;

  IF current_balance IS NULL OR current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient Spice balance';
  END IF;

  UPDATE spice_wallets SET
    balance = balance - p_amount,
    lifetime_spent = lifetime_spent + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO new_balance;

  INSERT INTO spice_transactions (
    user_id, amount, balance_after, transaction_type, description, reference_id
  ) VALUES (
    p_user_id, -p_amount, new_balance, p_type, p_description, p_reference_id
  );

  RETURN new_balance;
END;
$$;

-- ── mark_stipend_granted ─────────────────────────────────────
-- Stamps last_stipend_at on the user's wallet row, creating the
-- row if it doesn't exist. Atomic, RLS-bypassing — replaces the
-- direct upsert in spiceStipend.js that was 403ing.
CREATE OR REPLACE FUNCTION public.mark_stipend_granted(p_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stamped_at timestamptz := now();
BEGIN
  INSERT INTO spice_wallets (user_id, last_stipend_at)
  VALUES (p_user_id, stamped_at)
  ON CONFLICT (user_id) DO UPDATE SET
    last_stipend_at = stamped_at,
    updated_at = stamped_at;
  RETURN stamped_at;
END;
$$;

-- ── add_guild_spice ──────────────────────────────────────────
-- Guild treasury credit + audit row, atomic. Audit row is
-- guild-attributed (user_id = NULL, guild_id set).
CREATE OR REPLACE FUNCTION public.add_guild_spice(
  p_guild_id    uuid,
  p_amount      bigint,
  p_type        text DEFAULT 'guild_stipend',
  p_description text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'add_guild_spice: amount must be positive';
  END IF;

  INSERT INTO guild_spice_wallets (guild_id, balance, lifetime_total)
  VALUES (p_guild_id, p_amount, p_amount)
  ON CONFLICT (guild_id) DO UPDATE SET
    balance = guild_spice_wallets.balance + p_amount,
    lifetime_total = guild_spice_wallets.lifetime_total + p_amount,
    updated_at = now()
  RETURNING balance INTO new_balance;

  INSERT INTO spice_transactions (
    user_id, guild_id, amount, balance_after, transaction_type, description
  ) VALUES (
    NULL, p_guild_id, p_amount, new_balance, p_type, p_description
  );

  RETURN new_balance;
END;
$$;

-- ── spend_guild_spice ────────────────────────────────────────
-- Guild treasury debit + audit row, atomic.
CREATE OR REPLACE FUNCTION public.spend_guild_spice(
  p_guild_id    uuid,
  p_amount      bigint,
  p_type        text DEFAULT 'item_purchase',
  p_description text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance bigint;
  new_balance     bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'spend_guild_spice: amount must be positive';
  END IF;

  SELECT balance INTO current_balance
    FROM guild_spice_wallets WHERE guild_id = p_guild_id
    FOR UPDATE;

  IF current_balance IS NULL OR current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient Spice in Guild Wallet';
  END IF;

  UPDATE guild_spice_wallets SET
    balance = balance - p_amount,
    updated_at = now()
  WHERE guild_id = p_guild_id
  RETURNING balance INTO new_balance;

  INSERT INTO spice_transactions (
    user_id, guild_id, amount, balance_after, transaction_type, description
  ) VALUES (
    NULL, p_guild_id, -p_amount, new_balance, p_type, p_description
  );

  RETURN new_balance;
END;
$$;

-- ── Drop direct INSERT / UPDATE policies on spice_wallets and
--    spice_transactions. All writes route through the RPCs
--    above. SELECT policies are intentionally untouched.
DROP POLICY IF EXISTS "users_insert_own_wallet"       ON public.spice_wallets;
DROP POLICY IF EXISTS "users_update_own_wallet"       ON public.spice_wallets;
DROP POLICY IF EXISTS "users_insert_own_transactions" ON public.spice_transactions;

NOTIFY pgrst, 'reload schema';
