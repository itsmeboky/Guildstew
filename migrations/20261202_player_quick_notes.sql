-- ═════════════════════════════════════════════════════════════
--   Guildstew — player Quick Notes (#11 commit 3)
--
--   Adds JSONB column on campaigns keyed by user_id so each
--   player has their own scratch pad inside the session sidebar,
--   parallel to the GM's `gm_quick_notes` text column. JSONB
--   keeps it as a single column (no extra table / RLS surface)
--   while still being per-user isolated. Default {} means
--   readers see an empty note for any user_id without a key.
--
--   Idempotent. Apply via Supabase dashboard SQL editor.
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS player_quick_notes jsonb NOT NULL DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
