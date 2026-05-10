import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getClassFeaturesForLevel,
  getClassAsiLevels,
} from "@/data/games/dnd5e_2024/classFeatures";
import {
  getSubclassFeaturesForLevel,
  getSubclassNamesForClass,
} from "@/data/games/dnd5e_2024/subclassFeatures";
import SubclassPicker from "@/components/characterCreator/SubclassPicker";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";

/**
 * 2024 D&D 5e — class features step.
 *
 * Edition-specific. Reads exclusively from the dnd5e_2024 data
 * adapters (classFeatures + subclassFeatures, both hand-authored
 * against PHB 2024 RAW). Routed by the dispatcher in
 * CharacterCreator.jsx when characterData.gamePack === 'dnd5e_2024'.
 *
 * Architectural notes:
 *   - 2014's ClassFeaturesStep handles multiclass UI; for 2024 the
 *     multiclass flow lands in commit 4 of the bundle. This step
 *     shows primary-class features only for now.
 *   - The shared SubclassPicker is gamePack-agnostic so it can
 *     render either edition's subclass cards from a {name,description}
 *     choices array.
 *   - 2024 unified subclass selection at level 3 across all 12
 *     classes; the SUBCLASS_FEATURE_NAMES set below is the 2024
 *     copy (most names unchanged from 2014).
 */

const SUBCLASS_FEATURE_NAMES = new Set([
  "Primal Path",
  "Bard College",
  "Divine Domain",
  "Druid Circle",
  "Martial Archetype",
  "Monastic Tradition",
  "Sacred Oath",
  "Ranger's Conclave",
  "Roguish Archetype",
  "Sorcerous Origin",
  "Otherworldly Patron",
  "Arcane Tradition",
]);

function isSubclassFeature(feature) {
  return !!feature?.choiceRequired && SUBCLASS_FEATURE_NAMES.has(feature?.name);
}

