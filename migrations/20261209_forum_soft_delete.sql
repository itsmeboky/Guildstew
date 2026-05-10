-- Forum soft-delete columns.
--
-- `deleted_at` timestamps the soft delete; `deleted_by` records the
-- actor so the renderer can decide whether to show "[deleted by
-- author]" or "[deleted by admin]" (compare to author_id).
--
-- No new RLS needed: the existing `users_manage_own_threads` /
-- `users_manage_own_replies` UPDATE policies cover author deletes,
-- and `admins_manage_forum_threads` / `admins_manage_forum_replies`
-- (FOR ALL via email-domain match) cover admin deletes.
--
-- Original `content` is intentionally preserved on the row — soft
-- delete is the audit trail. A future "permanently delete" admin
-- action would null/scrub the body.

ALTER TABLE forum_threads
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE forum_replies
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
