import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CampaignBasicInfo from "./CampaignBasicInfo";
import CampaignConsent from "./CampaignConsent";

/**
 * Step 1 of the creation wizard — one screen for everything a
 * campaign needs before it can even exist as a recruiting post:
 * identity + description + content rating + consent checklist +
 * player expectations + GM responsibilities. Reuses the existing
 * BasicInfo and Consent component to avoid duplicating their
 * internals; adds the description block in between.
 */
export default function CampaignInformationStep({ data, onChange }) {
  return (
    <div className="space-y-10">
      <CampaignBasicInfo data={data} onChange={onChange} />

      <div>
        <Label className="text-white mb-2 block text-lg">Description</Label>
        <p className="text-sm text-gray-400 mb-3">
          A short summary players will see on the campaign card and invitation
          screens.
        </p>
        <Textarea
          value={data.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="A brief description of your campaign..."
          className="bg-[#1E2430] border-gray-700 text-white min-h-[120px]"
        />
      </div>

      <div className="border-t border-gray-700 pt-8">
        <CampaignConsent data={data} onChange={onChange} />
      </div>
    </div>
  );
}
