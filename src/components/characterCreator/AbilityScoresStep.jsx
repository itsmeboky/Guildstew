
import React, { useState } from "react";
import { Dices, HelpCircle, X, Sparkles, Calculator, Minus, Plus } from "lucide-react";
import { getRacialAbilityBonuses } from "@/components/dnd5e/raceData";
import { abilityModifier } from '@/components/dnd5e/dnd5eRules';
import { applyAsiBumps } from "@/components/characterCreator/asiSelections";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";
import {
  getBreweryRaceBonuses,
  getBreweryAbilityPickerSpec,
  BREWERY_ABILITY_KEYS,
} from "@/lib/breweryRaceApply";
import { motion } from "framer-motion";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";

// Point Buy (RAW): scores 8..15, total budget 27. Cost to RAISE
// from N to N+1 is 1pt for 9..13 and 2pt for 14..15.
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
  return Object.values(scores).reduce(
    (sum, s) => sum + pointBuyCostToReach(s),
    0,
  );
}

const POINT_BUY_DEFAULTS = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

// Per-ability flavor (icon, color tint, shorter description) used by
// the ability "crest" cards. Mirrors the prototype's ABILITIES table
// but keys by the same lowercase abbreviation we use everywhere else
// in characterData.attributes.
const abilities = [
  { key: "str", name: "Strength",     icon: "💪", color: "#E74C3C", description: "Melee attacks, athletics, carrying capacity." },
  { key: "dex", name: "Dexterity",    icon: "🏃", color: "#52C77E", description: "Ranged attacks, stealth, AC, initiative." },
  { key: "con", name: "Constitution", icon: "❤️", color: "#E5688E", description: "Hit points, endurance, poison saves." },
  { key: "int", name: "Intelligence", icon: "🧠", color: "#5DA8E8", description: "Memory, magical theory, deduction." },
  { key: "wis", name: "Wisdom",       icon: "👁️", color: "#E8C054", description: "Perception, insight, willpower." },
  { key: "cha", name: "Charisma",     icon: "💬", color: "#C9A3FF", description: "Persuasion, performance, social magic." },
];

const classRecommendations = {
  Barbarian: { primary: "str", secondary: "con", reasoning: "Barbarians need Strength for powerful melee attacks and Constitution for maximum hit points to survive in the thick of combat." },
  Bard:      { primary: "cha", secondary: "dex", reasoning: "Bards use Charisma for spellcasting and social interaction, while Dexterity helps with armor class and initiative." },
  Cleric:    { primary: "wis", secondary: "con", reasoning: "Clerics cast spells using Wisdom and need Constitution to maintain concentration and survive frontline combat." },
  Druid:     { primary: "wis", secondary: "con", reasoning: "Druids use Wisdom for spellcasting and Constitution helps them survive in Wild Shape forms and maintain concentration." },
  Fighter:   { primary: "str", secondary: "con", reasoning: "Fighters rely on Strength (or Dexterity) for attacks and Constitution for staying power in long battles." },
  Monk:      { primary: "dex", secondary: "wis", reasoning: "Monks use Dexterity for attacks and AC, while Wisdom boosts their AC further and powers some abilities." },
  Paladin:   { primary: "str", secondary: "cha", reasoning: "Paladins need Strength for melee combat and Charisma for spellcasting and their aura abilities." },
  Ranger:    { primary: "dex", secondary: "wis", reasoning: "Rangers use Dexterity for attacks and AC, with Wisdom powering their spellcasting and survival skills." },
  Rogue:     { primary: "dex", secondary: "int", reasoning: "Rogues rely on Dexterity for attacks, AC, and stealth, while Intelligence boosts Investigation and other skills." },
  Sorcerer:  { primary: "cha", secondary: "con", reasoning: "Sorcerers use Charisma for spellcasting and Constitution to maintain concentration and boost low hit points." },
  Warlock:   { primary: "cha", secondary: "con", reasoning: "Warlocks cast with Charisma and benefit from Constitution for concentration and survivability." },
  Wizard:    { primary: "int", secondary: "con", reasoning: "Wizards use Intelligence for spellcasting and need Constitution for concentration and to compensate for low hit points." },
};

const METHODS = [
  { id: "manual",    label: "Manual",         icon: "✒️", desc: "Type your own numbers, 3–18." },
  { id: "standard",  label: "Standard Array", icon: "⚖️", desc: "15, 14, 13, 12, 10, 8 — assign to each score." },
  { id: "point_buy", label: "Point Buy",      icon: "⚙️", desc: "Spend 27 points (each 8–15). Balanced." },
  { id: "roll",      label: "Roll 4d6",       icon: "🎲", desc: "Roll, drop the lowest. Lucky? Unlucky?" },
];

