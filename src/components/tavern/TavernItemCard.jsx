import React from "react";
import { Flame, Star, ChefHat, Award } from "lucide-react";
import { formatSpice, applyDiscount } from "@/config/spiceConfig";
import { categoryIcon, CATEGORY_LABEL } from "@/config/tavernCategories";

/**
 * Marketplace card.
 *
 * Shows preview, name, creator, price + discount, rating, badges.
 * The buyer's tier is passed in so we can display the already-
 * discounted price next to the list price — the actual discount is
 * re-applied server-side at purchase time too.
 */
export default function TavernItemCard({ item, creatorName, owned, buyerTier = "free", onClick }) {
  const Icon = categoryIcon(item.category);
  const avgRating = item.rating_count > 0 ? (item.rating_sum / item.rating_count) : 0;
  const discounted = applyDiscount(item.price, buyerTier);
  const hasDiscount = discounted < item.price;

  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      className="text-left bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden hover:border-amber-500/50 transition-colors group flex flex-col"
    >
      <div className="relative h-40 bg-[#050816] overflow-hidden">
        {item.preview_image_url ? (
          <img
            src={item.preview_image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700">
            <Icon className="w-10 h-10" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {item.is_official && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-orange-600 text-white shadow" title="House Special — Guildstew Official">
              <ChefHat className="w-3 h-3" /> House Special
            </span>
          )}
          {item.is_featured && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500 text-amber-950 shadow" title="Chef's Choice — Featured">
              <Award className="w-3 h-3" /> Chef's Choice
            </span>
          )}
        </div>

        {owned && (
          <span className="absolute top-2 right-2 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-600 text-white shadow">
            Owned
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-white line-clamp-1">{item.name}</h3>
          <span className="text-[9px] uppercase tracking-widest text-slate-500 border border-slate-700 rounded px-1 py-0.5 flex-shrink-0">
            {CATEGORY_LABEL[item.category] || item.category}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 truncate mt-0.5">by {creatorName || "Unknown"}</p>

        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            <span className="text-slate-500">({item.rating_count || 0})</span>
          </span>
          <span className="text-slate-500">{formatSpice(item.purchase_count || 0)} sold</span>
        </div>

        <div className="mt-auto pt-3 flex items-end justify-between">
          <div>
            <p className="text-base font-black text-amber-200 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              {formatSpice(discounted)}
              {hasDiscount && (
                <span className="text-[10px] text-slate-500 line-through ml-1">
                  {formatSpice(item.price)}
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-500">~${(discounted / 250).toFixed(2)} USD</p>
          </div>
        </div>
      </div>
    </button>
  );
}
