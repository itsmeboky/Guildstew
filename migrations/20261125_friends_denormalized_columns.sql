-- ═════════════════════════════════════════════════════════════
--   Guildstew — friends table denormalized columns.
--
--   The application code in src/pages/Friends.jsx (and SetupFriends,
--   UserProfile, YourProfile, CampaignInvite) writes and reads four
--   denormalized fields on every friends row so the friend list can
--   render without JOINing user_profiles for every entry:
--
--     user_username    — the requesting user's display name
--     user_avatar      — their avatar URL
--     friend_username  — the friend's display name
--     friend_avatar    — their avatar URL
--
--   None of the existing 39 versioned migrations on `friends` ever
--   added these columns — the table appears to have been created
--   outside this migration history (likely via dashboard SQL editor
--   during the Base44 → Supabase migration). Result: every
--   `Friend.create({...})` call has been failing with PostgREST
--   400 "Could not find the 'friend_avatar' column of 'friends' in
--   the schema cache".
--
--   This migration:
--     1. Adds the four columns idempotently.
--     2. Backfills existing rows from user_profiles where possible.
--     3. Tells PostgREST to reload its schema cache so the new
--        columns become visible to the REST API immediately.
--
--   Idempotent — every statement is safe to re-run.
--
--   Apply via Supabase dashboard SQL editor (this repo's migration
--   history is not auto-applied; existing files under migrations/
--   are run manually by the project owner).
-- ═════════════════════════════════════════════════════════════

-- ── 1. Add the denormalized columns ──────────────────────────
ALTER TABLE public.friends
  ADD COLUMN IF NOT EXISTS user_username    text,
  ADD COLUMN IF NOT EXISTS user_avatar      text,
  ADD COLUMN IF NOT EXISTS friend_username  text,
  ADD COLUMN IF NOT EXISTS friend_avatar    text;

-- ── 2. Backfill from user_profiles ───────────────────────────
-- user_profiles.user_id is the auth.users id (same FK basis as
-- friends.user_id and friends.friend_id). Username falls back from
-- `username` to the local-part of the email so legacy rows without
-- a username still get a non-null backfill where possible.
UPDATE public.friends f
SET
  user_username = COALESCE(
    NULLIF(up_user.username, ''),
    split_part(up_user.email, '@', 1)
  ),
  user_avatar   = up_user.avatar_url,
  friend_username = COALESCE(
    NULLIF(up_friend.username, ''),
    split_part(up_friend.email, '@', 1)
  ),
  friend_avatar = up_friend.avatar_url
FROM public.user_profiles up_user,
     public.user_profiles up_friend
WHERE up_user.user_id = f.user_id
  AND up_friend.user_id = f.friend_id
  AND (
    f.user_username IS NULL
    OR f.user_avatar IS NULL
    OR f.friend_username IS NULL
    OR f.friend_avatar IS NULL
  );

-- ── 3. Reload PostgREST schema cache ─────────────────────────
-- Without this, the new columns may not appear in PostgREST's
-- introspection until the service restarts or hits its periodic
-- refresh interval. NOTIFY makes them visible immediately.
NOTIFY pgrst, 'reload schema';
