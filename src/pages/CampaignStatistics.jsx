import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Users, Sword, Heart, Shield, Target, Zap, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

export default function CampaignStatistics() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const navigate = useNavigate();

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then(campaigns => campaigns[0]),
    enabled: !!campaignId,
    staleTime: 30000
  });

  const { data: allUserProfiles } = useQuery({
    queryKey: ['allUserProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
    staleTime: 60000,
    initialData: []
  });

  const { data: characters } = useQuery({
    queryKey: ['campaignCharacters', campaignId],
    queryFn: () => base44.entities.Character.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    staleTime: 30000,
    initialData: []
  });

  const { data: updates } = useQuery({
    queryKey: ['campaignUpdates', campaignId],
    queryFn: () => base44.entities.CampaignUpdate.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: []
  });

  const { data: npcs } = useQuery({
    queryKey: ['campaignNPCs', campaignId],
    queryFn: () => base44.entities.CampaignNPC.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: []
  });

  if (!campaign) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  const gmProfile = allUserProfiles.find(u => u.user_id === campaign.game_master_id);

  // Calculate player statistics - deduplicate player IDs first
  const uniquePlayerIds = [...new Set(campaign.player_ids || [])];
  const playerStats = uniquePlayerIds.map(playerId => {
    const profile = allUserProfiles.find(u => u.user_id === playerId);
    const character = characters.find(c => c.created_by === profile?.email && c.campaign_id === campaignId);
    
    return {
      profile,
      character,
      stats: character?.stats || {
        dps: 0,
        healing: 0,
        nat_20s: 0,
        nat_1s: 0,
        accuracy: 0,
        defense: 0,
        critical_hits: 0,
        downed: 0
      }
    };
  }).filter(p => p.profile) || [];

  // Campaign runtime stats
  const avgSessionLength = campaign.session_count > 0 ? (campaign.total_hours / campaign.session_count).toFixed(1) : 0;
  const campaignAgeInDays = Math.floor((Date.now() - new Date(campaign.created_date).getTime()) / (1000 * 60 * 60 * 24));

  // GM stats
  const gmStats = {
    totalUpdates: updates.length,
    totalNPCs: npcs.length,
    totalPlayers: campaign.player_ids?.length || 0,
    sessionsRun: campaign.session_count || 0,
    avgPlayersPerSession: campaign.player_ids?.length || 0
  };

  // Aggregate player combat stats for chart
  const combatStatsData = playerStats.map(p => ({
    name: p.character?.name || 'No Character',
    DPS: p.stats.dps || 0,
    Healing: p.stats.healing || 0,
    Defense: p.stats.defense || 0,
    CriticalHits: p.stats.critical_hits || 0
  }));

  // Aggregate dice roll stats
  const diceStatsData = playerStats.map(p => ({
    name: p.character?.name || 'No Character',
    'Natural 20s': p.stats.nat_20s || 0,
    'Natural 1s': p.stats.nat_1s || 0
  }));

  // Average party stats for radar
  const avgPartyStats = {
    dps: playerStats.reduce((sum, p) => sum + (p.stats.dps || 0), 0) / (playerStats.length || 1),
    healing: playerStats.reduce((sum, p) => sum + (p.stats.healing || 0), 0) / (playerStats.length || 1),
    defense: playerStats.reduce((sum, p) => sum + (p.stats.defense || 0), 0) / (playerStats.length || 1),
    accuracy: playerStats.reduce((sum, p) => sum + (p.stats.accuracy || 0), 0) / (playerStats.length || 1),
    criticalHits: playerStats.reduce((sum, p) => sum + (p.stats.critical_hits || 0), 0) / (playerStats.length || 1)
  };

  const radarData = [
    { stat: 'DPS', value: avgPartyStats.dps },
    { stat: 'Healing', value: avgPartyStats.healing },
    { stat: 'Defense', value: avgPartyStats.defense },
    { stat: 'Accuracy', value: avgPartyStats.accuracy },
    { stat: 'Critical Hits', value: avgPartyStats.criticalHits }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E2430] to-[#2A3441] p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          onClick={() => navigate(createPageUrl("CampaignGMPanel") + `?id=${campaignId}`)}
          variant="ghost"
          className="mb-4 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaign
        </Button>

        <h1 className="text-4xl font-bold mb-2">{campaign.title}</h1>
        <p className="text-gray-400 mb-8">Campaign Statistics</p>

        {/* Campaign Runtime Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-[#2A3441] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-8 h-8 text-[#37F2D1]" />
              <div>
                <p className="text-gray-400 text-sm">Total Sessions</p>
                <p className="text-3xl font-bold">{campaign.session_count || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#2A3441] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-8 h-8 text-[#FF5722]" />
              <div>
                <p className="text-gray-400 text-sm">Total Hours</p>
                <p className="text-3xl font-bold">{campaign.total_hours || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#2A3441] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-gray-400 text-sm">Avg Session Length</p>
                <p className="text-3xl font-bold">{avgSessionLength}h</p>
              </div>
            </div>
          </div>

          <div className="bg-[#2A3441] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-[#37F2D1]" />
              <div>
                <p className="text-gray-400 text-sm">Campaign Age</p>
                <p className="text-3xl font-bold">{campaignAgeInDays} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* GM Stats */}
        <div className="bg-[#2A3441] rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#FF5722]" />
            Game Master Statistics
          </h2>
          <div className="grid grid-cols-5 gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-[#37F2D1] mb-2">{gmStats.sessionsRun}</p>
              <p className="text-gray-400 text-sm">Sessions Run</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-[#37F2D1] mb-2">{gmStats.totalUpdates}</p>
              <p className="text-gray-400 text-sm">Campaign Updates</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-[#37F2D1] mb-2">{gmStats.totalNPCs}</p>
              <p className="text-gray-400 text-sm">NPCs Created</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-[#37F2D1] mb-2">{gmStats.totalPlayers}</p>
              <p className="text-gray-400 text-sm">Active Players</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-[#37F2D1] mb-2">{gmStats.avgPlayersPerSession}</p>
              <p className="text-gray-400 text-sm">Avg Players/Session</p>
            </div>
          </div>
          {gmProfile && (
            <div className="mt-6 pt-6 border-t border-gray-700 flex items-center gap-3">
              {gmProfile.avatar_url && (
                <img src={gmProfile.avatar_url} alt={gmProfile.username} className="w-12 h-12 rounded-full" />
              )}
              <div>
                <p className="text-sm text-gray-400">Game Master</p>
                <p className="font-bold">@{gmProfile.username}</p>
              </div>
            </div>
          )}
        </div>

        {/* Average Party Composition */}
        <div className="bg-[#2A3441] rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Average Party Statistics</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#4A5568" />
              <PolarAngleAxis dataKey="stat" stroke="#fff" />
              <PolarRadiusAxis stroke="#4A5568" />
              <Radar name="Party Average" dataKey="value" stroke="#37F2D1" fill="#37F2D1" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Player Combat Stats */}
        <div className="bg-[#2A3441] rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Player Combat Statistics</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={combatStatsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="name" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#2A3441', border: '1px solid #37F2D1' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="DPS" fill="#FF5722" />
              <Bar dataKey="Healing" fill="#37F2D1" />
              <Bar dataKey="Defense" fill="#FFB020" />
              <Bar dataKey="CriticalHits" fill="#9333EA" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Dice Roll Stats */}
        <div className="bg-[#2A3441] rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Dice Roll Statistics</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={diceStatsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="name" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#2A3441', border: '1px solid #37F2D1' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="Natural 20s" fill="#10B981" />
              <Bar dataKey="Natural 1s" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Individual Player Stats */}
        <div className="bg-[#2A3441] rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-6">Individual Player Statistics</h2>
          <div className="space-y-4">
            {playerStats.map((player, idx) => (
              <div key={idx} className="bg-[#1E2430] rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {player.profile.avatar_url && (
                      <img src={player.profile.avatar_url} alt={player.profile.username} className="w-16 h-16 rounded-full" />
                    )}
                    <div>
                      <p className="text-xl font-bold">{player.character?.name || 'No Character'}</p>
                      <p className="text-gray-400">@{player.profile.username}</p>
                      {player.character && (
                        <p className="text-sm text-[#37F2D1]">Level {player.character.level} {player.character.class}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <Sword className="w-6 h-6 text-[#FF5722] mx-auto mb-2" />
                    <p className="text-2xl font-bold">{player.stats.dps || 0}</p>
                    <p className="text-xs text-gray-400">DPS</p>
                  </div>
                  <div className="text-center">
                    <Heart className="w-6 h-6 text-[#37F2D1] mx-auto mb-2" />
                    <p className="text-2xl font-bold">{player.stats.healing || 0}</p>
                    <p className="text-xs text-gray-400">Healing</p>
                  </div>
                  <div className="text-center">
                    <Shield className="w-6 h-6 text-[#FFB020] mx-auto mb-2" />
                    <p className="text-2xl font-bold">{player.stats.defense || 0}</p>
                    <p className="text-xs text-gray-400">Defense</p>
                  </div>
                  <div className="text-center">
                    <Target className="w-6 h-6 text-[#9333EA] mx-auto mb-2" />
                    <p className="text-2xl font-bold">{player.stats.accuracy || 0}%</p>
                    <p className="text-xs text-gray-400">Accuracy</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700">
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-400">{player.stats.nat_20s || 0}</p>
                    <p className="text-xs text-gray-400">Nat 20s</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-red-400">{player.stats.nat_1s || 0}</p>
                    <p className="text-xs text-gray-400">Nat 1s</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-yellow-400">{player.stats.critical_hits || 0}</p>
                    <p className="text-xs text-gray-400">Critical Hits</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-purple-400">{player.stats.downed || 0}</p>
                    <p className="text-xs text-gray-400">Times Downed</p>
                  </div>
                </div>
              </div>
            ))}

            {playerStats.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>No player statistics yet. Stats will appear once the campaign begins!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}