export default function AbilityScoresStep({ characterData, updateCharacterData }) {
  const [method, setMethod] = useState("manual");
  const [showHelp, setShowHelp] = useState(false);
  const [standardArray] = useState([15, 14, 13, 12, 10, 8]);
  const [assignedScores, setAssignedScores] = useState({});
  const [baseScores, setBaseScores] = useState(
    characterData.attributes || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  );

  // Mix brewery-race bonuses on top of the SRD lookup. The brewery
  // race metadata hangs on characterData._brewery_race and user picks
  // for `choose` / `custom` modes live on _brewery_ability_picks.
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
  const togglePick = (key) => {
    const current = !!breweryPicks[key];
    if (!current && pickerSpec.needed && pickerSpec.excluded.includes(key)) return;
    if (!current && picksMade >= pickLimit) return;
    const nextPicks = { ...breweryPicks };
    if (current) delete nextPicks[key];
    else nextPicks[key] = true;
    const nextBreweryBonuses = getBreweryRaceBonuses(breweryRace, nextPicks);
    const finalScores = {};
    Object.keys(baseScores).forEach((k) => {
      finalScores[k] = baseScores[k]
        + (srdBonuses[k] || 0)
        + (nextBreweryBonuses[k] || 0)
        + (Number(subraceBonuses[k]) || 0);
    });
    updateCharacterData({
      _brewery_ability_picks: nextPicks,
      baseAttributes: finalScores,
      attributes: applyAsiBumps(finalScores, characterData.asiSelections),
    });
  };

  const calculateModifier = (score) => {
    const mod = abilityModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const handleScoreChange = (key, value) => {
    const newValue = Math.max(3, Math.min(18, parseInt(value, 10) || 8));
    const newBaseScores = { ...baseScores, [key]: newValue };
    setBaseScores(newBaseScores);
    const finalScores = {};
    Object.keys(newBaseScores).forEach((k) => {
      finalScores[k] = newBaseScores[k] + (racialBonuses[k] || 0);
    });
    updateCharacterData({
      baseAttributes: finalScores,
      attributes: applyAsiBumps(finalScores, characterData.asiSelections),
    });
  };

  const pointBuySpent = pointBuyTotalSpent(baseScores);
  const pointBuyRemaining = POINT_BUY_BUDGET - pointBuySpent;

  const adjustPointBuy = (key, delta) => {
    const current = baseScores[key] ?? 8;
    if (delta > 0) {
      const cost = pointBuyNextStepCost(current);
      if (current >= POINT_BUY_MAX) return;
      if (cost > pointBuyRemaining) return;
    } else if (delta < 0) {
      if (current <= POINT_BUY_MIN) return;
    } else {
      return;
    }
    const next = Math.max(POINT_BUY_MIN, Math.min(POINT_BUY_MAX, current + delta));
    const newBaseScores = { ...baseScores, [key]: next };
    setBaseScores(newBaseScores);
    const finalScores = {};
    Object.keys(newBaseScores).forEach((k) => {
      finalScores[k] = newBaseScores[k] + (racialBonuses[k] || 0);
    });
    updateCharacterData({
      baseAttributes: finalScores,
      attributes: applyAsiBumps(finalScores, characterData.asiSelections),
    });
  };

  const switchToPointBuy = () => {
    setMethod("point_buy");
    setAssignedScores({});
    setBaseScores(POINT_BUY_DEFAULTS);
    const finalScores = {};
    Object.keys(POINT_BUY_DEFAULTS).forEach((k) => {
      finalScores[k] = POINT_BUY_DEFAULTS[k] + (racialBonuses[k] || 0);
    });
    updateCharacterData({
      baseAttributes: finalScores,
      attributes: applyAsiBumps(finalScores, characterData.asiSelections),
    });
  };

  const rollAbilityScores = () => {
    const rollDice = () => {
      const rolls = Array(4).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
      rolls.sort((a, b) => b - a);
      return rolls.slice(0, 3).reduce((a, b) => a + b, 0);
    };
    const newBaseScores = {
      str: rollDice(), dex: rollDice(), con: rollDice(),
      int: rollDice(), wis: rollDice(), cha: rollDice(),
    };
    setBaseScores(newBaseScores);
    const finalScores = {};
    Object.keys(newBaseScores).forEach((k) => {
      finalScores[k] = newBaseScores[k] + (racialBonuses[k] || 0);
    });
    updateCharacterData({
      baseAttributes: finalScores,
      attributes: applyAsiBumps(finalScores, characterData.asiSelections),
    });
  };

  const handleStandardArrayDrop = (abilityKey, score) => {
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
    abilities.forEach((ability) => {
      if (!newBaseScores[ability.key] && newAssigned[ability.key] === undefined) {
        newBaseScores[ability.key] = 8;
      }
    });
    setBaseScores(newBaseScores);
    const finalScores = {};
    Object.keys(newBaseScores).forEach((k) => {
      finalScores[k] = newBaseScores[k] + (racialBonuses[k] || 0);
    });
    updateCharacterData({
      baseAttributes: finalScores,
      attributes: applyAsiBumps(finalScores, characterData.asiSelections),
    });
  };

  const saveStandardArray = () => {
    if (Object.keys(assignedScores).length !== 6) return;
    setMethod("manual");
  };

  const availableScores = standardArray.filter(
    (score) => !Object.values(assignedScores).includes(score),
  );

  const recommendation = characterData.class ? classRecommendations[characterData.class] : null;
  const recommendedKey = recommendation?.primary;

  return (
    <div>
      <StepHeader
        kicker="Chapter III · The Gift of Talents"
        title="Forge your fate"
        subtitle="Six numbers that decide what your hero can do. Higher is better — and what you don't roll, you spend."
      />

      <Primer title="What ability scores mean">
        Each ability has a <strong>score</strong> (3–18) and a <strong>modifier</strong> (–4
        to +4). The score is the number; the <strong>modifier</strong> is what you add to dice.
        <strong> 10–11 → +0 · 14–15 → +2 · 18 → +4.</strong> Pick a method below — your class
        will hint where to put the highs.
      </Primer>

      <div className="cc-tome" style={{ padding: '32px 36px', marginTop: 24 }}>
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
          onHelp={() => setShowHelp((v) => !v)}
          hasRecommendation={!!recommendation}
        />

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

        {method === "standard" && (
          <StandardArrayBank
            standardArray={standardArray}
            assignedScores={assignedScores}
            availableScores={availableScores}
            onSave={saveStandardArray}
          />
        )}

        {method === "point_buy" && (
          <PointBuyBudgetBanner remaining={pointBuyRemaining} />
        )}

        <FleurDivider />

        <OrnateHeading>The Six Crests</OrnateHeading>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          {abilities.map((ability) => {
            const baseScore = baseScores[ability.key] || 10;
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
                modifier={calculateModifier(totalScore)}
                isPrimary={isPrimary}
                isSecondary={isSecondary}
                method={method}
                assignedValue={assignedScores[ability.key]}
                standardArray={standardArray}
                allAssignedScores={assignedScores}
                onScoreChange={(v) => handleScoreChange(ability.key, v)}
                onStandardAssign={(v) => handleStandardArrayDrop(ability.key, parseInt(v, 10))}
                onPointBuyAdjust={(delta) => adjustPointBuy(ability.key, delta)}
                pointBuyRemaining={pointBuyRemaining}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Method picker — 4 ornate cards + a "need help" affordance
// ============================================================================
function MethodPicker({ method, onPick, onHelp, hasRecommendation }) {
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 14,
        }}
      >
        {METHODS.map((m) => {
          const active = method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.id)}
              className={`cc-pickable ${active ? 'cc-selected' : ''}`}
              style={{ padding: 14, textAlign: 'center', color: 'inherit' }}
            >
              <div style={{ fontSize: 26, marginBottom: 6 }}>{m.icon}</div>
              <div
                className="cc-display"
                style={{
                  fontSize: 15,
                  color: active ? 'var(--cc-orange-soft)' : 'var(--cc-text)',
                  marginBottom: 4,
                }}
              >
                {m.label}
                <InfoTip>{tipFor(m.id === 'point_buy' ? 'method_point_buy'
                  : m.id === 'standard' ? 'method_standard_array'
                  : m.id === 'roll' ? 'method_roll'
                  : 'method_manual')}</InfoTip>
              </div>
              <div
                className="cc-italic-serif"
                style={{ fontSize: 12, color: 'var(--cc-text-dim)', lineHeight: 1.4 }}
              >
                {m.desc}
              </div>
            </button>
          );
        })}
      </div>

      {hasRecommendation && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <button
            type="button"
            onClick={onHelp}
            className="cc-btn-ghost"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
            }}
          >
            <HelpCircle className="w-4 h-4" />
            Show recommended priorities for my class
          </button>
        </div>
      )}
    </>
  );
}

