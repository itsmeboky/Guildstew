/**
 * Forager landing page. Phase 3 — terrain painting is live. The
 * SceneProvider holds the authored map state, Viewport renders it, and
 * TerrainLayer is the first render layer hung off the viewport. More
 * layers (buildings, NPCs, lights) will mount alongside it as the
 * authoring toolkit grows.
 */

import React from "react";
import { useActiveCampaign } from "../hooks/useActiveCampaign";
import Viewport from "../render/Viewport";
import TerrainLayer from "../render/TerrainLayer";
import { SceneProvider } from "../state/SceneContext";

export default function ForagerHome() {
  const { campaignId, mapId } = useActiveCampaign();

  return (
    <SceneProvider>
      <div className="relative w-full h-screen overflow-hidden bg-[#0a0d1a]">
        <Viewport>
          <TerrainLayer />
        </Viewport>
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <div className="bg-[#1E2430]/80 backdrop-blur-sm border border-[#FF5300]/30 rounded-xl px-5 py-4 shadow-2xl max-w-xs">
            <h1 className="text-2xl font-bold text-[#FF5300] mb-1 tracking-wide">
              Forager · v0
            </h1>
            <p className="text-[#f8a47c] text-xs uppercase tracking-widest mb-3">
              Phase 3 · Terrain painter
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
            <p className="text-[#f8a47c]/70 text-xs mt-3 leading-relaxed">
              Left-click to paint grass · Right-click to erase
            </p>
          </div>
        </div>
      </div>
    </SceneProvider>
  );
}
