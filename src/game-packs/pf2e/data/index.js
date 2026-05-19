// src/game-packs/pf2e/data/index.js
// Re-export adapter: turns raw Foundry-import JSON + hand-curated JSON into the
// named constants the UI consumes (matching the prototype's variable names).
//
// Foundry-sourced files (ancestries.json, classes.json, backgrounds.json,
// feats-srd.json, spells-srd.json, equipment-srd.json) ship as empty []
// placeholders. Run `node src/game-packs/pf2e/scripts/import-foundry.mjs`
// against a Foundry pf2e clone to populate them.

import ancestriesData from './ancestries.json';
import classesData from './classes.json';
import backgroundsData from './backgrounds.json';
import featsData from './feats-srd.json';
import spellsData from './spells-srd.json';
// eslint-disable-next-line no-unused-vars
import equipmentData from './equipment-srd.json';
import deitiesData from './deities.json';
import domainsData from './domains.json';
import languagesData from './languages.json';

// Re-shaped exports that the UI consumes
export const ANCESTRIES = ancestriesData.filter(a => a.tier === 'tier1' || a.tier === 'tier2');
export const CLASSES = classesData.filter(c => c.tier === 'tier1');
export const BACKGROUNDS = backgroundsData;
export const DEITIES = deitiesData;
export const CLERIC_DOMAINS = domainsData;
export const COMMON_LANGUAGES = languagesData.common;
export const ANCESTRY_LANGUAGES = languagesData.byAncestry;

// Indexed lookups
export const HERITAGES_BY_ANCESTRY = ancestriesData.reduce((acc, a) => {
  acc[a.id] = a.heritages || [];
  return acc;
}, {});

export const ANCESTRY_FEATS = featsData
  .filter(f => f.category === 'ancestry')
  .reduce((acc, f) => {
    const anc = f.traits.find(t => ANCESTRIES.some(a => a.id === t));
    if (anc) { (acc[anc] ??= []).push(f); }
    return acc;
  }, {});

export const SKILL_FEATS = featsData.filter(f => f.category === 'skill');
export const GENERAL_FEATS = featsData.filter(f => f.category === 'general');
export const CLASS_DEDICATIONS = featsData.filter(f => f.category === 'classfeature' && f.traits.includes('dedication'));

// Class feats indexed by [classSlug][level] for the picker.
// Source-of-truth filter: SRD class feats whose `traits` array contains
// the class slug. Level keys collect every feat at that level so the
// picker can show the available list per slot.
export const CLASS_FEATS_BY_CLASS = featsData
  .filter(f => f.category === 'class')
  .reduce((acc, f) => {
    const traits = f.traits || [];
    for (const t of traits) {
      if (!acc[t]) acc[t] = {};
      const lvl = f.level || 1;
      (acc[t][lvl] ??= []).push(f);
    }
    return acc;
  }, {});

// Spells indexed by tradition and rank
export const SPELL_LISTS = ['arcane', 'divine', 'occult', 'primal'].reduce((acc, trad) => {
  acc[trad] = {
    cantrips: spellsData.filter(s => s.isCantrip && s.traditions.includes(trad)),
  };
  for (let rank = 1; rank <= 10; rank++) {
    acc[trad][`rank${rank}`] = spellsData.filter(s => s.rank === rank && s.traditions.includes(trad) && !s.isFocus);
  }
  return acc;
}, {});

// Static lookup tables from the prototype
export { default as CLASS_DETAILS } from './class-details.json';
export { default as SUBCLASS_SUBPICKS } from './subclass-subpicks.json';
export { default as INSTINCT_ANATHEMA } from './instinct-anathema.json';
export { default as BACKGROUND_DETAILS } from './background-details.json';
export { default as FOCUS_SPELLS_BY_CLASS } from './focus-spells.json';
export { default as SKILLS } from './skills.json';
export { default as LORES } from './lores.json';
export { default as CASTING_TRADITION_BY_CLASS } from './casting-traditions.json';
export { default as CLASS_KITS } from './class-kits.json';
export { default as EQUIPMENT_CATALOG } from './equipment-catalog.json';
export { default as ANCESTRY_GRANTED_ITEMS } from './ancestry-granted-items.json';
export { default as DEITY_PRESETS } from './deity-presets.js';

// Level tables (arrays + functions)
export { default as ANCESTRY_FEAT_LEVELS } from './level-tables/ancestry-feat-levels.json';
export { default as STANDARD_CLASS_FEAT_LEVELS } from './level-tables/class-feat-levels.json';
export { default as SKILL_FEAT_LEVELS } from './level-tables/skill-feat-levels.json';
export { default as GENERAL_FEAT_LEVELS } from './level-tables/general-feat-levels.json';
export { default as SKILL_INCREASE_LEVELS } from './level-tables/skill-increase-levels.json';
export { default as BOOST_BATCH_LEVELS } from './level-tables/boost-batch-levels.json';
export { default as STARTING_WEALTH_BY_LEVEL } from './level-tables/starting-wealth.json';
export { default as HIGHEST_SPELL_RANK } from './level-tables/highest-spell-rank.js';
export { default as SPELLS_KNOWN_BY_RANK } from './level-tables/spells-known-by-rank.js';
