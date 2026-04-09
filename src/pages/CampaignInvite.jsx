import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Link as LinkIcon, Copy, Check, ArrowLeft } from "lucide-react";
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
      if (currentPlayers.length >= 12) {
        throw new Error('Campaign is full (maximum 12 players)');
      }
      
      // Check if already invited
      const existingInvite = pendingInvitations.find(inv => inv.user_id === friendId);
      if (existingInvite) {
        throw new Error('Player already has a pending invitation');
      }
      
      // Create invitation record
      await base44.entities.CampaignInvitation.create({
        campaign_id: campaignId,
        user_id: friendId,
        status: 'pending'
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

  const isPlayerInCampaign = (friendId) => {
    return campaign?.player_ids?.includes(friendId);
  };

  const hasPendingInvite = (friendId) => {
    return pendingInvitations.some(inv => inv.user_id === friendId);
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
            <span className="font-semibold">Player Count:</span> {campaign.player_ids?.length || 0} / 12
            <span className="text-gray-400 ml-2">(Recommended: 6 or fewer for best experience)</span>
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

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="mt-6 bg-[#2A3441] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Pending Invitations ({pendingInvitations.length})</h2>
            <div className="space-y-2">
              {pendingInvitations.map((invite) => {
                const invitedProfile = allUserProfiles.find(p => p.user_id === invite.user_id);
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
    </div>
  );
}