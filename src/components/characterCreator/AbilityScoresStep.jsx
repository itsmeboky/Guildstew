import React, { useState } from "react";
import { HelpCircle, X, Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { getRacialAbilityBonuses } from "@/components/dnd5e/raceData";
import { abilityModifier } from "@/components/dnd5e/dnd5eRules";
import { applyAsiBumps } from "@/components/characterCreator/asiSelections";
import {
  getBreweryRaceBonuses,
  getBreweryAbilityPickerSpec,
  BREWERY_ABILITY_KEYS,
} from "@/lib/breweryRaceApply";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";

// ============================================================================
// Step 3: Abilities — exact port of step-abilities.jsx. Tome page with
// MethodPicker (Standard / Point Buy / Roll / Manual), RacialBonusBanner,
// FleurDivider, "The Six Crests" OrnateHeading, 3-col grid of AbilityCrest
// cards with hex-clipped modifier shields, and ArrayTracker / PointBuyTracker
// beneath when relevant. Data layer pulls from the existing creator's
// SRD + brewery race bonus resolution.
// ============================================================================

const POINT_BUY_BUDGET = 27;
const POINT_BUY_MIN = 8;
const POINT_BUY_MAX = 15;

function pointBuyCostToReach(score) {
  if (score <= 8) return 0;
  if (score <= 13) return score - 8;
  if (score <= 15) return 5 + (score - 13) * 2;
  return Infinity;
}
function pointBuyNextStepCost(score) {
  if (score >= POINT_BUY_MAX) return Infinity;
  return score >= 13 ? 2 : 1;
}
function pointBuyTotalSpent(scores) {
  return Object.values(scores).reduce((sum, s) => sum + pointBuyCostToReach(s), 0);
}

const POINT_BUY_DEFAULTS = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

// Per-ability flavor — matches prototype's ABILITIES table.
const ABILITIES = [
  { key: "str", name: "Strength",     icon: "💪", color: "#E74C3C", desc: "Melee attacks, athletics, carrying capacity." },
  { key: "dex", name: "Dexterity",    icon: "🏃", color: "#52C77E", desc: "Ranged attacks, stealth, AC, initiative." },
  { key: "con", name: "Constitution", icon: "❤️", color: "#E5688E", desc: "Hit points, endurance, poison resistance." },
  { key: "int", name: "Intelligence", icon: "📖", color: "#5DA8E8", desc: "Memory, magical theory, deduction." },
  { key: "wis", name: "Wisdom",       icon: "👁️", color: "#E8C054", desc: "Perception, insight, willpower." },
  { key: "cha", name: "Charisma",     icon: "💬", color: "#C9A3FF", desc: "Persuasion, performance, social magic." },
];

const CLASS_RECOMMENDATIONS = {
  Barbarian: { primary: "str", secondary: "con", reasoning: "Barbarians need Strength for powerful melee attacks and Constitution for maximum hit points." },
  Bard:      { primary: "cha", secondary: "dex", reasoning: "Bards use Charisma for spellcasting; Dexterity helps AC and initiative." },
  Cleric:    { primary: "wis", secondary: "con", reasoning: "Clerics cast spells using Wisdom and need Constitution to maintain concentration." },
  Druid:     { primary: "wis", secondary: "con", reasoning: "Druids use Wisdom for spellcasting; Constitution helps survival in Wild Shape." },
  Fighter:   { primary: "str", secondary: "con", reasoning: "Fighters rely on Strength (or Dexterity) for attacks and Constitution for staying power." },
  Monk:      { primary: "dex", secondary: "wis", reasoning: "Monks use Dexterity for attacks and AC; Wisdom boosts their AC further." },
  Paladin:   { primary: "str", secondary: "cha", reasoning: "Paladins need Strength for melee and Charisma for spells and auras." },
  Ranger:    { primary: "dex", secondary: "wis", reasoning: "Rangers use Dexterity for attacks and AC; Wisdom powers their spellcasting." },
  Rogue:     { primary: "dex", secondary: "int", reasoning: "Rogues rely on Dexterity for attacks and stealth; Intelligence boosts skills." },
  Sorcerer:  { primary: "cha", secondary: "con", reasoning: "Sorcerers cast with Charisma and benefit from Constitution for concentration." },
  Warlock:   { primary: "cha", secondary: "con", reasoning: "Warlocks cast with Charisma and benefit from Constitution for concentration." },
  Wizard:    { primary: "int", secondary: "con", reasoning: "Wizards cast with Intelligence and need Constitution for concentration." },
};

const METHODS = [
  { id: "standard", label: "Standard Array", desc: "15, 14, 13, 12, 10, 8 — auto-assigned by class.", icon: "⚖️" },
  { id: "point_buy", label: "Point Buy",      desc: "Spend 27 points (each 8–15). Balanced.",          icon: "⚙️" },
  { id: "roll",      label: "Roll 4d6",       desc: "Roll, drop the lowest. Lucky? Unlucky?",          icon: "🎲" },
  { id: "manual",    label: "Manual",         desc: "Type your own numbers, 3–18.",                    icon: "✒️" },
];

export default function AbilityScoresStep({ characterData, updateCharacterData }) {
  const [method, setMethod] = useState("manual");
  const [showHelp, setShowHelp] = useState(false);
  const [assignedScores, setAssignedScores] = useState({});
  const [baseScores, setBaseScores] = useState(
    characterData.attributes || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  );

  // Racial bonuses — mix SRD + brewery + subrace overrides
  const breweryRace = characterData._brewery_race || null;
  const breweryPicks = characterData._brewery_ability_picks || {};
  const pickerSpec = getBreweryAbilityPickerSpec(breweryRace);
  const breweryBonuses = getBreweryRaceBonuses(breweryRace, breweryPicks);
  const subraceBonuses = breweryRace ? (characterData._brewery_subrace_bonus || {}) : {};
  const srdBonuses = breweryRace ? {} : getRacialAbilityBonuses(characterData.race, characterData.subrace);
  const racialBonuses = { ...srdBonuses };
  for (const [k, v] of Object.entries(breweryBonuses)) racialBonuses[k] = (racialBonuses[k] || 0) + v;
  for (const [k, v] of Object.entries(subraceBonuses)) racialBonuses[k] = (racialBonuses[k] || 0) + (Number(v) || 0);

  const picksMade = Object.values(breweryPicks).filter(Boolean).length;
  const pickLimit = pickerSpec.needed ? pickerSpec.count : 0;

  const recomputeFinalScores = (newBaseScores, overridePicks = breweryPicks) => {
    const recomputedBrewery = getBreweryRaceBonuses(breweryRace, overridePicks);
    const out = {};
    Object.keys(newBaseScores).forEach((k) => {
      out[k] = (newBaseScores[k] || 0)
        + (srdBonuses[k] || 0)
        + (recomputedBrewery[k] || 0)
        + (Number(subraceBonuses[k]) || 0);
    });
    return out;
  };

  const pushScores = (newBaseScores, extraUpdates = {}) => {
    const finalScores = recomputeFinalScores(newBaseScores);
    updateCharacterData({
      baseAttributes: finalScores,
      attributes: applyAsiBumps(finalScores, characterData.asiSelections),
      ...extraUpdates,
    });
  };

  const togglePick = (key) => {
    const current = !!breweryPicks[key];
    if (!current && pickerSpec.needed && pickerSpec.excluded.includes(key)) return;
    if (!current && picksMade >= pickLimit) return;
    const nextPicks = { ...breweryPicks };
    if (current) delete nextPicks[key];
    else nextPicks[key] = true;
    const finalScores = recomputeFinalScores(baseScores, nextPicks);
    updateCharacterData({
      _brewery_ability_picks: nextPicks,
      baseAttributes: finalScores,
      attributes: applyAsiBumps(finalScores, characterData.asiSelections),
    });
  };

  const handleScoreChange = (key, value) => {
    const newValue = Math.max(3, Math.min(18, parseInt(value, 10) || 8));
    const newBaseScores = { ...baseScores, [key]: newValue };
    setBaseScores(newBaseScores);
    pushScores(newBaseScores);
  };

  const pointBuySpent = pointBuyTotalSpent(baseScores);
  const pointBuyRemaining = POINT_BUY_BUDGET - pointBuySpent;

  const adjustPointBuy = (key, delta) => {
    const current = baseScores[key] ?? 8;
    if (delta > 0) {
      if (current >= POINT_BUY_MAX) return;
      if (pointBuyNextStepCost(current) > pointBuyRemaining) return;
    } else if (delta < 0) {
      if (current <= POINT_BUY_MIN) return;
    }
    const next = Math.max(POINT_BUY_MIN, Math.min(POINT_BUY_MAX, current + delta));
    const newBaseScores = { ...baseScores, [key]: next };
    setBaseScores(newBaseScores);
    pushScores(newBaseScores);
  };

  const switchToPointBuy = () => {
    setMethod("point_buy");
    setAssignedScores({});
    setBaseScores(POINT_BUY_DEFAULTS);
    pushScores(POINT_BUY_DEFAULTS);
  };

  const rollAbilityScores = () => {
    const rollOne = () => {
      const dice = Array(4).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
      dice.sort((a, b) => b - a);
      return dice[0] + dice[1] + dice[2];
    };
    const newBaseScores = {
      str: rollOne(), dex: rollOne(), con: rollOne(),
      int: rollOne(), wis: rollOne(), cha: rollOne(),
    };
    setBaseScores(newBaseScores);
    pushScores(newBaseScores);
  };

  const handleStandardAssign = (abilityKey, score) => {
    if (assignedScores[abilityKey] === score) return;
    const newAssigned = { ...assignedScores };
    const oldScore = newAssigned[abilityKey];
    if (Object.values(newAssigned).includes(score)) {
      const swapKey = Object.keys(newAssigned).find((k) => newAssigned[k] === score);
      if (swapKey) newAssigned[swapKey] = oldScore;
    }
    newAssigned[abilityKey] = score;
    setAssignedScores(newAssigned);
    const newBaseScores = { ...baseScores };
    Object.entries(newAssigned).forEach(([key, val]) => {
      if (val !== undefined) newBaseScores[key] = val;
    });
    ABILITIES.forEach((a) => {
      if (newAssigned[a.key] === undefined && newBaseScores[a.key] === undefined) {
        newBaseScores[a.key] = 8;
      }
    });
    setBaseScores(newBaseScores);
    pushScores(newBaseScores);
  };

  const recommendation = characterData.class ? CLASS_RECOMMENDATIONS[characterData.class] : null;

  return (
    <div>
      <StepHeader
        kicker="Chapter III · The Gift of Talents"
        title="Forge your fate"
        subtitle="Six numbers that decide what your hero can do. Higher is better."
      />

      <Primer title="What ability scores mean">
        Each ability has a <strong>score</strong> (3–20) and a <strong>modifier</strong>
        {' '}(–4 to +5). The score is the number; the modifier is what you add to dice.{' '}
        <strong>10–11 → +0 · 14–15 → +2 · 18–19 → +4 · 20 → +5</strong>.
      </Primer>

      <div className="tome" style={{ padding: '32px 36px', marginTop: 28 }}>
        <OrnateHeading>The Method</OrnateHeading>
        <MethodPicker
          method={method}
          onPick={(id) => {
            if (id === "roll") {
              setMethod("roll");
              rollAbilityScores();
            } else if (id === "point_buy") {
              switchToPointBuy();
            } else if (id === "standard") {
              setMethod("standard");
              setAssignedScores({});
            } else {
              setMethod("manual");
            }
          }}
        />

        {recommendation && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="btn btn-ghost"
              style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <HelpCircle className="w-4 h-4" />
              {showHelp
                ? 'Hide recommended priorities'
                : `Show recommended priorities for ${characterData.class}`}
            </button>
          </div>
        )}

        {showHelp && recommendation && (
          <RecommendationCard
            characterClass={characterData.class}
            recommendation={recommendation}
            onClose={() => setShowHelp(false)}
          />
        )}

        {Object.keys(racialBonuses).length > 0 && (
          <RacialBonusBanner
            race={characterData.race}
            subrace={characterData.subrace}
            isBrewery={!!breweryRace}
            bonuses={racialBonuses}
          />
        )}

        {pickerSpec.needed && (
          <BreweryAbilityPicker
            spec={pickerSpec}
            picks={breweryPicks}
            picksMade={picksMade}
            onToggle={togglePick}
          />
        )}

        <FleurDivider />

        <OrnateHeading>The Six Crests</OrnateHeading>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {ABILITIES.map((ability) => {
            const baseScore = baseScores[ability.key] ?? 10;
            const bonus = racialBonuses[ability.key] || 0;
            const totalScore = baseScore + bonus;
            const isPrimary = recommendation?.primary === ability.key;
            const isSecondary = recommendation?.secondary === ability.key;
            return (
              <AbilityCrest
                key={ability.key}
                ability={ability}
                baseScore={baseScore}
                totalScore={totalScore}
                bonus={bonus}
                isPrimary={isPrimary}
                isSecondary={isSecondary}
                method={method}
                assignedValue={assignedScores[ability.key]}
                allAssignedScores={assignedScores}
                onScoreChange={(v) => handleScoreChange(ability.key, v)}
                onStandardAssign={(v) => handleStandardAssign(ability.key, parseInt(v, 10))}
                onPointBuyAdjust={(delta) => adjustPointBuy(ability.key, delta)}
                pointBuyRemaining={pointBuyRemaining}
              />
            );
          })}
        </div>

        {method === "point_buy" && <PointBuyTracker base={baseScores} remaining={pointBuyRemaining} />}
        {method === "standard" && <ArrayTracker base={baseScores} assignedScores={assignedScores} />}
      </div>
    </div>
  );
}

