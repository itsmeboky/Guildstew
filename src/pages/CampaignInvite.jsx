import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, Link as LinkIcon, Copy, Check, ArrowLeft, RefreshCw, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CampaignInvite() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    initialData: null
  });

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }),
    enabled: !!campaignId,
    select: (data) => data[0],
    initialData: []
  });

  const { data: allFriendships } = useQuery({
    queryKey: ['friendships'],
    queryFn: () => base44.entities.Friend.list(),
    initialData: []
  });

  const { data: allUserProfiles } = useQuery({
    queryKey: ['allUserProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
    initialData: []
  });

  const { data: pendingInvitations } = useQuery({
    queryKey: ['pendingInvitations', campaignId],
    queryFn: () => base44.entities.CampaignInvitation.filter({ campaign_id: campaignId, status: 'pending' }),
    enabled: !!campaignId,
    initialData: []
  });

  const { data: currentUserProfile } = useQuery({
    queryKey: ['currentUserProfile', user?.id],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: user?.id }).then(profiles => profiles[0]),
    enabled: !!user?.id,
    initialData: null
  });

  const friends = React.useMemo(() => {
    if (!allFriendships || !allUserProfiles || !currentUserProfile) return [];
    
    const friendships = allFriendships.filter(f => 
      (f.user_id === currentUserProfile.user_id || f.friend_id === currentUserProfile.user_id) && f.status === 'accepted'
    );
    
    const friendIds = friendships.map(f => 
      f.user_id === currentUserProfile.user_id ? f.friend_id : f.user_id
    );
    
    return allUserProfiles.filter(p => friendIds.includes(p.user_id));
  }, [allFriendships, allUserProfiles, currentUserProfile]);

  const [invitingFriendId, setInvitingFriendId] = useState(null);

  const addPlayerMutation = useMutation({
    mutationFn: async (friendId) => {
      const currentPlayers = campaign.player_ids || [];
      if (currentPlayers.includes(friendId)) {
        throw new Error('Player already in campaign');
      }
      // Campaigns cap at 8 players + 1 GM. Use the GM-chosen cap but
      // never go above the hard ceiling.
      const cap = Math.min(campaign.max_players || 8, 8);
      if (currentPlayers.length >= cap) {
        throw new Error(`This campaign is full (max ${cap} players).`);
      }
      
      // Check if already invited
      const existingInvite = pendingInvitations.find(inv => inv.invited_user_id === friendId);
      if (existingInvite) {
        throw new Error('Player already has a pending invitation');
      }

      // Create invitation record. invited_user_id is the recipient;
      // invited_by is the GM who sent it. The table column is
      // invited_user_id, NOT user_id.
      //
      // The denormalized fields (campaign_name, inviter_username,
      // inviter_avatar) populate the recipient's pending-invites
      // inbox without forcing a JOIN to campaigns + user_profiles
      // on every render. Schema added in
      // 20261127_campaign_invite_codes_and_inbox.sql.
      await base44.entities.CampaignInvitation.create({
        campaign_id: campaignId,
        invited_user_id: friendId,
        invited_by: user.id,
        status: 'pending',
        campaign_name: campaign.title || campaign.name || null,
        inviter_username:
          currentUserProfile?.username ||
          (user?.email ? user.email.split('@')[0] : null),
        inviter_avatar: currentUserProfile?.avatar_url || null,
      });
      
      return friendId;
    },
    onSuccess: (friendId) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaignInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations', campaignId] });
      toast.success('Invitation sent to player');
      setInvitingFriendId(null);
    },
    onError: (error) => {
      toast.error(error.message);
      setInvitingFriendId(null);
    }
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId) => {
      await base44.entities.CampaignInvitation.delete(inviteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaignInvitations'] });
      toast.success('Invitation cancelled');
    }
  });

  const inviteLink = `${window.location.origin}/CampaignJoin?id=${campaignId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Invite link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Share-code state. The campaigns row already carries an
  // invite_code (CreateCampaign.jsx generates one client-side on
  // create, the 20261127 migration backfills any legacy NULLs).
  // We just display + copy + regenerate it here.
  const [codeCopied, setCodeCopied] = useState(false);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);

  const handleCopyCode = () => {
    if (!campaign?.invite_code) return;
    navigator.clipboard.writeText(campaign.invite_code);
    setCodeCopied(true);
    toast.success('Invite code copied to clipboard');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Regenerate via the SECURITY DEFINER RPC. The function checks
  // game_master_id = auth.uid() server-side, so a non-GM call is
  // rejected at the DB even if the client somehow surfaces the
  // button. Returns the new code; we update the cache so the UI
  // re-renders without a refetch.
  const regenerateCodeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc(
        'regenerate_campaign_invite_code',
        { p_campaign_id: campaignId },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (newCode) => {
      queryClient.setQueryData(['campaign', campaignId], (prev) =>
        prev ? { ...prev, invite_code: newCode } : prev
      );
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toast.success(`New invite code generated: ${newCode}`);
      setConfirmingRegenerate(false);
    },
    onError: (err) => {
      toast.error(`Couldn't regenerate code: ${err?.message || err}`);
      setConfirmingRegenerate(false);
    },
  });

  const isPlayerInCampaign = (friendId) => {
    return campaign?.player_ids?.includes(friendId);
  };

  const hasPendingInvite = (friendId) => {
    return pendingInvitations.some(inv => inv.invited_user_id === friendId);
  };

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading campaign...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E2430] p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("CampaignGMPanel") + `?id=${campaignId}`)}
          className="text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaign Panel
        </Button>
        
        <h1 className="text-4xl font-bold text-white mb-2">Invite Players</h1>
        <p className="text-gray-400 mb-2">Add friends or share an invite link for {campaign.title}</p>
        
        <div className="bg-[#2A3441] border-l-4 border-[#37F2D1] p-4 mb-8 rounded">
          <p className="text-white text-sm">
            <span className="font-semibold">Player Count:</span> {campaign.player_ids?.length || 0} / {Math.min(campaign.max_players || 8, 8)}
            <span className="text-gray-400 ml-2">Max 8 players + 1 GM.</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Friends List */}
          <div className="bg-[#2A3441] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-[#37F2D1]" />
              <h2 className="text-xl font-bold text-white">Invite Friends</h2>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {friends.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No friends to invite</p>
              ) : (
                friends.map((friend) => {
                  const alreadyInCampaign = isPlayerInCampaign(friend.user_id);
                  const pendingInvite = hasPendingInvite(friend.user_id);
                  
                  return (
                    <div
                      key={friend.user_id}
                      className="flex items-center justify-between p-3 bg-[#1E2430] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-[#37F2D1]">
                          {friend.avatar_url ? (
                            <img src={friend.avatar_url} alt={friend.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#1E2430] font-bold">
                              {friend.username?.[0] || 'U'}
                            </div>
                          )}
                        </div>
                        <span className="text-white font-medium">{friend.username}</span>
                      </div>
                      
                      {alreadyInCampaign ? (
                        <span className="text-sm text-gray-400">Already in campaign</span>
                      ) : pendingInvite ? (
                        <span className="text-sm text-yellow-400">Invited</span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setInvitingFriendId(friend.user_id);
                            addPlayerMutation.mutate(friend.user_id);
                          }}
                          disabled={invitingFriendId === friend.user_id && addPlayerMutation.isPending}
                          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                        >
                          {invitingFriendId === friend.user_id && addPlayerMutation.isPending ? 'Sending...' : 'Invite'}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Share Code + Share Link, stacked in the right column */}
          <div className="space-y-6">
            {/* Share Code */}
            <div className="bg-[#2A3441] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="w-5 h-5 text-[#37F2D1]" />
                <h2 className="text-xl font-bold text-white">Share Invite Code</h2>
              </div>

              <p className="text-gray-400 text-sm mb-4">
                Players paste this 6-character code into the
                <span className="text-white font-medium"> Enter Invite Code </span>
                modal to join. Permanent until you regenerate it.
              </p>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-[#050816] border border-[#37F2D1]/30 rounded-lg px-4 py-3 text-center">
                  <span className="font-mono text-3xl tracking-[0.4em] text-[#37F2D1] font-bold select-all">
                    {campaign?.invite_code || '------'}
                  </span>
                </div>
                <Button
                  onClick={handleCopyCode}
                  disabled={!campaign?.invite_code}
                  className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold h-[60px] px-4"
                  title="Copy code"
                >
                  {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </Button>
                <Button
                  onClick={() => setConfirmingRegenerate(true)}
                  variant="outline"
                  className="border-gray-600 text-gray-200 hover:bg-[#1E2430] h-[60px] px-4"
                  disabled={regenerateCodeMutation.isPending}
                  title="Regenerate code"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${regenerateCodeMutation.isPending ? 'animate-spin' : ''}`}
                  />
                </Button>
              </div>

              <p className="text-xs text-gray-500">
                Regenerating immediately invalidates the current code; existing players stay in the campaign.
              </p>
            </div>

            {/* Share Link */}
            <div className="bg-[#2A3441] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <LinkIcon className="w-5 h-5 text-[#FF5722]" />
                <h2 className="text-xl font-bold text-white">Share Invite Link</h2>
              </div>

            <p className="text-gray-400 text-sm mb-4">
              Share this link with anyone you want to invite to your campaign. They'll be able to join by clicking the link.
            </p>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="bg-[#1E2430] border-gray-700 text-white flex-1"
                />
                <Button
                  onClick={handleCopyLink}
                  className="bg-[#FF5722] hover:bg-[#FF6B3D] text-white"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              <div className="bg-[#1E2430] rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">How it works:</h3>
                <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
                  <li>Share the link via Discord, email, or social media</li>
                  <li>Recipients click the link to view campaign details</li>
                  <li>They can request to join your campaign</li>
                  <li>You'll be able to approve or deny their request</li>
                </ul>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="mt-6 bg-[#2A3441] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Pending Invitations ({pendingInvitations.length})</h2>
            <div className="space-y-2">
              {pendingInvitations.map((invite) => {
                const invitedProfile = allUserProfiles.find(p => p.user_id === invite.invited_user_id);
                if (!invitedProfile) return null;
                
                return (
                  <div key={invite.id} className="flex items-center justify-between p-3 bg-[#1E2430] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-[#37F2D1]">
                        {invitedProfile.avatar_url ? (
                          <img src={invitedProfile.avatar_url} alt={invitedProfile.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#1E2430] font-bold text-xs">
                            {invitedProfile.username?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                      <span className="text-white text-sm">{invitedProfile.username}</span>
                      <span className="text-xs text-yellow-400">• Pending</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelInviteMutation.mutate(invite.id)}
                      disabled={cancelInviteMutation.isPending}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      Cancel
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Current Players */}
        {campaign.player_ids && campaign.player_ids.length > 0 && (
          <div className="mt-6 bg-[#2A3441] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Current Players ({campaign.player_ids.length})</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {campaign.player_ids.map((playerId) => {
                const playerProfile = allUserProfiles.find(p => p.user_id === playerId);
                if (!playerProfile) return null;
                
                return (
                  <div key={playerId} className="flex items-center gap-2 p-2 bg-[#1E2430] rounded-lg">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-[#37F2D1]">
                      {playerProfile.avatar_url ? (
                        <img src={playerProfile.avatar_url} alt={playerProfile.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#1E2430] font-bold text-xs">
                          {playerProfile.username?.[0] || 'U'}
                        </div>
                      )}
                    </div>
                    <span className="text-white text-sm truncate">{playerProfile.username}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Regenerate-code confirmation dialog. Confirm prompt is the
          standard pattern for destructive actions in this app; the
          actual mutation runs only on confirm. The DB-side
          regenerate_campaign_invite_code RPC enforces GM ownership,
          so even if this dialog is bypassed via devtools, a
          non-GM call is rejected at the DB. */}
      <AlertDialog open={confirmingRegenerate} onOpenChange={setConfirmingRegenerate}>
        <AlertDialogContent className="bg-[#2A3441] border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Regenerate invite code?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              The current code will stop working immediately. Anyone who already has it will need the new code to join.
              Existing players in the campaign are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-[#1E2430]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => regenerateCodeMutation.mutate()}
              className="bg-[#FF5722] hover:bg-[#FF6B3D] text-white"
              disabled={regenerateCodeMutation.isPending}
            >
              {regenerateCodeMutation.isPending ? 'Generating…' : 'Regenerate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}