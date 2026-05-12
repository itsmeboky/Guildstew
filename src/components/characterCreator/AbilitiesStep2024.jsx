import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dices, Calculator, Sparkles, Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import {
  getBackgroundList,
  getBackgroundById,
  getBackgroundAbilities,
  getBackgroundFeat,
  getBackgroundProficiencies,
} from "@/data/games/dnd5e_2024/backgrounds";
import InfoTip from "@/components/characterCreator/InfoTip";

/**
 * 2024 D&D 5e — abilities + background step.
 *
 * Three sections:
 *   1. Base ability scores via Standard Array / Point Buy / Rolling
 *   2. Background — selects 1 of 4 SRD-shipped backgrounds, then
 *      applies +2/+1 or +1/+1/+1 ASI across the three abilities the
 *      background's `ability_scores` field designates.
 *   3. Final scores display — base + ASI = final, capped at 20.
 *
 * Persistence:
 *   characterData._baseAttributes  = { str, dex, con, int, wis, cha }
 *   characterData.attributes       = base + background ASI (the
 *                                    canonical "final scores" field
 *                                    every downstream step reads)
 *   characterData.background       = { backgroundId, asiDistribution,
 *                                      asiAssignment, originFeat,
 *                                      skillsGranted, toolGranted }
 *
 * Background-granted skills are reconciled with class-granted skills
 * in SkillsStep2024 (Build Commit 4) — that step disables any class
 * skill the background already covers to prevent double-counting.
 */

const ABILITIES = [
  { key: "str", name: "Strength" },
  { key: "dex", name: "Dexterity" },
  { key: "con", name: "Constitution" },
  { key: "int", name: "Intelligence" },
  { key: "wis", name: "Wisdom" },
  { key: "cha", name: "Charisma" },
];

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const POINT_BUY_BUDGET = 27;
const POINT_BUY_MIN = 8;
const POINT_BUY_MAX = 15;
const SCORE_CAP_AT_CREATION = 20;

function pointBuyCostToReach(score) {
  if (score <= 8) return 0;
  if (score <= 13) return score - 8;
  if (score <= 15) return 5 + (score - 13) * 2;
  return Infinity;
}

