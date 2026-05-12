/**
 * Forager landing page. Phase 5 — the building tool joins the
 * authoring kit. Layers (Terrain, Building) stack inside the Viewport,
 * the Toolbar lets the user pick a tool, and the HUD hint reacts to
 * which tool is currently active.
 */

import React from "react";
import { useActiveCampaign } from "../hooks/useActiveCampaign";
import Viewport from "../render/Viewport";
import TerrainLayer from "../render/TerrainLayer";
import BuildingLayer from "../render/BuildingLayer";
import { SceneProvider } from "../state/SceneContext";
import { ToolsProvider, useTools } from "../state/ToolContext";
import Toolbar from "./Toolbar";

function HudHint() {
  const { activeTool } = useTools();
  if (activeTool === "building") {
    return (
      <p className="text-[#f8a47c]/70 text-xs mt-3 leading-relaxed">
        Click to add corners · Double-click or Enter to finish · Escape to
        cancel · Right-click to undo last corner
      </p>
    );
  }
  return (
    <p className="text-[#f8a47c]/70 text-xs mt-3 leading-relaxed">
      Pick a material · Left-click to paint · Right-click to erase ·
      Middle-mouse or Space+drag to pan
    </p>
  );
}

export default function ForagerHome() {
  const { campaignId, mapId } = useActiveCampaign();

  return (
    <SceneProvider>
      <ToolsProvider>
        <div className="relative w-full h-screen overflow-hidden bg-[#0a0d1a]">
          <Viewport>
            <TerrainLayer />
            <BuildingLayer />
          </Viewport>
          <Toolbar />
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="bg-[#1E2430]/80 backdrop-blur-sm border border-[#FF5300]/30 rounded-xl px-5 py-4 shadow-2xl max-w-xs">
              <h1 className="text-2xl font-bold text-[#FF5300] mb-1 tracking-wide">
                Forager · v0
              </h1>
              <p className="text-[#f8a47c] text-xs uppercase tracking-widest mb-3">
                Phase 5 · Building tool
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-[#f8a47c]">
                  Campaign:{" "}
                  <span className="text-white font-semibold">
                    {campaignId ?? "—"}
                  </span>
                </p>
                <p className="text-[#f8a47c]">
                  Map:{" "}
                  <span className="text-white font-semibold">
                    {mapId ?? "—"}
                  </span>
                </p>
              </div>
              <HudHint />
            </div>
          </div>
        </div>
      </ToolsProvider>
    </SceneProvider>
  );
}
