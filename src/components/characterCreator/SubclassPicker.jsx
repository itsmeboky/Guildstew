import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check, Sparkles, Star } from "lucide-react";
import { bestForSubclass } from "@/components/dnd5e/subclassRecommendations";

/**
 * Universal arrow-pattern picker for any "choose your specialization"
 * feature in the character creator: bard college, cleric domain,
 * druid circle, fighter archetype, etc. Replaces the dropdown
 * pattern. Game-pack-agnostic — accepts any choices array of
 * { name, description } shape, plus an optional headline / level
 * label for the header.
 *
 * Props:
 *   choices       [{ name, description }] — required, length >= 1
 *   value         currently-selected choice name (string) or null
 *   onSelect      (choiceName) => void
 *   featureName   "Bard College" / "Divine Domain" / etc. (header)
 *   className     className to color the class-name accent (cls's main
 *                 colour). Optional.
 *   levelGained   optional number — surfaces "(Level N)" in the header
 */
export default function SubclassPicker({
  choices,
  value,
  onSelect,
  featureName,
  levelGained,
}) {
  const safeChoices = Array.isArray(choices) ? choices.filter(Boolean) : [];
  const [index, setIndex] = useState(() => {
    const initial = safeChoices.findIndex((c) => (c?.name || c) === value);
    return initial >= 0 ? initial : 0;
  });
  const containerRef = useRef(null);

  // Re-anchor index if the value prop changes upstream.
  useEffect(() => {
    if (!value) return;
    const next = safeChoices.findIndex((c) => (c?.name || c) === value);
    if (next >= 0 && next !== index) setIndex(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const total = safeChoices.length;
  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  // Keyboard nav. Bound to the picker's container so it doesn't
  // hijack typing in other inputs on the page.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const current = safeChoices[index];
        if (current) onSelect?.(current?.name || current);
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [index, safeChoices, onSelect]);

  if (total === 0) return null;

  const current = safeChoices[index];
  const currentName = current?.name || String(current);
  const currentDesc = current?.description || "";
  const isSelected = value === currentName;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="bg-[#1E2430] rounded-xl border-2 border-[#5B4B9E]/40 outline-none focus:border-[#5B4B9E] focus:ring-2 focus:ring-[#5B4B9E]/20 transition-colors"
      aria-label={`${featureName || "Subclass"} picker`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#1E2430]">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={goPrev}
          disabled={total < 2}
          className="text-white hover:text-[#37F2D1] hover:bg-[#37F2D1]/10 disabled:opacity-40"
          aria-label="Previous option"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="ml-1 text-xs font-bold uppercase tracking-wider">Prev</span>
        </Button>

        <div className="flex flex-col items-center text-center">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-bold">
            {featureName || "Specialization"}
            {typeof levelGained === "number" && ` · Level ${levelGained}`}
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            {index + 1} of {total}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={goNext}
          disabled={total < 2}
          className="text-white hover:text-[#37F2D1] hover:bg-[#37F2D1]/10 disabled:opacity-40"
          aria-label="Next option"
        >
          <span className="mr-1 text-xs font-bold uppercase tracking-wider">Next</span>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Card body */}
      <div className="p-5 space-y-5">
        <div>
          <h3 className="text-2xl font-black text-[#FFC6AA] tracking-wide">
            {currentName}
          </h3>
        </div>

        <SubclassDescription text={currentDesc} />

        <SubclassKeyFeatures text={currentDesc} />

        <SubclassBestFor name={currentName} />

        <div className="flex items-center justify-between pt-2 border-t border-[#1E2430]">
          <div className="text-[10px] text-slate-500">
            ← / → to browse · Enter to select
          </div>
          <Button
            type="button"
            onClick={() => onSelect?.(currentName)}
            className={`font-bold ${
              isSelected
                ? "bg-[#37F2D1] text-[#1E2430] hover:bg-[#2dd9bd]"
                : "bg-[#5B4B9E] text-white hover:bg-[#4A3D8A]"
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4 mr-2" /> Selected
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> Select {currentName}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Splits the description into intro paragraph(s) and the bulleted
 * sub-feature lines so the description box only renders the prose.
 * The sub-feature lines (e.g. "Frenzy (3rd):") are pulled into the
 * Key Features section below.
 */
function splitDescription(text) {
  if (!text) return { intro: "", features: [] };
  // Match "Name (Nrd|th):" at the start of a line / after newlines.
  // Description text uses "\n\n" to separate intro from feature lines.
  const featureRegex = /^([A-Z][^(:\n]*?)\s*\((\d+(?:st|nd|rd|th))\)\s*:\s*([\s\S]*?)(?=\n[A-Z][^(:\n]*?\s*\(\d+(?:st|nd|rd|th)\)\s*:|\s*$)/gm;
  const features = [];
  let firstFeatureIndex = -1;
  let m;
  while ((m = featureRegex.exec(text)) !== null) {
    if (firstFeatureIndex === -1) firstFeatureIndex = m.index;
    features.push({
      name: m[1].trim(),
      level: m[2],
      body: m[3].trim(),
    });
  }
  const intro =
    firstFeatureIndex > 0 ? text.slice(0, firstFeatureIndex).trim() : text.trim();
  return { intro, features };
}

function SubclassDescription({ text }) {
  const { intro } = useMemo(() => splitDescription(text), [text]);
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-bold mb-2">
        Description
      </div>
      <div className="bg-[#0b1220] border border-[#1E2430] rounded-lg max-h-64 overflow-y-auto custom-scrollbar p-4">
        <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line">
          {intro || "No description available."}
        </p>
      </div>
    </div>
  );
}

function SubclassKeyFeatures({ text }) {
  const { features } = useMemo(() => splitDescription(text), [text]);
  if (features.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-bold mb-2">
        Key Features
      </div>
      <ul className="space-y-1.5">
        {features.map((f) => (
          <li
            key={`${f.name}-${f.level}`}
            className="flex items-start gap-2 text-sm text-white/90"
          >
            <span className="text-[#37F2D1] font-bold flex-shrink-0">•</span>
            <span className="font-bold text-[#FFC6AA]">{f.name}</span>
            <Badge className="bg-[#1E2430] text-slate-300 border border-[#5B4B9E]/40 text-[9px] font-bold flex-shrink-0">
              {f.level}
            </Badge>
            <span className="text-white/70 leading-snug">{shortBody(f.body)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function shortBody(body) {
  if (!body) return "";
  // Trim to the first sentence-ish so the bullet list stays scannable.
  const firstSentence = body.split(/(?<=[.!?])\s+/)[0] || body;
  if (firstSentence.length <= 120) return firstSentence;
  return `${firstSentence.slice(0, 117)}…`;
}

function SubclassBestFor({ name }) {
  const text = bestForSubclass(name);
  if (!text) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-amber-400 font-bold mb-2 flex items-center gap-1">
        <Star className="w-3 h-3" /> Best For
      </div>
      <div className="bg-amber-900/10 border border-amber-500/30 rounded-lg px-4 py-3">
        <p className="text-sm text-amber-100/90 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
