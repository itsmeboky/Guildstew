import React from "react";
import {
  HoverCard, HoverCardContent, HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Sparkles } from "lucide-react";
import {
  rarityFrameClasses, rarityBadgeClasses, rarityLabel,
} from "@/config/itemRarity";

/**
 * Wraps any trigger node (icon, card, table cell) in a rarity-tinted
 * gradient border and a Radix HoverCard that renders the canonical
 * item tooltip: name, rarity badge, type, description, key properties,
 * and an attunement chip when the item requires it.
 *
 * Usage:
 *   <ItemHoverCard item={dnd5eItem}>
 *     <img src={...} className="w-10 h-10" />
 *   </ItemHoverCard>
 *
 * Pass `frame={false}` to skip the gradient border (e.g. when the
 * caller already wraps the trigger in their own border treatment).
 */
export default function ItemHoverCard({ item, children, frame = true, side = "right" }) {
  if (!item) return children;

  const trigger = frame ? (
    <span className={`inline-block rounded-lg p-[2px] bg-gradient-to-br ${rarityFrameClasses(item.rarity)}`}>
      <span className="block rounded-md bg-[#0f1219]">{children}</span>
    </span>
  ) : children;

  return (
    <HoverCard openDelay={120} closeDelay={50}>
      <HoverCardTrigger asChild>
        <span className="inline-block">{trigger}</span>
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        align="start"
        className="w-80 max-w-[90vw] bg-[#0b1220] border border-slate-700 text-white p-4 space-y-2 shadow-xl"
      >
        <ItemTooltipBody item={item} />
      </HoverCardContent>
    </HoverCard>
  );
}

export function ItemTooltipBody({ item }) {
  const name = item.name || "Unnamed";
  const type = item.type || item.category || null;
  const damage = item.damage || item.damage_dice || null;
  const damageType = item.damage_type || null;
  const range = item.range || null;
  const properties = Array.isArray(item.properties)
    ? item.properties
    : typeof item.properties === "string"
      ? item.properties.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  const attunement = item.requires_attunement || item.attunement;
  const description = item.description || item.desc || "";

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-base leading-tight">{name}</p>
        <span className={`text-[10px] font-bold uppercase tracking-widest rounded px-2 py-0.5 border ${rarityBadgeClasses(item.rarity)}`}>
          {rarityLabel(item.rarity)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
        {type && <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> {type}</span>}
        {attunement && (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold">
            Requires Attunement
          </span>
        )}
      </div>

      {(damage || range) && (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {damage && (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-red-900/30 text-red-200 border border-red-700/40">
              {damage}{damageType ? ` ${damageType}` : ""}
            </span>
          )}
          {range && (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-600/50">
              Range {range}
            </span>
          )}
        </div>
      )}

      {properties.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {properties.map((p) => (
            <span key={p} className="text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 bg-slate-800/80 text-slate-300 border border-slate-600/40">
              {p}
            </span>
          ))}
        </div>
      )}

      {description && (
        <p className="text-xs text-slate-300 leading-snug whitespace-pre-line">
          {description.length > 320 ? `${description.slice(0, 320)}…` : description}
        </p>
      )}
    </>
  );
}
