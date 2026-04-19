import React from "react";
import { Badge } from "@/components/ui/badge";
import { Download, Star, FlaskConical } from "lucide-react";
import { safeText } from "@/utils/safeRender";

/**
 * Brewery card — compact summary of a homebrew_rules row on the
 * marketplace grid. Click anywhere on the card to open the detail
 * dialog.
 *
 * Props:
 *   brew      — the homebrew_rules row
 *   onOpen    — click handler (card + title)
 *   compact   — reserved for a denser variant; not yet rendered
 *               differently but kept so the prop surface matches
 *               MyBrewsList's card shape.
 */
export default function BreweryCard({ brew, onOpen }) {
  const avgRating =
    brew.rating_count > 0 ? (Number(brew.rating_total) / brew.rating_count).toFixed(1) : "—";
  const category = formatCategoryLabel(brew.category);
  const categoryClass = categoryColorClass(brew.category);
  const tags = Array.isArray(brew.tags) ? brew.tags.slice(0, 4) : [];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen?.(); }}
      className="group cursor-pointer bg-[#2A3441] border border-[#111827] rounded-xl overflow-hidden hover:border-[#37F2D1]/60 hover:shadow-[0_0_20px_rgba(55,242,209,0.15)] transition-all flex flex-col"
    >
      {/* Cover */}
      <div className="relative aspect-[16/9] bg-[#050816]">
        {brew.cover_image_url ? (
          <img
            src={brew.cover_image_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${categoryGradient(brew.category)}`}>
            <FlaskConical className="w-12 h-12 text-white/80 drop-shadow" />
          </div>
        )}
        <div className={`absolute top-2 left-2 text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 ${categoryClass}`}>
          {category}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-3 gap-1.5">
        <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-[#37F2D1]">
          {safeText(brew.title) || "Untitled brew"}
        </h3>
        {brew.description && (
          <p className="text-[11px] text-slate-400 line-clamp-2 min-h-[28px]">
            {safeText(brew.description)}
          </p>
        )}

        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-auto">
          <span className="inline-flex items-center gap-1">
            <Download className="w-3 h-3" /> {brew.downloads || 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star className="w-3 h-3 text-[#fbbf24]" /> {avgRating}
            {brew.rating_count > 0 && (
              <span className="opacity-70">({brew.rating_count})</span>
            )}
          </span>
          <Badge variant="outline" className="ml-auto text-slate-300 border-slate-600 text-[9px] font-semibold uppercase tracking-wider">
            {(brew.game_system === "dnd5e" ? "D&D 5e" : brew.game_system) || "D&D 5e"}
          </Badge>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1 border-t border-[#1e293b] mt-1">
            {tags.map((t) => (
              <span
                key={safeText(t)}
                className="text-[9px] font-semibold uppercase tracking-wider text-[#37F2D1] bg-[#37F2D1]/10 border border-[#37F2D1]/30 rounded-full px-1.5 py-0.5"
              >
                {safeText(t)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function formatCategoryLabel(category) {
  switch (category) {
    case "combat_rules":    return "Combat Rules";
    case "rest_rules":      return "Rest Rules";
    case "character_rules": return "Character Rules";
    case "spell_modifiers": return "Spellcasting Rules";
    case "class_modifiers": return "Class Modifiers";
    case "item_rules":      return "Item Rules";
    case "custom_item":     return "Custom Item";
    case "custom_monster":  return "Custom Monster";
    case "custom_spell":    return "Custom Spell";
    case "custom_class_feature":
    case "custom_ability":  return "Custom Class Feature";
    default:                return category || "Homebrew";
  }
}

export function categoryColorClass(category) {
  switch (category) {
    case "combat_rules":    return "bg-red-500 text-white";
    case "rest_rules":      return "bg-sky-500 text-white";
    case "character_rules": return "bg-indigo-500 text-white";
    case "spell_modifiers": return "bg-fuchsia-500 text-white";
    case "custom_item":     return "bg-emerald-500 text-black";
    case "custom_monster":  return "bg-purple-500 text-white";
    case "custom_spell":    return "bg-blue-500 text-white";
    case "custom_class_feature":
    case "custom_ability":  return "bg-amber-500 text-black";
    default:                return "bg-slate-600 text-white";
  }
}

// Gradient fallback when a brew has no cover image.
function categoryGradient(category) {
  switch (category) {
    case "combat_rules":    return "bg-gradient-to-br from-red-600/60 to-orange-500/50";
    case "rest_rules":      return "bg-gradient-to-br from-sky-600/60 to-indigo-500/50";
    case "character_rules": return "bg-gradient-to-br from-indigo-600/60 to-purple-500/50";
    case "spell_modifiers": return "bg-gradient-to-br from-fuchsia-600/60 to-pink-500/50";
    case "custom_item":     return "bg-gradient-to-br from-emerald-600/60 to-teal-500/50";
    case "custom_monster":  return "bg-gradient-to-br from-purple-700/60 to-indigo-500/50";
    case "custom_spell":    return "bg-gradient-to-br from-blue-600/60 to-cyan-500/50";
    case "custom_class_feature":
    case "custom_ability":  return "bg-gradient-to-br from-amber-600/60 to-orange-500/50";
    default:                return "bg-gradient-to-br from-slate-600/60 to-slate-800/60";
  }
}
