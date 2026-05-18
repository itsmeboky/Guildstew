// Step VI — Skills, Feats & Tongues. Verbatim from the prototype.

import React from 'react';
import GMWhisper from '../components/GMWhisper.jsx';
import CornerBrackets from '../components/CornerBrackets.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import ProficiencyDots from '../components/ProficiencyDots.jsx';
import ThreeActionGlyph from '../components/ThreeActionGlyph.jsx';
import {
  CLASSES,
  BACKGROUNDS,
  SKILLS,
  SKILL_FEATS,
  GENERAL_FEATS,
  ANCESTRY_LANGUAGES,
  COMMON_LANGUAGES,
  SKILL_INCREASE_LEVELS,
  SKILL_FEAT_LEVELS,
  GENERAL_FEAT_LEVELS,
} from '../../data/index.js';
import { modOf, computeAbilityScores } from '../../rules/compute-ability-scores.js';
import { meetsPrereqs } from '../../rules/prereq-checker.js';
import { STEPS } from '../../config/steps.js';

const StepSkills = ({ data, update }) => {
  const trained = data.trainedSkills || [];
  const selectedClass = CLASSES.find(c => c.id === data.class);
  const allowed = selectedClass ? selectedClass.trainedSkills + 1 : 3;
  const bgSkill = BACKGROUNDS.find(b => b.id === data.background)?.skill;
  const level = data.level || 1;

  // Skill increase tier per skill (Trained → Expert → Master → Legendary)
  const skillTiers = data.skillTiers || {};       // { 'Acrobatics': 'expert', ... }
  const skillIncreases = data.skillIncreases || {}; // { 3: 'Athletics', 5: 'Stealth', ... }
  const skillFeats = data.skillFeats || {};       // { 2: 'Battle Medicine', ... }
  const generalFeats = data.generalFeats || {};   // { 3: 'Toughness', ... }
  const languages = data.languages || [];         // array of selected bonus language strings

  const increaseLevels = SKILL_INCREASE_LEVELS.filter(l => l <= level);
  const skillFeatLevels = SKILL_FEAT_LEVELS.filter(l => l <= level);
  const generalFeatLevels = GENERAL_FEAT_LEVELS.filter(l => l <= level);

  // Languages math
  const intMod = Math.max(0, modOf(computeAbilityScores(data).Intelligence || 10));
  const baseLanguages = ANCESTRY_LANGUAGES[data.ancestry]?.base || [];
  const bonusLanguageSlots = intMod;

  const toggleSkill = (skillName) => {
    if (skillName === bgSkill) return;
    const next = trained.includes(skillName)
      ? trained.filter(s => s !== skillName)
      : trained.length < allowed ? [...trained, skillName] : trained;
    update({ trainedSkills: next });
  };

  const setIncrease = (lvl, skill) => {
    update({ skillIncreases: { ...skillIncreases, [lvl]: skill } });
  };

  const toggleLanguage = (lang) => {
    if (baseLanguages.includes(lang)) return;
    if (languages.includes(lang)) {
      update({ languages: languages.filter(l => l !== lang) });
    } else if (languages.length < bonusLanguageSlots) {
      update({ languages: [...languages, lang] });
    }
  };

  // Skills available for increasing (must already be trained, must be below max tier for level)
  const increasableSkills = SKILLS
    .map(s => s.name)
    .filter(name => trained.includes(name) || name === bgSkill);

  return (
    <div>
      <div className="mb-6">
        <p className="font-display text-xs tracking-[0.3em] text-pf-brass uppercase mb-1">Step the Sixth</p>
        <h2 className="font-display text-3xl text-pf-bone">Skills, Feats & Tongues</h2>
      </div>

      <GMWhisper>{STEPS[5].whisper}</GMWhisper>

      {/* === Trained skills (existing) === */}
      <div className="relative bg-pf-bg-card border border-pf-brass-dim/30 p-4 mb-3 flex items-center justify-between">
        <CornerBrackets />
        <div>
          <span className="font-display text-[11px] tracking-[0.2em] text-pf-brass uppercase">Initial Trained Skills</span>
          {bgSkill && <p className="text-[11px] font-body text-pf-stone mt-0.5">"<span className="text-pf-parchment">{bgSkill}</span>" granted automatically by background.</p>}
        </div>
        <span className={`font-display text-3xl tracking-wider ${trained.length === allowed ? 'text-pf-sage' : 'text-pf-brass'}`}>
          {trained.length}<span className="text-pf-stone text-base">/{allowed}</span>
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2 mb-6">
        {SKILLS.map(s => {
          const isBg = s.name === bgSkill;
          const isTrained = trained.includes(s.name) || isBg;
          const tier = skillTiers[s.name] || (isTrained ? 'trained' : 'untrained');
          const tierIdx = ['untrained', 'trained', 'expert', 'master', 'legendary'].indexOf(tier);
          return (
            <button
              key={s.name}
              onClick={() => toggleSkill(s.name)}
              disabled={isBg}
              className={`relative p-2.5 bg-pf-bg-card border text-left transition-all
                          ${isBg ? 'border-pf-brass/60 cursor-not-allowed'
                            : isTrained ? 'border-pf-brass'
                            : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-xs text-pf-bone">{s.name}</span>
                <span className="font-mono text-[9px] text-pf-stone">{s.ability}</span>
              </div>
              <div className="flex items-center justify-between">
                <ProficiencyDots tier={tierIdx >= 0 ? tierIdx : 0} />
                <span className="font-mono text-[9px] text-pf-stone uppercase">
                  {isBg ? 'BG' : tier}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* === Skill Increases (levels 3, 5, 7, …) === */}
      {increaseLevels.length > 0 && (
        <>
          <SectionHeader>Skill Increases ({increaseLevels.length})</SectionHeader>
          <p className="font-body text-xs text-pf-stone mb-3 italic">
            At each listed level, advance a trained skill one tier (Trained → Expert → Master → Legendary). Max tier at any level: Expert by 7, Master by 15, Legendary by 19.
          </p>
          <div className="space-y-2 mb-6">
            {increaseLevels.map(lvl => (
              <div key={lvl} className="flex items-center gap-3 p-2 bg-pf-bg-card border border-pf-brass-dim/30">
                <span className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase w-20 shrink-0">Lv {lvl}</span>
                <select
                  value={skillIncreases[lvl] || ''}
                  onChange={e => setIncrease(lvl, e.target.value)}
                  className="flex-1 bg-pf-bg-elev border border-pf-brass-dim/30 px-3 py-1.5 text-pf-bone font-body text-xs focus:border-pf-brass focus:outline-none"
                >
                  <option value="">— Pick a trained skill to advance —</option>
                  {increasableSkills.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </>
      )}

      {/* === Skill Feats (levels 2, 4, 6, …) === */}
      {skillFeatLevels.length > 0 && (
        <>
          <SectionHeader>Skill Feats ({skillFeatLevels.length})</SectionHeader>
          <p className="font-body text-xs text-pf-stone mb-3 italic">
            Skill feats are class-agnostic feats picked from a shared pool. Sample 1st-level options shown — full catalog wires in via SRD import.
          </p>
          <div className="space-y-4 mb-6">
            {skillFeatLevels.map(lvl => (
              <div key={lvl}>
                <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-2">Level {lvl} Skill Feat</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {SKILL_FEATS.map(f => {
                    const active = skillFeats[lvl] === f.name;
                    const check = meetsPrereqs(f, data);
                    const locked = !active && !check.ok;
                    return (
                      <button
                        key={f.name}
                        onClick={() => !locked && update({ skillFeats: { ...skillFeats, [lvl]: f.name } })}
                        disabled={locked}
                        title={locked ? check.reasons.join('; ') : ''}
                        className={`relative p-2.5 bg-pf-bg-card border text-left transition-all
                                    ${active ? 'border-pf-brass bg-pf-brass/5'
                                      : locked ? 'border-pf-brass-dim/20 opacity-50 cursor-not-allowed'
                                      : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
                      >
                        {active && <CornerBrackets active />}
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-display text-xs text-pf-bone">{f.name}</span>
                          <ThreeActionGlyph count={f.actions} />
                        </div>
                        <p className="font-body text-[10px] text-pf-stone leading-snug">{f.desc}</p>
                        {f.prereqs?.length > 0 && (
                          <p className={`font-mono text-[9px] mt-1 ${locked ? 'text-pf-oxblood-glow' : 'text-pf-stone/70'}`}>
                            {locked ? '🔒 ' : ''}{f.prereqs.join(' · ')}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* === General Feats (levels 3, 7, 11, 15, 19) === */}
      {generalFeatLevels.length > 0 && (
        <>
          <SectionHeader>General Feats ({generalFeatLevels.length})</SectionHeader>
          <p className="font-body text-xs text-pf-stone mb-3 italic">
            General feats are class-agnostic and serve a wide variety of uses — extra HP, faster speed, tougher saves, etc.
          </p>
          <div className="space-y-4 mb-6">
            {generalFeatLevels.map(lvl => (
              <div key={lvl}>
                <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-2">Level {lvl} General Feat</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {GENERAL_FEATS.map(f => {
                    const active = generalFeats[lvl] === f.name;
                    const check = meetsPrereqs(f, data);
                    const locked = !active && !check.ok;
                    return (
                      <button
                        key={f.name}
                        onClick={() => !locked && update({ generalFeats: { ...generalFeats, [lvl]: f.name } })}
                        disabled={locked}
                        title={locked ? check.reasons.join('; ') : ''}
                        className={`relative p-2.5 bg-pf-bg-card border text-left transition-all
                                    ${active ? 'border-pf-brass bg-pf-brass/5'
                                      : locked ? 'border-pf-brass-dim/20 opacity-50 cursor-not-allowed'
                                      : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
                      >
                        {active && <CornerBrackets active />}
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-display text-xs text-pf-bone">{f.name}</span>
                          <ThreeActionGlyph count={f.actions} />
                        </div>
                        <p className="font-body text-[10px] text-pf-stone leading-snug">{f.desc}</p>
                        {f.prereqs?.length > 0 && (
                          <p className={`font-mono text-[9px] mt-1 ${locked ? 'text-pf-oxblood-glow' : 'text-pf-stone/70'}`}>
                            {locked ? '🔒 ' : ''}{f.prereqs.join(' · ')}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* === Languages === */}
      {data.ancestry && (
        <>
          <SectionHeader>Languages ({baseLanguages.length + languages.length})</SectionHeader>
          <p className="font-body text-xs text-pf-stone mb-3 italic">
            Your ancestry grants {baseLanguages.length} base languages. Pick up to {bonusLanguageSlots} bonus languages (= positive INT modifier).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-2">
            {baseLanguages.map(lang => (
              <div key={lang} className="px-3 py-1.5 bg-pf-sage/10 border border-pf-sage/40 text-xs font-body text-pf-bone flex items-center justify-between">
                <span>{lang}</span>
                <span className="text-[9px] font-mono text-pf-sage">BASE</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {COMMON_LANGUAGES.filter(l => !baseLanguages.includes(l)).map(lang => {
              const active = languages.includes(lang);
              const disabled = !active && languages.length >= bonusLanguageSlots;
              return (
                <button
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  disabled={disabled}
                  className={`px-3 py-1.5 border text-xs font-body transition-all
                              ${active ? 'border-pf-brass bg-pf-brass/10 text-pf-bone'
                                : disabled ? 'border-pf-brass-dim/20 text-pf-stone/40 cursor-not-allowed'
                                : 'border-pf-brass-dim/30 text-pf-parchment hover:border-pf-brass-dim'}`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default StepSkills;
