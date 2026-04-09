import React from "react";
import { Check } from "lucide-react";

const CONSENT_CATEGORIES = {
  "Physical Harm & Phobias": [
    "Animal violence", "Blood (mild)", "Blood (graphic)", "Burns / Sunstroke",
    "Cancer / Terminal illness", "Childhood violence", "Claustrophobia", "Corpses / Gore",
    "Domestic violence", "Extreme thirst / starvation", "Eye trauma", "Famine",
    "Frostbite / Hypothermia", "Heart attack", "Horror themes", "Insects",
    "Natural disasters", "Paralysis / Movement restriction", "Pregnancy / Abortion / Miscarriage",
    "Rodents", "Self-harm", "Spiders", "Stings / Bites", "Torture"
  ],
  "Addictions & Adult Themes": [
    "Alcoholism", "Drug use", "Gambling / Money issues", "Other addictions"
  ],
  "Feelings & Relationships": [
    "Romance between NPCs", "Romance between PC & NPC", "Romance between PCs",
    "Sexual content (non-explicit)", "Sexual content (explicit)", "Sexual violence (any)"
  ],
  "Society & Culture": [
    "Excessive foul language", "Genocide", "Homophobia", "Police violence",
    "Racism / Xenophobia", "Religion / Cults", "Sexism", "Terrorism"
  ]
};

export default function ConsentChecklist({ checklist, onChange }) {
  const handleItemClick = (item) => {
    const current = checklist[item];
    let next;
    
    if (!current) next = "green";
    else if (current === "green") next = "yellow";
    else if (current === "yellow") next = "red";
    else next = undefined;
    
    const updated = { ...checklist };
    if (next === undefined) {
      delete updated[item];
    } else {
      updated[item] = next;
    }
    onChange(updated);
  };

  const getCheckboxStyle = (item) => {
    const rating = checklist[item];
    if (!rating) return "border-2 border-gray-600 bg-[#1E2430]";
    
    return {
      green: "border-2 border-green-500 bg-green-600",
      yellow: "border-2 border-yellow-500 bg-yellow-600",
      red: "border-2 border-red-500 bg-red-600"
    }[rating];
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1E2430] rounded-lg p-4 flex items-center gap-6 text-sm border border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
          <span>Allowed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-yellow-600 rounded flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
          <span>Handle with Care</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
          <span>Not Allowed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-gray-600 bg-[#1E2430] rounded" />
          <span className="text-gray-400">Not Set</span>
        </div>
      </div>

      {Object.entries(CONSENT_CATEGORIES).map(([category, items]) => (
        <div key={category}>
          <h4 className="font-bold text-base mb-3 text-[#37F2D1]">{category}</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {items.map((item) => (
              <button
                key={item}
                onClick={() => handleItemClick(item)}
                className="flex items-center gap-2 text-left hover:bg-[#1E2430] p-2 rounded transition-colors"
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${getCheckboxStyle(item)}`}>
                  {checklist[item] && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm">{item}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}