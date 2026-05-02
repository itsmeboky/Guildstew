import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Play, LogOut, Loader2 } from "lucide-react";
import LazyImage from "@/components/ui/LazyImage";

const CLASS_ICONS = {
  "Barbarian": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a6652f2d8_Barbarian1.png",
  "Bard": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/cbe7f7dba_Bard1.png",
  "Cleric": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/15fe6ef24_Cleric1.png",
  "Druid": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/ef43c9ff2_Druid1.png",
  "Fighter": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/5e1b2cd68_Fighter1.png",
  "Monk": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/f2e85e13a_Monk1.png",
  "Paladin": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/1eb7cd2f2_Paladin1.png",
  "Ranger": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/748e5be38_Ranger1.png",
  "Rogue": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a66f2aac1_Rogue1.png",
  "Sorcerer": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/6f5b501db_Sorceror1.png",
  "Warlock": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/184c98268_Warlock1.png",
  "Wizard": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/94cfaa28a_Wizard1.png"
};

export default function CampaignPanel() {
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
    refetchInterval: 2000 // Poll frequently for session status
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

  const isReady = React.useMemo(() => {
    return campaign?.ready_player_ids?.includes(user?.id);
  }, [campaign, user]);

  // Automatically redirect if session is active AND player is ready
  useEffect(() => {
    if (campaign?.is_session_active && isReady) {
      navigate(createPageUrl("CampaignPlayerPanel") + `?id=${campaignId}`);
    }
  }, [campaign?.is_session_active, isReady, campaignId, navigate]);

  const toggleReadyMutation = useMutation({
    mutationFn: async () => {
      if (!campaign || !user) return;
      const currentReady = campaign.ready_player_ids || [];
      let newReady;
      
      if (isReady) {
        newReady = currentReady.filter(id => id !== user.id);
      } else {
        newReady = [...currentReady, user.id];
      }
      
      return base44.entities.Campaign.update(campaignId, { ready_player_ids: newReady });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    }
  });

  const players = React.useMemo(() => {
    const playerMap = new Map();

    // One card per row in campaign.player_ids. Orphan characters
    // (old seeds, GM-controlled NPCs, etc.) no longer surface on
    // the lobby — this is the campaign home, not the combat view.
    if (campaign?.player_ids && allUserProfiles) {
      const uniquePlayerIds = [...new Set(campaign.player_ids)];
      uniquePlayerIds.forEach(playerId => {
        const profile = allUserProfiles.find(u => u.user_id === playerId);
        if (!profile || playerMap.has(playerId)) return;
        const character = characters?.find(c =>
          (c.user_id === playerId || c.created_by === profile.email)
          && c.campaign_id === campaignId,
        );
        playerMap.set(playerId, { ...profile, character });
      });
    }

    return Array.from(playerMap.values());
  }, [campaign?.player_ids, allUserProfiles, characters, campaignId]);

  if (!campaign || isLoadingProfiles || isLoadingCharacters) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1E2430] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#37F2D1]" />
      </div>
    );
  }

  // If player is ready, show lock screen (unless session started, which is handled by useEffect)
  if (isReady) {
    return (
      <div className="min-h-screen bg-[#050816] flex flex-col items-center justify-center text-white p-4 relative overflow-hidden">
         {/* Background Image with Heavy Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ 
            backgroundImage: `url(${campaign.cover_image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200&h=400&fit=crop'})` 
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050816] via-[#050816]/90 to-[#050816]" />
        
        <div className="relative z-10 flex flex-col items-center max-w-md text-center">
          <div className="w-24 h-24 rounded-full bg-[#37F2D1]/10 flex items-center justify-center mb-6 animate-pulse border border-[#37F2D1]">
            <Play className="w-10 h-10 text-[#37F2D1]" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2 text-[#37F2D1]">You Are Ready</h1>
          <p className="text-gray-400 mb-8">
            Waiting for the Game Master to start the session. 
            Your interface is locked until the session begins.
          </p>

          <Button 
            onClick={() => toggleReadyMutation.mutate()}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            Cancel Ready Status
          </Button>
        </div>
      </div>
    );
  }

  const currentTime = campaign?.calendar_system?.current_date ? {
    monthName: campaign.calendar_system.month_names?.[campaign.calendar_system.current_date.month - 1] || `M${campaign.calendar_system.current_date.month}`,
    dayName: campaign.calendar_system.day_names?.[(campaign.calendar_system.current_date.day - 1) % campaign.calendar_system.days_per_week] || '',
    day: campaign.calendar_system.current_date.day,
    year: campaign.calendar_system.current_date.year,
    hour: campaign.calendar_system.current_date.hour,
    isDaytime: campaign.calendar_system.current_date.hour >= (campaign.calendar_system.dawn_hour || 6) && campaign.calendar_system.current_date.hour < (campaign.calendar_system.dusk_hour || 18)
  } : null;

  return (
    <div className="relative min-h-screen bg-[#1E2430] text-white">
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
        className="h-96 bg-cover bg-top relative"
        style={{
          backgroundImage: `url(${campaign.cover_image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200&h=400&fit=crop'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-[#1E2430]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-white/80 mb-2">Campaign Lobby</p>
            <h1 className="text-6xl font-bold text-white mb-8" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>
              {campaign?.name || campaign?.title}
            </h1>
            <div className="flex items-center justify-center gap-4">
              <Button 
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] px-12 py-6 text-xl font-bold shadow-[0_0_20px_rgba(55,242,209,0.3)] transition-all hover:scale-105"
                onClick={() => toggleReadyMutation.mutate()}
                disabled={toggleReadyMutation.isPending}
              >
                {toggleReadyMutation.isPending ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  "READY UP"
                )}
              </Button>
            </div>
            <p className="mt-4 text-sm text-gray-400">Click Ready Up to signal you are ready to play.</p>
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
                        objectPosition: 'top',
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
                      Played by:{" "}
                      <Link
                        to={createPageUrl("UserProfile") + `?id=${player.user_id}`}
                        className="text-[#37F2D1] hover:text-[#2dd9bd] transition-colors"
                      >
                        @{player.username}
                      </Link>
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