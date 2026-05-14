import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";
import {
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
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";

// ============================================================================
// Step 6: Spells — exact port of design-reference/character-creator/step-spells.jsx
// Data wiring stays on the existing dnd5e adapter (fetchAllSpells API hook,
// SPELLS_KNOWN_TABLE, getSpellSlots, getAllAvailableSpells, getPactSlots,
// spellIcons artwork). The prototype hard-codes a tiny CLASSES roster; we
// resolve the same fields off the live character's class + level instead.
// ============================================================================

function ordinalSuffix(n) {
  return ['st', 'nd', 'rd'][n - 1] || 'th';
}

function levelLabel(levelKey) {
  if (levelKey === 'cantrips') return 'Cantrips';
  if (levelKey === 'level1') return 'First-level Spells';
  const n = parseInt(levelKey.replace('level', ''), 10);
  return `Level ${n} Spells`;
}

// Cantrips ride the purple/gold vein in the prototype (free magic).
// Leveled spells ride orange (slot-cost).
function headingAccent(levelKey) {
  return levelKey === 'cantrips' ? 'var(--purple)' : 'var(--orange)';
}

// Resolve the primary spellcasting class for header copy + recommended
// fallback. Mirrors getSpellcastingClass() from the prior wiring: full
// casters always count; half-casters only count at L2+; multiclass
// races down the list for the first eligible entry.
function resolveSpellcastingClass(characterData) {
  const fullCasters = new Set(["Bard", "Cleric", "Druid", "Sorcerer", "Wizard", "Warlock"]);
  const halfCasters = new Set(["Paladin", "Ranger"]);
  if (fullCasters.has(characterData.class)) {
    return { class: characterData.class, level: characterData.level };
  }
  if (halfCasters.has(characterData.class) && characterData.level >= 2) {
    return { class: characterData.class, level: characterData.level };
  }
  for (const mc of (characterData.multiclasses || [])) {
    if (fullCasters.has(mc.class)) return { class: mc.class, level: mc.level };
    if (halfCasters.has(mc.class) && mc.level >= 2) return { class: mc.class, level: mc.level };
  }
  return null;
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

  // Per-spell-level SLOT count (drives both the counter chip cap and the
  // "X / Y picked" headline inside each chapter). Pact Magic slots merge
  // into the matching spell-level row for the SLOTS display only — they
  // used to drive the pick cap too, which conflated non-fungible pools.
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

  const spellcastingClass = resolveSpellcastingClass(characterData);

  // ── Empty state — non-caster ────────────────────────────────
  if ((spellSlots.cantrips || 0) === 0 && (spellSlots.level1 || 0) === 0) {
    return (
      <div>
        <StepHeader kicker="Chapter VI" title="The Arcane" />
        <div className="tome" style={{ padding: 50, textAlign: 'center', marginTop: 28 }}>
          <div style={{ fontSize: 56, marginBottom: 16, filter: 'sepia(0.2)' }}>⚔️</div>
          <div className="display" style={{ fontSize: 26, color: 'var(--text)', marginBottom: 8 }}>
            No spells for {characterData.class || 'this class'}
          </div>
          <div className="italic-serif" style={{ fontSize: 15, color: 'var(--text-dim)' }}>
            {characterData.class || 'Your class'} doesn't wield arcane power. Step forward to equipment.
          </div>
        </div>
      </div>
    );
  }

  // Recommended pre-fill — picks the recommended list for the primary
  // class (falling through to the first multiclass with a recommendation
  // table), capped per spell level by the current slot count.
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
    if (!recommended) return;
    const newSpells = { ...selectedSpells };
    Object.keys(spellSlots).forEach((levelKey) => {
      const slotsForLevel = spellSlots[levelKey] || 0;
      if (slotsForLevel > 0 && Array.isArray(recommended[levelKey])) {
        newSpells[levelKey] = recommended[levelKey].slice(0, slotsForLevel);
      }
    });
    updateCharacterData({ spells: newSpells });
    setShowRecommendation(recommendedClass);
  };

  const headerClassName = spellcastingClass?.class || characterData.class;
  const headerLevel = spellcastingClass?.level || characterData.level;
  const isPactPrimary = characterData.class === 'Warlock';
  const spellAbility = SPELLCASTING_ABILITY[headerClassName];

  // Build the rendered chapters: cantrips first, then any non-empty
  // leveled chapter up to the character's max spell level.
  const renderableLevels = Object.keys(spellSlots).filter((levelKey) => {
    const slots = getSlotsForLevelKey(levelKey);
    if (slots <= 0) return false;
    if (levelKey !== 'cantrips') {
      const numericLevel = parseInt(levelKey.replace('level', ''), 10);
      if (numericLevel > maxSpellLevel) return false;
    }
    return true;
  });

  return (
    <div>
      <StepHeader
        kicker="Chapter VI · The Arcane"
        title="Your spellbook"
        subtitle={
          isPactPrimary
            ? 'Your patron gifts you magic — fewer slots, but they return on a short rest.'
            : 'Cantrips cast at will. Leveled spells cost a slot each.'
        }
      />

      <Primer title={`How ${headerClassName} spellcasting works`}>
        <strong>Cantrips</strong> are free magic — cast as often as you want.{' '}
        <strong>Leveled spells</strong> cost a spell slot. You use{' '}
        <strong>{(spellAbility || '').toUpperCase() || 'your casting ability'}</strong>{' '}
        for spell attacks &amp; save DCs. At level {headerLevel} {headerClassName}, the cap
        below is your daily slot pool.
      </Primer>

      {/* Counters strip + Use Recommended CTA */}
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
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {renderableLevels.map((levelKey) => {
            const slots = getSlotsForLevelKey(levelKey);
            const currentCount = (selectedSpells[levelKey] || []).length;
            return (
              <CounterChip
                key={levelKey}
                label={levelKey === 'cantrips' ? 'Cantrips' : `Level ${levelKey.replace('level', '')} spells`}
                current={currentCount}
                max={slots}
                color={levelKey === 'cantrips' ? 'purple' : 'orange'}
                tip={
                  levelKey === 'cantrips'
                    ? tipFor('spell_cantrip')
                    : tipFor('spell_slots')
                }
              />
            );
          })}
          {pactSlots && (
            <CounterChip
              label="Pact slots"
              current={pactSlots.slots}
              max={pactSlots.slots}
              color="teal"
              isStatic
            />
          )}
        </div>
        <button type="button" className="btn btn-gold" onClick={useRecommended}>
          ✦ Use recommended
        </button>
      </div>

      <PerClassSpellsKnownPanel characterData={characterData} />

      {pactSlots && <PactMagicBanner pactSlots={pactSlots} />}

      {showRecommendation && recommendedSpells[showRecommendation]?.reasoning && (
        <div
          style={{
            background: 'rgba(55, 242, 209, 0.06)',
            border: '1px solid rgba(55, 242, 209, 0.45)',
            borderLeft: '3px solid var(--teal)',
            borderRadius: 8,
            padding: '14px 18px',
            marginTop: 16,
          }}
        >
          <div className="label" style={{ color: 'var(--teal)', marginBottom: 4 }}>
            Recommended for {showRecommendation}
          </div>
          <p className="italic-serif" style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0, lineHeight: 1.55 }}>
            {recommendedSpells[showRecommendation].reasoning}
          </p>
        </div>
      )}

      {/* Spellbook tome */}
      <div className="tome" style={{ padding: '32px 36px', marginTop: 22 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" style={{ color: 'var(--teal)' }} />
            <p className="italic-serif" style={{ fontSize: 14, color: 'var(--text-dim)' }}>
              Loading spell library…
            </p>
          </div>
        ) : renderableLevels.length === 0 ? (
          <div className="italic-serif" style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center', padding: 24 }}>
            No spell levels available yet.
          </div>
        ) : (
          renderableLevels.map((levelKey, idx) => {
            const slots = getSlotsForLevelKey(levelKey);
            const currentSelected = selectedSpells[levelKey] || [];
            const spellsForLevel = availableSpells[levelKey] || [];
            const cantrip = levelKey === 'cantrips';
            const accent = headingAccent(levelKey);
            return (
              <React.Fragment key={levelKey}>
                {idx > 0 && <FleurDivider />}
                <OrnateHeading color={accent}>{levelLabel(levelKey)}</OrnateHeading>
                <div
                  className="italic-serif"
                  style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}
                >
                  {currentSelected.length}/{slots} picked ·{' '}
                  {cantrip ? 'cast unlimited times' : 'each cast spends one slot'}
                </div>

                {spellsForLevel.length === 0 ? (
                  <p
                    className="italic-serif"
                    style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: 16 }}
                  >
                    No spells available for this level.
                  </p>
                ) : (
                  <ScrollableSpellArea maxHeight={spellsForLevel.length > 8 ? 440 : null}>
                    <SpellGrid
                      spells={spellsForLevel}
                      picked={currentSelected}
                      cantrip={cantrip}
                      maxReached={currentSelected.length >= slots}
                      getSpellDetail={getSpellDetail}
                      onToggle={(name) => {
                        const next = currentSelected.includes(name)
                          ? currentSelected.filter((s) => s !== name)
                          : [...currentSelected, name];
                        if (!currentSelected.includes(name) && next.length > slots) return;
                        updateCharacterData({
                          spells: { ...characterData.spells, [levelKey]: next },
                        });
                      }}
                      hoveredEffect={hoveredEffect}
                      setHoveredEffect={setHoveredEffect}
                    />
                  </ScrollableSpellArea>
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Counter chip — purple (cantrips), orange (leveled), teal (slots/static)
// ============================================================================
function CounterChip({ label, current, max, color, tip, isStatic }) {
  const accent =
    color === 'orange' ? 'var(--orange-soft)'
    : color === 'purple' ? 'var(--purple)'
    : 'var(--teal)';
  const bg =
    color === 'orange' ? 'rgba(255, 83, 0, 0.10)'
    : color === 'purple' ? 'rgba(201, 163, 255, 0.10)'
    : 'rgba(55, 242, 209, 0.10)';
  const border =
    color === 'orange' ? 'rgba(255, 83, 0, 0.40)'
    : color === 'purple' ? 'rgba(201, 163, 255, 0.40)'
    : 'rgba(55, 242, 209, 0.40)';
  return (
    <div style={{ padding: '10px 16px', background: bg, border: `1px solid ${border}`, borderRadius: 4 }}>
      <div
        className="label"
        style={{ color: accent, marginBottom: 2, fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        {label}
        {tip && <InfoTip>{tip}</InfoTip>}
      </div>
      <div className="display" style={{ fontSize: 22, color: 'var(--text)' }}>
        {isStatic ? max : (
          <>
            {current}
            <span style={{ color: 'var(--text-faint)', fontSize: 17 }}> / {max}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Scrollable spell area with a soft mask at the bottom edge when the
// list overflows. Used for spell chapters with more than 8 entries.
// ============================================================================
function ScrollableSpellArea({ children, maxHeight }) {
  if (!maxHeight) return children;
  return (
    <div
      style={{
        maxHeight,
        overflowY: 'auto',
        paddingRight: 10,
        marginRight: -10,
        maskImage: 'linear-gradient(to bottom, black 0%, black 92%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 92%, transparent 100%)',
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// SpellGrid — 2-col grid of SpellCard buttons
// ============================================================================
function SpellGrid({ spells, picked, cantrip, maxReached, getSpellDetail, onToggle, hoveredEffect, setHoveredEffect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
      {spells.map((name) => {
        const isPicked = picked.includes(name);
        const disabled = !isPicked && maxReached;
        const details = getSpellDetail(name);
        return (
          <SpellCard
            key={name}
            name={name}
            details={details}
            isPicked={isPicked}
            disabled={disabled}
            cantrip={cantrip}
            onToggle={() => !disabled && onToggle(name)}
            hoveredEffect={hoveredEffect}
            setHoveredEffect={setHoveredEffect}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// SpellCard — prototype's exact layout (diamond checkmark, name, school/range,
// 3-line description, CONC chip) with the existing app's spell icon artwork
// and hover popover (HoverCard → SpellFullDetail) layered on top.
// ============================================================================
function SpellCard({ name, details, isPicked, disabled, cantrip, onToggle, hoveredEffect, setHoveredEffect }) {
  const accent = cantrip ? 'var(--gold)' : 'var(--orange)';
  const checkColor = cantrip ? 'var(--ink)' : 'white';
  const popoverAccent = cantrip ? 'var(--gold)' : 'var(--orange)';

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className={`pickable ${isPicked ? (cantrip ? 'selected-gold' : 'selected') : ''}`}
          style={{
            padding: 14,
            textAlign: 'left',
            color: 'inherit',
            opacity: disabled ? 0.4 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 22,
                height: 22,
                flexShrink: 0,
                marginTop: 2,
                background: isPicked ? accent : 'transparent',
                border: `1.5px solid ${isPicked ? accent : 'var(--border-strong)'}`,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPicked && (
                <span style={{ color: checkColor, fontSize: 10, fontWeight: 800 }}>✓</span>
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
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span className="display" style={{ fontSize: 17, color: 'var(--text)' }}>{name}</span>
                {(details.concentration || /concentration/i.test(details.duration || '')) && (
                  <span className="chip chip-burgundy" style={{ fontSize: 9, padding: '1px 5px' }}>
                    CONC
                  </span>
                )}
              </div>
              <div
                className="italic-serif"
                style={{ fontSize: 12, color: 'var(--gold-soft)', marginBottom: 6 }}
              >
                {[details.school, details.castingTime, details.range].filter(Boolean).join(' · ')}
              </div>
              <div
                className="italic-serif"
                style={{
                  fontSize: 13.5,
                  color: 'var(--text-dim)',
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
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
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
                          background: 'var(--orange)',
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
                            background: 'var(--bg-3)',
                            color: 'var(--text)',
                            padding: 12,
                            borderRadius: 6,
                            fontSize: 11,
                            width: 240,
                            border: '1px solid var(--orange)',
                            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
                          }}
                        >
                          <div className="display" style={{ fontSize: 12, color: 'var(--orange-soft)', marginBottom: 4 }}>
                            {effect}
                          </div>
                          <div className="italic-serif">{effectDescriptions[effect]}</div>
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
          background: 'var(--bg-3)',
          border: `1px solid ${popoverAccent}`,
          color: 'var(--text)',
          padding: 16,
        }}
      >
        <SpellFullDetail name={name} spell={details} accent={popoverAccent} />
      </HoverCardContent>
    </HoverCard>
  );
}

// ============================================================================
// Spell full-detail popover content — name, meta, description,
// at-higher-levels, classes list. Surfaces everything getSpellDetail()
// returns from the API/hardcoded merge.
// ============================================================================
function SpellFullDetail({ name, spell, accent }) {
  if (!spell) return null;
  const levelDisplay =
    spell.level === 0 || spell.level === 'Cantrip'
      ? 'Cantrip'
      : typeof spell.level === 'number'
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
        <h4 className="display" style={{ fontSize: 18, color: accent || 'var(--orange-soft)', margin: 0, lineHeight: 1.2 }}>
          {name}
        </h4>
        {meta.length > 0 && (
          <p className="italic-serif" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
            {meta.join(' · ')}
          </p>
        )}
      </div>

      {spell.description && (
        <p
          className="italic-serif"
          style={{
            fontSize: 12,
            color: 'var(--text-dim)',
            lineHeight: 1.55,
            whiteSpace: 'pre-line',
            margin: 0,
          }}
        >
          {spell.description}
        </p>
      )}

      {higher && (
        <div style={{ borderLeft: `2px solid ${accent || 'var(--teal)'}`, paddingLeft: 10 }}>
          <div className="label" style={{ color: accent || 'var(--teal)', marginBottom: 4 }}>
            At Higher Levels
          </div>
          <p
            className="italic-serif"
            style={{
              fontSize: 12,
              color: 'var(--text-dim)',
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
          <div className="label" style={{ color: 'var(--text-faint)', marginBottom: 4 }}>Classes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {classes.map((c) => (
              <span key={c} className="chip" style={{ fontSize: 10 }}>{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Pact magic banner — surfaces the Pact Magic slot pool for Warlock /
// multiclass-Warlock combos. Cosmetic; selection cap is driven from
// getSlotsForLevelKey() above.
// ============================================================================
function PactMagicBanner({ pactSlots }) {
  return (
    <div
      style={{
        marginTop: 16,
        background: 'rgba(201, 163, 255, 0.08)',
        border: '1px solid rgba(201, 163, 255, 0.40)',
        borderLeft: '3px solid var(--purple)',
        borderRadius: 8,
        padding: '14px 18px',
      }}
    >
      <div className="label" style={{ color: 'var(--purple)', marginBottom: 4 }}>
        Pact Magic · Warlock {pactSlots.totalWarlockLevels}
      </div>
      <p className="italic-serif" style={{ fontSize: 14, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
        {pactSlots.slots} slot{pactSlots.slots > 1 ? 's' : ''} of{' '}
        {pactSlots.slotLevel}{ordinalSuffix(pactSlots.slotLevel)} level. You regain these on a
        short rest. All Pact Magic slots cast at the level shown.
      </p>
    </div>
  );
}

// ============================================================================
// Multiclass per-class spells reference — PHB p. 165 says each class
// tracks its own spells known or prepared count even though slots
// merge. This panel shows those per-class budgets so a Bard 3 / Cleric 2
// player can see "Bard: 5 known + 2 cantrips · Cleric: prepared = WIS
// mod + 2".
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
        background: 'rgba(201, 163, 255, 0.06)',
        border: '1px solid rgba(201, 163, 255, 0.32)',
        borderLeft: '3px solid var(--purple)',
        borderRadius: 8,
        padding: '14px 18px',
      }}
    >
      <div
        className="label"
        style={{ color: 'var(--purple)', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        Multiclass spells reference
        <InfoTip width="w-80">
          Each class tracks its own spells known or prepared count. The picker below shows the
          unified slot pool — these per-class budgets are the RAW limits to keep your selections
          consistent with.
        </InfoTip>
      </div>
      <p className="italic-serif" style={{ fontSize: 12, color: 'var(--text-faint)', margin: '0 0 10px' }}>
        Per PHB p. 165, multiclass casters track spells separately per class.
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13 }}>
        {allEntries.map(({ className: cls, level }) => {
          const data = SPELLS_KNOWN_TABLE[cls];
          if (!data) return null;
          const cantrips = cantripsKnown(cls, level);
          let spellsLine = null;
          if (data.type === 'known') {
            const known = spellsKnown(cls, level);
            if (known != null) spellsLine = `${known} spells known`;
          } else if (data.type === 'prepared') {
            const ability = SPELLCASTING_ABILITY[cls];
            const score = Number(attributes?.[ability] ?? 10);
            const mod = abilityModifier(score);
            const prepared = spellsPrepared(cls, level, mod);
            if (prepared != null) {
              spellsLine = `${prepared} prepared (${ability?.toUpperCase()} mod ${mod >= 0 ? '+' : ''}${mod} + level adj.)`;
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
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>{cls}</span>{' '}
                <span style={{ color: 'var(--text-dim)' }}>level {level}</span>
              </span>
              <span className="label" style={{ color: 'var(--teal)' }}>
                {cantrips > 0 && `${cantrips} cantrips`}
                {cantrips > 0 && spellsLine && ' · '}
                {spellsLine || (cantrips === 0 ? '—' : '')}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
