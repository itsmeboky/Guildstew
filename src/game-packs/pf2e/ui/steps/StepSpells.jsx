// Step VII — Spells & Magic (caster setup; non-caster info panel).
// Verbatim from the prototype.

import React from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import GMWhisper from '../components/GMWhisper.jsx';
import CornerBrackets from '../components/CornerBrackets.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import ThreeActionGlyph from '../components/ThreeActionGlyph.jsx';
import RecommendationPanel from '../components/RecommendationPanel.jsx';
import RecommendedBadge from '../components/RecommendedBadge.jsx';
import { getRecommended } from '../../content/recommendedBuilds.js';
import {
  CLASSES,
  CASTING_TRADITION_BY_CLASS,
  SPELL_LISTS,
  SPELLS_KNOWN_BY_RANK,
  HIGHEST_SPELL_RANK,
  FOCUS_SPELLS_BY_CLASS,
} from '../../data/index.js';
import { computeDerivedStats } from '../../rules/compute-derived-stats.js';
import { fmtMod } from '../../rules/compute-ability-scores.js';
import { STEPS } from '../../config/steps.js';

const StepSpells = ({ data, update }) => {
  const cls = CLASSES.find(c => c.slug === data.class);
  const tradition = cls && CASTING_TRADITION_BY_CLASS[cls.slug];
  const level = data.level || 1;

  // Non-caster: friendly informational panel
  if (!tradition) {
    return (
      <div>
        <div className="mb-6">
          <p className="font-display text-xs tracking-[0.3em] text-pf-brass uppercase mb-1">Step the Seventh</p>
          <h2 className="font-display text-3xl text-pf-bone">Spells & Magic</h2>
        </div>
        <GMWhisper>{STEPS[6].whisper}</GMWhisper>

        <div className="relative bg-pf-bg-card border border-pf-brass-dim/30 p-8 text-center mt-4">
          <CornerBrackets />
          <Sparkles size={36} className="text-pf-brass-dim mx-auto mb-3" />
          <h3 className="font-display text-xl text-pf-bone mb-2">
            {cls ? `${cls.name}s aren't innate spellcasters` : 'No class selected yet'}
          </h3>
          <p className="font-body text-sm text-pf-parchment max-w-xl mx-auto leading-relaxed">
            {cls
              ? `${cls.name}s don't have built-in spellcasting at level 1. You can still pick up magic later via Multiclass Caster archetype feats (Wizard Dedication, Cleric Dedication, etc.) starting at level 2 — a great way to add utility magic to a martial build.`
              : 'Go back to Step IV and pick a class to see whether they cast spells. Fighters, Rogues, and Barbarians don\'t; Wizards, Clerics, and Bards do.'}
          </p>
        </div>
      </div>
    );
  }

  // Caster
  const list = SPELL_LISTS[tradition.tradition];
  const slots = SPELLS_KNOWN_BY_RANK(level, cls.slug);
  const maxRank = HIGHEST_SPELL_RANK(level);
  const cantripsKnown = data.cantripsKnown || [];
  const spellsByRank = data.spellsByRank || {};
  const spellbook = data.spellbook || [];

  // Spellbook size for prepared casters (Wizard especially)
  // Wizards: 10 spells of each rank in spellbook by level 1, +2 per level after
  const spellbookSize = cls.slug === 'wizard' ? 10 + (level - 1) * 2 : 0;

  const toggleCantrip = (name) => {
    if (cantripsKnown.includes(name)) {
      update({ cantripsKnown: cantripsKnown.filter(s => s !== name) });
    } else if (cantripsKnown.length < slots.cantrips) {
      update({ cantripsKnown: [...cantripsKnown, name] });
    }
  };

  const toggleRankSpell = (rank, name) => {
    const known = spellsByRank[rank] || (rank === 1 ? (data.rank1Known || []) : []);
    const limit = slots[rank] || 0;
    let next;
    if (known.includes(name)) next = known.filter(s => s !== name);
    else if (known.length < limit) next = [...known, name];
    else next = known;
    if (rank === 1) {
      update({ spellsByRank: { ...spellsByRank, [rank]: next }, rank1Known: next });
    } else {
      update({ spellsByRank: { ...spellsByRank, [rank]: next } });
    }
  };

  const toggleSpellbook = (name) => {
    if (spellbook.includes(name)) update({ spellbook: spellbook.filter(s => s !== name) });
    else if (spellbook.length < spellbookSize) update({ spellbook: [...spellbook, name] });
  };

  // Use Recommended for spells. Matches recommendedBuilds.js's
  // kebab-case slugs against the tradition's spell catalog by
  // lowercased name (the catalog only carries display names — no
  // slug field — so this mirrors the same trick used for class
  // feats). Spells that don't resolve are skipped with a console
  // warning rather than crashing the apply.
  const rec = getRecommended(cls?.slug);
  const hasSpellRec = !!(rec?.spells?.cantrips?.length || rec?.spells?.first?.length);
  const recFlags = data.recommendedFlags || {};

  const slugToName = (kebabSlug, pool) => {
    const target = String(kebabSlug || '').replace(/-/g, ' ').toLowerCase().trim();
    const hit = pool.find(sp => sp.name.toLowerCase() === target);
    if (!hit) console.warn('[pf2e] spell recommendation', kebabSlug, 'not in tradition catalog');
    return hit?.name;
  };

  const applyRecommendedSpells = () => {
    if (!rec?.spells) return;
    const cantripPool = list?.cantrips || [];
    const rank1Pool = list?.rank1 || [];
    const cantripNames = (rec.spells.cantrips || [])
      .map(s => slugToName(s, cantripPool))
      .filter(Boolean)
      .slice(0, slots.cantrips || 0);
    const rank1Limit = slots[1] || 0;
    const rank1Names = (rec.spells.first || [])
      .map(s => slugToName(s, rank1Pool))
      .filter(Boolean)
      .slice(0, rank1Limit);
    update({
      cantripsKnown: cantripNames,
      spellsByRank: { ...spellsByRank, 1: rank1Names },
      rank1Known: rank1Names,
      recommendedFlags: {
        ...recFlags,
        cantrips: cantripNames,
        rank1: rank1Names,
      },
    });
    toast.success('Recommended spells applied', { description: rec.rationale });
  };

  const traditionLabel = tradition.tradition[0].toUpperCase() + tradition.tradition.slice(1);
  const prepLabel = tradition.prep[0].toUpperCase() + tradition.prep.slice(1);

  // Cleric Heal/Harm Font calculation: +CHA mod bonus slots locked to Heal or Harm
  const stats = computeDerivedStats(data);
  const chaMod = stats.mods.Charisma;
  const fontSlots = cls.slug === 'cleric' ? Math.max(1, chaMod) : 0;

  // Focus spell options for this class
  const focusData = FOCUS_SPELLS_BY_CLASS[cls.slug];
  const focusSpells = data.focusSpells || [];

  const toggleFocus = (name) => {
    if (focusSpells.includes(name)) update({ focusSpells: focusSpells.filter(s => s !== name) });
    else update({ focusSpells: [...focusSpells, name] });
  };

  return (
    <div>
      <div className="mb-6">
        <p className="font-display text-xs tracking-[0.3em] text-pf-brass uppercase mb-1">Step the Seventh</p>
        <h2 className="font-display text-3xl text-pf-bone">Spells & Magic</h2>
      </div>

      <GMWhisper>{STEPS[6].whisper}</GMWhisper>

      {/* Tradition banner */}
      <div className="relative bg-pf-bg-card border border-pf-brass-dim/30 p-4 mb-5">
        <CornerBrackets active />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div>
            <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase">Tradition</p>
            <p className="font-display text-lg text-pf-bone">{traditionLabel}</p>
          </div>
          <div>
            <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase">Style</p>
            <p className="font-display text-lg text-pf-bone">{prepLabel}</p>
          </div>
          <div>
            <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase">Key Ability</p>
            <p className="font-display text-lg text-pf-bone">{tradition.keyAbility}</p>
          </div>
          <div>
            <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase">Max Spell Rank</p>
            <p className="font-display text-lg text-pf-bone">{maxRank}</p>
          </div>
          <div>
            <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase">Spell DC</p>
            <p className="font-display text-lg text-pf-bone font-mono">{stats.spellDC || '—'}</p>
          </div>
          <div>
            <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase">Spell Atk</p>
            <p className="font-display text-lg text-pf-bone font-mono">{stats.spellAttack !== null ? fmtMod(stats.spellAttack) : '—'}</p>
          </div>
        </div>
        {tradition.prep === 'prepared' && cls.slug !== 'wizard' && (
          <p className="text-[11px] text-pf-stone font-body italic mt-2">
            Prepared casters can prepare any spell from the {traditionLabel.toLowerCase()} list each morning. Your "known" picks below = your daily prep.
          </p>
        )}
        {tradition.prep === 'prepared' && cls.slug === 'wizard' && (
          <p className="text-[11px] text-pf-stone font-body italic mt-2">
            Wizards prepare spells from their <span className="text-pf-brass">spellbook</span> — a personal collection of memorized arcane formulas. Spellbook holds {spellbookSize} spells at level {level}. Pick spellbook entries below; you'll prepare from those during play.
          </p>
        )}
        {tradition.prep === 'spontaneous' && (
          <p className="text-[11px] text-pf-stone font-body italic mt-2">
            Spontaneous casters know a fixed set of spells and can cast any of them using any slot of the matching rank.
          </p>
        )}
      </div>

      {/* === CLERIC HEAL/HARM FONT === */}
      {cls.slug === 'cleric' && (
        <div className="relative bg-pf-bg-card border border-pf-brass/40 p-4 mb-6">
          <CornerBrackets active />
          <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-2">Divine Font — Bonus Daily Slots</p>
          <p className="font-body text-xs text-pf-parchment leading-relaxed mb-3">
            Clerics gain bonus daily slots equal to their CHA modifier (minimum 1). These slots can only hold <span className="text-pf-bone">Heal</span> (holy/none) or <span className="text-pf-oxblood-glow">Harm</span> (unholy). Choose your font.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-mono text-pf-stone">CHA mod: <span className="text-pf-brass">{fmtMod(chaMod)}</span> · Bonus slots: <span className="text-pf-bone">{fontSlots}</span></div>
            <div className="flex gap-2">
              {['heal', 'harm'].map(font => {
                const active = data.healHarmFont === font;
                const matches = data.sanctification === 'holy' && font === 'heal' || data.sanctification === 'unholy' && font === 'harm' || data.sanctification === 'none';
                return (
                  <button
                    key={font}
                    onClick={() => update({ healHarmFont: font })}
                    disabled={!matches}
                    className={`px-3 py-1.5 border text-xs font-display tracking-wider uppercase transition-all
                                ${active ? (font === 'heal' ? 'border-pf-sage bg-pf-sage/10 text-pf-bone' : 'border-pf-oxblood-glow bg-pf-oxblood/10 text-pf-bone')
                                  : !matches ? 'border-pf-brass-dim/20 text-pf-stone/40 cursor-not-allowed'
                                  : 'border-pf-brass-dim/30 text-pf-parchment hover:border-pf-brass-dim'}`}
                  >
                    {font === 'heal' ? '☩ Healing Font' : '☠ Harming Font'}
                  </button>
                );
              })}
            </div>
            {data.sanctification === 'holy' && <span className="text-[10px] italic text-pf-stone">Holy sanctification locks you to Healing.</span>}
            {data.sanctification === 'unholy' && <span className="text-[10px] italic text-pf-stone">Unholy sanctification locks you to Harming.</span>}
          </div>
        </div>
      )}

      {/* === WIZARD ARCANE BOND === */}
      {cls.slug === 'wizard' && (
        <div className="relative bg-pf-bg-card border border-pf-brass/40 p-4 mb-6">
          <CornerBrackets active />
          <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-2">Arcane Bond — Recall Magic</p>
          <p className="font-body text-xs text-pf-parchment leading-relaxed mb-3">
            Wizards bond with a single item, channeling arcane energy through it. Once per day, drain the bond to recall an expended spell.
          </p>
          <div className="flex gap-2 flex-wrap">
            {['staff', 'ring', 'amulet', 'wand', 'rod'].map(item => {
              const active = data.arcaneBond === item;
              return (
                <button
                  key={item}
                  onClick={() => update({ arcaneBond: item })}
                  className={`px-3 py-1.5 border text-xs font-display tracking-wider uppercase transition-all
                              ${active ? 'border-pf-brass bg-pf-brass/10 text-pf-bone' : 'border-pf-brass-dim/30 text-pf-parchment hover:border-pf-brass-dim'}`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* === FOCUS SPELLS === */}
      {focusData && focusData.samples.length > 0 && (
        <>
          <SectionHeader>Focus Spells</SectionHeader>
          <p className="font-body text-xs text-pf-stone mb-3 italic">{focusData.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
            {focusData.samples.map(sp => {
              const picked = focusSpells.includes(sp.name);
              return (
                <button
                  key={sp.name}
                  onClick={() => toggleFocus(sp.name)}
                  className={`relative p-3 bg-pf-bg-card border text-left transition-all
                              ${picked ? 'border-pf-brass bg-pf-brass/5' : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
                >
                  {picked && <CornerBrackets active />}
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-display text-sm text-pf-bone">{sp.name}</span>
                    <ThreeActionGlyph count={sp.actions} />
                  </div>
                  <p className="font-body text-[11px] text-pf-stone leading-snug">{sp.desc}</p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* === CANTRIPS + RANK-1 SPELLS === */}
      <RecommendationPanel
        title={`Cantrips (${cantripsKnown.length} / ${slots.cantrips})`}
        reasoning={rec?.reasoning?.spells}
        onApply={applyRecommendedSpells}
        disabled={!hasSpellRec}
        applied={!!(recFlags.cantrips?.length || recFlags.rank1?.length)}
        buttonTitle={hasSpellRec
          ? 'Fill cantrips and rank-1 slots from the recommended build for this class'
          : 'Spell recommendation not yet available for this class'}
      />
      <p className="font-body text-xs text-pf-stone mb-3 italic">
        Cantrips cost no spell slots. Cast them as often as you like — they auto-heighten to half your level.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
        {list.cantrips.map(sp => {
          const picked = cantripsKnown.includes(sp.name);
          const disabled = !picked && cantripsKnown.length >= slots.cantrips;
          return (
            <button
              key={sp.name}
              onClick={() => toggleCantrip(sp.name)}
              disabled={disabled}
              className={`relative p-3 bg-pf-bg-card border text-left transition-all
                          ${picked ? 'border-pf-brass bg-pf-brass/5'
                            : disabled ? 'border-pf-brass-dim/20 opacity-40 cursor-not-allowed'
                            : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
            >
              {picked && <CornerBrackets active />}
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-display text-sm text-pf-bone">{sp.name}</span>
                <ThreeActionGlyph count={sp.actions} />
              </div>
              <p className="font-body text-[11px] text-pf-stone leading-snug">{sp.desc}</p>
            </button>
          );
        })}
      </div>

      {/* === WIZARD SPELLBOOK === */}
      {cls.slug === 'wizard' && (
        <>
          <SectionHeader>Spellbook ({spellbook.length} / {spellbookSize})</SectionHeader>
          <p className="font-body text-xs text-pf-stone mb-3 italic">
            Your full repertoire of memorized spells (any rank up to your max). You prepare from this list each morning.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
            {[...(list.rank1 || []), ...(list.rank2 || []), ...(list.rank3 || [])].map(sp => {
              const inBook = spellbook.includes(sp.name);
              const disabled = !inBook && spellbook.length >= spellbookSize;
              return (
                <button
                  key={sp.name}
                  onClick={() => toggleSpellbook(sp.name)}
                  disabled={disabled}
                  className={`relative p-2 bg-pf-bg-card border text-left transition-all
                              ${inBook ? 'border-pf-brass bg-pf-brass/5'
                                : disabled ? 'border-pf-brass-dim/20 opacity-40 cursor-not-allowed'
                                : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs text-pf-bone">{sp.name}</span>
                    <span className="font-mono text-[9px] text-pf-stone">{sp.desc.length > 0 ? '✓' : ''}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* === PER-RANK SPELL PICKERS === */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(r => r <= maxRank).map(rank => {
        const rankSpells = list[`rank${rank}`];
        const known = spellsByRank[rank] || (rank === 1 ? (data.rank1Known || []) : []);
        const limit = slots[rank] || 0;
        const labelType = cls.slug === 'wizard' ? 'Daily Prep' : (tradition.prep === 'prepared' ? 'Prepared' : 'Known');
        return (
          <div key={rank}>
            <SectionHeader>
              Rank {rank} Spells — {labelType} ({known.length} / {limit})
            </SectionHeader>
            {rankSpells ? (
              <>
                <p className="font-body text-xs text-pf-stone mb-3 italic">
                  Cast using rank-{rank} spell slots. {tradition.prep === 'spontaneous' ? 'Spontaneous: locked in once chosen.' : cls.slug === 'wizard' ? 'Pick from your spellbook to prepare today.' : 'Pick what you prepare each morning.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
                  {rankSpells.map(sp => {
                    const picked = known.includes(sp.name);
                    const disabled = !picked && known.length >= limit;
                    return (
                      <button
                        key={sp.name}
                        onClick={() => toggleRankSpell(rank, sp.name)}
                        disabled={disabled}
                        className={`relative p-3 bg-pf-bg-card border text-left transition-all
                                    ${picked ? 'border-pf-brass bg-pf-brass/5'
                                      : disabled ? 'border-pf-brass-dim/20 opacity-40 cursor-not-allowed'
                                      : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
                      >
                        {picked && <CornerBrackets active />}
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-display text-sm text-pf-bone">{sp.name}</span>
                          <ThreeActionGlyph count={sp.actions} />
                        </div>
                        <p className="font-body text-[11px] text-pf-stone leading-snug">{sp.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="relative bg-pf-bg-card border border-dashed border-pf-brass-dim/40 p-5 mb-6">
                <p className="font-body text-xs text-pf-stone leading-relaxed italic">
                  Rank {rank} sample spells will appear here once the full SRD spell catalog is imported. The picker pattern matches ranks 1–3 above.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepSpells;
