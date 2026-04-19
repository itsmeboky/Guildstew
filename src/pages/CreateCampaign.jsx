import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CampaignInformationStep from "@/components/campaigns/create/CampaignInformationStep";
import CampaignSettingsStep from "@/components/campaigns/create/CampaignSettingsStep";
import CampaignHomebrewStep from "@/components/campaigns/create/CampaignHomebrewStep";
import { supabase } from "@/api/supabaseClient";
import { checkActiveCampaignLimit } from "@/utils/campaignLifecycle";
import { toast } from "sonner";
import { trackEvent } from "@/utils/analytics";

/**
 * Simplified 3-step campaign creation wizard:
 *   Step 1 — Campaign Information: everything a player needs to see
 *            before joining (name, system, description, rating,
 *            expectations, responsibilities, content checklist).
 *   Step 2 — Campaign Settings: quick session / player-cap setup.
 *   Step 3 — Homebrew (optional): pre-install a few brews; skippable.
 */
export default function CreateCampaign() {
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignData, setCampaignData] = useState({
    title: "",
    system: "Dungeons and Dragons 5e",
    cover_image_url: "",
    description: "",
    tags: [],
    // Consent + content
    consent_rating: null,
    consent_checklist: {},
    player_expectations: "",
    gm_responsibilities: "",
    // Settings
    session_day: "",
    session_time: "",
    max_players: 6,
    open_recruitment: true,
    // Homebrew (post-create wiring)
    initial_homebrew: [],
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data) => {
      // Pull the homebrew queue off before writing — the campaigns
      // table doesn't know about it; we install each brew after the
      // campaign row exists.
      const { initial_homebrew = [], ...payload } = data;

      // Tier-based active-campaign cap. Archived campaigns don't
      // count; the helper queries campaigns with status != archived.
      const gmId = payload.game_master_id || user?.id;
      if (gmId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('subscription_tier')
          .eq('user_id', gmId)
          .single();
        const tier = profile?.subscription_tier || 'free';
        const gate = await checkActiveCampaignLimit({ userId: gmId, tier });
        if (!gate.allowed) {
          throw new Error(gate.reason || 'Active campaign limit reached.');
        }
      }

      const campaign = await base44.entities.Campaign.create(payload);

      // Auto-create a group chat for the campaign so the GM and
      // future players have an out-of-game coordination channel
      // from the moment the campaign exists.
      try {
        await base44.entities.ChatConversation.create({
          campaign_id: campaign.id,
          type: 'group',
          participant_ids: [data.game_master_id || user?.id],
          name: campaign.title || campaign.name || 'Campaign Chat',
          last_message: '',
          last_message_at: new Date().toISOString(),
        });
      } catch (err) {
        // Don't block campaign creation if the chat row fails.
        console.error('Failed to create campaign group chat:', err);
      }

      // Best-effort homebrew install. Individual failures don't
      // block the rest — the GM can retry from the Homebrew tab.
      for (const homebrewId of initial_homebrew) {
        try {
          await base44.entities.CampaignHomebrew.create({
            campaign_id: campaign.id,
            homebrew_id: homebrewId,
            enabled: true,
            added_by: user?.id,
          });
        } catch (err) {
          console.error('Initial homebrew install failed for', homebrewId, err);
        }
      }

      return campaign;
    },
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ['userCampaigns'] });
      trackEvent(user?.id, 'campaign_created', {
        game_system: campaign?.system,
        name: campaign?.title,
      });
      navigate(createPageUrl("Campaigns"));
    },
    onError: (err) => {
      toast.error(err?.message || 'Could not create campaign.');
    },
  });

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    if (!campaignData.title || !campaignData.consent_rating) return;
    createCampaignMutation.mutate({
      ...campaignData,
      game_master_id: user?.id,
      status: 'recruiting',
      player_ids: []
    });
  };

  const updateCampaignData = (updates) => {
    setCampaignData({ ...campaignData, ...updates });
  };

  const canProceed = () => {
    if (currentStep === 1) {
      // Step 1 requires the fields that gate joining — title, system,
      // rating — so the campaign is reviewable the moment it exists.
      return campaignData.title.trim() !== ""
        && campaignData.system !== ""
        && campaignData.consent_rating !== null;
    }
    return true;
  };

  const steps = [
    { number: 1, title: "Campaign Information" },
    { number: 2, title: "Campaign Settings" },
    { number: 3, title: "Homebrew (Optional)" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E2430] to-[#2A3441] p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Create New Campaign</h1>

        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-4">
            {steps.map((step, idx) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${
                      currentStep >= step.number
                        ? "bg-[#37F2D1] text-[#1E2430]"
                        : "bg-[#2A3441] text-gray-500"
                    }`}
                  >
                    {step.number}
                  </div>
                  <p className={`text-xs mt-2 text-center ${currentStep >= step.number ? "text-[#37F2D1]" : "text-gray-500"}`}>
                    {step.title}
                  </p>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-24 h-1 ${currentStep > step.number ? "bg-[#37F2D1]" : "bg-[#2A3441]"}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="bg-[#2A3441] rounded-2xl p-8 mb-6">
          {currentStep === 1 && (
            <CampaignInformationStep data={campaignData} onChange={updateCampaignData} />
          )}
          {currentStep === 2 && (
            <CampaignSettingsStep data={campaignData} onChange={updateCampaignData} />
          )}
          {currentStep === 3 && (
            <CampaignHomebrewStep data={campaignData} onChange={updateCampaignData} />
          )}
        </div>

        <div className="flex justify-between items-center gap-3">
          <Button
            onClick={handleBack}
            disabled={currentStep === 1}
            variant="outline"
            className="flex items-center gap-2 text-[#2A3441]"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          {currentStep === 3 && (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || createCampaignMutation.isPending}
              variant="outline"
              className="text-slate-300"
            >
              Skip & Create Campaign
            </Button>
          )}

          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-bold flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || createCampaignMutation.isPending}
              className="bg-[#FF5722] hover:bg-[#FF6B3D] text-white font-bold"
            >
              {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
