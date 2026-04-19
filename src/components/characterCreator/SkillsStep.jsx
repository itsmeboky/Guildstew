import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, HelpCircle, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { getBackgroundSkills } from "@/components/dnd5e/backgroundData";
import { getRaceSkillProficiencies } from "@/components/dnd5e/raceData";
import {
  abilityModifier,
  ALL_SKILLS,
  SKILL_ABILITIES,
  CLASS_SKILL_CHOICES,
} from '@/components/dnd5e/dnd5eRules';

// Derived from the registry so every component reads from one source.
const allSkills = ALL_SKILLS;

// CLASS_SKILL_CHOICES shape: { Barbarian: { count: 2, from: [...] }, ... }
const classSkillOptions = Object.fromEntries(
  Object.entries(CLASS_SKILL_CHOICES).map(([cls, v]) => [cls, v.from || []])
);
const classSkillCounts = Object.fromEntries(
  Object.entries(CLASS_SKILL_CHOICES).map(([cls, v]) => [cls, v.count || 2])
);

const classExpertiseCount = {
  Rogue: 2,
  Bard: 2
};

// Re-use the registry's SKILL_ABILITIES (lowercase ability keys).
const skillAbilityMap = SKILL_ABILITIES;

export default function SkillsStep({ characterData, updateCharacterData }) {
  const [selectedSkills, setSelectedSkills] = useState(characterData.skills || {});
  const [expertise, setExpertise] = useState(characterData.expertise || []);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const backgroundSkills = getBackgroundSkills(characterData.background);
  // Racial skills: fixed rows are auto-granted + locked; choose slots
  // are picked against `from` ("any" → ALL_SKILLS, or an explicit list).
  const raceRule = getRaceSkillProficiencies(characterData.race, characterData.subrace);
  const fixedRacialSkills = raceRule.fixed || [];
  const racialBonusSkills = raceRule.choose || 0;
  const racialFromList = raceRule.from === "any" || !Array.isArray(raceRule.from)
    ? null
    : raceRule.from;
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

  // Auto-apply fixed racial skills (Elf → Perception, Half-Orc →
  // Intimidation, etc.) and drop the old ones whenever the race /
  // subrace changes. This mirrors the racial-language swap pattern.
  const prevFixedRef = useRef(fixedRacialSkills);
  useEffect(() => {
    const prev = prevFixedRef.current || [];
    const next = fixedRacialSkills;
    const add = next.filter((s) => !prev.includes(s));
    const remove = prev.filter((s) => !next.includes(s));
    if (add.length === 0 && remove.length === 0) return;
    setSelectedSkills((current) => {
      const updated = { ...current };
      remove.forEach((s) => {
        // Don't remove if it's also granted by background/class — that
        // claim survives the race swap.
        if (backgroundSkills.includes(s)) return;
        delete updated[s];
      });
      add.forEach((s) => { updated[s] = true; });
      return updated;
    });
    prevFixedRef.current = next;
  }, [characterData.race, characterData.subrace, backgroundSkills, fixedRacialSkills]);

  // Sync to characterData whenever skills or expertise change
  useEffect(() => {
    const proficiencies = Object.entries(selectedSkills)
      .filter(([, on]) => on)
      .map(([skill]) => skill);
    updateCharacterData({
      skills: selectedSkills,
      expertise,
      skill_proficiencies: proficiencies,
    });
  }, [selectedSkills, expertise]);

  const availableClassSkills = classSkillOptions[characterData.class] || [];

  // Count only skills selected from class list (not background/fixed-racial).
  const selectedFromClassList = Object.entries(selectedSkills)
    .filter(([skill, selected]) =>
      selected
      && !backgroundSkills.includes(skill)
      && !fixedRacialSkills.includes(skill)
      && availableClassSkills.includes(skill),
    )
    .length;

  // Count skills selected that aren't from background / class list /
  // fixed racial — those are the racial-choice slots.
  const selectedFromRacialBonus = Object.entries(selectedSkills)
    .filter(([skill, selected]) =>
      selected
      && !backgroundSkills.includes(skill)
      && !fixedRacialSkills.includes(skill)
      && !availableClassSkills.includes(skill),
    )
    .length;

  const totalSelectedNonBackground = selectedFromClassList + selectedFromRacialBonus;

  const handleSkillToggle = (skill) => {
    if (backgroundSkills.includes(skill)) return; // Can't deselect background skills
    if (fixedRacialSkills.includes(skill)) return; // Racial fixed skills are locked

    const isCurrentlySelected = selectedSkills[skill];
    const isClassSkill = availableClassSkills.includes(skill);

    if (isCurrentlySelected) {
      const updated = { ...selectedSkills };
      delete updated[skill];
      setSelectedSkills(updated);

      if (expertise.includes(skill)) {
        setExpertise(expertise.filter(s => s !== skill));
      }
      return;
    }

    // Select — respect the racial `from` restriction if present.
    if (!isClassSkill && racialFromList && !racialFromList.includes(skill)) return;

    const totalNeeded = classSkillCount + racialBonusSkills;
    if (totalSelectedNonBackground < totalNeeded) {
      setSelectedSkills({ ...selectedSkills, [skill]: true });
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

  const calculateModifier = (score) => abilityModifier(score);
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
          {racialBonusSkills > 0 && (
            racialFromList
              ? `, plus ${racialBonusSkills} from ${racialFromList.join(", ")}`
              : `, plus ${racialBonusSkills} from any skill`
          )}
        </p>

        <div className="flex items-center gap-4 mb-4 flex-wrap">
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

        {fixedRacialSkills.length > 0 && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-400 font-semibold mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              Granted by {characterData.subrace || characterData.race}:
            </p>
            <div className="flex gap-2 flex-wrap">
              {fixedRacialSkills.map((skill) => (
                <Badge key={skill} className="bg-yellow-400 text-[#1E2430]">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {racialBonusSkills > 0 && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-400 font-semibold">
              ✨ {characterData.subrace || characterData.race} grants {racialBonusSkills} bonus skill{racialBonusSkills > 1 ? "s" : ""}
              {racialFromList
                ? ` (pick from ${racialFromList.join(", ")})`
                : " (pick any skill)"}
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
          const isFixedRacialSkill = fixedRacialSkills.includes(skill);
          const racialPickAllowed = !racialFromList || racialFromList.includes(skill);

          // Determine if this skill can be selected as a fresh pick
          let canSelect = false;
          if (!isProficient && !isFixedRacialSkill) {
            if (isClassSkill && selectedFromClassList < classSkillCount) {
              canSelect = true;
            } else if (!isClassSkill && selectedFromRacialBonus < racialBonusSkills && racialPickAllowed) {
              canSelect = true;
            }
          }

          const modifier = getSkillModifier(skill);

          return (
            <motion.div
              key={skill}
              whileHover={{ scale: (isFixedRacialSkill || isBackgroundSkill) ? 1 : 1.02 }}
              className={`bg-[#2A3441] rounded-xl p-4 border-2 transition-all ${
                isProficient
                  ? hasExpertise
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : 'border-[#37F2D1] bg-[#37F2D1]/10'
                  : (canSelect || isBackgroundSkill)
                    ? 'border-[#1E2430] hover:border-[#37F2D1]/50 cursor-pointer'
                    : 'border-[#1E2430] opacity-50'
              }`}
              onClick={() => (canSelect || (isProficient && !isFixedRacialSkill && !isBackgroundSkill)) && handleSkillToggle(skill)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white font-bold">{skill}</span>
                    {isBackgroundSkill && (
                      <Badge className="bg-[#37F2D1] text-[#1E2430] text-xs">Background</Badge>
                    )}
                    {isFixedRacialSkill && (
                      <Badge className="bg-yellow-400 text-[#1E2430] text-xs flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Racial
                      </Badge>
                    )}
                    {!isClassSkill && isProficient && !isBackgroundSkill && !isFixedRacialSkill && (
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