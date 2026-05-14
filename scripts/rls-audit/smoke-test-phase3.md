# Smoke Test — Phase 3 RLS (User-Owned Data)

Six tables across two risk tiers. Test Sections 1–5 quickly (empty tables),
then test Section 6 (characters) thoroughly.

## Prerequisites

- GM account (Boky)
- Player account that is a member of one of Boky's campaigns
- Third account that is NOT in any of Boky's campaigns
- Browser dev tools, Network tab visible

---

## Sections 1–5 — Empty Tables (Fast Pass)

These tables are empty, so the test is mostly "can the app still write to them."

### 1. achievements
- Trigger something in the app that would normally award an achievement
- Expected: works (service_role path bypasses RLS)
- If no achievement-awarding action exists yet: just verify the achievements
  page loads with empty state

### 2. player_diaries
- Open a campaign as a player, write a diary entry, save
- Expected: saves successfully
- Log in as a different player in the same campaign — should NOT see the diary
- Log in as the campaign GM — should NOT see the diary (this is by design)

### 3. player_notes
- Open a campaign, create a player note, save
- Expected: saves successfully
- Verify in the same way as diaries — note is private to author only

### 4. user_owned_effects
- Open the marketplace / cosmetics page
- Verify owned effects display (or empty state if you own none)
- If you have a way to test a purchase, do it — should succeed via webhook path

### 5. session_reminders
- Set a session reminder on a campaign
- Expected: saves successfully
- Other users in the campaign do NOT see your personal reminders

---

## Section 6 — characters (THOROUGH TEST)

This is where things can go wrong. Walk through every test.

### 6.1 GM sees own campaign's characters ✓
- Log in as Boky
- Open one of your campaigns
- Open the player panel / party view
- Expected: all 25 (or however many) characters in that campaign appear
- Open a character sheet — works as before

### 6.2 GM can edit any character in own campaign ✓
- Edit HP, conditions, or inventory on a player's character
- Expected: saves without error

### 6.3 Player sees own + party characters in their campaign ✓
- Log in as a player account
- Open the campaign they're in
- Expected: see own character AND other party members' characters
- This matters for party UI, combat, dice rolling, etc.

### 6.4 Player can edit own character ✓
- Same session
- Edit your character (HP, attributes, etc.)
- Expected: saves without error

### 6.5 Player cannot edit OTHER players' characters ✗ should FAIL
- Same session
- Try to update another party member's character via browser console:
  \`\`\`js
  // Get someone else's character ID first
  const { data: others } = await window.supabase
    .from('characters')
    .select('id, name, user_id')
    .neq('user_id', (await window.supabase.auth.getUser()).data.user.id)
    .limit(1);
  console.log(others);

  // Try to update it
  const { error } = await window.supabase
    .from('characters')
    .update({ name: 'HACKED' })
    .eq('id', others[0].id);
  console.log(error);
  \`\`\`
- Expected: 0 rows affected OR explicit error. The name does NOT change.

### 6.6 Non-member cannot see campaign characters ✗ should FAIL
- Log out, log in as the third account (not in any of Boky's campaigns)
- Browser console:
  \`\`\`js
  const { data } = await window.supabase.from('characters').select('*');
  console.log(data.length);
  \`\`\`
- Expected: only see characters where this user is the owner (likely 0)

### 6.7 Library characters stay private ✓
- Log in as any account
- Browser console:
  \`\`\`js
  const { data } = await window.supabase
    .from('characters')
    .select('id, name, campaign_id, user_id')
    .is('campaign_id', null);
  console.log(data);
  \`\`\`
- Expected: only YOUR library characters (none belonging to others)

### 6.8 Character creation still works ✓
- Create a new character (whatever path your app uses)
- Expected: succeeds, character belongs to current user
- Verify user_id was set to auth.uid() automatically

### 6.9 Logged-out users see no characters ✗
- Log out completely
- Browser console:
  \`\`\`js
  const { data } = await window.supabase.from('characters').select('*');
  console.log(data);
  \`\`\`
- Expected: empty array

---

## If anything breaks

Per table rollback:

\`\`\`sql
ALTER TABLE public.<table_name> DISABLE ROW LEVEL SECURITY;
\`\`\`

Most likely failure mode for `characters`:

- **Combat queue empty when it shouldn't be:** the combat engine might
  be querying characters in a way that doesn't match the new policies.
  Check for queries that don't filter by `campaign_id` properly.
- **Player can't see their own character mid-combat:** their session
  might be losing the auth context. Check JWT refresh.
- **GM panel shows zero characters:** the policy join through `campaigns`
  is failing. Verify `campaigns.game_master_id` matches `auth.uid()`
  exactly (UUID format, no casting issues).

## After all sections pass

- Mark Phase 3 complete
- Phase 4 next: rewrite `user_profiles` permit-all policies + enable RLS
  (HIGH RISK — touches every page in the app)
