// ============================================================================
// Billing Client
// ============================================================================
// Calls the guildstew-api backend for subscription management.
// Located at src/api/billingClient.js in the main guildstew project.
// ============================================================================

const API_BASE = import.meta.env.VITE_AI_API_URL || 'https://guildstew-api.vercel.app';

async function billingRequest(endpoint, body) {
  const response = await fetch(`${API_BASE}/api/stripe/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Billing request failed: ${response.status}`);
  }

  return response.json();
}

// ── Subscription Management ──────────────────────────────

/**
 * Start a checkout session — redirects user to Stripe
 * @param {Object} params
 * @param {string} params.tier - 'adventurer', 'veteran', or 'guild'
 * @param {string} params.user_id - Supabase user ID
 * @param {string} params.user_email - User's email for Stripe customer
 * @returns {Promise<{ url: string }>} Stripe Checkout URL to redirect to
 */
export async function startCheckout({ tier, user_id, user_email }) {
  const result = await billingRequest('checkout', {
    tier,
    user_id,
    user_email,
    success_url: `${window.location.origin}/settings?subscription=success`,
    cancel_url: `${window.location.origin}/settings?subscription=cancelled`,
  });
  return result;
}

/**
 * Open the Stripe Customer Portal — user can manage/cancel subscription
 * @param {string} user_id
 * @returns {Promise<{ url: string }>} Stripe Portal URL to redirect to
 */
export async function openBillingPortal(user_id) {
  const result = await billingRequest('portal', {
    user_id,
    return_url: `${window.location.origin}/settings`,
  });
  return result;
}

/**
 * Check current subscription status
 * @param {string} user_id
 * @returns {Promise<{ tier, status, is_guild_owner, is_guild_member, current_period_end }>}
 */
export async function getSubscriptionStatus(user_id) {
  const result = await billingRequest('status', { user_id });
  return result.data;
}

// ── Guild Management ─────────────────────────────────────

/**
 * Invite a user to your guild
 * @param {string} guild_owner_id - Your user ID
 * @param {string} member_id - User ID to invite
 */
export async function guildInvite(guild_owner_id, member_id) {
  return billingRequest('guild', { action: 'invite', guild_owner_id, member_id });
}

/**
 * Accept a guild invitation
 * @param {string} guild_owner_id - Who invited you
 * @param {string} user_id - Your user ID
 */
export async function guildAccept(guild_owner_id, user_id) {
  return billingRequest('guild', { action: 'accept', guild_owner_id, user_id });
}

/**
 * Decline a guild invitation
 * @param {string} guild_owner_id
 * @param {string} user_id
 */
export async function guildDecline(guild_owner_id, user_id) {
  return billingRequest('guild', { action: 'decline', guild_owner_id, user_id });
}

/**
 * Remove a member from your guild (owner only)
 * @param {string} guild_owner_id
 * @param {string} member_id
 */
export async function guildRemove(guild_owner_id, member_id) {
  return billingRequest('guild', { action: 'remove', guild_owner_id, member_id });
}

/**
 * Leave a guild you're a member of
 * @param {string} guild_owner_id
 * @param {string} user_id
 */
export async function guildLeave(guild_owner_id, user_id) {
  return billingRequest('guild', { action: 'leave', guild_owner_id, user_id });
}

/**
 * List all guild members (owner view)
 * @param {string} guild_owner_id
 */
export async function guildList(guild_owner_id) {
  const result = await billingRequest('guild', { action: 'list', guild_owner_id });
  return result.data;
}

/**
 * Get pending guild invitations for a user
 * @param {string} user_id
 */
export async function guildPendingInvites(user_id) {
  return billingRequest('guild', { action: 'pending', user_id });
}

// ── Tier Constants ───────────────────────────────────────

export const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    maxCharacters: 4,
    aiGeneration: false,
    homebrew: false,
    tavernDiscount: 0,
    tavernUploadFee: 5.00,
    tavernSplit: { platform: 50, creator: 50 },
    guildFeatures: false,
  },
  adventurer: {
    name: 'Adventurer',
    price: 6.99,
    maxCharacters: 12,
    aiGeneration: true,
    homebrew: false,
    tavernDiscount: 10,
    tavernUploadFee: 1.00,
    tavernSplit: { platform: 30, creator: 70 },
    guildFeatures: false,
  },
  veteran: {
    name: 'Veteran',
    price: 12.99,
    maxCharacters: Infinity,
    aiGeneration: true,
    homebrew: true,
    tavernDiscount: 20,
    tavernUploadFee: 0,
    tavernSplit: { platform: 20, creator: 80 },
    guildFeatures: false,
  },
  guild: {
    name: 'Guild',
    price: 34.99,
    maxCharacters: Infinity,
    aiGeneration: true,
    homebrew: true,
    tavernDiscount: 20,
    tavernUploadFee: 0,
    tavernSplit: { platform: 20, creator: 80 },
    guildFeatures: true,
    maxMembers: 6,
  },
};

/**
 * Check if a user's tier allows a specific feature
 * @param {string} tier - 'free', 'adventurer', 'veteran', 'guild'
 * @param {string} feature - 'aiGeneration', 'homebrew', 'guildFeatures'
 * @returns {boolean}
 */
export function canUseTier(tier, feature) {
  return TIERS[tier]?.[feature] ?? false;
}

/**
 * Get character limit for a tier
 * @param {string} tier
 * @returns {number}
 */
export function characterLimit(tier) {
  return TIERS[tier]?.maxCharacters ?? 4;
}
