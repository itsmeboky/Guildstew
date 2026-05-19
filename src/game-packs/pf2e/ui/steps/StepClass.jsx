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
import GMWhisper from '../components/GMWhisper.jsx';
import ThumbnailStrip from '../components/ThumbnailStrip.jsx';
import CornerBrackets from '../components/CornerBrackets.jsx';
import ComplexityBadge from '../components/ComplexityBadge.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import ProfLine from '../components/ProfLine.jsx';
import ProfRow from '../components/ProfRow.jsx';
import ClassFeatSlot from '../components/ClassFeatSlot.jsx';
import {
  CLASSES,
  CLASS_DEDICATIONS,
  CLASS_DETAILS,
  SUBCLASS_SUBPICKS,
  INSTINCT_ANATHEMA,
  CLERIC_DOMAINS,
  STANDARD_CLASS_FEAT_LEVELS,
} from '../../data/index.js';
import { getClassTip } from '../../content/classTips.js';
import { STEPS } from '../../config/steps.js';

const StepClass = ({ data, update, openDeityModal }) => {
  const selected = CLASSES.find(c => c.id === data.class) || CLASSES[0];
  const Icon = selected.icon;
  const prof = selected.proficiencies || {};
  const saves = prof.saves || {};
  const firstFeats = selected.firstFeats || [];
  const tipEntry = getClassTip(selected.slug);

  useEffect(() => {
    if (!data.class) update({ class: CLASSES[0].id });
  }, []);

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
              <p className="font-body text-sm text-pf-parchment leading-relaxed italic">{tipEntry.tip}</p>
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
              <span className="font-display tracking-[0.15em] text-pf-brass uppercase col-span-2 mt-2">Trained Skills</span>
              <span className="text-pf-bone font-mono col-span-2">{(selected.trainedSkills?.additional ?? 2)} + INT mod</span>
            </div>

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
                  <SectionHeader>Class Feats ({featLevels.length})</SectionHeader>
                  <p className="text-[11px] text-pf-stone font-body mb-3 leading-relaxed">
                    One feat per feat-level. Diamond glyphs show how many actions the feat costs per turn.
                  </p>

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
                        classOptions={firstFeats}
                        dedicationOptions={CLASS_DEDICATIONS.filter(d => d.forbidden !== selected.id)}
                        dedicationLocked={!canTakeNewDedication && (!classFeats[fLvl] || !dedicationNames.includes(classFeats[fLvl]))}
                        onPick={(name) => update({ classFeats: { ...classFeats, [fLvl]: name } })}
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
        const details = CLASS_DETAILS[selected.id];
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
      {selected.id === 'barbarian' && data.subclass && INSTINCT_ANATHEMA[data.subclass] && (
        <div className="mt-4 relative bg-pf-bg-card border border-pf-oxblood/30 p-4">
          <p className="font-display text-[10px] tracking-[0.25em] text-pf-oxblood-glow uppercase mb-2">Instinct Anathema</p>
          <p className="font-body text-xs text-pf-parchment leading-relaxed">{INSTINCT_ANATHEMA[data.subclass]}</p>
          <p className="font-body text-[10px] text-pf-stone italic mt-2">Breaking this anathema temporarily lose your rage abilities until atonement.</p>
        </div>
      )}

      {/* CLERIC DOMAIN PICKER — drives Domain Initiate focus spell choice */}
      {selected.id === 'cleric' && (
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

      {/* CLASS PROFICIENCIES — what your class starts trained in */}
      {(() => {
        const details = CLASS_DETAILS[selected.id];
        if (!details?.proficiencies) return null;
        // Merge subclass-driven proficiency overrides (Cloistered vs Warpriest, etc.)
        let p = { ...details.proficiencies };
        if (selected.id === 'cleric' && data.subclass === 'warpriest') {
          p = { ...p,
            weapons: { ...(p.weapons || {}), simple: 'trained', martial: 'trained', favoredWeapon: 'trained' },
            armor:   { ...(p.armor   || {}), medium: 'trained' },
            saves:   { ...(p.saves   || {}), fortitude: 'expert' },
          };
        }
        if (selected.id === 'cleric' && data.subclass === 'cloistered') {
          p = { ...p,
            weapons: { ...(p.weapons || {}), simple: 'trained', favoredWeapon: 'trained' },
          };
        }
        return (
          <div className="mt-5">
            <SectionHeader>Initial Class Proficiencies{data.subclass ? ` — ${CLASS_DETAILS[selected.id]?.subclasses?.options.find(o => o.id === data.subclass)?.name || 'Subclass'}` : ''}</SectionHeader>
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

      {/* === ANIMAL COMPANION / FAMILIAR === */}
      {(() => {
        const eligibleForCompanion = ['barbarian'].includes(selected.id) && data.subclass === 'animal';
        const eligibleForFamiliar = selected.id === 'wizard' && data.subclass === 'familiar-attunement';
        const showOptional = ['wizard', 'rogue', 'bard', 'cleric'].includes(selected.id);
        if (!eligibleForCompanion && !eligibleForFamiliar && !showOptional) return null;
        return (
          <div className="mt-5">
            <SectionHeader>Animal Companion / Familiar</SectionHeader>
            <p className="font-body text-xs text-pf-stone mb-3 italic">
              {eligibleForCompanion ? 'Animal Instinct grants a bestial spiritual ally that fights alongside you. Pick your animal aspect.' :
               eligibleForFamiliar ? 'Improved Familiar Attunement grants a magical companion with two abilities.' :
               'Some class feats grant an animal companion or familiar. Pick one if your build calls for it (otherwise leave blank).'}
            </p>
            {(eligibleForCompanion || (!eligibleForFamiliar && showOptional)) && (
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
            {eligibleForFamiliar && (
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
      {selected.id !== 'cleric' && (
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

export default StepClass;
