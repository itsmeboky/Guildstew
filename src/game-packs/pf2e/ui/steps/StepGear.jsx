// Step VIII — Steel and Coin (class kit + custom shop + loadout).
// Verbatim from the prototype.

import React, { useState } from 'react';
import { Compass, Check, Plus, X, Star } from 'lucide-react';
import GMWhisper from '../components/GMWhisper.jsx';
import CornerBrackets from '../components/CornerBrackets.jsx';
import ComplexityBadge from '../components/ComplexityBadge.jsx';
import {
  ANCESTRIES,
  CLASSES,
  CLASS_KITS,
  CLASS_DETAILS,
  EQUIPMENT_CATALOG,
  ANCESTRY_GRANTED_ITEMS,
  STARTING_WEALTH_BY_LEVEL,
} from '../../data/index.js';
import { isRecommendedForClass } from '../../content/recommendedBuilds.js';
import { ARMOR_TYPE_FROM_NAME } from '../../rules/armor-classifier.js';

const bulkValue = (b) => b === 'L' ? 0.1 : (b === '—' || b === 0) ? 0 : (typeof b === 'number' ? b : 0);

const computeBulk = (items) =>
  items.reduce((sum, item) => sum + bulkValue(item.bulk) * (item.qty || 1), 0);

const formatBulk = (n) => {
  const total = Math.round(n * 10) / 10;
  const whole = Math.floor(total);
  const lights = Math.round((total - whole) * 10);
  if (whole === 0 && lights === 0) return '0';
  if (whole === 0) return `${lights}L`;
  if (lights === 0) return `${whole}`;
  return `${whole} + ${lights}L`;
};

const formatPrice = (sp) => {
  if (sp <= 0) return 'Free';
  const gp = Math.floor(sp / 10);
  const remSp = sp % 10;
  if (gp === 0) return `${remSp} sp`;
  if (remSp === 0) return `${gp} gp`;
  return `${gp} gp ${remSp} sp`;
};

const computeStrBoosts = (data) => {
  let s = 0;
  const ancestry = ANCESTRIES.find(a => a.slug === data.ancestry);
  if (ancestry) {
    if (ancestry.boosts.includes('Strength')) s++;
    if (ancestry.flaws.includes('Strength')) s--;
  }
  if (data.background === 'soldier' || data.background === 'sailor') s++;
  const cls = CLASSES.find(c => c.slug === data.class);
  s += (cls?.keyAbility?.includes('Strength') ? 1 : 0); // class key boost counted once
  const batches = data.boostBatches || {};
  for (const b of Object.values(batches)) s += (b.Strength || 0);
  return s;
};

