// PF2e character library detail view. Mounted by
// CharacterDetailDispatcher for every persisted PF2e character.
//
// Naming: exported as `CharacterSheet` (the registry's lazy-import
// target) but conceptually this is the *library* detail renderer —
// distinct from the in-creator review screen at StepReview.jsx. Once
// additional packs ship, the dispatcher will look up the right
// component per pack and this becomes one of several.
//
// Per Phase J.3 this file is a thin tab dispatcher; the actual tab
// render code lives under ui/detail/*.jsx. Helpers shared across
// tabs (sd/media/cap/fmtMod/SectionHeading/StatBlock) sit in
// ui/detail/_shared.js.

import React, { useState } from 'react';
import GamePackTag from '@/components/characters/GamePackTag';
import { ANCESTRIES, HERITAGES_BY_ANCESTRY, BACKGROUNDS, CLASSES, CASTING_TRADITION_BY_CLASS } from '../data/index.js';
import { sd, media } from './detail/_shared.js';
import StatsTab from './detail/StatsTab.jsx';
import SkillsTab from './detail/SkillsTab.jsx';
import FeatsTab from './detail/FeatsTab.jsx';
import SpellsTab from './detail/SpellsTab.jsx';
import BackgroundTab from './detail/BackgroundTab.jsx';
import InventoryTab from './detail/InventoryTab.jsx';

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

      <button
        type="button"
        className="mt-6 w-full bg-[#FF5722] hover:bg-[#FF6B3D] text-white font-bold text-xl py-5 rounded-2xl tracking-wider transition-colors"
      >
        PLAY
      </button>
    </div>
  );
}

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
