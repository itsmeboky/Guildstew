# Smoke Test — Phase 5 RLS (campaigns)

This is the highest blast-radius phase since user_profiles. Enabling RLS on
campaigns causes existing policies on world_lore_entries, characters,
campaign_conditions, campaign_bans, and campaign_applications to start
filtering their subqueries through the campaigns policy.

If campaigns RLS is wrong, those tables silently return zero rows even
though their own policies are correct.

## Prerequisites

- Boky's GM/admin account
- A non-admin player account that is in at least one of Boky's campaigns
  (verify via the player_ids column before testing)
- A third "stranger" account that is in zero campaigns
- Browser dev tools, Network tab visible

---

## Tier 1 — Does the app still work? (do these FIRST)

### 1.1 App loads after login ✓
- Hard refresh as Boky
- Expected: dashboard loads, your campaigns list populates
- If dashboard is empty or shows "no campaigns" when you have 14 → the
  members_read_campaigns policy isn't matching. ROLL BACK.

### 1.2 Dashboard shows correct campaign count ✓
- Boky should see 14 campaigns (or however many she owns + is in as player)
- Non-admin player account should see only campaigns where they're GM or
  in player_ids
- Stranger account should see zero campaigns

### 1.3 Opening a specific campaign works ✓
- Click into any campaign as Boky
- Expected: campaign page loads completely
- Character panel, world lore, npcs, all the side content displays
- If any sub-section is empty or 404s → its policy's subquery into
  campaigns is returning nothing, which means our campaigns SELECT
  policy isn't matching for this combination

### 1.4 Phase 1–3 RLS'd tables still return data ✓
This is the cascade test. All of these subquery into campaigns:

- **world_lore_entries:** open a campaign, view world lore → should populate
- **characters:** open a campaign, view party panel → should show all
  party members
- **campaign_conditions:** start combat or check conditions → should work
- **campaign_installed_mods:** check installed mods → should display

If any of these go blank, the issue is campaigns RLS, not their own RLS.

---

## Tier 2 — Security checks

### 2.1 Stranger cannot read campaigns they're not in ✗ should FAIL
- Log in as stranger account
- Browser console:
  \`\`\`js
  const { data } = await window.supabase.from('campaigns').select('*');
  console.log('Visible campaigns:', data.length);
  \`\`\`
- Expected: 0 (or only campaigns where they're listed)

### 2.2 Non-GM cannot edit someone else's campaign ✗ should FAIL
- Log in as a player who's in one of Boky's campaigns (so they CAN see it)
- Browser console:
  \`\`\`js
  const { data: campaigns } = await window.supabase
    .from('campaigns')
    .select('id, name')
    .neq('game_master_id', (await window.supabase.auth.getUser()).data.user.id)
    .limit(1);

  const { data, error } = await window.supabase
    .from('campaigns')
    .update({ name: 'HACKED' })
    .eq('id', campaigns[0].id);
  console.log('Update result:', data, error);
  \`\`\`
- Expected: 0 rows affected. Refresh and confirm name is unchanged.

### 2.3 User can create a new campaign ✓
- Log in as any account
- Create a new campaign via the normal UI flow
- Expected: campaign creates, user is set as GM
- Verify in DB the new row has game_master_id matching the user

### 2.4 User cannot create a campaign with someone else as GM ✗ should FAIL
- Browser console:
  \`\`\`js
  const { data, error } = await window.supabase
    .from('campaigns')
    .insert({
      name: 'Hijacked Campaign',
      game_master_id: '00000000-0000-0000-0000-000000000000'
    });
  console.log(data, error);
  \`\`\`
- Expected: RLS violation error (the WITH CHECK clause blocks it)

### 2.5 GM cannot transfer ownership by updating game_master_id ✗ should FAIL
- As Boky, browser console:
  \`\`\`js
  const { data: ownCampaign } = await window.supabase
    .from('campaigns')
    .select('id')
    .eq('game_master_id', (await window.supabase.auth.getUser()).data.user.id)
    .limit(1);

  const { error } = await window.supabase
    .from('campaigns')
    .update({ game_master_id: '00000000-0000-0000-0000-000000000000' })
    .eq('id', ownCampaign[0].id);
  console.log(error);
  \`\`\`
- Expected: RLS violation (WITH CHECK fails on the new value)
- This prevents accidental orphaning of campaigns

---

## Tier 3 — Admin override

### 3.1 Admin can view any campaign ✓
- As Boky (admin), query a campaign you didn't create
- Expected: works (via admins_manage_campaigns)

### 3.2 Admin can edit any campaign ✓
- As Boky (admin), update a campaign owned by another user (test data only)
- Expected: works

---

## If anything in Tier 1 fails

Run immediately:

\`\`\`sql
ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;
\`\`\`

Most likely failure modes:

- **Dashboard empty / "no campaigns":** the members_read policy isn't
  matching. Check that `player_ids` data is in the expected JSONB array
  of strings format. Step 0's verification query should have caught this.
- **Some campaigns visible, others missing:** specific campaigns have
  malformed player_ids. Check the data for the missing ones.
- **World lore / characters empty inside a campaign:** that table's
  subquery into campaigns is returning nothing. The campaigns policy is
  wrong for this user/campaign combination — likely a player_ids
  containment mismatch.

## After all tiers pass

- Mark Phase 5 complete
- Phase 6 next: campaign hub tables (campaign_invitations, campaign_log_entries,
  campaign_updates, campaign_update_comments, campaign_update_reads,
  campaign_archives). All follow the same GM+members pattern that's now
  proven to work via the campaigns table.
- Phase 7 onward: bulk batch of ~25 campaign-scoped content tables, all
  cloned from the campaign_conditions template.
