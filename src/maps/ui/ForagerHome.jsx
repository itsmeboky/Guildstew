/**
 * Forager landing page. Phase 2 — the Three.js viewport fills the
 * screen and a small HUD overlay reports campaign + map context so we
 * can verify the URL params still flow through. Real map content
 * (terrain, buildings, NPCs) arrives in Phase 3 onward.
 */

import React from "react";
import { useActiveCampaign } from "../hooks/useActiveCampaign";
import Viewport from "../render/Viewport";

export default function ForagerHome() {
  const { campaignId, mapId } = useActiveCampaign();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0d1a]">
      <Viewport />
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-[#1E2430]/80 backdrop-blur-sm border border-[#FF5300]/30 rounded-xl px-5 py-4 shadow-2xl max-w-xs">
          <h1 className="text-2xl font-bold text-[#FF5300] mb-1 tracking-wide">
            Forager · v0
          </h1>
          <p className="text-[#f8a47c] text-xs uppercase tracking-widest mb-3">
            Phase 2 · Viewport online
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
              <span className="text-white font-semibold">{mapId ?? "—"}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
