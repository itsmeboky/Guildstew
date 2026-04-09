import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  spellsByClass, 
  recommendedSpells, 
  spellDetails as hardcodedSpellDetails, 
  effectDescriptions, 
  getSpellSlots, 
  getAllAvailableSpells, 
  spellIcons, 
  fetchAllSpells,
  getPactSlots,
  getMaxSpellLevelForCharacter
} from "@/components/dnd5e/spellData";

export default function SpellsStep({ characterData, updateCharacterData }) {
  const [hoveredEffect, setHoveredEffect] = useState(null);
  const [showRecommendation, setShowRecommendation] = useState(false);

  // Fetch all spells from API to support higher levels
  const { data: fullSpellsList, isLoading } = useQuery({
    queryKey: ['dnd5e-spells'],
    queryFn: () => fetchAllSpells().then(data => data.spells),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  const spellSlots = getSpellSlots(characterData.class, characterData.level, characterData.multiclasses || []);
  const availableSpells = getAllAvailableSpells(characterData.class, characterData.multiclasses || [], fullSpellsList);
  
  const selectedSpells = characterData.spells || {};

  const pactSlots = getPactSlots(
    characterData.class,
    characterData.level,
    characterData.multiclasses || []
  );

  // Max spell level you’re allowed to learn/prepare based on each class’s own table
  const maxSpellLevel = getMaxSpellLevelForCharacter(
    characterData.class,
    characterData.level,
    characterData.multiclasses || []
  );

  const getSlotsForLevelKey = (levelKey) => {
    let slots = spellSlots[levelKey] || 0;
  
    // Merge Pact Magic slots for display only:
    if (
      pactSlots &&
      levelKey.startsWith("level")
    ) {
      const numericLevel = parseInt(levelKey.replace("level", ""), 10);
      if (numericLevel === pactSlots.slotLevel) {
        slots += pactSlots.slots;
      }
    }
  
    return slots;
  };

  // Helper to merge API spell details with hardcoded ones (for icons/effects)
  const getSpellDetail = (spellName) => {
    const hardcoded = hardcodedSpellDetails[spellName];
    const apiSpell = fullSpellsList?.find(s => s.name === spellName);
    
    if (apiSpell) {
      return {
        ...apiSpell,
        description: apiSpell.description || hardcoded?.description,
        effects: hardcoded?.effects || [],
        castingTime: apiSpell.castingTime || apiSpell.casting_time,
      };
    }
    return hardcoded || {
      level: "?",
      school: "Unknown",
      castingTime: "-",
      range: "-",
      components: "-",
      duration: "-",
      description: "No description available.",
      effects: []
    };
  };

  // Determine which class provides spellcasting
  const getSpellcastingClass = () => {
    const spellcastingClasses = ["Bard", "Cleric", "Druid", "Sorcerer", "Wizard", "Warlock"];
    const halfCasters = ["Paladin", "Ranger"];
    
    // Check primary class first
    if (spellcastingClasses.includes(characterData.class)) {
      return { class: characterData.class, level: characterData.level };
    }
    
    if (halfCasters.includes(characterData.class) && characterData.level >= 2) {
      return { class: characterData.class, level: characterData.level };
    }
    
    // Check multiclasses
    for (const mc of (characterData.multiclasses || [])) {
      if (spellcastingClasses.includes(mc.class)) {
        return { class: mc.class, level: mc.level };
      }
      if (halfCasters.includes(mc.class) && mc.level >= 2) {
        return { class: mc.class, level: mc.level };
      }
    }
    
    return null;
  };

  const spellcastingClass = getSpellcastingClass();

  if (spellSlots.cantrips === 0 && spellSlots.level1 === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12 bg-[#2A3441] rounded-xl p-8 border-2 border-[#1E2430]">
        <h2 className="text-2xl font-bold text-[#FFC6AA] mb-4">No Spells Available</h2>
        <p className="text-white">
          {characterData.class} at level {characterData.level} doesn't have spellcasting yet.
        </p>
      </div>
    );
  }

  const useRecommended = () => {
    // Find the first class that has recommendations
    let recommended = null;
    let recommendedClass = null;
    
    // Check primary class
    if (recommendedSpells[characterData.class]) {
      recommended = recommendedSpells[characterData.class];
      recommendedClass = characterData.class;
    } else {
      // Check multiclasses
      for (const mc of (characterData.multiclasses || [])) {
        if (recommendedSpells[mc.class]) {
          recommended = recommendedSpells[mc.class];
          recommendedClass = mc.class;
          break;
        }
      }
    }
    
    if (recommended) {
      const newSpells = { ...selectedSpells };

      // Auto-select spells for each level based on recommendations and available slots
      Object.keys(spellSlots).forEach(levelKey => {
        if (spellSlots[levelKey] > 0 && recommended[levelKey]) {
          // Take recommended spells up to the slot limit
          newSpells[levelKey] = recommended[levelKey].slice(0, spellSlots[levelKey]);
        }
      });

      updateCharacterData({ spells: newSpells });
      setShowRecommendation(recommendedClass);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-[#2A3441] rounded-xl p-6 mb-6 border-2 border-[#1E2430]">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-[#FFC6AA] mb-3">Spellcasting</h2>
            <p className="text-white mb-2">
              {spellcastingClass ? (
                <>
                  As a level {spellcastingClass.level} <span className="text-[#5B4B9E] font-bold">{spellcastingClass.class}</span>, you can prepare the following spells:
                </>
              ) : (
                <>As a level {characterData.level} {characterData.class}, you can prepare the following spells:</>
              )}
            </p>
            <div className="flex gap-4 text-sm flex-wrap">
              {Object.keys(spellSlots).map((levelKey) => {
                const slots = getSlotsForLevelKey(levelKey);
                if (slots <= 0) return null;

                const levelLabel = levelKey === "cantrips" ? "Cantrips" : `Level ${levelKey.replace("level", "")}`;
                const currentCount = (selectedSpells[levelKey] || []).length;
                return (
                  <div key={levelKey} className="text-[#37F2D1]">
                    <span className="font-bold">{levelLabel}:</span> {currentCount}/{slots}
                  </div>
                );
              })}
            </div>
          </div>
          <Button
            onClick={useRecommended}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Use Recommended
          </Button>
        </div>
      </div>

      {pactSlots && (
        <div className="mb-6 bg-[#1E2430] border-2 border-[#5B4B9E] rounded-xl p-4">
          <h3 className="text-lg font-bold text-[#5B4B9E] mb-1">Pact Magic (Warlock)</h3>
          <p className="text-white text-sm">
            Warlock {pactSlots.totalWarlockLevels} • 
            {` ${pactSlots.slots} slot${pactSlots.slots > 1 ? 's' : ''}`} of 
            {` ${pactSlots.slotLevel}${['st','nd','rd'][pactSlots.slotLevel - 1] || 'th'} level`}
          </p>
          <p className="text-xs text-white/70 mt-2">
            You regain these slots on a short rest. All Pact Magic slots are cast at the level shown above.
          </p>
        </div>
      )}

      {showRecommendation && recommendedSpells[showRecommendation] && (
        <div className="bg-[#2A3441] border-2 border-[#37F2D1] rounded-xl p-4 mb-6">
          <h3 className="text-[#37F2D1] font-bold text-lg mb-2">Recommended Spells for {showRecommendation}</h3>
          <p className="text-white">{recommendedSpells[showRecommendation].reasoning}</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto text-[#37F2D1] animate-spin mb-4" />
          <p className="text-white">Loading spell library...</p>
        </div>
      ) : (
        <div className="space-y-8 h-[600px] overflow-y-auto pr-4 custom-scrollbar">
          {Object.keys(spellSlots).map((levelKey) => {
            const slots = getSlotsForLevelKey(levelKey);
            if (slots <= 0) return null;

            // Gate by what you’re actually allowed to learn
            if (levelKey !== "cantrips") {
              const numericLevel = parseInt(levelKey.replace("level", ""), 10);
              if (numericLevel > maxSpellLevel) {
                return null;
              }
            }

            const levelLabel = levelKey === "cantrips" ? "Cantrips" : `${levelKey.replace("level", "")}${["st", "nd", "rd"][parseInt(levelKey.replace("level", "")) - 1] || "th"} Level Spells`;
            const spellsForLevel = availableSpells[levelKey] || [];
            const currentSelected = selectedSpells[levelKey] || [];

            return (
              <div key={levelKey}>
                <h3 className="text-xl font-bold text-[#5B4B9E] mb-4">{levelLabel}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {spellsForLevel.length === 0 ? (
                    <p className="text-white/60 col-span-2">No spells available for this level.</p>
                  ) : (
                    spellsForLevel.map((spell) => {
                      const details = getSpellDetail(spell);
                      const isSelected = currentSelected.includes(spell);
                      const isDisabled = !isSelected && currentSelected.length >= slots;

                      const handleToggle = (checked) => {
                        const newSpells = checked
                          ? [...currentSelected, spell]
                          : currentSelected.filter(s => s !== spell);

                        updateCharacterData({
                          spells: { ...characterData.spells, [levelKey]: newSpells }
                        });
                      };

                      return (
                        <div
                          key={spell}
                          onClick={() => !isDisabled && handleToggle(!isSelected)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#2A3441] border-[#37F2D1] border-4'
                              : 'bg-[#2A3441] border-[#1E2430]'
                          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#37F2D1]/50'}`}
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={handleToggle}
                              disabled={isDisabled}
                              className="mt-1 border-white pointer-events-none"
                            />
                            {spellIcons[spell] && (
                              <img
                                src={spellIcons[spell]}
                                alt={spell}
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border-2 border-[#37F2D1]/30"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold text-[#FFC6AA]">{spell}</h4>
                              <div className="text-xs text-gray-400 mb-2">
                                {details.school} • {details.castingTime} • {details.range}
                              </div>
                              <p className="text-xs text-white leading-relaxed line-clamp-3">{details.description}</p>
                              {details.effects && details.effects.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {details.effects.map((effect, idx) => (
                                    <div
                                      key={idx}
                                      className="relative"
                                      onMouseEnter={() => setHoveredEffect(effect)}
                                      onMouseLeave={() => setHoveredEffect(null)}
                                    >
                                      <Badge className="bg-[#FF5722] text-white text-xs cursor-help">
                                        {effect}
                                      </Badge>
                                      {hoveredEffect === effect && effectDescriptions[effect] && (
                                        <div className="absolute z-10 bottom-full left-0 mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-lg border-2 border-[#FF5722]">
                                          <div className="font-bold mb-1">{effect}</div>
                                          {effectDescriptions[effect]}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}