import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, Crown, Loader2, UserPlus, Trash2, LogOut, Search } from "lucide-react";
import {
  TIERS,
  startCheckout, openBillingPortal,
  guildInvite, guildAccept, guildDecline, guildRemove, guildLeave,
  listIncomingGuildInvites, listOutgoingGuildInvites,
} from "@/api/billingClient";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { supabase } from "@/api/supabaseClient";
import { trackEvent } from "@/utils/analytics";
import { displayName, displayInitial } from "@/utils/displayName";

/**
 * Subscription tab — renders the four tiers from billingClient.TIERS,
 * surfaces a Manage button when the user already has a paid plan,
 * and embeds the Guild invite + member panel for Guild owners /
 * members. Also handles the ?subscription=success / =cancelled
 * redirect from Stripe Checkout.
 */
export default function SubscriptionTab() {
  const { user } = useAuth();
  const sub = useSubscription();
  const queryClient = useQueryClient();
  const [busyTier, setBusyTier] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  // ?subscription= handler — called once on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('subscription');
    const tier = params.get('tier');
    if (status === 'success') {
      toast.success(`Welcome to ${tier ? (TIERS[tier]?.name || tier) : 'your new tier'}! 🎉`, { duration: 5000 });
      trackEvent(user?.id, 'subscription_started', { tier });
      sub.refresh();
      params.delete('subscription');
      params.delete('tier');
      const next = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (next ? `?${next}` : ''));
    } else if (status === 'cancelled') {
      params.delete('subscription');
      window.history.replaceState({}, '', window.location.pathname + (params.toString() ? `?${params}` : ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubscribe = async (tier) => {
    if (!user?.id) { toast.error('Sign in first.'); return; }
    setBusyTier(tier);
    try {
      await startCheckout({ tier, user_id: user.id, user_email: user.email });
    } catch (err) {
      toast.error(err?.message || 'Could not start checkout.');
      setBusyTier(null);
    }
  };

  const handlePortal = async () => {
    if (!user?.id) return;
    try {
      await openBillingPortal(user.id);
    } catch (err) {
      toast.error(err?.message || 'Could not open the billing portal.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Subscription</h2>
        <p className="text-sm text-slate-400">
          Pick a plan that fits how you play. Cancel anytime from the billing portal.
        </p>
      </div>

      {sub.cancelAtPeriodEnd && sub.periodEnd && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 text-sm text-amber-200">
          Your {sub.tierData?.name} subscription is set to cancel at the end of the current period
          ({new Date(sub.periodEnd).toLocaleDateString()}). You'll drop to Free after that date.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.values(TIERS).map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            isCurrent={sub.tier === tier.id}
            busy={busyTier === tier.id}
            onSubscribe={() => handleSubscribe(tier.id)}
            onPortal={handlePortal}
            disabled={sub.loading || (sub.tier === 'guild' && tier.id === 'free')}
          />
        ))}
      </div>

      <GuildPanel
        sub={sub}
        user={user}
        queryClient={queryClient}
        confirmLeave={confirmLeave}
        setConfirmLeave={setConfirmLeave}
        confirmRemove={confirmRemove}
        setConfirmRemove={setConfirmRemove}
      />

      {/* AlertDialog modals shared across the panel. */}
      <AlertDialog open={confirmLeave} onOpenChange={(o) => !o && setConfirmLeave(false)}>
        <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this guild?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              You'll lose Veteran perks at the end of the current period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await guildLeave({ user_id: user?.id });
                  toast('You left the guild.');
                  sub.refresh();
                } catch (err) {
                  toast.error(err?.message || 'Failed to leave guild');
                }
                setConfirmLeave(false);
              }}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this member?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              They'll lose Veteran perks at the end of the current period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await guildRemove({ owner_user_id: user?.id, member_user_id: confirmRemove });
                  toast('Member removed.');
                  queryClient.invalidateQueries({ queryKey: ['guildMembers', user?.id] });
                } catch (err) {
                  toast.error(err?.message || 'Failed to remove');
                }
                setConfirmRemove(null);
              }}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TierCard({ tier, isCurrent, busy, onSubscribe, onPortal, disabled }) {
  const accent = tier.badgeColor || '#37F2D1';
  return (
    <div
      className={`bg-[#2A3441] rounded-2xl p-4 border-2 flex flex-col gap-3 transition-colors ${
        isCurrent ? 'border-[--accent] shadow-[0_0_25px_rgba(0,0,0,0.4)]' : 'border-[#111827]'
      }`}
      style={{ ['--accent']: accent }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            {tier.badgeIcon && (
              <span className="text-2xl">{tier.badgeIcon}</span>
            )}
            <h3 className="text-xl font-black text-white">{tier.name}</h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{tier.blurb}</p>
        </div>
        {isCurrent && (
          <Badge className="bg-[--accent] text-[#050816] hover:bg-[--accent]" style={{ ['--accent']: accent }}>
            Current Plan
          </Badge>
        )}
      </div>

      <div className="text-2xl font-bold text-white">
        {tier.priceLabel}
      </div>

      <ul className="space-y-1 flex-1">
        {tier.features.map((f) => (
          <li key={f} className="text-xs text-slate-300 flex items-start gap-2">
            <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: accent }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        tier.id === 'free' ? (
          <Button variant="outline" className="text-slate-300" disabled>
            You're on the free plan
          </Button>
        ) : (
          <Button
            onClick={onPortal}
            variant="outline"
            className="text-white border-slate-600 hover:bg-slate-700"
          >
            Manage Subscription
          </Button>
        )
      ) : tier.id === 'free' ? (
        <Button variant="outline" className="text-slate-400" disabled>
          Downgrade in the billing portal
        </Button>
      ) : (
        <Button
          disabled={disabled || busy}
          onClick={onSubscribe}
          className="font-bold text-[#050816]"
          style={{ background: accent }}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Subscribe to ${tier.name}`}
        </Button>
      )}
    </div>
  );
}

// ─── Guild management ───────────────────────────────────────────

function GuildPanel({ sub, user, queryClient, setConfirmLeave, setConfirmRemove }) {
  // Owners see the member roster + invite tools; members see a
  // "leave" card; everyone with a pending invite sees the accept /
  // decline banner. The whole panel hides for free users with no
  // pending invites.
  const userId = user?.id;

  const { data: incomingInvites = [] } = useQuery({
    queryKey: ['guildInvitesIncoming', userId],
    queryFn: () => listIncomingGuildInvites(userId),
    enabled: !!userId,
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: outgoingInvites = [] } = useQuery({
    queryKey: ['guildInvitesOutgoing', userId],
    queryFn: () => listOutgoingGuildInvites(userId),
    enabled: !!userId && sub.isGuildOwner,
    initialData: [],
  });

  const { data: members = [] } = useQuery({
    queryKey: ['guildMembers', userId],
    queryFn: async () => {
      // Subscriptions table holds guild_owner_id pointers — every
      // member references their owner so we can list them with one
      // round-trip plus a profile lookup.
      const { data, error } = await supabase
        .from('subscriptions')
        .select('user_id, status, guild_owner_id, is_guild_owner, is_guild_member')
        .or(`guild_owner_id.eq.${userId},user_id.eq.${userId}`);
      if (error) return [];
      const memberIds = Array.from(new Set(
        (data || [])
          .filter((r) => r.guild_owner_id === userId || r.user_id === userId)
          .map((r) => r.user_id),
      ));
      if (memberIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', memberIds);
      return (data || []).map((row) => ({
        ...row,
        profile: (profiles || []).find((p) => p.user_id === row.user_id) || null,
      }));
    },
    enabled: !!userId && sub.isGuildOwner,
    initialData: [],
  });

  const acceptMutation = useMutation({
    mutationFn: (invite) => guildAccept({ invite_id: invite.id, invitee_user_id: userId }),
    onSuccess: () => {
      toast.success('You joined the guild!');
      queryClient.invalidateQueries({ queryKey: ['guildInvitesIncoming', userId] });
      sub.refresh();
    },
    onError: (err) => toast.error(err?.message || 'Failed to accept'),
  });
  const declineMutation = useMutation({
    mutationFn: (invite) => guildDecline({ invite_id: invite.id, invitee_user_id: userId }),
    onSuccess: () => {
      toast('Invite declined');
      queryClient.invalidateQueries({ queryKey: ['guildInvitesIncoming', userId] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to decline'),
  });

  const showOwnerPanel = sub.isGuildOwner;
  const showMemberCard = sub.isGuildMember && !sub.isGuildOwner;
  const hasInvites = incomingInvites.length > 0;

  if (!showOwnerPanel && !showMemberCard && !hasInvites) return null;

  return (
    <div className="space-y-3">
      {hasInvites && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 space-y-2">
          {incomingInvites.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-3">
              <div className="text-sm text-amber-100">
                <strong>{inv.owner_username || 'A friend'}</strong> invited you to their Guild.
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-[#22c55e] hover:bg-[#16a34a] text-white"
                  onClick={() => acceptMutation.mutate(inv)}
                  disabled={acceptMutation.isPending}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => declineMutation.mutate(inv)}
                  disabled={declineMutation.isPending}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showOwnerPanel && (
        <OwnerSection
          members={members}
          outgoingInvites={outgoingInvites}
          ownerId={userId}
          maxSeats={TIERS.guild.limits.guildSeats}
          onInviteSent={() => {
            queryClient.invalidateQueries({ queryKey: ['guildInvitesOutgoing', userId] });
          }}
          onRemove={(memberId) => setConfirmRemove(memberId)}
        />
      )}

      {showMemberCard && (
        <div className="bg-[#2A3441] rounded-xl p-4 border border-[#111827] flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#fbbf24]" />
              You're a member of a Guild
            </div>
            <p className="text-[11px] text-slate-400">
              You get every Veteran perk while your guild owner's subscription is active.
            </p>
          </div>
          <Button
            variant="outline"
            className="text-red-400 border-red-500/50 hover:bg-red-500/10"
            onClick={() => setConfirmLeave(true)}
          >
            <LogOut className="w-3 h-3 mr-1" />
            Leave Guild
          </Button>
        </div>
      )}
    </div>
  );
}

function OwnerSection({ members, outgoingInvites, ownerId, maxSeats, onInviteSent, onRemove }) {
  const [search, setSearch] = useState('');

  // Friends list — bidirectional pairs in the `friends` table, so a
  // friendship row can have me as either user_id or friend_id. Only
  // status='accepted' counts; pending requests aren't invitable.
  const { data: allFriendships = [] } = useQuery({
    queryKey: ['allFriendships', ownerId],
    queryFn: () => base44.entities.Friend.list(),
    enabled: !!ownerId,
    initialData: [],
  });

  const friendIds = useMemo(() => {
    if (!ownerId) return [];
    const ids = new Set();
    for (const f of allFriendships) {
      if (f?.status !== 'accepted') continue;
      if (f.user_id === ownerId && f.friend_id) ids.add(f.friend_id);
      else if (f.friend_id === ownerId && f.user_id) ids.add(f.user_id);
    }
    return Array.from(ids);
  }, [allFriendships, ownerId]);

  // One round-trip for all friend profiles. Sorted-key cache so two
  // friends-list orderings don't blow the cache apart.
  const { data: friendProfiles = [] } = useQuery({
    queryKey: ['guildInviteFriendProfiles', friendIds.slice().sort().join(',')],
    queryFn: async () => {
      if (friendIds.length === 0) return [];
      const { data } = await supabase
        .from('user_profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', friendIds);
      return data || [];
    },
    enabled: friendIds.length > 0,
    initialData: [],
  });

  const queryClient = useQueryClient();
  const inviteMutation = useMutation({
    mutationFn: ({ inviteeId }) => guildInvite({
      owner_user_id: ownerId,
      invitee_user_id: inviteeId,
    }),
    onSuccess: (_data, { profile }) => {
      toast.success(`Invited ${displayName(profile, { fallback: 'friend' })} to your guild.`);
      onInviteSent?.();
      // Refresh the outgoing list immediately so the friend-row
      // button flips from "Invite" to "Invite Sent" without a wait.
      queryClient.invalidateQueries({ queryKey: ['guildInvitesOutgoing', ownerId] });
    },
    onError: (err) => toast.error(err?.message || 'Invite failed'),
  });

  // Sets keyed by user_id for O(1) per-row state lookups. memberSet
  // covers the owner too; pendingInviteeSet is filtered to status
  // pending so a previously-declined invite re-allows the button.
  const memberSet = useMemo(
    () => new Set((members || []).map((m) => m.user_id).filter(Boolean)),
    [members],
  );
  const pendingInviteeSet = useMemo(() => {
    const s = new Set();
    for (const inv of outgoingInvites || []) {
      if (inv?.status === 'pending' && inv.invitee_user_id) s.add(inv.invitee_user_id);
    }
    return s;
  }, [outgoingInvites]);

  const memberCount = (members || []).length || 1;
  const guildFull = memberCount >= maxSeats;

  const visibleFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = friendProfiles.slice().sort((a, b) =>
      (displayName(a) || '').localeCompare(displayName(b) || ''),
    );
    if (!q) return rows;
    return rows.filter((p) => {
      const hay = `${p.username || ''} ${p.full_name || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [friendProfiles, search]);
  return (
    <div className="bg-[#2A3441] rounded-xl p-4 border border-[#111827] space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#fbbf24]" />
            My Guild
          </div>
          <p className="text-[11px] text-slate-400">
            {memberCount}/{maxSeats} members. Each member gets the full Veteran feature set.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        {(members || []).map((m) => {
          const isOwner = m.is_guild_owner || m.user_id === ownerId;
          return (
            <div key={m.user_id} className="flex items-center gap-3 bg-[#0b1220] border border-slate-800 rounded-lg px-3 py-2">
              {m.profile?.avatar_url ? (
                <img src={m.profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#37F2D1]/20 flex-shrink-0 flex items-center justify-center text-xs font-bold">
                  {(m.profile?.username || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {m.profile?.username || 'Unknown'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {isOwner ? 'Guild owner' : `Status: ${m.status || 'active'}`}
                </div>
              </div>
              {!isOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-400 border-red-500/40 hover:bg-red-500/10"
                  onClick={() => onRemove(m.user_id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-700 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-widest font-black text-slate-400">
            Invite from friends
          </p>
          {outgoingInvites.length > 0 && (
            <span className="text-[11px] text-slate-400">
              {pendingInviteeSet.size} pending
            </span>
          )}
        </div>

        {friendIds.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic bg-[#0b1220] border border-slate-800 rounded px-3 py-2">
            No friends yet. Add friends from the Friends page first, then invite them here.
          </p>
        ) : (
          <>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends"
                className="pl-8 bg-[#0b1220] border-slate-700 text-white text-sm"
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
              {visibleFriends.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic px-3 py-2">
                  No matches.
                </p>
              ) : (
                visibleFriends.map((p) => {
                  const alreadyMember = memberSet.has(p.user_id);
                  const inviteSent = pendingInviteeSet.has(p.user_id);
                  const sending =
                    inviteMutation.isPending &&
                    inviteMutation.variables?.inviteeId === p.user_id;
                  const disabled = alreadyMember || inviteSent || guildFull || sending;
                  let buttonLabel;
                  if (alreadyMember) buttonLabel = 'Already a member';
                  else if (inviteSent) buttonLabel = 'Invite sent';
                  else if (guildFull) buttonLabel = 'Guild full';
                  else if (sending) buttonLabel = 'Inviting…';
                  else buttonLabel = 'Invite';
                  return (
                    <div
                      key={p.user_id}
                      className="flex items-center gap-3 bg-[#0b1220] border border-slate-800 rounded-lg px-3 py-2"
                    >
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover object-top flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#37F2D1]/20 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">
                          {displayInitial(p)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {displayName(p, { fallback: 'Friend' })}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={disabled}
                        onClick={() => inviteMutation.mutate({ inviteeId: p.user_id, profile: p })}
                        className={
                          alreadyMember || inviteSent
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-700 cursor-not-allowed'
                            : 'bg-[#fbbf24] text-[#050816] font-bold hover:bg-[#fde68a]'
                        }
                      >
                        {!disabled && <UserPlus className="w-3 h-3 mr-1" />}
                        {buttonLabel}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
