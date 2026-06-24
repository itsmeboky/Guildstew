// Synchronous leaf-body registry.
//
// `getGamePackData()` (src/data/games) returns the legacy data-adapter
// shape, not the GamePack contract body. The contract body
// (`{ resolveForm, vocab, content, ui }`) lives only in each leaf's
// default export. This registry statically imports the bodies of the
// packs that must resolve synchronously — the D&D editions — so a
// surface can read the active pack's contract body at first render with
// no load flash on hot paths (recon §7, P1.1).
//
// Only synchronous-eligible packs belong here. Lazy, readiness-gated
// packs (PF2e and the roadmap packs) are NOT registered — they resolve
// through the async `loadGamePack()` path instead, which is the whole
// point of keeping this registry tiny.
//
// Static-import note (P1.1 flag, deferred to P1.3): importing a leaf body
// eagerly pulls that leaf's data + rules + content getters, but NOT its
// creators/combat UI — those are `lazy(() => import(...))` refs in the
// leaf's `ui`, so they stay out of the eager bundle. Keep them lazy.
//
// This module is React/Vite-only (the leaf bodies import `react` and the
// `@/data/games` adapter), so it is not node-test reachable. The testable
// resolution logic lives in the @/-free `resolveGamePack.js`; the wiring
// here is verified by the build.

import dnd5e2014 from "./dnd/5e/2014/index.js";
import dnd5e2024 from "./dnd/5e/2024/index.js";

// Keyed by CANONICAL pack id (post-alias). Callers normalize ids through
// the catalog (`getCatalogEntry`) before looking up here.
const SYNC_BODIES = {
  dnd5e_2014: dnd5e2014,
  dnd5e_2024: dnd5e2024,
};

/**
 * Return the contract body for a synchronously-resolvable pack, or null.
 * @param {string} canonicalId - a canonical (already alias-resolved) pack id.
 * @returns {{ resolveForm: Function, vocab: object, content: object, ui: object } | null}
 */
export function getSyncBody(canonicalId) {
  return SYNC_BODIES[canonicalId] ?? null;
}

/** Canonical ids that resolve synchronously (for enumeration / tests). */
export function listSyncBodyIds() {
  return Object.keys(SYNC_BODIES);
}
