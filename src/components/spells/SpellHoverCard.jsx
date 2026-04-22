import React from "react";
import {
  HoverCard, HoverCardContent, HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Sparkles, Clock, Crosshair, Hourglass, BookOpen } from "lucide-react";

/**
 * Shared spell tooltip used by Campaign Archives spell list and the
 * character sheet spell tabs. Matches the visual treatment of
 * ItemHoverCard (dark popover, level + school chips, body wrap) so
 * the two surfaces feel consistent.
 *
 * Spell shape consumed (any of these fields can be missing):
 *   { name, level, school, casting_time, range, duration,
 *     components, material, concentration, ritual, description }
 */
export default function SpellHoverCard({ spell, children, side = "right" }) {
  if (!spell) return children;
  return (
    <HoverCard openDelay={120} closeDelay={50}>
      <HoverCardTrigger asChild>
        <span className="inline-block">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        align="start"
        className="w-80 max-w-[90vw] bg-[#0b1220] border border-slate-700 text-white p-4 space-y-2 shadow-xl"
      >
        <SpellTooltipBody spell={spell} />
      </HoverCardContent>
    </HoverCard>
  );
}

export function SpellTooltipBody({ spell }) {
  const lvl = Number(spell.level);
  const levelLabel =
    Number.isFinite(lvl) && lvl > 0 ? `Level ${lvl}` :
    Number.isFinite(lvl) && lvl === 0 ? "Cantrip" :
    "—";

  const components = (() => {
    if (!spell.components) return [];
    if (Array.isArray(spell.components)) return spell.components;
    return String(spell.components).split(/[,\s]+/).filter(Boolean);
  })();

  const truncated = (() => {
    const desc = spell.description || spell.desc || "";
    if (desc.length <= 320) return desc;
    // Snip on the nearest sentence boundary so the cut isn't mid-word.
    const slice = desc.slice(0, 320);
    const lastDot = slice.lastIndexOf(". ");
    return (lastDot > 120 ? slice.slice(0, lastDot + 1) : slice) + "…";
  })();

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-base leading-tight">{spell.name || "Unnamed spell"}</p>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest rounded px-2 py-0.5 border border-slate-500/40 bg-slate-800 text-slate-200">
            {levelLabel}
          </span>
          {spell.school && (
            <span className="text-[10px] font-bold uppercase tracking-widest rounded px-2 py-0.5 border border-violet-500/40 bg-violet-900/40 text-violet-300">
              {spell.school}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
        {spell.casting_time && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" /> {spell.casting_time}
          </span>
        )}
        {spell.range && (
          <span className="inline-flex items-center gap-1">
            <Crosshair className="w-3 h-3 text-slate-400" /> {spell.range}
          </span>
        )}
        {spell.duration && (
          <span className="inline-flex items-center gap-1">
            <Hourglass className="w-3 h-3 text-slate-400" /> {spell.duration}
          </span>
        )}
        {components.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-slate-400" /> {components.join(", ")}
          </span>
        )}
      </div>

      {(spell.concentration || spell.ritual) && (
        <div className="flex flex-wrap gap-1.5 text-[10px] uppercase tracking-widest font-bold">
          {spell.concentration && (
            <span className="rounded px-2 py-0.5 border border-amber-500/40 bg-amber-900/30 text-amber-300">
              Concentration
            </span>
          )}
          {spell.ritual && (
            <span className="rounded px-2 py-0.5 border border-cyan-500/40 bg-cyan-900/30 text-cyan-300">
              Ritual
            </span>
          )}
        </div>
      )}

      {spell.material && components.includes("M") && (
        <p className="text-[11px] text-slate-400 italic">
          Material: {spell.material}
        </p>
      )}

      {truncated && (
        <p className="text-xs text-slate-300 leading-snug whitespace-pre-line">
          <BookOpen className="w-3 h-3 inline-block mr-1 -mt-0.5 text-slate-500" />
          {truncated}
        </p>
      )}
    </>
  );
}