// ============================================================================
// MethodPicker — 4 .pickable cards in a row, prototype exact
// ============================================================================
function MethodPicker({ method, onPick }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
      {METHODS.map((m) => {
        const active = method === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m.id)}
            className={`pickable ${active ? 'selected' : ''}`}
            style={{ padding: 14, textAlign: 'center', color: 'inherit' }}
          >
            <div style={{ fontSize: 26, marginBottom: 6 }}>{m.icon}</div>
            <div className="display" style={{ fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>
              {m.label}
            </div>
            <div className="italic-serif" style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}>
              {m.desc}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// RecommendationCard — teal accent card with primary/secondary callouts
// ============================================================================
function RecommendationCard({ characterClass, recommendation, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'relative',
        background: 'rgba(55, 242, 209, 0.06)',
        border: '1px solid rgba(55, 242, 209, 0.32)',
        borderLeft: '3px solid var(--teal)',
        borderRadius: 8,
        padding: '14px 18px',
        marginTop: 14,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          all: 'unset',
          cursor: 'pointer',
          position: 'absolute',
          top: 10,
          right: 10,
          color: 'var(--text-dim)',
        }}
      >
        <X className="w-4 h-4" />
      </button>
      <div className="label" style={{ color: 'var(--teal)', marginBottom: 6 }}>
        Recommended for {characterClass}
      </div>
      <p
        className="italic-serif"
        style={{ fontSize: 14, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.55 }}
      >
        {recommendation.reasoning}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(20, 12, 8, 0.45)',
            border: '1px solid var(--teal)',
            borderRadius: 6,
          }}
        >
          <div className="label" style={{ color: 'var(--teal)', marginBottom: 2 }}>Highest</div>
          <div
            className="display"
            style={{ fontSize: 22, color: 'var(--text)', textTransform: 'uppercase' }}
          >
            {recommendation.primary}
          </div>
        </div>
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(20, 12, 8, 0.45)',
            border: '1px solid var(--teal)',
            borderRadius: 6,
          }}
        >
          <div className="label" style={{ color: 'var(--teal)', marginBottom: 2 }}>Second</div>
          <div
            className="display"
            style={{ fontSize: 22, color: 'var(--text)', textTransform: 'uppercase' }}
          >
            {recommendation.secondary}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// RacialBonusBanner — prototype's heritage banner (teal accent + chips)
