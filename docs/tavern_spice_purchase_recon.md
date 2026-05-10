# Tavern Spice Purchase — Audit Recon

**Status:** Root cause identified. Recon-only commit. Fix in Commit 2.

**Symptom:** Player tries to buy a Tavern marketplace item with spice → error.
The buyer's spice wallet is debited but the item ownership row is never written,
so the buy "fails" while still costing the user spice.

---

## Root cause

`tavern_purchases` has Row-Level Security enabled but **no INSERT policy**.

- `migrations/20261106_tavern_items.sql:65` — `ALTER TABLE tavern_purchases ENABLE ROW LEVEL SECURITY;`
- `migrations/20261106_tavern_items.sql:76-77` — only policy on the table is `users_read_own_purchases` (SELECT).
- No INSERT, UPDATE, or DELETE policy exists.

When `purchaseItem()` runs the ownership-row insert at
`src/lib/tavernClient.js:127-132`:

```js
const { error: purchaseErr } = await supabase.from("tavern_purchases").insert({
  user_id: buyerUserId,
  guild_id: guildId,
  item_id: item.id,
  price_paid: discounted,
});
```

…Postgres RLS rejects the row with
`new row violates row-level security policy for table "tavern_purchases"`.

The error message doesn't match `/duplicate|unique/i` so the next line throws
(`tavernClient.js:134-136`). The throw propagates back through the mutation in
`src/components/tavern/PurchaseConfirmDialog.jsx:80` → `onError` → toast (or, if
the message renders inside something fragile, the page-level ErrorBoundary).

## Why the buyer is debited anyway

`purchaseItem()` runs in this order (`src/lib/tavernClient.js:92-146`):

1. `spendSpice(buyerUserId, …)` → calls `supabase.rpc("spend_spice")` which is
   `SECURITY DEFINER` (`migrations/20261105_spice_currency.sql:66-86`). Bypasses
   RLS. **Buyer's wallet is debited and a ledger row is written. Irreversibly.**
2. `addSpice(creatorId, …)` for the creator's share, wrapped in `.catch(() => {})`
   so seller-credit failures are silently swallowed (line 117).
3. `recordCreatorSale(creatorId)` — internally try/catch, non-fatal.
4. **`tavern_purchases` insert — RLS rejects → throw.**

So the spend happens at step 1, the failure happens at step 4. There is no
rollback. The user's 10,000-spice welcome gift evaporates one purchase at a
time with no compensating credit.

## Why this manifests *now*

Latent since `20261106` (the original Tavern migration in early Nov). It only
started biting users when `b4374f2 feat(alpha): welcome modal with 10K spice
gift` (May 10) gave every signup 10K spice. Before that, free-tier users
typically had no spice to spend, so they never reached the point where this
RLS rejection mattered.

The welcome gift didn't introduce the bug — it exposed it.

## Adjacent context I checked and ruled out

