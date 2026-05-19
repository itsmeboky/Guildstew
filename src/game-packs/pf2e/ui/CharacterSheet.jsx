// PF2e character library detail view. Mounted by
// CharacterDetailDispatcher for every persisted PF2e character.
//
// Naming: exported as `CharacterSheet` (the registry's lazy-import
// target) but conceptually this is the *library* detail renderer —
// distinct from the in-creator review screen at StepReview.jsx. Once
// additional packs ship, the dispatcher will look up the right
// component per pack and this becomes one of several.
//
// Data shape: the creator persists the full draft into
// `character.system_data`, so most reads here come through
// `sd = character.system_data || {}`. Portrait/token/allies/enemies
// are one extra level deeper (`sd.system_data.{…}`) because
// StepIdentity nested them — accessed via `media(sd)`.

import React, { useState } from 'react';
import GamePackTag from '@/components/characters/GamePackTag';
import {
  ANCESTRIES, HERITAGES_BY_ANCESTRY, BACKGROUNDS, CLASSES, CLASS_DETAILS,
  SKILLS, CASTING_TRADITION_BY_CLASS,
} from '../data/index.js';
import { computeDerivedStats } from '../rules/compute-derived-stats.js';
import { PROFICIENCY_TIER_LABELS, PROF_TIER_INDEX, profBonus } from '../rules/proficiency.js';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const fmtMod = (n) => (n >= 0 ? `+${n}` : `${n}`);

const sd = (character) => character?.system_data || {};
const media = (sdObj) => sdObj?.system_data || {};

const TABS = [
  { key: 'stats',      label: 'Stats' },
  { key: 'skills',     label: 'Skills' },
  { key: 'feats',      label: 'Feats' },
  { key: 'spells',     label: 'Spells', requiresCaster: true },
  { key: 'background', label: 'Background' },
  { key: 'inventory',  label: 'Inventory' },
];

function isCaster(data) {
  return (data?.cantripsKnown?.length || 0) > 0
    || Object.values(data?.spellsByRank || {}).some(arr => arr?.length > 0)
    || !!CASTING_TRADITION_BY_CLASS[data?.class];
}

