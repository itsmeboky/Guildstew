import React from "react";
import { Play, Archive, ArchiveRestore, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CampaignCarousel({ title, campaigns, showPlayButton, showArchiveButton, showUnarchiveButton, grayscale, currentUserId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const archiveMutation = useMutation({
    mutationFn: ({ campaignId }) => base44.entities.Campaign.update(campaignId, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCampaigns'] });
      toast.success('Campaign archived');
    }
  });

  const unarchiveMutation = useMutation({
    mutationFn: ({ campaignId }) => base44.entities.Campaign.update(campaignId, { status: 'active' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCampaigns'] });
      toast.success('Campaign unarchived');
    }
  });

  const handlePlay = (e, campaign) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (campaign.game_master_id === currentUserId) {
      navigate(createPageUrl("CampaignGMPanel") + `?id=${campaign.id}`);
    } else {
      navigate(createPageUrl("CampaignPanel") + `?id=${campaign.id}`);
    }
  };

  const handleArchive = (e, campaignId) => {
    e.preventDefault();
    e.stopPropagation();
    archiveMutation.mutate({ campaignId });
  };

  const handleUnarchive = (e, campaignId) => {
    e.preventDefault();
    e.stopPropagation();
    unarchiveMutation.mutate({ campaignId });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-2xl font-bold" style={{ color: '#FF5722' }}>{title}</h2>
          <div className="flex-1 h-px bg-[#FF5722]" />
        </div>
        <button className="text-gray-400 hover:text-white ml-4">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="flex-shrink-0 group relative cursor-pointer"
            onClick={(e) => handlePlay(e, campaign)}
          >
            <div className="w-64 aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 to-purple-700 group-hover:scale-105 transition-transform relative">
              <img
                src={campaign.cover_image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&h=300&fit=crop'}
                alt={campaign.title}
                className={`w-full h-full object-cover ${grayscale ? 'grayscale' : ''}`}
              />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70">
                <h3 className="text-white font-bold text-lg px-4 text-center">{campaign.title}</h3>
                <div className="flex items-center gap-3">
                  {showPlayButton && (
                    <button 
                      onClick={(e) => handlePlay(e, campaign)}
                      className="w-12 h-12 rounded-full bg-[#37F2D1] flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <Play className="w-6 h-6 text-[#1E2430] fill-current" />
                    </button>
                  )}
                  {showArchiveButton && (
                    <button 
                      onClick={(e) => handleArchive(e, campaign.id)}
                      className="w-12 h-12 rounded-full bg-[#FF5722] flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <Archive className="w-5 h-5 text-white" />
                    </button>
                  )}
                  {showUnarchiveButton && (
                    <button 
                      onClick={(e) => handleUnarchive(e, campaign.id)}
                      className="w-12 h-12 rounded-full bg-[#37F2D1] flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <ArchiveRestore className="w-5 h-5 text-[#1E2430]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <p className="text-sm mt-2 font-medium truncate text-white">{campaign.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}