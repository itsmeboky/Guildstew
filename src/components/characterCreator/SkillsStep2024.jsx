import React, { useEffect, useMemo, useState } from "react";
import { Check, Star, Lock } from "lucide-react";
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

// ============================================================================
// 2024 D&D 5e — skills step. Exact port of step-skills.jsx with the 2024
// adapter (background skillsGranted + class skillChoices + species
// 'Skillful' trait) wired in place of the prototype's local lookups.
// ============================================================================

const EXPERTISE_AT_L1 = { Rogue: 2, Bard: 2 };

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

  // Auto-apply background-granted skills.
  useEffect(() => {
    if (backgroundSkills.length === 0) return;
    setSelectedSkills((cur) => {
      const next = { ...cur };
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
    () => Object.entries(selectedSkills).filter(
      ([s, on]) => on && !backgroundSkills.includes(s) && availableClassSkills.includes(s),
    ).length,
    [selectedSkills, backgroundSkills, availableClassSkills],
  );

  const selectedFromSpecies = useMemo(
    () => Object.entries(selectedSkills).filter(
      ([s, on]) => on && !backgroundSkills.includes(s) && !availableClassSkills.includes(s),
    ).length,
    [selectedSkills, backgroundSkills, availableClassSkills],
  );

  const proficiencyBonus = Math.floor(((characterData.level || 1) - 1) / 4) + 2;

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
      if (expertise.includes(skill)) setExpertise(expertise.filter((s) => s !== skill));
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
    if (expertise.includes(skill)) setExpertise(expertise.filter((s) => s !== skill));
    else if (expertise.length < expertiseCount) setExpertise([...expertise, skill]);
  };

  const totalProficient = Object.values(selectedSkills).filter(Boolean).length;

  if (!className) {
    return (
      <div>
        <StepHeader kicker="Chapter V · The Talents" title="Pick your skills" />
        <div className="tome" style={{ padding: 40, textAlign: 'center', marginTop: 24 }}>
          <div className="italic-serif" style={{ fontSize: 16, color: 'var(--text-dim)' }}>
            Pick a class on Chapter II — your skill list comes from there.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        kicker="Chapter V · The Talents"
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

      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 14,
          marginTop: 18,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <StatusCard
          label="Class picks"
          value={`${selectedFromClassList} / ${classSkillCount}`}
          color={selectedFromClassList === classSkillCount ? 'teal' : 'orange'}
          icon="🎯"
          tip={tipFor("skill_class")}
        />
        {speciesBonusSkills > 0 && (
          <StatusCard
            label="Species bonus"
            value={`${selectedFromSpecies} / ${speciesBonusSkills}`}
            color={selectedFromSpecies === speciesBonusSkills ? 'teal' : 'orange'}
            icon="✨"
            sub="any skill"
          />
        )}
        <StatusCard
          label="Background skills"
          value={String(backgroundSkills.length || 0)}
          color="teal"
          icon="🎒"
          sub={backgroundSkills.join(', ') || 'Pick a background on Chapter III'}
        />
        {expertiseCount > 0 && (
          <StatusCard
            label="Expertise"
            value={`${expertise.length} / ${expertiseCount}`}
            color={expertise.length === expertiseCount ? 'gold' : 'orange'}
            icon="⭐"
            tip={tipFor("skill_expertise")}
          />
        )}
        <StatusCard
          label="Total proficient"
          value={String(totalProficient)}
          color="teal"
          icon="✓"
        />
      </div>

      {backgroundSkills.length > 0 && (
        <BackgroundFixedBanner skills={backgroundSkills} />
      )}

      <div className="panel" style={{ padding: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 14,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <h3 className="display" style={{ fontSize: 22, color: 'var(--text)', margin: 0 }}>
            All 18 skills
          </h3>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            <span className="chip" style={{ fontSize: 10, padding: '2px 6px', marginRight: 6 }}>
              ✓ Background
            </span>
            <span className="chip chip-orange" style={{ fontSize: 10, padding: '2px 6px', marginRight: 6 }}>
              ✓ Class pick
            </span>
            <span className="chip chip-gold" style={{ fontSize: 10, padding: '2px 6px', marginRight: 6 }}>
              ✓ Species bonus
            </span>
            <span
              className="chip"
              style={{
                fontSize: 10,
                padding: '2px 6px',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-dim)',
                borderColor: 'var(--border)',
              }}
            >
              Locked
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {ALL_SKILLS.map((skill) => {
            const isProficient = !!selectedSkills[skill];
            const hasExpertise = expertise.includes(skill);
            const isBackground = backgroundSkills.includes(skill);
            const isClassSkill = availableClassSkills.includes(skill);
            const isSpeciesPick = isProficient && !isBackground && !isClassSkill && speciesBonusSkills > 0;

            let canSelect = false;
            if (!isProficient && !isBackground) {
              if (isClassSkill && selectedFromClassList < classSkillCount) canSelect = true;
              else if (!isClassSkill && selectedFromSpecies < speciesBonusSkills) canSelect = true;
            }

            const status = isBackground
              ? 'bg'
              : isSpeciesPick
                ? 'racial'
                : isProficient
                  ? 'pick'
                  : isClassSkill || speciesBonusSkills > 0
                    ? 'avail'
                    : 'locked';

            return (
              <SkillRow
                key={skill}
                skill={skill}
                ability={SKILL_ABILITIES[skill]}
                status={status}
                modifier={getSkillModifier(skill)}
                hasExpertise={hasExpertise}
                disabled={isBackground || (!isProficient && !canSelect)}
                expertiseAllowed={expertiseCount > 0 && isProficient && !isBackground}
                onToggle={() => handleSkillToggle(skill)}
                onExpertiseToggle={() => handleExpertiseToggle(skill)}
              />
            );
          })}
        </div>

        {availableClassSkills.length > 0 && availableClassSkills.length < ALL_SKILLS.length && (
          <div
            className="italic-serif"
            style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 12, textAlign: 'center' }}
          >
            Greyed-out skills aren't on your {className} list. They appear here so you can see your
            full skill modifier (without proficiency).
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// StatusCard — top-of-step tally tile
// ============================================================================
function StatusCard({ label, value, color, icon, sub, tip }) {
  const accent =
    color === 'orange' ? 'var(--orange-soft)'
    : color === 'gold' ? 'var(--gold)'
    : 'var(--teal)';
  const bg =
    color === 'orange' ? 'rgba(255, 83, 0, 0.08)'
    : color === 'gold' ? 'rgba(212, 169, 81, 0.10)'
    : 'rgba(55, 242, 209, 0.08)';
  const border =
    color === 'orange' ? 'rgba(255, 83, 0, 0.30)'
    : color === 'gold' ? 'rgba(212, 169, 81, 0.32)'
    : 'rgba(55, 242, 209, 0.25)';
  return (
    <div
      style={{
        flex: 1,
        minWidth: 160,
        padding: 14,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
      }}
    >
      <div
        className="label"
        style={{ color: accent, marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        {label}
        {tip && <InfoTip>{tip}</InfoTip>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span className="display" style={{ fontSize: 22, color: 'var(--text)' }}>{value}</span>
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.3 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BackgroundFixedBanner — teal banner listing the background-granted skills
// ============================================================================
function BackgroundFixedBanner({ skills }) {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: '14px 18px',
        background: 'rgba(55, 242, 209, 0.06)',
        border: '1px solid rgba(55, 242, 209, 0.25)',
        borderLeft: '3px solid var(--teal)',
        borderRadius: 6,
      }}
    >
      <div
        className="label"
        style={{ color: 'var(--teal)', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <Lock className="w-3 h-3" />
        Granted by your background
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {skills.map((s) => (
          <span key={s} className="chip" style={{ fontSize: 11 }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SkillRow — prototype's checkbox + name + ability, plus modifier display
// and expertise star toggle. Source-tinted borders per status.
// ============================================================================
function SkillRow({
  skill, ability, status, modifier, hasExpertise,
  disabled, expertiseAllowed, onToggle, onExpertiseToggle,
}) {
  const palette = {
    bg:     { bg: 'rgba(55, 242, 209, 0.12)',  border: 'var(--teal)',   check: 'var(--teal)',   checkText: 'var(--ink)' },
    pick:   { bg: 'rgba(255, 83, 0, 0.12)',    border: 'var(--orange)', check: 'var(--orange)', checkText: 'white' },
    racial: { bg: 'rgba(212, 169, 81, 0.10)',  border: 'var(--gold)',   check: 'var(--gold)',   checkText: 'var(--ink)' },
    avail:  { bg: 'rgba(20, 12, 8, 0.5)',      border: 'var(--border)', check: 'transparent',   checkText: 'transparent' },
    locked: { bg: 'rgba(20, 12, 8, 0.3)',      border: 'var(--border)', check: 'transparent',   checkText: 'transparent' },
  };
  const p = palette[status] || palette.avail;
  const isProficient = status === 'bg' || status === 'pick' || status === 'racial';
  const locked = status === 'locked';

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onToggle}
      disabled={disabled && !isProficient}
      style={{
        all: 'unset',
        cursor: disabled && !isProficient ? 'not-allowed' : 'pointer',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: p.bg,
        border: `1.5px solid ${p.border}`,
        borderRadius: 8,
        opacity: locked ? 0.4 : 1,
        transition: 'all .12s',
      }}
      title={ability ? `Roll with ${ability.toUpperCase()}` : skill}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          flexShrink: 0,
          background: isProficient ? p.check : 'rgba(20, 12, 8, 0.6)',
          border: `1.5px solid ${p.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: p.checkText,
        }}
      >
        {isProficient && <Check className="w-3 h-3" strokeWidth={3} />}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text)',
            lineHeight: 1.2,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {skill}
          {hasExpertise && (
            <span className="chip chip-gold" style={{ fontSize: 9, padding: '1px 5px' }}>
              EXPERT
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginTop: 2,
          }}
        >
          {ability?.toUpperCase()}
        </div>
      </div>

      <div
        className="display"
        style={{
          fontSize: 18,
          color: hasExpertise
            ? 'var(--gold)'
            : isProficient
              ? 'var(--teal)'
              : 'var(--text-dim)',
          minWidth: 32,
          textAlign: 'right',
        }}
      >
        {modifier >= 0 ? '+' : ''}{modifier}
      </div>

      {expertiseAllowed && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onExpertiseToggle(); }}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 22,
            height: 22,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: hasExpertise ? 'var(--gold)' : 'rgba(20, 12, 8, 0.6)',
            color: hasExpertise ? 'var(--ink)' : 'var(--text-faint)',
            border: `1px solid ${hasExpertise ? 'var(--gold)' : 'var(--border)'}`,
          }}
          title={hasExpertise ? 'Remove expertise' : 'Add expertise'}
        >
          <Star className="w-3 h-3" />
        </button>
      )}
    </button>
  );
}
