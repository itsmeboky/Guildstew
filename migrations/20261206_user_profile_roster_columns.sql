-- ═════════════════════════════════════════════════════════════
--   Guildstew — backfill user_profiles columns referenced by
--   the sidebar roster (#Phase4D commit 2)
--
--   The FriendsSidebarPanel selects favorite_class,
--   favorite_class_icon, last_seen_at, and tagline from
--   user_profiles. Three of those columns are not in any
--   migration in the repo, so the SELECT 400s on every page
--   load — PostgREST rejects the request with "column does not
--   exist" before RLS even runs. (display_title and status are
--   already covered by 20261115_schema_fixes.sql.)
--
--   Adding the columns idempotently is safer than removing them
--   from the select (they're rendered in the tooltip, removing
--   them would silently drop the favorite-class chip + bio
--   tagline from the roster). If the columns happen to exist on
--   the prod DB but were never migrated in code, ADD COLUMN IF
--   NOT EXISTS is a no-op.
--
--   No new column on subscriptions: that table is governed by
--   the billing Edge Function and may not exist locally. The
--   billingClient already wraps its queries in try/catch with a
--   free-tier fallback, so 400s there are cosmetic. Tracked as
--   a smell to revisit when the billing function deploys.
--
--   Idempotent. Apply via Supabase dashboard SQL editor.
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS favorite_class text,
  ADD COLUMN IF NOT EXISTS favorite_class_icon text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

NOTIFY pgrst, 'reload schema';
