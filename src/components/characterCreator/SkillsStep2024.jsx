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

/**
 * 2024 D&D 5e — skills step.
 *
 * Sources of skill proficiency in 2024:
 *   - Background: two fixed skills, written by AbilitiesStep2024 to
 *     `characterData.background.skillsGranted`.
 *   - Class: the class's `proficiency_choices` skill list. SRD class
 *     names arrive prefixed `"Skill: Stealth"` — the prefix is stripped
 *     before matching the ALL_SKILLS registry.
 *   - Species traits: the SRD's "Skillful" trait (Human) grants one
 *     free skill of choice. Other 2024 species do not grant skills.
 *
 * Expertise: Rogue and Bard grant 2 expertise picks at L1 (PHB 2024).
 *
 * Persistence:
 *   characterData.skills              = { [skillName]: true }
 *   characterData.skill_proficiencies = [skillName, ...]
 *   characterData.expertise           = [skillName, ...]
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
  if (!speciesId) return { count: 0, from: null };
  const species = getSpeciesById(speciesId);
  const subspeciesId = characterData.species?.subspeciesId;
  const subspecies = subspeciesId ? getSubspecies(subspeciesId) : null;
  const traits = [
    ...(species?.traits || []),
    ...(subspecies?.traits || []),
  ];
  // The only SRD 2024 trait that grants a skill is "Skillful"
  // (Human). Match by index to stay name-agnostic.
  const hasSkillful = traits.some((t) => t.index === "skillful");
  return hasSkillful ? { count: 1, from: null } : { count: 0, from: null };
}

export default function SkillsStep2024({ characterData, updateCharacterData }) {
  const className = characterData.class;
  const cls = className ? getClassByName(className) : null;

  const classSkillCount = cls?.skillChoiceCount || 0;
  const classSkillOptions = useMemo(
    () => (cls?.skillChoices || []).map(stripSkillPrefix).filter(Boolean),
    [cls],
  );

  const backgroundSkills = useMemo(
    () => characterData.background?.skillsGranted || [],
    [characterData.background],
  );

  const speciesGrant = useMemo(
    () => getSpeciesSkillGrant(characterData),
    [characterData.species],
  );

  const expertiseCount = EXPERTISE_AT_L1[className] || 0;

  const [selectedSkills, setSelectedSkills] = useState(characterData.skills || {});
  const [expertise, setExpertise] = useState(characterData.expertise || []);

  // Auto-apply background skills whenever they change. Background
  // skills are locked in this step — players pick them implicitly
  // when they pick the background in AbilitiesStep2024.
  useEffect(() => {
    if (backgroundSkills.length === 0) return;
    setSelectedSkills((current) => {
      const next = { ...current };
      backgroundSkills.forEach((s) => { next[s] = true; });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundSkills.join("|")]);

  // Sync to characterData.
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

  // Bucket counts (excluding free background grants).
  const classSelected = useMemo(
    () =>
      Object.entries(selectedSkills).filter(
        ([s, on]) =>
          on &&
          !backgroundSkills.includes(s) &&
          classSkillOptions.includes(s),
      ).length,
    [selectedSkills, backgroundSkills, classSkillOptions],
  );

  const speciesSelected = useMemo(
    () =>
      Object.entries(selectedSkills).filter(
        ([s, on]) =>
          on &&
          !backgroundSkills.includes(s) &&
          !classSkillOptions.includes(s),
      ).length,
    [selectedSkills, backgroundSkills, classSkillOptions],
  );

  const proficiencyBonus = Math.floor((characterData.level - 1) / 4) + 2;

  const skillModifier = (skill) => {
    const abilityKey = SKILL_ABILITIES[skill];
    const score = characterData.attributes?.[abilityKey] || 10;
    const baseMod = abilityModifier(score);
    const isProficient = !!selectedSkills[skill];
    const hasExpertise = expertise.includes(skill);
    if (hasExpertise) return baseMod + proficiencyBonus * 2;
    if (isProficient) return baseMod + proficiencyBonus;
    return baseMod;
  };

  const handleSkillToggle = (skill) => {
    // Background skills are locked.
    if (backgroundSkills.includes(skill)) return;

    const isProficient = !!selectedSkills[skill];
    const isClassSkill = classSkillOptions.includes(skill);

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
      if (classSelected >= classSkillCount) return;
    } else {
      // Non-class skill — only allowed via species "Skillful" grant.
      if (speciesSelected >= speciesGrant.count) return;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto"
    >
      <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-[#2A3441]">
        <h2 className="text-2xl font-bold text-[#FFC6AA] mb-2 flex items-center gap-2">
          Skill Proficiencies
          <Badge className="bg-[#37F2D1] text-[#1E2430] text-[10px] font-black">
            2024
          </Badge>
          <InfoTip width="w-80">
            Backgrounds grant two skills (locked). Your class grants more
            skill picks from its list. Some species traits grant an extra
            free pick (e.g. Human Skillful).
          </InfoTip>
        </h2>
        <p className="text-white/80 text-sm">
          {className
            ? `Pick ${classSkillCount} skill${classSkillCount === 1 ? "" : "s"} from your ${className} list`
            : "Pick a class to see skill options"}
          {speciesGrant.count > 0 && (
            <span> + {speciesGrant.count} free pick from any skill (species).</span>
          )}
        </p>

        <div className="flex items-center gap-3 mt-4 flex-wrap text-sm">
          {classSkillCount > 0 && (
            <div className="bg-[#1E2430]/60 rounded-lg px-3 py-1.5">
              <span className="text-white/60">Class: </span>
              <span
                className={`font-bold ${
                  classSelected === classSkillCount ? "text-[#37F2D1]" : "text-[#FF5722]"
                }`}
              >
                {classSelected}/{classSkillCount}
              </span>
            </div>
          )}
          {speciesGrant.count > 0 && (
            <div className="bg-[#1E2430]/60 rounded-lg px-3 py-1.5">
              <span className="text-white/60">Species: </span>
              <span
                className={`font-bold ${
                  speciesSelected === speciesGrant.count ? "text-[#37F2D1]" : "text-[#FF5722]"
                }`}
              >
                {speciesSelected}/{speciesGrant.count}
              </span>
            </div>
          )}
          {expertiseCount > 0 && (
            <div className="bg-[#1E2430]/60 rounded-lg px-3 py-1.5">
              <span className="text-white/60">Expertise: </span>
              <span
                className={`font-bold ${
                  expertise.length === expertiseCount ? "text-[#37F2D1]" : "text-[#FF5722]"
                }`}
              >
                {expertise.length}/{expertiseCount}
              </span>
            </div>
          )}
        </div>

        {backgroundSkills.length > 0 && (
          <div className="bg-[#37F2D1]/10 border border-[#37F2D1]/30 rounded-lg p-3 mt-4">
            <p className="text-xs text-[#37F2D1] font-semibold mb-2 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              Granted by background:
            </p>
            <div className="flex gap-2 flex-wrap">
              {backgroundSkills.map((s) => (
                <Badge key={s} className="bg-[#37F2D1] text-[#1E2430]">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ALL_SKILLS.map((skill) => {
          const isProficient = !!selectedSkills[skill];
          const isBackground = backgroundSkills.includes(skill);
          const isClassSkill = classSkillOptions.includes(skill);
          const hasExpertise = expertise.includes(skill);

          let canSelect = false;
          if (!isProficient && !isBackground) {
            if (isClassSkill && classSelected < classSkillCount) canSelect = true;
            else if (!isClassSkill && speciesSelected < speciesGrant.count)
              canSelect = true;
          }

          const mod = skillModifier(skill);
          const ability = SKILL_ABILITIES[skill];

          return (
            <motion.div
              key={skill}
              whileHover={{ scale: isBackground ? 1 : 1.01 }}
              onClick={() => (canSelect || (isProficient && !isBackground)) && handleSkillToggle(skill)}
              className={`bg-[#2A3441] rounded-xl p-3 border-2 transition-all ${
                isProficient
                  ? hasExpertise
                    ? "border-yellow-400 bg-yellow-400/10"
                    : "border-[#37F2D1] bg-[#37F2D1]/10"
                  : canSelect
                  ? "border-[#1E2430] hover:border-[#37F2D1]/50 cursor-pointer"
                  : "border-[#1E2430] opacity-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-sm">{skill}</span>
                    {isBackground && (
                      <Badge className="bg-[#37F2D1] text-[#1E2430] text-[10px]">
                        Background
                      </Badge>
                    )}
                    {isClassSkill && !isBackground && (
                      <Badge className="bg-[#5B4B9E]/40 text-white text-[10px] border border-[#5B4B9E]/50">
                        Class
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-white/50 uppercase mt-0.5">
                    {ability}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="text-xl font-bold text-[#37F2D1]">
                    {mod >= 0 ? "+" : ""}{mod}
                  </div>
                  <div className="flex gap-1">
                    {isProficient && (
                      <div className="w-5 h-5 rounded-full bg-[#37F2D1] flex items-center justify-center">
                        <Check className="w-3 h-3 text-[#1E2430]" />
                      </div>
                    )}
                    {expertiseCount > 0 && isProficient && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpertiseToggle(skill);
                        }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                          hasExpertise
                            ? "bg-yellow-400 text-[#1E2430]"
                            : "bg-[#1E2430] text-white/40 hover:bg-[#1E2430]/50"
                        }`}
                      >
                        <Star className="w-3 h-3" />
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
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 mt-6">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-yellow-400" />
            <h3 className="text-yellow-400 font-bold text-sm">Expertise</h3>
          </div>
          <p className="text-white/70 text-xs">
            Tap the star on {expertiseCount} proficient skill
            {expertiseCount === 1 ? "" : "s"} to gain expertise (double
            proficiency bonus).
          </p>
        </div>
      )}
    </motion.div>
  );
}
