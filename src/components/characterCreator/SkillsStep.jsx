import React, { useState, useRef, useEffect } from "react";
import { Check, Star, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { getBackgroundSkills } from "@/components/dnd5e/backgroundData";
import { getRaceSkillProficiencies } from "@/components/dnd5e/raceData";
import {
  abilityModifier,
  ALL_SKILLS,
  SKILL_ABILITIES,
  CLASS_SKILL_CHOICES,
  getMulticlassSkillGrant,
} from '@/components/dnd5e/dnd5eRules';
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";

// Derived from the registry so every component reads from one source.
const allSkills = ALL_SKILLS;

// CLASS_SKILL_CHOICES shape: { Barbarian: { count: 2, from: [...] }, ... }.
// Bard's `from` is the literal string 'any' — expand to the full skill
// catalog so downstream `availableClassSkills.includes(skill)` works.
const classSkillOptions = Object.fromEntries(
  Object.entries(CLASS_SKILL_CHOICES).map(([cls, v]) => [
    cls,
    v.from === 'any' ? ALL_SKILLS : (v.from || []),
  ])
);
const classSkillCounts = Object.fromEntries(
  Object.entries(CLASS_SKILL_CHOICES).map(([cls, v]) => [cls, v.count || 2])
);

const classExpertiseCount = { Rogue: 2, Bard: 2 };

const skillAbilityMap = SKILL_ABILITIES;

export default function SkillsStep({ characterData, updateCharacterData }) {
  const [selectedSkills, setSelectedSkills] = useState(characterData.skills || {});
  const [expertise, setExpertise] = useState(characterData.expertise || []);
  const [multiclassSkills, setMulticlassSkills] = useState(
    characterData.multiclassSkills || {},
  );

  const backgroundSkills = getBackgroundSkills(characterData.background);
  const raceRule = getRaceSkillProficiencies(characterData.race, characterData.subrace);
  const fixedRacialSkills = raceRule.fixed || [];
  const racialBonusSkills = raceRule.choose || 0;
  const racialFromList = raceRule.from === "any" || !Array.isArray(raceRule.from)
    ? null
    : raceRule.from;
  const classSkillCount = classSkillCounts[characterData.class] || 2;
  const expertiseCount = classExpertiseCount[characterData.class] || 0;

  useEffect(() => {
    if (backgroundSkills.length > 0) {
      const updatedSkills = { ...selectedSkills };
      backgroundSkills.forEach((skill) => {
        updatedSkills[skill] = true;
      });
      setSelectedSkills(updatedSkills);
    }
  }, [characterData.background]);

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
        if (backgroundSkills.includes(s)) return;
        delete updated[s];
      });
      add.forEach((s) => { updated[s] = true; });
      return updated;
    });
    prevFixedRef.current = next;
  }, [characterData.race, characterData.subrace, backgroundSkills, fixedRacialSkills]);

  useEffect(() => {
    const proficiencies = Object.entries(selectedSkills)
      .filter(([, on]) => on)
      .map(([skill]) => skill);
    updateCharacterData({
      skills: selectedSkills,
      expertise,
      multiclassSkills,
      skill_proficiencies: proficiencies,
    });
  }, [selectedSkills, expertise, multiclassSkills]);

  const multiclassOwnedSkills = React.useMemo(() => {
    const s = new Set();
    for (const arr of Object.values(multiclassSkills || {})) {
      if (Array.isArray(arr)) arr.forEach((skill) => s.add(skill));
    }
    return s;
  }, [multiclassSkills]);

  const multiclassGrants = React.useMemo(() => {
    const entries = Array.isArray(characterData.multiclasses)
      ? characterData.multiclasses
      : [];
    return entries
      .filter((mc) => mc?.class)
      .map((mc) => ({ class: mc.class, grant: getMulticlassSkillGrant(mc.class) }))
      .filter(({ grant }) => grant);
  }, [characterData.multiclasses]);

  useEffect(() => {
    const liveClasses = new Set(multiclassGrants.map((g) => g.class));
    const stale = Object.keys(multiclassSkills || {}).filter((cls) => !liveClasses.has(cls));
    if (stale.length === 0) return;
    setMulticlassSkills((current) => {
      const next = { ...current };
      const orphanedSkills = [];
      for (const cls of stale) {
        if (Array.isArray(next[cls])) orphanedSkills.push(...next[cls]);
        delete next[cls];
      }
      if (orphanedSkills.length > 0) {
        const survivingMulticlass = new Set();
        for (const cls of Object.keys(next)) {
          if (Array.isArray(next[cls])) next[cls].forEach((s) => survivingMulticlass.add(s));
        }
        setSelectedSkills((sel) => {
          const updated = { ...sel };
          for (const s of orphanedSkills) {
            if (
              backgroundSkills.includes(s)
              || fixedRacialSkills.includes(s)
              || survivingMulticlass.has(s)
            ) continue;
            delete updated[s];
          }
          return updated;
        });
      }
      return next;
    });
  }, [multiclassGrants, backgroundSkills, fixedRacialSkills]);

  const availableClassSkills = classSkillOptions[characterData.class] || [];

  const selectedFromClassList = Object.entries(selectedSkills)
    .filter(([skill, selected]) =>
      selected
      && !backgroundSkills.includes(skill)
      && !fixedRacialSkills.includes(skill)
      && !multiclassOwnedSkills.has(skill)
      && availableClassSkills.includes(skill),
    )
    .length;

  const selectedFromRacialBonus = Object.entries(selectedSkills)
    .filter(([skill, selected]) =>
      selected
      && !backgroundSkills.includes(skill)
      && !fixedRacialSkills.includes(skill)
      && !multiclassOwnedSkills.has(skill)
      && !availableClassSkills.includes(skill),
    )
    .length;

  const totalSelectedNonBackground = selectedFromClassList + selectedFromRacialBonus;
  const totalNeeded = classSkillCount + racialBonusSkills;

  const handleSkillToggle = (skill) => {
    if (backgroundSkills.includes(skill)) return;
    if (fixedRacialSkills.includes(skill)) return;
    if (multiclassOwnedSkills.has(skill)) return;

    const isCurrentlySelected = selectedSkills[skill];
    const isClassSkill = availableClassSkills.includes(skill);

    if (isCurrentlySelected) {
      const updated = { ...selectedSkills };
      delete updated[skill];
      setSelectedSkills(updated);
      if (expertise.includes(skill)) {
        setExpertise(expertise.filter((s) => s !== skill));
      }
      return;
    }

    if (!isClassSkill && racialFromList && !racialFromList.includes(skill)) return;
    if (totalSelectedNonBackground < totalNeeded) {
      setSelectedSkills({ ...selectedSkills, [skill]: true });
    }
  };

  const handleExpertiseToggle = (skill) => {
    if (!selectedSkills[skill]) return;
    if (expertise.includes(skill)) {
      setExpertise(expertise.filter((s) => s !== skill));
    } else if (expertise.length < expertiseCount) {
      setExpertise([...expertise, skill]);
    }
  };

  const proficiencyBonus = Math.floor((characterData.level - 1) / 4) + 2;

  const getSkillModifier = (skill) => {
    const abilityKey = skillAbilityMap[skill];
    const abilityScore = characterData.attributes?.[abilityKey] || 10;
    const baseMod = abilityModifier(abilityScore);
    const isProficient = selectedSkills[skill];
    const hasExpertise = expertise.includes(skill);
    if (hasExpertise) return baseMod + (proficiencyBonus * 2);
    if (isProficient) return baseMod + proficiencyBonus;
    return baseMod;
  };

  const totalProficient = Object.values(selectedSkills).filter(Boolean).length;

  if (!characterData.class) {
    return (
      <div>
        <StepHeader
          kicker="Chapter V · The Talents"
          title="Pick your skills"
        />
        <div
          className="tome"
          style={{ padding: 40, textAlign: 'center', marginTop: 24 }}
        >
          <div
            className="italic-serif"
            style={{ fontSize: 16, color: 'var(--text-dim)' }}
          >
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

      <Primer title="Two sources of skill proficiency">
        Your <strong>background</strong> gives you {backgroundSkills.length || 0} free skill
        {backgroundSkills.length === 1 ? '' : 's'}. Your <strong>class</strong> lets you pick {classSkillCount}
        {' '}more from its list. You can't pick the same skill twice — if your background already
        gave you a skill that's on your class list, just pick a different one.
      </Primer>

      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 12,
          marginTop: 18,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <StatusCard
          label="Class picks"
          value={`${selectedFromClassList} / ${classSkillCount}`}
          tone={selectedFromClassList === classSkillCount ? 'teal' : 'orange'}
          icon="🎯"
          tip={tipFor("skill_class")}
        />
        {racialBonusSkills > 0 && (
          <StatusCard
            label="Racial bonus"
            value={`${selectedFromRacialBonus} / ${racialBonusSkills}`}
            tone={selectedFromRacialBonus === racialBonusSkills ? 'teal' : 'orange'}
            icon="✨"
            sub={racialFromList ? `from ${racialFromList.join(', ')}` : 'any skill'}
          />
        )}
        <StatusCard
          label="Background skills"
          value={String(backgroundSkills.length || 0)}
          tone="teal"
          icon="🎒"
          sub={backgroundSkills.join(', ') || 'No background picked'}
        />
        {expertiseCount > 0 && (
          <StatusCard
            label="Expertise"
            value={`${expertise.length} / ${expertiseCount}`}
            tone={expertise.length === expertiseCount ? 'gold' : 'orange'}
            icon="⭐"
            tip={tipFor("skill_expertise")}
          />
        )}
        <StatusCard
          label="Total proficient"
          value={String(totalProficient)}
          tone="teal"
          icon="✓"
        />
      </div>

      {fixedRacialSkills.length > 0 && (
        <SkillSourceBanner
          icon={<Lock className="w-4 h-4" />}
          label={`Granted by ${characterData.subrace || characterData.race}`}
          skills={fixedRacialSkills}
          tone="gold"
        />
      )}

      <div className="panel" style={{ padding: 20, marginTop: 16 }}>
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
          <h3
            className="display"
            style={{ fontSize: 22, color: 'var(--text)', margin: 0 }}
          >
            All 18 skills
          </h3>
          <div style={{ display: 'flex', gap: 6, fontSize: 11, alignItems: 'center' }}>
            <span className="chip" style={{ fontSize: 10, padding: '2px 6px' }}>
              ✓ Background
            </span>
            <span className="chip chip-orange" style={{ fontSize: 10, padding: '2px 6px' }}>
              ✓ Class pick
            </span>
            <span className="chip chip-gold" style={{ fontSize: 10, padding: '2px 6px' }}>
              ✓ Racial / Multiclass
            </span>
            <span className="chip chip-neutral" style={{ fontSize: 10, padding: '2px 6px' }}>
              Locked
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {allSkills.map((skill) => {
            const isProficient = !!selectedSkills[skill];
            const hasExpertise = expertise.includes(skill);
            const isBackgroundSkill = backgroundSkills.includes(skill);
            const isClassSkill = availableClassSkills.includes(skill);
            const isFixedRacialSkill = fixedRacialSkills.includes(skill);
            const isMulticlassSkill = multiclassOwnedSkills.has(skill);
            const racialPickAllowed = !racialFromList || racialFromList.includes(skill);

            let canSelect = false;
            if (!isProficient && !isFixedRacialSkill && !isMulticlassSkill) {
              if (isClassSkill && selectedFromClassList < classSkillCount) {
                canSelect = true;
              } else if (!isClassSkill && selectedFromRacialBonus < racialBonusSkills && racialPickAllowed) {
                canSelect = true;
              }
            }

            const modifier = getSkillModifier(skill);
            const status = isFixedRacialSkill
              ? 'racial'
              : isMulticlassSkill
                ? 'multiclass'
                : isBackgroundSkill
                  ? 'bg'
                  : isProficient
                    ? 'pick'
                    : isClassSkill
                      ? 'avail'
                      : 'locked';

            return (
              <SkillRow
                key={skill}
                skill={skill}
                ability={skillAbilityMap[skill]}
                modifier={modifier}
                status={status}
                hasExpertise={hasExpertise}
                disabled={
                  isFixedRacialSkill
                  || isBackgroundSkill
                  || isMulticlassSkill
                  || (!isProficient && !canSelect)
                }
                expertiseAllowed={expertiseCount > 0 && isProficient && !isFixedRacialSkill && !isMulticlassSkill && !isBackgroundSkill}
                onToggle={() => handleSkillToggle(skill)}
                onExpertiseToggle={() => handleExpertiseToggle(skill)}
              />
            );
          })}
        </div>

        {availableClassSkills.length > 0
          && availableClassSkills.length < ALL_SKILLS.length
          && (
            <div
              className="italic-serif"
              style={{
                fontSize: 12,
                color: 'var(--text-faint)',
                marginTop: 12,
                textAlign: 'center',
              }}
            >
              Greyed-out skills aren't on your {characterData.class} list. They appear here only to
              show your full skill modifier (without proficiency).
            </div>
          )}
      </div>

      {multiclassGrants.length > 0 && (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {multiclassGrants.map(({ class: mcClass, grant }) => (
            <MulticlassSkillPicker
              key={mcClass}
              className={mcClass}
              grant={grant}
              myPicks={multiclassSkills[mcClass] || []}
              backgroundSkills={backgroundSkills}
              fixedRacialSkills={fixedRacialSkills}
              selectedSkills={selectedSkills}
              multiclassSkills={multiclassSkills}
              setMulticlassSkills={setMulticlassSkills}
              setSelectedSkills={setSelectedSkills}
              skillAbilityMap={skillAbilityMap}
            />
          ))}
        </div>
      )}

      {expertiseCount > 0 && (
        <div
          style={{
            marginTop: 18,
            background: 'rgba(212, 169, 81, 0.10)',
            border: '1px solid rgba(212, 169, 81, 0.32)',
            borderLeft: '3px solid var(--gold)',
            borderRadius: 8,
            padding: '14px 18px',
          }}
        >
          <div
            className="label"
            style={{
              color: 'var(--gold)',
              marginBottom: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Star className="w-4 h-4" /> Expertise
          </div>
          <p
            className="italic-serif"
            style={{
              fontSize: 13,
              color: 'var(--text-dim)',
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            Choose {expertiseCount} skill{expertiseCount > 1 ? 's' : ''} above to gain expertise in.
            Expertise doubles your proficiency bonus on those rolls — click the gold star next to a
            proficient skill to apply it.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Status card — top-of-page count summary
// ============================================================================
function StatusCard({ label, value, tone, icon, sub, tip }) {
  const palettes = {
    teal:   { bg: 'rgba(55, 242, 209, 0.08)', border: 'rgba(55, 242, 209, 0.32)', label: 'var(--teal)' },
    orange: { bg: 'rgba(255, 83, 0, 0.10)',   border: 'rgba(255, 83, 0, 0.40)',   label: 'var(--orange-soft)' },
    gold:   { bg: 'rgba(212, 169, 81, 0.10)', border: 'rgba(212, 169, 81, 0.40)', label: 'var(--gold)' },
  };
  const p = palettes[tone] || palettes.teal;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 140,
        padding: 14,
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: 10,
      }}
    >
      <div
        className="label"
        style={{
          color: p.label,
          marginBottom: 6,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {label} {tip && <InfoTip>{tip}</InfoTip>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span
          className="display"
          style={{ fontSize: 22, color: 'var(--text)' }}
        >
          {value}
        </span>
      </div>
      {sub && (
        <div
          className="italic-serif"
          style={{
            fontSize: 11,
            color: 'var(--text-dim)',
            marginTop: 6,
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Skill source banner — fixed racial banner above the grid
// ============================================================================
function SkillSourceBanner({ icon, label, skills, tone }) {
  const palettes = {
    teal: { bg: 'rgba(55, 242, 209, 0.06)', border: 'var(--teal)' },
    gold: { bg: 'rgba(212, 169, 81, 0.10)', border: 'var(--gold)' },
  };
  const p = palettes[tone] || palettes.teal;
  return (
    <div
      style={{
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderLeft: `3px solid ${p.border}`,
        borderRadius: 8,
        padding: '12px 16px',
        marginTop: 10,
      }}
    >
      <div
        className="label"
        style={{
          color: p.border,
          marginBottom: 8,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {icon} {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {skills.map((s) => (
          <span key={s} className="chip chip-gold">{s}</span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Skill row — single 3-col grid cell
// ============================================================================
function SkillRow({
  skill, ability, modifier, status, hasExpertise,
  disabled, expertiseAllowed, onToggle, onExpertiseToggle,
}) {
  const palette = {
    bg:         { bg: 'rgba(55, 242, 209, 0.12)',  border: 'var(--teal)' },
    pick:       { bg: 'rgba(255, 83, 0, 0.12)',    border: 'var(--orange)' },
    racial:     { bg: 'rgba(212, 169, 81, 0.10)',  border: 'var(--gold)' },
    multiclass: { bg: 'rgba(158, 91, 255, 0.10)',  border: '#9E5BFF' },
    avail:      { bg: 'rgba(20, 12, 8, 0.45)',     border: 'var(--border)' },
    locked:     { bg: 'rgba(20, 12, 8, 0.30)',     border: 'var(--border-faint)' },
  };
  const p = palette[status] || palette.avail;
  const isProficient = status === 'bg' || status === 'pick' || status === 'racial' || status === 'multiclass';
  const checkmarkBg =
    status === 'bg' ? 'var(--teal)'
    : status === 'pick' ? 'var(--orange)'
    : status === 'racial' ? 'var(--gold)'
    : status === 'multiclass' ? '#9E5BFF'
    : 'transparent';

  return (
    <motion.button
      type="button"
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      style={{
        all: 'unset',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: p.bg,
        border: `1.5px solid ${p.border}`,
        borderRadius: 8,
        opacity: status === 'locked' ? 0.4 : 1,
        transition: 'all .15s',
      }}
      title={ability ? `Roll with ${ability.toUpperCase()}` : skill}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          flexShrink: 0,
          background: isProficient ? checkmarkBg : 'rgba(20, 12, 8, 0.6)',
          border: `1.5px solid ${p.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: status === 'bg' || status === 'racial' ? '#050816' : 'white',
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
            <span
              className="chip chip-gold"
              style={{ fontSize: 9, padding: '1px 5px' }}
            >
              EXPERT
            </span>
          )}
        </div>
        <div
          className="label"
          style={{
            fontSize: 9,
            color: 'var(--text-faint)',
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
          onClick={(e) => {
            e.stopPropagation();
            onExpertiseToggle();
          }}
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
            color: hasExpertise ? '#050816' : 'var(--text-faint)',
            border: `1px solid ${hasExpertise ? 'var(--gold)' : 'var(--border)'}`,
          }}
          title={hasExpertise ? 'Remove expertise' : 'Add expertise'}
        >
          <Star className="w-3 h-3" />
        </button>
      )}
    </motion.button>
  );
}

// ============================================================================
// Multiclass skill picker (preserved logic, restyled)
// ============================================================================
function MulticlassSkillPicker({
  className,
  grant,
  myPicks,
  backgroundSkills,
  fixedRacialSkills,
  selectedSkills,
  multiclassSkills,
  setMulticlassSkills,
  setSelectedSkills,
  skillAbilityMap,
}) {
  const grantList = grant.from === "any"
    ? ALL_SKILLS
    : Array.isArray(grant.from)
    ? grant.from
    : [];

  const ownedByOtherMulticlass = React.useMemo(() => {
    const s = new Set();
    for (const [cls, picks] of Object.entries(multiclassSkills || {})) {
      if (cls === className || !Array.isArray(picks)) continue;
      picks.forEach((skill) => s.add(skill));
    }
    return s;
  }, [multiclassSkills, className]);

  const disabledReason = (skill) => {
    if (myPicks.includes(skill)) return null;
    if (backgroundSkills.includes(skill)) return "Already proficient from background";
    if (fixedRacialSkills.includes(skill)) return "Already proficient from race";
    if (ownedByOtherMulticlass.has(skill)) return "Already picked from another multiclass entry";
    if (selectedSkills[skill]) return "Already proficient from primary class";
    return null;
  };

  const availableForPick = grantList.filter(
    (s) => disabledReason(s) === null || myPicks.includes(s),
  );

  const togglePick = (skill) => {
    const isMine = myPicks.includes(skill);
    if (!isMine) {
      if (disabledReason(skill)) return;
      if (myPicks.length >= grant.count) return;
    }
    const nextPicks = isMine
      ? myPicks.filter((s) => s !== skill)
      : [...myPicks, skill];
    setMulticlassSkills((current) => ({ ...current, [className]: nextPicks }));
    setSelectedSkills((current) => {
      const updated = { ...current };
      if (isMine) {
        const stillClaimed =
          backgroundSkills.includes(skill)
          || fixedRacialSkills.includes(skill)
          || ownedByOtherMulticlass.has(skill);
        if (!stillClaimed) delete updated[skill];
      } else {
        updated[skill] = true;
      }
      return updated;
    });
  };

  const noOptionsLeft = availableForPick.length === 0;
  const wantedCount = Math.min(grant.count, availableForPick.length);

  return (
    <div
      style={{
        background: 'rgba(158, 91, 255, 0.08)',
        border: '1px solid rgba(158, 91, 255, 0.40)',
        borderLeft: '3px solid #9E5BFF',
        borderRadius: 10,
        padding: '14px 18px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 900,
            color: 'white',
            background: '#9E5BFF',
            borderRadius: 4,
            padding: '2px 8px',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          Multiclass · {className}
        </span>
        <h3
          className="display"
          style={{ fontSize: 14, color: '#C9A3FF', margin: 0 }}
        >
          Pick {grant.count} skill{grant.count > 1 ? "s" : ""}
          {grant.from === "any" ? " (any skill)" : ` from the ${className} list`}
        </h3>
        <span
          className="label"
          style={{
            marginLeft: 'auto',
            color: myPicks.length === wantedCount ? 'var(--teal)' : 'var(--orange-soft)',
          }}
        >
          {myPicks.length}/{wantedCount}
        </span>
      </div>

      {noOptionsLeft ? (
        <p
          className="italic-serif"
          style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}
        >
          All skills on the {className} list are already granted from other sources — the
          multiclass skill is wasted, but doesn't block your character.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {grantList.map((skill) => {
            const isMine = myPicks.includes(skill);
            const reason = disabledReason(skill);
            const blocked = reason !== null && !isMine;
            return (
              <button
                key={skill}
                type="button"
                onClick={() => togglePick(skill)}
                disabled={blocked}
                title={blocked ? reason : `${skill} (${skillAbilityMap[skill]?.toUpperCase()})`}
                style={{
                  all: 'unset',
                  cursor: blocked ? 'not-allowed' : 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: isMine ? '#9E5BFF' : 'rgba(20, 12, 8, 0.55)',
                  color: isMine ? 'white' : blocked ? 'var(--text-faint)' : 'var(--text)',
                  border: `1px solid ${isMine ? '#9E5BFF' : 'var(--border)'}`,
                  opacity: blocked ? 0.4 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {skill}
                <span
                  style={{
                    fontSize: 9,
                    opacity: 0.7,
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                  }}
                >
                  {skillAbilityMap[skill]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
