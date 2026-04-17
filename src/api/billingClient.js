<<<<<<< HEAD
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
=======
import { supabase } from '@/api/supabaseClient';

/**
 * Subscription tier catalog. Single source of truth — UI rendering
 * (tier cards, feature lists), gating helpers (canUseTier,
 * characterLimit), and the checkout/portal handlers all read from
 * here so changing a price or feature only happens in one place.
 *
 * Stripe price IDs come from VITE_STRIPE_PRICE_* env vars when set;
 * otherwise the Edge Function falls back to its own mapping.
 */
export const TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    badgeIcon: null,
    badgeColor: 'transparent',
    price: 0,
    priceLabel: 'Free',
    blurb: 'Start your adventure. Build a character and explore.',
    features: [
      '1 character',
      'Full character sheet builder',
      'Join campaigns hosted by GMs',
      'Basic combat tracking',
    ],
    limits: { characters: 1, aiGeneration: false, homebrew: false, guildSeats: 0 },
  },
  adventurer: {
    id: 'adventurer',
    name: 'Adventurer',
    badgeIcon: '⚔️',
    badgeColor: '#22c55e',
    price: 4.99,
    priceLabel: '$4.99 / month',
    stripePriceId: import.meta.env?.VITE_STRIPE_PRICE_ADVENTURER || null,
    blurb: 'Unlock the AI tools — Quick Pick & AI Generate.',
    features: [
      '5 characters',
      'Quick Pick character generator',
      'AI Generate with portraits',
      'Priority support',
    ],
    limits: { characters: 5, aiGeneration: true, homebrew: false, guildSeats: 0 },
  },
  veteran: {
    id: 'veteran',
    name: 'Veteran',
    badgeIcon: '🛡️',
    badgeColor: '#a855f7',
    price: 9.99,
    priceLabel: '$9.99 / month',
    stripePriceId: import.meta.env?.VITE_STRIPE_PRICE_VETERAN || null,
    blurb: 'Brew your own homebrew rules, items, and monsters.',
    features: [
      'Unlimited characters',
      'Everything in Adventurer',
      'Create homebrew rules + items + monsters + spells + abilities',
      'Publish brews on The Brewery',
    ],
    limits: { characters: Infinity, aiGeneration: true, homebrew: true, guildSeats: 0 },
  },
  guild: {
    id: 'guild',
    name: 'Guild',
    badgeIcon: '👑',
    badgeColor: '#fbbf24',
    price: 34.99,
    priceLabel: '$34.99 / month',
    stripePriceId: import.meta.env?.VITE_STRIPE_PRICE_GUILD || null,
    blurb: 'Up to 6 members — $5.83 per person. Everyone gets Veteran perks.',
    features: [
      'Up to 6 members (incl. you)',
      'Every member gets Veteran perks',
      'Manage members from one dashboard',
      'Guild banner on profiles',
    ],
    limits: { characters: Infinity, aiGeneration: true, homebrew: true, guildSeats: 6 },
  },
};

const TIER_ORDER = ['free', 'adventurer', 'veteran', 'guild'];

export function tierAtLeast(currentTier, requiredTier) {
  return TIER_ORDER.indexOf(currentTier) >= TIER_ORDER.indexOf(requiredTier);
}

/**
 * Whether a tier can use a given feature key. Used by the
 * subscription context's `canUse(feature)` helper so callers don't
 * need to know the tier ladder.
 */
export function canUseTier(tier, feature) {
  const t = TIERS[tier] || TIERS.free;
  if (feature === 'aiGeneration') return !!t.limits.aiGeneration;
  if (feature === 'homebrew')      return !!t.limits.homebrew;
  if (feature === 'guildOwner')    return (t.limits.guildSeats || 0) > 0;
  return true;
}

export function characterLimit(tier) {
  const t = TIERS[tier] || TIERS.free;
  return t.limits.characters;
}

// ─── Edge Function wrappers ─────────────────────────────────────
// All of the network-side billing operations are routed through
// Supabase Edge Functions so the Stripe secret never reaches the
// browser. When a function isn't deployed the wrappers throw a
// friendly error so callers can surface a toast.

