import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, Star, Lock } from "lucide-react";
import { getBackgroundSkills } from "@/components/dnd5e/backgroundData";
import { getRaceSkillProficiencies } from "@/components/dnd5e/raceData";
import {
  abilityModifier,
  ALL_SKILLS,
  SKILL_ABILITIES,
  CLASS_SKILL_CHOICES,
  getMulticlassSkillGrant,
} from "@/components/dnd5e/dnd5eRules";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";

// ============================================================================
// Step 5: Skills — exact port of step-skills.jsx. StatusCard tally on top,
// "All 18 skills" panel below with 3-col SkillRow grid. Source-tinted borders:
// teal = background-granted, orange = class-picked, gold = race-fixed, purple
// = multiclass-granted, faint = available, dimmest = locked.
// ============================================================================

const ALL_SKILLS_LIST = ALL_SKILLS;
const SKILL_ABILITY_MAP = SKILL_ABILITIES;

// Per-class skill list + count. Bard's 'any' expands to the full catalog
// so downstream `availableClassSkills.includes(skill)` works.
const CLASS_SKILL_OPTIONS = Object.fromEntries(
  Object.entries(CLASS_SKILL_CHOICES).map(([cls, v]) => [
    cls,
    v.from === 'any' ? ALL_SKILLS : (v.from || []),
  ]),
);
const CLASS_SKILL_COUNTS = Object.fromEntries(
  Object.entries(CLASS_SKILL_CHOICES).map(([cls, v]) => [cls, v.count || 2]),
);
const CLASS_EXPERTISE_COUNT = { Rogue: 2, Bard: 2 };

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
  const classSkillCount = CLASS_SKILL_COUNTS[characterData.class] || 2;
  const expertiseCount = CLASS_EXPERTISE_COUNT[characterData.class] || 0;

  // Auto-apply background-granted skills (they're free, not class picks).
  useEffect(() => {
    if (backgroundSkills.length > 0) {
      const updated = { ...selectedSkills };
      backgroundSkills.forEach((skill) => { updated[skill] = true; });
      setSelectedSkills(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterData.background]);

  // Sync race-fixed skills when race/subrace changes.
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

  // Mirror selections + expertise + multiclass picks into characterData.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSkills, expertise, multiclassSkills]);

  const multiclassOwnedSkills = useMemo(() => {
    const s = new Set();
    for (const arr of Object.values(multiclassSkills || {})) {
      if (Array.isArray(arr)) arr.forEach((skill) => s.add(skill));
    }
    return s;
  }, [multiclassSkills]);

  const multiclassGrants = useMemo(() => {
    const entries = Array.isArray(characterData.multiclasses)
      ? characterData.multiclasses
      : [];
    return entries
      .filter((mc) => mc?.class)
      .map((mc) => ({ class: mc.class, grant: getMulticlassSkillGrant(mc.class) }))
      .filter(({ grant }) => grant);
  }, [characterData.multiclasses]);

  // Prune multiclass entries that no longer have a live class.
  useEffect(() => {
    const liveClasses = new Set(multiclassGrants.map((g) => g.class));
    const stale = Object.keys(multiclassSkills || {}).filter((cls) => !liveClasses.has(cls));
    if (stale.length === 0) return;
    setMulticlassSkills((current) => {
      const next = { ...current };
      const orphaned = [];
      for (const cls of stale) {
        if (Array.isArray(next[cls])) orphaned.push(...next[cls]);
        delete next[cls];
      }
      if (orphaned.length > 0) {
        const surviving = new Set();
        for (const cls of Object.keys(next)) {
          if (Array.isArray(next[cls])) next[cls].forEach((s) => surviving.add(s));
        }
        setSelectedSkills((sel) => {
          const updated = { ...sel };
          for (const s of orphaned) {
            if (
              backgroundSkills.includes(s)
              || fixedRacialSkills.includes(s)
              || surviving.has(s)
            ) continue;
            delete updated[s];
          }
          return updated;
        });
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiclassGrants, backgroundSkills, fixedRacialSkills]);

  const availableClassSkills = CLASS_SKILL_OPTIONS[characterData.class] || [];

  const selectedFromClassList = Object.entries(selectedSkills)
    .filter(([skill, on]) =>
      on
      && !backgroundSkills.includes(skill)
      && !fixedRacialSkills.includes(skill)
      && !multiclassOwnedSkills.has(skill)
      && availableClassSkills.includes(skill))
    .length;

  const selectedFromRacialBonus = Object.entries(selectedSkills)
    .filter(([skill, on]) =>
      on
      && !backgroundSkills.includes(skill)
      && !fixedRacialSkills.includes(skill)
      && !multiclassOwnedSkills.has(skill)
      && !availableClassSkills.includes(skill))
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

  const proficiencyBonus = Math.floor(((characterData.level || 1) - 1) / 4) + 2;
  const getSkillModifier = (skill) => {
    const abilityKey = SKILL_ABILITY_MAP[skill];
    const abilityScore = characterData.attributes?.[abilityKey] || 10;
    const baseMod = abilityModifier(abilityScore);
    const isProficient = !!selectedSkills[skill];
    const hasExpertise = expertise.includes(skill);
    if (hasExpertise) return baseMod + (proficiencyBonus * 2);
    if (isProficient) return baseMod + proficiencyBonus;
    return baseMod;
  };

  const totalProficient = Object.values(selectedSkills).filter(Boolean).length;
  const allChosen = totalSelectedNonBackground >= totalNeeded;

  if (!characterData.class) {
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

      <Primer title="Two sources of skill proficiency">
        Your <strong>background</strong> gives you {backgroundSkills.length || 0} free
        skill{backgroundSkills.length === 1 ? '' : 's'}. Your <strong>class</strong> lets
        you pick {classSkillCount} more from its list. You can't pick the same skill
        twice — if your background already gave you a skill that's on your class list,
        just pick a different one.
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
        {racialBonusSkills > 0 && (
          <StatusCard
            label="Racial bonus"
            value={`${selectedFromRacialBonus} / ${racialBonusSkills}`}
            color={selectedFromRacialBonus === racialBonusSkills ? 'teal' : 'orange'}
            icon="✨"
            sub={racialFromList ? `from ${racialFromList.join(', ')}` : 'any skill'}
          />
        )}
        <StatusCard
          label="Background skills"
          value={String(backgroundSkills.length || 0)}
          color="teal"
          icon="🎒"
          sub={backgroundSkills.join(', ') || 'No background picked'}
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

      {fixedRacialSkills.length > 0 && (
        <RaceFixedBanner race={characterData.race} subrace={characterData.subrace} skills={fixedRacialSkills} />
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
              ✓ Racial / Multiclass
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
          {ALL_SKILLS_LIST.map((skill) => {
            const isProficient = !!selectedSkills[skill];
            const hasExpertise = expertise.includes(skill);
            const isBackgroundSkill = backgroundSkills.includes(skill);
            const isClassSkill = availableClassSkills.includes(skill);
            const isFixedRacial = fixedRacialSkills.includes(skill);
            const isMulticlass = multiclassOwnedSkills.has(skill);
            const racialPickAllowed = !racialFromList || racialFromList.includes(skill);

            let canSelect = false;
            if (!isProficient && !isFixedRacial && !isMulticlass) {
              if (isClassSkill && selectedFromClassList < classSkillCount) canSelect = true;
              else if (!isClassSkill && selectedFromRacialBonus < racialBonusSkills && racialPickAllowed) canSelect = true;
            }

            const status = isFixedRacial
              ? 'racial'
              : isMulticlass
                ? 'multiclass'
                : isBackgroundSkill
                  ? 'bg'
                  : isProficient
                    ? 'pick'
                    : isClassSkill
                      ? 'avail'
                      : 'locked';

            const modifier = getSkillModifier(skill);

            return (
              <SkillRow
                key={skill}
                skill={skill}
                ability={SKILL_ABILITY_MAP[skill]}
                status={status}
                modifier={modifier}
                hasExpertise={hasExpertise}
                disabled={
                  isFixedRacial
                  || isBackgroundSkill
                  || isMulticlass
                  || (!isProficient && !canSelect)
                }
                expertiseAllowed={
                  expertiseCount > 0
                  && isProficient
                  && !isFixedRacial
                  && !isMulticlass
                  && !isBackgroundSkill
                }
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
              style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 12, textAlign: 'center' }}
            >
              Greyed-out skills aren't on your {characterData.class} list. They appear here so you
              can see your full skill modifier (without proficiency).
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
              multiclassOwned={multiclassOwnedSkills}
              setMulticlassSkills={setMulticlassSkills}
              setSelectedSkills={setSelectedSkills}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// StatusCard — top-of-step tally tile (Class picks / Background / etc.)
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
// RaceFixedBanner — gold-accented banner naming the race-granted skills
// ============================================================================
function RaceFixedBanner({ race, subrace, skills }) {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: '14px 18px',
        background: 'rgba(212, 169, 81, 0.08)',
        border: '1px solid rgba(212, 169, 81, 0.32)',
        borderLeft: '3px solid var(--gold)',
        borderRadius: 6,
      }}
    >
      <div
        className="label"
        style={{ color: 'var(--gold)', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <Lock className="w-3 h-3" />
        Granted by {subrace || race}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {skills.map((s) => (
          <span key={s} className="chip chip-gold" style={{ fontSize: 11 }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SkillRow — prototype's exact layout (checkbox square + name + ability
// abbreviation), plus the brief's modifier display and expertise star
// toggle. Source-tinted border per status: teal (bg), orange (pick),
// gold (racial), purple (multiclass), faint (avail), dimmest (locked).
// ============================================================================
function SkillRow({
  skill, ability, status, modifier, hasExpertise,
  disabled, expertiseAllowed, onToggle, onExpertiseToggle,
}) {
  const palette = {
    bg:         { bg: 'rgba(55, 242, 209, 0.12)',  border: 'var(--teal)',   check: 'var(--teal)',   checkText: 'var(--ink)' },
    pick:       { bg: 'rgba(255, 83, 0, 0.12)',    border: 'var(--orange)', check: 'var(--orange)', checkText: 'white' },
    racial:     { bg: 'rgba(212, 169, 81, 0.10)',  border: 'var(--gold)',   check: 'var(--gold)',   checkText: 'var(--ink)' },
    multiclass: { bg: 'rgba(201, 163, 255, 0.10)', border: 'var(--purple)', check: 'var(--purple)', checkText: 'white' },
    avail:      { bg: 'rgba(20, 12, 8, 0.5)',      border: 'var(--border)', check: 'transparent',   checkText: 'transparent' },
    locked:     { bg: 'rgba(20, 12, 8, 0.3)',      border: 'var(--border)', check: 'transparent',   checkText: 'transparent' },
  };
  const p = palette[status] || palette.avail;
  const isProficient = status === 'bg' || status === 'pick' || status === 'racial' || status === 'multiclass';
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

// ============================================================================
// MulticlassSkillPicker — separate panel for each multiclass entry that
// grants additional skills (e.g. Bard 1 grants 3 skills on multiclass).
// Purple accent matches the multiclass color tone in SkillRow.
// ============================================================================
function MulticlassSkillPicker({
  className, grant,
  myPicks, backgroundSkills, fixedRacialSkills, multiclassOwned,
  setMulticlassSkills, setSelectedSkills,
}) {
  const remaining = (grant?.count || 0) - myPicks.length;
  const skillPool = grant?.from === 'any'
    ? ALL_SKILLS_LIST
    : (Array.isArray(grant?.from) ? grant.from : []);

  const togglePick = (skill) => {
    const has = myPicks.includes(skill);
    if (has) {
      const next = myPicks.filter((s) => s !== skill);
      setMulticlassSkills((cur) => ({ ...(cur || {}), [className]: next }));
      // Drop from selectedSkills unless another source still owns it
      setSelectedSkills((cur) => {
        const updated = { ...cur };
        if (
          !backgroundSkills.includes(skill)
          && !fixedRacialSkills.includes(skill)
        ) delete updated[skill];
        return updated;
      });
    } else if (remaining > 0
      && !backgroundSkills.includes(skill)
      && !fixedRacialSkills.includes(skill)
      && !multiclassOwned.has(skill)) {
      const next = [...myPicks, skill];
      setMulticlassSkills((cur) => ({ ...(cur || {}), [className]: next }));
      setSelectedSkills((cur) => ({ ...cur, [skill]: true }));
    }
  };

  return (
    <div
      style={{
        padding: '14px 18px',
        background: 'rgba(201, 163, 255, 0.06)',
        border: '1px solid rgba(201, 163, 255, 0.32)',
        borderLeft: '3px solid var(--purple)',
        borderRadius: 6,
      }}
    >
      <div
        className="label"
        style={{ color: 'var(--purple)', marginBottom: 4 }}
      >
        Multiclass · {className}
      </div>
      <div
        className="italic-serif"
        style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}
      >
        Choose {grant.count} skill{grant.count === 1 ? '' : 's'}
        {grant.from !== 'any' ? ` from ${className}'s multiclass list` : ' from any skill'} ·{' '}
        <strong style={{ color: 'var(--text)' }}>{myPicks.length}/{grant.count}</strong> chosen
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {skillPool.map((skill) => {
          const picked = myPicks.includes(skill);
          const blocked = !picked && (
            backgroundSkills.includes(skill)
            || fixedRacialSkills.includes(skill)
            || multiclassOwned.has(skill)
          );
          const disabled = !picked && (remaining <= 0 || blocked);
          return (
            <button
              key={skill}
              type="button"
              onClick={() => !disabled && togglePick(skill)}
              disabled={disabled}
              className={`pickable ${picked ? 'selected-gold' : ''}`}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: 'inherit',
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {skill}
            </button>
          );
        })}
      </div>
    </div>
  );
}
