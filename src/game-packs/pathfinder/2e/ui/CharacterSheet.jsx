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
// ui/detail/_shared.jsx.

import React, { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import GamePackTag from '@/components/characters/GamePackTag';
import { ANCESTRIES, HERITAGES_BY_ANCESTRY, BACKGROUNDS, CLASSES, CLASS_DETAILS, CASTING_TRADITION_BY_CLASS } from '../data/index.js';
import { formatCharacterSubline } from '../rules/character-subline.js';
import { sd, media } from './detail/_shared.jsx';
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

export default function CharacterSheet({ character, pack, onEdit, onDelete, data: legacyData }) {
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
      <PathfinderCharacterHeader
        character={resolvedCharacter}
        pack={pack}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {/* Tab strip — orange underline on active tab matching D&D 5e
          treatment instead of the gold creator-step styling. The
          library is a separate visual surface from the creator. */}
      <div className="flex border-b border-gray-700/60 mt-4 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 font-display text-[11px] tracking-[0.2em] uppercase transition-colors border-b-2 -mb-px
                        ${activeTab === tab.key
                          ? 'border-[#FF5722] text-[#FF5722]'
                          : 'border-transparent text-gray-400 hover:text-gray-200'}`}
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

function PathfinderCharacterHeader({ character, pack, onEdit, onDelete }) {
  const data = sd(character);
  const m = media(data);
  const ancestry = ANCESTRIES.find(a => a.slug === data.ancestry);
  const heritageList = HERITAGES_BY_ANCESTRY[data.ancestry] || [];
  const heritage = heritageList.find(h => h.slug === data.heritage);
  const background = BACKGROUNDS.find(b => b.slug === data.background);
  const cls = CLASSES.find(c => c.slug === data.class);
  const details = cls && CLASS_DETAILS[data.class];
  const subclass = details?.subclasses?.options?.find(o => o.id === data.subclass);

  const subline = formatCharacterSubline({
    level: data.level,
    heritage, ancestry, cls, subclass, background,
  });

  // Layout mirrors the D&D 5e detail header: name + edit/delete
  // action buttons in a title row, subline + GamePackTag inline,
  // bio in a dark scrollable box. PF2e-specific extras (catchphrase,
  // allies/enemies) live below the bio so they don't crowd the
  // header on characters that don't have them set.
  return (
    <header className="mb-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h1 className="text-3xl font-bold text-[#FF5722] flex-1 break-words">
          {character.name || 'Unnamed'}
        </h1>
        <div className="flex gap-2 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title="Edit Character"
              className="p-2 bg-[#37F2D1] hover:bg-[#2dd9bd] rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4 text-[#1E2430]" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Delete Character"
              className="p-2 bg-[#FF5722] hover:bg-[#FF6B3D] rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      <p className="text-gray-300 text-base mb-3 flex items-center gap-2 flex-wrap">
        <span>{subline}</span>
        {pack && <GamePackTag pack={pack} size="md" />}
      </p>

      <div className="bg-[#1E2430] rounded-lg p-4 max-h-32 overflow-y-auto custom-scrollbar">
        {data.catchphrase && (
          <p className="text-gray-300 text-sm italic mb-2">"{data.catchphrase}"</p>
        )}
        <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
          {data.bio || 'No biography available.'}
        </p>
        {(m.allies || m.enemies) && (
          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
            {m.allies && (
              <div>
                <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-0.5">Allies</p>
                <p className="text-gray-300 leading-snug">{m.allies}</p>
              </div>
            )}
            {m.enemies && (
              <div>
                <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mb-0.5">Enemies</p>
                <p className="text-gray-300 leading-snug">{m.enemies}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
