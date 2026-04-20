import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package, Download, Star, Skull, Swords, Wand2, Stars,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { safeText } from "@/utils/safeRender";
import { contentPackSummary } from "@/lib/breweryContentPack";

/**
 * Marketplace card for a `brewery_mods` row with
 * mod_type='content_pack'. Richer than the generic BreweryCard:
 * shows per-bucket count badges, a wider cover, and a "Preview
 * Contents" toggle that expands the entry names for evaluation
 * before install.
 *
 * Props:
 *   pack             — brewery_mods row (id, name, description,
 *                      metadata, creator_display_name, rating*,
 *                      downloads).
 *   onInstall(pack)  — handler for the Install button.
 *   onOpen(pack)     — optional click handler for the card body /
 *                      title (detail dialog).
 *   installDisabled  — greys out the install button (already
 *                      installed, wrong system, etc).
 */
export default function ContentPackCard({ pack, onOpen, onInstall, installDisabled = false }) {
  const [expanded, setExpanded] = useState(false);
  const meta = pack?.metadata || {};
  const counts = meta.content_counts || {};
  const summary = contentPackSummary(meta);
  const contents = meta.contents || {};
  const avgRating =
    pack?.rating_count > 0
      ? (Number(pack.rating_total) / pack.rating_count).toFixed(1)
      : "—";

  return (
    <div className="bg-[#2A3441] border border-[#111827] rounded-xl overflow-hidden hover:border-[#37F2D1]/60 hover:shadow-[0_0_20px_rgba(55,242,209,0.15)] transition-all flex flex-col md:flex-row">
      {/* Cover — wider aspect for content packs so the card reads
          as a bundle rather than a single piece of content. */}
      <div
        role={onOpen ? "button" : undefined}
        tabIndex={onOpen ? 0 : -1}
        onClick={onOpen ? () => onOpen(pack) : undefined}
        onKeyDown={onOpen ? (e) => { if (e.key === "Enter") onOpen(pack); } : undefined}
        className="relative bg-[#050816] md:w-64 md:shrink-0 aspect-[16/9] md:aspect-auto md:min-h-[160px] cursor-pointer"
      >
        {meta.image_url ? (
          <img
            src={meta.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-700/60 to-teal-500/50">
            <Package className="w-12 h-12 text-white/80 drop-shadow" />
          </div>
        )}
        <div className="absolute top-2 left-2 text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 bg-emerald-500 text-black">
          Content Pack
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-4 gap-2">
        <div className="flex items-start gap-2">
          <h3
            role={onOpen ? "button" : undefined}
            tabIndex={onOpen ? 0 : -1}
            onClick={onOpen ? () => onOpen(pack) : undefined}
            onKeyDown={onOpen ? (e) => { if (e.key === "Enter") onOpen(pack); } : undefined}
            className="text-lg font-bold text-white hover:text-[#37F2D1] cursor-pointer line-clamp-1 flex-1"
          >
            {safeText(pack?.name) || "Untitled pack"}
          </h3>
          <Badge variant="outline" className="text-slate-300 border-slate-600 text-[9px] font-semibold uppercase tracking-wider">
            {pack?.game_system === "dnd5e" ? "D&D 5e" : pack?.game_system || "D&D 5e"}
          </Badge>
        </div>

        {pack?.description && (
          <p className="text-xs text-slate-400 line-clamp-2">
            {safeText(pack.description)}
          </p>
        )}

        {/* Summary badges — one per non-empty bucket. */}
        <div className="flex flex-wrap gap-1.5">
          {counts.monsters > 0 && (
            <CountBadge icon={Skull} label={`${counts.monsters} Monster${counts.monsters === 1 ? "" : "s"}`} />
          )}
          {counts.items > 0 && (
            <CountBadge icon={Swords} label={`${counts.items} Item${counts.items === 1 ? "" : "s"}`} />
          )}
          {counts.spells > 0 && (
            <CountBadge icon={Wand2} label={`${counts.spells} Spell${counts.spells === 1 ? "" : "s"}`} />
          )}
          {counts.class_features > 0 && (
            <CountBadge icon={Stars} label={`${counts.class_features} Feature${counts.class_features === 1 ? "" : "s"}`} />
          )}
          {!summary && (
            <span className="text-[10px] italic text-slate-500">Empty pack</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
          <span className="inline-flex items-center gap-1">
            <Download className="w-3 h-3" /> {pack?.downloads || 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star className="w-3 h-3 text-[#fbbf24]" /> {avgRating}
            {pack?.rating_count > 0 && (
              <span className="opacity-70">({pack.rating_count})</span>
            )}
          </span>
          {pack?.creator_display_name && (
            <span className="opacity-70 truncate">by {safeText(pack.creator_display_name)}</span>
          )}
        </div>

        {/* Preview + install actions */}
        <div className="flex flex-wrap items-center gap-2 mt-auto pt-2 border-t border-[#1e293b]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {expanded ? "Hide contents" : "Preview contents"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onInstall?.(pack)}
            disabled={installDisabled || !onInstall}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold disabled:opacity-50"
          >
            Install to Campaign
          </Button>
        </div>

        {expanded && (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
            {renderBucket("Monsters", contents.monsters)}
            {renderBucket("Items", contents.items)}
            {renderBucket("Spells", contents.spells)}
            {renderBucket("Features", contents.class_features)}
          </div>
        )}
      </div>
    </div>
  );
}

function CountBadge({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5 text-[10px] font-semibold">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function renderBucket(label, entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return (
    <div className="bg-[#050816] border border-slate-700 rounded p-2">
      <p className="font-bold uppercase tracking-widest text-[#37F2D1] mb-1">{label}</p>
      <ul className="space-y-0.5 text-slate-300">
        {entries.slice(0, 8).map((e, i) => (
          <li key={i} className="truncate">{safeText(e?.name) || "Unnamed"}</li>
        ))}
        {entries.length > 8 && (
          <li className="text-slate-500 italic">+{entries.length - 8} more…</li>
        )}
      </ul>
    </div>
  );
}
