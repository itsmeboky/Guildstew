# Smoke Test — Phase 4 RLS (user_profiles)

This is the most demanding smoke test in the audit. Run all of Tier 1 (the
catastrophic-break checks) before touching anything else. If any Tier 1
test fails, roll back immediately.

## Prerequisites

- Your GM/admin account (Boky)
- A second non-admin player account
- A third "stranger" account not connected to the first two
- A way to test anonymous browsing (incognito window)
- Browser dev tools, Network tab visible

---

## Tier 1 — Catastrophic-break checks (do these FIRST)

If any of these fail, your app is broken for users. Roll back.

### 1.1 Logged-in user can load the app ✓
- Open the app (already logged in as Boky)
- Hard refresh (Ctrl/Cmd+Shift+R)
- Expected: app loads, nav bar shows your avatar + name + Spice
- If you see "Unknown User" or the nav is missing avatar data → AuthContext
  can't fetch user_profiles, the policy is broken. ROLL BACK.

### 1.2 New login flow works ✓
- Log out completely
- Log back in
- Expected: redirected to dashboard, profile data loads, no console errors
  about user_profiles 403

### 1.3 Settings page loads and saves ✓
- Navigate to Settings
- Expected: your profile data displays correctly
- Change something trivial (tagline or pronouns), Save
- Expected: success toast, no 403 in network tab

### 1.4 Other users' profiles visible across the app ✓
Visit each of these and confirm names/avatars display correctly:
- Friends list — friend names + avatars
- Open a campaign — player list shows everyone's names/avatars
- Forum threads — author bylines render
- Blog posts (if any) — author info renders
- Character sheets — player name shows

If ANY of these show "Unknown User" or blank avatars → anon/authenticated
read policy isn't matching. ROLL BACK.

### 1.5 Anonymous users can browse public pages ✓
- Open an incognito window
- Visit `/blog` or any published blog post
- Expected: post author name + avatar visible
- Visit `/forums` and open a thread
- Expected: thread author + reply authors visible
- If author data is missing → `anyone_reads_profiles` policy didn't apply
  to anon role. ROLL BACK.

---

## Tier 2 — Security-critical checks

These confirm the policies actually prevent abuse.

### 2.1 User cannot update another user's profile ✗ should FAIL
Browser console (logged in as Boky):
\`\`\`js
// Get another user's profile id
const { data: others } = await window.supabase
  .from('user_profiles')
  .select('id, user_id, tagline')
  .neq('user_id', (await window.supabase.auth.getUser()).data.user.id)
  .limit(1);
console.log('Target:', others[0]);

// Try to overwrite their tagline
const { data, error } = await window.supabase
  .from('user_profiles')
  .update({ tagline: 'HACKED BY BOKY' })
  .eq('id', others[0].id);
console.log('Result:', data, error);
\`\`\`
Expected: empty data array, no error (RLS silently filters the update to
match 0 rows). Reload the page and confirm the target's tagline is unchanged.

### 2.2 User cannot delete another user's profile ✗ should FAIL
Same pattern with `.delete()` instead of `.update()`. Expected: 0 rows affected.

### 2.3 Anon cannot write profiles ✗ should FAIL
In incognito, browser console:
\`\`\`js
const { data, error } = await window.supabase
  .from('user_profiles')
  .insert({ user_id: '00000000-0000-0000-0000-000000000000', tagline: 'lol' });
console.log(data, error);
\`\`\`
Expected: explicit RLS violation error (anon role has no INSERT policy match).

---

## Tier 3 — App-specific flows

### 3.1 TOS reconsent gate
- If your `tos_version` is current, this is hard to trigger. Skip unless you
  bump CURRENT_TOS_VERSION temporarily.
- If you can trigger it: log in, the gate appears, click Accept, page reloads.
- Expected: profile updates, gate doesn't re-appear.

### 3.2 New user signup
- Create a fresh test account via your signup flow
- Expected: profile row gets created (either by client INSERT or by a
  database trigger) without errors
- If a trigger creates the row: triggers run as SECURITY DEFINER and bypass
  RLS, so this should work regardless
- If the client creates the row: the `users_insert_own_profile` policy
  must match (user_id = auth.uid()) at the moment of insert

### 3.3 Admin moderation flows
- Log in as Boky (admin)
- Open admin panels that read or modify user_profiles (user list, role
  assignment, ban actions)
- Expected: still works — `admins_manage_profiles` covers it

### 3.4 Cross-table admin checks still resolve
Several other policies in your DB look up admin role via
`SELECT user_id FROM user_profiles WHERE role = 'admin'`. Examples:
- `blog_posts.admins_manage_posts`
- `version_history.admins_manage_versions`

Trigger one of those admin actions (publish/edit a blog post as admin).
Expected: works, because the subquery to user_profiles still resolves under
the `anyone_reads_profiles` SELECT policy.

---

## Tier 4 — Edge cases (nice-to-have)

### 4.1 Profile color updates apply across the app
- Change your `profile_color_1` in Settings
- Visit a page where it's used (character sheet seed, etc.)
- Expected: new color renders

### 4.2 Avatar upload works
- Upload a new avatar in Settings
- Expected: storage upload succeeds, profile row updates, new avatar shows in nav
- (Storage RLS is a separate audit — for now, this is just confirming the
  profile UPDATE side works)

---

## If anything in Tier 1 fails

Run this immediately in the SQL Editor:

\`\`\`sql
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
\`\`\`

That's the fastest revert. The five new policies stay defined (dormant)
but the table is fully accessible again — same broken state you started
with, but functional. Then debug.

Most common failure modes:

- **"Unknown User" everywhere:** the `anyone_reads_profiles` policy isn't
  applying. Check that it's `USING (true)` with no role restriction.
- **Settings save 403s:** the `users_update_own_profile` policy isn't
  matching. Check `user_id = auth.uid()` — and confirm the row's `user_id`
  column actually contains the auth user's UUID (not the profile `id`).
- **Login hangs:** AuthContext is probably failing to fetch the merged
  profile. Check that the SELECT actually returns the user's row.
- **Admin actions 403:** the `admins_manage_profiles` policy depends on
  `admin_users` table. Confirm you're listed there:
  \`\`\`sql
  SELECT * FROM admin_users WHERE user_id = '<your-auth-uid>';
  \`\`\`

## After all tiers pass

- Mark Phase 4 complete — biggest hurdle in the audit cleared
- Phase 5 next: `campaigns` itself + invitations + log entries + updates.
  Big batch of campaign-scoped tables. Important because almost every
  other policy in your DB joins through `campaigns`.
