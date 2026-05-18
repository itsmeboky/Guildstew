// PF2e Game Pack — public API
// Imported by Guildstew's game-pack registry. Lazy-loaded; do not pull this
// from the main bundle.

export const PACK_META = {
  id: 'pf2e',
  name: 'Pathfinder Second Edition',
  shortName: 'PF2e',
  publisher: 'Paizo Inc.',
  license: 'ORC (Open RPG Creative License)',
  version: '0.1.0',
  remasterEdition: true,
  description: 'Pathfinder 2e Remaster game pack. Built on ORC-licensed Player Core content.',
};

export { default as CharacterCreatorFlow } from './ui/CharacterCreatorFlow.jsx';
export { default as CharacterSheet } from './ui/CharacterSheet.jsx';

// Data exports (lazy-loadable consumers can `import { ANCESTRIES } from '@/game-packs/pf2e'`)
export * from './data/index.js';
export * from './rules/index.js';
