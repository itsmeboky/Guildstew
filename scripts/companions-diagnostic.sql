-- ============================================================================
-- Companions diagnostic — surface orphan rows where campaign_id is missing
-- ============================================================================
--
-- The campaign panel's Companions bar now reads from the `companions` table
-- filtered by campaign_id. Rows with a NULL campaign_id won't render.
--
-- This query surfaces those rows alongside the character's campaign_id so
-- Boky can decide whether to backfill.
-- ----------------------------------------------------------------------------

SELECT
  c.id,
  c.name,
  c.character_id,
  c.campaign_id,
  ch.campaign_id AS character_campaign_id,
  ch.name AS character_name
FROM companions c
LEFT JOIN characters ch ON ch.id = c.character_id
ORDER BY c.created_at DESC NULLS LAST
LIMIT 20;


-- ============================================================================
-- Backfill (do NOT run blind — review the SELECT above first)
-- ============================================================================
-- If the diagnostic shows companions with NULL campaign_id but a populated
-- character_campaign_id, the following copies the character's campaign down
-- onto the companion row so it shows up in the bar.
--
-- UPDATE companions c
-- SET campaign_id = ch.campaign_id
-- FROM characters ch
-- WHERE c.character_id = ch.id
--   AND c.campaign_id IS NULL
--   AND ch.campaign_id IS NOT NULL;
-- ============================================================================
