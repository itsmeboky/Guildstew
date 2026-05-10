-- ═════════════════════════════════════════════════════════════
--   Guildstew — player sidebar Campaign Updates infrastructure (#11 commit 2)
--
--   Adds the comments + read-tracker tables backing the player
--   sidebar's Campaign Updates section. Player-side: read GM
--   posts, comment, edit/delete own comments. Sidebar bubble
--   badge counts unread updates and clears on view. GM
--   moderation: edit any comment, soft-delete, pin/unpin, mark
--   thread resolved.
--
--   The existing world_lore_comments table is the closest pattern
--   in the codebase, but it has only minimal columns (id,
--   entry_id, author_id, content, created_at) — no moderation
--   features. The spec needs the full toolkit, so this is genuine
--   new structure rather than a 1:1 mirror. Naming uses user_id /
--   body (per the spec's example) rather than author_id / content
--   (world_lore_comments' choice) so the new player component's
--   prop access reads naturally.
--
--   Idempotent. Apply via Supabase dashboard SQL editor.
-- ═════════════════════════════════════════════════════════════

-- ── 1. Comments table on campaign updates ────────────────────
-- FK to campaign_updates with ON DELETE CASCADE: deleting an
-- update wipes its comments. user_id FK to auth.users (consistent
-- with other tables in this codebase). is_pinned floats
-- moderator-pinned comments to top of thread; is_resolved
-- de-emphasizes resolved threads visually; is_deleted +
-- deleted_by power soft-delete (rendered as "[deleted]" placeholder
-- so threading isn't lost when a comment is removed).
CREATE TABLE IF NOT EXISTS public.campaign_update_comments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_update_id uuid NOT NULL REFERENCES public.campaign_updates(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id),
  body               text NOT NULL,
  is_pinned          boolean NOT NULL DEFAULT false,
  is_resolved        boolean NOT NULL DEFAULT false,
  is_deleted         boolean NOT NULL DEFAULT false,
  deleted_by         uuid REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_update_comments_update_id_idx
  ON public.campaign_update_comments(campaign_update_id);

-- Auto-bump updated_at on edit. Per-table trigger function to
-- match the convention in 20261127_campaign_invite_codes_and_inbox.sql
-- (campaign_invitations_set_updated_at) rather than relying on a
-- shared helper that may or may not be in this DB.
CREATE OR REPLACE FUNCTION public.campaign_update_comments_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaign_update_comments_set_updated_at ON public.campaign_update_comments;
CREATE TRIGGER campaign_update_comments_set_updated_at
  BEFORE UPDATE ON public.campaign_update_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.campaign_update_comments_set_updated_at();

-- ── 2. Read-tracker for the unread-updates bubble badge ──────
-- One row per (user, update) pair; absence = unread. The sidebar's
-- bubble count is COUNT(campaign_updates WHERE campaign_id = X)
-- minus COUNT(campaign_update_reads WHERE user_id = me).
-- Composite primary key prevents duplicate rows on re-mark.
CREATE TABLE IF NOT EXISTS public.campaign_update_reads (
  user_id            uuid NOT NULL REFERENCES auth.users(id),
  campaign_update_id uuid NOT NULL REFERENCES public.campaign_updates(id) ON DELETE CASCADE,
  read_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, campaign_update_id)
);

CREATE INDEX IF NOT EXISTS campaign_update_reads_user_id_idx
  ON public.campaign_update_reads(user_id);

-- ── 3. Reload PostgREST schema cache ─────────────────────────
NOTIFY pgrst, 'reload schema';
