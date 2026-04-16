import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2 } from "lucide-react";
import TimeTracker from "@/components/worldLore/TimeTracker";
import LazyImage from "@/components/ui/LazyImage";

const CLASS_ICONS = {
  "Barbarian": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/a6652f2d8_Barbarian1.png",
  "Bard": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/cbe7f7dba_Bard1.png",
  "Cleric": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/15fe6ef24_Cleric1.png",
  "Druid": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/ef43c9ff2_Druid1.png",
  "Fighter": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/5e1b2cd68_Fighter1.png",
  "Monk": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/f2e85e13a_Monk1.png",
  "Paladin": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/1eb7cd2f2_Paladin1.png",
  "Ranger": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/748e5be38_Ranger1.png",
  "Rogue": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/a66f2aac1_Rogue1.png",
  "Sorcerer": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/6f5b501db_Sorceror1.png",
  "Warlock": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/184c98268_Warlock1.png",
  "Wizard": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/94cfaa28a_Wizard1.png"
};

export default function CampaignGMPanel() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then(campaigns => campaigns[0]),
    enabled: !!campaignId,
    staleTime: 2000,
    refetchInterval: 2000
  });

  const { data: allUserProfiles, isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['allUserProfiles'],
    queryFn: () => base44.entities.UserProfile.list(null, 1000),
    staleTime: 60000
  });

  const { data: characters, isLoading: isLoadingCharacters } = useQuery({
    queryKey: ['campaignCharacters', campaignId],
    queryFn: () => base44.entities.Character.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    staleTime: 30000
  });

  const players = React.useMemo(() => {
    const playerMap = new Map();
    const claimedCharacterIds = new Set();

    // 1. Real players: those in campaign.player_ids with a matching profile.
    if (campaign?.player_ids && allUserProfiles) {
      const uniquePlayerIds = [...new Set(campaign.player_ids)];
      uniquePlayerIds.forEach(playerId => {
        const profile = allUserProfiles.find(u => u.user_id === playerId);
        if (profile && !playerMap.has(playerId)) {
          const character = characters?.find(c => c.created_by === profile.email && c.campaign_id === campaignId);
          if (character) claimedCharacterIds.add(character.id);
          playerMap.set(playerId, { ...profile, character });
        }
      });
    }

    // 2. Orphan characters in this campaign — render as "ghost" players so
    // GM-controlled / seeded / left-over characters still show up.
    (characters || []).forEach(char => {
      if (char.campaign_id !== campaignId) return;
      if (claimedCharacterIds.has(char.id)) return;
      const ghostKey = `ghost-${char.id}`;
      playerMap.set(ghostKey, {
        user_id: ghostKey,
        email: char.created_by || 'ghost@local',
        username: char.name || 'Unclaimed',
        avatar_url: char.profile_avatar_url,
        profile_color_1: '#FF5722',
        profile_color_2: '#37F2D1',
        character: char,
        isGhost: true,
      });
    });

    return Array.from(playerMap.values());
  }, [campaign?.player_ids, allUserProfiles, characters, campaignId]);

  const toggleSessionMutation = useMutation({
    mutationFn: async ({ active }) => {
      const updateData = { is_session_active: active };
      if (active) {
        // Heal all characters to full on session start
        const campaignChars = await base44.entities.Character.filter({ campaign_id: campaignId });
        await Promise.all(campaignChars.map(char => {
          if (char.hit_points?.max) {
            return base44.entities.Character.update(char.id, {
              hit_points: { ...char.hit_points, current: char.hit_points.max }
            });
          }
          return Promise.resolve();
        }));
      } else {
        updateData.ready_player_ids = [];
        updateData.last_session_ended_at = new Date().toISOString();
      }
      return base44.entities.Campaign.update(campaignId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaignCharacters', campaignId] });
    }
  });

  // Preload mutations used to invoke Edge Functions that never
  // shipped (preloadDnd5eMonsters / preloadDnd5eItems). Game data is
  // now auto-seeded by a database trigger on campaign creation, so
  // these mutations are no-ops kept only so the useEffect call sites
  // below don't need to be restructured. If a campaign needs a reseed
  // it happens at the DB layer.
  const preloadMonstersMutation = useMutation({
    mutationFn: async () => null,
  });

  const preloadItemsMutation = useMutation({
    mutationFn: async () => null,
  });

  useEffect(() => {
    // Intentionally empty: the database trigger seeds every D&D 5e
    // campaign with its monsters and items at creation time. We used
    // to check here and call dead Edge Functions, which produced CORS
    // errors on every GM panel mount.
  }, [campaign, campaignId]);

  const handleStartSession = () => {
    toggleSessionMutation.mutate({ active: true }, {
      onSuccess: () => {
        navigate(createPageUrl("GMPanel") + `?id=${campaignId}`);
      }
    });
  };

  const handleEndSession = () => {
    toggleSessionMutation.mutate({ active: false });
  };

  // Get current time info - MUST be before conditional return
  const currentTime = React.useMemo(() => {
    if (!campaign?.calendar_system) return null;
    const cal = campaign.calendar_system;
    const current = cal.current_date || { year: 1, month: 1, day: 1, hour: 0 };
    const monthName = cal.month_names?.[current.month - 1] || `M${current.month}`;
    const dayName = cal.day_names?.[(current.day - 1) % cal.days_per_week] || '';
    const isDaytime = current.hour >= (cal.dawn_hour || 6) && current.hour < (cal.dusk_hour || 18);
    
    return {
      monthName,
      dayName,
      day: current.day,
      year: current.year,
      hour: current.hour,
      isDaytime
    };
  }, [campaign?.calendar_system]);

  if (!campaign || isLoadingProfiles || isLoadingCharacters) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1E2430] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#37F2D1]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Time Display */}
      <div className="fixed top-4 right-4 z-10 flex flex-col items-end gap-2">
        {currentTime && (
          <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700/50">
            <div className="text-right">
              <div className="text-xs text-gray-400">{currentTime.dayName}</div>
              <div className="text-sm font-semibold text-white">
                {currentTime.monthName} {currentTime.day}, Year {currentTime.year}
              </div>
              <div className="text-xs text-gray-400 flex items-center justify-end gap-1 mt-1">
                <span>Hour {currentTime.hour}</span>
                <span className={currentTime.isDaytime ? 'text-yellow-400' : 'text-blue-400'}>
                  {currentTime.isDaytime ? '☀' : '🌙'}
                </span>
              </div>
            </div>
          </div>
        )}
        {campaign.last_session_ended_at && (
          <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700/50 text-xs text-gray-400">
            Last session: {new Date(campaign.last_session_ended_at).toLocaleString()}
          </div>
        )}
      </div>
      
      {/* Hero Banner */}
      <div 
        className="h-96 bg-cover bg-center relative"
        style={{ 
          backgroundImage: `url(${campaign.cover_image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200&h=400&fit=crop'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-[#1E2430]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-white/80 mb-2">Currently Playing</p>
            <h1 className="text-6xl font-bold text-white mb-8" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>
              {campaign.title}
            </h1>
            <div className="flex items-center justify-center gap-4">
              {campaign.is_session_active ? (
                <Button 
                  className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] px-8 py-6 text-lg"
                  onClick={() => navigate(createPageUrl("GMPanel") + `?id=${campaignId}`)}
                >
                  Resume Session
                </Button>
              ) : (
                <Button 
                  className="bg-[#1E2430] hover:bg-[#2A3441] text-white px-8 py-6 text-lg"
                  onClick={handleStartSession}
                  disabled={toggleSessionMutation.isPending}
                >
                  {toggleSessionMutation.isPending ? "Starting..." : "Start Session"}
                </Button>
              )}
              <Button 
                className="bg-[#FF5722] hover:bg-[#FF6B3D] text-white px-8 py-6 text-lg"
                onClick={handleEndSession}
                disabled={toggleSessionMutation.isPending || !campaign.is_session_active}
              >
                {toggleSessionMutation.isPending ? "Ending..." : "End Session"}
              </Button>
            </div>
          </div>
        </div>
      </div>



      {/* Player Grid */}
      <div className="px-8 py-12 bg-[#1E2430]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4">
            {players?.map((player) => {
              // Validate and ensure we have valid hex colors with proper fallback
              const isValidHex = (color) => typeof color === 'string' && /^#[0-9A-F]{6}$/i.test(color.trim());
              const color1 = (player?.profile_color_1 && isValidHex(player.profile_color_1)) 
                ? player.profile_color_1.trim() 
                : "#FF5722";
              const color2 = (player?.profile_color_2 && isValidHex(player.profile_color_2)) 
                ? player.profile_color_2.trim() 
                : "#37F2D1";
              const character = player.character;
              const isPlayerReady = campaign.ready_player_ids?.includes(player.user_id);
              
              return (
              <div key={player.user_id} className="relative w-[calc(16.666%-0.75rem)] min-w-[180px] max-w-[220px]">
                {/* Character Card */}
                <div className={`h-[350px] rounded-2xl overflow-hidden bg-[#2A3441] relative transition-all duration-300 ${isPlayerReady ? 'ring-2 ring-[#37F2D1] shadow-[0_0_15px_rgba(55,242,209,0.3)]' : ''}`}>
                  {isPlayerReady && (
                    <div className="absolute top-2 right-2 z-20 bg-[#37F2D1] text-[#1E2430] text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <span className="w-2 h-2 bg-[#1E2430] rounded-full animate-pulse" />
                      READY
                    </div>
                  )}
                  {character?.profile_avatar_url ? (
                    <LazyImage 
                      src={character.profile_avatar_url} 
                      alt={character.name}
                      className="w-full h-full"
                      style={{
                        objectPosition: 'center center',
                        transform: character.profile_position && character.profile_zoom
                          ? `translate(${character.profile_position.x}px, ${character.profile_position.y}px) scale(${character.profile_zoom})`
                          : 'none',
                        transformOrigin: 'center center'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                      <span className="text-6xl text-gray-600">?</span>
                    </div>
                  )}
                  
                  {/* Gradient Overlay at Bottom with Text */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-40 flex flex-col justify-end p-4 text-center"
                    style={{
                      background: `linear-gradient(to top, ${color2}80 0%, ${color1}80 50%, transparent 100%)`
                    }}
                  >
                    {/* Class Icon */}
                    {character && CLASS_ICONS[character.class] && (
                      <div className="flex justify-center mb-2">
                        <LazyImage 
                          src={CLASS_ICONS[character.class]} 
                          alt={character.class}
                          className="w-16 h-16"
                          objectFit="contain"
                          transparentBackground={true}
                          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
                        />
                      </div>
                    )}
                    
                    <h3 className="text-white font-bold text-xl mb-1 drop-shadow-lg">
                      {character?.name || 'No Character'}
                    </h3>
                    <p className="text-white/90 text-sm mb-0.5">
                      {character ? `Level ${character.level} ${character.class}` : 'Not created'}
                    </p>
                    <p className="text-white/70 text-xs">
                      {player.isGhost ? (
                        <>GM-controlled</>
                      ) : (
                        <>Played by: <Link to={createPageUrl("UserProfile") + `?id=${player.user_id}`} className="text-[#37F2D1] hover:text-[#2dd9bd] transition-colors">@{player.username}</Link></>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              );
            })}
            {(!players || players.length === 0) && (
            <div className="w-full text-center py-12">
              <p className="text-gray-400">No players yet. Invite some players to join!</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}