import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Check, X, Bell, Plus, Filter } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { trackEvent } from "@/utils/analytics";

const AVAILABLE_TAGS = [
  "High Fantasy", "Low Fantasy", "Dark Fantasy", "Urban Fantasy",
  "Sci-Fi", "Cyberpunk", "Space Opera", "Post-Apocalyptic",
  "Horror", "Mystery", "Comedy", "Drama",
  "Historical", "Steampunk", "Homebrew", "Casual",
  "Roleplay-Heavy", "Combat-Heavy", "Exploration", "Political Intrigue"
];

export default function JoinCampaign() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    initialData: null
  });

  const { data: currentUserProfile } = useQuery({
    queryKey: ['currentUserProfile', user?.id],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: user?.id }).then(profiles => profiles[0]),
    enabled: !!user?.id,
    initialData: null
  });

  const { data: invitations } = useQuery({
    queryKey: ['campaignInvitations', user?.id],
    queryFn: () => base44.entities.CampaignInvitation.filter({ invited_user_id: user?.id, status: 'pending' }),
    enabled: !!user?.id,
    refetchInterval: 5000,
    initialData: []
  });

  const { data: campaigns } = useQuery({
    queryKey: ['allCampaigns'],
    queryFn: () => base44.entities.Campaign.list(),
    initialData: []
  });

  const { data: characters } = useQuery({
    queryKey: ['userCharacters'],
    queryFn: () => base44.entities.Character.filter({ created_by: user?.email }),
    enabled: !!user,
    initialData: []
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async ({ inviteId, characterId }) => {
      const invite = invitations.find(i => i.id === inviteId);
      if (!invite) throw new Error('Invitation not found');
      
      const campaign = await base44.entities.Campaign.filter({ id: invite.campaign_id });
      if (!campaign[0]) throw new Error('Campaign not found');
      
      const currentPlayers = campaign[0].player_ids || [];
      if (currentPlayers.length >= 12) {
        throw new Error('Campaign is full');
      }
      
      await base44.entities.Campaign.update(invite.campaign_id, {
        player_ids: [...currentPlayers, user.id]
      });
      
      if (characterId) {
        await base44.entities.Character.update(characterId, {
          campaign_id: invite.campaign_id
        });
      }
      
      await base44.entities.CampaignInvitation.update(inviteId, { status: 'accepted' });

      // Add the player to the campaign's group chat so they can see
      // the out-of-game coordination channel immediately after joining.
      try {
        const campaignChats = await base44.entities.ChatConversation.filter({
          campaign_id: invite.campaign_id,
          type: 'group',
        });
        if (campaignChats.length > 0) {
          const chat = campaignChats[0];
          const participants = chat.participant_ids || [];
          if (!participants.includes(user.id)) {
            await base44.entities.ChatConversation.update(chat.id, {
              participant_ids: [...participants, user.id],
            });
          }
        }
      } catch (err) {
        // Don't block campaign join if the chat update fails.
        console.error('Failed to join campaign group chat:', err);
      }
    },
    onSuccess: () => {
      const campaignId = selectedInvite?.campaign_id;
      queryClient.invalidateQueries({ queryKey: ['campaignInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['userCampaigns'] });
      queryClient.invalidateQueries({ queryKey: ['userCharacters'] });
      queryClient.invalidateQueries({ queryKey: ['campaignCharacters', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      trackEvent(user?.id, 'campaign_joined', { campaign_id: campaignId });
      toast.success('Joined campaign successfully');
      setShowCharacterSelect(false);
      setSelectedInvite(null);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleAcceptInvite = (invite) => {
    setSelectedInvite(invite);
    setShowCharacterSelect(true);
  };

  const handleCharacterSelect = (characterId) => {
    acceptInviteMutation.mutate({ inviteId: selectedInvite.id, characterId });
  };

  const handleCreateNewCharacter = () => {
    const campaign = campaigns.find(c => c.id === selectedInvite.campaign_id);
    acceptInviteMutation.mutate({ inviteId: selectedInvite.id, characterId: null });
    navigate(createPageUrl("CharacterCreator") + `?campaignId=${campaign.id}`);
  };

  const declineInviteMutation = useMutation({
    mutationFn: (inviteId) => base44.entities.CampaignInvitation.update(inviteId, { status: 'declined' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignInvitations'] });
      toast.success('Invitation declined');
    }
  });

  const toggleTagFilter = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredCampaigns = campaigns.filter(c => {
    const isOpen = c.game_master_id !== user?.id && 
      !c.player_ids?.includes(user?.id) &&
      c.status === 'recruiting';
    
    if (!isOpen) return false;
    
    if (selectedTags.length > 0) {
      const campaignTags = c.tags || [];
      const hasMatchingTag = selectedTags.some(tag => campaignTags.includes(tag));
      if (!hasMatchingTag) return false;
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = c.title?.toLowerCase().includes(query);
      const matchesDescription = c.description?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDescription) return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-[#1E2430] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Join a Campaign</h1>
        <p className="text-gray-400 mb-8">Accept invitations or search for open campaigns</p>

        <Tabs defaultValue="invites" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#2A3441]">
            <TabsTrigger value="invites" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <Bell className="w-4 h-4 mr-2" />
              Invitations {invitations.length > 0 && `(${invitations.length})`}
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <Search className="w-4 h-4 mr-2" />
              Search Campaigns
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invites" className="mt-6">
            <div className="space-y-4">
              {invitations.length === 0 ? (
                <div className="bg-[#2A3441] rounded-xl p-12 text-center">
                  <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No pending invitations</p>
                </div>
              ) : (
                invitations.map((invite) => {
                  const campaign = campaigns.find(c => c.id === invite.campaign_id);
                  if (!campaign) return null;

                  return (
                    <div key={invite.id} className="bg-[#2A3441] rounded-xl p-6 flex gap-6">
                      <div className="w-48 h-32 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={campaign.cover_image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&h=300&fit=crop'}
                          alt={campaign.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">{campaign.title}</h3>
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                          {campaign.description || 'No description available'}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                          <span>System: {campaign.system}</span>
                          <span>Players: {campaign.player_ids?.length || 0}/12</span>
                        </div>
                        
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleAcceptInvite(invite)}
                            disabled={acceptInviteMutation.isPending}
                            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            onClick={() => declineInviteMutation.mutate(invite.id)}
                            disabled={declineInviteMutation.isPending}
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-[#1E2430]"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="search" className="mt-6">
            <div className="space-y-4 mb-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search campaigns by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#2A3441] border-gray-700 text-white pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTags([]);
                  }}
                  className="border-gray-700 text-gray-300 hover:text-white hover:bg-[#1E2430]"
                >
                  Clear Filters
                </Button>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <Label className="text-white">Filter by Tags</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-[#37F2D1] text-[#1E2430]'
                            : 'bg-[#2A3441] text-white hover:bg-[#37F2D1] hover:text-[#1E2430]'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                {selectedTags.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    Filtering by: {selectedTags.join(", ")}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {filteredCampaigns.length === 0 ? (
                <div className="bg-[#2A3441] rounded-xl p-12 text-center">
                  <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No open campaigns found</p>
                </div>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-[#2A3441] rounded-xl p-6 flex gap-6">
                    <div className="w-48 h-32 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={campaign.cover_image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&h=300&fit=crop'}
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{campaign.title}</h3>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {campaign.description || 'No description available'}
                      </p>
                      {campaign.tags && campaign.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {campaign.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-[#37F2D1]/20 text-[#37F2D1] rounded-full text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>System: {campaign.system}</span>
                        <span>Players: {campaign.player_ids?.length || 0}/12</span>
                        <span className="text-[#37F2D1]">Recruiting</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={showCharacterSelect} onOpenChange={setShowCharacterSelect}>
          <DialogContent className="bg-[#1E2430] border-[#FF5722]/30 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Choose Your Character</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <Button
                onClick={handleCreateNewCharacter}
                className="w-full bg-gradient-to-r from-[#FF5722] to-[#37F2D1] hover:opacity-90 text-white py-6 text-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Character for This Campaign
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#1E2430] px-2 text-gray-400">Or choose existing</span>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {characters.filter(c => !c.campaign_id).map((character) => (
                  <button
                    key={character.id}
                    onClick={() => handleCharacterSelect(character.id)}
                    className="w-full bg-[#2A3441] hover:bg-[#37F2D1]/20 rounded-lg p-4 flex items-center gap-4 transition-colors border border-gray-700 hover:border-[#37F2D1]"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-[#FF5722]/40">
                      {character.profile_avatar_url ? (
                        <img src={character.profile_avatar_url} alt={character.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#FF5722] to-[#37F2D1] flex items-center justify-center text-2xl font-bold">
                          {character.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-white font-bold">{character.name}</p>
                      <p className="text-sm text-gray-400">{character.class} • Level {character.level}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}