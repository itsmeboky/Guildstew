import React, { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Dices } from "lucide-react";
import {
  getBackgroundList,
  getBackgroundById,
  getBackgroundAbilities,
  getBackgroundFeat,
  getBackgroundProficiencies,
} from "@/data/games/dnd5e_2024/backgrounds";
import { backgroundCopy } from "@/data/games/dnd5e_2024/copy";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";

// ============================================================================
// 2024 D&D 5e — abilities + background step. Prototype-aligned port of
// step-abilities.jsx with the 2024-specific Background section + ASI
// distribution flow appended in its own tome below the crests.
//
// In 2024, base scores are picked via Standard / Point Buy / Roll (no
// manual mode); ability bonuses come from the chosen background as a
// +2/+1 or +1/+1/+1 ASI distributed across the background's three
// designated abilities. Final scores = base + ASI, capped at 20.
// ============================================================================

const ABILITIES = [
  { key: "str", name: "Strength",     icon: "💪", color: "#E74C3C", desc: "Melee attacks, athletics, carrying capacity." },
  { key: "dex", name: "Dexterity",    icon: "🏃", color: "#52C77E", desc: "Ranged attacks, stealth, AC, initiative." },
  { key: "con", name: "Constitution", icon: "❤️", color: "#E5688E", desc: "Hit points, endurance, poison saves." },
  { key: "int", name: "Intelligence", icon: "📖", color: "#5DA8E8", desc: "Memory, magical theory, deduction." },
  { key: "wis", name: "Wisdom",       icon: "👁️", color: "#E8C054", desc: "Perception, insight, willpower." },
  { key: "cha", name: "Charisma",     icon: "💬", color: "#C9A3FF", desc: "Persuasion, performance, social magic." },
];

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const POINT_BUY_BUDGET = 27;
const POINT_BUY_MIN = 8;
const POINT_BUY_MAX = 15;
const SCORE_CAP_AT_CREATION = 20;

const METHODS = [
  { id: "standard", label: "Standard Array", desc: "15, 14, 13, 12, 10, 8 — assign to each score.", icon: "⚖️" },
  { id: "pointbuy", label: "Point Buy",      desc: "Spend 27 points (each 8–15). Balanced.",         icon: "⚙️" },
  { id: "roll",     label: "Roll 4d6",       desc: "Roll, drop the lowest. Lucky? Unlucky?",         icon: "🎲" },
];

function pointBuyCostToReach(score) {
  if (score <= 8) return 0;
  if (score <= 13) return score - 8;
  if (score <= 15) return 5 + (score - 13) * 2;
  return Infinity;
}
function pointBuyTotalSpent(scores) {
  return ABILITIES.reduce((sum, { key }) => sum + pointBuyCostToReach(scores[key] ?? 8), 0);
}
function abilityModifier(score) {
  return Math.floor((Number(score) - 10) / 2);
}
function roll4d6DropLowest() {
  const dice = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6));
  dice.sort((a, b) => b - a);
  return dice[0] + dice[1] + dice[2];
}

