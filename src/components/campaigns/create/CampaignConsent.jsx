import React, { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import ConsentChecklist from "@/components/consent/ConsentChecklist";

const RATING_TRIGGERS = {
  orange: [
    "Animal violence", "Blood (graphic)", "Childhood violence", "Corpses / Gore",
    "Domestic violence", "Eye trauma", "Horror themes", "Torture"
  ],
  red: [
    "Sexual content (explicit)", "Sexual violence (any)"
  ]
};

export default function CampaignConsent({ data, onChange }) {
  const consentOptions = [
    {
      value: "green",
      label: "Green - Family Friendly",
      description: "Suitable for all ages. No mature content.",
      color: "bg-green-600 hover:bg-green-700 border-green-500"
    },
    {
      value: "yellow",
      label: "Yellow - Mature Themes",
      description: "Some mature content. Recommended for ages 13+.",
      color: "bg-yellow-600 hover:bg-yellow-700 border-yellow-500"
    },
    {
      value: "orange",
      label: "Orange - Graphic Violence",
      description: "Graphic violence and dark themes, but no explicit sexual content. 17+.",
      color: "bg-orange-600 hover:bg-orange-700 border-orange-500"
    },
    {
      value: "red",
      label: "Red - Adult Content",
      description: "Contains adult themes and explicit content. 18+ only.",
      color: "bg-red-600 hover:bg-red-700 border-red-500"
    }
  ];

  const calculateMinimumRating = (checklist) => {
    if (!checklist) return "green";
    
    for (const [item, rating] of Object.entries(checklist)) {
      if (rating === "green") {
        if (RATING_TRIGGERS.red.includes(item)) return "red";
        if (RATING_TRIGGERS.orange.includes(item)) return "orange";
      }
    }
    return "green";
  };

  useEffect(() => {
    const minRating = calculateMinimumRating(data.consent_checklist);
    const ratingLevels = ["green", "yellow", "orange", "red"];
    const currentLevel = ratingLevels.indexOf(data.consent_rating || "green");
    const minLevel = ratingLevels.indexOf(minRating);
    
    if (currentLevel < minLevel) {
      onChange({ consent_rating: minRating });
    }
  }, [data.consent_checklist]);

  const minimumRating = calculateMinimumRating(data.consent_checklist);
  const ratingLevels = ["green", "yellow", "orange", "red"];
  const minRatingIndex = ratingLevels.indexOf(minimumRating);

  const isRatingDisabled = (rating) => {
    const ratingIndex = ratingLevels.indexOf(rating);
    return ratingIndex < minRatingIndex;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">Content Guidelines & Consent</h2>
        <div className="bg-[#1E2430] rounded-lg p-6 mb-6 border-l-4 border-[#FF5722]">
          <div className="flex gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-[#FF5722] flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-lg mb-3">Important: Consent Rating Required</h3>
              <div className="text-gray-300 space-y-4 text-sm leading-relaxed">
                <p>
                  At Guildstew, player comfort and safety are our top priority. That's why every campaign must have a finalized Consent Rating—based on our Green/Yellow/Orange/Red checklist—before launch. You're free to draft or adjust it during development, but it must be locked in prior to inviting players.
                </p>
                <p>
                  This process ensures boundaries are clear, trust is built, and expectations are transparent across your group.
                </p>
                <div className="bg-[#2A3441] rounded p-4 mt-4">
                  <h4 className="font-bold mb-2 text-[#FF5722]">⚠️ Liability & Minors</h4>
                  <p>
                    Guildstew does not assume liability for exposure to potentially sensitive content by underaged players. It's the campaign creator's responsibility to verify age and ensure that all players understand the campaign's Consent Rating before participating.
                  </p>
                </div>
                <p className="text-gray-400 italic">
                  Questions or Concerns? Please refer to our Privacy Policy and Safety Policy, or contact our support team—they're always happy to help!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-white mb-4 block text-lg">Select Campaign Content Rating *</Label>
        {minimumRating !== "green" && (
          <div className="mb-4 bg-orange-500/20 border border-orange-500 rounded-lg p-4">
            <p className="text-sm text-orange-200">
              ⚠️ Based on your content selections, this campaign must be rated at least <strong className="uppercase">{minimumRating}</strong>.
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {consentOptions.map((option) => {
            const disabled = isRatingDisabled(option.value);
            return (
              <button
                key={option.value}
                onClick={() => !disabled && onChange({ consent_rating: option.value })}
                disabled={disabled}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  disabled
                    ? "bg-[#1E2430] border-gray-800 opacity-40 cursor-not-allowed"
                    : data.consent_rating === option.value
                    ? `${option.color} border-white ring-2 ring-white`
                    : "bg-[#1E2430] border-gray-700 hover:border-gray-500"
                }`}
              >
                <h3 className="font-bold text-lg mb-2">{option.label}</h3>
                <p className="text-sm text-gray-300">{option.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label className="text-white mb-2 block">Player Expectations *</Label>
        <p className="text-sm text-gray-400 mb-3">Describe your expectations for player behavior at the table.</p>
        <Textarea
          value={data.player_expectations || ''}
          onChange={(e) => onChange({ player_expectations: e.target.value })}
          placeholder="e.g., Respect the table, no interruptions, keep IC/OOC separate..."
          className="bg-[#1E2430] border-gray-700 text-white min-h-[120px]"
        />
      </div>

      <div>
        <Label className="text-white mb-2 block">GM Responsibilities *</Label>
        <p className="text-sm text-gray-400 mb-3">State what you commit to as a Game Master.</p>
        <Textarea
          value={data.gm_responsibilities || ''}
          onChange={(e) => onChange({ gm_responsibilities: e.target.value })}
          placeholder="e.g., Honor safety tools, provide content warnings, ensure all players get spotlight time..."
          className="bg-[#1E2430] border-gray-700 text-white min-h-[120px]"
        />
      </div>

      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-xl font-bold mb-4">Content Consent Checklist</h3>
        <p className="text-sm text-gray-400 mb-6">
          Click each item to set its rating. Green = Allowed, Yellow = Handle with care, Red = Not allowed.
          <br />
          <span className="text-orange-400 font-semibold">Note: Allowing certain content will automatically set minimum rating requirements.</span>
        </p>
        <ConsentChecklist
          checklist={data.consent_checklist || {}}
          onChange={(checklist) => onChange({ consent_checklist: checklist })}
        />
      </div>
    </div>
  );
}