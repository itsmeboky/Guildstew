// Step IV — Path of Power (class, subclass, sub-pick, deity, proficiencies,
// class feats, optional companion/familiar). Verbatim from the prototype.
//
// Post-Step-3 crash diagnosis (2026-05-18):
//   Uncaught TypeError: Cannot read properties of undefined (reading 'fortitude')
//     at StepClass (StepClass.jsx:82)
//
// Root cause: the prototype expected a flattened class shape
// ({ perception, saves: {...}, firstFeats: [...] }) but the SRD importer
// emits the Foundry-native nested shape ({ proficiencies: { perception,
// saves: {...}, ... } }) and no `firstFeats` array. The Identity-step
// template loader still writes slug ids (`'fighter'`, `'wizard'`, ...)
// while CLASSES uses Foundry random ids, so the `.find` fallback drops
// every templated character onto Alchemist — making the crash universal.
// Bindings below now read through `selected.proficiencies?.…` and
// guard `firstFeats` with an empty-array fallback.

import React, { useEffect } from 'react';
import { Sparkles, Crown } from 'lucide-react';
import { toast } from 'sonner';
import GMWhisper from '../components/GMWhisper.jsx';
import AnnotatedText from '@/components/glossary/AnnotatedText';
import ThumbnailStrip from '../components/ThumbnailStrip.jsx';
import CornerBrackets from '../components/CornerBrackets.jsx';
import ComplexityBadge from '../components/ComplexityBadge.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import UnknownEntityError from '../components/UnknownEntityError.jsx';
import RecommendationPanel from '../components/RecommendationPanel.jsx';
import RecommendedBadge from '../components/RecommendedBadge.jsx';
import ProfLine from '../components/ProfLine.jsx';
import ProfRow from '../components/ProfRow.jsx';
import ClassFeatSlot from '../components/ClassFeatSlot.jsx';
import {
  CLASSES,
  CLASS_DEDICATIONS,
  CLASS_DETAILS,
  CLASS_FEATS_BY_CLASS,
  SUBCLASS_SUBPICKS,
  INSTINCT_ANATHEMA,
  CLERIC_DOMAINS,
  STANDARD_CLASS_FEAT_LEVELS,
  SKILLS,
} from '../../data/index.js';
import { getClassTip } from '../../content/classTips.js';
import { getSubclassTip } from '../../content/subclassTips.js';
import { getRecommended } from '../../content/recommendedBuilds.js';
import { getSubclassOverlay, applySubclassOverlay } from '../../content/subclassOverlays.js';
import { STEPS } from '../../config/steps.js';

