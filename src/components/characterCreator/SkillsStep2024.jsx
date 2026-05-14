import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, Lock, Star } from "lucide-react";
import { motion } from "framer-motion";
import {
  ALL_SKILLS,
  SKILL_ABILITIES,
  abilityModifier,
} from "@/components/dnd5e/dnd5eRules";
import { getClassByName } from "@/data/games/dnd5e_2024/classes";
import { getSpeciesById, getSubspecies } from "@/data/games/dnd5e_2024/species";
import InfoTip from "@/components/characterCreator/InfoTip";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { tipFor } from "@/components/characterCreator/creatorTips";

/**
 * 2024 D&D 5e — skills step.
 *
 * Mirrors the 2014 SkillsStep layout: header card with the chosen-
 * count summary + free-skills banner, then a 2-column grid of all
 * 18 skills with their modifiers and selection state.
 *
 * 2024 wiring deltas:
 *   - Background skills come from characterData.background.skillsGranted
 *     (written by AbilitiesStep2024) instead of the 2014 backgroundData
 *     module.
 *   - Class skill choices come from the 2024 SRD class adapter.
 *   - Species "Skillful" trait (Human) grants +1 free pick.
 */

const EXPERTISE_AT_L1 = {
  Rogue: 2,
  Bard: 2,
};

function stripSkillPrefix(name) {
  return String(name || "").replace(/^Skill:\s*/i, "");
}

function getSpeciesSkillGrant(characterData) {
  const speciesId = characterData.species?.speciesId;
  if (!speciesId) return 0;
  const species = getSpeciesById(speciesId);
  const subspeciesId = characterData.species?.subspeciesId;
  const subspecies = subspeciesId ? getSubspecies(subspeciesId) : null;
  const traits = [
    ...(species?.traits || []),
    ...(subspecies?.traits || []),
  ];
  return traits.some((t) => t.index === "skillful") ? 1 : 0;
}

