-- ═════════════════════════════════════════════════════════════
--   Guildstew — drop dead player_quick_notes JSONB (#11-followup-1)
--
--   #11 commit 3 added a per-user JSONB blob on campaigns for the
--   player Quick Notes editor. That was the wrong save target —
--   Quick Notes is the write surface for the existing player_notes
--   table (which Adventuring Party's Notes tab already reads from).
--   The editor moved to its own sidebar nav item + writes to
--   player_notes via PlayerNote.create.
--
--   The JSONB column is now dead: the only writer was the editor
--   we just relocated, no readers existed outside that editor.
--   Drop it to keep the schema honest.
--
--   Idempotent. Apply via Supabase dashboard SQL editor.
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.campaigns
  DROP COLUMN IF EXISTS player_quick_notes;

NOTIFY pgrst, 'reload schema';
