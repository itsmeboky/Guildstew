import React from "react";
import { motion } from "framer-motion";
import { ScrollText, Shuffle, Sparkles } from "lucide-react";

/**
 * First-screen selector shown before the character creator steps.
 * Three cards route the player into:
 *   - 'full'  — the existing step-by-step CharacterCreator
 *   - 'quick' — Quick Pick (race/class/background → 6 cards)
 *   - 'ai'    — AI Generate (single prompt)
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
  },
  {
    id: "ai",
    title: "AI Generate",
    description: "Describe your dream character and we'll build them for you.",
    Icon: Sparkles,
    accent: "#a855f7",
  },
];

export default function ModeSelector({ onSelect }) {
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
        {MODES.map(({ id, title, description, Icon, accent }) => (
          <motion.button
            key={id}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect?.(id)}
            className="bg-[#1E2430]/80 backdrop-blur-sm border-2 border-[#2A3441] hover:border-[--accent] rounded-2xl p-6 text-left transition-colors flex flex-col gap-3"
            style={{ ['--accent']: accent }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              <Icon className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
            <div
              className="mt-auto text-xs font-black uppercase tracking-widest"
              style={{ color: accent }}
            >
              Choose →
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
