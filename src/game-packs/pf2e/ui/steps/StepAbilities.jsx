// Step V — Distribute Your Boosts. Verbatim from the prototype.

import React from 'react';
import { Star, Plus } from 'lucide-react';
import { toast } from 'sonner';
import GMWhisper from '../components/GMWhisper.jsx';
import CornerBrackets from '../components/CornerBrackets.jsx';
import RecommendedButton from '../components/RecommendedButton.jsx';
import RecommendedBadge from '../components/RecommendedBadge.jsx';
import { CLASSES, BOOST_BATCH_LEVELS } from '../../data/index.js';
import { ABILITIES } from '../../rules/constants.js';
import { getRecommended } from '../../content/recommendedBuilds.js';
import { STEPS } from '../../config/steps.js';

// Short-form ability codes used in recommendedBuilds → full ability names.
const ABILITY_BY_CODE = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

const StepAbilities = ({ data, update }) => {
  const level = data.level || 1;
  const activeBatches = BOOST_BATCH_LEVELS.filter(l => l <= level);

  // boostBatches: { 1: {Strength: 1, ...}, 5: {...}, ... }
  const boostBatches = data.boostBatches || { 1: {} };

  // Toggle a single boost in a batch. Side-effect: when the player
  // toggles off a recommended boost on batch 1, drop the ★ flag for
  // that ability in the same update so the recommendedFlags state
  // doesn't drift behind the actual batch contents. (Prior split into
  // two separate `update` calls left the second call to mutate state
  // computed from a render snapshot that hadn't seen the first call
  // yet — visible as a sticky REC badge on a since-removed boost.)
  const toggleBoost = (batchLvl, ability) => {
    const batch = boostBatches[batchLvl] || {};
    const current = batch[ability] || 0;
    const batchTotal = Object.values(batch).reduce((a, b) => a + b, 0);
    const flags = data.recommendedFlags || {};

    let nextBatch;
    let wasRecommended = false;
    if (current === 0 && batchTotal < 4) {
      nextBatch = { ...batch, [ability]: 1 };
    } else if (current === 1) {
      nextBatch = { ...batch };
      delete nextBatch[ability];
      wasRecommended = batchLvl === 1 && (flags.boosts || []).includes(ability);
    } else {
      return;
    }

    const patch = { boostBatches: { ...boostBatches, [batchLvl]: nextBatch } };
    if (wasRecommended) {
      patch.recommendedFlags = {
        ...flags,
        boosts: (flags.boosts || []).filter(x => x !== ability),
      };
    }
    update(patch);
  };

  // Kept as an alias so older call sites in this file (and the test
  // hooks the prototype shipped) still work.
  const setBatch = toggleBoost;

  // Ancestry/background accumulated boosts (only apply to base, not per batch)
  const accumulated = {
    Strength: data.background === 'soldier' || data.background === 'sailor' ? 1 : 0,
    Dexterity: (data.ancestry === 'elf' || data.ancestry === 'halfling' ? 1 : 0) + (['criminal', 'scout', 'sailor'].includes(data.background) ? 1 : 0),
    Constitution: (data.ancestry === 'dwarf' || data.ancestry === 'gnome' ? 1 : 0) + (data.background === 'soldier' ? 1 : 0),
    Intelligence: (data.ancestry === 'elf' ? 1 : 0) + (['acolyte', 'noble', 'scholar'].includes(data.background) ? 1 : 0),
    Wisdom: (data.ancestry === 'dwarf' || data.ancestry === 'halfling' ? 1 : 0) + (['scout', 'scholar'].includes(data.background) ? 1 : 0),
    Charisma: (data.ancestry === 'gnome' ? 1 : 0) + (data.background === 'noble' ? 1 : 0) - (data.ancestry === 'dwarf' ? 1 : 0),
  };

  const cls = CLASSES.find(c => c.id === data.class);
  const keyAbility = cls?.keyAbility?.[0];

  const recommended = getRecommended(cls?.slug);
  const recFlags = data.recommendedFlags || {};

  const applyRecommendedBoosts = () => {
    const free = recommended?.boosts?.free;
    if (!Array.isArray(free) || free.length === 0) return;
    const nextBatch1 = {};
    const recAbilities = [];
    for (const code of free) {
      const ab = ABILITY_BY_CODE[code];
      if (ab) {
        nextBatch1[ab] = 1;
        recAbilities.push(ab);
      }
    }
    update({
      boostBatches: { ...boostBatches, 1: nextBatch1 },
      recommendedFlags: { ...recFlags, boosts: recAbilities },
    });
    toast.success('Recommended boosts applied', { description: recommended.rationale });
  };

  // Final score = base + (accumulated × 2) + sum of all batch boosts × 2 (or +1 above 18)
  const computeFinal = (ab) => {
    let score = 10 + (accumulated[ab] || 0) * 2;
    for (const lvl of activeBatches) {
      const free = boostBatches[lvl]?.[ab] || 0;
      score += free >= 1 && score >= 18 ? 1 : free * 2;
    }
    return score;
  };

  return (
    <div>
      <div className="mb-6">
        <p className="font-display text-xs tracking-[0.3em] text-pf-brass uppercase mb-1">Step the Fifth</p>
        <h2 className="font-display text-3xl text-pf-bone">Distribute Your Boosts</h2>
      </div>

      <GMWhisper>{STEPS[4].whisper}</GMWhisper>

      {keyAbility && (
        <GMWhisper tone="tip">
          Your class's key ability is <strong className="text-pf-brass not-italic">{keyAbility}</strong>. Spend at least one free boost on it in the level-1 batch.
        </GMWhisper>
      )}

      {/* === VOLUNTARY FLAWS — bonus boost in exchange for two extra flaws === */}
      {data.houseRules?.voluntaryFlaws && (
        <div className="relative bg-pf-bg-card border border-pf-oxblood/40 p-4 mb-5">
          <CornerBrackets active />
          <p className="font-display text-[10px] tracking-[0.25em] text-pf-oxblood-glow uppercase mb-2">⊕ Voluntary Flaws (Variant)</p>
          <p className="font-body text-xs text-pf-parchment mb-3 leading-relaxed">
            Take two voluntary flaws (no two on the same ability). You gain one bonus level-1 free boost. Pick the two flawed abilities and the bonus boost recipient below.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
            {ABILITIES.map(ab => {
              const flaws = data.voluntaryFlaws || [];
              const isFlawed = flaws.includes(ab);
              const canAdd = flaws.length < 2;
              return (
                <button
                  key={ab}
                  onClick={() => {
                    if (isFlawed) update({ voluntaryFlaws: flaws.filter(f => f !== ab) });
                    else if (canAdd) update({ voluntaryFlaws: [...flaws, ab] });
                  }}
                  disabled={!isFlawed && !canAdd}
                  className={`px-2 py-1.5 border text-xs font-display tracking-wider uppercase transition-all
                              ${isFlawed ? 'border-pf-oxblood bg-pf-oxblood/10 text-pf-bone'
                                : !canAdd ? 'border-pf-brass-dim/20 text-pf-stone/40 cursor-not-allowed'
                                : 'border-pf-brass-dim/30 text-pf-parchment hover:border-pf-brass-dim'}`}
                >
                  {ab.slice(0, 3)}
                </button>
              );
            })}
          </div>
          <p className="font-mono text-[10px] text-pf-stone mb-2">
            Flaws: {(data.voluntaryFlaws || []).join(', ') || 'none'} ({(data.voluntaryFlaws || []).length}/2)
          </p>
          {(data.voluntaryFlaws?.length === 2) && (
            <>
              <p className="font-display text-[9px] tracking-[0.2em] text-pf-brass uppercase mb-1.5">Bonus Boost — Choose Recipient</p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                {ABILITIES.filter(ab => !data.voluntaryFlaws.includes(ab)).map(ab => {
                  const active = data.voluntaryFlawBoost === ab;
                  return (
                    <button
                      key={ab}
                      onClick={() => update({ voluntaryFlawBoost: active ? null : ab })}
                      className={`px-2 py-1.5 border text-xs font-display tracking-wider uppercase transition-all
                                  ${active ? 'border-pf-sage bg-pf-sage/10 text-pf-bone' : 'border-pf-brass-dim/30 text-pf-parchment hover:border-pf-brass-dim'}`}
                    >
                      + {ab.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* === DUAL-CLASS — second class in parallel === */}
      {data.houseRules?.dualClass && (
        <div className="relative bg-pf-bg-card border border-pf-brass/40 p-4 mb-5">
          <CornerBrackets active />
          <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-2">⊕ Dual-Class (Variant)</p>
          <p className="font-body text-xs text-pf-parchment mb-3 leading-relaxed">
            Pick a second class. Your character levels both in parallel, gaining HP/proficiencies/feats from both. High-power, GM-permission-only.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {CLASSES.filter(c => c.id !== data.class).map(c => {
              const active = data.secondClass === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => update({ secondClass: active ? null : c.id })}
                  className={`px-2 py-1.5 border text-xs font-display tracking-wider uppercase transition-all
                              ${active ? 'border-pf-brass bg-pf-brass/10 text-pf-bone' : 'border-pf-brass-dim/30 text-pf-parchment hover:border-pf-brass-dim'}`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* === GRADUAL BOOSTS — spread each batch over 4 levels === */}
      {data.houseRules?.gradualBoosts && (
        <div className="relative bg-pf-bg-card border border-pf-brass-dim/40 p-4 mb-5">
          <CornerBrackets />
          <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-2">⊕ Gradual Boosts (Variant)</p>
          <p className="font-body text-xs text-pf-parchment leading-relaxed">
            Instead of taking 4 boosts at one batch level, you take 1 boost at each of the 4 levels in the boost window (e.g., level 5–8 instead of level 5). The same total — just paced. Foundry import handles the per-level distribution; UI behaves identically below.
          </p>
        </div>
      )}

      {/* Current scores summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {ABILITIES.map(ab => {
          const final = computeFinal(ab);
          const isKey = ab === keyAbility;
          return (
            <div key={ab} className={`relative p-3 bg-pf-bg-card border ${isKey ? 'border-pf-brass-dim/60' : 'border-pf-brass-dim/30'}`}>
              {isKey && <CornerBrackets active />}
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-pf-stone tracking-wider">{ab.slice(0, 3).toUpperCase()}</span>
                {isKey && <Star size={10} className="text-pf-brass fill-pf-brass" />}
              </div>
              <div className="font-mono text-3xl text-pf-bone leading-none my-1">{final}</div>
              <div className="font-display text-[10px] tracking-wider text-pf-stone uppercase">{ab}</div>
            </div>
          );
        })}
      </div>

      {/* Boost batches — one per batch level <= character level */}
      <div className="space-y-5">
        {activeBatches.map(batchLvl => {
          const batch = boostBatches[batchLvl] || {};
          const batchTotal = Object.values(batch).reduce((a, b) => a + b, 0);
          const remaining = 4 - batchTotal;

          return (
            <div key={batchLvl} className="relative bg-pf-bg-card border border-pf-brass-dim/30 p-5">
              <CornerBrackets active={remaining === 0} />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-display text-xl text-pf-bone">
                    {batchLvl === 1 ? 'Starting Boosts' : `Level ${batchLvl} Boosts`}
                  </h4>
                  <p className="text-[11px] text-pf-stone font-body italic mt-0.5">
                    {batchLvl === 1
                      ? 'The four free boosts every character receives at level 1.'
                      : `Every character at level ${batchLvl} gains four more free boosts.`} No double-boosting in this batch.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {batchLvl === 1 && (
                    <RecommendedButton
                      onClick={applyRecommendedBoosts}
                      disabled={!recommended?.boosts?.free}
                    />
                  )}
                  <span className={`font-display text-3xl tracking-wider ${remaining === 0 ? 'text-pf-sage' : 'text-pf-brass'}`}>
                    {remaining}<span className="text-pf-stone text-base">/4</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {ABILITIES.map(ab => {
                  const picked = (batch[ab] || 0) > 0;
                  const canPick = remaining > 0 || picked;
                  // REC marks the recommendation, not the selection —
                  // stays lit on the recommended ability even if the
                  // player toggles it off afterward (lets them re-apply
                  // by clicking back on the same tile).
                  const isRec = batchLvl === 1 && (recFlags.boosts || []).includes(ab);
                  return (
                    <button
                      key={ab}
                      type="button"
                      onClick={() => toggleBoost(batchLvl, ab)}
                      disabled={!canPick}
                      title={!canPick ? `Batch full (${batchTotal}/4) — remove one to swap` : undefined}
                      className={`relative px-3 py-2 bg-pf-bg-elev/40 border text-left transition-all
                                  ${picked ? 'border-pf-brass bg-pf-brass/10' : canPick ? 'border-pf-brass-dim/30 hover:border-pf-brass-dim' : 'border-pf-brass-dim/20 opacity-50 cursor-not-allowed'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-pf-stone tracking-wider">{ab.slice(0, 3).toUpperCase()}</span>
                        {picked && <Plus size={10} className="text-pf-brass" />}
                      </div>
                      <div className={`font-display text-xs tracking-wider mt-0.5 ${picked ? 'text-pf-bone' : 'text-pf-parchment'}`}>
                        {ab}
                      </div>
                      {isRec && (
                        <div className="absolute top-1 right-1">
                          <RecommendedBadge />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepAbilities;