const StepGear = ({ data, update }) => {
  const cls = CLASSES.find(c => c.slug === data.class);
  const ancestry = ANCESTRIES.find(a => a.slug === data.ancestry);
  const kit = cls ? CLASS_KITS[cls.id] : null;
  const granted = ANCESTRY_GRANTED_ITEMS[ancestry?.id] || [];
  const loadout = data.loadout || [];

  const [activeTab, setActiveTab] = useState('kit');
  const [shopCategory, setShopCategory] = useState('weapons');
  const [recommendedOnly, setRecommendedOnly] = useState(false);

  const strBoosts = computeStrBoosts(data);
  const strScore = 10 + strBoosts * 2;
  const strMod = Math.floor((strScore - 10) / 2);
  const bulkLimit = 5 + strMod;
  const encumberedAt = bulkLimit;             // encumbered when carrying > limit
  const immobileAt = 10 + strMod;             // immobile threshold

  const startingGp = STARTING_WEALTH_BY_LEVEL[data.level || 1] || 15;
  const startingSp = startingGp * 10;

  const totalSpentSp = loadout.reduce((sum, item) => sum + item.priceSp * (item.qty || 1), 0);
  const remainingSp = startingSp - totalSpentSp;
  const purchasedBulk = computeBulk(loadout);
  const grantedBulk = computeBulk(granted);
  const totalBulk = purchasedBulk + grantedBulk;
  const isEncumbered = totalBulk > encumberedAt;
  const isImmobile = totalBulk >= immobileAt;
  const isOverBudget = remainingSp < 0;

  // Armor proficiency check — flag items the character can't legally wear
  const classProfs = cls ? CLASS_DETAILS[cls.id]?.proficiencies : null;
  const checkArmorProf = (itemName) => {
    const armorType = ARMOR_TYPE_FROM_NAME(itemName);
    if (!armorType || !classProfs?.armor) return { ok: true };
    const hasProf = classProfs.armor[armorType] || armorType === 'unarmored';
    return { ok: !!hasProf, type: armorType };
  };

  // Detect kit/class mismatch — does the kit include armor outside class proficiency?
  const kitWarnings = kit ? kit.items
    .map(i => ({ item: i, check: checkArmorProf(i.name) }))
    .filter(x => !x.check.ok) : [];

  const kitTaken = cls && data.kitTaken === cls.id;

  const takeKit = () => {
    if (!kit) return;
    update({
      loadout: kit.items.map(i => ({ ...i, qty: 1 })),
      kitTaken: cls.id,
    });
  };

  const addToLoadout = (item) => {
    const existing = loadout.findIndex(i => i.name === item.name);
    if (existing >= 0) {
      const next = [...loadout];
      next[existing] = { ...next[existing], qty: (next[existing].qty || 1) + 1 };
      update({ loadout: next, kitTaken: null });
    } else {
      update({ loadout: [...loadout, { ...item, qty: 1 }], kitTaken: null });
    }
  };

  const decrementItem = (name) => {
    const i = loadout.findIndex(item => item.name === name);
    if (i < 0) return;
    const item = loadout[i];
    if ((item.qty || 1) <= 1) {
      update({ loadout: loadout.filter(it => it.name !== name), kitTaken: null });
    } else {
      const next = [...loadout];
      next[i] = { ...item, qty: item.qty - 1 };
      update({ loadout: next, kitTaken: null });
    }
  };

  const clearAll = () => update({ loadout: [], kitTaken: null });

  return (
    <div>
      <div className="mb-6">
        <p className="font-display text-xs tracking-[0.3em] text-pf-brass uppercase mb-1">Step the Eighth</p>
        <h2 className="font-display text-3xl text-pf-bone">Steel and Coin</h2>
      </div>

      <GMWhisper>
        A level-{data.level || 1} character starts with <strong className="text-pf-brass not-italic">{startingGp} gp</strong> for gear. New players should take the recommended class kit — it covers the essentials and saves twenty minutes of shopping. Veterans can browse the Custom Shop tab below.{data.level >= 3 ? ' At this level, your GM also typically grants level-appropriate magical items beyond the gold pool.' : ''}
      </GMWhisper>

      {/* Budget + Bulk strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className={`relative p-4 bg-pf-bg-card border ${isOverBudget ? 'border-pf-oxblood' : 'border-pf-brass-dim/30'}`}>
          <CornerBrackets />
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-0.5">Gold Remaining</p>
              <p className={`font-mono text-[11px] ${isOverBudget ? 'text-pf-oxblood-glow' : 'text-pf-stone'}`}>
                {isOverBudget ? 'Over budget' : `${formatPrice(totalSpentSp)} of ${startingGp} gp spent`}
              </p>
            </div>
            <span className={`font-display text-3xl ${isOverBudget ? 'text-pf-oxblood-glow' : 'text-pf-bone'}`}>
              {formatPrice(Math.max(0, remainingSp))}
            </span>
          </div>
          <div className="mt-3 h-1 bg-pf-bg-elev relative overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full transition-all ${isOverBudget ? 'bg-pf-oxblood' : 'bg-pf-brass'}`}
              style={{ width: `${Math.min(100, (totalSpentSp / startingSp) * 100)}%` }}
            />
          </div>
        </div>

        <div className={`relative p-4 bg-pf-bg-card border ${isImmobile ? 'border-pf-oxblood-glow' : isEncumbered ? 'border-pf-oxblood' : 'border-pf-brass-dim/30'}`}>
          <CornerBrackets />
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-0.5">Carrying Bulk</p>
              <p className="font-mono text-[11px] text-pf-stone">
                Encumbered &gt; {encumberedAt} · Immobile ≥ {immobileAt}
              </p>
              {isImmobile && <p className="font-mono text-[10px] text-pf-oxblood-glow mt-1">⚠ IMMOBILE — cannot move under load</p>}
              {isEncumbered && !isImmobile && <p className="font-mono text-[10px] text-pf-oxblood mt-1">⚠ ENCUMBERED — −10 ft Speed, clumsy 1</p>}
            </div>
            <span className={`font-display text-3xl ${isImmobile ? 'text-pf-oxblood-glow' : isEncumbered ? 'text-pf-oxblood' : 'text-pf-bone'}`}>
              {formatBulk(totalBulk)}<span className="text-pf-stone text-base">/{bulkLimit}</span>
            </span>
          </div>
          <div className="mt-3 h-1 bg-pf-bg-elev relative overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full transition-all ${isImmobile ? 'bg-pf-oxblood-glow' : isEncumbered ? 'bg-pf-oxblood' : 'bg-pf-brass'}`}
              style={{ width: `${Math.min(100, (totalBulk / immobileAt) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* LEFT: source */}
        <div className="col-span-12 lg:col-span-8 relative bg-pf-bg-card border border-pf-brass-dim/30">
          <CornerBrackets active />

          <div className="flex border-b border-pf-brass-dim/30">
            <button
              onClick={() => setActiveTab('kit')}
              className={`flex-1 py-3 font-display text-[11px] tracking-[0.2em] uppercase transition-all border-b-2
                          ${activeTab === 'kit' ? 'border-pf-brass text-pf-bone bg-pf-brass/5' : 'border-transparent text-pf-stone hover:text-pf-parchment'}`}
            >
              Class Kit · Recommended
            </button>
            <button
              onClick={() => setActiveTab('shop')}
              className={`flex-1 py-3 font-display text-[11px] tracking-[0.2em] uppercase transition-all border-b-2
                          ${activeTab === 'shop' ? 'border-pf-brass text-pf-bone bg-pf-brass/5' : 'border-transparent text-pf-stone hover:text-pf-parchment'}`}
            >
              Custom Shop
            </button>
          </div>

          {activeTab === 'kit' && (
            <div className="p-5">
              {!cls ? (
                <div className="text-center py-12">
                  <Compass size={36} className="text-pf-brass-dim mx-auto mb-3" />
                  <p className="font-display text-sm tracking-[0.15em] text-pf-stone uppercase mb-1">No Class Selected Yet</p>
                  <p className="font-body text-sm text-pf-stone">Go back to Step IV and pick a class to see its starter kit.</p>
                </div>
              ) : !kit ? (
                <div className="text-center py-12">
                  <Compass size={36} className="text-pf-brass-dim mx-auto mb-3" />
                  <p className="font-display text-sm tracking-[0.15em] text-pf-stone uppercase mb-1">
                    No Official Kit for {cls.name}
                  </p>
                  <p className="font-body text-sm text-pf-stone max-w-md mx-auto leading-relaxed mb-4">
                    {cls.name}s don't ship with a curated starter kit yet. Browse the Custom Shop —
                    items appropriate for your class will be marked with a gold star.
                  </p>
                  <button
                    onClick={() => setActiveTab('shop')}
                    className="px-4 py-2 bg-pf-bg-elev border border-pf-brass text-pf-bone font-display tracking-wider uppercase text-xs hover:bg-pf-brass/10 transition-all"
                  >
                    Open Shop
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between mb-2">
                    <div>
                      <h3 className="font-display text-2xl text-pf-bone">{kit.name}</h3>
                      <p className="font-mono text-[11px] text-pf-stone tracking-wider mt-1">
                        {formatPrice(kit.totalSp)} · {kit.bulk} Bulk · {kit.items.length} items
                      </p>
                    </div>
                    {kitTaken ? (
                      <span className="px-3 py-1.5 bg-pf-sage/15 border border-pf-sage/40 font-display text-[10px] tracking-[0.18em] text-pf-sage uppercase flex items-center gap-1.5">
                        <Check size={12} /> Kit Taken
                      </span>
                    ) : (
                      <ComplexityBadge level="beginner" />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mt-4 mb-5">
                    {kit.items.map(item => (
                      <div key={item.name} className="flex items-baseline justify-between py-1.5 border-b border-pf-brass-dim/10 text-sm">
                        <span className="font-body text-pf-parchment">{item.name}</span>
                        <span className="font-mono text-[10px] text-pf-stone shrink-0 ml-3">
                          {item.bulk === 'L' ? 'L' : item.bulk === '—' ? '—' : item.bulk}
                        </span>
                      </div>
                    ))}
                  </div>

                  {kitWarnings.length > 0 && (
                    <div className="relative bg-pf-bg-elev border border-pf-oxblood/40 p-3 mb-3">
                      <p className="font-display text-[10px] tracking-[0.2em] text-pf-oxblood-glow uppercase mb-1.5">⚠ Kit Mismatch</p>
                      <p className="font-body text-xs text-pf-parchment leading-snug">
                        This kit contains items outside your class proficiency:
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {kitWarnings.map(w => (
                          <li key={w.item.name} className="text-[11px] font-body text-pf-stone">
                            <span className="text-pf-bone">{w.item.name}</span>
                            <span className="text-pf-oxblood-glow ml-2">({w.check.type} armor — not proficient)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={takeKit}
                    disabled={kitTaken}
                    className={`w-full py-3 font-display tracking-[0.25em] text-xs uppercase transition-all
                                ${kitTaken
                                  ? 'bg-pf-bg-elev text-pf-stone/40 cursor-not-allowed'
                                  : 'bg-pf-oxblood text-pf-bone hover:bg-pf-oxblood-glow hover:shadow-[0_0_24px_-8px_rgba(200,50,62,0.6)]'}`}
                  >
                    {kitTaken ? 'Kit Already Taken' : 'Take This Kit'}
                  </button>

                  <p className="text-[11px] text-pf-stone font-body italic text-center mt-3">
                    Taking the kit replaces anything currently in your loadout.
                  </p>
                </>
              )}
            </div>
          )}

          {activeTab === 'shop' && (
            <div>
              <div className="flex border-b border-pf-brass-dim/20">
                {['weapons', 'armor', 'gear', 'consumables'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setShopCategory(cat)}
                    className={`flex-1 py-2.5 font-display text-[10px] tracking-[0.18em] uppercase transition-all border-b-2
                                ${shopCategory === cat ? 'border-pf-brass text-pf-bone' : 'border-transparent text-pf-stone hover:text-pf-parchment'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {cls && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-pf-brass-dim/20 bg-pf-bg-elev/30">
                  <p className="font-body text-[11px] text-pf-stone">
                    <Star size={10} className="inline text-pf-brass mr-1" />
                    Items starred for <span className="text-pf-bone">{cls.name}</span>
                  </p>
                  <label className="flex items-center gap-2 font-display text-[10px] tracking-[0.15em] uppercase text-pf-stone cursor-pointer hover:text-pf-parchment">
                    <input
                      type="checkbox"
                      checked={recommendedOnly}
                      onChange={e => setRecommendedOnly(e.target.checked)}
                      className="w-3 h-3 accent-pf-brass"
                    />
                    Recommended only
                  </label>
                </div>
              )}

              <div className="p-4 max-h-[480px] overflow-y-auto">
                <div className="space-y-1">
                  {EQUIPMENT_CATALOG[shopCategory]
                    .map(item => ({ item, rec: cls ? isRecommendedForClass(item, cls) : false }))
                    .filter(({ rec }) => !recommendedOnly || rec)
                    .map(({ item, rec }) => {
                    const inLoadout = loadout.find(i => i.name === item.name);
                    const canAfford = item.priceSp <= remainingSp || item.priceSp === 0;
                    return (
                      <div
                        key={item.name}
                        className={`relative flex items-center gap-3 px-3 py-2 border transition-all
                                    ${inLoadout
                                      ? 'border-pf-brass/40 bg-pf-brass/5'
                                      : rec
                                        ? 'border-pf-brass/30 bg-pf-brass/[0.03] shadow-[inset_0_0_24px_-12px_rgba(201,169,97,0.4)]'
                                        : 'border-pf-brass-dim/20 hover:border-pf-brass-dim/40'}`}
                      >
                        {rec && (
                          <Star
                            size={11}
                            className="text-pf-brass fill-pf-brass shrink-0"
                            aria-label="Recommended for your class"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-body text-sm text-pf-parchment">{item.name}</span>
                            {inLoadout && <span className="font-mono text-[10px] text-pf-brass">×{inLoadout.qty}</span>}
                          </div>
                          {item.note && <p className="font-body text-[10px] text-pf-stone/70 italic mt-0.5">{item.note}</p>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-[10px] text-pf-stone w-16 text-right">{formatPrice(item.priceSp)}</span>
                          <span className="font-mono text-[10px] text-pf-stone w-6 text-right">
                            {item.bulk === 'L' ? 'L' : item.bulk === '—' ? '—' : item.bulk}
                          </span>
                          <button
                            onClick={() => addToLoadout(item)}
                            disabled={!canAfford}
                            className={`w-7 h-7 flex items-center justify-center border transition-all
                                        ${!canAfford
                                          ? 'border-pf-brass-dim/20 text-pf-stone/30 cursor-not-allowed'
                                          : 'border-pf-brass text-pf-brass hover:bg-pf-brass/10'}`}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {recommendedOnly
                    && EQUIPMENT_CATALOG[shopCategory].every(item => !isRecommendedForClass(item, cls)) && (
                    <p className="font-body text-[11px] text-pf-stone italic p-2 text-center">
                      No recommendations in this category for {cls?.name || 'your class'} yet — toggle the filter off to browse.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: loadout */}
        <div className="col-span-12 lg:col-span-4 relative bg-pf-bg-card border border-pf-brass-dim/30 p-4">
          <CornerBrackets />
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-pf-brass-dim/20">
            <h4 className="font-display text-base text-pf-bone tracking-wider">Loadout</h4>
            {loadout.length > 0 && (
              <button onClick={clearAll} className="text-[10px] font-display tracking-[0.15em] text-pf-stone hover:text-pf-oxblood-glow uppercase transition-colors">
                Clear All
              </button>
            )}
          </div>

          {granted.length > 0 && (
            <div className="mb-4">
              <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-2">Ancestry-Granted</p>
              <div className="space-y-1.5">
                {granted.map(item => (
                  <div key={item.name} className="flex items-start gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-body text-pf-parchment">{item.name}</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-mono bg-pf-sage/15 text-pf-sage border border-pf-sage/40 shrink-0">GRANTED</span>
                      </div>
                      {item.note && <p className="font-body text-[10px] text-pf-stone/70 italic mt-0.5">{item.note}</p>}
                    </div>
                    <span className="font-mono text-[10px] text-pf-stone shrink-0">
                      {item.bulk === 'L' ? 'L' : item.bulk}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-2">
              {loadout.length > 0 ? `Purchased (${loadout.length})` : 'Nothing Purchased'}
            </p>
            {loadout.length === 0 ? (
              <p className="font-body text-xs text-pf-stone italic">Take the class kit or browse the shop to add gear.</p>
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                {loadout.map(item => (
                  <div key={item.name} className="flex items-center gap-2 text-xs py-1 border-b border-pf-brass-dim/10">
                    <div className="flex-1 min-w-0">
                      <span className="font-body text-pf-parchment">{item.name}</span>
                      {(item.qty || 1) > 1 && <span className="ml-1.5 font-mono text-[10px] text-pf-brass">×{item.qty}</span>}
                    </div>
                    <span className="font-mono text-[10px] text-pf-stone shrink-0">{formatPrice(item.priceSp * (item.qty || 1))}</span>
                    <button
                      onClick={() => decrementItem(item.name)}
                      className="w-5 h-5 flex items-center justify-center text-pf-stone hover:text-pf-oxblood-glow transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepGear;
