/**
 * Single source of truth for the campaign-clone ROW SHAPE.
 *
 * Joining a campaign clones a player's library character into a
 * campaign-owned `characters` row (the clone plays/levels/dies; the library
 * original stays pristine). Two paths create that row:
 *   - the lobby attach path (CharacterPickerView.cloneMutation) inserts as
 *     the PLAYER (owner INSERT policy);
 *   - the application-accept path (campaignApplications.cloneCharacterForCampaign)
 *     inserts as the GM (campaign-GM INSERT policy).
 *
 * The INSERT differs per path (different auth / client), but the row shape
 * must not drift — so both build the payload here. This is the lobby path's
 * proven construction, lifted verbatim: strip id / timestamps / session-lock
 * (so no stale play state rides in), set campaign_id / is_campaign_copy /
 * source_character_id, and preserve user_id + created_by (so the player's
 * own-character lookup — created_by + campaign_id — finds the clone).
 *
 * Locked by cloneCharacterRow.test.js so the shape can't silently change.
 */
export function buildCampaignCloneRow(sourceRow, { campaignId }) {
  const {
    id: _id,
    created_at: _createdAt,
    updated_at: _updatedAt,
    last_played: _lastPlayed,
    active_session_id: _activeSessionId,
    ...rest
  } = sourceRow;

  return {
    ...rest,
    campaign_id: campaignId,
    is_campaign_copy: true,
    source_character_id: sourceRow.id,
    active_session_id: null,
    last_played: null,
  };
}

/**
 * A row is a PROVABLE campaign clone — safe for the GM to delete on kick —
 * only when it's flagged a campaign copy AND links back to a library source.
 * Legacy in-place rows (pre-clone-model) carry is_campaign_copy = true from
 * the 20261128 backfill but source_character_id IS NULL, so they fail this
 * and must never be deleted by the kick. (source_character_id has ON DELETE
 * SET NULL, so a non-null value also proves the source row still exists.)
 */
export function isProvableClone(row) {
  return !!row && row.is_campaign_copy === true && row.source_character_id != null;
}