// ============================================================================
// Class recommendation card (collapsed by default)
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
        borderLeft: '3px solid var(--cc-teal)',
        borderRadius: 8,
        padding: '14px 18px',
        marginBottom: 18,
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
          color: 'var(--cc-text-dim)',
        }}
      >
        <X className="w-4 h-4" />
      </button>
      <div
        className="cc-label"
        style={{ color: 'var(--cc-teal)', marginBottom: 6 }}
      >
        Recommended for {characterClass}
      </div>
      <p
        className="cc-italic-serif"
        style={{
          fontSize: 14,
          color: 'var(--cc-text-dim)',
          margin: '0 0 12px',
          lineHeight: 1.55,
        }}
      >
        {recommendation.reasoning}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(20, 12, 8, 0.45)',
            border: '1px solid var(--cc-teal)',
            borderRadius: 6,
          }}
        >
          <div className="cc-label" style={{ color: 'var(--cc-teal)', marginBottom: 2 }}>
            Highest
          </div>
          <div
            className="cc-display"
            style={{ fontSize: 22, color: 'var(--cc-text)', textTransform: 'uppercase' }}
          >
            {recommendation.primary}
          </div>
        </div>
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(20, 12, 8, 0.45)',
            border: '1px solid var(--cc-teal)',
            borderRadius: 6,
          }}
        >
          <div className="cc-label" style={{ color: 'var(--cc-teal)', marginBottom: 2 }}>
            Second
          </div>
          <div
            className="cc-display"
            style={{ fontSize: 22, color: 'var(--cc-text)', textTransform: 'uppercase' }}
          >
            {recommendation.secondary}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Racial bonus banner — heritage tag + chip row
