/**
 * Authoring-tool state for Forager. Holds which tool is active
 * (terrain today; building / NPC / light to come) and which material
 * the terrain tool is currently set to paint with.
 *
 * Mutators come straight from useState so they're already stable
 * references; the value object is rebuilt on every render but with
 * only two consumers in this phase (Viewport via a ref, Toolbar
 * directly) the re-render cost is negligible.
 */

import React, { createContext, useContext, useState } from "react";

/**
 * @typedef {'terrain'|'building'} ToolName
 *
 * @typedef {Object} ToolState
 * @property {ToolName} activeTool   Which tool the mouse is bound to.
 * @property {string} activeMaterialId   Terrain material when the terrain tool is active.
 * @property {(id: string) => void} setActiveMaterial
 * @property {(name: ToolName) => void} setActiveTool
 */

/** @type {React.Context<ToolState | null>} */
const ToolContext = createContext(null);

export function ToolsProvider({ children }) {
  const [activeMaterialId, setActiveMaterial] = useState("grass");
  const [activeTool, setActiveTool] = useState(
    /** @type {ToolName} */ ("terrain")
  );

  return (
    <ToolContext.Provider
      value={{ activeTool, activeMaterialId, setActiveMaterial, setActiveTool }}
    >
      {children}
    </ToolContext.Provider>
  );
}

export function useTools() {
  const ctx = useContext(ToolContext);
  if (!ctx) {
    throw new Error("useTools must be used inside <ToolsProvider>");
  }
  return ctx;
}
