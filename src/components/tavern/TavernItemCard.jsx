import React from "react";
import { Star, ChefHat, Award } from "lucide-react";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { formatSpice, applyDiscount } from "@/config/spiceConfig";
import { categoryIcon, CATEGORY_LABEL } from "@/config/tavernCategories";
import { TAVERN_PALETTE as P } from "@/config/tavernPalette";

/**
 * Marketplace card, creamsicle-themed.
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
      className="text-left rounded-lg overflow-hidden group flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ backgroundColor: P.card, border: `1px solid ${P.cardBorder}`, color: P.textPrimary }}
    >
      <div
        className="relative h-40 overflow-hidden"
        style={{ backgroundColor: P.pageBg }}
      >
        {item.preview_image_url ? (
          <img
            src={item.preview_image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: P.cardBorder }}>
            <Icon className="w-10 h-10" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {item.is_official && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-white shadow"
              style={{ backgroundColor: P.officialBg }}
              title="House Special — Guildstew Official"
            >
              <ChefHat className="w-3 h-3" /> House Special
            </span>
          )}
          {item.is_featured && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow"
              style={{ backgroundColor: P.featuredBg, color: P.textPrimary }}
              title="Chef's Choice — Featured"
            >
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
          <h3 className="text-sm font-bold line-clamp-1" style={{ color: P.textPrimary }}>{item.name}</h3>
          <span
            className="text-[9px] uppercase tracking-widest rounded px-1 py-0.5 flex-shrink-0"
            style={{ color: P.textSecondary, border: `1px solid ${P.cardBorder}` }}
          >
            {CATEGORY_LABEL[item.category] || item.category}
          </span>
        </div>
        <p className="text-[11px] truncate mt-0.5" style={{ color: P.textSecondary }}>by {creatorName || "Unknown"}</p>

        <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: P.textSecondary }}>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3" style={{ color: P.featuredBg, fill: P.featuredBg }} />
            {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            <span>({item.rating_count || 0})</span>
          </span>
          <span>{formatSpice(item.purchase_count || 0)} sold</span>
        </div>

        <div className="mt-auto pt-3 flex items-end justify-between">
          <div>
            <p className="text-base font-black flex items-center gap-1" style={{ color: P.accentDeep }}>
              <SpiceIcon size={14} color={P.accent} />
              {formatSpice(discounted)}
              {hasDiscount && (
                <span className="text-[10px] line-through ml-1" style={{ color: P.textSecondary }}>
                  {formatSpice(item.price)}
                </span>
              )}
            </p>
            <p className="text-[10px]" style={{ color: P.textSecondary }}>~${(discounted / 250).toFixed(2)} USD</p>
          </div>
        </div>
      </div>
    </button>
  );
}
