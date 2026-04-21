import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, HelpCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { renderBlogMarkdown } from "@/lib/renderBlogMarkdown";

/**
 * /docs
 *
 * Two-pane reader. Left = category nav + per-category doc list.
 * Right = the selected doc's rendered markdown. Deep-linkable via
 * `?slug=<page-slug>` so a doc URL is shareable.
 */
const CATEGORIES = [
  { value: "getting_started", label: "Getting Started" },
  { value: "campaigns",       label: "Campaigns" },
  { value: "characters",      label: "Characters" },
  { value: "combat",          label: "Combat" },
  { value: "homebrew",        label: "Homebrew" },
  { value: "brewery",         label: "The Brewery" },
  { value: "tavern",          label: "The Tavern" },
  { value: "guild",           label: "Guilds" },
  { value: "admin",           label: "Admin" },
];

export default function Docs() {
  const [selectedSlug, setSelectedSlug] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("slug"); } catch { return null; }
  });

  const { data: pages = [] } = useQuery({
    queryKey: ["docPages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documentation_pages")
        .select("*")
        .eq("is_published", true)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  // Fall back to the first page if no slug selected, or if the URL
  // slug doesn't exist.
  const current = useMemo(() => {
    if (!pages.length) return null;
    return pages.find((p) => p.slug === selectedSlug) || pages[0];
  }, [pages, selectedSlug]);

  useEffect(() => {
    if (!current) return;
    const next = `?slug=${current.slug}`;
    if (window.location.search !== next) {
      window.history.replaceState(null, "", `/docs${next}`);
    }
  }, [current?.slug]);

  const byCategory = useMemo(() => {
    const map = new Map();
    for (const p of pages) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category).push(p);
    }
    return map;
  }, [pages]);

  if (pages.length === 0) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <BookOpen className="w-12 h-12 text-[#37F2D1] mx-auto" />
          <h1 className="text-3xl font-black">Documentation coming soon</h1>
          <p className="text-sm text-slate-400">We're writing the docs. While you wait:</p>
          <div className="flex items-center justify-center gap-2">
            <Link to="/faq" className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-[#37F2D1] text-[#050816]">
              <HelpCircle className="w-3 h-3" /> FAQ
            </Link>
            <Link to="/support/ticket" className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-700 text-slate-300">
              <AlertTriangle className="w-3 h-3" /> Report a Problem
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6">
        {/* Sidebar nav */}
        <aside className="space-y-4">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#37F2D1]" /> Docs
            </h1>
            <p className="text-xs text-slate-500">Self-help guides.</p>
          </div>
          {CATEGORIES.map((c) => {
            const list = byCategory.get(c.value) || [];
            if (list.length === 0) return null;
            return (
              <div key={c.value}>
                <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-1.5">
                  {c.label}
                </p>
                <ul className="space-y-0.5">
                  {list.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedSlug(p.slug)}
                        className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${
                          current?.slug === p.slug
                            ? "bg-[#2a3441] text-[#37F2D1] font-bold"
                            : "text-slate-300 hover:bg-[#2a3441] hover:text-white"
                        }`}
                      >
                        {p.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </aside>

        {/* Content */}
        <main className="bg-[#1E2430] border border-slate-700 rounded-lg p-6 md:p-8">
          {current ? (
            <article>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
                {CATEGORIES.find((c) => c.value === current.category)?.label || current.category}
              </p>
              <h2 className="text-3xl font-black text-white mt-1">{current.title}</h2>
              <p className="text-[11px] text-slate-500 mt-1">
                Updated {new Date(current.updated_at || current.created_at).toLocaleDateString()}
              </p>
              <div
                className="prose prose-invert max-w-none text-slate-200 mt-6 prose-a:text-[#37F2D1]"
                dangerouslySetInnerHTML={{ __html: renderBlogMarkdown(current.content || "") }}
              />
              <div className="mt-8 pt-6 border-t border-slate-700/50 text-sm text-slate-400">
                Was this helpful?{" "}
                <span className="text-xs text-slate-500 italic">(feedback coming soon)</span>
              </div>
            </article>
          ) : (
            <p className="text-slate-400">Pick a page on the left.</p>
          )}
        </main>
      </div>
    </div>
  );
}
