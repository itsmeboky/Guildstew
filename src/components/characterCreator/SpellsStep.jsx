import React, { useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";
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
  getMaxSpellLevelForCharacter,
} from "@/components/dnd5e/spellData";
import { getBreweryClassSpellSlots } from "@/lib/breweryClassApply";
import {
  SPELLS_KNOWN_TABLE,
  spellsKnown,
  spellsPrepared,
  cantripsKnown,
  abilityModifier,
  SPELLCASTING_ABILITY,
} from "@/components/dnd5e/dnd5eRules";
import { motion } from "framer-motion";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";

// Per-spell-level palette: cantrips ride the gold/parchment vein
// (free magic), leveled spells ride orange (slot-cost).
function levelPalette(levelKey) {
  if (levelKey === 'cantrips') {
    return {
      accent: 'var(--cc-gold)',
      glow: 'rgba(212, 169, 81, 0.35)',
      counter: 'cc-chip-gold',
      label: 'Cantrips',
    };
  }
  return {
    accent: 'var(--cc-orange)',
    glow: 'rgba(255, 83, 0, 0.35)',
    counter: 'cc-chip-orange',
    label: levelKey === 'level1'
      ? '1st Level Spells'
      : `${levelKey.replace('level', '')}${ordinalSuffix(parseInt(levelKey.replace('level', ''), 10))} Level Spells`,
  };
}

function ordinalSuffix(n) {
  return ['st', 'nd', 'rd'][n - 1] || 'th';
}

