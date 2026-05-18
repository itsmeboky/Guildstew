// Step I — Who Walks Into the Story? (level + bio + house-rule toggles).
// Verbatim from the PF2eCharacterForge prototype.

import React from 'react';
import GMWhisper from '../components/GMWhisper.jsx';
import CornerBrackets from '../components/CornerBrackets.jsx';
import PortraitUpload from '../components/PortraitUpload.jsx';
import { LevelStat } from '../components/BottomBar.jsx';
import {
  ANCESTRIES,
  HERITAGES_BY_ANCESTRY,
  BACKGROUNDS,
  CLASSES,
  STANDARD_CLASS_FEAT_LEVELS,
  ANCESTRY_FEAT_LEVELS,
  GENERAL_FEAT_LEVELS,
  SKILL_FEAT_LEVELS,
  BOOST_BATCH_LEVELS,
  STARTING_WEALTH_BY_LEVEL,
  HIGHEST_SPELL_RANK,
} from '../../data/index.js';
import { STEPS } from '../../config/steps.js';

const StepIdentity = ({ data, update, setData }) => {
  const level = data.level || 1;
  const setLevel = (n) => update({ level: Math.max(1, Math.min(20, n)) });

  // Quick preview of what this level grants
  const classFeatCount = STANDARD_CLASS_FEAT_LEVELS.filter(l => l <= level).length;
  const ancestryFeatCount = ANCESTRY_FEAT_LEVELS.filter(l => l <= level).length;
  const generalFeatCount = GENERAL_FEAT_LEVELS.filter(l => l <= level).length;
  const skillFeatCount = SKILL_FEAT_LEVELS.filter(l => l <= level).length;
  const boostBatches = BOOST_BATCH_LEVELS.filter(l => l <= level).length;
  const startingGp = STARTING_WEALTH_BY_LEVEL[level] || 15;
  const maxSpellRank = HIGHEST_SPELL_RANK(level);

  // Random character generator — picks ancestry / heritage / background / class / boosts
  const rollRandom = () => {
    if (!setData) return;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const ancestry = pick(ANCESTRIES);
    const heritage = pick(HERITAGES_BY_ANCESTRY[ancestry.id] || [{ id: 'standard' }]);
    const background = pick(BACKGROUNDS);
    const cls = pick(CLASSES);
    const keyAb = cls.keyAbility[0];
    // Random level-1 free boosts (4 distinct abilities, prioritizing key ability)
    const all = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const boosts = { [keyAb]: 1 };
    let added = 1;
    for (const ab of shuffled) {
      if (boosts[ab]) continue;
      if (added >= 4) break;
      boosts[ab] = 1; added++;
    }
    setData({
      ...data,
      name: '', // user fills in
      ancestry: ancestry.id, heritage: heritage.id,
      background: background.id,
      class: cls.id,
      boostBatches: { 1: boosts },
      classFeats: {}, ancestryFeats: {}, trainedSkills: [],
    });
  };

  // Pre-gen template loader (full builds — for new players)
  const loadTemplate = (templateId) => {
    if (!setData) return;
    const base = {
      ...data,
      catchphrase: '', edicts: '', anathema: '', alliesEnemies: '',
      classFeats: {}, ancestryFeats: {}, skillFeats: {}, generalFeats: {},
      skillIncreases: {}, skillTiers: {}, languages: [],
      cantripsKnown: [], rank1Known: [], spellsByRank: {}, spellbook: [],
      focusSpells: [], loadout: [], kitTaken: null,
    };
    const templates = {
      'iconic-fighter': {
        ...base, name: 'Valeros', ancestry: 'human', heritage: 'versatile', background: 'soldier',
        class: 'fighter', subclass: null, classFeats: { 1: 'Power Attack' },
        trainedSkills: ['Athletics', 'Intimidation'],
        boostBatches: { 1: { Constitution: 1, Wisdom: 1, Charisma: 1 } },
        kitTaken: 'fighter',
      },
      'iconic-wizard': {
        ...base, name: 'Ezren', ancestry: 'human', heritage: 'skilled', background: 'scholar',
        class: 'wizard', subclass: 'spell-substitution', classFeats: { 1: 'Reach Spell' },
        trainedSkills: ['Society', 'Arcana'], arcaneBond: 'staff',
        boostBatches: { 1: { Constitution: 1, Wisdom: 1, Dexterity: 1 } },
        kitTaken: 'wizard',
      },
      'iconic-rogue': {
        ...base, name: 'Merisiel', ancestry: 'elf', heritage: 'whisper', background: 'criminal',
        class: 'rogue', subclass: 'thief', classFeats: { 1: 'Nimble Dodge' },
        trainedSkills: ['Stealth', 'Thievery', 'Acrobatics', 'Athletics'],
        boostBatches: { 1: { Constitution: 1, Wisdom: 1, Charisma: 1 } },
        kitTaken: 'rogue',
      },
      'iconic-cleric': {
        ...base, name: 'Kyra', ancestry: 'human', heritage: 'skilled', background: 'acolyte',
        class: 'cleric', subclass: 'warpriest', classFeats: { 1: 'Domain Initiate' },
        domain: 'sun', sanctification: 'holy', healHarmFont: 'heal',
        trainedSkills: ['Religion', 'Medicine'],
        boostBatches: { 1: { Constitution: 1, Strength: 1, Charisma: 1 } },
        kitTaken: 'cleric',
      },
    };
    if (templates[templateId]) setData(templates[templateId]);
  };

  return (
  <div>
    <div className="mb-6">
      <p className="font-display text-xs tracking-[0.3em] text-pf-brass uppercase mb-1">Step the First</p>
      <h2 className="font-display text-3xl text-pf-bone">Who Walks Into the Story?</h2>
    </div>

    <GMWhisper>{STEPS[0].whisper}</GMWhisper>

    {/* Quick-start row — templates and random generator */}
    <div className="relative bg-pf-bg-card border border-pf-brass-dim/30 p-4 mb-5">
      <CornerBrackets />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-1">Quick Start</p>
          <p className="font-body text-[11px] text-pf-stone italic">New player? Start from an iconic build and customize. Or let the dice decide.</p>
        </div>
        <button onClick={() => loadTemplate('iconic-fighter')} className="px-3 py-1.5 bg-pf-bg-elev border border-pf-brass-dim/40 text-pf-bone text-[10px] font-display tracking-wider uppercase hover:border-pf-brass hover:bg-pf-brass/10 transition-all">⚔ Iconic Fighter</button>
        <button onClick={() => loadTemplate('iconic-wizard')} className="px-3 py-1.5 bg-pf-bg-elev border border-pf-brass-dim/40 text-pf-bone text-[10px] font-display tracking-wider uppercase hover:border-pf-brass hover:bg-pf-brass/10 transition-all">📜 Iconic Wizard</button>
        <button onClick={() => loadTemplate('iconic-rogue')} className="px-3 py-1.5 bg-pf-bg-elev border border-pf-brass-dim/40 text-pf-bone text-[10px] font-display tracking-wider uppercase hover:border-pf-brass hover:bg-pf-brass/10 transition-all">🗡 Iconic Rogue</button>
        <button onClick={() => loadTemplate('iconic-cleric')} className="px-3 py-1.5 bg-pf-bg-elev border border-pf-brass-dim/40 text-pf-bone text-[10px] font-display tracking-wider uppercase hover:border-pf-brass hover:bg-pf-brass/10 transition-all">☩ Iconic Cleric</button>
        <button onClick={rollRandom} className="px-3 py-1.5 bg-pf-oxblood/70 border border-pf-oxblood text-pf-bone text-[10px] font-display tracking-wider uppercase hover:bg-pf-oxblood transition-all">🎲 Roll Random</button>
      </div>
    </div>

    {/* LEVEL SELECTOR — prominent, above everything else */}
    <div className="relative bg-pf-bg-card border border-pf-brass-dim/30 p-5 my-6">
      <CornerBrackets active />
      <div className="grid grid-cols-12 gap-5 items-center">
        <div className="col-span-12 md:col-span-4 flex flex-col items-center md:items-start gap-2">
          <p className="font-display text-[10px] tracking-[0.3em] text-pf-brass uppercase">Character Level</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLevel(level - 1)}
              disabled={level <= 1}
              className={`w-10 h-10 border flex items-center justify-center transition-all
                          ${level <= 1
                            ? 'border-pf-brass-dim/20 text-pf-stone/30 cursor-not-allowed'
                            : 'border-pf-brass text-pf-brass hover:bg-pf-brass/10'}`}
            >
              <span className="font-mono text-lg leading-none">−</span>
            </button>
            <div className="font-display text-5xl text-pf-bone w-16 text-center tabular-nums leading-none">{level}</div>
            <button
              onClick={() => setLevel(level + 1)}
              disabled={level >= 20}
              className={`w-10 h-10 border flex items-center justify-center transition-all
                          ${level >= 20
                            ? 'border-pf-brass-dim/20 text-pf-stone/30 cursor-not-allowed'
                            : 'border-pf-brass text-pf-brass hover:bg-pf-brass/10'}`}
            >
              <span className="font-mono text-lg leading-none">+</span>
            </button>
          </div>
          <p className="font-display text-[10px] tracking-[0.15em] text-pf-stone uppercase mt-1">1 — 20</p>
        </div>

        <div className="col-span-12 md:col-span-8 md:border-l md:border-pf-brass-dim/20 md:pl-5">
          <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-3">At this level, you'll choose:</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 text-xs font-body text-pf-parchment">
            <LevelStat label="Class feats" value={classFeatCount} />
            <LevelStat label="Ancestry feats" value={ancestryFeatCount} />
            <LevelStat label="Skill feats" value={skillFeatCount} />
            <LevelStat label="General feats" value={generalFeatCount} />
            <LevelStat label="Boost batches" value={boostBatches} />
            <LevelStat label="Max spell rank" value={maxSpellRank} />
            <LevelStat label="Starting wealth" value={`${startingGp} gp`} />
            <LevelStat label="Multiclass" value={level >= 2 ? 'Available' : '—'} />
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-12 gap-6 mt-6">
      {/* Left: avatar + portrait */}
      <div className="col-span-12 md:col-span-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 items-start">
          <PortraitUpload value={data.avatar} onChange={v => update({ avatar: v })} label="Token Avatar" aspect="aspect-square" round />
          <div className="text-[10px] text-pf-stone font-body leading-relaxed pt-6">
            Small circular image shown on maps and chat rolls. Crop tight to the face.
          </div>
        </div>
        <PortraitUpload value={data.portrait} onChange={v => update({ portrait: v })} label="Full Portrait" aspect="aspect-[3/4]" />
        <p className="text-[10px] text-pf-stone font-body leading-relaxed italic">
          Portrait shows on the character sheet and in scene panels. Upload yours, or generate one in the studio.
        </p>
      </div>

      {/* Right: name/bio */}
      <div className="col-span-12 md:col-span-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Character Name</label>
            <input
              value={data.name || ''}
              onChange={e => update({ name: e.target.value })}
              placeholder="Aria Voss"
              className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body
                         focus:border-pf-brass focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Pronouns</label>
            <input
              value={data.pronouns || ''}
              onChange={e => update({ pronouns: e.target.value })}
              placeholder="she / her"
              className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body
                         focus:border-pf-brass focus:outline-none transition-all"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Age</label>
            <input
              value={data.age || ''}
              onChange={e => update({ age: e.target.value })}
              placeholder="27"
              className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body
                         focus:border-pf-brass focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Height</label>
            <input
              value={data.height || ''}
              onChange={e => update({ height: e.target.value })}
              placeholder="5'7&quot;"
              className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body
                         focus:border-pf-brass focus:outline-none transition-all"
            />
          </div>
        </div>
        <div>
          <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Biography</label>
          <textarea
            rows={5}
            value={data.bio || ''}
            onChange={e => update({ bio: e.target.value })}
            placeholder="Where do they come from? What did they lose? What do they want badly enough to risk dying for?"
            className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body
                       focus:border-pf-brass focus:outline-none transition-all resize-none"
          />
        </div>

        <div>
          <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Catchphrase <span className="text-pf-stone normal-case lowercase tracking-normal italic">(optional)</span></label>
          <input
            value={data.catchphrase || ''}
            onChange={e => update({ catchphrase: e.target.value })}
            placeholder="&quot;Tides take you.&quot;  /  &quot;For the queen — and her gold.&quot;"
            className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body italic
                       focus:border-pf-brass focus:outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Sanctification</label>
            <select
              value={data.sanctification || 'none'}
              onChange={e => update({ sanctification: e.target.value })}
              className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body
                         focus:border-pf-brass focus:outline-none transition-all"
            >
              <option value="none">None</option>
              <option value="holy">Holy</option>
              <option value="unholy">Unholy</option>
            </select>
            <p className="text-[10px] text-pf-stone italic mt-1">Replaces alignment. Required by some deities/classes.</p>
          </div>
          <div className="md:col-span-2">
            <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Edicts <span className="text-pf-stone normal-case lowercase tracking-normal italic">(what your character upholds)</span></label>
            <input
              value={data.edicts || ''}
              onChange={e => update({ edicts: e.target.value })}
              placeholder="Protect the helpless. Honor sworn debts. Never refuse a guest's hospitality."
              className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body text-sm
                         focus:border-pf-brass focus:outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Anathema <span className="text-pf-stone normal-case lowercase tracking-normal italic">(what your character refuses)</span></label>
          <input
            value={data.anathema || ''}
            onChange={e => update({ anathema: e.target.value })}
            placeholder="Never lie to a child. Never strike from behind. Never break bread with a slaver."
            className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body text-sm
                       focus:border-pf-brass focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Allies & Enemies <span className="text-pf-stone normal-case lowercase tracking-normal italic">(optional)</span></label>
          <textarea
            rows={2}
            value={data.alliesEnemies || ''}
            onChange={e => update({ alliesEnemies: e.target.value })}
            placeholder="Family, mentors, rivals, debts owed and owed-to."
            className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body text-sm
                       focus:border-pf-brass focus:outline-none transition-all resize-none"
          />
        </div>

        {/* House Rules / Optional Variants */}
        <div className="border-t border-pf-brass-dim/20 pt-4 mt-2">
          <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-2">House Rules <span className="text-pf-stone normal-case lowercase tracking-normal italic">(GM-toggled variants)</span></label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { id: 'freeArchetype',          label: 'Free Archetype',         desc: 'Bonus archetype feat at every even level — most-requested PF2e variant.' },
              { id: 'ancestryParagon',        label: 'Ancestry Paragon',       desc: 'Ancestry feats at levels 1, 3, 7, 11, 15 (instead of 1, 5, 9, 13, 17).' },
              { id: 'voluntaryFlaws',         label: 'Voluntary Flaws',        desc: 'Accept two extra ability flaws in exchange for one bonus boost.' },
              { id: 'proficiencyWithoutLevel',label: 'Proficiency w/o Level',  desc: 'Drop level from proficiency math. Lower-magic feel.' },
              { id: 'dualClass',              label: 'Dual-Class',             desc: 'Level two classes in parallel. High-power variant.' },
              { id: 'gradualBoosts',          label: 'Gradual Ability Boosts', desc: 'Spread each batch of 4 boosts across 4 levels instead of one.' },
            ].map(rule => {
              const houseRules = data.houseRules || {};
              const active = !!houseRules[rule.id];
              return (
                <button
                  key={rule.id}
                  onClick={() => update({ houseRules: { ...houseRules, [rule.id]: !active } })}
                  className={`relative text-left p-3 bg-pf-bg-elev border transition-all
                              ${active ? 'border-pf-brass bg-pf-brass/5' : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-xs text-pf-bone tracking-wider">{rule.label}</span>
                    <span className={`font-mono text-[10px] ${active ? 'text-pf-sage' : 'text-pf-stone'}`}>
                      {active ? '✓ ON' : '○ OFF'}
                    </span>
                  </div>
                  <p className="font-body text-[10px] text-pf-stone leading-snug">{rule.desc}</p>
                </button>
              );
            })}
          </div>
          <p className="font-body text-[10px] text-pf-stone italic mt-2">
            These propagate to the Boosts and Class steps automatically. Toggle with your GM before play.
          </p>
        </div>
      </div>
    </div>
  </div>
  );
};

export default StepIdentity;
