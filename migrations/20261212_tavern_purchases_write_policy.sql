-- ═════════════════════════════════════════════════════════════
--   Tavern marketplace — tavern_purchases write policy
--
--   Bug: tavern_purchases had RLS enabled but only a SELECT
--   policy (users_read_own_purchases). Every buy from the
--   marketplace failed at the ownership-row INSERT in
--   src/lib/tavernClient.js:127 because Postgres rejected the
--   row with "new row violates row-level security policy".
--
--   Worse: spend_spice runs FIRST and is SECURITY DEFINER, so
--   the buyer's wallet was already debited by the time the
--   insert was rejected. Buyer paid, got nothing, no rollback.
--
--   Latent since 20261106_tavern_items.sql. Surfaced when
--   b4374f2 (alpha welcome gift) gave every signup 10K spice —
--   testers immediately tried to spend it, exposing the gap.
--
--   Phase4D commit 3 (20261207_spice_wallet_write_policies.sql)
--   patched the same family of bug for spice_wallets and
--   spice_transactions but missed tavern_purchases. This is the
--   follow-up.
--
--   Idempotent. Apply via Supabase dashboard SQL editor.
-- ═════════════════════════════════════════════════════════════

-- Personal AND guild buys both write user_id = buyer here
-- (with guild_id populated alongside for the guild path), so
-- auth.uid() = user_id covers every legitimate insert without
-- needing a second policy for guild purchases.
DROP POLICY IF EXISTS "users_insert_own_purchases" ON public.tavern_purchases;
CREATE POLICY "users_insert_own_purchases" ON public.tavern_purchases
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- No UPDATE / DELETE policy on purpose. Tavern purchases are
-- append-only — there is no client-driven refund or revoke
-- flow. A future refund feature would route through a
-- SECURITY DEFINER RPC that bypasses RLS, so it does not need
-- a client-facing UPDATE policy here.

NOTIFY pgrst, 'reload schema';