export default function CharacterSheet({ character, pack, data: legacyData }) {
  // Backward compat: the in-creator preview at StepReview wraps this
  // file with `<CharacterSheet data={data} />`, passing the draft
  // directly. Wrap it into the character shape the new view expects.
  const resolvedCharacter = character
    || (legacyData
      ? { name: legacyData.name, system_data: legacyData }
      : null);

  const data = sd(resolvedCharacter);
  const tabs = TABS.filter(t => !t.requiresCaster || isCaster(data));
  const [activeTab, setActiveTab] = useState('stats');

  if (!resolvedCharacter) {
    return <div className="text-pf-stone italic p-4">No character provided.</div>;
  }

  return (
    <div className="text-pf-bone font-body">
      <PathfinderCharacterHeader character={resolvedCharacter} pack={pack} />

      <div className="flex border-b border-pf-brass-dim/30 mt-4 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 font-display text-[10px] tracking-[0.2em] uppercase transition-all border-b-2
                        ${activeTab === tab.key
                          ? 'border-pf-brass text-pf-bone bg-pf-brass/5'
                          : 'border-transparent text-pf-stone hover:text-pf-parchment'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeTab === 'stats'      && <StatsTab data={data} />}
        {activeTab === 'skills'     && <SkillsTab data={data} />}
        {activeTab === 'feats'      && <FeatsTab data={data} />}
        {activeTab === 'spells'     && <SpellsTab data={data} />}
        {activeTab === 'background' && <BackgroundTab data={data} />}
        {activeTab === 'inventory'  && <InventoryTab data={data} />}
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────

function PathfinderCharacterHeader({ character, pack }) {
  const data = sd(character);
  const m = media(data);
  const ancestry = ANCESTRIES.find(a => a.slug === data.ancestry);
  const heritageList = HERITAGES_BY_ANCESTRY[data.ancestry] || [];
  const heritage = heritageList.find(h => h.slug === data.heritage);
  const background = BACKGROUNDS.find(b => b.slug === data.background);
  const cls = CLASSES.find(c => c.slug === data.class);

  const sublineParts = [
    `Level ${data.level || 1}`,
    [heritage?.name, ancestry?.name].filter(Boolean).join(' '),
    cls?.name,
    background?.name,
  ].filter(Boolean);

  return (
    <header className="space-y-2">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-3xl text-[#FF5722] font-bold">{character.name || 'Unnamed'}</h1>
        {pack && <GamePackTag pack={pack} size="lg" />}
      </div>
      <p className="text-pf-stone text-sm font-display tracking-[0.18em] uppercase">
        {sublineParts.join(' · ')}
      </p>
      {data.catchphrase && (
        <p className="text-pf-parchment italic text-sm">"{data.catchphrase}"</p>
      )}
      {data.bio && (
        <p className="text-pf-parchment text-sm leading-relaxed whitespace-pre-line">{data.bio}</p>
      )}
      {(m.allies || m.enemies) && (
        <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
          {m.allies && (
            <div>
              <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-0.5">Allies</p>
              <p className="text-pf-parchment leading-snug">{m.allies}</p>
            </div>
          )}
          {m.enemies && (
            <div>
              <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-0.5">Enemies</p>
              <p className="text-pf-parchment leading-snug">{m.enemies}</p>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

// ─── Stats tab ────────────────────────────────────────────────

function StatsTab({ data }) {
  const stats = computeDerivedStats(data);
  const ancestry = ANCESTRIES.find(a => a.slug === data.ancestry);
  const speed = ancestry?.speed || 25;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <StatBlock label="HP" value={stats.hp} />
        <StatBlock label="AC" value={stats.ac} />
        <StatBlock label="Speed" value={`${speed} ft`} />
        <StatBlock label="Perception" value={fmtMod(stats.perception)} />
        {stats.classDC != null && <StatBlock label="Class DC" value={stats.classDC} />}
        {stats.spellDC != null && <StatBlock label="Spell DC" value={stats.spellDC} />}
      </div>

      <SectionHeading>Saving Throws</SectionHeading>
      <div className="grid grid-cols-3 gap-2">
        <StatBlock label="Fortitude" value={fmtMod(stats.fort)} />
        <StatBlock label="Reflex"    value={fmtMod(stats.ref)} />
        <StatBlock label="Will"      value={fmtMod(stats.will)} />
      </div>

      <SectionHeading>Ability Modifiers</SectionHeading>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {Object.entries(stats.mods).map(([ab, mod]) => (
          <StatBlock
            key={ab}
            label={ab.slice(0, 3)}
            value={fmtMod(mod)}
            sub={`score ${stats.scores[ab]}`}
          />
        ))}
      </div>
    </div>
  );
}

function StatBlock({ label, value, sub }) {
  return (
    <div className="bg-[#1E2430] border border-pf-brass-dim/40 px-3 py-2 text-center">
      <p className="font-display text-[9px] tracking-[0.18em] text-pf-brass uppercase">{label}</p>
      <p className="font-mono text-xl text-pf-bone tabular-nums leading-tight mt-0.5">{value}</p>
      {sub && <p className="font-mono text-[9px] text-pf-stone">{sub}</p>}
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase border-b border-pf-brass-dim/30 pb-1 mt-3">
      {children}
    </p>
  );
}

// ─── Skills tab ───────────────────────────────────────────────

function SkillsTab({ data }) {
  const stats = computeDerivedStats(data);
  const level = data.level || 1;
  const trained = new Set((data.trainedSkills || []).map(s => String(s).toLowerCase()));
  const cls = CLASSES.find(c => c.slug === data.class);
  const classAuto = new Set((cls?.trainedSkills?.value || []).map(s => String(s).toLowerCase()));
  const background = BACKGROUNDS.find(b => b.slug === data.background);
  const bgAuto = new Set((background?.trainedSkills || []).map(s => String(s).toLowerCase()));
  const tiers = data.skillTiers || {};
  const loreSubskill = data.backgroundLoreSubskill || background?.loreSubskill;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {SKILLS.map(skill => {
          const slug = skill.name.toLowerCase();
          const isTrained = trained.has(slug) || classAuto.has(slug) || bgAuto.has(slug);
          const tier = tiers[skill.name] || (isTrained ? 'trained' : 'untrained');
          const rank = PROF_TIER_INDEX[tier] ?? 0;
          const abMod = stats.mods[abilityKey(skill.ability)] || 0;
          const modifier = abMod + profBonus(tier, level, stats.opts);
          return (
            <div key={skill.name} className="flex items-center justify-between bg-[#1E2430] border border-pf-brass-dim/30 px-3 py-1.5">
              <span className="text-sm text-pf-parchment">{skill.name} <span className="text-pf-stone text-[10px] font-mono">({skill.ability})</span></span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] text-pf-stone uppercase tracking-wider">{PROFICIENCY_TIER_LABELS[rank]}</span>
                <span className="font-mono text-sm text-pf-bone tabular-nums w-8 text-right">{fmtMod(modifier)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {loreSubskill && (
        <div>
          <SectionHeading>Lore Subskills</SectionHeading>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-display tracking-wider uppercase bg-pf-brass/15 border border-pf-brass/40 text-pf-bone">
              {loreSubskill} Lore
              <span className="text-[8px] text-pf-brass">auto</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function abilityKey(short) {
  return { Str: 'Strength', Dex: 'Dexterity', Con: 'Constitution',
    Int: 'Intelligence', Wis: 'Wisdom', Cha: 'Charisma' }[short] || short;
}

// ─── Feats tab ────────────────────────────────────────────────

function FeatsTab({ data }) {
  return (
    <div className="space-y-3">
      <FeatGroup label="Class Feats" map={data.classFeats} emptyHint="No class feats picked." />
      <FeatGroup label="Ancestry Feats" map={data.ancestryFeats} emptyHint="No ancestry feats picked." />
      <FeatGroup label="Skill Feats" map={data.skillFeats} emptyHint="No skill feats picked." />
      <FeatGroup label="General Feats" map={data.generalFeats} emptyHint="No general feats picked." />
    </div>
  );
}

function FeatGroup({ label, map, emptyHint }) {
  const entries = Object.entries(map || {})
    .filter(([, name]) => !!name)
    .sort(([a], [b]) => Number(a) - Number(b));
  return (
    <div>
      <SectionHeading>{label}</SectionHeading>
      {entries.length === 0 ? (
        <p className="text-pf-stone italic text-xs px-1 mt-1">{emptyHint}</p>
      ) : (
        <ul className="space-y-1 mt-1">
          {entries.map(([lvl, name]) => (
            <li key={lvl} className="flex items-baseline gap-2 bg-[#1E2430] border border-pf-brass-dim/30 px-3 py-1.5">
              <span className="font-mono text-[10px] text-pf-brass tracking-wider w-10">Lv {lvl}</span>
              <span className="text-sm text-pf-bone">{name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Spells tab ───────────────────────────────────────────────

function SpellsTab({ data }) {
  const tradition = CASTING_TRADITION_BY_CLASS[data.class];
  const cantrips = data.cantripsKnown || [];
  const spellsByRank = data.spellsByRank || {};
  const rank1 = spellsByRank[1] || data.rank1Known || [];
  const otherRanks = Object.entries(spellsByRank)
    .filter(([rank]) => Number(rank) > 1)
    .sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="space-y-3">
      {tradition && (
        <p className="font-body text-xs text-pf-stone italic">
          {cap(tradition.tradition)} caster · {cap(tradition.prep)} · key {tradition.keyAbility}
        </p>
      )}

      <SpellList label={`Cantrips (${cantrips.length})`} spells={cantrips} />
      <SpellList label={`Rank 1 (${rank1.length})`} spells={rank1} />
      {otherRanks.map(([rank, spells]) => (
        <SpellList key={rank} label={`Rank ${rank} (${spells.length})`} spells={spells} />
      ))}

      {data.focusSpells?.length > 0 && (
        <SpellList label={`Focus Spells (${data.focusSpells.length})`} spells={data.focusSpells} />
      )}
    </div>
  );
}

function SpellList({ label, spells }) {
  return (
    <div>
      <SectionHeading>{label}</SectionHeading>
      {(!spells || spells.length === 0) ? (
        <p className="text-pf-stone italic text-xs px-1 mt-1">None.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {spells.map(name => (
            <span key={name} className="px-2 py-1 text-xs bg-[#1E2430] border border-pf-brass-dim/30 text-pf-parchment">
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Background tab ───────────────────────────────────────────

function BackgroundTab({ data }) {
  const m = media(data);
  const ancestry = ANCESTRIES.find(a => a.slug === data.ancestry);
  const heritageList = HERITAGES_BY_ANCESTRY[data.ancestry] || [];
  const heritage = heritageList.find(h => h.slug === data.heritage);
  const background = BACKGROUNDS.find(b => b.slug === data.background);
  const cls = CLASSES.find(c => c.slug === data.class);
  const details = cls && CLASS_DETAILS[data.class];
  const subclass = details?.subclasses?.options?.find(o => o.id === data.subclass);

  const baseLanguages = (ancestry?.languages || []).map(cap);
  const additional = (data.languages || []).map(cap);

  return (
    <div className="space-y-3">
      <FlavorBlock label="Ancestry" name={ancestry?.name} desc={ancestry?.desc} />
      {heritage && <FlavorBlock label="Heritage" name={heritage.name} desc={heritage.desc} />}
      <FlavorBlock label="Background" name={background?.name} desc={background?.desc} />
      <FlavorBlock label="Class" name={cls?.name} desc={cls?.desc} />
      {subclass && <FlavorBlock label="Subclass" name={subclass.name} desc={subclass.desc} />}

      <SectionHeading>Languages</SectionHeading>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {baseLanguages.map(lang => (
          <span key={`b-${lang}`} className="px-2 py-1 text-[10px] font-display tracking-wider uppercase bg-pf-sage/15 border border-pf-sage/40 text-pf-bone">
            {lang} <span className="text-pf-sage text-[8px] ml-1">auto</span>
          </span>
        ))}
        {additional.map(lang => (
          <span key={`a-${lang}`} className="px-2 py-1 text-[10px] font-display tracking-wider uppercase bg-pf-brass/10 border border-pf-brass/40 text-pf-bone">
            {lang}
          </span>
        ))}
        {baseLanguages.length === 0 && additional.length === 0 && (
          <p className="text-pf-stone italic text-xs">No languages recorded.</p>
        )}
      </div>

      {data.deity && (
        <div>
          <SectionHeading>Deity</SectionHeading>
          <p className="text-sm text-pf-parchment mt-1">{data.deity?.name || String(data.deity)}</p>
        </div>
      )}

      {data.pronouns && (
        <p className="text-xs text-pf-stone"><span className="text-pf-brass uppercase tracking-wider">Pronouns:</span> {data.pronouns}</p>
      )}
    </div>
  );
}

function FlavorBlock({ label, name, desc }) {
  if (!name) return null;
  return (
    <div className="bg-[#1E2430] border border-pf-brass-dim/30 p-3">
      <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-1">{label}</p>
      <p className="font-display text-base text-pf-bone mb-1">{name}</p>
      {desc && (
        <p className="font-body text-xs text-pf-stone leading-snug line-clamp-4">{desc}</p>
      )}
    </div>
  );
}

// ─── Inventory tab ────────────────────────────────────────────

function InventoryTab({ data }) {
  const loadout = data.loadout || [];
  const kit = data.kitTaken;

  return (
    <div className="space-y-3">
      {kit && (
        <p className="text-xs text-pf-stone italic">Equipped via the <span className="text-pf-brass uppercase tracking-wider">{kit}</span> class kit.</p>
      )}

      <SectionHeading>Loadout ({loadout.length})</SectionHeading>
      {loadout.length === 0 ? (
        <p className="text-pf-stone italic text-xs px-1 mt-1">No equipment recorded.</p>
      ) : (
        <ul className="space-y-1 mt-1">
          {loadout.map((item, idx) => (
            <li key={`${item.name}-${idx}`} className="flex items-center justify-between bg-[#1E2430] border border-pf-brass-dim/30 px-3 py-1.5 text-sm">
              <span className="text-pf-parchment">
                {item.name}
                {(item.qty || 1) > 1 && <span className="text-pf-brass text-xs ml-2">×{item.qty}</span>}
              </span>
              <span className="font-mono text-[10px] text-pf-stone">
                {item.bulk === 'L' ? 'L' : item.bulk === '—' ? '—' : (item.bulk ?? '')} bulk
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
