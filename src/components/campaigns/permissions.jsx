/**
 * Campaign Permission System
 * Defines roles and their access levels in campaigns
 */

export const CAMPAIGN_ROLES = {
  GM: 'gm',
  CO_GM: 'co_gm',
  MOLE: 'mole',
  PLAYER: 'player',
  NONE: 'none'
};

/**
 * Get the user's role in a specific campaign
 */
export function getUserCampaignRole(campaign, userId) {
  if (!campaign || !userId) return CAMPAIGN_ROLES.NONE;

  if (campaign.game_master_id === userId) {
    return CAMPAIGN_ROLES.GM;
  }

  if (campaign.co_dm_ids?.includes(userId)) {
    return CAMPAIGN_ROLES.CO_GM;
  }

  if (campaign.mole_player_id === userId) {
    return CAMPAIGN_ROLES.MOLE;
  }

  if (campaign.player_ids?.includes(userId)) {
    return CAMPAIGN_ROLES.PLAYER;
  }

  return CAMPAIGN_ROLES.NONE;
}

/**
 * Check if user has GM-level permissions
 */
export function isGMOrCoGM(campaign, userId) {
  const role = getUserCampaignRole(campaign, userId);
  return role === CAMPAIGN_ROLES.GM || role === CAMPAIGN_ROLES.CO_GM;
}

/**
 * Check if user is the main GM (creator)
 */
export function isMainGM(campaign, userId) {
  return campaign?.game_master_id === userId;
}

/**
 * Check if user can access GM-only areas
 */
export function canAccessGMArea(campaign, userId) {
  return isGMOrCoGM(campaign, userId);
}

/**
 * Check if user can modify campaign settings
 * Only GMs and Co-GMs can modify settings
 */
export function canModifySettings(campaign, userId) {
  return isGMOrCoGM(campaign, userId);
}

/**
 * Check if user can archive or delete campaign
 * Only the main GM can archive/delete
 */
export function canArchiveOrDelete(campaign, userId) {
  return isMainGM(campaign, userId);
}

/**
 * Check if user can manage players
 */
export function canManagePlayers(campaign, userId) {
  return isGMOrCoGM(campaign, userId);
}

/**
 * Check if mole can access a specific section
 */
export function moleCanAccessSection(campaign, userId, sectionName) {
  if (campaign?.mole_player_id !== userId) return false;
  
  // If no restrictions set, mole has no extra access
  if (!campaign.mole_accessible_sections || campaign.mole_accessible_sections.length === 0) {
    return false;
  }

  return campaign.mole_accessible_sections.includes(sectionName);
}

/**
 * Check if user can access a specific campaign section
 */
export function canAccessSection(campaign, userId, sectionName) {
  const role = getUserCampaignRole(campaign, userId);

  // GMs and Co-GMs have access to everything
  if (role === CAMPAIGN_ROLES.GM || role === CAMPAIGN_ROLES.CO_GM) {
    return true;
  }

  // Players have standard access
  if (role === CAMPAIGN_ROLES.PLAYER) {
    // Players cannot access GM-only sections
    const gmOnlySections = ['settings', 'player_management', 'gm_notes'];
    return !gmOnlySections.includes(sectionName);
  }

  // Moles have player access plus any sections GM grants
  if (role === CAMPAIGN_ROLES.MOLE) {
    const gmOnlySections = ['settings', 'player_management'];
    if (gmOnlySections.includes(sectionName)) {
      return false;
    }
    
    // Check if mole has been granted access to this section
    if (sectionName === 'gm_notes') {
      return moleCanAccessSection(campaign, userId, sectionName);
    }
    
    return true;
  }

  return false;
}