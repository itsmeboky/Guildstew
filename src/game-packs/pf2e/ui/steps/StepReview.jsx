// Step IX — The Forging. Read-only character sheet snapshot + commit button.
// Verbatim from the prototype, with onForge replaced to call onComplete?.(data)
// upstream (parent saves to Supabase / Guildstew character record).

import React from 'react';
import { Hammer } from 'lucide-react';
import GMWhisper from '../components/GMWhisper.jsx';
import CornerBrackets from '../components/CornerBrackets.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import DerivedStat from '../components/DerivedStat.jsx';
import ThreeActionGlyph from '../components/ThreeActionGlyph.jsx';
import {
  ANCESTRIES,
  HERITAGES_BY_ANCESTRY,
  BACKGROUNDS,
  CLASSES,
  CLASS_DETAILS,
  SUBCLASS_SUBPICKS,
  SKILLS,
  SKILL_FEATS,
  GENERAL_FEATS,
} from '../../data/index.js';
import { ABILITIES } from '../../rules/constants.js';
import { computeDerivedStats } from '../../rules/compute-derived-stats.js';
import { getEffectiveKeyAbility } from '../../rules/key-ability.js';
import { fmtMod } from '../../rules/compute-ability-scores.js';
import { profBonus } from '../../rules/proficiency.js';
import { formatCharacterSubline } from '../../rules/character-subline.js';
import { computeBuildType, computeFeatHPBonus, computeSpeedBonus } from '../../rules/house-rules.js';
import { computeItemSkillBonuses } from '../../rules/armor-classifier.js';
import { STEPS } from '../../config/steps.js';

const formatPrice = (sp) => {
  if (sp <= 0) return 'Free';
  const gp = Math.floor(sp / 10);
  const remSp = sp % 10;
  if (gp === 0) return `${remSp} sp`;
  if (remSp === 0) return `${gp} gp`;
  return `${gp} gp ${remSp} sp`;
};

