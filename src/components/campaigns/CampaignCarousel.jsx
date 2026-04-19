import React, { useState } from "react";
import { Play, Archive, ArchiveRestore, ChevronRight, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import DeleteCampaignDialog from "@/components/campaigns/DeleteCampaignDialog";
import {
  archiveCampaign,
  unarchiveCampaign,
  archivedCampaignLimit,
} from "@/utils/campaignLifecycle";
import { supabase } from "@/api/supabaseClient";

export default function CampaignCarousel({
  title,
  campaigns,
  showPlayButton,
  showArchiveButton,
  showUnarchiveButton,
  grayscale,
  currentUserId,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(null);

  // Current user's subscription tier + profile — drives the tier-
  // archive-limit check when the GM taps Archive. Lightweight query;
  // only fires once and caches with React Query.
  const { data: subscription } = useQuery({
    queryKey: ["currentUserSubscription", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data } = await supabase
        .from("user_profiles")
        .select("subscription_tier, archived_campaign_count, max_archived_campaigns")
        .eq("user_id", currentUserId)
        .single();
      return data || null;
    },
    enabled: !!currentUserId,
  });
  const tier = subscription?.subscription_tier || "free";

  const archiveMutation = useMutation({
    mutationFn: async ({ campaignId }) => archiveCampaign({
      campaignId,
      userId: currentUserId,
      tier,
    }),
    onSuccess: (res) => {
      if (!res.ok) {
        const limit = archivedCampaignLimit(subscription, tier);
        toast.error(res.reason || `Archive limit (${limit}) reached.`);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["userCampaigns"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserSubscription"] });
      toast.success("Campaign archived");
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async ({ campaignId }) => unarchiveCampaign({
      campaignId,
      userId: currentUserId,
    }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.reason || "Could not restore.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["userCampaigns"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserSubscription"] });
      toast.success("Campaign restored");
    },
  });

  const handlePlay = (e, campaign) => {
    e.preventDefault();
    e.stopPropagation();
    if (campaign.status === "archived") {
      toast.error("Archived campaigns can't be entered — restore it first.");
      return;
    }
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

  const handleDelete = (e, campaign) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(campaign);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-2xl font-bold" style={{ color: "#FF5722" }}>{title}</h2>
          <div className="flex-1 h-px bg-[#FF5722]" />
        </div>
        <button className="text-gray-400 hover:text-white ml-4">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {campaigns.map((campaign) => {
          const isArchived = campaign.status === "archived";
          const isGM = campaign.game_master_id === currentUserId;
          return (
            <div
              key={campaign.id}
              className={`flex-shrink-0 group relative ${isArchived ? "" : "cursor-pointer"}`}
              onClick={(e) => !isArchived && handlePlay(e, campaign)}
            >
              <div className={`w-64 aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 to-purple-700 relative ${isArchived ? "opacity-60" : "group-hover:scale-105 transition-transform"}`}>
                <img
                  src={
                    campaign.cover_image_url
                    || "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&h=300&fit=crop"
                  }
                  alt={campaign.title}
                  className={`w-full h-full object-cover ${grayscale || isArchived ? "grayscale" : ""}`}
                />

                {isArchived && (
                  <span className="absolute top-2 left-2 text-[10px] font-black uppercase tracking-widest bg-slate-900/80 border border-amber-500/60 text-amber-300 rounded px-2 py-0.5">
                    Archived
                  </span>
                )}

                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70">
                  <h3 className="text-white font-bold text-lg px-4 text-center">{campaign.title}</h3>
                  <div className="flex items-center gap-3">
                    {showPlayButton && !isArchived && (
                      <button
                        onClick={(e) => handlePlay(e, campaign)}
                        className="w-12 h-12 rounded-full bg-[#37F2D1] flex items-center justify-center hover:scale-110 transition-transform"
                        title="Enter campaign"
                      >
                        <Play className="w-6 h-6 text-[#1E2430] fill-current" />
                      </button>
                    )}
                    {showArchiveButton && !isArchived && (
                      <button
                        onClick={(e) => handleArchive(e, campaign.id)}
                        disabled={archiveMutation.isPending}
                        className="w-12 h-12 rounded-full bg-[#FF5722] flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                        title="Archive campaign"
                      >
                        <Archive className="w-5 h-5 text-white" />
                      </button>
                    )}
                    {(showUnarchiveButton || isArchived) && isGM && (
                      <button
                        onClick={(e) => handleUnarchive(e, campaign.id)}
                        disabled={unarchiveMutation.isPending}
                        className="w-12 h-12 rounded-full bg-[#37F2D1] flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                        title="Restore campaign"
                      >
                        <ArchiveRestore className="w-5 h-5 text-[#1E2430]" />
                      </button>
                    )}
                    {isGM && (
                      <button
                        onClick={(e) => handleDelete(e, campaign)}
                        className="w-12 h-12 rounded-full bg-red-700/80 flex items-center justify-center hover:scale-110 transition-transform"
                        title="Delete campaign"
                      >
                        <Trash2 className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <p className={`text-sm mt-2 font-medium truncate ${isArchived ? "text-slate-400" : "text-white"}`}>
                {campaign.title}
              </p>
            </div>
          );
        })}
      </div>

      <DeleteCampaignDialog
        open={!!deleting}
        campaign={deleting}
        gmUserId={currentUserId}
        tier={tier}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