export default function SpellsStep({ characterData, updateCharacterData }) {
  const [hoveredEffect, setHoveredEffect] = useState(null);
  const [showRecommendation, setShowRecommendation] = useState(false);

  const { data: fullSpellsList, isLoading } = useQuery({
    queryKey: ['dnd5e-spells'],
    queryFn: () => fetchAllSpells().then((data) => data.spells),
    staleTime: 1000 * 60 * 60,
  });

  const breweryClass = characterData._brewery_class || null;
  const spellSlots = breweryClass?.spellcasting?.enabled
    ? getBreweryClassSpellSlots(breweryClass, characterData.level)
    : getSpellSlots(characterData.class, characterData.level, characterData.multiclasses || []);
  const availableSpells = getAllAvailableSpells(
    characterData.class,
    characterData.multiclasses || [],
    fullSpellsList,
  );

  const selectedSpells = characterData.spells || {};

  const pactSlots = getPactSlots(
    characterData.class,
    characterData.level,
    characterData.multiclasses || [],
  );

  const maxSpellLevel = getMaxSpellLevelForCharacter(
    characterData.class,
    characterData.level,
    characterData.multiclasses || [],
  );

  // Per-spell-level SLOT count for display ("X casts/day"). Pact Magic
  // slots merge into the matching spell-level row for display only —
  // they used to drive the pick cap too, which conflated non-fungible
  // pools for multiclass Warlock + full-caster builds. The pick cap
  // is now driven by `prepKnownCap` / `cantripCap` below (PHB 2014
  // model: prepared/known is a single TOTAL count distributable
  // across eligible spell levels, while slots are casts/day).
  const getSlotsForLevelKey = (levelKey) => {
    let slots = spellSlots[levelKey] || 0;
    if (pactSlots && levelKey.startsWith("level")) {
      const numericLevel = parseInt(levelKey.replace("level", ""), 10);
      if (numericLevel === pactSlots.slotLevel) slots += pactSlots.slots;
    }
    return slots;
  };

  const getSpellDetail = (spellName) => {
    const hardcoded = hardcodedSpellDetails[spellName];
    const apiSpell = fullSpellsList?.find((s) => s.name === spellName);
    if (apiSpell) {
      return {
        ...apiSpell,
        description: apiSpell.description || hardcoded?.description,
        effects: hardcoded?.effects || [],
        castingTime: apiSpell.castingTime || apiSpell.casting_time,
      };
    }
    return hardcoded || {
      level: "?", school: "Unknown", castingTime: "-", range: "-",
      components: "-", duration: "-",
      description: "No description available.", effects: [],
    };
  };

  const getSpellcastingClass = () => {
    const spellcastingClasses = ["Bard", "Cleric", "Druid", "Sorcerer", "Wizard", "Warlock"];
    const halfCasters = ["Paladin", "Ranger"];
    if (spellcastingClasses.includes(characterData.class)) {
      return { class: characterData.class, level: characterData.level };
    }
    if (halfCasters.includes(characterData.class) && characterData.level >= 2) {
      return { class: characterData.class, level: characterData.level };
    }
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
      <div>
        <StepHeader
          kicker="Chapter VI · The Arcane"
          title="Your spellbook"
        />
        <div
          className="cc-tome"
          style={{
            padding: 50,
            textAlign: 'center',
            marginTop: 24,
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.7 }}>⚔️</div>
          <div
            className="cc-display"
            style={{ fontSize: 26, color: 'var(--cc-text)', marginBottom: 8 }}
          >
            No spells for {characterData.class || 'this class'}
          </div>
          <div
            className="cc-italic-serif"
            style={{ fontSize: 15, color: 'var(--cc-text-dim)' }}
          >
            {characterData.class || 'Your class'} doesn't wield arcane power at this level. Step
            forward to equipment.
          </div>
        </div>
      </div>
    );
  }

  const useRecommended = () => {
    let recommended = null;
    let recommendedClass = null;
    if (recommendedSpells[characterData.class]) {
      recommended = recommendedSpells[characterData.class];
      recommendedClass = characterData.class;
    } else {
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
      Object.keys(spellSlots).forEach((levelKey) => {
        if (spellSlots[levelKey] > 0 && recommended[levelKey]) {
          newSpells[levelKey] = recommended[levelKey].slice(0, spellSlots[levelKey]);
        }
        const taken = recommended[levelKey].slice(0, remaining);
        newSpells[levelKey] = taken;
        if (levelKey === "cantrips") cantripBudget -= taken.length;
        else prepBudget -= taken.length;
      });
      updateCharacterData({ spells: newSpells });
      setShowRecommendation(recommendedClass);
    }
  };

  const headerClassName = spellcastingClass?.class || characterData.class;
  const headerLevel = spellcastingClass?.level || characterData.level;

  return (
    <div>
      <StepHeader
        kicker="Chapter VI · The Arcane"
        title="Your spellbook"
        subtitle={
          characterData.class === 'Warlock'
            ? "Your patron gifts you magic — fewer slots, but they return on a short rest."
            : "Cantrips cast at will. Leveled spells cost a slot each."
        }
      />

      <Primer title={`How ${headerClassName} spellcasting works`}>
        <strong>Cantrips</strong> are free magic — cast as often as you want.{' '}
        <strong>Leveled spells</strong> cost a spell slot. As a level {headerLevel}{' '}
        <strong>{headerClassName}</strong>, you can prepare or learn the selections below.
      </Primer>

      {/* Counters strip */}
      <div
        style={{
          marginTop: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {Object.keys(spellSlots).map((levelKey) => {
            const slots = getSlotsForLevelKey(levelKey);
            if (slots <= 0) return null;
            const palette = levelPalette(levelKey);
            const currentCount = (selectedSpells[levelKey] || []).length;
            return (
              <CounterChip
                key={levelKey}
                label={palette.label}
                current={currentCount}
                max={slots}
                accent={palette.accent}
                tip={
                  levelKey === 'cantrips'
                    ? tipFor("spell_cantrip")
                    : tipFor("spell_slots")
                }
              />
            );
          })}
        </div>
        <button
          type="button"
          onClick={useRecommended}
          className="cc-btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'linear-gradient(180deg, var(--cc-gold), color-mix(in srgb, var(--cc-gold), black 18%))',
            border: '1px solid color-mix(in srgb, var(--cc-gold), black 30%)',
            color: '#050816',
          }}
        >
          <Sparkles className="w-4 h-4" />
          Use recommended
        </button>
      </div>

      <PerClassSpellsKnownPanel characterData={characterData} />

      {pactSlots && (
        <PactMagicBanner pactSlots={pactSlots} />
      )}

      {showRecommendation && recommendedSpells[showRecommendation] && (
        <div
          style={{
            background: 'rgba(55, 242, 209, 0.06)',
            border: '1px solid rgba(55, 242, 209, 0.45)',
            borderLeft: '3px solid var(--cc-teal)',
            borderRadius: 8,
            padding: '14px 18px',
            marginTop: 16,
          }}
        >
          <div className="cc-label" style={{ color: 'var(--cc-teal)', marginBottom: 4 }}>
            Recommended for {showRecommendation}
          </div>
          <p
            className="cc-italic-serif"
            style={{
              fontSize: 14,
              color: 'var(--cc-text-dim)',
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            {recommendedSpells[showRecommendation].reasoning}
          </p>
        </div>
      )}

      {/* Spellbook tome */}
      <div className="cc-tome" style={{ padding: '32px 36px', marginTop: 22 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2
              className="w-8 h-8 mx-auto animate-spin mb-3"
              style={{ color: 'var(--cc-teal)' }}
            />
            <p
              className="cc-italic-serif"
              style={{ fontSize: 14, color: 'var(--cc-text-dim)' }}
            >
              Loading spell library…
            </p>
          </div>
        ) : (
          <SpellChapters
            spellSlots={spellSlots}
            availableSpells={availableSpells}
            selectedSpells={selectedSpells}
            getSlotsForLevelKey={getSlotsForLevelKey}
            getSpellDetail={getSpellDetail}
            maxSpellLevel={maxSpellLevel}
            characterData={characterData}
            updateCharacterData={updateCharacterData}
            hoveredEffect={hoveredEffect}
            setHoveredEffect={setHoveredEffect}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Spell chapters — one OrnateHeading per spell level + grid of spell cards
// ============================================================================
function SpellChapters({
  spellSlots, availableSpells, selectedSpells, getSlotsForLevelKey,
  getSpellDetail, maxSpellLevel, characterData, updateCharacterData,
  hoveredEffect, setHoveredEffect,
}) {
  const renderableLevels = Object.keys(spellSlots).filter((levelKey) => {
    const slots = getSlotsForLevelKey(levelKey);
    if (slots <= 0) return false;
    if (levelKey !== "cantrips") {
      const numericLevel = parseInt(levelKey.replace("level", ""), 10);
      if (numericLevel > maxSpellLevel) return false;
    }
    return true;
  });

  if (renderableLevels.length === 0) {
    return (
      <div
        className="cc-italic-serif"
        style={{
          fontSize: 14,
          color: 'var(--cc-text-dim)',
          textAlign: 'center',
          padding: 24,
        }}
      >
        No spell levels available yet.
      </div>
    );
  }

  return (
    <>
      {renderableLevels.map((levelKey, idx) => {
        const palette = levelPalette(levelKey);
        const slots = getSlotsForLevelKey(levelKey);
        const spellsForLevel = availableSpells[levelKey] || [];
        const currentSelected = selectedSpells[levelKey] || [];

        return (
          <React.Fragment key={levelKey}>
            {idx > 0 && <FleurDivider />}
            <OrnateHeading color={palette.accent}>{palette.label}</OrnateHeading>
            <div
              className="cc-italic-serif"
              style={{
                textAlign: 'center',
                color: 'var(--cc-text-dim)',
                fontSize: 14,
                marginBottom: 18,
              }}
            >
              {currentSelected.length}/{slots} picked ·{' '}
              {levelKey === 'cantrips'
                ? 'cast unlimited times'
                : 'each cast spends one slot'}
            </div>

            {spellsForLevel.length === 0 ? (
              <p
                className="cc-italic-serif"
                style={{
                  fontSize: 13,
                  color: 'var(--cc-text-faint)',
                  textAlign: 'center',
                  padding: 16,
                }}
              >
                No spells available for this level.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 10,
                }}
              >
                {spellsForLevel.map((spell) => {
                  const details = getSpellDetail(spell);
                  const isSelected = currentSelected.includes(spell);
                  const isDisabled = !isSelected && currentSelected.length >= slots;

                  const handleToggle = () => {
                    if (isDisabled) return;
                    const newSpells = isSelected
                      ? currentSelected.filter((s) => s !== spell)
                      : [...currentSelected, spell];
                    updateCharacterData({
                      spells: { ...characterData.spells, [levelKey]: newSpells },
                    });
                  };

                  return (
                    <SpellCard
                      key={spell}
                      name={spell}
                      details={details}
                      isSelected={isSelected}
                      isDisabled={isDisabled}
                      accent={palette.accent}
                      onToggle={handleToggle}
                      hoveredEffect={hoveredEffect}
                      setHoveredEffect={setHoveredEffect}
                    />
                  );
                })}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

// ============================================================================
// Spell card — diamond checkbox + name + school/range + description + effects
// ============================================================================
function SpellCard({
  name, details, isSelected, isDisabled, accent, onToggle,
  hoveredEffect, setHoveredEffect,
}) {
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          disabled={isDisabled}
          style={{
            all: 'unset',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            padding: 14,
            borderRadius: 8,
            background: isSelected
              ? `linear-gradient(180deg, color-mix(in srgb, ${accent}, transparent 82%), transparent 70%)`
              : 'rgba(20, 12, 8, 0.45)',
            border: `1.5px solid ${isSelected ? accent : 'var(--cc-border)'}`,
            opacity: isDisabled ? 0.4 : 1,
            transition: 'all .15s',
            boxShadow: isSelected ? `0 0 14px color-mix(in srgb, ${accent}, transparent 70%)` : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 22,
                height: 22,
                flexShrink: 0,
                marginTop: 2,
                background: isSelected ? accent : 'transparent',
                border: `1.5px solid ${isSelected ? accent : 'var(--cc-border-strong)'}`,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSelected && (
                <Check
                  className="w-3 h-3"
                  strokeWidth={3}
                  style={{ color: '#050816' }}
                />
              )}
            </div>

            {spellIcons[name] && (
              <img
                src={spellIcons[name]}
                alt=""
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 6,
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: `1px solid color-mix(in srgb, ${accent}, transparent 60%)`,
                }}
              />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  marginBottom: 4,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  className="cc-display"
                  style={{ fontSize: 17, color: 'var(--cc-text)' }}
                >
                  {name}
                </span>
                {(details.concentration || /concentration/i.test(details.duration || '')) && (
                  <span className="cc-chip cc-chip-purple" style={{ fontSize: 9, padding: '1px 5px' }}>
                    CONC
                  </span>
                )}
              </div>
              <div
                className="cc-italic-serif"
                style={{
                  fontSize: 12,
                  color: 'var(--cc-gold-soft)',
                  marginBottom: 6,
                }}
              >
                {[details.school, details.castingTime, details.range].filter(Boolean).join(' · ')}
              </div>
              <div
                className="cc-italic-serif"
                style={{
                  fontSize: 13,
                  color: 'var(--cc-text-dim)',
                  lineHeight: 1.45,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {details.description}
              </div>

              {details.effects && details.effects.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                  }}
                >
                  {details.effects.map((effect, eIdx) => (
                    <div
                      key={eIdx}
                      style={{ position: 'relative' }}
                      onMouseEnter={() => setHoveredEffect(effect)}
                      onMouseLeave={() => setHoveredEffect(null)}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: 'white',
                          background: 'var(--cc-orange)',
                          borderRadius: 3,
                          padding: '2px 6px',
                          textTransform: 'uppercase',
                          letterSpacing: 0.4,
                          cursor: 'help',
                        }}
                      >
                        {effect}
                      </span>
                      {hoveredEffect === effect && effectDescriptions[effect] && (
                        <div
                          style={{
                            position: 'absolute',
                            zIndex: 10,
                            bottom: '100%',
                            left: 0,
                            marginBottom: 6,
                            background: 'var(--cc-bg-3)',
                            color: 'var(--cc-text)',
                            padding: 12,
                            borderRadius: 6,
                            fontSize: 11,
                            width: 240,
                            border: '1px solid var(--cc-orange)',
                            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
                          }}
                        >
                          <div
                            className="cc-display"
                            style={{ fontSize: 12, color: 'var(--cc-orange-soft)', marginBottom: 4 }}
                          >
                            {effect}
                          </div>
                          <div className="cc-italic-serif">{effectDescriptions[effect]}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-96 max-h-[80vh] overflow-y-auto custom-scrollbar"
        style={{
          background: 'var(--cc-bg-3)',
          border: `1px solid ${accent}`,
          color: 'var(--cc-text)',
          padding: 16,
        }}
      >
        <SpellFullDetail name={name} spell={details} accent={accent} />
      </HoverCardContent>
    </HoverCard>
  );
}

// ============================================================================
// Counter chip — top-of-step "X / Y picked" pill
// ============================================================================
function CounterChip({ label, current, max, accent, tip }) {
  return (
    <div
      style={{
        padding: '10px 16px',
        background: `color-mix(in srgb, ${accent}, transparent 90%)`,
        border: `1px solid color-mix(in srgb, ${accent}, transparent 60%)`,
        borderRadius: 6,
        minWidth: 110,
      }}
    >
      <div
        className="cc-label"
        style={{
          color: accent,
          marginBottom: 2,
          fontSize: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {label}
        {tip && <InfoTip>{tip}</InfoTip>}
      </div>
      <div
        className="cc-display"
        style={{ fontSize: 22, color: 'var(--cc-text)', lineHeight: 1 }}
      >
        {current}
        <span style={{ color: 'var(--cc-text-faint)', fontSize: 17 }}> / {max}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Pact magic banner (Warlock)
// ============================================================================
function PactMagicBanner({ pactSlots }) {
  return (
    <div
      style={{
        marginTop: 16,
        background: 'rgba(158, 91, 255, 0.08)',
        border: '1px solid rgba(158, 91, 255, 0.40)',
        borderLeft: '3px solid #9E5BFF',
        borderRadius: 8,
        padding: '14px 18px',
      }}
    >
      <div className="cc-label" style={{ color: '#C9A3FF', marginBottom: 4 }}>
        Pact Magic · Warlock {pactSlots.totalWarlockLevels}
      </div>
      <p
        className="cc-italic-serif"
        style={{
          fontSize: 14,
          color: 'var(--cc-text)',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {pactSlots.slots} slot{pactSlots.slots > 1 ? 's' : ''} of{' '}
        {pactSlots.slotLevel}{ordinalSuffix(pactSlots.slotLevel)} level. You regain these on a
        short rest. All Pact Magic slots are cast at the level shown.
      </p>
    </div>
  );
}

// ============================================================================
// Spell full-detail popover (preserved logic, restyled around .cc-* tokens)
// ============================================================================
function SpellFullDetail({ name, spell, accent }) {
  if (!spell) return null;
  const levelDisplay =
    spell.level === 0 || spell.level === "Cantrip"
      ? "Cantrip"
      : typeof spell.level === "number"
        ? `Level ${spell.level}`
        : spell.level;
  const higher = spell.higherLevel || spell.higher_level || spell.atHigherLevels;
  const classes = Array.isArray(spell.classes) ? spell.classes : [];
  const meta = [
    levelDisplay && spell.school ? `${levelDisplay} ${spell.school}` : (levelDisplay || spell.school),
    spell.castingTime,
    spell.range,
    spell.components,
    spell.duration,
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h4
          className="cc-display"
          style={{ fontSize: 18, color: accent || 'var(--cc-orange-soft)', margin: 0, lineHeight: 1.2 }}
        >
          {name}
        </h4>
        {meta.length > 0 && (
          <p
            className="cc-italic-serif"
            style={{ fontSize: 11, color: 'var(--cc-text-faint)', marginTop: 4 }}
          >
            {meta.join(" · ")}
          </p>
        )}
      </div>

      {spell.description && (
        <p
          className="cc-italic-serif"
          style={{
            fontSize: 12,
            color: 'var(--cc-text-dim)',
            lineHeight: 1.55,
            whiteSpace: 'pre-line',
            margin: 0,
          }}
        >
          {spell.description}
        </p>
      )}

      {higher && (
        <div
          style={{
            borderLeft: `2px solid ${accent || 'var(--cc-teal)'}`,
            paddingLeft: 10,
          }}
        >
          <div className="cc-label" style={{ color: accent || 'var(--cc-teal)', marginBottom: 4 }}>
            At Higher Levels
          </div>
          <p
            className="cc-italic-serif"
            style={{
              fontSize: 12,
              color: 'var(--cc-text-dim)',
              lineHeight: 1.55,
              whiteSpace: 'pre-line',
              margin: 0,
            }}
          >
            {higher}
          </p>
        </div>
      )}

      {classes.length > 0 && (
        <div>
          <div className="cc-label" style={{ color: 'var(--cc-text-faint)', marginBottom: 4 }}>
            Classes
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {classes.map((c) => (
              <span key={c} className="cc-chip cc-chip-teal" style={{ fontSize: 10 }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PerClassSpellsKnownPanel — preserved logic, restyled around .cc-* tokens
// ============================================================================
function PerClassSpellsKnownPanel({ characterData }) {
  const primary = characterData?.class;
  const multiclasses = Array.isArray(characterData?.multiclasses)
    ? characterData.multiclasses.filter((mc) => mc?.class && mc?.level)
    : [];
  if (multiclasses.length === 0) return null;

  const primaryLevel =
    Math.max(1, Number(characterData?.level) || 1) -
    multiclasses.reduce((s, mc) => s + (Number(mc.level) || 0), 0);

  const allEntries = [
    { className: primary, level: Math.max(1, primaryLevel) },
    ...multiclasses.map((mc) => ({ className: mc.class, level: Number(mc.level) || 0 })),
  ].filter((e) => e.className && e.level > 0 && SPELLS_KNOWN_TABLE[e.className]);

  if (allEntries.length === 0) return null;

  const attributes = characterData?.attributes || {};

  return (
    <div
      style={{
        marginTop: 16,
        background: 'rgba(158, 91, 255, 0.06)',
        border: '1px solid rgba(158, 91, 255, 0.32)',
        borderLeft: '3px solid #9E5BFF',
        borderRadius: 8,
        padding: '14px 18px',
      }}
    >
      <div
        className="cc-label"
        style={{
          color: '#C9A3FF',
          marginBottom: 4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        Multiclass spells reference
        <InfoTip width="w-80">
          Each class tracks its own spells known or prepared count. The picker below shows the
          unified slot pool — these per-class budgets are the RAW limits to keep your selections
          consistent with.
        </InfoTip>
      </div>
      <p
        className="cc-italic-serif"
        style={{
          fontSize: 12,
          color: 'var(--cc-text-faint)',
          margin: '0 0 10px',
        }}
      >
        Per PHB p. 165, multiclass casters track spells separately per class.
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13 }}>
        {allEntries.map(({ className: cls, level }) => {
          const data = SPELLS_KNOWN_TABLE[cls];
          if (!data) return null;
          const cantrips = cantripsKnown(cls, level);
          let spellsLine = null;
          if (data.type === "known") {
            const known = spellsKnown(cls, level);
            if (known != null) spellsLine = `${known} spells known`;
          } else if (data.type === "prepared") {
            const ability = SPELLCASTING_ABILITY[cls];
            const score = Number(attributes?.[ability] ?? 10);
            const mod = abilityModifier(score);
            const prepared = spellsPrepared(cls, level, mod);
            if (prepared != null) {
              spellsLine = `${prepared} prepared (${ability?.toUpperCase()} mod ${mod >= 0 ? "+" : ""}${mod} + level adj.)`;
            }
          }
          return (
            <li
              key={cls}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 0',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span>
                <span style={{ fontWeight: 700, color: 'var(--cc-text)' }}>{cls}</span>{' '}
                <span style={{ color: 'var(--cc-text-dim)' }}>level {level}</span>
              </span>
              <span
                className="cc-label"
                style={{ color: 'var(--cc-teal)' }}
              >
                {cantrips > 0 && `${cantrips} cantrips`}
                {cantrips > 0 && spellsLine && " · "}
                {spellsLine || (cantrips === 0 ? "—" : "")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
