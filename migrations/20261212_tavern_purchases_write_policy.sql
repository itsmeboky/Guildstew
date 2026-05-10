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

ls -la migrations/20261212_tavern_purchases_write_policy.sql
cat migrations/20261212_tavern_purchases_write_policy.sql
git add migrations/20261212_tavern_purchases_write_policy.sql
git commit -m "fix(tavern): allow buyers to insert own purchase rows"
git push origin supabase-migration
q
:q
cat > migrations/20261212_tavern_purchases_write_policy.sql << 'EOF'
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

DROP POLICY IF EXISTS "users_insert_own_purchases" ON public.tavern_purchases;
CREATE POLICY "users_insert_own_purchases" ON public.tavern_purchases
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
