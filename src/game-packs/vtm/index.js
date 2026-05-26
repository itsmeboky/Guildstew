/**
 * Vampire: The Masquerade (V5) Game Pack — Guildstew
 *
 * Pre-launch gating: World of Darkness / Paradox licensing is in
 * negotiation. This pack is shipped as admin-only via the
 * page-shell's isAdminUser() gate (src/pages/VTMCharacterCreator.jsx)
 * + the GAME_PACKS.world_of_darkness.status = "coming_soon" flag
 * which keeps the public picker from offering it.
 *
 * When the license deal closes:
 *   - flip GAME_PACKS.world_of_darkness.status to "available"
 *   - flip GAME_PACKS.world_of_darkness.creator to use this pack's
 *     CharacterCreatorFlow lazy export (matching pf2e's wiring)
 *   - remove the isAdminUser gate in pages/VTMCharacterCreator.jsx
 *
 * Pack contents mirror pf2e's structure:
 *   - data/       canonical data modules (clans, predator types,
 *                 attributes, skills, backgrounds, assets, steps)
 *   - theme/      colors, lacy patterns, GlobalStyles (scoped CSS)
 *   - components/ visual primitives (decorations, polaroids, NavBar)
 *   - steps/      one file per chapter (I-IX)
 *   - rules/      predatorBonuses + uploadAsset helpers
 *   - ui/         root VTMCharacterCreator flow
 */

import { lazy } from 'react';

export * from './data/index.js';

export const PACK_META = {
  id: 'world_of_darkness',
  family: 'vtm',
  edition: 'v5',
  name: 'Vampire: The Masquerade (V5)',
  ready: false,                              // license-pending
  license: ['Dark Pack (pre-launch fan/dev use)'],
};

// Lazy-loaded root creator. Matches how pf2e wires
// `CharacterCreatorFlow` so the gamePacks config can refer to the
// pack without dragging the JSX into the initial bundle.
export const CharacterCreatorFlow = lazy(() =>
  import('./ui/VTMCharacterCreator.jsx').then((m) => ({ default: m.default }))
);

// Re-export the helpers Phase 4 introduced for testing /
// debugging from outside the pack.
export {
  parsePredatorGrants,
  applyResolution,
  isResolutionComplete,
} from './rules/predatorBonuses.js';
export { uploadVtmAsset } from './rules/uploadAsset.js';
