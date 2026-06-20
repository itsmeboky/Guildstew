
import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { getClassFeaturesForLevel } from "@/components/dnd5e/classFeatures";
import { resolveFeatureChoices } from "@/components/characterCreator/featureChoiceResolver";
import { isSubclassFeature, getFeaturesCompletion } from "@/components/characterCreator/featuresCompletion";
import SubclassPicker from "@/components/characterCreator/SubclassPicker";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";
import {
  meetsMulticlassPrereqs,
  multiclassPrereqDescription,
  multiclassProficienciesFor,
  multiPickCount,
  FEATS,
} from "@/components/dnd5e/dnd5eRules";
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  MAX_ABILITY_SCORE,
  asiKey,
  reachedAsiLevels,
  feasibleFeats,
  applyAsiBumps,
  validateSelection,
  fmtMod,
} from "@/components/characterCreator/asiSelections";
import { motion } from "framer-motion";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";
import { CharacterSummary } from "@/components/characterCreator/chrome/CharacterSummary";

const AVAILABLE_CLASSES = [
  "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk",
  "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard",
];

// Class-tinted accent — mirrors ClassStep's CLASS_ACCENT. Used for the
// feature-scroll level emblem + OrnateHeading flourishes so a Wizard's
// features come in blue, a Barbarian's in orange-brown, etc.
const CLASS_ACCENT = {
  Barbarian: "#D89860", Bard: "#FF4DA6", Cleric: "#FFF1D2", Druid: "#52D880",
  Fighter: "#FF5040",  Monk: "#3FE0E8",  Paladin: "#FFD550", Ranger: "#D45A50",
  Rogue: "#D8D5E0",    Sorcerer: "#FF9050", Warlock: "#B580FF", Wizard: "#5AA0FF",
};
const ACCENT_FALLBACK = "var(--gold)";