export default function SkillsStep2024({ characterData, updateCharacterData }) {
  const className = characterData.class;
  const cls = className ? getClassByName(className) : null;

  const classSkillCount = cls?.skillChoiceCount || 0;
  const availableClassSkills = useMemo(
    () => (cls?.skillChoices || []).map(stripSkillPrefix).filter(Boolean),
    [cls],
  );

  const backgroundSkills = useMemo(
    () => characterData.background?.skillsGranted || [],
    [characterData.background],
  );

  const speciesBonusSkills = useMemo(
    () => getSpeciesSkillGrant(characterData),
    [characterData.species],
  );

  const expertiseCount = EXPERTISE_AT_L1[className] || 0;

  const [selectedSkills, setSelectedSkills] = useState(characterData.skills || {});
  const [expertise, setExpertise] = useState(characterData.expertise || []);

  // Auto-apply background skills.
  useEffect(() => {
    if (backgroundSkills.length === 0) return;
    setSelectedSkills((current) => {
      const next = { ...current };
      backgroundSkills.forEach((s) => { next[s] = true; });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundSkills.join("|")]);

  useEffect(() => {
    const proficiencies = Object.entries(selectedSkills)
      .filter(([, on]) => on)
      .map(([s]) => s);
    updateCharacterData({
      skills: selectedSkills,
      expertise,
      skill_proficiencies: proficiencies,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSkills, expertise]);

  const selectedFromClassList = useMemo(
    () =>
      Object.entries(selectedSkills).filter(
        ([s, on]) =>
          on &&
          !backgroundSkills.includes(s) &&
          availableClassSkills.includes(s),
      ).length,
    [selectedSkills, backgroundSkills, availableClassSkills],
  );

  const selectedFromSpecies = useMemo(
    () =>
      Object.entries(selectedSkills).filter(
        ([s, on]) =>
          on &&
          !backgroundSkills.includes(s) &&
          !availableClassSkills.includes(s),
      ).length,
    [selectedSkills, backgroundSkills, availableClassSkills],
  );

  const proficiencyBonus = Math.floor((characterData.level - 1) / 4) + 2;

  const getSkillModifier = (skill) => {
    const abilityKey = SKILL_ABILITIES[skill];
    const abilityScore = characterData.attributes?.[abilityKey] || 10;
    const baseMod = abilityModifier(abilityScore);
    const isProficient = !!selectedSkills[skill];
    const hasExpertise = expertise.includes(skill);
    if (hasExpertise) return baseMod + proficiencyBonus * 2;
    if (isProficient) return baseMod + proficiencyBonus;
    return baseMod;
  };

  const handleSkillToggle = (skill) => {
    if (backgroundSkills.includes(skill)) return;

    const isProficient = !!selectedSkills[skill];
    const isClassSkill = availableClassSkills.includes(skill);

    if (isProficient) {
      const next = { ...selectedSkills };
      delete next[skill];
      setSelectedSkills(next);
      if (expertise.includes(skill)) {
        setExpertise(expertise.filter((s) => s !== skill));
      }
      return;
    }

    if (isClassSkill) {
      if (selectedFromClassList >= classSkillCount) return;
    } else {
      if (selectedFromSpecies >= speciesBonusSkills) return;
    }
    setSelectedSkills({ ...selectedSkills, [skill]: true });
  };

  const handleExpertiseToggle = (skill) => {
    if (!selectedSkills[skill]) return;
    if (expertise.includes(skill)) {
      setExpertise(expertise.filter((s) => s !== skill));
    } else if (expertise.length < expertiseCount) {
      setExpertise([...expertise, skill]);
    }
  };

  const speciesName = (() => {
    const id = characterData.species?.speciesId;
    return id ? getSpeciesById(id)?.name : characterData.race;
  })();

  return (
    <div>
      <StepHeader
        kicker="Step 5 of 8"
        title="Pick your skills"
        subtitle="Proficiency means you add your proficiency bonus to rolls with that skill."
      />

      <Primer title="Sources of skill proficiency">
        Your <strong>background</strong> grants a fixed set of skills automatically. Your{" "}
        <strong>class</strong> lets you pick {classSkillCount} more from its list.
        {speciesBonusSkills > 0
          ? ` Your species (Skillful) adds ${speciesBonusSkills} free pick from any skill.`
          : ""}
      </Primer>

      <div className="panel" style={{ padding: 20, marginTop: 20 }}>
        <div className="label" style={{ marginBottom: 10 }}>Tally</div>

        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="bg-[#2A3441] rounded-lg px-4 py-2 inline-flex items-center gap-2">
            <span className="text-white/60">Class Skills: </span>
            <span
              className={`font-bold ${
                selectedFromClassList === classSkillCount
                  ? "text-[#37F2D1]"
                  : "text-[#FF5722]"
              }`}
            >
              {selectedFromClassList}/{classSkillCount}
            </span>
            <InfoTip>{tipFor("skill_class")}</InfoTip>
          </div>

          {speciesBonusSkills > 0 && (
            <div className="bg-[#2A3441] rounded-lg px-4 py-2">
              <span className="text-white/60">Species Bonus: </span>
              <span
                className={`font-bold ${
                  selectedFromSpecies === speciesBonusSkills
                    ? "text-[#37F2D1]"
                    : "text-[#FF5722]"
                }`}
              >
                {selectedFromSpecies}/{speciesBonusSkills}
              </span>
            </div>
          )}

          {expertiseCount > 0 && (
            <div className="bg-[#2A3441] rounded-lg px-4 py-2 inline-flex items-center gap-2">
              <span className="text-white/60">Expertise: </span>
              <span
                className={`font-bold ${
                  expertise.length === expertiseCount
                    ? "text-[#37F2D1]"
                    : "text-[#FF5722]"
                }`}
              >
                {expertise.length}/{expertiseCount}
              </span>
              <InfoTip>{tipFor("skill_expertise")}</InfoTip>
            </div>
          )}
        </div>

        {backgroundSkills.length > 0 && (
          <div className="bg-[#37F2D1]/10 border border-[#37F2D1]/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-[#37F2D1] font-semibold mb-1 flex items-center gap-2">
              🎁 Free Skills from your background:
              <InfoTip>{tipFor("skill_free")}</InfoTip>
            </p>
            <div className="flex gap-2 flex-wrap">
              {backgroundSkills.map((skill) => (
                <Badge key={skill} className="bg-[#37F2D1] text-[#1E2430]">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {speciesBonusSkills > 0 && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-400 font-semibold">
              ✨ {speciesName || "Your species"} grants {speciesBonusSkills} bonus
              skill{speciesBonusSkills > 1 ? "s" : ""} (pick any skill — Skillful trait)
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ALL_SKILLS.map((skill) => {
          const isProficient = !!selectedSkills[skill];
          const hasExpertise = expertise.includes(skill);
          const isBackgroundSkill = backgroundSkills.includes(skill);
          const isClassSkill = availableClassSkills.includes(skill);

          let canSelect = false;
          if (!isProficient && !isBackgroundSkill) {
            if (isClassSkill && selectedFromClassList < classSkillCount) {
              canSelect = true;
            } else if (!isClassSkill && selectedFromSpecies < speciesBonusSkills) {
              canSelect = true;
            }
          }

          const modifier = getSkillModifier(skill);

          return (
            <motion.div
              key={skill}
              whileHover={{ scale: isBackgroundSkill ? 1 : 1.02 }}
              className={`bg-[#2A3441] rounded-xl p-4 border-2 transition-all ${
                isProficient
                  ? hasExpertise
                    ? "border-yellow-400 bg-yellow-400/10"
                    : "border-[#37F2D1] bg-[#37F2D1]/10"
                  : canSelect || isBackgroundSkill
                  ? "border-[#1E2430] hover:border-[#37F2D1]/50 cursor-pointer"
                  : "border-[#1E2430] opacity-50"
              }`}
              onClick={() =>
                (canSelect || (isProficient && !isBackgroundSkill)) &&
                handleSkillToggle(skill)
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white font-bold">{skill}</span>
                    {isBackgroundSkill && (
                      <Badge className="bg-[#37F2D1] text-[#1E2430] text-xs">
                        Background
                      </Badge>
                    )}
                    {isClassSkill && !isBackgroundSkill && (
                      <Badge className="bg-[#5B4B9E]/40 text-white text-[10px] border border-[#5B4B9E]/50">
                        Class
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-white/60 uppercase">
                    {SKILL_ABILITIES[skill]}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-2xl font-bold text-[#37F2D1]">
                    {modifier >= 0 ? "+" : ""}{modifier}
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
                            ? "bg-yellow-400 text-[#1E2430]"
                            : "bg-[#1E2430] text-white/40 hover:bg-[#1E2430]/50"
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
            Choose {expertiseCount} skill{expertiseCount > 1 ? "s" : ""} to gain
            expertise in. Expertise doubles your proficiency bonus for those skills.
          </p>
        </div>
      )}
    </div>
  );
}