| # | Diagnosis | Status | Evidence |
|---|---|---|---|
| A | Alpha gate is too broad | ❌ Ruled out | `ALPHA_PURCHASES_DISABLED` is a local constant in `src/components/tavern/SpiceEmporium.jsx:44`. `git show e31908d --stat` confirms it touches only that one file (118 lines, all in SpiceEmporium). It cannot affect Tavern marketplace purchases. The user prompt's claim that "Alpha C2 commit gated `addSpice` with `type='purchase'`" is **incorrect** — `addSpice` was not modified. |
| B | RLS rejects seller-credit | ❌ Different failure than reported | The seller-credit *would* hit a similar RLS issue on `spice_transactions` (the creator's ledger row has `user_id = creatorId ≠ auth.uid()` and the policy at `20261207_spice_wallet_write_policies.sql:60-63` only allows self-rows or `user_id IS NULL`), but that call is wrapped in `.catch(() => {})` at `tavernClient.js:117` so it's silently swallowed. Symptom would be a missing creator ledger row, not a buyer error. **However**, the actual bug *is* an RLS rejection on a write — just on `tavern_purchases` instead of `spice_transactions`. So this is the right family of diagnosis, wrong table. |
| C | Missing RPC | ❌ Ruled out | `add_spice` and `spend_spice` both exist in `migrations/20261105_spice_currency.sql:46,66`. Signatures match the JS callers. |
| D | Schema drift on `spice_transactions.transaction_type` | ❌ Ruled out | The column is `TEXT NOT NULL` with no CHECK constraint (`20261105:33`). `"item_purchase"` is already used by `spendGuildSpice` (`spiceWallet.js:181`); no value rejection. |
| E | Feature not implemented | ❌ Ruled out | Full purchase flow exists end-to-end: button at `TavernItemDetailDialog.jsx:259`, dialog at `PurchaseConfirmDialog.jsx`, mutation at line 72-94, RPC pipeline at `tavernClient.js:92-146`. |

## Recommended fix (drives Commit 2)

**Single migration** mirroring the pattern of `20261207_spice_wallet_write_policies.sql`:

```sql
-- migrations/20261212_tavern_purchases_write_policy.sql
CREATE POLICY "users_insert_own_purchases" ON public.tavern_purchases
  FOR INSERT WITH CHECK (user_id = auth.uid());
```

Notes on shape:

- INSERT only. Tavern purchases are append-only — no UPDATE flow, no
  client-driven DELETE, so don't add what isn't needed. (A future refund
  feature would call a SECURITY DEFINER RPC that bypasses RLS anyway.)
- Guild purchases also need to land. The current `purchaseItem` writes
  `user_id = buyerUserId` even for guild purchases (with `guild_id` set
  alongside) so `auth.uid() = user_id` covers both paths cleanly.
- **Also** add an INSERT policy for `spice_transactions` to cover the
  creator-credit ledger row so creators get audit rows on every sale (currently
  swallowed). This is parallel scope to the buyer fix; either lump it in here
  or file as a separate small follow-up. Recommendation: lump it in — it's the
  same family of RLS gap and shipping-it-now closes the audit-trail hole.
- `NOTIFY pgrst, 'reload schema';` at the end so PostgREST picks the policy up
  without a service restart (matches `20261207`'s pattern).

## Risk assessment

- **Touches RLS policies**: yes — needs a migration applied via Supabase
  dashboard. Idempotent (CREATE POLICY guarded by DROP POLICY IF EXISTS).
- **Touches the alpha gate**: no. `ALPHA_PURCHASES_DISABLED` in
  `SpiceEmporium.jsx` is unaffected. Real-money spice purchases stay blocked.
- **Touches client mutation**: no. `tavernClient.purchaseItem` works correctly
  once the DB policy lets the insert through.
- **Touches revenue split / config**: no.
- **Touches upload flow**: no — that uses `tavern_items` which already has
  `creators_manage_items FOR ALL`.
- **Touches guild contributions**: no.
- **Backwards compatibility**: pure addition. Nothing previously worked that
  would now stop working.

## Filed smell — separate fix needed

**The purchase isn't atomic.** Even after the RLS fix lands, a transient
failure between step 1 (spend_spice) and step 4 (tavern_purchases insert) — DB
downtime, network blip, deploy mid-flight — leaves the buyer's spice debited
with no item ownership and no compensating credit. The buyer either re-buys
(double-charged) or contacts support.

Long-term shape: wrap the entire purchase flow in a `process_tavern_purchase`
SECURITY DEFINER RPC that does spend, credit, and ownership-row insert in one
transaction. Out of scope for this alpha-blocker — the RLS fix lets the happy
path work, which is what matters before invites go out. File for post-alpha.

## Verify plan for Commit 2

1. Buyer with spice → Tavern → Buy item → success, no error.
2. Buyer's wallet decremented by `applyDiscount(item.price, buyerTier)`.
3. `tavern_purchases` row exists with the buyer's `user_id` + `item_id`.
4. Creator's wallet credited per `calculateCreatorEarning(price, creator_tier)`
   (Veteran 80%, Adventurer 70%, Free 50% — canonical, untouched).
5. Insufficient balance → friendly toast, no debit, no insert.
6. Trinket's Spice Emporium still shows "Disabled for Alpha" — alpha gate intact.
7. Tavern uploads still work (independent of this fix; sanity check only).
8. Guild-wallet purchase path: same `tavern_purchases` insert with `guild_id`
   populated; INSERT policy covers it because `user_id = auth.uid()` is still
   the buyer.
