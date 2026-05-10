import React from "react";
import { motion } from "framer-motion";
import { ScrollText, Shuffle, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";

/**
 * First-screen selector shown before the character creator steps.
 * Three cards route the player into:
 *   - 'full'  — the existing step-by-step CharacterCreator
 *   - 'quick' — Quick Pick (race/class/background → 6 cards)  [GATED]
 *   - 'ai'    — AI Generate (single prompt)                   [GATED]
 *
 * The two AI-driven flows are gated behind "Coming in 1.0" for
 * alpha — they need finalized AI provider integration and the
 * level-N completeness work shipping in Layer 3 commits 2-4
 * before we surface them to users. The cards stay visible so
 * users can see what's coming, but click is a no-op.
 *
 * Visual treatment matches SpiceEmporium's "Disabled for Alpha"
 * pattern (e31908d): dashed border, muted color, click toasts a
 * "Coming in 1.0" notice instead of routing.
 */
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

export default function ModeSelector({ onSelect }) {
  const handleAlphaDisabledClick = () => {
    toast("Coming in 1.0 — use Full Creator for now.");
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
              onClick={() => onSelect?.(id)}
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
