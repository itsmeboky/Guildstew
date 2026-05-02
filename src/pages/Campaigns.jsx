import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import CampaignCarousel from "@/components/campaigns/CampaignCarousel";
import { CardSkeleton } from "@/components/ui/skeleton";

export default function Campaigns() {
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

  const dmCampaigns = campaigns.filter(c => c.game_master_id === user?.id && c.status !== 'archived');
  const playerCampaigns = campaigns.filter(c => c.player_ids?.includes(user?.id) && c.status !== 'archived' && c.game_master_id !== user?.id);
  const archivedCampaigns = campaigns.filter(c => c.status === 'archived');

  return (
    <div className="relative min-h-screen">
      <div
        className="h-96 bg-cover bg-top relative"
        style={{
          backgroundImage: 'url(https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/3893844b8_Plaaay1.png)',
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