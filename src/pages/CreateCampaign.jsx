import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CampaignBasicInfo from "@/components/campaigns/create/CampaignBasicInfo";
import CampaignConsent from "@/components/campaigns/create/CampaignConsent";
import CampaignDetails from "@/components/campaigns/create/CampaignDetails";

export default function CreateCampaign() {
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignData, setCampaignData] = useState({
    title: "",
    system: "Dungeons and Dragons 5e",
    cover_image_url: "",
    consent_rating: null,
    world_lore: "",
    homebrew_rules: "",
    notes: "",
    description: ""
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data) => {
      const campaign = await base44.entities.Campaign.create(data);

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

      return campaign;
    },
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ['userCampaigns'] });
      navigate(createPageUrl("Campaigns"));
    }
  });

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (!campaignData.title || !campaignData.consent_rating) {
      return;
    }

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
      return campaignData.title.trim() !== "" && campaignData.system !== "";
    }
    if (currentStep === 2) {
      return campaignData.consent_rating !== null;
    }
    return true;
  };

  const steps = [
    { number: 1, title: "Basic Information" },
    { number: 2, title: "Consent & Guidelines" },
    { number: 3, title: "Campaign Details" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E2430] to-[#2A3441] p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Create New Campaign</h1>

        {/* Step Indicator */}
        <div className="flex justify-center mb-12">
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
                  <p className={`text-sm mt-2 ${currentStep >= step.number ? "text-[#37F2D1]" : "text-gray-500"}`}>
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

        {/* Step Content */}
        <div className="bg-[#2A3441] rounded-2xl p-8 mb-6">
          {currentStep === 1 && (
            <CampaignBasicInfo data={campaignData} onChange={updateCampaignData} />
          )}
          {currentStep === 2 && (
            <CampaignConsent data={campaignData} onChange={updateCampaignData} />
          )}
          {currentStep === 3 && (
            <CampaignDetails data={campaignData} onChange={updateCampaignData} />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            onClick={handleBack}
            disabled={currentStep === 1}
            variant="outline"
            className="flex items-center gap-2 text-[#2A3441]"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

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