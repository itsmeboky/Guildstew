-- ═════════════════════════════════════════════════════════════
--   Guildstew — comment threading (#Phase4D commit 4)
--
--   Adds parent_comment_id to both comment tables so the UI can
--   render reply-to-comment threads one level deep. ON DELETE
--   CASCADE so a deleted parent comment takes its replies with
--   it (the alternative — orphaned replies pointing at a deleted
--   parent — leaves dead threads in the UI).
--
--   One level deep only — the UI doesn't recurse, so a reply to
--   a reply still files under the original parent. Twitter-style
--   infinite nesting becomes unreadable in this UI footprint.
--
--   Idempotent. Apply via Supabase dashboard SQL editor.
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.world_lore_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid
    REFERENCES public.world_lore_comments(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_update_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid
    REFERENCES public.campaign_update_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS world_lore_comments_parent_idx
  ON public.world_lore_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS campaign_update_comments_parent_idx
  ON public.campaign_update_comments(parent_comment_id);

NOTIFY pgrst, 'reload schema';
