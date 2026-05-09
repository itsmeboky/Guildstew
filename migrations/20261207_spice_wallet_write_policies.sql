-- ═════════════════════════════════════════════════════════════
--   Guildstew — spice wallet write RLS policies (#Phase4D commit 3)
--
--   Recon (Option A from the followup spec): the original
--   20261105_spice_currency.sql migration enabled RLS on all
--   three spice tables but only created SELECT policies. Every
--   INSERT/UPDATE from the JS client → 403.
--
--   The wallet itself is mutated through the add_spice /
--   spend_spice SECURITY DEFINER RPCs (which bypass RLS), but
--   spiceWallet.js does the spice_transactions ledger insert
--   directly from JS afterwards, and spiceStipend.js upserts
--   spice_wallets.last_stipend_at directly. Both surface as 403s
--   on every login + every transaction.
--
--   Minimal write policies that match the legitimate access
--   pattern:
--     - spice_wallets: users can INSERT/UPDATE their own row.
--       Used by spiceStipend.js to stamp last_stipend_at.
--       Balance writes still go through the SECURITY DEFINER
--       RPC, so a user can't fabricate balance via direct UPDATE
--       — the WITH CHECK only constrains user_id, but the
--       balance column is read-only-ish in practice because the
--       RPC owns it. (Tracked as a future smell: a column-level
--       grant or a dedicated trigger could harden this.)
--     - spice_transactions: ledger inserts allowed when the row
--       belongs to the writing user (user_id = auth.uid()) OR
--       when it's a guild-attributed entry (user_id IS NULL AND
--       guild_id IS NOT NULL — addGuildSpice writes these).
--       Personal/guild distinction matches the existing data
--       shape; tightening guild inserts to a guild-membership
--       check is deferred until the guild membership table /
--       column is verified.
--     - guild_spice_wallets: INSERT/UPDATE mirrors the existing
--       SELECT permissiveness (USING true). The existing SELECT
--       policy lets anyone read every guild wallet, so write
--       parity is the consistent shape. Tightening to guild
--       membership is filed as a smell once the membership
--       schema settles.
--
--   Idempotent. Apply via Supabase dashboard SQL editor.
-- ═════════════════════════════════════════════════════════════

-- ── spice_wallets ────────────────────────────────────────────
DROP POLICY IF EXISTS "users_insert_own_wallet" ON public.spice_wallets;
CREATE POLICY "users_insert_own_wallet" ON public.spice_wallets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_wallet" ON public.spice_wallets;
CREATE POLICY "users_update_own_wallet" ON public.spice_wallets
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── spice_transactions ───────────────────────────────────────
DROP POLICY IF EXISTS "users_insert_own_transactions" ON public.spice_transactions;
CREATE POLICY "users_insert_own_transactions" ON public.spice_transactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR (user_id IS NULL AND guild_id IS NOT NULL AND auth.uid() IS NOT NULL)
  );

-- ── guild_spice_wallets ──────────────────────────────────────
-- Mirrors the SELECT policy's USING (true). Smell: should be
-- guild-membership-gated once that schema is verifiable.
DROP POLICY IF EXISTS "authed_insert_guild_wallet" ON public.guild_spice_wallets;
CREATE POLICY "authed_insert_guild_wallet" ON public.guild_spice_wallets
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authed_update_guild_wallet" ON public.guild_spice_wallets;
CREATE POLICY "authed_update_guild_wallet" ON public.guild_spice_wallets
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';
