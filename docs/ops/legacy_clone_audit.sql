-- ═══════════════════════════════════════════════════════════════
--   READ-ONLY AUDIT — at-risk legacy campaign characters
--   (NOT a migration. Makes no changes. Run in the Supabase SQL editor.)
--
--   Lists character rows that predate the clone-on-join model: a
--   campaign_id is stamped but there is NO link back to a library
--   original (source_character_id IS NULL). The legacy in-place attach
--   flow mutated the library row directly, so these rows are the
--   player's SOLE copy — there is no separate library version.
--
--   The clone-on-join kick code intentionally REFUSES to delete these
--   (deleting would destroy the player's only character; nulling
--   campaign_id 403s under the campaign-GM UPDATE policy's WITH CHECK).
--   They must be reset out-of-band.
--
--   ACTION: review this list and reset the affected campaigns from the
--   dashboard (service role) BEFORE deploying the clone-on-join kick.
--   Do NOT auto-migrate — the "original" is ambiguous, so an automated
--   clone-and-detach can mislabel or destroy data.
--
--   (Genuine clones — is_campaign_copy = true AND source_character_id
--   IS NOT NULL — are safe and are NOT listed here.)
-- ═══════════════════════════════════════════════════════════════

SELECT
  c.id                  AS character_id,
  c.name                AS character_name,
  c.is_campaign_copy,
  c.source_character_id,                       -- NULL = the at-risk signal
  c.campaign_id,
  COALESCE(camp.title, camp.name) AS campaign,
  camp.game_master_id,
  c.user_id             AS owner_user_id,
  c.created_by          AS owner_email,
  c.updated_at
FROM public.characters c
LEFT JOIN public.campaigns camp ON camp.id = c.campaign_id
WHERE c.campaign_id IS NOT NULL
  AND c.source_character_id IS NULL
ORDER BY camp.id, c.updated_at DESC;