const StepReview = ({ data, onForge }) => {
  const ancestry = ANCESTRIES.find(a => a.slug === data.ancestry);
  const heritage = ancestry ? HERITAGES_BY_ANCESTRY[ancestry.id]?.find(h => h.slug === data.heritage) : null;
  const background = BACKGROUNDS.find(b => b.slug === data.background);
  const cls = CLASSES.find(c => c.slug === data.class);
  const effectiveKey = getEffectiveKeyAbility(cls, data);
  const details = cls ? CLASS_DETAILS[cls.id] : null;
  const subclass = cls && details?.subclasses?.options.find(o => o.id === data.subclass);
  const stats = computeDerivedStats(data);
  const buildType = computeBuildType(data);
  const hpFeatBonus = computeFeatHPBonus(data);
  const speedFeatBonus = computeSpeedBonus(data);
  const finalHP = stats.hp + hpFeatBonus;
  const finalSpeed = (ancestry?.speed || 0) + speedFeatBonus;

  const classFeatCount   = data.classFeats   ? Object.values(data.classFeats).filter(Boolean).length : 0;
  const ancestryFeatCount = data.ancestryFeats ? Object.values(data.ancestryFeats).filter(Boolean).length : 0;
  const skillFeatCount   = data.skillFeats   ? Object.values(data.skillFeats).filter(Boolean).length : 0;
  const generalFeatCount = data.generalFeats ? Object.values(data.generalFeats).filter(Boolean).length : 0;
  const spellsKnown = (data.cantripsKnown?.length || 0) + (data.rank1Known?.length || 0);

  // Per-skill modifiers
  const trained = data.trainedSkills || [];
  const bgSkill = BACKGROUNDS.find(b => b.slug === data.background)?.skill;
  const skillTiers = data.skillTiers || {};
  const itemBonuses = computeItemSkillBonuses(data);
  const skillModifiers = SKILLS.map(s => {
    const isTrained = trained.includes(s.name) || s.name === bgSkill;
    const tier = skillTiers[s.name] || (isTrained ? 'trained' : 'untrained');
    const abilityMod = stats.mods[s.ability === 'STR' ? 'Strength' : s.ability === 'DEX' ? 'Dexterity' :
                                  s.ability === 'CON' ? 'Constitution' : s.ability === 'INT' ? 'Intelligence' :
                                  s.ability === 'WIS' ? 'Wisdom' : 'Charisma'];
    const itemBonus = itemBonuses[s.name] || 0;
    const modifier = abilityMod + profBonus(tier, stats.level, stats.opts) + itemBonus;
    return { name: s.name, ability: s.ability, tier, modifier, itemBonus };
  });

  // Reactions list — gather any chosen feat whose actions field is 'reaction'
  const allFeats = [
    ...Object.values(data.classFeats || {}),
    ...Object.values(data.ancestryFeats || {}),
    ...Object.values(data.skillFeats || {}),
    ...Object.values(data.generalFeats || {}),
  ].filter(Boolean);
  const reactionFeats = [
    ...SKILL_FEATS.filter(f => f.actions === 'reaction' && allFeats.includes(f.name)),
    ...GENERAL_FEATS.filter(f => f.actions === 'reaction' && allFeats.includes(f.name)),
  ];

  // Completeness check — what's still missing for a fully-built character
  const missing = [];
  if (!data.name) missing.push('Character name');
  if (!data.ancestry) missing.push('Ancestry');
  if (!data.heritage) missing.push('Heritage');
  if (!data.background) missing.push('Background');
  if (data.background && !data.backgroundLore) missing.push('Background Lore subskill');
  if (!data.class) missing.push('Class');
  if (cls && details?.subclasses && !data.subclass) missing.push(`${details.subclasses.label} (subclass)`);
  if (data.subclass && SUBCLASS_SUBPICKS[data.subclass] && !data.subclassPick) missing.push(`${SUBCLASS_SUBPICKS[data.subclass].label}`);
  if (cls && cls.spellcasting && data.cantripsKnown?.length === 0) missing.push('Cantrips');

  return (
    <div>
      <div className="mb-6">
        <p className="font-display text-xs tracking-[0.3em] text-pf-brass uppercase mb-1">Step the Ninth</p>
        <h2 className="font-display text-3xl text-pf-bone">The Forging</h2>
      </div>

      <GMWhisper>{STEPS[8].whisper}</GMWhisper>

      {missing.length > 0 && (
        <div className="relative bg-pf-bg-card border border-pf-oxblood/40 p-4 mt-4 mb-2">
          <p className="font-display text-[10px] tracking-[0.25em] text-pf-oxblood-glow uppercase mb-2">⚠ Build Incomplete</p>
          <p className="font-body text-xs text-pf-parchment mb-2">Your character is missing:</p>
          <ul className="font-body text-xs text-pf-bone space-y-0.5">
            {missing.map(m => <li key={m}>· {m}</li>)}
          </ul>
        </div>
      )}

      <div className="relative bg-pf-bg-card border border-pf-brass p-8 mt-4">
        <CornerBrackets active />
        <CharacterCardHeader
          data={data}
          name={data.name || 'Unnamed'}
          subline={formatCharacterSubline({ level: stats.level, heritage, ancestry, cls, subclass, background })}
          buildType={buildType}
          catchphrase={data.catchphrase}
        />

        {/* Ability scores row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-6">
          {ABILITIES.map(ab => {
            const score = stats.scores[ab];
            const mod = stats.mods[ab];
            const isKey = ab === effectiveKey;
            return (
              <div key={ab} className={`relative p-2 bg-pf-bg-elev border text-center ${isKey ? 'border-pf-brass' : 'border-pf-brass-dim/30'}`}>
                {isKey && <CornerBrackets active />}
                <p className="font-mono text-[10px] text-pf-stone">{ab.slice(0, 3).toUpperCase()}</p>
                <p className="font-mono text-2xl text-pf-bone leading-none my-1">{score}</p>
                <p className="font-mono text-xs text-pf-brass">{fmtMod(mod)}</p>
              </div>
            );
          })}
        </div>

        {/* Combat stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
          <DerivedStat label="HP" value={finalHP} />
          <DerivedStat label="AC" value={stats.ac} />
          <DerivedStat label="Fort" value={fmtMod(stats.fort)} />
          <DerivedStat label="Reflex" value={fmtMod(stats.ref)} />
          <DerivedStat label="Will" value={fmtMod(stats.will)} />
          <DerivedStat label="Perception" value={fmtMod(stats.perception)} />
          <DerivedStat label="Initiative" value={fmtMod(stats.initiative)} />
          {stats.classDC !== null && <DerivedStat label="Class DC" value={stats.classDC} />}
          {stats.spellDC !== null && <DerivedStat label="Spell DC" value={stats.spellDC} />}
          {stats.spellAttack !== null && <DerivedStat label="Spell Atk" value={fmtMod(stats.spellAttack)} />}
          <DerivedStat label="Speed" value={`${finalSpeed} ft`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm font-body">
          <div>
            <SectionHeader>Vital Stats</SectionHeader>
            <div className="space-y-1 text-pf-parchment text-xs">
              <div className="flex justify-between"><span className="text-pf-stone">Size</span><span>{ancestry?.size || '—'}</span></div>
              <div className="flex justify-between"><span className="text-pf-stone">Vision</span><span className="capitalize">{ancestry?.vision || '—'}</span></div>
              <div className="flex justify-between"><span className="text-pf-stone">Key Ability</span><span>{effectiveKey || cls?.keyAbility?.join('/') || '—'}</span></div>
              {subclass && <div className="flex justify-between"><span className="text-pf-stone">{details.subclasses.label}</span><span className="text-pf-brass">{subclass.name}</span></div>}
              {data.sanctification && data.sanctification !== 'none' && (
                <div className="flex justify-between"><span className="text-pf-stone">Sanctification</span><span className="capitalize text-pf-brass">{data.sanctification}</span></div>
              )}
              <div className="flex justify-between"><span className="text-pf-stone">Languages</span><span className="text-right text-[10px]">{[...stats.baseLanguages, ...(data.languages || [])].join(', ') || '—'}</span></div>
            </div>
          </div>

          <div>
            <SectionHeader>Selections</SectionHeader>
            <div className="space-y-1 text-pf-parchment text-xs">
              <div><span className="text-pf-stone">Class Feats: </span>{classFeatCount} chosen</div>
              {ancestryFeatCount > 0 && <div><span className="text-pf-stone">Ancestry Feats: </span>{ancestryFeatCount} chosen</div>}
              {skillFeatCount > 0   && <div><span className="text-pf-stone">Skill Feats: </span>{skillFeatCount} chosen</div>}
              {generalFeatCount > 0 && <div><span className="text-pf-stone">General Feats: </span>{generalFeatCount} chosen</div>}
              <div><span className="text-pf-stone">Trained Skills: </span>{(data.trainedSkills || []).join(', ') || '—'}</div>
              {data.backgroundLore && <div><span className="text-pf-stone">Lore: </span>{data.backgroundLore}</div>}
              {spellsKnown > 0 && <div><span className="text-pf-stone">Spells: </span>{data.cantripsKnown?.length || 0} cantrips, {data.rank1Known?.length || 0} rank-1</div>}
              {data.deity && <div><span className="text-pf-stone">Deity: </span><span className="text-pf-brass">{data.deity.name}</span></div>}
              {data.loadout?.length > 0 && (
                <div>
                  <span className="text-pf-stone">Equipment: </span>
                  {data.loadout.length} item{data.loadout.length > 1 ? 's' : ''}
                  <span className="text-pf-stone"> · </span>
                  {formatPrice(data.loadout.reduce((s, i) => s + i.priceSp * (i.qty || 1), 0))} spent
                </div>
              )}
            </div>
          </div>

          <div>
            <SectionHeader>Identity</SectionHeader>
            <p className="text-xs italic text-pf-parchment leading-relaxed">{data.bio?.slice(0, 200) || 'No biography written yet.'}{data.bio?.length > 200 ? '…' : ''}</p>
            {data.edicts && <p className="text-[11px] text-pf-stone mt-2"><span className="text-pf-brass font-display tracking-wider text-[9px] uppercase">Edicts</span> {data.edicts}</p>}
            {data.anathema && <p className="text-[11px] text-pf-stone mt-1.5"><span className="text-pf-oxblood-glow font-display tracking-wider text-[9px] uppercase">Anathema</span> {data.anathema}</p>}
            {data.alliesEnemies && <p className="text-[11px] text-pf-stone mt-1.5"><span className="text-pf-brass font-display tracking-wider text-[9px] uppercase">Ties</span> {data.alliesEnemies}</p>}
          </div>
        </div>

        {/* Per-skill modifiers grid */}
        <div className="mt-6 pt-5 border-t border-pf-brass-dim/30">
          <SectionHeader>Skill Modifiers</SectionHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1.5">
            {skillModifiers.map(s => (
              <div key={s.name} className={`p-1.5 bg-pf-bg-elev border ${s.tier === 'untrained' ? 'border-pf-brass-dim/15 opacity-60' : 'border-pf-brass-dim/30'}`}>
                <p className="font-display text-[9px] text-pf-bone leading-none">{s.name}</p>
                <p className="font-mono text-[10px] text-pf-stone mt-0.5">{s.ability}{s.itemBonus > 0 ? <span className="text-pf-sage ml-1">+{s.itemBonus} item</span> : ''}</p>
                <p className={`font-mono text-base leading-none mt-0.5 ${s.tier !== 'untrained' ? 'text-pf-brass' : 'text-pf-stone'}`}>{fmtMod(s.modifier)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reactions and action economy */}
        <div className="mt-6 pt-5 border-t border-pf-brass-dim/30 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SectionHeader>Action Economy</SectionHeader>
            <div className="text-xs font-body text-pf-parchment space-y-1">
              <div className="flex items-center gap-3">
                <ThreeActionGlyph count={3} />
                <span>3 actions per turn (Strike, Stride, Step, casts, skill actions)</span>
              </div>
              <div className="flex items-center gap-3">
                <ThreeActionGlyph count="reaction" />
                <span>1 reaction per round (triggered defenses)</span>
              </div>
              <div className="flex items-center gap-3">
                <ThreeActionGlyph count="free" />
                <span>Unlimited free actions (per-trigger limits apply)</span>
              </div>
            </div>
          </div>

          <div>
            <SectionHeader>Reactions Known</SectionHeader>
            {reactionFeats.length > 0 ? (
              <div className="space-y-1.5">
                {reactionFeats.map(f => (
                  <div key={f.name} className="flex items-baseline justify-between text-xs font-body py-1 border-b border-pf-brass-dim/10">
                    <span className="text-pf-bone">{f.name}</span>
                    <ThreeActionGlyph count="reaction" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body text-xs text-pf-stone italic">No reactions among picked feats yet. Shield Block (general feat) and reaction-tagged class feats appear here once chosen.</p>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-pf-brass-dim/30 flex justify-center">
          <button
            onClick={onForge}
            className="relative px-12 py-4 bg-pf-oxblood text-pf-bone font-display tracking-[0.3em] text-sm uppercase
                       hover:bg-pf-oxblood-glow hover:shadow-[0_0_40px_-8px_rgba(200,50,62,0.7)] transition-all"
          >
            <Hammer size={16} className="inline-block mr-3 -mt-1" />
            Forge Character
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Header band for the final character card: framed portrait (2:3 with
 * gold corner brackets) + circular token tucked against it like a
 * signet seal, with the name / sub-line / catchphrase to the right.
 * Falls back to a parchment-toned placeholder when an image hasn't
 * been uploaded yet so the layout doesn't collapse.
 */
function CharacterCardHeader({ data, name, subline, buildType, catchphrase }) {
  // Portrait/token live flat on `data` after the Phase J.2 flatten.
  // Kept the legacy nested read as a fallback so in-flight drafts
  // that pre-date the flatten don't lose their image preview.
  const portraitUrl = data.portrait_url || data.system_data?.portrait_url || null;
  const tokenUrl = data.token_url || data.system_data?.token_url || null;

  return (
    <div className="mb-6 pb-6 border-b border-pf-brass-dim/30">
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
        {/* Framed portrait + signet token */}
        <div className="relative shrink-0">
          <div className="relative w-40 aspect-[2/3] bg-pf-bg-elev border border-pf-brass-dim/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.7)] overflow-hidden">
            <CornerBrackets active />
            {portraitUrl ? (
              <img src={portraitUrl} alt={`${name} portrait`} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-pf-stone font-display text-[10px] tracking-[0.25em] uppercase">
                No portrait
              </div>
            )}
          </div>

          {/* Token tucked at the bottom-right of the portrait, like a signet seal */}
          <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-pf-bg-elev
                          border-2 border-pf-brass shadow-[0_4px_14px_-4px_rgba(0,0,0,0.7),inset_0_0_12px_rgba(201,169,97,0.25)]
                          overflow-hidden">
            {tokenUrl ? (
              <img src={tokenUrl} alt={`${name} token`} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[8px] font-display text-pf-stone tracking-[0.15em] uppercase">
                Token
              </div>
            )}
          </div>
        </div>

        {/* Identity text */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="font-display text-5xl text-pf-bone mb-2">{name}</h1>
          <p className="font-display text-sm tracking-[0.3em] text-pf-brass uppercase">{subline}</p>
          {buildType && (
            <p className="font-display text-[10px] tracking-[0.3em] text-pf-brass-dim uppercase mt-1">— {buildType} —</p>
          )}
          {catchphrase && (
            <p className="font-body italic text-sm text-pf-parchment mt-3">"{catchphrase}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default StepReview;
