// useGamePack(packId) — the single resolution primitive every surface uses
// to get the active pack's contract body. Synchronous-first (recon §7):
// the D&D editions resolve from the in-memory registry with no load flash;
// lazy, readiness-gated packs fall back to the async loadGamePack path.
//
//   useGamePack(packId) -> { pack, loading, error, readiness }
//
//   pack       - the contract body { resolveForm, vocab, content, ui }, or
//                null while loading / on error.
//   loading    - boolean. Always false for D&D (synchronous). true only
//                during an async lazy-pack load.
//   error      - Error or null.
//   readiness  - { characterCreation, campaignPlay } from the eager catalog,
//                available immediately even before/without the body loading,
//                so a surface can gate on readiness before rendering/loading.
//
// All pack-resolution imports are relative (the testable logic lives in the
// node-safe resolveGamePack.js). This hook is the React wrapper.

import { useEffect, useMemo, useReducer } from "react";

import {
  asyncReducer,
  initialAsyncState,
  planGamePack,
  syncState,
} from "../game-packs/resolveGamePack.js";
import { loadGamePack } from "../game-packs/index.js";
import { getSyncBody } from "../game-packs/syncBodies.js";

export function useGamePack(packId) {
  // Synchronous plan: canonical id, readiness (immediate), and the sync body
  // if this pack is registered for synchronous resolution.
  const plan = useMemo(() => planGamePack(packId, getSyncBody), [packId]);

  // Terminal state for synchronous (D&D) and unknown packs; null => lazy.
  const sync = syncState(plan);
  const needsAsync = sync === null;

  const [async, dispatch] = useReducer(asyncReducer, initialAsyncState);

  useEffect(() => {
    if (!needsAsync) return; // synchronous or unknown: never loads.
    let alive = true;
    // loadGamePack memoizes (module-level _bodyCache), so repeat resolutions
    // of the same lazy pack don't re-import.
    loadGamePack(plan.canonicalId)
      .then((body) => {
        if (!alive) return;
        if (body) dispatch({ type: "loaded", body });
        else
          dispatch({
            type: "error",
            error: new Error(`Failed to load game pack: ${plan.canonicalId}`),
          });
      })
      .catch((error) => {
        if (alive) dispatch({ type: "error", error });
      });
    return () => {
      alive = false;
    };
  }, [needsAsync, plan.canonicalId]);

  if (sync) return sync;
  // Lazy branch: merge the synchronously-known readiness onto the async state.
  return { ...async, readiness: plan.readiness };
}

export default useGamePack;
