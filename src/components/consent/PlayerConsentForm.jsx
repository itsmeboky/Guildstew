import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import ConsentChecklist from "./ConsentChecklist";

export default function PlayerConsentForm({ data, onChange }) {
  const characterConsentOptions = [
    { id: "mild_injury", label: "Injury (mild)" },
    { id: "severe_injury", label: "Injury (severe)" },
    { id: "mind_effects", label: "Magical mind effects" },
    { id: "kidnapping", label: "Kidnapping" },
    { id: "torture_offscreen", label: "Torture (off-screen only)" },
    { id: "romance", label: "Romance (with PCs/NPCs)" },
    { id: "rivalries", label: "Rivalries / PvP tension" },
    { id: "pvp_combat", label: "PvP combat" }
  ];

  const handleCharacterConsentChange = (id, checked) => {
    onChange({
      ...data,
      character_consent: {
        ...data.character_consent,
        [id]: checked
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold mb-4">Your Content Consent Preferences</h3>
        <p className="text-gray-400 mb-6">
          This checklist helps GMs understand your boundaries. You must complete this before joining any campaign.
        </p>
        <ConsentChecklist
          checklist={data.consent_checklist || {}}
          onChange={(checklist) => onChange({ ...data, consent_checklist: checklist })}
        />
      </div>

      <div className="border-t border-gray-700 pt-8">
        <h4 className="text-xl font-bold mb-4">Lines & Veils</h4>
        
        <div className="space-y-4">
          <div>
            <Label className="text-white mb-2 block">Lines (Hard No)</Label>
            <p className="text-sm text-gray-400 mb-2">Content that will absolutely not appear in your games.</p>
            <Textarea
              value={data.consent_lines || ''}
              onChange={(e) => onChange({ ...data, consent_lines: e.target.value })}
              placeholder="e.g., Spiders in any form, detailed torture scenes..."
              className="bg-[#1E2430] border-gray-700 text-white"
            />
          </div>

          <div>
            <Label className="text-white mb-2 block">Veils (Fade to Black)</Label>
            <p className="text-sm text-gray-400 mb-2">Content that can exist but should happen off-screen.</p>
            <Textarea
              value={data.consent_veils || ''}
              onChange={(e) => onChange({ ...data, consent_veils: e.target.value })}
              placeholder="e.g., Romance scenes, detailed violence..."
              className="bg-[#1E2430] border-gray-700 text-white"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8">
        <h4 className="text-xl font-bold mb-4">Character Consent</h4>
        <p className="text-gray-400 mb-4">What are you comfortable having happen to your character?</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characterConsentOptions.map((option) => (
            <div key={option.id} className="flex items-center space-x-3 bg-[#1E2430] p-4 rounded-lg">
              <Checkbox
                id={option.id}
                checked={data.character_consent?.[option.id] || false}
                onCheckedChange={(checked) => handleCharacterConsentChange(option.id, checked)}
              />
              <Label htmlFor={option.id} className="text-white cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8">
        <h4 className="text-xl font-bold mb-4">Additional Information</h4>
        <Label className="text-white mb-2 block">Phobias, Triggers, or Other Notes</Label>
        <p className="text-sm text-gray-400 mb-2">
          Anything else the GM should know about your comfort levels.
        </p>
        <Textarea
          value={data.additional_consent_notes || ''}
          onChange={(e) => onChange({ ...data, additional_consent_notes: e.target.value })}
          placeholder="Let your GM know about any specific concerns or preferences..."
          className="bg-[#1E2430] border-gray-700 text-white min-h-[150px]"
        />
      </div>
    </div>
  );
}