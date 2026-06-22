import React from "react";
import { Lock, ChevronRight, ShieldAlert } from "lucide-react";
import { listGamePacks } from "@/game-packs";

/**
 * Card-grid picker shown when the player owns more than one game
 * pack. Renders owned packs as clickable cards plus locked
 * previews of upcoming systems so players can see what's on the
 * roadmap. The CreateCharacterDialog auto-skips this picker for
 * single-pack users (i.e. everyone today), so this component
 * really only renders when entitlements expand later.
 *
 * Admin override: when `isAdmin` is true, packs that would
 * normally render as locked "Coming Soon" previews promote into
 * the clickable section so staff can build characters in
 * pre-release packs (whatever ships in pre-release state next)
 * through the regular creator flow. A red
 * "ADMIN PREVIEW" chip on those cards keeps it obvious which
 * pack is publicly visible vs. staff-only.
 *
 * Props:
 *   ownedPackIds   string[] — ids of game packs the player owns
 *   onSelect       (packId) => void
 *   isAdmin        boolean — staff override; promotes coming_soon
 *                  packs into the clickable list
 */
export default function GamePackPicker({ ownedPackIds, onSelect, isAdmin = false }) {
  // Available packs are free-by-spec — shown regardless of ownership.
  // Coming-soon packs are never owned, so the legacy ownership filter
  // was a no-op; ownedPackIds is retained for API compatibility.
  const owned = listGamePacks({ status: "available" });
  const upcoming = listGamePacks({ status: "coming_soon" });

  // Admin gets the upcoming packs merged into the clickable
  // section; non-admin sees them as locked previews below.
  const pickable = isAdmin ? [...owned, ...upcoming] : owned;
  const lockedPreviews = isAdmin ? [] : upcoming;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-white">Choose Game System</h2>
        <p className="text-sm text-slate-400 mt-1">
          Pick which ruleset you want to build a character for.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pickable.map((pack) => {
          const isPreview = pack.status !== "available";
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => onSelect?.(pack.id)}
              className="text-left bg-[#1E2430] border-2 border-slate-700 hover:border-[var(--accent)] rounded-xl p-5 transition-all group relative"
              style={{ "--accent": pack.accent }}
            >
              {isPreview && (
                <span
                  className="absolute top-2 right-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-red-300 bg-red-900/50 border border-red-700/60 px-1.5 py-0.5 rounded"
                  title="Pre-launch pack — visible only to staff accounts"
                >
                  <ShieldAlert className="w-2.5 h-2.5" /> Admin Preview
                </span>
              )}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden>{pack.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{pack.name}</h3>
                    <p className="text-[11px] text-slate-400 italic">{pack.tagline}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-[var(--accent)] transition" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{pack.description}</p>
            </button>
          );
        })}
      </div>

      {lockedPreviews.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-bold mb-3">
            More systems coming soon
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lockedPreviews.map((pack) => (
              <div
                key={pack.id}
                aria-disabled
                className="bg-[#0b1220] border border-slate-800 rounded-lg p-4 opacity-60 cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl grayscale" aria-hidden>{pack.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-300">{pack.name}</h4>
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                        <Lock className="w-2.5 h-2.5" /> Coming Soon
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 italic mt-0.5">{pack.tagline}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
