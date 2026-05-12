/**
 * Forager landing page. Phase 1 placeholder — proves the route loads,
 * the Suspense boundary works, and URL query params reach the component.
 * Real map rendering arrives in Phase 2.
 */

import React from "react";

export default function ForagerHome() {
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("id");
  const mapId = params.get("map");

  return (
    <div className="min-h-screen bg-[#1E2430] flex items-center justify-center px-6">
      <div className="bg-[#2A3441] border border-[#FF5300]/30 rounded-2xl px-10 py-12 max-w-xl w-full shadow-2xl">
        <h1 className="text-4xl font-bold text-[#FF5300] mb-2 tracking-wide">
          Forager · v0
        </h1>
        <p className="text-[#f8a47c] text-sm uppercase tracking-widest mb-8">
          Phase 1 · Engine Skeleton coming online
        </p>

        <div className="space-y-2 text-base">
          {campaignId ? (
            <p className="text-[#f8a47c]">
              Campaign:{" "}
              <span className="text-white font-semibold">{campaignId}</span>
            </p>
          ) : (
            <p className="text-slate-500 italic">No campaign selected</p>
          )}

          {mapId && (
            <p className="text-[#f8a47c]">
              Map: <span className="text-white font-semibold">{mapId}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
