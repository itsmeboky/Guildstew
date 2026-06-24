// Pure, node-safe resolution logic for the useGamePack hook.
//
// This module holds everything testable about pack resolution and NOTHING
// React- or Vite-specific, so it runs under `node --test`. Its only import
// is the catalog (`./index.js`), which has no top-level static imports and
// is itself node-safe. Pack bodies are passed in (dependency-injected via
// `getSyncBody`) rather than imported here, so this file never touches the
// `@/`-using leaf bodies. See P1.1 recon, Q3.
//
// The React hook (src/hooks/useGamePack.js) wires the real `getSyncBody`
// (src/game-packs/syncBodies.js) and `loadGamePack` (./index.js) into
// these helpers and adds the useReducer/useEffect plumbing.

import { getCatalogEntry } from "./index.js";

/**
 * Resolve everything the hook can know synchronously about a pack id:
 * the canonical id (aliases applied), its readiness, and — if the pack is
 * registered for synchronous resolution — its contract body.
 *
 * @param {string} packId - raw pack id (may be a legacy alias, e.g. "dnd5e").
 * @param {(canonicalId: string) => object|null} [getSyncBody] - sync-body lookup.
 * @returns {{ entry: object|null, canonicalId: string|null,
 *             readiness: object|null, syncBody: object|null, known: boolean }}
 */
export function planGamePack(packId, getSyncBody) {
  const entry = getCatalogEntry(packId);
  const canonicalId = entry ? entry.id : null;
  const readiness = entry ? entry.readiness ?? null : null;
  const syncBody =
    entry && typeof getSyncBody === "function"
      ? getSyncBody(canonicalId) ?? null
      : null;
  return { entry, canonicalId, readiness, syncBody, known: !!entry };
}

/**
 * The terminal hook state for the cases that need no async load: a
 * registered synchronous pack (D&D) or an unknown pack id. Returns null
 * when the pack is known but has no synchronous body — i.e. a lazy pack
 * that the hook must resolve through `loadGamePack`.
 *
 * `readiness` is always carried straight from the catalog, so a caller can
 * gate on `readiness.campaignPlay` even for an unknown/lazy pack.
 *
 * @returns {{ pack: object|null, loading: boolean, error: Error|null, readiness: object|null } | null}
 */
export function syncState(plan) {
  if (!plan.known) {
    return {
      pack: null,
      loading: false,
      error: new Error(`Unknown game pack: ${String(plan.canonicalId)}`),
      readiness: null,
    };
  }
  if (plan.syncBody) {
    return {
      pack: plan.syncBody,
      loading: false,
      error: null,
      readiness: plan.readiness,
    };
  }
  return null; // known but lazy — resolve asynchronously.
}

/** Async-branch state before a lazy pack body has resolved. */
export const initialAsyncState = { pack: null, loading: true, error: null };

/**
 * Reducer for the lazy-pack async branch. `readiness` is merged in at the
 * hook's return site (it's known synchronously), so it is not tracked here.
 */
export function asyncReducer(state, action) {
  switch (action.type) {
    case "loaded":
      return { pack: action.body, loading: false, error: null };
    case "error":
      return { pack: null, loading: false, error: action.error };
    default:
      return state;
  }
}