// ============================================================================
function RacialBonusBanner({ race, subrace, isBrewery, bonuses }) {
  return (
    <div
      style={{
        marginTop: 6,
        marginBottom: 18,
        padding: '14px 18px',
        background: 'rgba(55, 242, 209, 0.06)',
        border: '1px solid rgba(55, 242, 209, 0.22)',
        borderLeft: '3px solid var(--cc-teal)',
        borderRadius: 6,
      }}
    >
      <div
        className="cc-label"
        style={{
          color: 'var(--cc-teal)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>Heritage of the {subrace ? `${subrace} ` : ''}{race || 'Unknown'}</span>
        {isBrewery && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: '0.12em',
              color: '#050816',
              background: 'var(--cc-teal)',
              borderRadius: 4,
              padding: '2px 6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Sparkles className="w-2.5 h-2.5" /> Brewery
          </span>
        )}
      </div>
      <div
        className="cc-italic-serif"
        style={{ fontSize: 13, color: 'var(--cc-text-dim)', marginBottom: 8 }}
      >
        Your blood grants these bonuses automatically.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {Object.entries(bonuses).map(([key, bonus]) => (
          <span key={key} className="cc-chip cc-chip-orange">
            {key.toUpperCase()} +{bonus}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Brewery race ability picker (for choose / custom modes)
// ============================================================================
function BreweryAbilityPicker({ spec, picks, picksMade, onToggle }) {
  return (
    <div
      style={{
        marginBottom: 18,
        padding: '14px 18px',
        background: 'rgba(20, 12, 8, 0.5)',
        border: '1px solid rgba(55, 242, 209, 0.4)',
        borderRadius: 8,
      }}
    >
      <div
        className="cc-label"
        style={{
          color: 'var(--cc-teal)',
          marginBottom: 4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Sparkles className="w-4 h-4" />
        Choose {spec.count} {spec.count === 1 ? 'score' : 'scores'} — each gets +{spec.amount}
      </div>
      <p
        className="cc-italic-serif"
        style={{ fontSize: 12, color: 'var(--cc-text-dim)', margin: '0 0 10px' }}
      >
        Picked {picksMade} of {spec.count}
        {spec.excluded.length > 0
          ? ` · excluded: ${spec.excluded.map((e) => e.toUpperCase()).join(', ')}`
          : ''}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {BREWERY_ABILITY_KEYS.map((key) => {
          const excluded = spec.excluded.includes(key);
          const active = !!picks[key];
          const disabled = excluded || (!active && picksMade >= spec.count);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              disabled={disabled}
              style={{
                all: 'unset',
                cursor: disabled ? 'not-allowed' : 'pointer',
                padding: '6px 12px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                background: active ? 'var(--cc-teal)' : 'rgba(20, 12, 8, 0.6)',
                color: active ? '#050816' : disabled ? 'var(--cc-text-faint)' : 'var(--cc-text-dim)',
                border: `1px solid ${active ? 'var(--cc-teal)' : 'var(--cc-border)'}`,
                opacity: disabled ? 0.5 : 1,
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
// Standard array score bank
// ============================================================================
function StandardArrayBank({ standardArray, assignedScores, availableScores, onSave }) {
  const allAssigned = Object.keys(assignedScores).length === 6;
  return (
    <div
      style={{
        marginBottom: 18,
        padding: '14px 18px',
        background: 'rgba(20, 12, 8, 0.5)',
        border: '1px solid var(--cc-border)',
        borderRadius: 8,
      }}
    >
      <div
        className="cc-label"
        style={{ marginBottom: 10, color: 'var(--cc-gold-soft)' }}
      >
        Standard Array · pick a score for each ability below
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {standardArray.map((score, i) => {
          const isUsed = Object.values(assignedScores).includes(score);
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
                fontFamily: 'var(--cc-display)',
                background: isUsed ? 'rgba(55, 242, 209, 0.18)' : 'rgba(20, 12, 8, 0.7)',
                color: isUsed ? 'var(--cc-teal)' : 'var(--cc-text-faint)',
                border: `1px solid ${isUsed ? 'var(--cc-teal)' : 'var(--cc-border-faint)'}`,
                opacity: isUsed ? 1 : 0.5,
              }}
            >
              {score}
            </div>
          );
        })}
      </div>
      {allAssigned && (
        <button
          type="button"
          onClick={onSave}
          className="cc-btn-primary"
          style={{ marginTop: 12 }}
        >
          Save & Lock Scores
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Point buy budget banner
// ============================================================================
function PointBuyBudgetBanner({ remaining }) {
  const tone = remaining === 0 ? 'var(--cc-teal)' : remaining < 0 ? 'var(--cc-orange)' : 'var(--cc-gold)';
  return (
    <div
      style={{
        marginBottom: 18,
        padding: '14px 20px',
        background: 'rgba(20, 12, 8, 0.5)',
        border: '1px solid rgba(55, 242, 209, 0.35)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div>
        <div
          className="cc-label"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--cc-text-dim)',
          }}
        >
          <Calculator className="w-4 h-4" style={{ color: 'var(--cc-teal)' }} />
          Point Buy Treasury
        </div>
        <div
          className="cc-italic-serif"
          style={{ fontSize: 12, color: 'var(--cc-text-faint)', marginTop: 2 }}
        >
          8 = 0pt · 13 = 5pt · 14 = 7pt · 15 = 9pt
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="cc-display" style={{ fontSize: 36, color: tone, lineHeight: 1 }}>
          {remaining}
        </div>
        <div className="cc-label" style={{ marginTop: 2, color: 'var(--cc-text-faint)' }}>
          {remaining < 0 ? 'Overdrawn' : 'Remaining of 27'}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Ability crest — name + icon + description + score input + modifier shield
// ============================================================================
function AbilityCrest({
  ability, baseScore, totalScore, bonus, modifier,
  isPrimary, isSecondary,
  method, assignedValue, standardArray, allAssignedScores,
  onScoreChange, onStandardAssign, onPointBuyAdjust, pointBuyRemaining,
}) {
  const modValue = parseInt(modifier, 10);
  return (
    <div
      className="cc-pickable"
      style={{
        padding: '20px 18px 16px',
        position: 'relative',
        cursor: 'default',
        borderColor: isPrimary ? `${ability.color}88` : 'var(--cc-border)',
        background: isPrimary
          ? `linear-gradient(180deg, ${ability.color}1F, rgba(20, 12, 8, 0.5) 60%)`
          : undefined,
      }}
    >
      {isPrimary && (
        <div
          className="cc-display"
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
            borderRadius: 3,
          }}
        >
          PRIMARY
        </div>
      )}
      {!isPrimary && isSecondary && (
        <div
          className="cc-display"
          style={{
            position: 'absolute',
            top: -10,
            left: 14,
            padding: '2px 10px',
            background: 'var(--cc-gold)',
            color: '#050816',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            borderRadius: 3,
          }}
        >
          SECONDARY
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 22 }}>{ability.icon}</span>
        <span className="cc-display" style={{ fontSize: 22, color: 'var(--cc-text)' }}>
          {ability.name}
        </span>
      </div>
      <div
        className="cc-italic-serif"
        style={{
          fontSize: 12,
          color: 'var(--cc-text-faint)',
          marginBottom: 14,
          lineHeight: 1.4,
        }}
      >
        {ability.description}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div className="cc-label" style={{ marginBottom: 4, fontSize: 10 }}>
            Score
          </div>
          {method === 'standard' ? (
            <select
              value={assignedValue ?? ''}
              onChange={(e) => onStandardAssign(e.target.value)}
              className="cc-input"
              style={{
                textAlign: 'center',
                fontSize: 18,
                fontWeight: 800,
                padding: '6px 4px',
                fontFamily: 'var(--cc-display)',
              }}
            >
              <option value="">—</option>
              {standardArray.map((s) => (
                <option
                  key={s}
                  value={s}
                  disabled={
                    Object.values(allAssignedScores).includes(s) && allAssignedScores[ability.key] !== s
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
              min="3"
              max="18"
              value={baseScore}
              onChange={(e) => onScoreChange(e.target.value)}
              className="cc-input"
              style={{
                textAlign: 'center',
                fontSize: 20,
                fontWeight: 800,
                padding: '6px 4px',
                fontFamily: 'var(--cc-display)',
              }}
            />
          )}
          {bonus > 0 && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--cc-teal)',
                marginTop: 4,
                textAlign: 'center',
                fontFamily: 'var(--cc-serif)',
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
            background: `radial-gradient(circle at 50% 30%, ${ability.color}33, transparent 70%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: `1px solid ${ability.color}55`,
          }}
        >
          <div className="cc-label" style={{ fontSize: 9, marginBottom: 0, color: ability.color }}>
            MOD
          </div>
          <div
            className="cc-display"
            style={{
              fontSize: 30,
              color: modValue >= 0 ? ability.color : 'var(--cc-orange)',
              lineHeight: 1,
            }}
          >
            {modifier}
          </div>
          <div style={{ fontSize: 10, color: 'var(--cc-text-faint)' }}>
            ({totalScore})
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Point Buy +/- control (preserved logic, restyled to .cc-* tokens)
// ============================================================================
function PointBuyControl({ score, remaining, onAdjust }) {
  const nextCost = pointBuyNextStepCost(score);
  const canDecrease = score > POINT_BUY_MIN;
  const canIncrease = score < POINT_BUY_MAX && nextCost <= remaining;
  const decreaseTitle = canDecrease ? "Decrease (refunds points)" : "At minimum (8)";
  const increaseTitle = score >= POINT_BUY_MAX
    ? "At maximum (15)"
    : nextCost > remaining
      ? `Need ${nextCost} pt — only ${remaining} remaining`
      : `+1 (costs ${nextCost} pt)`;

  const buttonStyle = (enabled, accent) => ({
    all: 'unset',
    cursor: enabled ? 'pointer' : 'not-allowed',
    width: 36,
    height: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    background: 'rgba(20, 12, 8, 0.6)',
    border: `1px solid ${enabled ? 'var(--cc-border)' : 'var(--cc-border-faint)'}`,
    color: enabled ? accent : 'var(--cc-text-faint)',
    opacity: enabled ? 1 : 0.4,
  });

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => onAdjust(-1)}
          disabled={!canDecrease}
          title={decreaseTitle}
          style={buttonStyle(canDecrease, 'var(--cc-orange)')}
        >
          <Minus className="w-4 h-4" />
        </button>
        <div
          style={{
            background: 'rgba(20, 12, 8, 0.6)',
            border: '1px solid var(--cc-border)',
            color: 'var(--cc-text)',
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 800,
            fontFamily: 'var(--cc-display)',
            borderRadius: 6,
            minWidth: 60,
            padding: '4px 8px',
          }}
        >
          {score}
        </div>
        <button
          type="button"
          onClick={() => onAdjust(+1)}
          disabled={!canIncrease}
          title={increaseTitle}
          style={buttonStyle(canIncrease, 'var(--cc-teal)')}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div
        className="cc-label"
        style={{
          marginTop: 4,
          textAlign: 'center',
          fontSize: 10,
          color: 'var(--cc-text-faint)',
        }}
      >
        {score >= POINT_BUY_MAX ? 'Max' : `Next +1: ${nextCost} pt`}
      </div>
    </div>
  );
}
