import React, { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import {
  getSpellsForClass,
  getCantripsForClass,
} from "@/data/games/dnd5e_2024/spells";
import {
  getSpellsKnownEntry,
  spellsPrepared,
  cantripsKnown,
  getSpellSlots,
  getPactSlots,
} from "@/data/games/dnd5e_2024/rules";
import { getClassByName } from "@/data/games/dnd5e_2024/classes";
import InfoTip from "@/components/characterCreator/InfoTip";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";

/**
 * 2024 D&D 5e — spells step (exact port of step-spells.jsx).
 *
 * Preparation model in 2024:
 *   - prepared casters (Bard / Cleric / Druid / Paladin / Ranger /
 *     Sorcerer / Warlock): prepare from the class list up to the
 *     prep cap.
 *   - spellbook caster (Wizard): pick {6 + 2*(L-1)} spells for the
 *     spellbook, then prepare a subset.
 *   - always-prepared: feature-granted spells that don't count
 *     against the prep cap (Paladin Divine Smite, Ranger Hunter's
 *     Mark, etc.).
 *
 * Persistence shape (under characterData.spells):
 *   { cantrips: [name], prepared: [name], spellbook: [name],
 *     alwaysPrepared: [name] }
 */

const CASTING_ABILITY_NAME = {
  bard: 'Charisma',
  cleric: 'Wisdom',
  druid: 'Wisdom',
  paladin: 'Charisma',
  ranger: 'Wisdom',
  sorcerer: 'Charisma',
  warlock: 'Charisma',
  wizard: 'Intelligence',
};

function classIdLower(name) {
  return String(name || '').toLowerCase();
}

function levelLabel(lvl) {
  if (lvl === 0) return 'Cantrips';
  if (lvl === 1) return 'First-level Spells';
  if (lvl === 2) return 'Second-level Spells';
  if (lvl === 3) return 'Third-level Spells';
  return `Level ${lvl} Spells`;
}

function headingAccent(lvl) {
  return lvl === 0 ? 'var(--purple)' : 'var(--orange)';
}

export default function SpellsStep2024({ characterData, updateCharacterData }) {
  const className = characterData.class;
  const cls = className ? getClassByName(className) : null;
  const classLevel = Number(characterData.level) || 1;
  const tableEntry = getSpellsKnownEntry(className);

  const isCaster = !!tableEntry;
  const shape = tableEntry?.type || 'none';
  const classKey = cls?.id || classIdLower(className);
  const abilityName = CASTING_ABILITY_NAME[classKey];

  const cantripCount = isCaster ? cantripsKnown(className, classLevel) : 0;
  const preparedCount = isCaster ? spellsPrepared(className, classLevel) : 0;
  const wizardSpellbookSize = shape === 'spellbook'
    ? (tableEntry.startingSpellbookSpells || 6) + Math.max(0, classLevel - 1) * (tableEntry.spellsPerLevel || 2)
    : 0;

  // Pools
  const cantripPool = useMemo(
    () => (isCaster ? getCantripsForClass(classKey) : []),
    [isCaster, classKey],
  );
  const spellPool = useMemo(
    () => (isCaster
      ? getSpellsForClass(classKey, classLevel).filter((s) => Number(s.level ?? 0) > 0)
      : []),
    [isCaster, classKey, classLevel],
  );

  const alwaysPrepared = useMemo(() => {
    if (!tableEntry?.alwaysPrepared) return [];
    return tableEntry.alwaysPrepared;
  }, [tableEntry]);

  // Current selections — array state mirrored back into characterData.spells.
  const initial = characterData.spells || {};
  const [cantrips, setCantrips] = useState(
    Array.isArray(initial.cantrips) ? initial.cantrips : [],
  );
  const [prepared, setPrepared] = useState(
    Array.isArray(initial.prepared) ? initial.prepared : [],
  );
  const [spellbook, setSpellbook] = useState(
    Array.isArray(initial.spellbook) ? initial.spellbook : [],
  );

  // Spell slots (display-only)
  const spellSlots = useMemo(
    () => (isCaster ? getSpellSlots(className, classLevel) : []),
    [isCaster, className, classLevel],
  );
  const pactSlots = shape === 'pact' ? getPactSlots(classLevel) : null;

  // Mirror picks into characterData.spells so downstream steps see them.
  useEffect(() => {
    if (!isCaster) {
      if (cantrips.length || prepared.length || spellbook.length) {
        updateCharacterData({
          spells: { cantrips: [], prepared: [], spellbook: [], alwaysPrepared: [] },
        });
      }
      return;
    }
    updateCharacterData({
      spells: { cantrips, prepared, spellbook, alwaysPrepared },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cantrips, prepared, spellbook, isCaster]);

  // ── Empty state — non-caster ────────────────────────────────
  if (!isCaster) {
    return (
      <div>
        <StepHeader kicker="Chapter VI" title="The Arcane" />
        <div className="tome" style={{ padding: 50, textAlign: 'center', marginTop: 28 }}>
          <div style={{ fontSize: 56, marginBottom: 16, filter: 'sepia(0.2)' }}>⚔️</div>
          <div className="display" style={{ fontSize: 26, color: 'var(--text)', marginBottom: 8 }}>
            No spells for {className || 'this class'}
          </div>
          <div className="italic-serif" style={{ fontSize: 15, color: 'var(--text-dim)' }}>
            {className || 'Your class'} doesn't gain spellcasting at level {classLevel} in 2024.
            Step forward to equipment.
          </div>
        </div>
      </div>
    );
  }

  // Group the prep pool by level. For Wizard, the prep list is the
  // spellbook contents; for everyone else, it's the full class list.
  const prepPool = shape === 'spellbook'
    ? spellPool.filter((s) => spellbook.includes(s.name))
    : spellPool;

  const groupedPrepPool = useMemo(() => {
    const groups = new Map();
    for (const s of prepPool) {
      const lvl = Number(s.level ?? 0);
      if (!groups.has(lvl)) groups.set(lvl, []);
      groups.get(lvl).push(s);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [prepPool]);

  const toggleCantrip = (name) => {
    if (cantrips.includes(name)) setCantrips(cantrips.filter((n) => n !== name));
    else if (cantrips.length < cantripCount) setCantrips([...cantrips, name]);
  };
  const toggleSpellbook = (name) => {
    if (spellbook.includes(name)) {
      setSpellbook(spellbook.filter((n) => n !== name));
      // Drop a prepared spell that's no longer in the spellbook.
      if (prepared.includes(name)) setPrepared(prepared.filter((n) => n !== name));
    } else if (spellbook.length < wizardSpellbookSize) {
      setSpellbook([...spellbook, name]);
    }
  };
  const togglePrepared = (name) => {
    if (alwaysPrepared.includes(name)) return; // locked
    if (prepared.includes(name)) setPrepared(prepared.filter((n) => n !== name));
    else if (prepared.length < preparedCount) setPrepared([...prepared, name]);
  };

  // Recommended pre-fill — for 2024 we don't have a curated table, so
  // just fill cantrips / spellbook / prepared from the front of each
  // pool up to their caps. Players can always swap individual picks.
  const useRecommended = () => {
    const recCantrips = cantripPool.slice(0, cantripCount).map((s) => s.name);
    const recSpellbook = shape === 'spellbook'
      ? spellPool.slice(0, wizardSpellbookSize).map((s) => s.name)
      : spellbook;
    const recSource = shape === 'spellbook' ? recSpellbook : spellPool.map((s) => s.name);
    const recPrepared = recSource.slice(0, preparedCount);
    setCantrips(recCantrips);
    if (shape === 'spellbook') setSpellbook(recSpellbook);
    setPrepared(recPrepared);
  };

  return (
    <div>
      <StepHeader
        kicker="Chapter VI · The Arcane"
        title="Your spellbook"
        subtitle={
          shape === 'pact'
            ? 'Your patron gifts you magic — fewer slots, but they return on a short rest.'
            : shape === 'spellbook'
              ? 'Build a spellbook. Prepare a subset each day.'
              : 'Cantrips cast at will. Leveled spells cost a slot each.'
        }
      />

      <Primer title={`How 2024 ${className} spellcasting works`}>
        <strong>Cantrips</strong> are free magic. <strong>Leveled spells</strong> cost a slot.{' '}
        {shape === 'spellbook'
          ? `Pick ${wizardSpellbookSize} spells for your spellbook, then prepare up to ${preparedCount} of them.`
          : `Prepare up to ${preparedCount} spell${preparedCount === 1 ? '' : 's'} from the ${className} list.`}{' '}
        You use <strong>{abilityName || 'your casting ability'}</strong> for spell attacks &amp; save DCs.
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
          {cantripCount > 0 && (
            <CounterChip
              label="Cantrips"
              current={cantrips.length}
              max={cantripCount}
              color="purple"
            />
          )}
          {shape === 'spellbook' && (
            <CounterChip
              label="Spellbook"
              current={spellbook.length}
              max={wizardSpellbookSize}
              color="orange"
            />
          )}
          {preparedCount > 0 && (
            <CounterChip
              label="Prepared"
              current={prepared.length}
              max={preparedCount}
              color="orange"
            />
          )}
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

      {/* Slots display */}
      {(spellSlots.length > 0 || pactSlots) && (
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            fontSize: 11,
          }}
        >
          <span className="label" style={{ color: 'var(--text-faint)' }}>Slots / day</span>
          {spellSlots.map((slots, idx) => slots > 0 && (
            <span key={idx} className="chip" style={{ fontSize: 10 }}>
              L{idx + 1}: {slots}
            </span>
          ))}
          {pactSlots && (
            <span className="chip chip-purple" style={{ fontSize: 10 }}>
              Pact: {pactSlots.slots} × L{pactSlots.level}
            </span>
          )}
        </div>
      )}

      {/* Always-prepared callout */}
      {alwaysPrepared.length > 0 && (
        <div
          style={{
            marginTop: 16,
            background: 'rgba(212, 169, 81, 0.08)',
            border: '1px solid rgba(212, 169, 81, 0.32)',
            borderLeft: '3px solid var(--gold)',
            borderRadius: 8,
            padding: '14px 18px',
          }}
        >
          <div
            className="label"
            style={{ color: 'var(--gold)', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Lock className="w-3 h-3" /> Always prepared — free, doesn't count against your cap
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {alwaysPrepared.map((name) => (
              <span key={name} className="chip chip-gold" style={{ fontSize: 11 }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Spellbook tome */}
      <div className="tome" style={{ padding: '32px 36px', marginTop: 22 }}>
        {/* Cantrips chapter */}
        {cantripCount > 0 && (
          <>
            <OrnateHeading color={headingAccent(0)}>{levelLabel(0)}</OrnateHeading>
            <div
              className="italic-serif"
              style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}
            >
              {cantrips.length}/{cantripCount} picked · cast unlimited times
            </div>
            {cantripPool.length === 0 ? (
              <EmptyChapter />
            ) : (
              <ScrollableSpellArea maxHeight={cantripPool.length > 8 ? 440 : null}>
                <SpellGrid
                  spells={cantripPool}
                  picked={cantrips}
                  cantrip
                  maxReached={cantrips.length >= cantripCount}
                  onToggle={toggleCantrip}
                />
              </ScrollableSpellArea>
            )}
          </>
        )}

        {/* Wizard spellbook chapter */}
        {shape === 'spellbook' && (
          <>
            {cantripCount > 0 && <FleurDivider />}
            <OrnateHeading color={headingAccent(1)}>Spellbook</OrnateHeading>
            <div
              className="italic-serif"
              style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}
            >
              {spellbook.length}/{wizardSpellbookSize} picked ·{' '}
              every spell here can be prepared
            </div>
            {spellPool.length === 0 ? (
              <EmptyChapter />
            ) : (
              <ScrollableSpellArea maxHeight={spellPool.length > 8 ? 440 : null}>
                <SpellGrid
                  spells={spellPool}
                  picked={spellbook}
                  maxReached={spellbook.length >= wizardSpellbookSize}
                  onToggle={toggleSpellbook}
                />
              </ScrollableSpellArea>
            )}
          </>
        )}

        {/* Prepared chapters — grouped by spell level */}
        {preparedCount > 0 && groupedPrepPool.length > 0 && groupedPrepPool.map(([lvl, list], idx) => (
          <React.Fragment key={lvl}>
            <FleurDivider />
            <OrnateHeading color={headingAccent(lvl)}>
              {idx === 0 ? `Prepared · ${levelLabel(lvl)}` : levelLabel(lvl)}
            </OrnateHeading>
            <div
              className="italic-serif"
              style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}
            >
              {prepared.filter((n) => list.some((s) => s.name === n)).length} of {list.length}{' '}
              {shape === 'spellbook' ? 'in your spellbook' : 'available'} · {prepared.length}/{preparedCount}{' '}
              total prepared
            </div>
            <ScrollableSpellArea maxHeight={list.length > 8 ? 440 : null}>
              <SpellGrid
                spells={list}
                picked={prepared}
                lockedNames={alwaysPrepared}
                maxReached={prepared.length >= preparedCount}
                onToggle={togglePrepared}
              />
            </ScrollableSpellArea>
          </React.Fragment>
        ))}

        {/* Empty prep pool for wizard before they pick a spellbook */}
        {preparedCount > 0 && groupedPrepPool.length === 0 && (
          <>
            <FleurDivider />
            <OrnateHeading color={headingAccent(1)}>Prepared</OrnateHeading>
            <p
              className="italic-serif"
              style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, padding: 16 }}
            >
              {shape === 'spellbook'
                ? 'Pick spells for your spellbook above first.'
                : 'No spells available for this class at this level.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyChapter() {
  return (
    <p
      className="italic-serif"
      style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: 16 }}
    >
      No spells available for this level.
    </p>
  );
}

// ============================================================================
// Counter chip — same palette as the 2014 step
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
// ScrollableSpellArea — soft mask at the bottom edge when overflowing
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
// SpellGrid — 2-col grid of SpellCard buttons (prototype's exact layout)
// ============================================================================
function SpellGrid({ spells, picked, cantrip, lockedNames, maxReached, onToggle }) {
  const locked = new Set(lockedNames || []);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
      {spells.map((spell) => {
        const name = spell.name;
        const isPicked = picked.includes(name);
        const isLocked = locked.has(name);
        const disabled = isLocked || (!isPicked && maxReached);
        return (
          <SpellCard
            key={spell.index || name}
            spell={spell}
            isPicked={isPicked || isLocked}
            isLocked={isLocked}
            disabled={disabled}
            cantrip={cantrip}
            onToggle={() => !disabled && onToggle(name)}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// SpellCard — prototype's exact layout: diamond checkmark, name, school/range
// subtitle, 3-line description, CONC chip. Locked (always-prepared) spells
// render with a gold lock icon and can't be toggled.
// ============================================================================
function SpellCard({ spell, isPicked, isLocked, disabled, cantrip, onToggle }) {
  const accent = isLocked ? 'var(--gold)' : cantrip ? 'var(--gold)' : 'var(--orange)';
  const checkColor = (cantrip || isLocked) ? 'var(--ink)' : 'white';
  const selectedClass = isLocked ? 'selected-gold' : cantrip ? 'selected-gold' : 'selected';
  const isConcentration =
    spell.concentration || /concentration/i.test(spell.duration || '');
  const subtitle = [
    spell.school?.name || spell.school,
    spell.casting_time || spell.castingTime,
    spell.range,
  ].filter(Boolean).join(' · ');
  const description = Array.isArray(spell.desc) ? spell.desc.join(' ') : (spell.description || spell.desc || '');

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`pickable ${isPicked ? selectedClass : ''}`}
      style={{
        padding: 14,
        textAlign: 'left',
        color: 'inherit',
        opacity: disabled && !isLocked ? 0.4 : 1,
        cursor: disabled && !isLocked ? 'not-allowed' : isLocked ? 'default' : 'pointer',
      }}
      title={isLocked ? 'Always prepared' : undefined}
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
          {isPicked && !isLocked && (
            <span style={{ color: checkColor, fontSize: 10, fontWeight: 800 }}>✓</span>
          )}
          {isLocked && (
            <Lock className="w-2.5 h-2.5" style={{ color: checkColor }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span className="display" style={{ fontSize: 17, color: 'var(--text)' }}>
              {spell.name}
            </span>
            {isConcentration && (
              <span className="chip chip-burgundy" style={{ fontSize: 9, padding: '1px 5px' }}>
                CONC
              </span>
            )}
          </div>
          {subtitle && (
            <div
              className="italic-serif"
              style={{ fontSize: 12, color: 'var(--gold-soft)', marginBottom: 6 }}
            >
              {subtitle}
            </div>
          )}
          {description && (
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
              {description}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
