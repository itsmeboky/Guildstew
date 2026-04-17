import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserMinus, Gift, Award, Flag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { canManagePlayers } from "@/components/campaigns/permissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ReportUserDialog from "@/components/support/ReportUserDialog";

export default function CampaignPlayers() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showKickDialog, setShowKickDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showAchievementDialog, setShowAchievementDialog] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then(c => c[0]),
    enabled: !!campaignId
  });

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.UserProfile.list(),
    initialData: []
  });

  const { data: characters } = useQuery({
    queryKey: ['campaignCharacters', campaignId],
    queryFn: () => base44.entities.Character.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: []
  });

  const { data: allAchievements } = useQuery({
    queryKey: ['allAchievements'],
    queryFn: () => base44.entities.Achievement.list(),
    initialData: []
  });

  // Get unique achievement templates (remove duplicates)
  const achievementTemplates = React.useMemo(() => {
    const seen = new Set();
    return allAchievements.filter(a => {
      if (seen.has(a.title)) return false;
      seen.add(a.title);
      return true;
    });
  }, [allAchievements]);

  const rarityColors = {
    common: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  };

  const players = React.useMemo(() => {
    if (!campaign?.player_ids) return [];
    const uniquePlayerIds = [...new Set(campaign.player_ids)];
    const playerMap = new Map();
    
    uniquePlayerIds.forEach(playerId => {
      const profile = allUsers.find(u => u.user_id === playerId);
      if (profile && !playerMap.has(playerId)) {
        const character = characters.find(c => c.created_by === profile.email && c.campaign_id === campaignId);
        playerMap.set(playerId, { ...profile, character });
      }
    });
    
    return Array.from(playerMap.values());
  }, [campaign?.player_ids, allUsers, characters, campaignId]);

  const kickPlayerMutation = useMutation({
    mutationFn: async (playerId) => {
      const updatedPlayers = campaign.player_ids.filter(id => id !== playerId);
      await base44.entities.Campaign.update(campaignId, { player_ids: updatedPlayers });
      
      // Remove character from campaign
      const playerCharacters = characters.filter(c => {
        const profile = allUsers.find(u => u.user_id === playerId);
        return c.created_by === profile?.email && c.campaign_id === campaignId;
      });
      
      for (const character of playerCharacters) {
        await base44.entities.Character.update(character.id, { campaign_id: null });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaignCharacters', campaignId] });
      toast.success('Player removed from campaign');
      setShowKickDialog(false);
      setSelectedPlayer(null);
    }
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      const character = selectedPlayer.character;
      if (!character) throw new Error('No character found');
      
      const inventory = character.inventory || [];
      await base44.entities.Character.update(character.id, {
        inventory: [...inventory, { name: itemName, description: itemDescription, quantity: 1 }]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignCharacters', campaignId] });
      toast.success('Item added to player inventory');
      setShowItemDialog(false);
      setItemName("");
      setItemDescription("");
      setSelectedPlayer(null);
    }
  });

  const giveAchievementMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAchievement) throw new Error('No achievement selected');
      await base44.entities.Achievement.create({
        user_id: selectedPlayer.user_id,
        title: selectedAchievement.title,
        description: selectedAchievement.description,
        rarity: selectedAchievement.rarity,
        icon_url: selectedAchievement.icon_url,
        earned_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast.success('Achievement awarded to player');
      setShowAchievementDialog(false);
      setSelectedAchievement(null);
      setSelectedPlayer(null);
    }
  });

  if (!campaign) return <div className="min-h-screen bg-[#1E2430] flex items-center justify-center text-white">Loading...</div>;

  // Permission check - only GMs and Co-GMs can manage players
  if (!canManagePlayers(campaign, user?.id)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E2430] to-[#2A3441] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You don't have permission to manage players.</p>
          <Button onClick={() => navigate(-1)} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E2430] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Player Management</h1>
        <p className="text-gray-400 mb-8">{campaign.title}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {players.map((player) => (
            <div key={player.user_id} className="bg-[#2A3441] rounded-xl p-6 border border-[#FF5722]/20">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#FF5722]/40">
                  {player.avatar_url ? (
                    <img src={player.avatar_url} alt={player.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#FF5722] to-[#37F2D1] flex items-center justify-center text-white font-bold text-xl">
                      {player.username?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{player.username}</h3>
                  {player.character && (
                    <p className="text-sm text-gray-400">
                      Playing as {player.character.name} ({player.character.class} • Lvl {player.character.level})
                    </p>
                  )}
                </div>
              </div>

              {player.character && (
                <div className="bg-[#1E2430] rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-[#37F2D1] mb-2">Character Stats</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">HP:</span>
                      <span className="text-white ml-1">{player.character.hit_points?.current}/{player.character.hit_points?.max}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">AC:</span>
                      <span className="text-white ml-1">{player.character.armor_class}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Speed:</span>
                      <span className="text-white ml-1">{player.character.speed}ft</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setSelectedPlayer(player);
                    setShowItemDialog(true);
                  }}
                  size="sm"
                  className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                >
                  <Gift className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
                <Button
                  onClick={() => {
                    setSelectedPlayer(player);
                    setShowAchievementDialog(true);
                  }}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Award className="w-4 h-4 mr-1" />
                  Award
                </Button>
                <Button
                  onClick={() => {
                    setSelectedPlayer(player);
                    setShowKickDialog(true);
                  }}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <UserMinus className="w-4 h-4 mr-1" />
                  Kick
                </Button>
                {user?.id && player.user_id !== user.id && (
                  <Button
                    onClick={() => setReportTarget({ id: player.user_id, username: player.username })}
                    size="sm"
                    variant="outline"
                    className="border-amber-700 text-amber-400 hover:bg-amber-500/10"
                  >
                    <Flag className="w-4 h-4 mr-1" />
                    Report
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <ReportUserDialog
          open={!!reportTarget}
          onClose={() => setReportTarget(null)}
          reporterId={user?.id}
          targetUser={reportTarget}
          campaignId={campaignId}
        />

        {/* Kick Player Dialog */}
        <Dialog open={showKickDialog} onOpenChange={setShowKickDialog}>
          <DialogContent className="bg-[#1E2430] border-red-500 text-white">
            <DialogHeader>
              <DialogTitle>Remove Player?</DialogTitle>
            </DialogHeader>
            <p className="text-gray-400">Are you sure you want to remove {selectedPlayer?.username} from the campaign?</p>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => setShowKickDialog(false)} variant="outline">Cancel</Button>
              <Button
                onClick={() => kickPlayerMutation.mutate(selectedPlayer.user_id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Remove Player
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Item Dialog */}
        <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
          <DialogContent className="bg-[#1E2430] border-[#37F2D1] text-white">
            <DialogHeader>
              <DialogTitle>Add Item to {selectedPlayer?.character?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Item name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="bg-[#2A3441] border-gray-700"
              />
              <Textarea
                placeholder="Item description"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                className="bg-[#2A3441] border-gray-700"
              />
              <Button
                onClick={() => addItemMutation.mutate()}
                className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                disabled={!itemName}
              >
                Add Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Give Achievement Dialog */}
        <Dialog open={showAchievementDialog} onOpenChange={setShowAchievementDialog}>
          <DialogContent className="bg-[#1E2430] border-yellow-500 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Award Achievement to {selectedPlayer?.username}</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {achievementTemplates.map((achievement) => (
                <button
                  key={achievement.id}
                  onClick={() => setSelectedAchievement(achievement)}
                  className={`w-full flex items-center gap-3 bg-[#2A3441] rounded-lg p-4 transition-all ${
                    selectedAchievement?.id === achievement.id ? 'ring-2 ring-yellow-500' : 'hover:bg-[#2A3441]/80'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg ${rarityColors[achievement.rarity]} border flex items-center justify-center flex-shrink-0`}>
                    {achievement.icon_url ? (
                      <img src={achievement.icon_url} alt={achievement.title} className="w-8 h-8" />
                    ) : (
                      <Award className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-bold text-sm">{achievement.title}</h4>
                    <p className="text-xs text-gray-400">{achievement.description}</p>
                    <span className={`text-xs ${rarityColors[achievement.rarity]} px-2 py-0.5 rounded mt-1 inline-block`}>
                      {achievement.rarity}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <Button
              onClick={() => giveAchievementMutation.mutate()}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white mt-4"
              disabled={!selectedAchievement}
            >
              Award Achievement
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}