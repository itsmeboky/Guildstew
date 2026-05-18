import React, { useState } from "react";
import { motion } from "framer-motion";
import { ScrollText, Shuffle, Sparkles, Lock, Beaker } from "lucide-react";
import { toast } from "sonner";

/**
 * First-screen selector shown before the character creator steps.
 *
 * Two-tier picker:
 *   - Tier 1 (top row): Game Pack (rule system + edition).
 *       'dnd5e_2014'    — full creator wired
 *       'dnd5e_2024'    — full creator wired
 *       'pathfinder_2e' — testing slot, routes to a "Coming soon"
 *                          tome inside CharacterCreator.jsx (no
 *                          data module ships yet)
 *   - Tier 2 (mode cards): Full / Quick / AI build flows.
 *
 * onSelect signature was a single mode id; it's now invoked as
 * `onSelect({ mode, gamePack })`. The parent destructures both.
 *
 * The two AI-driven flows are gated behind "Coming in 1.0" for
 * alpha — same as before.
 */
const PACKS = [
  {
    id: "dnd5e_2014",
    title: "D&D 5e (2014)",
    description: "The 2014 Player's Handbook. Stable, fully wired.",
    accent: "#37F2D1",
  },
  {
    id: "dnd5e_2024",
    title: "D&D 5e (2024)",
    description: "The 2024 PHB update. Background-driven ASI, weapon mastery.",
    accent: "#fbbf24",
  },
  {
    id: "pathfinder_2e",
    title: "Pathfinder (2e)",
    description: "Testing slot. Picker works, full creator coming soon.",
    accent: "#a855f7",
    badge: "Testing",
  },
];

const MODES = [
  {
    id: "full",
    title: "Full Creator",
    description: "Build your character from scratch, step by step.",
    Icon: ScrollText,
    accent: "#37F2D1",
  },
  {
    id: "quick",
    title: "Quick Pick",
    description: "Pick your race, class, and background — we'll find you six adventurers to choose from.",
    Icon: Shuffle,
    accent: "#fbbf24",
    alphaDisabled: true,
  },
  {
    id: "ai",
    title: "AI Generate",
    description: "Describe your dream character and we'll build them for you.",
    Icon: Sparkles,
    accent: "#a855f7",
    alphaDisabled: true,
  },
];

export default function ModeSelector({ onSelect, initialGamePack = "dnd5e_2014" }) {
  const [gamePack, setGamePack] = useState(initialGamePack);

  const handleAlphaDisabledClick = () => {
    toast("Coming in 1.0 — use Full Creator for now.");
  };

  const handlePickMode = (modeId) => {
    onSelect?.({ mode: modeId, gamePack });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">How do you want to make your character?</h2>
        <p className="text-slate-400">Pick a path — you can always switch before saving.</p>
      </div>

      {/* Tier 1: Game Pack picker */}
      <div className="mb-8">
        <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 text-center">
          Game Pack
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PACKS.map((pack) => {
            const active = pack.id === gamePack;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => setGamePack(pack.id)}
                className={`text-left rounded-2xl p-4 border-2 transition-colors flex flex-col gap-2 ${
                  active
                    ? "bg-[#1E2430] border-[--accent]"
                    : "bg-[#1E2430]/40 border-[#2A3441] hover:border-slate-500"
                }`}
                style={{ ['--accent']: pack.accent }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className={`text-base font-bold ${active ? "text-white" : "text-slate-300"}`}
                  >
                    {pack.title}
                  </h3>
                  {pack.badge && (
                    <span
                      className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{
                        background: `${pack.accent}22`,
                        color: pack.accent,
                      }}
                    >
                      <Beaker className="w-2.5 h-2.5" />
                      {pack.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{pack.description}</p>
                {active && (
                  <div
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: pack.accent }}
                  >
                    Selected
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tier 2: Build mode */}
      <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 text-center">
        Build Mode
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MODES.map(({ id, title, description, Icon, accent, alphaDisabled }) => {
          const cardBody = (
            <>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: alphaDisabled ? "rgba(148,163,184,0.18)" : `${accent}22`,
                  color: alphaDisabled ? "#94a3b8" : accent,
                }}
              >
                <Icon className="w-7 h-7" />
              </div>
              <h3 className={`text-xl font-bold ${alphaDisabled ? "text-slate-300" : "text-white"}`}>{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
              {alphaDisabled ? (
                <div className="mt-auto inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-400">
                  <Lock className="w-3 h-3" />
                  Coming in 1.0
                </div>
              ) : (
                <div
                  className="mt-auto text-xs font-black uppercase tracking-widest"
                  style={{ color: accent }}
                >
                  Choose →
                </div>
              )}
            </>
          );
          if (alphaDisabled) {
            return (
              <button
                key={id}
                type="button"
                onClick={handleAlphaDisabledClick}
                title="Coming in 1.0 — use Full Creator for now"
                className="bg-[#1E2430]/40 backdrop-blur-sm border-2 border-dashed border-slate-700 rounded-2xl p-6 text-left flex flex-col gap-3 cursor-not-allowed opacity-70"
              >
                {cardBody}
              </button>
            );
          }
          return (
            <motion.button
              key={id}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePickMode(id)}
              className="bg-[#1E2430]/80 backdrop-blur-sm border-2 border-[#2A3441] hover:border-[--accent] rounded-2xl p-6 text-left transition-colors flex flex-col gap-3"
              style={{ ['--accent']: accent }}
            >
              {cardBody}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