function pointBuyTotalSpent(scores) {
  return ABILITIES.reduce(
    (sum, { key }) => sum + pointBuyCostToReach(scores[key]),
    0,
  );
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
  // ── Method selection + base scores ────────────────────────
  const [method, setMethod] = useState(
    characterData._abilityGenerationMethod || "standard",
  );
  const [baseScores, setBaseScores] = useState(
    characterData._baseAttributes || {
      str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    },
  );
  const [standardArrayAssignments, setStandardArrayAssignments] = useState(
    characterData._standardArrayAssignments || {},
  );
  const [rollPool, setRollPool] = useState(
    characterData._rollPool || null, // array of 6 numbers when generated
  );
  const [rollAssignments, setRollAssignments] = useState(
    characterData._rollAssignments || {},
  );

  // ── Background + ASI ──────────────────────────────────────
  const [backgroundId, setBackgroundId] = useState(
    characterData.background?.backgroundId || "",
  );
  const [asiDistribution, setAsiDistribution] = useState(
    characterData.background?.asiDistribution || "+2/+1",
  );
  const [asiAssignment, setAsiAssignment] = useState(
    characterData.background?.asiAssignment || {},
  );

  // ── Derived ───────────────────────────────────────────────
  const backgrounds = getBackgroundList();
  const selectedBackground = backgroundId ? getBackgroundById(backgroundId) : null;
  const bgAbilities = getBackgroundAbilities(backgroundId);
  const bgFeat = backgroundId ? getBackgroundFeat(backgroundId) : null;
  const bgProfs = backgroundId ? getBackgroundProficiencies(backgroundId) : { skills: [], tools: [] };

  // Final scores = base + ASI assignment, capped at 20.
  const finalScores = React.useMemo(() => {
    const out = { ...baseScores };
    for (const [ability, bonus] of Object.entries(asiAssignment)) {
      out[ability] = Math.min(SCORE_CAP_AT_CREATION, (Number(out[ability]) || 0) + (Number(bonus) || 0));
    }
    return out;
  }, [baseScores, asiAssignment]);

  // Persist whenever base scores, background, or ASI changes.
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

  // ── Handlers — base score methods ─────────────────────────

  const handleStandardArrayPick = (abilityKey, value) => {
    // Remove this value from anything else it was assigned to.
    const cleared = Object.fromEntries(
      Object.entries(standardArrayAssignments).filter(([, v]) => v !== value),
    );
    const next = { ...cleared, [abilityKey]: value };
    setStandardArrayAssignments(next);
    // Reflect into baseScores
    const newBase = {
      str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8,
      ...Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v])),
    };
    setBaseScores({ ...baseScores, ...newBase });
  };

  const adjustPointBuy = (abilityKey, delta) => {
    const current = baseScores[abilityKey];
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
    for (const [k, v] of Object.entries(next)) {
      newBase[k] = rollPool[v];
    }
    setBaseScores({ ...baseScores, ...newBase });
  };

  // ── Handlers — background ASI ─────────────────────────────

  const handleBackgroundSelect = (id) => {
    setBackgroundId(id);
    // Default to +2/+1 distribution; reset assignment.
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

  const pointsSpent = pointBuyTotalSpent(baseScores);

  // ── Render ────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto"
    >
      <div className="bg-[#2A3441] rounded-xl p-6 mb-6 border-2 border-[#1E2430]">
        <h2 className="text-2xl font-bold text-[#FFC6AA] mb-2 flex items-center gap-2">
          Abilities & Background
          <Badge className="bg-[#37F2D1] text-[#1E2430] text-[10px] font-black">
            2024
          </Badge>
        </h2>
        <p className="text-white/80 text-sm">
          Generate base scores (Standard Array, Point Buy, or Rolling),
          then pick a background. Your background grants ability score
          increases (+2/+1 or +1/+1/+1 across three abilities), two
          skills, one tool, an Origin feat, and starting equipment.
        </p>
      </div>

      {/* Method picker */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[#FFC6AA] mb-3">Base scores</h3>
        <div className="flex gap-2 flex-wrap mb-4">
          {[
            { id: "standard", label: "Standard Array", icon: Calculator },
            { id: "pointbuy", label: "Point Buy (27)", icon: Plus },
            { id: "roll", label: "Roll 4d6", icon: Dices },
          ].map(({ id, label, icon: Icon }) => {
            const active = method === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMethod(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                  active
                    ? "bg-[#37F2D1] text-[#1E2430] border-[#37F2D1]"
                    : "bg-[#2A3441] text-white/70 border-[#1E2430] hover:border-[#37F2D1]/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {method === "standard" && (
          <div className="bg-[#2A3441] rounded-xl p-5 border-2 border-[#1E2430]">
            <p className="text-xs text-white/60 mb-3">
              Assign each value [15, 14, 13, 12, 10, 8] to a different ability.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ABILITIES.map((a) => (
                <div key={a.key} className="bg-[#1E2430]/40 rounded p-3">
                  <p className="text-xs text-white/60 uppercase mb-2">{a.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {STANDARD_ARRAY.map((v) => {
                      const claimedBy = Object.entries(standardArrayAssignments).find(
                        ([, value]) => value === v,
                      )?.[0];
                      const isHere = claimedBy === a.key;
                      const isUsed = !!claimedBy && !isHere;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => !isUsed && handleStandardArrayPick(a.key, v)}
                          disabled={isUsed}
                          className={`w-9 h-9 rounded text-sm font-bold ${
                            isHere
                              ? "bg-[#37F2D1] text-[#1E2430]"
                              : isUsed
                              ? "bg-[#1E2430]/40 text-white/30"
                              : "bg-[#2A3441] text-white hover:bg-[#37F2D1]/20"
                          }`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {method === "pointbuy" && (
          <div className="bg-[#2A3441] rounded-xl p-5 border-2 border-[#1E2430]">
            <p className="text-xs text-white/60 mb-3">
              27 points to spend. Range 8–15. Costs: 8=0, 9–13=1pt each,
              14–15=2pt each.
              <span className="ml-3 text-[#37F2D1] font-semibold">
                {POINT_BUY_BUDGET - pointsSpent} / {POINT_BUY_BUDGET} points remaining
              </span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ABILITIES.map((a) => (
                <div key={a.key} className="bg-[#1E2430]/40 rounded p-3 flex items-center justify-between">
                  <span className="text-white text-sm font-semibold">{a.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustPointBuy(a.key, -1)}
                      disabled={baseScores[a.key] <= POINT_BUY_MIN}
                      className="w-7 h-7 rounded bg-[#1E2430] text-white disabled:opacity-30 hover:bg-[#37F2D1]/20"
                    >
                      <Minus className="w-3 h-3 mx-auto" />
                    </button>
                    <span className="text-[#37F2D1] font-bold text-lg w-6 text-center">
                      {baseScores[a.key]}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustPointBuy(a.key, 1)}
                      disabled={baseScores[a.key] >= POINT_BUY_MAX}
                      className="w-7 h-7 rounded bg-[#1E2430] text-white disabled:opacity-30 hover:bg-[#37F2D1]/20"
                    >
                      <Plus className="w-3 h-3 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {method === "roll" && (
          <div className="bg-[#2A3441] rounded-xl p-5 border-2 border-[#1E2430]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-white/60">
                Roll 4d6, drop lowest, six times. Assign each roll to an ability.
              </p>
              <Button
                onClick={generateRolls}
                size="sm"
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
              >
                <Dices className="w-4 h-4 mr-1" />
                {rollPool ? "Re-roll" : "Roll"}
              </Button>
            </div>
            {rollPool && (
              <>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {rollPool.map((roll, idx) => {
                    const claimedBy = Object.entries(rollAssignments).find(
                      ([, v]) => v === idx,
                    )?.[0];
                    return (
                      <div
                        key={idx}
                        className={`px-3 py-2 rounded text-sm font-bold ${
                          claimedBy
                            ? "bg-[#37F2D1]/20 text-[#37F2D1] border border-[#37F2D1]/40"
                            : "bg-[#1E2430] text-white border border-white/10"
                        }`}
                      >
                        {roll}
                        {claimedBy && (
                          <span className="ml-2 text-[10px] text-white/60 uppercase">
                            → {claimedBy}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ABILITIES.map((a) => (
                    <div key={a.key} className="bg-[#1E2430]/40 rounded p-3">
                      <p className="text-xs text-white/60 uppercase mb-2">{a.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {rollPool.map((roll, idx) => {
                          const claimedBy = Object.entries(rollAssignments).find(
                            ([, v]) => v === idx,
                          )?.[0];
                          const isHere = claimedBy === a.key;
                          const isUsed = !!claimedBy && !isHere;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => !isUsed && handleRollPick(a.key, idx)}
                              disabled={isUsed}
                              className={`w-9 h-9 rounded text-sm font-bold ${
                                isHere
                                  ? "bg-[#37F2D1] text-[#1E2430]"
                                  : isUsed
                                  ? "bg-[#1E2430]/40 text-white/30"
                                  : "bg-[#2A3441] text-white hover:bg-[#37F2D1]/20"
                              }`}
                            >
                              {roll}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {!rollPool && (
              <p className="text-sm text-white/50 italic">
                Click <span className="font-semibold">Roll</span> to generate
                six values.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Background picker */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[#FFC6AA] mb-3 flex items-center gap-2">
          Background
          <InfoTip width="w-80">
            Backgrounds grant +2/+1 or +1/+1/+1 across the three abilities
            they list, two skills, one tool, an Origin feat, and starting
            equipment.
          </InfoTip>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {backgrounds.map((bg) => {
            const isSelected = backgroundId === bg.index;
            const abilityLabels = (bg.ability_scores || [])
              .map((a) => a.name)
              .join(" / ");
            return (
              <button
                key={bg.index}
                type="button"
                onClick={() => handleBackgroundSelect(bg.index)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "bg-[#2A3441] border-[#37F2D1]"
                    : "bg-[#2A3441]/50 border-[#1E2430] hover:border-[#37F2D1]/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-bold">{bg.name}</h4>
                  {isSelected && <Sparkles className="w-4 h-4 text-[#37F2D1]" />}
                </div>
                <p className="text-xs text-white/60">
                  Abilities: <span className="text-[#37F2D1]">{abilityLabels}</span>
                </p>
                {bg.feat?.name && (
                  <p className="text-xs text-white/60 mt-1">
                    Feat:{" "}
                    <span className="text-[#5B4B9E]">
                      {bg.feat.name}
                      {bg.feat.note && (
                        <span className="text-white/40 ml-1">({bg.feat.note})</span>
                      )}
                    </span>
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {selectedBackground && (
          <div className="bg-[#2A3441] rounded-xl p-5 border-2 border-[#5B4B9E]/40">
            <h4 className="text-sm font-bold text-[#FFC6AA] mb-3">
              Ability Score Increase — {selectedBackground.name}
            </h4>
            <p className="text-xs text-white/60 mb-3">
              Pick how the +3 total ASI splits across{" "}
              {bgAbilities.map((a) => a.toUpperCase()).join(" / ")}.
            </p>
            <div className="flex gap-2 mb-4">
              {["+2/+1", "+1/+1/+1"].map((dist) => (
                <button
                  key={dist}
                  type="button"
                  onClick={() => {
                    setAsiDistribution(dist);
                    setAsiAssignment(dist === "+1/+1/+1"
                      ? Object.fromEntries(bgAbilities.map((a) => [a, 1]))
                      : {});
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                    asiDistribution === dist
                      ? "bg-[#5B4B9E]/30 text-white border-[#5B4B9E]"
                      : "bg-[#2A3441] text-white/70 border-[#1E2430] hover:border-[#5B4B9E]/50"
                  }`}
                >
                  {dist}
                </button>
              ))}
            </div>

            {asiDistribution === "+2/+1" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-white/60 uppercase mb-2">+2 goes to</p>
                  <div className="flex gap-2 flex-wrap">
                    {bgAbilities.map((ab) => {
                      const isSelected = asiAssignment[ab] === 2;
                      return (
                        <button
                          key={ab}
                          type="button"
                          onClick={() => {
                            const oneAb = Object.entries(asiAssignment).find(([k, v]) => v === 1 && k !== ab)?.[0];
                            if (oneAb) setAsi21Assignment(ab, oneAb);
                            else setAsiAssignment({ [ab]: 2 });
                          }}
                          className={`px-3 py-2 rounded text-sm font-bold ${
                            isSelected
                              ? "bg-[#37F2D1] text-[#1E2430]"
                              : "bg-[#1E2430] text-white hover:bg-[#37F2D1]/20"
                          }`}
                        >
                          {ab.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/60 uppercase mb-2">+1 goes to</p>
                  <div className="flex gap-2 flex-wrap">
                    {bgAbilities.map((ab) => {
                      const twoAb = Object.entries(asiAssignment).find(([, v]) => v === 2)?.[0];
                      const isSelected = asiAssignment[ab] === 1;
                      const isPlusTwo = twoAb === ab;
                      return (
                        <button
                          key={ab}
                          type="button"
                          onClick={() => {
                            if (isPlusTwo) return;
                            if (twoAb) setAsi21Assignment(twoAb, ab);
                            else setAsiAssignment({ [ab]: 1 });
                          }}
                          disabled={isPlusTwo}
                          className={`px-3 py-2 rounded text-sm font-bold ${
                            isSelected
                              ? "bg-[#37F2D1] text-[#1E2430]"
                              : isPlusTwo
                              ? "bg-[#1E2430]/40 text-white/30"
                              : "bg-[#1E2430] text-white hover:bg-[#37F2D1]/20"
                          }`}
                        >
                          {ab.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/70">
              <div>
                <p className="font-semibold text-white/80 mb-1">Skills granted</p>
                <p>{bgProfs.skills.join(", ") || "—"}</p>
              </div>
              <div>
                <p className="font-semibold text-white/80 mb-1">Tool granted</p>
                <p>{bgProfs.tools.join(", ") || "—"}</p>
              </div>
              {bgFeat && (
                <div className="col-span-2">
                  <p className="font-semibold text-white/80 mb-1">Origin Feat</p>
                  <p>
                    <span className="text-[#5B4B9E] font-semibold">{bgFeat.name}</span>
                    {bgFeat.note && (
                      <span className="text-white/40 ml-2">({bgFeat.note})</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Final scores */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-[#FFC6AA] mb-3">Final ability scores</h3>
        <div className="bg-[#2A3441] rounded-xl p-5 border-2 border-[#37F2D1]/40">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {ABILITIES.map((a) => {
              const base = baseScores[a.key];
              const bonus = asiAssignment[a.key] || 0;
              const final = finalScores[a.key];
              const mod = abilityModifier(final);
              return (
                <div key={a.key} className="bg-[#1E2430]/40 rounded p-3 text-center">
                  <p className="text-xs text-white/60 uppercase mb-1">{a.name}</p>
                  <p className="text-2xl font-bold text-[#37F2D1]">{final}</p>
                  <p className="text-xs text-white/40 mt-1">
                    {base}{bonus > 0 && (
                      <span className="text-[#5B4B9E]"> + {bonus}</span>
                    )}
                  </p>
                  <p className="text-sm text-white/70 mt-1">
                    {mod >= 0 ? "+" : ""}{mod}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
