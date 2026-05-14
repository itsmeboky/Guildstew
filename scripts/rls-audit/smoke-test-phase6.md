# Smoke Test — Phase 6 RLS (Campaign Hub)

The biggest concern is `campaign_log_entries` with 782 rows — that's
your live chronicle data. Tier 1 catches it.

## Prerequisites

- Boky's GM/admin account
- A non-admin player account in one of Boky's campaigns
- A stranger account not in any campaigns
- Browser dev tools open

---

## Tier 1 — Catastrophic-break checks

### 1.1 Campaign log loads inside a campaign ✓
- Open one of your campaigns with chronicle history
- Expected: all historical log entries display
- If empty when it shouldn't be → members_read_log_entries isn't matching.
  ROLL BACK campaign_log_entries.

### 1.2 Write a new log entry ✓
- Trigger something that writes to campaign_log_entries (combat action,
  manual log entry, session note, whatever your UI exposes)
- Expected: entry saves, appears in the log
- If 403 → the authors_manage_own WITH CHECK is wrong. Check that the
  insert payload sets author_id = current user.

### 1.3 Player can see GM's log entries ✓
- Log in as a player account in one of your campaigns
- Open the campaign chronicle
- Expected: see all log entries (yours and GM's and other players')

### 1.4 Player can write own log entries ✓
- Same player session
- Write a new log entry from a player action
- Expected: entry saves, author_id = the player's UUID

---

## Tier 2 — Access boundaries

### 2.1 Stranger cannot read any log entries ✗ should FAIL
- Log in as stranger
- Browser console:
  \`\`\`js
  const { data } = await window.supabase.from('campaign_log_entries').select('*');
  console.log('Visible log entries:', data.length);
  \`\`\`
- Expected: 0

### 2.2 Player cannot edit another player's log entries ✗ should FAIL
- As player A, find a log entry authored by player B
- Try to update it via console:
  \`\`\`js
  const { error } = await window.supabase
    .from('campaign_log_entries')
    .update({ description: 'HACKED' })
    .eq('id', '<entry-id>');
  \`\`\`
- Expected: 0 rows affected (own-policy doesn't match, GM-policy doesn't match)

### 2.3 Player can edit their own log entries ✓
- As player A, edit an entry they authored
- Expected: succeeds

### 2.4 GM can edit any log entry in their campaign ✓
- As GM, edit a player-authored entry
- Expected: succeeds via gm_manage_log_entries

---

## Tier 3 — Invitations

### 3.1 Verify invitee column name ✓
- The migration assumed `invited_user_id`. Confirm via:
  \`\`\`sql
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='campaign_invitations';
  \`\`\`
- If the column is named differently, the invitee policies don't match
  and you'll need a follow-up migration. Tier 3.2 will catch this.

### 3.2 Invitee sees own invitations ✓
- Log in as a user who has a pending invitation (check the 9 existing rows
  for who's invited)
- Open the invitations UI (wherever your app surfaces them)
- Expected: the invitation shows
- If empty → the invitee column name is wrong. Drop the bad policies,
  recreate with the correct name.

### 3.3 Invitee can accept/decline ✓
- Same session — respond to the invitation
- Expected: status updates, no 403

### 3.4 GM sees invitations they sent ✓
- As GM, view invitations panel for own campaign
- Expected: all 9 (or however many) display

### 3.5 Random user cannot see strangers' invitations ✗
- As stranger account, query campaign_invitations directly
- Expected: 0 rows

---

## Tier 4 — Updates feed + comments

### 4.1 Campaign updates display ✓
- Open the campaign's update feed
- Expected: the 1 existing update displays for members
- Non-members: see nothing

### 4.2 New update can be posted ✓
- Post a new update via the UI
- Expected: saves, appears in feed

### 4.3 Comments on updates ✓
- Add a comment on an update
- Expected: saves, displays under the update
- Other members of the campaign can see it
- Non-members can't

---

## Tier 5 — Archives + reads (the empty/sparse tables)

### 5.1 Archives table writable by GM ✓
- (If your UI exposes archive functionality) archive something as GM
- Expected: succeeds
- Non-GM trying to archive: should fail

### 5.2 Read receipts work ✓
- As any account, mark an update as read (if UI supports it)
- Expected: row inserts in campaign_update_reads with user_id = self
- That user only sees their own read receipts, not other users'

---

## If anything in Tier 1 fails

Roll back the specific table:

\`\`\`sql
ALTER TABLE public.campaign_log_entries DISABLE ROW LEVEL SECURITY;
\`\`\`

You do NOT need to roll back the whole phase. Each table is independent
(except the campaign_update_comments → campaign_updates dependency —
if you roll back updates, comments are filtered through nothing and
might break).

## After all tiers pass

- Mark Phase 6 complete
- Phase 7 next: the bulk batch of ~25 campaign-scoped content tables.
  All clone the same pattern. Should be faster — same policies, more
  tables.