export default function ClassFeaturesStep({ characterData, updateCharacterData }) {
  const [multiclasses, setMulticlasses] = useState(characterData.multiclasses || []);
  const [featureChoices, setFeatureChoices] = useState(characterData.feature_choices || {});
  const [asiSelections, setAsiSelections] = useState(characterData.asiSelections || {});

  const usedClasses = [characterData.class, ...multiclasses.map((mc) => mc.class).filter(Boolean)];
  const totalLevel = Number(characterData.level) || 1;
  const primaryClassLevel = totalLevel - multiclasses.reduce((sum, mc) => sum + (mc.level || 0), 0);
  const baseAttributes = characterData.baseAttributes || characterData.attributes || {};

  React.useEffect(() => {
    updateCharacterData({
      asiSelections,
      attributes: applyAsiBumps(baseAttributes, asiSelections),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asiSelections]);

  const primaryAsiLevels = reachedAsiLevels(characterData.class, primaryClassLevel);

  React.useEffect(() => {
    const validKeys = new Set(primaryAsiLevels.map((lvl) => asiKey(characterData.class, lvl)));
    const stale = Object.keys(asiSelections || {}).filter((k) => {
      const [keyClass] = k.split("-");
      return keyClass === characterData.class && !validKeys.has(k);
    });
    if (stale.length === 0) return;
    setAsiSelections((current) => {
      const next = { ...current };
      for (const k of stale) delete next[k];
      return next;
    });
  }, [characterData.class, primaryAsiLevels.length]);

  const handleAsiChange = (level, nextSelection) => {
    const key = asiKey(characterData.class, level);
    setAsiSelections((current) => {
      const next = { ...current };
      if (!nextSelection || !nextSelection.kind) delete next[key];
      else next[key] = nextSelection;
      return next;
    });
  };

  const attributes = characterData.attributes || {};
  const primaryPrereqMet = meetsMulticlassPrereqs(characterData.class, attributes);
  const primaryPrereqDesc = multiclassPrereqDescription(characterData.class);
  const canMulticlass = totalLevel >= 2 && primaryClassLevel >= 1 && primaryPrereqMet;

  // Subclass is now SELECTED on the Class step (gated by level). The
  // Features step still DELIVERS subclass features (Frenzy@3, etc. — those
  // are separate per-level entries), but the subclass-selection prompt
  // itself is filtered out here so subclass isn't chosen in two places.
  const primaryFeatures = resolveFeatureChoices(
    getClassFeaturesForLevel(characterData.class, primaryClassLevel) || [],
    characterData,
    primaryClassLevel,
  ).filter((f) => !isSubclassFeature(f));
  const multiclassFeatures = multiclasses.flatMap((mc) => {
    if (!mc.class || !mc.level) return [];
    const features = resolveFeatureChoices(
      getClassFeaturesForLevel(mc.class, mc.level) || [],
      characterData,
      mc.level,
    );
    return features.map((f) => ({ ...f, multiclass: mc.class }));
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
    if (totalLevel - totalMulticlassLevels < 1) {
      newMulticlasses[index].level = Math.max(
        1,
        totalLevel - totalMulticlassLevels + (multiclasses[index].level || 1) - 1,
      );
    }
    setMulticlasses(newMulticlasses);
    updateCharacterData({ multiclasses: newMulticlasses });
  };

  const handleFeatureChoice = (featureKey, choice) => {
    const newChoices = { ...featureChoices, [featureKey]: choice };
    setFeatureChoices(newChoices);
    updateCharacterData({ feature_choices: newChoices });
  };

  // Shared with CharacterCreator's Features gate — banner and gate agree.
  const featuresComplete = getFeaturesCompletion(characterData).isComplete;

  if (!characterData.class) {
    return (
      <div>
        <StepHeader
          kicker="Chapter IV · The Gifts"
          title="Class features"
          subtitle="Special abilities your training has earned."
        />
        <div
          className="tome"
          style={{ padding: 40, textAlign: 'center', marginTop: 24 }}
        >
          <div
            className="italic-serif"
            style={{ fontSize: 16, color: 'var(--text-dim)' }}
          >
            Pick a class on the previous chapter to reveal your features.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        kicker="Chapter IV · The Gifts"
        title="Class features"
        subtitle="Special abilities your training has earned. Some are automatic — some need your choice."
      />

      <Primer title="What this chapter is for">
        Most class features are <strong>automatic</strong> — they appear on your sheet without
        input. A handful (like a Fighter's combat style or your subclass at level 3) need a
        decision. We've called those out below in <strong>orange</strong>. Everything else is
        here so you know what your hero can already do.
      </Primer>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.55fr 1fr',
          gap: 28,
          marginTop: 24,
          alignItems: 'flex-start',
        }}
      >
        {/* LEFT — features tome */}
        <div className="tome" style={{ padding: '32px 36px' }}>
          {primaryAsiLevels.length > 0 && (
            <>
              <FleurDivider />
              <OrnateHeading>Ability Score Improvements</OrnateHeading>
              <div
                className="italic-serif"
                style={{
                  fontSize: 13,
                  color: 'var(--text-dim)',
                  marginBottom: 14,
                  textAlign: 'center',
                }}
              >
                {primaryAsiLevels.length} earned at {characterData.class} level
                {primaryAsiLevels.length > 1 ? 's' : ''} {primaryAsiLevels.join(', ')}.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {primaryAsiLevels.map((lvl) => {
                  const key = asiKey(characterData.class, lvl);
                  return (
                    <AsiCard
                      key={key}
                      className={characterData.class}
                      level={lvl}
                      selection={asiSelections[key]}
                      baseAttributes={baseAttributes}
                      asiSelections={asiSelections}
                      ownKey={key}
                      onChange={(next) => handleAsiChange(lvl, next)}
                    />
                  );
                })}
              </div>
            </>
          )}

          <FleurDivider />

          <OrnateHeading color={CLASS_ACCENT[characterData.class] || ACCENT_FALLBACK}>
            {characterData.class} · Level {primaryClassLevel}
          </OrnateHeading>

          <FeatureScroll
            features={primaryFeatures}
            characterClass={characterData.class}
            classLevel={primaryClassLevel}
            color={CLASS_ACCENT[characterData.class] || ACCENT_FALLBACK}
          />

          {primaryFeatures.filter((f) => f.choiceRequired).map((feature) => {
            const featureKey = `${characterData.class}-${feature.level}-${feature.name}`;
            const isSubcls = isSubclassFeature(feature);
            // Subclass-equivalent picks (Warlock patron, Sorcerer origin,
            // Cleric domain, Paladin oath, Druid circle, etc.) live on
            // characterData.subclass — written by ClassStep's
            // SubclassChapter. The RequiredChoice here mirrors that field
            // so the orange-bordered "select" panel clears the moment a
            // subclass is set on the previous step.
            const currentChoice = isSubcls
              ? (characterData.subclass || null)
              : featureChoices[featureKey];
            return (
              <React.Fragment key={featureKey}>
                <FleurDivider />
                <RequiredChoice
                  title={feature.name}
                  help={feature.description}
                  required={!currentChoice}
                >
                  {isSubcls ? (
                    <SubclassPicker
                      choices={feature.choices}
                      value={currentChoice || null}
                      onSelect={(value) => updateCharacterData({ subclass: value })}
                      featureName={feature.name}
                      levelGained={feature.level}
                    />
                  ) : (
                    <FeatureChoicePicker
                      feature={feature}
                      classLevel={primaryClassLevel}
                      currentChoice={currentChoice}
                      onChange={(value) => handleFeatureChoice(featureKey, value)}
                    />
                  )}
                </RequiredChoice>
              </React.Fragment>
            );
          })}

          {totalLevel >= 2 && primaryClassLevel >= 1 && !primaryPrereqMet && (
            <MulticlassPrereqWarning
              characterClass={characterData.class}
              prereq={primaryPrereqDesc}
            />
          )}

          {canMulticlass && (
            <>
              <FleurDivider />
              <OrnateHeading>Multiclass Paths</OrnateHeading>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: 14,
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <InfoTip>{tipFor("multiclass_prereqs")}</InfoTip>
                <button
                  type="button"
                  onClick={handleAddMulticlass}
                  disabled={primaryClassLevel <= 1}
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    padding: '8px 14px',
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Class
                </button>
              </div>

              {multiclasses.map((mc, index) => (
                <MulticlassPanel
                  key={index}
                  index={index}
                  mc={mc}
                  attributes={attributes}
                  totalLevel={totalLevel}
                  usedClasses={usedClasses}
                  featureChoices={featureChoices}
                  onChange={handleMulticlassChange}
                  onRemove={handleRemoveMulticlass}
                  onChooseFeature={handleFeatureChoice}
                  characterData={characterData}
                  updateCharacterData={updateCharacterData}
                />
              ))}
            </>
          )}

          {!featuresComplete && (
            <RequiredChoicesBanner />
          )}
        </div>

        {/* RIGHT — character snapshot + upcoming features */}
        <div
          style={{
            position: 'sticky',
            top: 20,
            alignSelf: 'flex-start',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <CharacterSummary data={characterData} />
          <UpcomingFeatures
            characterClass={characterData.class}
            currentLevel={primaryClassLevel}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Feature scroll — left-rail level emblem + feature body
// ============================================================================
function FeatureScroll({ features, color }) {
  const accent = color || ACCENT_FALLBACK;
  if (features.length === 0) {
    return (
      <div
        className="italic-serif"
        style={{ textAlign: 'center', padding: 28, color: 'var(--text-dim)', fontSize: 14 }}
      >
        No features earned at this level yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {features.map((feature, idx) => (
        <div
          key={idx}
          style={{
            display: 'grid',
            gridTemplateColumns: '52px 1fr',
            gap: 16,
            alignItems: 'flex-start',
          }}
        >
          {/* Level emblem — class-tinted hex */}
          <div
            style={{
              width: 52,
              height: 52,
              flexShrink: 0,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              background: `linear-gradient(180deg, ${accent}40, ${accent}10)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${accent}66`,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div className="label" style={{ fontSize: 8, color: accent, marginBottom: 0 }}>
                LVL
              </div>
              <div className="display" style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1 }}>
                {feature.level}
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span className="display" style={{ fontSize: 20, color: 'var(--text)' }}>
                {feature.name}
              </span>
              {feature.uses && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#050816',
                    background: 'var(--teal)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    letterSpacing: 0.3,
                  }}
                >
                  {feature.uses}
                </span>
              )}
              {feature.choiceRequired && (
                <span className="label" style={{ color: 'var(--orange)', fontSize: 10 }}>
                  · CHOICE REQUIRED
                </span>
              )}
            </div>
            <div
              className="italic-serif"
              style={{
                fontSize: 14.5,
                color: 'var(--text-dim)',
                lineHeight: 1.55,
                whiteSpace: 'pre-line',
              }}
            >
              {feature.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// RequiredChoice — prototype's exact orange-flourish ornate heading +
// help line + picker container. Renders below the FeatureScroll for each
// choice-requiring feature (Fighting Style, Favored Enemy, Expertise,
// Divine Domain subclass, etc.). Border + boxShadow create the
// "orange-bordered chip picker" callout the brief mentions.
// ============================================================================
function RequiredChoice({ title, help, required, children }) {
  return (
    <div
      style={{
        padding: '18px 22px',
        marginTop: 18,
        background: 'linear-gradient(135deg, rgba(255, 83, 0, 0.10), rgba(255, 83, 0, 0.02))',
        border: `1px solid ${required ? 'var(--orange)' : 'rgba(255, 83, 0, 0.4)'}`,
        borderRadius: 8,
        boxShadow: required ? '0 0 16px rgba(255, 83, 0, 0.18)' : 'none',
      }}
    >
      <div className="ornate-heading" style={{ marginBottom: 8 }}>
        <span className="ornate-flourish" style={{ background: 'var(--orange)' }} />
        <h3 style={{ fontSize: 22, color: 'var(--orange-soft)' }}>{title}</h3>
        <span className="ornate-flourish" style={{ background: 'var(--orange)' }} />
      </div>
      {help && (
        <div
          className="italic-serif"
          style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            marginBottom: 14,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {help}{' '}
          {required && (
            <span className="label" style={{ color: 'var(--orange)', fontSize: 10 }}>
              · REQUIRED
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// Upcoming features — right-rail panel ("Coming up" preview)
// ============================================================================
function UpcomingFeatures({ characterClass, currentLevel }) {
  // Read the next handful of unmet features from the rules table so
  // the panel always reflects what's actually in the game data, not
  // a hardcoded prototype list.
  const milestones = [];
  for (let lvl = currentLevel + 1; lvl <= 20 && milestones.length < 5; lvl++) {
    const fs = getClassFeaturesForLevel(characterClass, lvl) || [];
    for (const f of fs) {
      if (f.level === lvl) {
        milestones.push({ level: lvl, name: f.name });
        if (milestones.length >= 5) break;
      }
    }
  }

  if (milestones.length === 0) return null;

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="label" style={{ marginBottom: 12, color: 'var(--gold-soft)' }}>
        Coming up
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {milestones.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              fontSize: 13,
              paddingBottom: 6,
              borderBottom: '1px solid var(--border-faint)',
            }}
          >
            <span
              className="italic-serif"
              style={{ color: 'var(--text)' }}
            >
              {m.name}
            </span>
            <span className="chip chip-gold" style={{ fontSize: 10, padding: '1px 6px' }}>
              L{m.level}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Multiclass prereq warning banner
// ============================================================================
function MulticlassPrereqWarning({ characterClass, prereq }) {
  return (
    <div
      style={{
        marginTop: 22,
        background: 'rgba(255, 83, 0, 0.06)',
        border: '1px solid rgba(255, 83, 0, 0.45)',
        borderLeft: '3px solid var(--orange)',
        borderRadius: 6,
        padding: '14px 18px',
      }}
    >
      <div
        className="label"
        style={{
          color: 'var(--orange)',
          marginBottom: 4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        ⚠ Multiclass locked
      </div>
      <p
        className="italic-serif"
        style={{
          fontSize: 14,
          color: 'var(--text-dim)',
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        To multiclass out of <strong style={{ color: 'var(--text)' }}>{characterClass}</strong>,
        your character needs <strong style={{ color: 'var(--orange-soft)' }}>{prereq}</strong>.
        Adjust your ability scores on the previous step to unlock multiclassing.
      </p>
    </div>
  );
}

// ============================================================================
// Multiclass panel — one entry per declared multiclass
// ============================================================================
function MulticlassPanel({
  index, mc, attributes, totalLevel, usedClasses,
  featureChoices, onChange, onRemove, onChooseFeature,
  characterData, updateCharacterData,
}) {
  return (
    <div
      className="panel-strong"
      style={{ padding: 18, marginBottom: 14, position: 'relative' }}
    >
      <div className="tome-corner tr"></div>
      <div className="tome-corner bl"></div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <select
          value={mc.class || ''}
          onChange={(e) => onChange(index, 'class', e.target.value)}
          className="input"
          style={{ flex: 1 }}
        >
          <option value="">Select class…</option>
          {AVAILABLE_CLASSES
            .filter((c) => !usedClasses.includes(c) || c === mc.class)
            .map((cls) => {
              const meets = meetsMulticlassPrereqs(cls, attributes);
              return (
                <option key={cls} value={cls} disabled={!meets}>
                  {cls}{meets ? '' : ` — needs ${multiclassPrereqDescription(cls)}`}
                </option>
              );
            })}
        </select>

        <select
          value={String(mc.level || '')}
          onChange={(e) => onChange(index, 'level', parseInt(e.target.value, 10))}
          className="input"
          style={{ width: 110 }}
        >
          <option value="">Lvl</option>
          {Array.from({ length: Math.min(19, totalLevel - 1) }, (_, i) => i + 1).map((lvl) => (
            <option key={lvl} value={String(lvl)}>Level {lvl}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onRemove(index)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 36,
            height: 36,
            borderRadius: 8,
            border: '1px solid var(--orange)',
            color: 'var(--orange)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Remove this multiclass"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {mc.class && mc.level && <MulticlassProficienciesPanel className={mc.class} />}

      {mc.class && mc.level && (() => {
        const mcFeatures = resolveFeatureChoices(
          getClassFeaturesForLevel(mc.class, mc.level) || [],
          characterData,
          mc.level,
        );
        const mcAccent = CLASS_ACCENT[mc.class] || ACCENT_FALLBACK;
        return (
          <>
            <FeatureScroll features={mcFeatures} color={mcAccent} />

            {mcFeatures.filter((f) => f.choiceRequired).map((feature) => {
              const featureKey = `${mc.class}-${feature.level}-${feature.name}`;
              const isSubcls = isSubclassFeature(feature);
              // Multiclass subclass-equivalent picks also live on
              // characterData.subclass (per-class subclass storage is
              // a separate future concern — for now the dispatcher
              // only tracks the primary subclass).
              const currentChoice = isSubcls
                ? (characterData.subclass || null)
                : featureChoices[featureKey];
              return (
                <RequiredChoice
                  key={featureKey}
                  title={feature.name}
                  help={feature.description}
                  required={!currentChoice}
                >
                  {isSubcls ? (
                    <SubclassPicker
                      choices={feature.choices}
                      value={currentChoice || null}
                      onSelect={(value) => updateCharacterData({ subclass: value })}
                      featureName={feature.name}
                      levelGained={feature.level}
                    />
                  ) : (
                    <FeatureChoicePicker
                      feature={feature}
                      classLevel={mc.level}
                      currentChoice={currentChoice}
                      onChange={(value) => onChooseFeature(featureKey, value)}
                    />
                  )}
                </RequiredChoice>
              );
            })}
          </>
        );
      })()}
    </div>
  );
}

// ============================================================================
// Required choices banner (sticky at the bottom of the tome)
// ============================================================================
function RequiredChoicesBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginTop: 22,
        background: 'rgba(255, 83, 0, 0.10)',
        border: '1px solid var(--orange)',
        borderRadius: 8,
        padding: '14px 18px',
        textAlign: 'center',
      }}
    >
      <p
        className="display"
        style={{
          color: 'var(--orange-soft)',
          fontSize: 16,
          margin: 0,
          letterSpacing: 0.3,
        }}
      >
        ⚠ Resolve all orange-bordered choices above before continuing.
      </p>
    </motion.div>
  );
}

// ============================================================================
// Multiclass proficiencies — preserved verbatim, themed inline.
// ============================================================================
function MulticlassProficienciesPanel({ className }) {
  const profs = multiclassProficienciesFor(className);
  const hasArmor = Array.isArray(profs.armor) && profs.armor.length > 0;
  const hasWeapons = Array.isArray(profs.weapons) && profs.weapons.length > 0;
  const skillCount = Number(profs.skills) || 0;
  const hasOther = Array.isArray(profs.other) && profs.other.length > 0;
  const hasNotes = !!profs.notes;
  const grantsAnything = hasArmor || hasWeapons || skillCount > 0 || hasOther;

  if (!grantsAnything && !hasNotes) {
    return (
      <div
        style={{
          marginBottom: 14,
          background: 'rgba(20, 12, 8, 0.4)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 12,
          fontSize: 13,
          color: 'var(--text-faint)',
        }}
      >
        Multiclassing into <span style={{ fontWeight: 700, color: 'var(--text)' }}>{className}</span>{' '}
        grants no additional proficiencies (you keep what you already have).
      </div>
    );
  }

  return (
    <div
      style={{
        marginBottom: 14,
        background: 'rgba(20, 12, 8, 0.4)',
        border: '1px solid rgba(55, 242, 209, 0.32)',
        borderLeft: '3px solid var(--teal)',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div className="label" style={{ color: 'var(--teal)', marginBottom: 8 }}>
        Multiclass Proficiencies Gained
      </div>
      <ul style={{ fontSize: 13, color: 'var(--text)', margin: 0, padding: 0, listStyle: 'none' }}>
        {hasArmor && (
          <li style={{ padding: '2px 0' }}>
            <span style={{ color: 'var(--text-faint)' }}>Armor:</span>{' '}
            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{profs.armor.join(', ')}</span>
          </li>
        )}
        {hasWeapons && (
          <li style={{ padding: '2px 0' }}>
            <span style={{ color: 'var(--text-faint)' }}>Weapons:</span>{' '}
            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{profs.weapons.join(', ')}</span>
          </li>
        )}
        {skillCount > 0 && (
          <li style={{ padding: '2px 0' }}>
            <span style={{ color: 'var(--text-faint)' }}>Skills:</span>{' '}
            <span style={{ fontWeight: 600 }}>
              {skillCount} from the {className} skill list
            </span>
          </li>
        )}
        {hasOther && profs.other.map((item, i) => (
          <li key={i} style={{ padding: '2px 0' }}>
            <span style={{ color: 'var(--text-faint)' }}>Also:</span>{' '}
            <span style={{ fontWeight: 600 }}>{item}</span>
          </li>
        ))}
      </ul>
      {hasNotes && (
        <p
          className="italic-serif"
          style={{ marginTop: 8, fontSize: 11, color: 'var(--text-faint)' }}
        >
          {profs.notes}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// ASI Card — preserved logic, themed inline.
// ============================================================================
function AsiCard({ className, level, selection, baseAttributes, asiSelections, ownKey, onChange }) {
  const kind = selection?.kind || "";

  const otherSelections = React.useMemo(() => {
    const out = { ...(asiSelections || {}) };
    delete out[ownKey];
    return out;
  }, [asiSelections, ownKey]);
  const runningAttributes = applyAsiBumps(baseAttributes, otherSelections);

  const setKind = (nextKind) => {
    if (nextKind === kind) return;
    onChange({ kind: nextKind });
  };

  const setAbility1 = (val) => onChange({ ...selection, kind, ability1: val });
  const setAbility2 = (val) => onChange({ ...selection, kind, ability2: val });
  const setFeat = (val) => onChange({ ...selection, kind: "feat", feat: val });

  const validation = validateSelection(selection);
  const featList = feasibleFeats(runningAttributes);

  return (
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        border: `1px solid ${validation ? 'rgba(212, 169, 81, 0.45)' : 'rgba(55, 242, 209, 0.45)'}`,
        background: validation
          ? 'linear-gradient(135deg, rgba(212, 169, 81, 0.10), rgba(212, 169, 81, 0.02))'
          : 'linear-gradient(135deg, rgba(55, 242, 209, 0.10), rgba(55, 242, 209, 0.02))',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: '#050816',
              background: 'var(--gold)',
              borderRadius: 4,
              padding: '2px 8px',
              letterSpacing: 0.5,
            }}
          >
            {className} L{level}
          </span>
          <span
            className="display"
            style={{ fontSize: 16, color: 'var(--text)' }}
          >
            Ability Score Improvement
          </span>
        </div>
        {validation && (
          <span
            className="italic-serif"
            style={{ fontSize: 11, color: 'var(--gold-soft)' }}
          >
            {validation}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {[
          { id: "plus2", label: "+2 to one" },
          { id: "split", label: "+1 to two" },
          { id: "feat",  label: "Feat" },
        ].map(({ id, label }) => {
          const active = kind === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                padding: '6px 14px',
                borderRadius: 999,
                background: active ? 'var(--gold)' : 'rgba(20, 12, 8, 0.55)',
                color: active ? '#050816' : 'var(--text-dim)',
                border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                transition: 'all .15s',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {kind === "plus2" && (
        <AbilitySelect
          label="Pick one ability"
          value={selection?.ability1 || ""}
          onChange={setAbility1}
          attributes={runningAttributes}
          bump={2}
          excludeAbility={null}
        />
      )}

      {kind === "split" && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <AbilitySelect
            label="Ability 1 (+1)"
            value={selection?.ability1 || ""}
            onChange={setAbility1}
            attributes={runningAttributes}
            bump={1}
            excludeAbility={selection?.ability2 || null}
          />
          <AbilitySelect
            label="Ability 2 (+1)"
            value={selection?.ability2 || ""}
            onChange={setAbility2}
            attributes={runningAttributes}
            bump={1}
            excludeAbility={selection?.ability1 || null}
          />
        </div>
      )}

      {kind === "feat" && (
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Pick a feat</div>
          <select
            value={selection?.feat || ""}
            onChange={(e) => setFeat(e.target.value)}
            className="input"
          >
            <option value="">Choose a feat</option>
            {featList.map((feat) => (
              <option key={feat} value={feat}>{feat}</option>
            ))}
          </select>
          {selection?.feat && FEATS[selection.feat]?.description && (
            <p
              className="italic-serif"
              style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5 }}
            >
              {FEATS[selection.feat].description}
            </p>
          )}
          <p
            style={{
              fontSize: 10,
              color: 'var(--text-faint)',
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            Spellcasting / proficiency-prereq feats are listed and assumed to be eligible for
            the player's build — verify with your DM.
          </p>
        </div>
      )}
    </div>
  );
}

function AbilitySelect({ label, value, onChange, attributes, bump, excludeAbility }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      >
        <option value="">Choose an ability</option>
        {ABILITY_KEYS.map((k) => {
          const current = attributes?.[k] || 10;
          const next = Math.min(MAX_ABILITY_SCORE, current + bump);
          const wasted = next === current;
          const isExcluded = excludeAbility === k;
          return (
            <option key={k} value={k} disabled={wasted || isExcluded}>
              {ABILITY_LABELS[k]}: {current} → {next} ({fmtMod(next)})
              {wasted ? " — at cap" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}

// ============================================================================
// FeatureChoicePicker — preserved logic, themed inline.
// ============================================================================
function FeatureChoicePicker({ feature, classLevel, currentChoice, onChange }) {
  const pickCount = multiPickCount(feature.name, classLevel);
  const selected = Array.isArray(currentChoice)
    ? currentChoice
    : currentChoice
    ? [currentChoice]
    : [];

  if (pickCount <= 1) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: '12px 14px',
          background: 'rgba(20, 12, 8, 0.5)',
          border: '1px solid var(--orange)',
          borderRadius: 8,
        }}
      >
        <div
          className="label"
          style={{ color: 'var(--orange)', marginBottom: 8 }}
        >
          Pick one option
        </div>
        <select
          value={selected[0] || ""}
          onChange={(e) => onChange(e.target.value)}
          className="input"
        >
          <option value="">Select option…</option>
          {feature.choices.map((choice, cIdx) => {
            const choiceName = typeof choice === "string" ? choice : choice.name;
            return (
              <option key={cIdx} value={choiceName}>{choiceName}</option>
            );
          })}
        </select>
        {selected[0] && (() => {
          const found = feature.choices.find(
            (c) => (typeof c === "string" ? c : c.name) === selected[0],
          );
          const desc = found && typeof found === "object" ? found.description : null;
          if (!desc) return null;
          return (
            <p
              className="italic-serif"
              style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5 }}
            >
              {desc}
            </p>
          );
        })()}
      </div>
    );
  }

  const togglePick = (choiceName) => {
    const isSelected = selected.includes(choiceName);
    let next;
    if (isSelected) next = selected.filter((s) => s !== choiceName);
    else {
      if (selected.length >= pickCount) return;
      next = [...selected, choiceName];
    }
    onChange(next);
  };

  const complete = selected.length === pickCount;

  return (
    <div
      style={{
        marginTop: 12,
        padding: '12px 14px',
        background: complete ? 'rgba(55, 242, 209, 0.10)' : 'rgba(20, 12, 8, 0.5)',
        border: `1px solid ${complete ? 'var(--teal)' : 'var(--orange)'}`,
        borderRadius: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        <div
          className="label"
          style={{ color: complete ? 'var(--teal)' : 'var(--orange)' }}
        >
          {complete
            ? `Picked ${pickCount}/${pickCount}`
            : `Pick ${pickCount} option${pickCount > 1 ? "s" : ""}`}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          {selected.length}/{pickCount} selected
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {feature.choices.map((choice, cIdx) => {
          const choiceName = typeof choice === "string" ? choice : choice.name;
          const choiceDesc = typeof choice === "object" ? choice.description : "";
          const isSelected = selected.includes(choiceName);
          const blocked = !isSelected && selected.length >= pickCount;
          return (
            <button
              key={cIdx}
              type="button"
              onClick={() => togglePick(choiceName)}
              disabled={blocked}
              title={choiceDesc || undefined}
              style={{
                all: 'unset',
                cursor: blocked ? 'not-allowed' : 'pointer',
                fontSize: 11,
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: 999,
                background: isSelected ? 'var(--gold)' : 'rgba(20, 12, 8, 0.55)',
                color: isSelected ? '#050816' : blocked ? 'var(--text-faint)' : 'var(--text)',
                border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                opacity: blocked ? 0.4 : 1,
              }}
            >
              {choiceName}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <ul style={{ marginTop: 12, padding: 0, listStyle: 'none' }}>
          {selected.map((choiceName) => {
            const choice = feature.choices.find(
              (c) => (typeof c === "string" ? c : c.name) === choiceName,
            );
            const desc = choice && typeof choice === "object" ? choice.description : null;
            if (!desc) return null;
            return (
              <li
                key={choiceName}
                className="italic-serif"
                style={{
                  fontSize: 12,
                  color: 'var(--text-dim)',
                  marginBottom: 6,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{choiceName}:</span>{' '}
                {desc}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