async function invokeEdge(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(`Billing service "${name}" unavailable: ${error.message || error}`);
  return data;
}

/**
 * Resolve the current user's subscription. Reads the local
 * `subscriptions` table so the app works even before the Edge
 * Function is deployed; the function exists for revalidation /
 * webhook resync. A user without a row is a free-tier user.
 */
export async function getSubscriptionStatus(userId) {
  if (!userId) return { tier: 'free', status: 'none' };
  // Try the Edge Function first so tier reflects the latest Stripe
  // webhook state. Fall back to a direct table read.
  try {
    const data = await invokeEdge('get-subscription-status', { user_id: userId });
    if (data && data.tier) return data;
  } catch { /* fall back to direct read */ }
  const { data: rows, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) return { tier: 'free', status: 'none' };
  const row = rows?.[0];
  if (!row) return { tier: 'free', status: 'none' };
  return {
    tier: row.tier || 'free',
    status: row.status || 'none',
    is_guild_owner: !!row.is_guild_owner,
    is_guild_member: !!row.is_guild_member,
    guild_owner_id: row.guild_owner_id || null,
    current_period_end: row.current_period_end || null,
    cancel_at_period_end: !!row.cancel_at_period_end,
    stripe_customer_id: row.stripe_customer_id || null,
    stripe_subscription_id: row.stripe_subscription_id || null,
  };
}

export async function startCheckout({ tier, user_id, user_email }) {
  if (!user_id) throw new Error('Not signed in.');
  const t = TIERS[tier];
  if (!t || tier === 'free') throw new Error('Pick a paid tier first.');
  const data = await invokeEdge('create-checkout-session', {
    tier,
    user_id,
    user_email,
    price_id: t.stripePriceId || null,
    success_url: `${window.location.origin}/Settings?subscription=success&tier=${tier}`,
    cancel_url: `${window.location.origin}/Settings?subscription=cancelled`,
  });
  if (data?.url) {
    window.location.href = data.url;
    return data;
  }
  throw new Error('Checkout link unavailable.');
}

export async function openBillingPortal(userId) {
  if (!userId) throw new Error('Not signed in.');
  const data = await invokeEdge('create-billing-portal-session', {
    user_id: userId,
    return_url: `${window.location.origin}/Settings`,
  });
  if (data?.url) {
    window.location.href = data.url;
    return data;
  }
  throw new Error('Billing portal unavailable.');
}

// ─── Guild member management ────────────────────────────────────

export async function listGuildMembers(ownerUserId) {
  if (!ownerUserId) return [];
  const { data: rows, error } = await supabase
    .from('subscriptions')
    .select('user_id, status, is_guild_owner, is_guild_member, guild_owner_id')
    .or(`user_id.eq.${ownerUserId},guild_owner_id.eq.${ownerUserId}`);
  if (error) return [];
  return rows || [];
}

export async function listIncomingGuildInvites(userId) {
  if (!userId) return [];
  const { data: rows, error } = await supabase
    .from('guild_invites')
    .select('*')
    .eq('invitee_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) return [];
  return rows || [];
}

export async function listOutgoingGuildInvites(ownerUserId) {
  if (!ownerUserId) return [];
  const { data: rows, error } = await supabase
    .from('guild_invites')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return rows || [];
}

export async function guildInvite({ owner_user_id, invitee_user_id }) {
  if (!owner_user_id || !invitee_user_id) throw new Error('Missing parties.');
  return invokeEdge('guild-invite', { owner_user_id, invitee_user_id });
}

export async function guildAccept({ invite_id, invitee_user_id }) {
  return invokeEdge('guild-accept', { invite_id, invitee_user_id });
}

export async function guildDecline({ invite_id, invitee_user_id }) {
  return invokeEdge('guild-decline', { invite_id, invitee_user_id });
}

export async function guildRemove({ owner_user_id, member_user_id }) {
  return invokeEdge('guild-remove', { owner_user_id, member_user_id });
}

export async function guildLeave({ user_id }) {
  return invokeEdge('guild-leave', { user_id });
>>>>>>> origin/claude/tier-1-abilities-post-hit-djs5F
}
