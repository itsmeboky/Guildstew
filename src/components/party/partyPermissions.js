/**
 * Viewer-perspective helpers for the Adventuring Party panel.
 *
 * Everything in this file answers one of:
 *   - Who is the person looking at this right now?
 *   - Does that person own this character?
 *   - Are they the GM (full visibility) or a player (restricted)?
 *
 * The party panel is shared between GMs and players with different
 * permission levels. Relationships are private per character;
 * player_notes honour a visibility tag; companions and inventory
 * are shared party info.
 */

export function isUserGM(campaign, userId) {
  if (!campaign || !userId) return false;
  if (campaign.game_master_id === userId) return true;
  if (Array.isArray(campaign.co_dm_ids) && campaign.co_dm_ids.includes(userId)) return true;
  return false;
}

/**
 * True when the given character belongs to the viewing user. Legacy
 * character rows use `created_by` with an email; newer rows use
 * `user_id`. Match either so we don't lose the owner check when
 * schemas drift.
 */
export function ownsCharacter(character, user) {
  if (!character || !user) return false;
  if (character.user_id && character.user_id === user.id) return true;
  if (character.created_by && user.email && character.created_by === user.email) return true;
  return false;
}

/**
 * Notes are gm_only / public / selected. A viewer can see a note
 * when:
 *   - they're the GM, OR
 *   - they own the character (reading their own notes), OR
 *   - the note's visibility is 'public', OR
 *   - the note's visibility is 'selected' and the viewer's user id
 *     is in visible_to_players.
 * Legacy rows using 'private' / 'party' still resolve: 'private'
 * stays GM + owner only; 'party' maps to the new 'public' intent.
 */
export function canSeeNote(note, { isGM, ownsTarget, viewerUserId } = {}) {
  if (isGM || ownsTarget) return true;
  const vis = note?.visibility || "private";
  if (vis === "public" || vis === "party") return true;
  if (vis === "selected") {
    const allow = Array.isArray(note?.visible_to_players) ? note.visible_to_players : [];
    return !!viewerUserId && allow.includes(viewerUserId);
  }
  return false;
}

/**
 * Relationships are visible only to the character's owner and the GM.
 * Everyone else sees the tab empty / hidden. Keeping it here so the
 * rule lives in exactly one place.
 */
export function canSeeRelationships({ isGM, ownsTarget }) {
  return !!(isGM || ownsTarget);
}
