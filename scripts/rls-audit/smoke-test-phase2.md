# Smoke Test — Phase 2 RLS (Billing, Admin, Social)

Run after applying the Phase 2 migration. Test each section independently —
if one breaks, roll back just that table.

## Prerequisites

- Your GM account (Boky — also an admin)
- A second non-admin account (a real player account)
- A third account that is NOT in any of the first two's friends/campaigns
- Browser dev tools open, Network tab visible

---

## Section 1 — subscriptions

### 1.1 User reads own subscription ✓
- Log in as account A
- Open the Settings or Billing page where tier/subscription info displays
- Expected: your tier shows correctly, no errors

### 1.2 User cannot read other users' subscriptions ✓
- Same session
- Open browser console:
  \`\`\`js
  const { data, error } = await window.supabase
    .from('subscriptions').select('*')
  console.log(data, error)
  \`\`\`
- Expected: `data` contains ONLY your own row (1 entry max), or empty array

### 1.3 Stripe webhook still works ✓
- (If you have a way to trigger a test webhook — sandbox subscription
  upgrade, cancellation, etc.)
- Expected: subscription row updates as before (service_role bypasses RLS)

### 1.4 Client cannot write directly ✗ should FAIL
- Browser console:
  \`\`\`js
  await window.supabase.from('subscriptions').insert({
    user_id: (await window.supabase.auth.getUser()).data.user.id,
    tier: 'guild'
  })
  \`\`\`
- Expected: 403 / RLS violation error

---

## Section 2 — analytics_events

### 2.1 Authenticated user inserts events ✓
- Log in as account A
- Navigate around the app — pages that emit analytics should still work
- Expected: no 403s in network tab on analytics POSTs

### 2.2 User cannot read analytics ✗ should return nothing
- Browser console:
  \`\`\`js
  const { data } = await window.supabase
    .from('analytics_events').select('*').limit(10)
  console.log(data)
  \`\`\`
- Expected: empty array (RLS silently filters everything out)

### 2.3 Anonymous events ⚠️
- Log out completely
- Trigger any analytics-emitting action (page view on landing)
- Expected outcome depends on your code:
  - If your code conditionally skips analytics for logged-out users → fine
  - If it tries to fire events with `user_id: null` from anon → 403
- If broken: add this policy and re-test:
  \`\`\`sql
  CREATE POLICY "anon_insert_events" ON public.analytics_events
    FOR INSERT TO anon WITH CHECK (user_id IS NULL);
  \`\`\`

---

## Section 3 — admin_actions

### 3.1 Admin reads admin_actions ✓
- Log in as your admin account
- Open the admin moderation panel (ReportsModerationTab)
- Expected: any existing admin action history displays

### 3.2 Admin writes admin_actions ✓
- Trigger an admin action (reject a homebrew, dismiss a report, etc.)
- Expected: action logs to admin_actions, no 403

### 3.3 Non-admin cannot read or write ✗ should FAIL
- Log in as the non-admin account
- Browser console:
  \`\`\`js
  const { data, error } = await window.supabase
    .from('admin_actions').select('*')
  console.log(data, error)
  \`\`\`
- Expected: empty array (no admin policy match = no rows)

---

## Section 4 — friends

### 4.1 User sees own friend list ✓
- Log in as account A
- Open friends list page
- Expected: existing friendships display normally

### 4.2 User adds a friend ✓
- Send/accept a friend request to account B
- Expected: friendship row created, both accounts see it

### 4.3 User cannot see strangers' friend rows ✗ should FAIL
- Log in as account C (not friends with A or B)
- Browser console:
  \`\`\`js
  const { data } = await window.supabase.from('friends').select('*')
  console.log(data)
  \`\`\`
- Expected: only rows where account C is on either side (likely 0)

### 4.4 User removes a friend ✓
- Account A unfriends account B
- Expected: friendship row deleted, both sides updated

---

## Section 5 — cashout_requests (already RLS-on, sanity check)

### 5.1 User sees own cashouts ✓
- Log in as a creator with cashout history (if any exist)
- Expected: own cashout requests visible

### 5.2 Verify no missing policies
- In Supabase SQL Editor:
  \`\`\`sql
  SELECT policyname, cmd FROM pg_policies
  WHERE tablename = 'cashout_requests';
  \`\`\`
- Current policies cover SELECT + INSERT only. No UPDATE/DELETE policy
  exists, which means users can't modify their own cashouts after
  submission (intentional).
- ⚠️ No admin SELECT policy either — admin cashout management must go
  through service_role (Edge Function) or a new admin policy needs
  adding. Flag for follow-up, not part of Phase 2.

---

## If anything breaks

Roll back just the affected table:

\`\`\`sql
ALTER TABLE public.<table_name> DISABLE ROW LEVEL SECURITY;
\`\`\`

You do NOT need to roll back all four. Each section is independent.

## After all sections pass

- Mark Phase 2 complete
- Move to Phase 3 (user-owned data: characters, messages, player_diaries, etc.)
