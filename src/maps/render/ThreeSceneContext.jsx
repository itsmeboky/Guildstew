/**
 * Shares the Viewport's underlying THREE.Scene with descendant render
 * layers (TerrainLayer, BuildingLayer, …). Layers don't create their
 * own scene; they grab this one, add their meshes via useEffect, and
 * remove them on unmount.
 */

import { createContext, useContext } from "react";

/** @type {React.Context<import("three").Scene | null>} */
export const ThreeSceneContext = createContext(null);

export function useThreeScene() {
  return useContext(ThreeSceneContext);
}
