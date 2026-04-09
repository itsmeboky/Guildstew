import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { getBackgroundSkills } from "@/components/dnd5e/backgroundData";
import { racialSkills } from "@/components/dnd5e/raceData";

const allSkills = [
  "Athletics",
  "Acrobatics", "Sleight of Hand", "Stealth",
  "Arcana", "History", "Investigation", "Nature", "Religion",
  "Animal Handling", "Insight", "Medicine", "Perception", "Survival",
  "Deception", "Intimidation", "Performance", "Persuasion"
];

const classSkillOptions = {
  Barbarian: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"],
  Bard: ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"],
  Cleric: ["History", "Insight", "Medicine", "Persuasion", "Religion"],
  Druid: ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"],
  Fighter: ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"],
  Monk: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"],
  Paladin: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"],
  Ranger: ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"],
  Rogue: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"],
  Sorcerer: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"],
  Warlock: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"],
  Wizard: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"]
};

const classSkillCounts = {
  Barbarian: 2, Bard: 3, Cleric: 2, Druid: 2, Fighter: 2, Monk: 2,
  Paladin: 2, Ranger: 3, Rogue: 4, Sorcerer: 2, Warlock: 2, Wizard: 2
};

const classExpertiseCount = {
  Rogue: 2,
  Bard: 2
};

const skillAbilityMap = {
  "Athletics": "str",
  "Acrobatics": "dex", "Sleight of Hand": "dex", "Stealth": "dex",
  "Arcana": "int", "History": "int", "Investigation": "int", "Nature": "int", "Religion": "int",
  "Animal Handling": "wis", "Insight": "wis", "Medicine": "wis", "Perception": "wis", "Survival": "wis",
  "Deception": "cha", "Intimidation": "cha", "Performance": "cha", "Persuasion": "cha"
};

