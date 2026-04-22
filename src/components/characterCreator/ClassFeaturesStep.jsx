
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getClassFeaturesForLevel } from "@/components/dnd5e/classFeatures";

export default function ClassFeaturesStep({ characterData, updateCharacterData }) {
  const [multiclasses, setMulticlasses] = useState(characterData.multiclasses || []);
  const [featureChoices, setFeatureChoices] = useState(characterData.feature_choices || {});

  const availableClasses = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard"];
  const usedClasses = [characterData.class, ...multiclasses.map(mc => mc.class).filter(Boolean)];
  
  const primaryClassLevel = characterData.level - multiclasses.reduce((sum, mc) => sum + (mc.level || 0), 0);
  const canMulticlass = characterData.level >= 2 && primaryClassLevel >= 1;

  const primaryFeatures = getClassFeaturesForLevel(characterData.class, primaryClassLevel) || [];

  const multiclassFeatures = multiclasses.flatMap(mc => {
    if (!mc.class || !mc.level) return [];
    const features = getClassFeaturesForLevel(mc.class, mc.level) || [];
    return features.map(f => ({ ...f, multiclass: mc.class }));
  });

  const allFeatures = [...primaryFeatures, ...multiclassFeatures];

  const handleAddMulticlass = () => {
    if (primaryClassLevel <= 1) return;
    setMulticlasses([...multiclasses, { class: "", level: 1 }]);
  };

  const handleRemoveMulticlass = (index) => {
    const newMulticlasses = multiclasses.filter((_, i) => i !== index);
    setMulticlasses(newMulticlasses);
    updateCharacterData({ multiclasses: newMulticlasses });
  };

  const handleMulticlassChange = (index, field, value) => {
    const newMulticlasses = [...multiclasses];
    newMulticlasses[index][field] = value;
    
    const totalMulticlassLevels = newMulticlasses.reduce((sum, mc) => sum + (mc.level || 0), 0);
    if (characterData.level - totalMulticlassLevels < 1) {
      newMulticlasses[index].level = Math.max(1, characterData.level - totalMulticlassLevels + (multiclasses[index].level || 1) - 1);
    }
    
    setMulticlasses(newMulticlasses);
    updateCharacterData({ multiclasses: newMulticlasses });
  };

  const handleFeatureChoice = (featureKey, choice) => {
    const newChoices = { ...featureChoices, [featureKey]: choice };
    setFeatureChoices(newChoices);
    updateCharacterData({ feature_choices: newChoices });
  };

  const requiredChoices = allFeatures.filter(f => f.choiceRequired);
  const allChoicesMade = requiredChoices.every(f => {
    const key = `${f.multiclass || characterData.class}-${f.level}-${f.name}`;
    return featureChoices[key];
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-[#2A3441] rounded-xl p-6 mb-6 border-2 border-[#1E2430]">
        <h2 className="text-2xl font-bold text-[#FFC6AA] mb-3">Class Features</h2>
        <p className="text-white mb-3">
          Class features are special abilities you gain as you level up. Some features are granted automatically, 
          while others require you to make choices (like picking a subclass or fighting style).
        </p>
        {characterData.level >= 2 && (
          <p className="text-white">
            💡 <span className="font-bold">Multiclassing:</span> At level 2+, you can multiclass into another class to gain abilities from multiple sources. 
            Each level you gain can be put into any of your classes.
          </p>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="bg-[#2A3441] border-2 border-[#5B4B9E] rounded-lg px-4 py-2">
            <span className="text-[#5B4B9E] font-bold text-lg">{characterData.class}</span>
            <span className="text-white ml-2">Level {primaryClassLevel}</span>
          </div>
          {multiclasses.filter(mc => mc.class).map((mc, idx) => (
            <div key={idx} className="bg-[#2A3441] border-2 border-[#5B4B9E] rounded-lg px-4 py-2">
              <span className="text-[#5B4B9E] font-bold text-lg">{mc.class}</span>
              <span className="text-white ml-2">Level {mc.level}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {primaryFeatures.map((feature, idx) => {
            const featureKey = `${characterData.class}-${feature.level}-${feature.name}`;
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

      {canMulticlass && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#5B4B9E]">Multiclassing</h3>
            <Button
              onClick={handleAddMulticlass}
              disabled={primaryClassLevel <= 1}
              className="bg-[#5B4B9E] hover:bg-[#4A3D8A] text-white disabled:opacity-50"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Class
            </Button>
          </div>

          {multiclasses.map((mc, index) => (
            <div key={index} className="bg-[#2A3441] rounded-xl p-5 mb-4 border-2 border-[#5B4B9E]">
              <div className="flex items-center gap-4 mb-4">
                <Select
                  value={mc.class || ""}
                  onValueChange={(value) => handleMulticlassChange(index, 'class', value)}
                >
                  <SelectTrigger className="bg-[#1E2430] border-white text-white flex-1">
                    <SelectValue placeholder="Select class..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A3441] border-[#1E2430]">
                    {availableClasses
                      .filter(c => !usedClasses.includes(c) || c === mc.class)
                      .map((cls) => (
                        <SelectItem key={cls} value={cls} className="text-white hover:bg-[#1E2430]">
                          {cls}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Select
                  value={mc.level?.toString() || ""}
                  onValueChange={(value) => handleMulticlassChange(index, 'level', parseInt(value))}
                >
                  <SelectTrigger className="bg-[#1E2430] border-white text-white w-32">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A3441] border-[#1E2430]">
                    {Array.from({ length: Math.min(19, characterData.level - 1) }, (_, i) => i + 1).map((lvl) => (
                      <SelectItem key={lvl} value={lvl.toString()} className="text-white hover:bg-[#1E2430]">
                        Level {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => handleRemoveMulticlass(index)}
                  variant="outline"
                  size="icon"
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {mc.class && mc.level && (
                <div className="grid grid-cols-1 gap-3">
                  {(getClassFeaturesForLevel(mc.class, mc.level) || []).map((feature, fIdx) => {
                    const featureKey = `${mc.class}-${feature.level}-${feature.name}`;
                    const hasChoice = feature.choiceRequired;
                    const currentChoice = featureChoices[featureKey];

                    return (
                      <div
                        key={fIdx}
                        className={`p-5 rounded-lg border-2 ${
                          hasChoice && !currentChoice
                            ? 'bg-[#2A3441] border-[#FF5722] border-4'
                            : 'bg-[#2A3441] border-[#5B4B9E]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <h5 className="font-semibold text-white text-sm">{feature.name}</h5>
                          {feature.level && (
                            <Badge className="bg-[#1E2430] text-gray-300 border border-white/20 text-xs">
                              Lvl {feature.level}
                            </Badge>
                          )}
                        </div>
                        <p className="text-white text-sm leading-7 whitespace-pre-line mb-3">
                          {feature.description}
                        </p>
                        
                        {hasChoice && feature.choices && (
                          <Select
                            value={currentChoice || ""}
                            onValueChange={(value) => handleFeatureChoice(featureKey, value)}
                          >
                            <SelectTrigger className="h-auto min-h-11 w-full mt-4">
                              <SelectValue placeholder="Make a choice..." />
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {requiredChoices.length > 0 && !allChoicesMade && (
        <div className="bg-[#2A3441] border-2 border-[#FF5722] rounded-xl p-4 text-center">
          <p className="text-white font-semibold">
            ⚠️ Please make all required feature choices before proceeding
          </p>
        </div>
      )}
    </div>
  );
}