// ============================================================================
function RacialBonusBanner({ race, subrace, isBrewery, bonuses }) {
  const entries = Object.entries(bonuses).filter(([, v]) => v && v !== 0);
  return (
    <div
      style={{
        marginTop: 20,
        padding: '14px 18px',
        background: 'rgba(55, 242, 209, 0.06)',
        border: '1px solid rgba(55, 242, 209, 0.22)',
        borderLeft: '3px solid var(--teal)',
        borderRadius: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 28 }}>{isBrewery ? '✦' : '🛡️'}</span>
        <div>
          <div className="label" style={{ color: 'var(--teal)', marginBottom: 4 }}>
            Heritage of the {subrace ? `${subrace} ` : ''}{race || 'Unknown'}
          </div>
          <div
            className="italic-serif"
            style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 6 }}
          >
            Your blood grants these bonuses automatically.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {entries.map(([k, v]) => (
              <span key={k} className="chip chip-orange">
                {k.toUpperCase()} +{v}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BreweryAbilityPicker — for brewery races whose ability bonus spec is
// "choose N abilities" rather than fixed. Preserved from existing creator.
// ============================================================================
function BreweryAbilityPicker({ spec, picks, picksMade, onToggle }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: '14px 18px',
        background: 'rgba(201, 163, 255, 0.06)',
        border: '1px solid rgba(201, 163, 255, 0.32)',
        borderLeft: '3px solid var(--purple)',
        borderRadius: 6,
      }}
    >
      <div className="label" style={{ color: 'var(--purple)', marginBottom: 6 }}>
        Choose {spec.count} ability bonus{spec.count > 1 ? 'es' : ''} · {picksMade}/{spec.count}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {BREWERY_ABILITY_KEYS.map((key) => {
          const picked = !!picks[key];
          const excluded = spec.excluded.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              disabled={excluded}
              className={`pickable ${picked ? 'selected-teal' : ''}`}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: 'inherit',
                opacity: excluded ? 0.35 : 1,
                cursor: excluded ? 'not-allowed' : 'pointer',
              }}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// AbilityCrest — prototype's hex-shielded modifier card
// ============================================================================
function AbilityCrest({
  ability, baseScore, totalScore, bonus, isPrimary, isSecondary,
  method, assignedValue, allAssignedScores,
  onScoreChange, onStandardAssign, onPointBuyAdjust, pointBuyRemaining,
}) {
  const mod = abilityModifier(totalScore);
  const modStr = (mod >= 0 ? '+' : '') + mod;
  return (
    <div
      className="pickable"
      style={{
        padding: '20px 18px 16px',
        position: 'relative',
        cursor: 'default',
        borderColor: isPrimary ? `${ability.color}88` : 'var(--border)',
        background: isPrimary
          ? `linear-gradient(180deg, ${ability.color}1F, rgba(20, 12, 8, 0.5) 60%)`
          : undefined,
      }}
    >
      {isPrimary && (
        <div
          className="display"
          style={{
            position: 'absolute',
            top: -10,
            left: 14,
            padding: '2px 10px',
            background: ability.color,
            color: '#050816',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            borderRadius: 2,
          }}
        >
          PRIMARY
        </div>
      )}
      {!isPrimary && isSecondary && (
        <div
          className="display"
          style={{
            position: 'absolute',
            top: -10,
            left: 14,
            padding: '2px 10px',
            background: 'var(--gold)',
            color: 'var(--ink)',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            borderRadius: 2,
          }}
        >
          RECOMMENDED
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 22 }}>{ability.icon}</span>
        <span className="display" style={{ fontSize: 22, color: 'var(--text)' }}>{ability.name}</span>
      </div>
      <div
        className="italic-serif"
        style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 16, lineHeight: 1.35 }}
      >
        {ability.desc}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 6,
        }}
      >
        <div style={{ flex: 1 }}>
          <div className="label" style={{ marginBottom: 4, fontSize: 10 }}>Score</div>
          {method === 'standard' ? (
            <select
              value={assignedValue ?? ''}
              onChange={(e) => onStandardAssign(e.target.value)}
              className="input"
              style={{
                textAlign: 'center',
                fontSize: 18,
                fontWeight: 800,
                padding: '6px 4px',
                fontFamily: 'var(--display)',
              }}
            >
              <option value="">—</option>
              {STANDARD_ARRAY.map((s) => (
                <option
                  key={s}
                  value={s}
                  disabled={
                    Object.values(allAssignedScores).includes(s)
                      && allAssignedScores[ability.key] !== s
                  }
                >
                  {s}
                </option>
              ))}
            </select>
          ) : method === 'point_buy' ? (
            <PointBuyControl
              score={baseScore}
              remaining={pointBuyRemaining}
              onAdjust={onPointBuyAdjust}
            />
          ) : (
            <input
              type="number"
              min={3}
              max={method === 'manual' ? 18 : 20}
              value={baseScore}
              onChange={(e) => onScoreChange(e.target.value)}
              className="input"
              style={{
                textAlign: 'center',
                fontSize: 20,
                fontWeight: 800,
                padding: '6px 4px',
                fontFamily: 'var(--display)',
                width: '100%',
              }}
            />
          )}
          {bonus > 0 && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--teal)',
                marginTop: 4,
                textAlign: 'center',
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
              }}
            >
              +{bonus} from race
            </div>
          )}
        </div>

        <div
          style={{
            width: 76,
            height: 84,
            flexShrink: 0,
            background: `radial-gradient(circle at 50% 30%, ${ability.color}22, transparent 70%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: `1px solid ${ability.color}44`,
          }}
        >
          <div className="label" style={{ fontSize: 9, marginBottom: 0, color: ability.color }}>
            MOD
          </div>
          <div
            className="display"
            style={{ fontSize: 30, color: mod >= 0 ? ability.color : 'var(--danger)', lineHeight: 1 }}
          >
            {modStr}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>({totalScore})</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PointBuyControl — +/- adjuster used inside the crest when method=point_buy
// ============================================================================
function PointBuyControl({ score, remaining, onAdjust }) {
  const nextCost = pointBuyNextStepCost(score);
  const canDecrease = score > POINT_BUY_MIN;
  const canIncrease = score < POINT_BUY_MAX && nextCost <= remaining;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '6px 4px',
      }}
    >
      <button
        type="button"
        onClick={() => onAdjust(-1)}
        disabled={!canDecrease}
        style={{
          all: 'unset',
          cursor: canDecrease ? 'pointer' : 'not-allowed',
          width: 26,
          height: 26,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          background: canDecrease ? 'rgba(20, 12, 8, 0.5)' : 'transparent',
          border: '1px solid var(--border)',
          color: canDecrease ? 'var(--text)' : 'var(--text-faint)',
          opacity: canDecrease ? 1 : 0.4,
        }}
      >
        <Minus className="w-3 h-3" />
      </button>
      <div
        className="display"
        style={{ fontSize: 22, color: 'var(--text)', minWidth: 28, textAlign: 'center' }}
      >
        {score}
      </div>
      <button
        type="button"
        onClick={() => onAdjust(1)}
        disabled={!canIncrease}
        style={{
          all: 'unset',
          cursor: canIncrease ? 'pointer' : 'not-allowed',
          width: 26,
          height: 26,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          background: canIncrease ? 'rgba(20, 12, 8, 0.5)' : 'transparent',
          border: '1px solid var(--border)',
          color: canIncrease ? 'var(--text)' : 'var(--text-faint)',
          opacity: canIncrease ? 1 : 0.4,
        }}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

// ============================================================================
// PointBuyTracker — bottom of tome, total spent / remaining display
// ============================================================================
function PointBuyTracker({ base, remaining }) {
  return (
    <div
      style={{
        marginTop: 20,
        padding: '14px 20px',
        background: 'rgba(20, 12, 8, 0.5)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div className="label">Point Buy Treasury</div>
        <div className="italic-serif" style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
          8 = 0pt · 13 = 5pt · 14 = 7pt · 15 = 9pt
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div
          className="display"
          style={{
            fontSize: 36,
            color: remaining < 0 ? 'var(--danger)' : remaining === 0 ? 'var(--teal)' : 'var(--gold)',
            lineHeight: 1,
          }}
        >
          {remaining}
        </div>
        <div className="label" style={{ fontSize: 10, marginTop: 2 }}>
          {remaining < 0 ? 'Overdrawn' : 'Remaining of 27'}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ArrayTracker — bottom of tome, hex-clipped chips for [15, 14, 13, 12, 10, 8]
// ============================================================================
function ArrayTracker({ base, assignedScores }) {
  return (
    <div
      style={{
        marginTop: 20,
        padding: '14px 20px',
        background: 'rgba(20, 12, 8, 0.5)',
        border: '1px solid var(--border)',
        borderRadius: 4,
      }}
    >
      <div className="label" style={{ marginBottom: 10 }}>
        Standard Array · drop each value into a crest above
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {STANDARD_ARRAY.map((n, i) => {
          const isUsed = Object.values(assignedScores).includes(n);
          return (
            <div
              key={i}
              style={{
                width: 48,
                height: 48,
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 20,
                fontFamily: 'var(--display)',
                background: isUsed ? 'rgba(55, 242, 209, 0.18)' : 'rgba(20, 12, 8, 0.7)',
                color: isUsed ? 'var(--teal)' : 'var(--text-faint)',
                border: `1px solid ${isUsed ? 'var(--teal)' : 'var(--border-faint)'}`,
                opacity: isUsed ? 1 : 0.5,
              }}
            >
              {n}
            </div>
          );
        })}
      </div>
    </div>
  );
}