export default function SkillsStep({ characterData, updateCharacterData }) {
  const [selectedSkills, setSelectedSkills] = useState(characterData.skills || {});
  const [expertise, setExpertise] = useState(characterData.expertise || []);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const backgroundSkills = getBackgroundSkills(characterData.background);
  const racialBonusSkills = racialSkills[characterData.race] || 0;
  const classSkillCount = classSkillCounts[characterData.class] || 2;
  const expertiseCount = classExpertiseCount[characterData.class] || 0;

  // Auto-apply background skills
  useEffect(() => {
    if (backgroundSkills.length > 0) {
      const updatedSkills = { ...selectedSkills };
      backgroundSkills.forEach(skill => {
        updatedSkills[skill] = true;
      });
      setSelectedSkills(updatedSkills);
    }
  }, [characterData.background]);

  // Sync to characterData whenever skills or expertise change
  useEffect(() => {
    updateCharacterData({ 
      skills: selectedSkills,
      expertise: expertise
    });
  }, [selectedSkills, expertise]);

  const availableClassSkills = classSkillOptions[characterData.class] || [];
  
  // Count only skills selected from class list (not background skills)
  const selectedFromClassList = Object.entries(selectedSkills)
    .filter(([skill, selected]) => selected && !backgroundSkills.includes(skill) && availableClassSkills.includes(skill))
    .length;

  // Count skills selected that aren't from background or class list (racial bonus slots)
  const selectedFromRacialBonus = Object.entries(selectedSkills)
    .filter(([skill, selected]) => selected && !backgroundSkills.includes(skill) && !availableClassSkills.includes(skill))
    .length;

  const totalSelectedNonBackground = selectedFromClassList + selectedFromRacialBonus;

  const handleSkillToggle = (skill) => {
    if (backgroundSkills.includes(skill)) return; // Can't deselect background skills

    const isCurrentlySelected = selectedSkills[skill];
    const isClassSkill = availableClassSkills.includes(skill);
    
    if (isCurrentlySelected) {
      // Deselect
      const updated = { ...selectedSkills };
      delete updated[skill];
      setSelectedSkills(updated);
      
      // Remove from expertise if it was there
      if (expertise.includes(skill)) {
        setExpertise(expertise.filter(s => s !== skill));
      }
    } else {
      // Select - check if we have room
      const totalNeeded = classSkillCount + racialBonusSkills;
      
      if (totalSelectedNonBackground < totalNeeded) {
        setSelectedSkills({ ...selectedSkills, [skill]: true });
      }
    }
  };

  const handleExpertiseToggle = (skill) => {
    if (!selectedSkills[skill]) return; // Must be proficient first
    
    if (expertise.includes(skill)) {
      setExpertise(expertise.filter(s => s !== skill));
    } else {
      if (expertise.length < expertiseCount) {
        setExpertise([...expertise, skill]);
      }
    }
  };

  const calculateModifier = (score) => Math.floor((score - 10) / 2);
  const proficiencyBonus = Math.floor((characterData.level - 1) / 4) + 2;

  const getSkillModifier = (skill) => {
    const abilityKey = skillAbilityMap[skill];
    const abilityScore = characterData.attributes?.[abilityKey] || 10;
    const baseMod = calculateModifier(abilityScore);
    
    const isProficient = selectedSkills[skill];
    const hasExpertise = expertise.includes(skill);
    
    if (hasExpertise) return baseMod + (proficiencyBonus * 2);
    if (isProficient) return baseMod + proficiencyBonus;
    return baseMod;
  };

  const totalNeeded = classSkillCount + racialBonusSkills;
  const isComplete = totalSelectedNonBackground === totalNeeded && expertise.length === expertiseCount;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]">
        <h2 className="text-2xl font-bold text-white mb-2">Skill Proficiencies</h2>
        <p className="text-white/70 mb-4">
          Choose {classSkillCount} skills from your {characterData.class} list
          {racialBonusSkills > 0 && `, plus ${racialBonusSkills} from any skill`}
        </p>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-[#2A3441] rounded-lg px-4 py-2">
            <span className="text-white/60">Class Skills: </span>
            <span className={`font-bold ${selectedFromClassList === classSkillCount ? 'text-[#37F2D1]' : 'text-[#FF5722]'}`}>
              {selectedFromClassList}/{classSkillCount}
            </span>
          </div>
          
          {racialBonusSkills > 0 && (
            <div className="bg-[#2A3441] rounded-lg px-4 py-2">
              <span className="text-white/60">Racial Bonus: </span>
              <span className={`font-bold ${selectedFromRacialBonus === racialBonusSkills ? 'text-[#37F2D1]' : 'text-[#FF5722]'}`}>
                {selectedFromRacialBonus}/{racialBonusSkills}
              </span>
            </div>
          )}
          
          {expertiseCount > 0 && (
            <div className="bg-[#2A3441] rounded-lg px-4 py-2">
              <span className="text-white/60">Expertise: </span>
              <span className={`font-bold ${expertise.length === expertiseCount ? 'text-[#37F2D1]' : 'text-[#FF5722]'}`}>
                {expertise.length}/{expertiseCount}
              </span>
            </div>
          )}
        </div>

        {backgroundSkills.length > 0 && (
          <div className="bg-[#37F2D1]/10 border border-[#37F2D1]/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-[#37F2D1] font-semibold mb-1">
              🎁 Free Skills from {characterData.background}:
            </p>
            <div className="flex gap-2 flex-wrap">
              {backgroundSkills.map(skill => (
                <Badge key={skill} className="bg-[#37F2D1] text-[#1E2430]">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {racialBonusSkills > 0 && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-400 font-semibold">
              ✨ Your {characterData.race} grants {racialBonusSkills} bonus skill{racialBonusSkills > 1 ? 's' : ''} (can be any skill)
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {allSkills.map(skill => {
          const isProficient = selectedSkills[skill];
          const hasExpertise = expertise.includes(skill);
          const isBackgroundSkill = backgroundSkills.includes(skill);
          const isClassSkill = availableClassSkills.includes(skill);
          
          // Determine if this skill can be selected
          let canSelect = false;
          if (!isProficient) {
            if (isClassSkill && selectedFromClassList < classSkillCount) {
              canSelect = true;
            } else if (!isClassSkill && selectedFromRacialBonus < racialBonusSkills) {
              canSelect = true;
            }
          }
          
          const modifier = getSkillModifier(skill);

          return (
            <motion.div
              key={skill}
              whileHover={{ scale: 1.02 }}
              className={`bg-[#2A3441] rounded-xl p-4 border-2 transition-all ${
                isProficient 
                  ? hasExpertise 
                    ? 'border-yellow-400 bg-yellow-400/10' 
                    : 'border-[#37F2D1] bg-[#37F2D1]/10'
                  : (canSelect || isBackgroundSkill)
                    ? 'border-[#1E2430] hover:border-[#37F2D1]/50 cursor-pointer' 
                    : 'border-[#1E2430] opacity-50'
              }`}
              onClick={() => (canSelect || isProficient) && handleSkillToggle(skill)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold">{skill}</span>
                    {isBackgroundSkill && (
                      <Badge className="bg-[#37F2D1] text-[#1E2430] text-xs">Background</Badge>
                    )}
                    {!isClassSkill && isProficient && !isBackgroundSkill && (
                      <Badge className="bg-yellow-400 text-[#1E2430] text-xs">Racial</Badge>
                    )}
                  </div>
                  <div className="text-xs text-white/60 uppercase">{skillAbilityMap[skill]}</div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className="text-2xl font-bold text-[#37F2D1]">
                    {modifier >= 0 ? '+' : ''}{modifier}
                  </div>
                  
                  <div className="flex gap-1">
                    {isProficient && (
                      <div className="w-6 h-6 rounded-full bg-[#37F2D1] flex items-center justify-center">
                        <Check className="w-4 h-4 text-[#1E2430]" />
                      </div>
                    )}
                    
                    {expertiseCount > 0 && isProficient && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpertiseToggle(skill);
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          hasExpertise 
                            ? 'bg-yellow-400 text-[#1E2430]' 
                            : 'bg-[#1E2430] text-white/40 hover:bg-[#1E2430]/50'
                        }`}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {expertiseCount > 0 && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <h3 className="text-yellow-400 font-bold">Expertise</h3>
          </div>
          <p className="text-white/70 text-sm">
            Choose {expertiseCount} skill{expertiseCount > 1 ? 's' : ''} to gain expertise in. 
            Expertise doubles your proficiency bonus for those skills.
          </p>
        </div>
      )}
    </div>
  );
}