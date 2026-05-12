/**
 * Scene state for Forager. Owns the single source of truth for the map
 * being authored — tiles, buildings, NPCs, lights, etc. Layers
 * (TerrainLayer, future BuildingLayer, …) read from here; tools
 * (paint-tile, place-building, …) write through paintTile / eraseTile
 * style mutators.
 *
 * Mutators use functional setState and have empty dependency arrays so
 * their references are stable for the life of the provider. That lets
 * consumers (e.g. the Viewport's mounted event listeners) capture them
 * once without going stale.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

/**
 * @typedef {import("../engine/types").Scene} Scene
 */

/** @type {Scene} */
const INITIAL_SCENE = {
  id: "scratch",
  name: "Scratch Scene",
  ambientMode: "day",
  tiles: [],
  buildings: [],
  trees: [],
  bushes: [],
  npcs: [],
  lights: [],
  transitions: [],
  customWalls: [],
};

/**
 * @typedef {Object} SceneContextValue
 * @property {Scene} scene
 * @property {(tileX: number, tileY: number, materialId: string) => void} paintTile
 * @property {(tileX: number, tileY: number) => void} eraseTile
 */

/** @type {React.Context<SceneContextValue | null>} */
const SceneContext = createContext(null);

export function SceneProvider({ children }) {
  const [scene, setScene] = useState(INITIAL_SCENE);

  const paintTile = useCallback((tileX, tileY, materialId) => {
    setScene((prev) => {
      const idx = prev.tiles.findIndex(
        (t) => t.position.x === tileX && t.position.y === tileY
      );
      if (idx >= 0) {
        if (prev.tiles[idx].materialId === materialId) return prev;
        const tiles = prev.tiles.slice();
        tiles[idx] = { position: { x: tileX, y: tileY }, materialId };
        return { ...prev, tiles };
      }
      return {
        ...prev,
        tiles: [
          ...prev.tiles,
          { position: { x: tileX, y: tileY }, materialId },
        ],
      };
    });
  }, []);

  const eraseTile = useCallback((tileX, tileY) => {
    setScene((prev) => {
      const idx = prev.tiles.findIndex(
        (t) => t.position.x === tileX && t.position.y === tileY
      );
      if (idx < 0) return prev;
      return {
        ...prev,
        tiles: prev.tiles.filter((_, i) => i !== idx),
      };
    });
  }, []);

  return (
    <SceneContext.Provider value={{ scene, paintTile, eraseTile }}>
      {children}
    </SceneContext.Provider>
  );
}

export function useScene() {
  const ctx = useContext(SceneContext);
  if (!ctx) {
    throw new Error("useScene must be used inside <SceneProvider>");
  }
  return ctx;
}
