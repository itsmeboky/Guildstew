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
    blurb: 'Start your adventure. Build characters, join campaigns, create your own content.',
    features: [
      '4 characters in library',
      'Full character creator',
      'Join campaigns hosted by GMs',
      'Create homebrew for your campaigns',
      'Upload to Tavern ($5 fee, 50/50 split)',
    ],
    limits: {
      characters: 4,
      aiGeneration: false,
      aiPortraits: false,
      quickPick: false,
      homebrew: true,
      breweryDownload: false,
      homebrewCode: false,
      guildSeats: 0,
      guildCrest: false,
      sharedLibrary: false,
      guildChat: false,
      userStorageBytes: 50 * 1024 * 1024,
      campaignStorageBytes: 100 * 1024 * 1024,
      maxActiveCampaigns: 2,
      maxArchivedCampaigns: 2,
      tavernDiscount: 0,
      tavernUploadFee: 5.00,
      tavernSplit: [50, 50],
    },
  },
  adventurer: {
    id: 'adventurer',
    name: 'Adventurer',
    badgeIcon: '⚔️',
    badgeColor: '#22c55e',
    price: 6.99,
    priceLabel: '$6.99 / month',
    stripePriceId: import.meta.env?.VITE_STRIPE_PRICE_ADVENTURER || null,
    blurb: 'Unlock AI tools, more characters, and access The Brewery.',
    features: [
      '12 characters in library',
      'Quick Pick (AI) character generator',
      'AI Generate with portraits',
      'Download homebrew from The Brewery',
      'Upload to Tavern ($1 fee, 30/70 split)',
      '10% Tavern discount',
    ],
    limits: {
      characters: 12,
      aiGeneration: true,
      aiPortraits: true,
      quickPick: true,
      homebrew: true,
      breweryDownload: true,
      homebrewCode: false,
      guildSeats: 0,
      guildCrest: false,
      sharedLibrary: false,
      guildChat: false,
      userStorageBytes: 200 * 1024 * 1024,
      campaignStorageBytes: 500 * 1024 * 1024,
      maxActiveCampaigns: 5,
      maxArchivedCampaigns: 5,
      tavernDiscount: 0.10,
      tavernUploadFee: 1.00,
      tavernSplit: [30, 70],
    },
  },
  veteran: {
    id: 'veteran',
    name: 'Veteran',
    badgeIcon: '🛡️',
    badgeColor: '#a855f7',
    price: 12.99,
    priceLabel: '$12.99 / month',
    stripePriceId: import.meta.env?.VITE_STRIPE_PRICE_VETERAN || null,
    blurb: 'Full homebrew power. Create, code, and publish to The Brewery.',
    features: [
      'Unlimited characters',
      'Everything in Adventurer',
      'Create homebrew with code (downloadable by others)',
      'Publish to The Brewery (upload fee waived)',
      '20/80 Tavern split (you keep 80%)',
      '20% Tavern discount',
    ],
    limits: {
      characters: Infinity,
      aiGeneration: true,
      aiPortraits: true,
      quickPick: true,
      homebrew: true,
      breweryDownload: true,
      homebrewCode: true,
      guildSeats: 0,
      guildCrest: false,
      sharedLibrary: false,
      guildChat: false,
      userStorageBytes: 1024 * 1024 * 1024,
      campaignStorageBytes: 2 * 1024 * 1024 * 1024,
      maxActiveCampaigns: Infinity,
      maxArchivedCampaigns: 10,
      tavernDiscount: 0.20,
      tavernUploadFee: 0,
      tavernSplit: [20, 80],
    },
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
      'Unlimited characters + The Vault (shared library)',
      'Everything in Veteran for all 6 members',
      'Guild Crest on profiles',
      'Guild Chat',
      'Shared Character Library (The Vault)',
      'Upload fee waived, 20/80 split, 20% discount',
    ],
    limits: {
      characters: Infinity,
      aiGeneration: true,
      aiPortraits: true,
      quickPick: true,
      homebrew: true,
      breweryDownload: true,
      homebrewCode: true,
      guildSeats: 6,
      guildCrest: true,
      sharedLibrary: true,
      guildChat: true,
      userStorageBytes: 2 * 1024 * 1024 * 1024,
      campaignStorageBytes: 5 * 1024 * 1024 * 1024,
      maxActiveCampaigns: Infinity,
      maxArchivedCampaigns: 15,
      tavernDiscount: 0.20,
      tavernUploadFee: 0,
      tavernSplit: [20, 80],
    },
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
  if (feature === 'aiGeneration')    return !!t.limits.aiGeneration;
  if (feature === 'aiPortraits')     return !!t.limits.aiPortraits;
  if (feature === 'quickPick')       return !!t.limits.quickPick;
  if (feature === 'homebrew')        return !!t.limits.homebrew;
  if (feature === 'breweryDownload') return !!t.limits.breweryDownload;
  if (feature === 'homebrewCode')    return !!t.limits.homebrewCode;
  if (feature === 'guildOwner')      return (t.limits.guildSeats || 0) > 0;
  if (feature === 'guildCrest')      return !!t.limits.guildCrest;
  if (feature === 'sharedLibrary')   return !!t.limits.sharedLibrary;
  if (feature === 'guildChat')       return !!t.limits.guildChat;
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

  // Admin-set overrides win over every other tier source. Checked
  // first so hand-granted tiers work even if the Edge Function /
  // subscriptions table is unreachable. `admin_tier_override` is
  // set from the admin Users tab.
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('admin_tier_override')
      .eq('user_id', userId)
      .maybeSingle();
    if (profile?.admin_tier_override) {
      return {
        tier: profile.admin_tier_override,
        status: 'admin_override',
        is_guild_owner: false,
        is_guild_member: false,
        guild_owner_id: null,
        current_period_end: null,
        cancel_at_period_end: false,
        stripe_customer_id: null,
        stripe_subscription_id: null,
      };
    }
  } catch { /* non-fatal — fall through to normal lookup */ }

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
}
