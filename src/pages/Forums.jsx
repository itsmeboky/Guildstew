import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { Search, MessageCircle, Users } from "lucide-react";
import { listCategories, getCategoryStats, searchThreads } from "@/lib/forumsClient";

/**
 * Forums landing.
 *
 * Creamsicle theme — deliberately NOT the dark palette. Signals
 * "you've left the game tools, you're in the community space."
 *
 * Renders the 8 default categories in a grid with thread count +
 * latest post, plus a search box that queries thread titles.
 */
export default function Forums() {
  const [search, setSearch] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["forumCategories"],
    queryFn: listCategories,
  });

  const categoryIds = categories.map((c) => c.id);

  const { data: threadStats = [] } = useQuery({
    queryKey: ["forumCategoryStats", categoryIds.sort().join(",")],
    queryFn: () => getCategoryStats(categoryIds),
    enabled: categoryIds.length > 0,
  });

  const byCategory = useMemo(() => {
    const map = new Map();
    for (const t of threadStats) {
      if (!map.has(t.category_id)) map.set(t.category_id, []);
      map.get(t.category_id).push(t);
    }
    return map;
  }, [threadStats]);

  const { data: searchResults = [] } = useQuery({
    queryKey: ["forumSearch", search.trim()],
    queryFn: () => searchThreads(search),
    enabled: search.trim().length >= 2,
    staleTime: 15_000,
  });

  const showSearch = search.trim().length >= 2;

  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM.pageBg }}>
      {/* Creamsicle banner */}
      <div
        className="w-full px-6 py-10"
        style={{
          background: `linear-gradient(135deg, ${CREAM.gradStart} 0%, ${CREAM.gradEnd} 100%)`,
        }}
      >
        <div className="max-w-5xl mx-auto">
          <h1
            className="text-4xl md:text-5xl font-black tracking-tight drop-shadow-sm"
            style={{ color: CREAM.textPrimary, fontFamily: "'Cream', 'Inter', sans-serif" }}
          >
            Guildstew Forums
          </h1>
          <p className="text-base md:text-lg mt-2" style={{ color: CREAM.textPrimary, opacity: 0.85 }}>
            Where adventurers gather to share, discuss, and build together.
          </p>

          <div className="mt-6 relative max-w-2xl">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: CREAM.textMuted }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search threads…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm outline-none transition-colors"
              style={{
                backgroundColor: CREAM.card,
                color: CREAM.textPrimary,
                borderColor: CREAM.cardBorder,
              }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {showSearch ? (
          <SearchResults results={searchResults} categories={categories} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                threads={byCategory.get(cat.id) || []}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryCard({ category, threads }) {
  const Icon = Icons[category.icon] || MessageCircle;
  const latest = threads[0];
  return (
    <Link
      to={`/forums/${category.slug}`}
      className="block rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        backgroundColor: CREAM.card,
        borderColor: CREAM.cardBorder,
        color: CREAM.textPrimary,
      }}
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: category.color || CREAM.gradStart }}
          >
            <Icon className="w-6 h-6" style={{ color: CREAM.textPrimary }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black flex items-center gap-2" style={{ color: CREAM.textPrimary }}>
              {category.name}
              {category.is_dev_only && (
                <span className="text-[9px] font-black uppercase tracking-widest rounded px-1.5 py-0.5"
                  style={{ backgroundColor: CREAM.devBadge, color: "#0b1220" }}>
                  DEV
                </span>
              )}
            </h2>
            {category.description && (
              <p className="text-xs mt-0.5" style={{ color: CREAM.textMuted }}>
                {category.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: CREAM.textMuted }}>
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3" />
            {threads.length} thread{threads.length === 1 ? "" : "s"}
          </span>
          {latest ? (
            <span className="truncate max-w-[60%]" title={latest.title}>
              Latest: <strong style={{ color: CREAM.accent }}>{latest.title}</strong>
            </span>
          ) : (
            <span>No posts yet — be the first!</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function SearchResults({ results, categories }) {
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  if (results.length === 0) {
    return (
      <p className="text-center py-16" style={{ color: CREAM.textMuted }}>
        No threads matched your search.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-widest font-black" style={{ color: CREAM.textMuted }}>
        {results.length} result{results.length === 1 ? "" : "s"}
      </p>
      {results.map((t) => {
        const cat = catById.get(t.category_id);
        if (!cat) return null;
        return (
          <Link
            key={t.id}
            to={`/forums/${cat.slug}/${t.slug}`}
            className="block rounded-lg border p-3 transition-colors hover:border-opacity-80"
            style={{ backgroundColor: CREAM.card, borderColor: CREAM.cardBorder }}
          >
            <p className="text-xs uppercase tracking-widest" style={{ color: CREAM.textMuted }}>
              {cat.name}
            </p>
            <h3 className="font-bold" style={{ color: CREAM.textPrimary }}>{t.title}</h3>
            <p className="text-[11px] mt-1" style={{ color: CREAM.textMuted }}>
              {t.reply_count || 0} replies · {t.last_reply_at
                ? new Date(t.last_reply_at).toLocaleDateString()
                : new Date(t.created_at).toLocaleDateString()}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

// Creamsicle palette — exported for the other forum pages so every
// route in `/forums/*` stays visually consistent.
export const CREAM = {
  pageBg:      "#FFF8F3",
  card:        "#FFFFFF",
  cardBorder:  "#F0D5C0",
  gradStart:   "#f8a47c",
  gradEnd:     "#f5c4a1",
  textPrimary: "#2D1B0E",
  textMuted:   "#8B6F5C",
  accent:      "#D85A30",
  devBadge:    "#37F2D1",
  button:      "#f8a47c",
};
