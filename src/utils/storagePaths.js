/**
 * Storage path structure inside the user-assets bucket.
 *
 *   user-assets/
 *     users/
 *       {user_id}/
 *         profile/
 *           avatar.webp
 *           banner.webp
 *         character-library/
 *           {character_id}/
 *             portrait.webp
 *         campaigns/
 *           {campaign_id}/
 *             world-lore/
 *               {entry_id}/
 *                 image.webp
 *             homebrew/
 *               monsters/
 *               items/
 *             session-docs/
 *     guilds/
 *       {guild_id}/
 *         vault/
 *           {character_id}/
 *             portrait.webp
 *         crest/
 *           guild-crest.webp
 *
 * Folder keys are always the UUID — usernames / campaign names can
 * change, UUIDs don't.
 */

export function userProfilePath(userId, filename) {
  return `users/${userId}/profile/${filename}`;
}

export function characterPortraitPath(userId, characterId, filename) {
  return `users/${userId}/character-library/${characterId}/${filename}`;
}

export function campaignFilePath(userId, campaignId, subpath) {
  return `users/${userId}/campaigns/${campaignId}/${subpath}`;
}

export function worldLoreImagePath(userId, campaignId, entryId, filename) {
  return `users/${userId}/campaigns/${campaignId}/world-lore/${entryId}/${filename}`;
}

export function homebrewImagePath(userId, campaignId, type, filename) {
  // type: 'monsters' | 'items' | 'spells'
  return `users/${userId}/campaigns/${campaignId}/homebrew/${type}/${filename}`;
}

export function guildVaultPath(guildId, characterId, filename) {
  return `guilds/${guildId}/vault/${characterId}/${filename}`;
}

export function guildCrestPath(guildId, filename) {
  return `guilds/${guildId}/crest/${filename}`;
}

/**
 * Absolute public URL for a path inside the user-assets bucket.
 */
export function getUserAssetUrl(path) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/user-assets/${path}`;
}
