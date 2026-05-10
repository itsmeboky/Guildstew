import React from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Mail, Check, X } from "lucide-react";
import { toast } from "sonner";
import CampaignCarousel from "@/components/campaigns/CampaignCarousel";
import { CardSkeleton } from "@/components/ui/skeleton";

export default function Campaigns() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    initialData: null
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['userCampaigns'],
    queryFn: async () => {
      const allCampaigns = await base44.entities.Campaign.list('-updated_date');
      return allCampaigns.filter(c =>
        c.game_master_id === user?.id || c.player_ids?.includes(user?.id)
      );
    },
    enabled: !!user,
    initialData: []
  });

  // Pending campaign invitations addressed to the current user. The
  // denormalized fields (campaign_name, inviter_username,
  // inviter_avatar) populate per-row from the
  // 20261127_campaign_invite_codes_and_inbox.sql migration so the
  // inbox renders without a JOIN per row.
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['pendingCampaignInvites', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('campaign_invitations')
        .select('*')
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Accept: mark the invitation accepted, then add the user to the
  // campaign's player_ids array. Mirrors the JoinCampaign flow at
  // src/pages/JoinCampaign.jsx — same membership-write pattern, so
  // the three join paths (link, code, accept-invite) all converge
  // on identical post-state.
  const acceptInviteMutation = useMutation({
    mutationFn: async (invite) => {
      // Pull the latest campaign so we don't clobber concurrent
      // player_ids writes.
      const { data: campaign, error: cErr } = await supabase
        .from('campaigns')
        .select('id, player_ids, max_players, title, name')
        .eq('id', invite.campaign_id)
        .single();
      if (cErr) throw cErr;

      const currentPlayers = Array.isArray(campaign.player_ids) ? campaign.player_ids : [];
      if (!currentPlayers.includes(user.id)) {
        const cap = Math.min(campaign.max_players || 6, 8);
        if (currentPlayers.length >= cap) {
          throw new Error('Campaign is full.');
        }
        const { error: updateErr } = await supabase
          .from('campaigns')
          .update({ player_ids: [...currentPlayers, user.id] })
          .eq('id', campaign.id);
        if (updateErr) throw updateErr;
      }

      const { error: inviteErr } = await supabase
        .from('campaign_invitations')
        .update({ status: 'accepted' })
        .eq('id', invite.id);
      if (inviteErr) throw inviteErr;

      return campaign;
    },
    onSuccess: (campaign) => {
      toast.success(`Joined "${campaign.title || campaign.name || 'campaign'}"`);
      queryClient.invalidateQueries({ queryKey: ['pendingCampaignInvites'] });
      queryClient.invalidateQueries({ queryKey: ['userCampaigns'] });
      // Layout's nav badge reads the same data; invalidate its query
      // family too so the count drops immediately.
      queryClient.invalidateQueries({ queryKey: ['campaignInvitations'] });
    },
    onError: (err) => {
      toast.error(`Couldn't accept: ${err?.message || err}`);
    },
  });

  // Decline is a soft delete — set status to 'declined' so the GM's
  // pending list reflects it but the row stays for audit. Matches
  // the friends-decline pattern.
  const declineInviteMutation = useMutation({
    mutationFn: async (invite) => {
      const { error } = await supabase
        .from('campaign_invitations')
        .update({ status: 'declined' })
        .eq('id', invite.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitation declined');
      queryClient.invalidateQueries({ queryKey: ['pendingCampaignInvites'] });
      queryClient.invalidateQueries({ queryKey: ['campaignInvitations'] });
    },
    onError: (err) => {
      toast.error(`Couldn't decline: ${err?.message || err}`);
    },
  });

  const dmCampaigns = campaigns.filter(c => c.game_master_id === user?.id && c.status !== 'archived');
  const playerCampaigns = campaigns.filter(c => c.player_ids?.includes(user?.id) && c.status !== 'archived' && c.game_master_id !== user?.id);
  const archivedCampaigns = campaigns.filter(c => c.status === 'archived');

  return (
    <div className="relative min-h-screen">
      <div
        className="h-96 bg-cover bg-top relative"
        style={{
          backgroundImage: 'url(https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/KarliahandLadle.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'top'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#1E2430]" />
        <div className="absolute inset-0 flex items-center justify-start pl-40">
          <div className="text-left">
            <h1 className="text-5xl font-bold text-white mb-2" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.75)' }}>
              Welcome Back, {user?.username || 'Adventurer'}.
            </h1>
            <p className="text-3xl text-white" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.75)' }}>
              What are we playing today?
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 space-y-8">
        {/* Pending Invitations — sits above the carousels so a fresh
            invite is the first thing the user sees on this page. */}
        {pendingInvitations.length > 0 && (
          <section className="bg-[#2A3441] rounded-xl p-6 border border-[#37F2D1]/30">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#37F2D1]" />
              Pending Invitations
              <span className="text-sm font-normal text-gray-400">({pendingInvitations.length})</span>
            </h2>
            <div className="space-y-3">
              {pendingInvitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-4 p-4 bg-[#1E2430] rounded-lg"
                >
                  {invite.inviter_avatar ? (
                    <img
                      src={invite.inviter_avatar}
                      alt={invite.inviter_username || 'GM'}
                      className="w-12 h-12 rounded-full object-cover border border-gray-600"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#37F2D1]/20 border border-[#37F2D1]/40 flex items-center justify-center text-[#37F2D1] font-bold text-lg">
                      {(invite.inviter_username || 'GM').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">
                      <span className="font-semibold">{invite.inviter_username || 'A GM'}</span>
                      {' invited you to '}
                      <span className="font-semibold text-[#37F2D1]">
                        {invite.campaign_name || 'a campaign'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(invite.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => acceptInviteMutation.mutate(invite)}
                      disabled={acceptInviteMutation.isPending || declineInviteMutation.isPending}
                      className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
                      size="sm"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      onClick={() => declineInviteMutation.mutate(invite)}
                      disabled={acceptInviteMutation.isPending || declineInviteMutation.isPending}
                      variant="outline"
                      className="border-gray-600 text-gray-200 hover:bg-[#2A3441]"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {campaignsLoading && campaigns.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}
        {dmCampaigns.length > 0 && (
          <CampaignCarousel
            title="Your Campaigns (DM)"
            campaigns={dmCampaigns}
            showPlayButton
            showArchiveButton
            currentUserId={user?.id}
          />
        )}

        {playerCampaigns.length > 0 && (
          <CampaignCarousel
            title="Playing In"
            campaigns={playerCampaigns}
            showPlayButton
            currentUserId={user?.id}
          />
        )}

        {archivedCampaigns.length > 0 && (
          <CampaignCarousel
            title="Archived Games"
            campaigns={archivedCampaigns}
            showUnarchiveButton
            grayscale
            currentUserId={user?.id}
          />
        )}
      </div>
    </div>
  );
}
