# Smoke Test — world_lore_entries RLS Enable

Run through this checklist in the browser after applying the migration.
All tests should pass before moving on to Phase 2.

## Prerequisites

- A campaign you own as GM (has world lore entries)
- A second account that is a player in that campaign
- A third account that is NOT in the campaign at all
- Browser dev tools open (Network tab) to spot 403s

## Tests

### 1. GM reads world lore ✓ should succeed
- Log in as the GM
- Open the campaign
- Navigate to World Lore
- Expected: all entries visible

### 2. GM creates world lore ✓ should succeed
- Same session as Test 1
- Create a new entry, save
- Expected: entry saves without error, appears in list
- Network tab: 201 Created, no 403

### 3. GM edits world lore ✓ should succeed
- Edit any entry, save
- Expected: update succeeds

### 4. GM deletes world lore ✓ should succeed
- Delete a test entry
- Expected: delete succeeds, entry disappears

### 5. Player reads world lore ✓ should succeed
- Log out, log in as the player account
- Open the same campaign
- Expected: world lore entries visible (read-only)

### 6. Player tries to create world lore ✗ should FAIL
- Same session as Test 5
- If the UI lets them attempt a create (it shouldn't, but if it does):
- Expected: 403 Forbidden in network tab, error toast in UI

### 7. Non-member tries to read world lore ✗ should FAIL
- Log out, log in as the third account
- Try to access the campaign's world lore directly via URL
- Expected: empty list OR access denied (depends on UI)
- The Supabase query returns 0 rows — RLS filters them out silently

### 8. Anon (logged out) tries to read world lore ✗ should FAIL
- Log out entirely
- Try to access world lore via direct URL
- Expected: empty list / redirect to login

## If a test fails

Roll back immediately:

\`\`\`sql
ALTER TABLE public.world_lore_entries DISABLE ROW LEVEL SECURITY;
\`\`\`

Then debug. Most likely culprits:
- A code path doing reads without a signed-in session
- An RPC function that bypasses RLS (uncommon for this table)
- A query joining through `world_lore_entries` that suddenly returns 0 rows

## After all tests pass

- Mark Phase 1 complete in the rollout plan
- Move on to Phase 2 (billing/admin tables)
