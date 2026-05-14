/**
 * Vertical authoring toolbar pinned to the left edge of the viewport.
 * Today it lists terrain materials; future tool sections (BUILDINGS,
 * ENTITIES, …) will mount below as their tools come online.
 *
 * The outer wrapper is `pointer-events-none` so clicks in the gutter
 * around the toolbar still reach the canvas behind it. Only the panel
 * itself opts back into pointer events.
 */

import React from "react";
import { TERRAIN_MATERIALS } from "../engine/terrainMaterials";
import { useTools } from "../state/ToolContext";

const MATERIALS = Object.values(TERRAIN_MATERIALS);

/**
 * @param {string} id
 */
function labelFor(id) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export default function Toolbar() {
  const { activeMaterialId, setActiveMaterial } = useTools();

  return (
    <div className="fixed top-52 left-4 z-10 pointer-events-none">
      <div className="pointer-events-auto bg-[#1E2430]/80 backdrop-blur-sm border border-[#FF5300]/30 rounded-xl shadow-2xl px-2 pt-2 pb-3 flex flex-col gap-1 w-[72px]">
        <p className="text-[#FF5300] text-[10px] font-bold tracking-[0.2em] text-center pt-1 pb-1">
          TERRAIN
        </p>
        {MATERIALS.map((mat) => {
          const isActive = mat.id === activeMaterialId;
          return (
            <button
              key={mat.id}
              type="button"
              onClick={() => setActiveMaterial(mat.id)}
              className={`group flex flex-col items-center gap-1 p-1 rounded-md transition ${
                isActive ? "" : "opacity-70 hover:opacity-100"
              }`}
            >
              <span
                className={`block w-12 h-12 rounded-md transition-transform group-hover:scale-105 ${
                  isActive
                    ? "ring-2 ring-[#FF5300] shadow-lg shadow-[#FF5300]/40"
                    : "ring-1 ring-white/10"
                }`}
                style={{ backgroundColor: mat.color }}
                aria-hidden="true"
              />
              <span
                className={`text-[10px] uppercase tracking-wider ${
                  isActive
                    ? "text-white font-semibold"
                    : "text-[#f8a47c] group-hover:text-white"
                }`}
              >
                {labelFor(mat.id)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
