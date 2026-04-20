import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSubscriptionStatus,
  TIERS,
  canUseTier,
  characterLimit,
} from '@/api/billingClient';
import { useAuth } from '@/lib/AuthContext';
import { checkAndGrantStipend } from '@/lib/spiceStipend';

/**
 * Subscription state for the whole app. Loads on auth, caches for
 * a minute, exposes tier + helpers via useSubscription(). The tier
 * defaults to 'free' so consumers never have to guard for null.
 */
const SubscriptionContext = createContext({
  tier: 'free',
  loading: true,
  canUse: () => true,
  maxCharacters: TIERS.free.limits.characters,
  tierData: TIERS.free,
  refresh: () => {},
});

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: () => getSubscriptionStatus(user.id),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  const tier = subscription?.tier || 'free';

  // Monthly stipend grant. Fires once per mount-per-user once the
  // subscription resolves. `checkAndGrantStipend` is idempotent by the
  // 30-day guard on `last_stipend_at`, but the ref prevents the
  // client-side network call from repeating every re-render while the
  // query stays warm.
  const stipendRan = useRef(null);
  useEffect(() => {
    if (!user?.id || isLoading) return;
    if (stipendRan.current === user.id) return;
    stipendRan.current = user.id;
    const guildId = subscription?.guild_owner_id || null;
    checkAndGrantStipend(user.id, tier, guildId)
      .then((r) => {
        if (r?.granted) queryClient.invalidateQueries({ queryKey: ['spiceWallet', user.id] });
      })
      .catch(() => {});
  }, [user?.id, tier, isLoading, subscription?.guild_owner_id, queryClient]);

  const value = {
    tier,
    status: subscription?.status || 'none',
    isGuildOwner: subscription?.is_guild_owner || false,
    isGuildMember: subscription?.is_guild_member || false,
    guildOwnerId: subscription?.guild_owner_id || null,
    periodEnd: subscription?.current_period_end || null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
    loading: isLoading,
    canUse: (feature) => canUseTier(tier, feature),
    maxCharacters: characterLimit(tier),
    tierData: TIERS[tier] || TIERS.free,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['subscription', user?.id] }),
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