const StepClass = ({ data, update, openDeityModal }) => {
  // Auto-select the first available class when none is set yet so the
  // initial render has something to draw. Once `data.class` is set,
  // a missed lookup is a real bug — surface it instead of silently
  // dropping the player onto the first class in the list.
  useEffect(() => {
    if (!data.class && CLASSES.length > 0) update({ class: CLASSES[0].slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const selected = CLASSES.find(c => c.slug === data.class);
  if (data.class && !selected) {
    console.error('[pf2e] Unknown class slug:', data.class, '— available:', CLASSES.map(c => c.slug));
    return (
      <UnknownEntityError
        kind="class"
        slug={data.class}
        available={CLASSES.map(c => c.slug)}
        onReset={() => update({ class: null, subclass: null, subclassPick: null })}
      />
    );
  }
  if (!selected) return null; // first render before auto-pick lands
  const Icon = selected.icon;
  const prof = selected.proficiencies || {};
  const saves = prof.saves || {};
  const tipEntry = getClassTip(selected.slug);
  // Class feats indexed by level for the current class slug — pulled
  // straight from the SRD import via traits.includes(slug). Replaces
  // the prototype's hand-curated `firstFeats` array.
  const classFeatsByLevel = CLASS_FEATS_BY_CLASS[selected.slug] || {};
  const recommended = getRecommended(selected.slug);
  const recFlags = data.recommendedFlags || {};

  // Apply recommended level-1 class feats. Match by lowercased name
  // since the recommendation file uses kebab-case display slugs and
  // the imported feats only carry a `name` field (no `slug`).
  const applyRecommendedFeats = () => {
    if (!recommended?.classFeats) return;
    const nextClassFeats = { ...(data.classFeats || {}) };
    const nextFlags = { ...(recFlags.classFeats || {}) };
    for (const [lvlStr, slugs] of Object.entries(recommended.classFeats)) {
      const lvl = parseInt(lvlStr, 10);
      if (!Array.isArray(slugs) || slugs.length === 0) continue;
      const want = slugs[0]; // one feat per slot today
      const match = (classFeatsByLevel[lvl] || []).find(f =>
        (f.name || '').toLowerCase().replace(/\s+/g, '-') === want
        || (f.name || '').toLowerCase() === want.replace(/-/g, ' '),
      );
      if (match) {
        nextClassFeats[lvl] = match.name;
        nextFlags[lvl] = match.name;
      }
    }
    update({
      classFeats: nextClassFeats,
      recommendedFlags: { ...recFlags, classFeats: nextFlags },
    });
    toast.success('Recommended class feats applied', { description: recommended.rationale });
  };

  // Picking a different feat in a slot drops the ★ for that slot only.
  const pickClassFeat = (lvl, name) => {
    const nextClassFeats = { ...(data.classFeats || {}), [lvl]: name };
    const featFlags = { ...(recFlags.classFeats || {}) };
    if (featFlags[lvl] && featFlags[lvl] !== name) delete featFlags[lvl];
    update({
      classFeats: nextClassFeats,
      recommendedFlags: { ...recFlags, classFeats: featFlags },
    });
  };

  // NOTE: any future hook (useEffect, useState, useMemo, …) MUST live
  // ABOVE the `if (data.class && !selected) return <UnknownEntityError…/>`
  // guard at the top of this component. Hooks below the early return
  // change the hook count between renders and trigger React error #310.
  // The auto-pick effect already covers the empty-data first render —
  // there's no second on-mount hook to add here.

  return (
    <div>
      <div className="mb-6">
        <p className="font-display text-xs tracking-[0.3em] text-pf-brass uppercase mb-1">Step the Fourth</p>
        <h2 className="font-display text-3xl text-pf-bone">Path of Power</h2>
      </div>

      <GMWhisper>{STEPS[3].whisper}</GMWhisper>

      <ThumbnailStrip
        items={CLASSES}
        selectedId={selected.id}
        onSelect={id => update({ class: id, classFeats: {} })}
      />

      <div className="relative bg-pf-bg-card border border-pf-brass-dim/30 p-6">
        <CornerBrackets active />
        <div className="grid grid-cols-12 gap-6">
          {/* Identity */}
          <div className="col-span-12 lg:col-span-4 lg:border-r lg:border-pf-brass-dim/20 lg:pr-6">
            <div className="flex items-start gap-4 mb-3">
              {Icon && <Icon size={44} className="text-pf-brass shrink-0" strokeWidth={1.2} />}
              <div>
                <h3 className="font-display text-3xl text-pf-bone leading-none">{selected.name}</h3>
                <p className="font-mono text-[10px] tracking-[0.15em] text-pf-stone uppercase mt-1">
                  Key: {selected.keyAbility.join(' / ')}
                </p>
              </div>
            </div>
            <ComplexityBadge level={tipEntry.complexity} />
            <p className="font-body text-sm text-pf-parchment leading-relaxed my-4">{selected.blurb || selected.desc}</p>
            {selected.spellcasting && (
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-pf-brass" />
                <span className="font-display tracking-[0.15em] text-xs text-pf-brass">{selected.spellcasting}</span>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-pf-brass-dim/20">
              <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-1.5">Helpful Tip</p>
              <p className="font-body text-sm text-pf-parchment leading-relaxed italic"><AnnotatedText text={tipEntry.tip} /></p>
            </div>
          </div>

          {/* Proficiencies */}
          <div className="col-span-12 lg:col-span-4">
            <SectionHeader>Initial Proficiencies</SectionHeader>
            <div className="space-y-1.5 text-xs font-body">
              <ProfRow label="Perception" tier={prof.perception} />
              <ProfRow label="Fortitude" tier={saves.fortitude} />
              <ProfRow label="Reflex" tier={saves.reflex} />
              <ProfRow label="Will" tier={saves.will} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-1.5 text-[10px] font-body">
              <span className="font-display tracking-[0.15em] text-pf-brass uppercase col-span-2 mt-2">Hit Points / Level</span>
              <span className="text-pf-bone font-mono text-2xl col-span-2">{selected.hp}</span>
            </div>
            <TrainedSkillsPicker
              selected={selected}
              data={data}
              update={update}
              recommended={recommended}
              recFlags={recFlags}
            />

            {selected.requiresDeity && (
              <div className="mt-5 p-3 bg-pf-oxblood/10 border border-pf-oxblood/40">
                <div className="flex items-start gap-2.5">
                  <Crown className="text-pf-oxblood-glow shrink-0 mt-0.5" size={18} />
                  <div className="flex-1">
                    <p className="font-display text-[11px] tracking-[0.15em] text-pf-bone uppercase mb-1">Deity Required</p>
                    <p className="text-[11px] text-pf-stone font-body mb-2.5 leading-relaxed">
                      This class serves a divine patron. Choose, accept a preset, or forge a god of your own.
                    </p>
                    <button
                      onClick={openDeityModal}
                      className="text-[10px] font-display tracking-[0.15em] uppercase text-pf-bone border border-pf-brass px-3 py-1.5 hover:bg-pf-brass/10 transition-all"
                    >
                      {data.deity ? `Chosen: ${data.deity.name}` : 'Choose Deity'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Feats — one picker per feat level <= character level */}
          <div className="col-span-12 lg:col-span-4">
            {(() => {
              const level = data.level || 1;
              const featLevels = STANDARD_CLASS_FEAT_LEVELS.filter(l => l <= level);
              const classFeats = data.classFeats || {};

              // Detect taken Dedications and count of additional feats since each one
              const dedicationNames = CLASS_DEDICATIONS.map(d => d.name);
              const takenDedications = Object.entries(classFeats)
                .filter(([, name]) => dedicationNames.includes(name))
                .map(([lvl, name]) => ({ lvl: parseInt(lvl), name }));
              const totalDedications = takenDedications.length;
              const lastDedicationLvl = takenDedications.length > 0
                ? Math.max(...takenDedications.map(d => d.lvl)) : null;
              // Feats picked AFTER most recent dedication (simplified two-feat-rule tracker)
              const featsAfterLastDedication = lastDedicationLvl !== null
                ? Object.entries(classFeats).filter(([lvl, name]) => parseInt(lvl) > lastDedicationLvl && name && !dedicationNames.includes(name)).length
                : 0;
              const canTakeNewDedication = totalDedications === 0 || featsAfterLastDedication >= 2;

              return (
                <>
                  <RecommendationPanel
                    title={`Class Feats (${featLevels.length})`}
                    extra="One feat per feat-level — diamond glyphs show action cost"
                    reasoning={recommended?.reasoning?.classFeats}
                    onApply={applyRecommendedFeats}
                    disabled={!recommended?.classFeats}
                    applied={Object.keys(recFlags.classFeats || {}).length > 0}
                  />

                  {totalDedications > 0 && (
                    <div className={`relative bg-pf-bg-card border ${canTakeNewDedication ? 'border-pf-sage/40' : 'border-pf-oxblood/40'} p-2.5 mb-3`}>
                      <p className="font-display text-[9px] tracking-[0.2em] uppercase mb-1.5" style={{color: canTakeNewDedication ? '#6B8E7F' : '#C8323E'}}>
                        Archetype Tracker
                      </p>
                      <div className="space-y-0.5">
                        {takenDedications.map(d => (
                          <p key={d.lvl} className="font-body text-[10px] text-pf-parchment">
                            <span className="text-pf-brass">Lv {d.lvl}:</span> {d.name}
                          </p>
                        ))}
                      </div>
                      <p className="font-body text-[10px] text-pf-stone italic mt-2 leading-snug">
                        {canTakeNewDedication
                          ? `Two-feat rule satisfied (${featsAfterLastDedication}+ feats since last dedication). You may take a new Dedication.`
                          : `Two-feat rule active: take ${2 - featsAfterLastDedication} more archetype feat${2 - featsAfterLastDedication === 1 ? '' : 's'} before a new Dedication.`}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {featLevels.map(fLvl => (
                      <ClassFeatSlot
                        key={fLvl}
                        fLvl={fLvl}
                        picked={classFeats[fLvl]}
                        classOptions={classFeatsByLevel[fLvl] || []}
                        dedicationOptions={CLASS_DEDICATIONS.filter(d => d.forbidden !== selected.id)}
                        dedicationLocked={!canTakeNewDedication && (!classFeats[fLvl] || !dedicationNames.includes(classFeats[fLvl]))}
                        recommendedName={recFlags.classFeats?.[fLvl]}
                        onPick={(name) => pickClassFeat(fLvl, name)}
                      />
                    ))}

                    {/* Free Archetype bonus slots — only render if house rule active */}
                    {data.houseRules?.freeArchetype && (() => {
                      const freeArchLevels = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20].filter(l => l <= level);
                      const freeArchetypeFeats = data.freeArchetypeFeats || {};
                      if (freeArchLevels.length === 0) return null;
                      return (
                        <>
                          <div className="mt-4 pt-3 border-t border-pf-brass/30">
                            <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-1">⊕ Free Archetype Slots</p>
                            <p className="font-body text-[10px] text-pf-stone italic mb-3">Variant rule: bonus archetype feat at every even level.</p>
                          </div>
                          {freeArchLevels.map(fLvl => (
                            <ClassFeatSlot
                              key={`fa-${fLvl}`}
                              fLvl={fLvl}
                              picked={freeArchetypeFeats[fLvl]}
                              classOptions={[]}
                              dedicationOptions={CLASS_DEDICATIONS.filter(d => d.forbidden !== selected.id)}
                              onPick={(name) => update({ freeArchetypeFeats: { ...freeArchetypeFeats, [fLvl]: name } })}
                            />
                          ))}
                        </>
                      );
                    })()}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* SUBCLASS PICKER — Doctrine, Order, Thesis, Bloodline, etc. */}
      {(() => {
        const details = CLASS_DETAILS[selected.slug];
        if (!details?.subclasses) {
          return details?.proficiencies?.note ? (
            <div className="relative bg-pf-bg-card border border-dashed border-pf-brass-dim/40 p-4 mt-4">
              <p className="font-body text-xs text-pf-stone italic">{details.proficiencies.note}</p>
            </div>
          ) : null;
        }
        const sub = details.subclasses;
        const picked = data.subclass;
        return (
          <div className="mt-5">
            <SectionHeader>{sub.label} — {selected.name}</SectionHeader>
            <p className="font-body text-xs text-pf-stone mb-3 italic">{sub.help}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sub.options.map(opt => {
                const active = picked === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => update({ subclass: opt.id })}
                    className={`relative text-left p-4 bg-pf-bg-card border transition-all
                                ${active ? 'border-pf-brass bg-pf-brass/5 shadow-[0_0_20px_-12px_rgba(201,169,97,0.5)]' : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
                  >
                    {active && <CornerBrackets active />}
                    <h5 className="font-display text-base text-pf-bone mb-1.5">{opt.name}</h5>
                    <p className="text-xs text-pf-stone font-body leading-relaxed">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
            {(() => {
              const subTip = picked ? getSubclassTip(selected.slug, picked) : null;
              if (!subTip) return null;
              return (
                <div className="bg-pf-brass/5 border-l-2 border-pf-brass pl-4 pr-4 py-3 mt-3">
                  <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-1">
                    {sub.label} Tip
                  </p>
                  <p className="font-body text-sm text-pf-parchment leading-relaxed italic">
                    <AnnotatedText text={subTip} />
                  </p>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* SUBCLASS SUB-PICK — Animal/Dragon/Spirit Instinct chooses aspect */}
      {(() => {
        const subId = data.subclass;
        const subPick = SUBCLASS_SUBPICKS[subId];
        if (!subPick) return null;
        return (
          <div className="mt-4 relative bg-pf-bg-card border border-pf-brass/40 p-4">
            <CornerBrackets active />
            <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-2">{subPick.label} Selection</p>
            <p className="font-body text-xs text-pf-stone mb-3 italic">Your {data.subclass.charAt(0).toUpperCase()+data.subclass.slice(1)} Instinct requires choosing a specific {subPick.label.toLowerCase()}.</p>
            <div className="flex flex-wrap gap-2">
              {subPick.options.map(opt => {
                const active = data.subclassPick === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => update({ subclassPick: opt })}
                    className={`px-3 py-1.5 border text-xs font-display tracking-wider uppercase transition-all
                                ${active ? 'border-pf-brass bg-pf-brass/10 text-pf-bone' : 'border-pf-brass-dim/30 text-pf-parchment hover:border-pf-brass-dim'}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* BARBARIAN INSTINCT ANATHEMA — surfaces what your character refuses */}
      {selected.slug === 'barbarian' && data.subclass && INSTINCT_ANATHEMA[data.subclass] && (
        <div className="mt-4 relative bg-pf-bg-card border border-pf-oxblood/30 p-4">
          <p className="font-display text-[10px] tracking-[0.25em] text-pf-oxblood-glow uppercase mb-2">Instinct Anathema</p>
          <p className="font-body text-xs text-pf-parchment leading-relaxed">{INSTINCT_ANATHEMA[data.subclass]}</p>
          <p className="font-body text-[10px] text-pf-stone italic mt-2">Breaking this anathema temporarily lose your rage abilities until atonement.</p>
        </div>
      )}

      {/* CLERIC DOMAIN PICKER — drives Domain Initiate focus spell choice */}
      {selected.slug === 'cleric' && (
        <div className="mt-5">
          <SectionHeader>Domain — Domain Initiate (1st-Level Class Feat)</SectionHeader>
          <p className="font-body text-xs text-pf-stone mb-3 italic">
            Choose one of your deity's domains. This grants you the corresponding focus spell via the Domain Initiate class feat. Full deity-to-domain mapping wires in via SRD import.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {CLERIC_DOMAINS.map(d => {
              const active = data.domain === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => update({ domain: d.id })}
                  className={`relative text-left p-2.5 bg-pf-bg-card border transition-all
                              ${active ? 'border-pf-brass bg-pf-brass/5' : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
                >
                  {active && <CornerBrackets active />}
                  <p className="font-display text-xs text-pf-bone">{d.name}</p>
                  <p className="font-body text-[10px] text-pf-stone leading-snug mt-1">{d.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CLASS PROFICIENCIES — what your class starts trained in.
          Subclass proficiency deltas are sourced from
          content/subclassOverlays.js — see file for which subclasses
          are covered. */}
      {(() => {
        const details = CLASS_DETAILS[selected.slug];
        if (!details?.proficiencies) return null;
        const overlay = getSubclassOverlay(selected.slug, data.subclass);
        const p = applySubclassOverlay(details.proficiencies, overlay);
        return (
          <div className="mt-5">
            <SectionHeader>Initial Class Proficiencies{data.subclass ? ` — ${CLASS_DETAILS[selected.slug]?.subclasses?.options.find(o => o.id === data.subclass)?.name || 'Subclass'}` : ''}</SectionHeader>
            {overlay?.notes && (
              <p className="font-body text-xs text-pf-parchment italic mb-3 leading-relaxed">{overlay.notes}</p>
            )}
            {overlay?.bonusSkills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {overlay.bonusSkills.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider uppercase bg-pf-brass/15 border border-pf-brass/40 text-pf-bone">
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                    <span className="text-[8px] text-pf-brass">subclass</span>
                  </span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-body">
              <div className="bg-pf-bg-card border border-pf-brass-dim/30 p-3">
                <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-2">Defense</p>
                <div className="space-y-0.5 text-pf-parchment">
                  <ProfLine label="Perception" tier={p.perception} />
                  <ProfLine label="Fortitude"  tier={p.saves?.fortitude} />
                  <ProfLine label="Reflex"     tier={p.saves?.reflex} />
                  <ProfLine label="Will"       tier={p.saves?.will} />
                </div>
              </div>
              <div className="bg-pf-bg-card border border-pf-brass-dim/30 p-3">
                <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-2">Weapons</p>
                <div className="space-y-0.5 text-pf-parchment">
                  {Object.entries(p.weapons || {}).map(([k, t]) => (
                    <ProfLine key={k} label={k} tier={t} />
                  ))}
                </div>
              </div>
              <div className="bg-pf-bg-card border border-pf-brass-dim/30 p-3">
                <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-2">Armor & Magic</p>
                <div className="space-y-0.5 text-pf-parchment">
                  {Object.entries(p.armor || {}).map(([k, t]) => (
                    <ProfLine key={k} label={k} tier={t} />
                  ))}
                  <ProfLine label="Class DC" tier={p.classDC} />
                  {p.arcaneSpellcasting && <ProfLine label="Arcane casting" tier={p.arcaneSpellcasting} />}
                  {p.divineSpellcasting && <ProfLine label="Divine casting" tier={p.divineSpellcasting} />}
                  {p.occultSpellcasting && <ProfLine label="Occult casting" tier={p.occultSpellcasting} />}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* === ANIMAL COMPANION / FAMILIAR ===
          Only show for classes that actually grant one through core
          progression. Everyone else can pick a companion/familiar via
          general feats — surfacing the picker for them implies it's a
          default choice when it isn't. Will move to reading from a
          `selectedClass.grants` field once the slug-resolver lands. */}
      {(() => {
        const CLASSES_WITH_ANIMAL_COMPANION = ['ranger', 'druid'];
        const CLASSES_WITH_FAMILIAR        = ['witch', 'wizard', 'sorcerer'];
        const showAnimalCompanion = CLASSES_WITH_ANIMAL_COMPANION.includes(selected.slug);
        const showFamiliar = CLASSES_WITH_FAMILIAR.includes(selected.slug);
        if (!showAnimalCompanion && !showFamiliar) return null;

        const familiarRequired = selected.slug === 'witch';
        const sectionTitle = showAnimalCompanion && showFamiliar
          ? 'Animal Companion or Familiar'
          : showAnimalCompanion ? 'Animal Companion' : 'Familiar';
        const blurb = showAnimalCompanion && !showFamiliar
          ? 'Pick the animal that fights alongside you.'
          : familiarRequired
            ? 'Your patron grants you a familiar — pick its species.'
            : showFamiliar && !showAnimalCompanion
              ? 'Pick the magical companion that holds your spellbook and aids you.'
              : 'Pick an animal companion or a familiar — depends on the path you take.';
        return (
          <div className="mt-5">
            <SectionHeader>{sectionTitle}</SectionHeader>
            <p className="font-body text-xs text-pf-stone mb-3 italic">{blurb}</p>
            {showAnimalCompanion && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
                {[
                  { id: 'ape', name: 'Ape', desc: 'STR + climbing. Unarmed: fist 1d8.' },
                  { id: 'bear', name: 'Bear', desc: 'Tanky. Unarmed: jaws + claws.' },
                  { id: 'bull', name: 'Bull', desc: 'Charging horns. STR + speed.' },
                  { id: 'cat', name: 'Cat', desc: 'DEX + stealth. Unarmed: claws.' },
                  { id: 'wolf', name: 'Wolf', desc: 'Pack tactics + trip.' },
                  { id: 'shark', name: 'Shark', desc: 'Swim + jaws. Aquatic only.' },
                  { id: 'snake', name: 'Snake', desc: 'Reach + poisonous fangs.' },
                  { id: 'horse', name: 'Horse', desc: 'Mount + speed + hooves.' },
                  { id: 'eagle', name: 'Eagle', desc: 'Flight + DEX + sharp talons.' },
                  { id: 'none', name: 'None', desc: 'No companion this character.' },
                ].map(a => {
                  const active = data.animalCompanion === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => update({ animalCompanion: a.id })}
                      className={`relative text-left p-2.5 bg-pf-bg-card border transition-all
                                  ${active ? 'border-pf-brass bg-pf-brass/5' : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
                    >
                      {active && <CornerBrackets active />}
                      <p className="font-display text-xs text-pf-bone">{a.name}</p>
                      <p className="font-body text-[10px] text-pf-stone leading-snug">{a.desc}</p>
                    </button>
                  );
                })}
              </div>
            )}
            {showFamiliar && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { id: 'cat', name: 'Cat', desc: 'Climbing + Stealth bonus.' },
                  { id: 'raven', name: 'Raven', desc: 'Flight + Speech ability.' },
                  { id: 'owl', name: 'Owl', desc: 'Flight + Darkvision.' },
                  { id: 'bat', name: 'Bat', desc: 'Flight + Echolocation.' },
                  { id: 'rat', name: 'Rat', desc: 'Climbing + Scent.' },
                  { id: 'snake', name: 'Serpent', desc: 'Climbing + Poison sense.' },
                ].map(f => {
                  const active = data.familiar === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => update({ familiar: f.id })}
                      className={`relative text-left p-2.5 bg-pf-bg-card border transition-all
                                  ${active ? 'border-pf-brass bg-pf-brass/5' : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
                    >
                      {active && <CornerBrackets active />}
                      <p className="font-display text-xs text-pf-bone">{f.name}</p>
                      <p className="font-body text-[10px] text-pf-stone leading-snug">{f.desc}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* === OPTIONAL DEITY (for non-Clerics) === */}
      {selected.slug !== 'cleric' && (
        <div className="mt-5">
          <SectionHeader>Patron Deity <span className="text-pf-stone font-body normal-case tracking-normal italic text-xs ml-2">(optional)</span></SectionHeader>
          <p className="font-body text-xs text-pf-stone mb-3 italic">
            Anyone can serve a deity. Champions, druids, and some archetypes require it; everyone else can choose for roleplay.
          </p>
          <button
            onClick={() => openDeityModal()}
            className="px-4 py-2 bg-pf-bg-elev border border-pf-brass-dim/40 text-pf-parchment font-display tracking-wider uppercase text-xs
                       hover:bg-pf-brass/10 hover:border-pf-brass transition-all"
          >
            {data.deity ? `Chosen: ${data.deity.name}` : 'Choose Deity'}
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Trained-skills picker. Renders auto-trained chips (locked, from
 * `class.trainedSkills.value`) and N pickable dropdown slots, where N
 * is `class.trainedSkills.additional + max(0, INT mod)`. The INT mod
 * is approximated from the player's level-1 free boost batch — the
 * boosts step is the source of truth, but until they revisit it we
 * keep slot count reactive to whatever's been chosen so far.
 *
 * Player picks persist to `data.trainedSkills` as a flat slug array.
 */
function TrainedSkillsPicker({ selected, data, update, recommended, recFlags }) {
  const auto = (selected.trainedSkills?.value || []).map(s => s.toLowerCase());
  const additional = selected.trainedSkills?.additional ?? 2;
  const intBoostsAtL1 = data.boostBatches?.[1]?.Intelligence || 0;
  // Each free boost is +2 to score; ignore ancestry/background here
  // since the post-import ancestry slugs no longer line up with the
  // legacy StepAbilities tables. Conservative under-count.
  const intMod = Math.max(0, intBoostsAtL1);
  const totalSlots = additional + intMod;

  // Storage format: canonical capitalized name from SKILLS[].name.
  // StepSkills writes the same shape, so the two pickers share state
  // without casing drift. (Earlier this stored lowercase slugs, which
  // diverged from StepSkills and caused recommendations applied in
  // one step to look un-applied in the other.)
  const picks = data.trainedSkills || [];
  const skillSlugs = SKILLS.map(s => ({ slug: s.name.toLowerCase(), name: s.name, ability: s.ability }));
  const lowerPicks = picks.map(p => String(p).toLowerCase());
  const taken = new Set([...auto, ...lowerPicks]);
  const recSkills = recFlags?.skills || [];

  const setPick = (idx, slug) => {
    const next = [...picks];
    // Promote the dropdown's lowercase value back to the canonical
    // SKILLS-name before persisting.
    const nextName = slug ? skillSlugs.find(s => s.slug === slug)?.name : null;
    if (!nextName) next.splice(idx, 1);
    else next[idx] = nextName;
    // Drop the ★ badge for the slug being replaced/cleared.
    const prevName = picks[idx];
    let nextRecSkills = recSkills;
    if (prevName && recSkills.includes(prevName) && prevName !== nextName) {
      nextRecSkills = recSkills.filter(s => s !== prevName);
    }
    update({
      trainedSkills: next,
      recommendedFlags: { ...(data.recommendedFlags || {}), skills: nextRecSkills },
    });
  };

  const applyRecommended = () => {
    if (!recommended?.skills) return;
    // Map kebab-case recommendation slugs → canonical SKILLS names,
    // skip auto-trained, cap by total slots.
    const validNames = recommended.skills
      .map(s => skillSlugs.find(sk => sk.slug === s)?.name)
      .filter(Boolean)
      .filter(name => !auto.includes(name.toLowerCase()))
      .slice(0, totalSlots);
    update({
      trainedSkills: validNames,
      recommendedFlags: { ...(data.recommendedFlags || {}), skills: validNames },
    });
    toast.success('Recommended skills applied', { description: recommended.rationale });
  };

  return (
    <div className="mt-4">
      <RecommendationPanel
        title="Trained Skills"
        extra={`${additional} + INT mod = ${totalSlots}`}
        reasoning={recommended?.reasoning?.skills}
        onApply={applyRecommended}
        disabled={!recommended?.skills}
        applied={!!(recFlags.skills?.length)}
      />

      {auto.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {auto.map(slug => {
            const skill = skillSlugs.find(s => s.slug === slug) || { name: slug.charAt(0).toUpperCase() + slug.slice(1) };
            return (
              <span key={slug} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider uppercase bg-pf-brass/15 border border-pf-brass/40 text-pf-bone">
                {skill.name}
                <span className="text-[8px] text-pf-brass">auto</span>
              </span>
            );
          })}
        </div>
      )}

      <div className="space-y-1.5">
        {Array.from({ length: totalSlots }).map((_, idx) => {
          // picks[idx] is the canonical capitalized name; the <select>
          // works in lowercase slug so the option value matches the
          // option key — currentSlug bridges them.
          const currentName = picks[idx] || '';
          const currentSlug = currentName ? currentName.toLowerCase() : '';
          const isRec = currentName && recSkills.includes(currentName);
          const available = skillSlugs.filter(s => s.slug === currentSlug || !taken.has(s.slug));
          return (
            <div key={idx} className="flex items-center gap-1.5">
              <select
                value={currentSlug}
                onChange={e => setPick(idx, e.target.value)}
                className="flex-1 bg-pf-bg-elev border border-pf-brass-dim/30 px-2 py-1 text-[11px] font-body text-pf-bone
                           focus:border-pf-brass focus:outline-none transition-all"
              >
                <option value="">— Pick skill —</option>
                {available.map(s => (
                  <option key={s.slug} value={s.slug}>{s.name} ({s.ability})</option>
                ))}
              </select>
              {isRec && <RecommendedBadge />}
              {currentName && (
                <button
                  type="button"
                  onClick={() => setPick(idx, '')}
                  title="Clear slot"
                  className="px-2 py-1 text-[10px] text-pf-stone hover:text-pf-bone border border-pf-brass-dim/30 hover:border-pf-brass"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        {totalSlots === 0 && (
          <p className="font-body text-[10px] text-pf-stone italic">
            No bonus skills until Intelligence boosts are assigned in the Boosts step.
          </p>
        )}
      </div>
    </div>
  );
}

export default StepClass;