export default function AbilitiesStep2024({ characterData, updateCharacterData }) {
  const [method, setMethod] = useState(
    characterData._abilityGenerationMethod || "standard",
  );
  const [baseScores, setBaseScores] = useState(
    characterData._baseAttributes
      || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  );
  const [standardArrayAssignments, setStandardArrayAssignments] = useState(
    characterData._standardArrayAssignments || {},
  );
  const [rollPool, setRollPool] = useState(characterData._rollPool || null);
  const [rollAssignments, setRollAssignments] = useState(
    characterData._rollAssignments || {},
  );

  const [backgroundId, setBackgroundId] = useState(
    characterData.background?.backgroundId || "",
  );
  const [asiDistribution, setAsiDistribution] = useState(
    characterData.background?.asiDistribution || "+2/+1",
  );
  const [asiAssignment, setAsiAssignment] = useState(
    characterData.background?.asiAssignment || {},
  );

  const backgrounds = getBackgroundList();
  const selectedBackground = backgroundId ? getBackgroundById(backgroundId) : null;
  const bgAbilities = getBackgroundAbilities(backgroundId);
  const bgFeat = backgroundId ? getBackgroundFeat(backgroundId) : null;
  const bgProfs = backgroundId
    ? getBackgroundProficiencies(backgroundId)
    : { skills: [], tools: [] };

  const finalScores = useMemo(() => {
    const out = { ...baseScores };
    for (const [ability, bonus] of Object.entries(asiAssignment)) {
      out[ability] = Math.min(
        SCORE_CAP_AT_CREATION,
        (Number(out[ability]) || 0) + (Number(bonus) || 0),
      );
    }
    return out;
  }, [baseScores, asiAssignment]);

  useEffect(() => {
    updateCharacterData({
      _abilityGenerationMethod: method,
      _baseAttributes: baseScores,
      _standardArrayAssignments: standardArrayAssignments,
      _rollPool: rollPool,
      _rollAssignments: rollAssignments,
      attributes: finalScores,
      background: backgroundId
        ? {
            backgroundId,
            asiDistribution,
            asiAssignment,
            originFeat: bgFeat?.index || null,
            skillsGranted: bgProfs.skills,
            toolGranted: bgProfs.tools[0] || null,
          }
        : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, baseScores, finalScores, backgroundId, asiDistribution, asiAssignment]);

  // ── Score handlers ────────────────────────────────────────
  const handleStandardArrayPick = (abilityKey, value) => {
    const cleared = Object.fromEntries(
      Object.entries(standardArrayAssignments).filter(([, v]) => v !== value),
    );
    const next = { ...cleared, [abilityKey]: value };
    setStandardArrayAssignments(next);
    const newBase = {
      str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8,
      ...Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v])),
    };
    setBaseScores(newBase);
  };

  const adjustPointBuy = (abilityKey, delta) => {
    const current = baseScores[abilityKey] ?? 8;
    const next = current + delta;
    if (next < POINT_BUY_MIN || next > POINT_BUY_MAX) return;
    const trial = { ...baseScores, [abilityKey]: next };
    if (pointBuyTotalSpent(trial) > POINT_BUY_BUDGET) return;
    setBaseScores(trial);
  };

  const generateRolls = () => {
    const rolls = Array.from({ length: 6 }, roll4d6DropLowest);
    rolls.sort((a, b) => b - a);
    setRollPool(rolls);
    setRollAssignments({});
  };

  const handleRollPick = (abilityKey, idx) => {
    const cleared = Object.fromEntries(
      Object.entries(rollAssignments).filter(([, v]) => v !== idx),
    );
    const next = { ...cleared, [abilityKey]: idx };
    setRollAssignments(next);
    const newBase = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    for (const [k, v] of Object.entries(next)) newBase[k] = rollPool[v];
    setBaseScores(newBase);
  };

  const switchMethod = (id) => {
    setMethod(id);
    if (id === "standard") {
      setStandardArrayAssignments({});
      setBaseScores({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
    } else if (id === "pointbuy") {
      setBaseScores({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
    } else if (id === "roll") {
      // Don't auto-roll; wait for explicit Roll button
    }
  };

  // ── Background handlers ───────────────────────────────────
  const handleBackgroundSelect = (id) => {
    setBackgroundId(id);
    setAsiDistribution("+2/+1");
    setAsiAssignment({});
  };
  const setAsi21Assignment = (twoAbility, oneAbility) => {
    setAsiAssignment({ [twoAbility]: 2, [oneAbility]: 1 });
  };
  const setAsi111Assignment = () => {
    const next = {};
    for (const ab of bgAbilities) next[ab] = 1;
    setAsiAssignment(next);
  };

  const pointsRemaining = POINT_BUY_BUDGET - pointBuyTotalSpent(baseScores);

  return (
    <div>
      <StepHeader
        kicker="Chapter III · The Gift of Talents"
        title="Forge your fate"
        subtitle="Six numbers that decide what your hero can do. Plus the background that shaped them."
      />

      <Primer title="2024 D&D — what's different">
        Each ability has a <strong>score</strong> (3–20) and a <strong>modifier</strong>
        {' '}(–4 to +5). New in 2024: ability bonuses come from your{' '}
        <strong>background</strong>, not your species. Pick base scores below, then choose a
        background to spend its <strong>+2/+1</strong> or <strong>+1/+1/+1</strong> ASI.
      </Primer>

      <div className="tome" style={{ padding: '32px 36px', marginTop: 28 }}>
        <OrnateHeading>The Method</OrnateHeading>
        <MethodPicker method={method} onPick={switchMethod} />

        {method === 'roll' && (
          <RollSection
            rollPool={rollPool}
            rollAssignments={rollAssignments}
            onGenerate={generateRolls}
            onPick={handleRollPick}
          />
        )}

        <FleurDivider />

        <OrnateHeading>The Six Crests</OrnateHeading>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {ABILITIES.map((ability) => {
            const base = baseScores[ability.key] ?? 8;
            const bonus = asiAssignment[ability.key] || 0;
            const total = finalScores[ability.key] ?? base;
            return (
              <AbilityCrest
                key={ability.key}
                ability={ability}
                baseScore={base}
                bonus={bonus}
                totalScore={total}
                method={method}
                assignedValue={standardArrayAssignments[ability.key]}
                allAssignedScores={standardArrayAssignments}
                rollAssignedIndex={rollAssignments[ability.key]}
                rollPool={rollPool}
                rollAssignments={rollAssignments}
                onStandardAssign={(v) => handleStandardArrayPick(ability.key, parseInt(v, 10))}
                onPointBuyAdjust={(delta) => adjustPointBuy(ability.key, delta)}
                pointBuyRemaining={pointsRemaining}
              />
            );
          })}
        </div>

        {method === 'pointbuy' && <PointBuyTracker remaining={pointsRemaining} />}
        {method === 'standard' && (
          <ArrayTracker assignedScores={standardArrayAssignments} />
        )}
      </div>

      <div className="tome" style={{ padding: '32px 36px', marginTop: 20 }}>
        <OrnateHeading>The Background</OrnateHeading>
        <div
          className="italic-serif"
          style={{
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--text-dim)',
            marginBottom: 18,
          }}
        >
          Your background grants <strong style={{ color: 'var(--orange-soft)', fontStyle: 'normal' }}>
            +2/+1 or +1/+1/+1
          </strong> across its three designated abilities, two skill proficiencies, a tool
          proficiency, and an Origin Feat.
        </div>

        <BackgroundPicker
          backgrounds={backgrounds}
          selected={backgroundId}
          onPick={handleBackgroundSelect}
        />

        {selectedBackground && (
          <>
            <FleurDivider />
            <BackgroundDetail
              bg={selectedBackground}
              copy={backgroundCopy(selectedBackground.name) || {}}
              feat={bgFeat}
              skills={bgProfs.skills}
              tools={bgProfs.tools}
            />

            <FleurDivider />
            <AsiDistributionPicker
              abilities={bgAbilities}
              distribution={asiDistribution}
              assignment={asiAssignment}
              onDistribution={(d) => {
                setAsiDistribution(d);
                setAsiAssignment({});
              }}
              onAssign21={setAsi21Assignment}
              onAssign111={setAsi111Assignment}
            />
          </>
        )}
      </div>

      <div className="tome" style={{ padding: '32px 36px', marginTop: 20 }}>
        <OrnateHeading>Final Ability Scores</OrnateHeading>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {ABILITIES.map((a) => {
            const base = baseScores[a.key] ?? 8;
            const bonus = asiAssignment[a.key] || 0;
            const total = finalScores[a.key] ?? base;
            const mod = abilityModifier(total);
            return (
              <FinalScoreShield key={a.key} ability={a} base={base} bonus={bonus} total={total} mod={mod} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MethodPicker — 3 .pickable cards (Standard / Point Buy / Roll)
// ============================================================================
function MethodPicker({ method, onPick }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
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
            <div
              className="display"
              style={{ fontSize: 15, color: 'var(--text)', marginBottom: 4 }}
            >
              {m.label}
            </div>
            <div
              className="italic-serif"
              style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}
            >
              {m.desc}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// RollSection — generate + display the 4d6-drop-lowest pool
// ============================================================================
function RollSection({ rollPool, rollAssignments, onGenerate, onPick }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: '14px 18px',
        background: 'rgba(20, 12, 8, 0.5)',
        border: '1px solid var(--border)',
        borderRadius: 6,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="label">Roll Pool</div>
          <div
            className="italic-serif"
            style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}
          >
            Each value is 4d6 keep-highest-3. Click Roll, then assign in the crests below.
          </div>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Dices className="w-4 h-4" /> Roll 4d6 × 6
        </button>
      </div>

      {Array.isArray(rollPool) && rollPool.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {rollPool.map((n, i) => {
            const claimed = Object.values(rollAssignments).includes(i);
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
                  background: claimed ? 'rgba(55, 242, 209, 0.18)' : 'rgba(20, 12, 8, 0.7)',
                  color: claimed ? 'var(--teal)' : 'var(--text)',
                  border: `1px solid ${claimed ? 'var(--teal)' : 'var(--border-faint)'}`,
                  opacity: claimed ? 1 : 0.85,
                }}
              >
                {n}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AbilityCrest — hex-shielded modifier card with input variant per method
// ============================================================================
function AbilityCrest({
  ability, baseScore, bonus, totalScore, method,
  assignedValue, allAssignedScores,
  rollAssignedIndex, rollPool, rollAssignments,
  onStandardAssign, onPointBuyAdjust, pointBuyRemaining,
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
        borderColor: 'var(--border)',
      }}
    >
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
          ) : method === 'pointbuy' ? (
            <PointBuyControl
              score={baseScore}
              remaining={pointBuyRemaining}
              onAdjust={onPointBuyAdjust}
            />
          ) : method === 'roll' ? (
            <RollAssignControl
              ability={ability}
              rollPool={rollPool}
              rollAssignments={rollAssignments}
              assignedIndex={rollAssignedIndex}
              baseScore={baseScore}
            />
          ) : null}
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
              +{bonus} from background
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
          <div className="label" style={{ fontSize: 9, marginBottom: 0, color: ability.color }}>MOD</div>
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

function PointBuyControl({ score, remaining, onAdjust }) {
  const canDecrease = score > POINT_BUY_MIN;
  const stepCost = score >= 13 ? 2 : 1;
  const canIncrease = score < POINT_BUY_MAX && stepCost <= remaining;
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
      <div className="display" style={{ fontSize: 22, color: 'var(--text)', minWidth: 28, textAlign: 'center' }}>
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

function RollAssignControl({ ability, rollPool, assignedIndex, baseScore }) {
  if (!Array.isArray(rollPool) || rollPool.length === 0) {
    return (
      <div
        className="italic-serif"
        style={{
          fontSize: 12,
          color: 'var(--text-faint)',
          textAlign: 'center',
          padding: '6px 4px',
        }}
      >
        Roll first
      </div>
    );
  }
  // Assignment UI: just display the selected value (assignment happens
  // via the roll pool chips above the crests grid by clicking them).
  // For now the crest shows the baseScore value as a display number.
  return (
    <div
      style={{
        textAlign: 'center',
        fontSize: 22,
        fontWeight: 800,
        fontFamily: 'var(--display)',
        color: 'var(--text)',
        padding: '6px 4px',
      }}
    >
      {assignedIndex !== undefined ? rollPool[assignedIndex] : (baseScore || '—')}
    </div>
  );
}

// ============================================================================
// PointBuyTracker / ArrayTracker — bottom-of-tome status displays
// ============================================================================
function PointBuyTracker({ remaining }) {
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

function ArrayTracker({ assignedScores }) {
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
        Standard Array · pick each value in a crest above
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

// ============================================================================
// BackgroundPicker — 4-col chip grid
// ============================================================================
function BackgroundPicker({ backgrounds, selected, onPick }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
      {backgrounds.map((b) => {
        const active = selected === b.index;
        const copy = backgroundCopy(b.name) || {};
        return (
          <button
            key={b.index}
            type="button"
            onClick={() => onPick(b.index)}
            className={`pickable ${active ? 'selected' : ''}`}
            style={{
              padding: '12px 14px',
              textAlign: 'left',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div className="display" style={{ fontSize: 15, color: 'var(--text)' }}>
              {b.name}
            </div>
            <div
              className="italic-serif"
              style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.35 }}
            >
              {(copy.short || '').slice(0, 70)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function BackgroundDetail({ bg, copy, feat, skills, tools }) {
  return (
    <div
      style={{
        padding: '16px 20px',
        background: 'rgba(20, 12, 8, 0.5)',
        borderRadius: 4,
        borderLeft: '3px solid var(--gold)',
      }}
    >
      <div className="display" style={{ fontSize: 22, color: 'var(--orange-soft)', marginBottom: 6 }}>
        {bg.name}
      </div>
      {copy.description && (
        <p
          className="italic-serif"
          style={{ fontSize: 14, color: 'var(--text-dim)', margin: '8px 0 14px', lineHeight: 1.5 }}
        >
          {copy.description}
        </p>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          columnGap: 14,
          rowGap: 6,
          fontSize: 13,
        }}
      >
        {skills?.length > 0 && (
          <>
            <span className="label" style={{ color: 'var(--gold-soft)' }}>Skills</span>
            <span style={{ color: 'var(--text)' }}>{skills.join(' · ')}</span>
          </>
        )}
        {tools?.length > 0 && (
          <>
            <span className="label" style={{ color: 'var(--gold-soft)' }}>Tool</span>
            <span style={{ color: 'var(--text)' }}>{tools.join(' · ')}</span>
          </>
        )}
        {feat && (
          <>
            <span className="label" style={{ color: 'var(--gold-soft)' }}>Origin Feat</span>
            <span style={{ color: 'var(--text)' }}>{feat.name}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// AsiDistributionPicker — choose +2/+1 vs +1/+1/+1, then assign across
// the background's three designated abilities
// ============================================================================
function AsiDistributionPicker({
  abilities, distribution, assignment, onDistribution, onAssign21, onAssign111,
}) {
  if (!abilities || abilities.length === 0) {
    return (
      <div
        className="italic-serif"
        style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: 16 }}
      >
        Background ability data unavailable.
      </div>
    );
  }
  return (
    <div>
      <div className="label" style={{ marginBottom: 10 }}>
        Ability Score Improvement · distribution
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => onDistribution('+2/+1')}
          className={`pickable ${distribution === '+2/+1' ? 'selected' : ''}`}
          style={{ padding: '12px 14px', textAlign: 'center', color: 'inherit' }}
        >
          <div className="display" style={{ fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>+2 / +1</div>
          <div className="italic-serif" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Two abilities — one gets +2, one gets +1
          </div>
        </button>
        <button
          type="button"
          onClick={() => { onDistribution('+1/+1/+1'); onAssign111(); }}
          className={`pickable ${distribution === '+1/+1/+1' ? 'selected' : ''}`}
          style={{ padding: '12px 14px', textAlign: 'center', color: 'inherit' }}
        >
          <div className="display" style={{ fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>+1 / +1 / +1</div>
          <div className="italic-serif" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            All three abilities — each gets +1
          </div>
        </button>
      </div>

      {distribution === '+2/+1' && (
        <Asi21Grid
          abilities={abilities}
          assignment={assignment}
          onAssign={(two, one) => onAssign21(two, one)}
        />
      )}

      {distribution === '+1/+1/+1' && (
        <div
          className="italic-serif fade-in"
          style={{
            padding: '10px 14px',
            background: 'rgba(20, 12, 8, 0.5)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 13,
            color: 'var(--text-dim)',
          }}
        >
          Each ability automatically gets +1:{' '}
          <strong style={{ color: 'var(--text)' }}>
            {abilities.map((a) => a.toUpperCase()).join(' · ')}
          </strong>
          .
        </div>
      )}
    </div>
  );
}

function Asi21Grid({ abilities, assignment, onAssign }) {
  const twoTarget = Object.entries(assignment).find(([, v]) => v === 2)?.[0] || null;
  const oneTarget = Object.entries(assignment).find(([, v]) => v === 1)?.[0] || null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <div className="label" style={{ marginBottom: 6, color: 'var(--orange-soft)' }}>+2 goes to</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {abilities.map((ab) => (
            <button
              key={ab}
              type="button"
              onClick={() => onAssign(ab, oneTarget && oneTarget !== ab ? oneTarget : abilities.find((x) => x !== ab))}
              className={`pickable ${twoTarget === ab ? 'selected' : ''}`}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: 'inherit',
              }}
            >
              {ab}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="label" style={{ marginBottom: 6, color: 'var(--gold-soft)' }}>+1 goes to</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {abilities.map((ab) => {
            const disabled = twoTarget === ab;
            return (
              <button
                key={ab}
                type="button"
                onClick={() => twoTarget && onAssign(twoTarget, ab)}
                disabled={disabled || !twoTarget}
                className={`pickable ${oneTarget === ab ? 'selected-gold' : ''}`}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: 'inherit',
                  opacity: disabled || !twoTarget ? 0.4 : 1,
                  cursor: disabled || !twoTarget ? 'not-allowed' : 'pointer',
                }}
              >
                {ab}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FinalScoreShield — small hex-clipped tile showing base + bonus = total + mod
// ============================================================================
function FinalScoreShield({ ability, base, bonus, total, mod }) {
  return (
    <div
      style={{
        padding: '12px 8px',
        background: 'rgba(20, 12, 8, 0.5)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        textAlign: 'center',
      }}
    >
      <div className="label" style={{ color: ability.color, marginBottom: 4 }}>
        {ability.name.slice(0, 3)}
      </div>
      <div
        className="display"
        style={{ fontSize: 28, color: 'var(--text)', lineHeight: 1 }}
      >
        {total}
      </div>
      <div
        className="italic-serif"
        style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}
      >
        {base}
        {bonus > 0 && (
          <>
            {' '}
            <span style={{ color: 'var(--teal)' }}>+{bonus}</span>
          </>
        )}
      </div>
      <div
        className="display"
        style={{
          fontSize: 16,
          color: mod >= 0 ? 'var(--orange-soft)' : 'var(--danger)',
          marginTop: 4,
        }}
      >
        {mod >= 0 ? '+' : ''}{mod}
      </div>
    </div>
  );
}