export default function ClassFeaturesStep2024({ characterData, updateCharacterData }) {
  const [featureChoices, setFeatureChoices] = useState(characterData.feature_choices || {});

  const className = characterData.class;
  const level = characterData.level || 1;

  const classFeatures = className ? getClassFeaturesForLevel(className, level) : [];

  // Surface subclass features once the player has selected a subclass
  // (key: <Class>-3-<SubclassFeatureName> in feature_choices). 2024
  // unified subclass selection at level 3 — pull the chosen subclass
  // and inline its features below the class features list.
  const subclassChoiceKey = Object.keys(featureChoices).find((k) =>
    k.startsWith(`${className}-3-`),
  );
  const chosenSubclass = subclassChoiceKey
    ? featureChoices[subclassChoiceKey]
    : null;

  const subclassFeatures = chosenSubclass
    ? getSubclassFeaturesForLevel(chosenSubclass, level)
    : [];

  const handleFeatureChoice = (featureKey, choice) => {
    const newChoices = { ...featureChoices, [featureKey]: choice };
    setFeatureChoices(newChoices);
    updateCharacterData({
      feature_choices: newChoices,
      // Mirror the chosen subclass onto characterData.subclass for
      // downstream consumers (sheet display, validation).
      ...(SUBCLASS_FEATURE_NAMES.has(featureKey.split('-').slice(2).join('-'))
        ? { subclass: choice }
        : {}),
    });
  };

  const requiredChoices = classFeatures.filter((f) => f.choiceRequired);
  const allChoicesMade = requiredChoices.every(
    (f) => featureChoices[`${className}-${f.level}-${f.name}`],
  );

  if (!className) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-[#2A3441] rounded-xl border-2 border-[#1E2430]">
        <p className="text-white">Pick a class on the previous step before viewing features.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-[#2A3441] rounded-xl p-6 mb-6 border-2 border-[#1E2430]">
        <h2 className="text-2xl font-bold text-[#FFC6AA] mb-3">
          Class Features (PHB 2024)
        </h2>
        <p className="text-white mb-3">
          Class features are special abilities you gain as you level up. The 2024
          revision unified subclass selection at level 3 for every class, added
          Weapon Mastery for the six martial classes, and reshaped several
          casting and resource mechanics — see each feature below for details.
        </p>
        <p className="text-white/60 text-sm">
          <span className="font-bold text-[#FFC6AA]">Note:</span>{" "}
          2024 multiclass UI lands in the next bundle commit. For now this
          step shows primary-class features only. <InfoTip>{tipFor("multiclass_prereqs")}</InfoTip>
        </p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="bg-[#2A3441] border-2 border-[#37F2D1] rounded-lg px-4 py-2">
            <span className="text-[#37F2D1] font-bold text-lg">{className}</span>
            <span className="text-white ml-2">Level {level}</span>
            <Badge className="bg-[#37F2D1] text-[#1E2430] text-[10px] ml-2 font-black">
              2024
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {classFeatures.map((feature, idx) => {
            const featureKey = `${className}-${feature.level}-${feature.name}`;
            const hasChoice = feature.choiceRequired;
            const currentChoice = featureChoices[featureKey];

            return (
              <div
                key={idx}
                className={`p-6 rounded-xl border-2 transition-all ${
                  hasChoice && !currentChoice
                    ? 'bg-[#2A3441] border-[#FF5722] border-4'
                    : 'bg-[#2A3441] border-[#1E2430]'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-lg font-bold text-[#FFC6AA]">{feature.name}</h4>
                    {feature.uses && (
                      <Badge className="bg-[#37F2D1] text-[#1E2430] text-xs">
                        {feature.uses}
                      </Badge>
                    )}
                    {feature.level && (
                      <Badge className="bg-[#1E2430] text-white border border-white/20 text-xs">
                        Gained at Level {feature.level}
                      </Badge>
                    )}
                    {feature.is_asi && (
                      <Badge className="bg-[#FF5722]/20 text-[#FF5722] border border-[#FF5722]/30 text-xs">
                        ASI / Feat
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-white text-sm leading-7 whitespace-pre-line mb-4">
                  {feature.description}
                </p>

                {hasChoice && feature.choices && (
                  isSubclassFeature(feature) ? (
                    <div className="mt-5">
                      <SubclassPicker
                        choices={feature.choices}
                        value={currentChoice || null}
                        onSelect={(value) => handleFeatureChoice(featureKey, value)}
                        featureName={feature.name}
                        levelGained={feature.level}
                      />
                    </div>
                  ) : (
                    <div className="mt-5 p-5 bg-[#1E2430]/50 rounded-lg border-2 border-[#FF5722]">
                      <p className="text-[#FF5722] font-semibold mb-4 text-sm">
                        ⚠️ You must make a choice for this feature:
                      </p>

                      <Select
                        value={currentChoice || ""}
                        onValueChange={(value) => handleFeatureChoice(featureKey, value)}
                      >
                        <SelectTrigger className="h-auto min-h-11 w-full">
                          <SelectValue placeholder="Select option..." />
                        </SelectTrigger>
                        <SelectContent>
                          {feature.choices.map((choice, cIdx) => {
                            const choiceName = typeof choice === 'string' ? choice : choice.name;
                            const choiceDesc = typeof choice === 'object' ? choice.description : null;
                            return (
                              <SelectItem
                                key={cIdx}
                                value={choiceName}
                                description={choiceDesc || undefined}
                              >
                                {choiceName}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {chosenSubclass && subclassFeatures.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="bg-[#2A3441] border-2 border-[#5B4B9E] rounded-lg px-4 py-2">
              <span className="text-[#5B4B9E] font-bold text-lg">{chosenSubclass}</span>
              <span className="text-white ml-2">Subclass</span>
              <Badge className="bg-[#5B4B9E] text-white text-[10px] ml-2 font-black">
                2024
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {subclassFeatures.map((feature, idx) => {
              const featureKey = `subclass-${chosenSubclass}-${feature.level}-${feature.name}`;
              const hasChoice = feature.choiceRequired;
              const currentChoice = featureChoices[featureKey];

              return (
                <div
                  key={idx}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    hasChoice && !currentChoice
                      ? 'bg-[#2A3441] border-[#FF5722] border-4'
                      : 'bg-[#2A3441] border-[#1E2430]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="text-lg font-bold text-[#FFC6AA]">{feature.name}</h4>
                      {feature.level && (
                        <Badge className="bg-[#1E2430] text-white border border-white/20 text-xs">
                          Gained at Level {feature.level}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-white text-sm leading-7 whitespace-pre-line mb-4">
                    {feature.description}
                  </p>

                  {hasChoice && feature.choices && (
                    <div className="mt-5 p-5 bg-[#1E2430]/50 rounded-lg border-2 border-[#FF5722]">
                      <p className="text-[#FF5722] font-semibold mb-4 text-sm">
                        ⚠️ You must make a choice for this feature:
                      </p>
                      <Select
                        value={currentChoice || ""}
                        onValueChange={(value) => handleFeatureChoice(featureKey, value)}
                      >
                        <SelectTrigger className="h-auto min-h-11 w-full">
                          <SelectValue placeholder="Select option..." />
                        </SelectTrigger>
                        <SelectContent>
                          {feature.choices.map((choice, cIdx) => {
                            const choiceName = typeof choice === 'string' ? choice : choice.name;
                            const choiceDesc = typeof choice === 'object' ? choice.description : null;
                            return (
                              <SelectItem
                                key={cIdx}
                                value={choiceName}
                                description={choiceDesc || undefined}
                              >
                                {choiceName}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!allChoicesMade && (
        <div className="bg-[#FF5722]/10 border-2 border-[#FF5722]/40 rounded-lg p-4 text-sm text-[#FF5722]">
          ⚠️ Complete the highlighted feature choices before continuing.
        </div>
      )}
    </div>
  );
}

// Re-export the ASI levels helper so the validator can plumb feat
// gates without having to re-resolve the data path.
export { getClassAsiLevels, getSubclassNamesForClass };
