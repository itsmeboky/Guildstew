import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Search, ChevronDown, HelpCircle, AlertTriangle, BookOpen,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { renderBlogMarkdown } from "@/lib/renderBlogMarkdown";

/**
 * /faq
 *
 * Reads from `faq_entries` where `is_published = true`. Questions are
 * accordion rows; clicking expands the answer. Category tabs filter
 * the list; search matches against question + answer text.
 */
const CATEGORIES = [
  { value: "all",              label: "All" },
  { value: "getting_started",  label: "Getting Started" },
  { value: "campaigns",        label: "Campaigns" },
  { value: "characters",       label: "Characters" },
  { value: "combat",           label: "Combat" },
  { value: "brewery",          label: "Brewery" },
  { value: "tavern",           label: "Tavern" },
  { value: "billing",          label: "Billing" },
  { value: "technical",        label: "Technical" },
];

export default function FAQ() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);

  const { data: entries = [] } = useQuery({
    queryKey: ["faqEntries"],
    queryFn: async () => {
      const { data } = await supabase
        .from("faq_entries")
        .select("*")
        .eq("is_published", true)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      return (
        (e.question || "").toLowerCase().includes(q) ||
        (e.answer || "").toLowerCase().includes(q)
      );
    });
  }, [entries, category, search]);

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-5">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-[#37F2D1]" />
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Quick answers to the most common questions.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FAQ…"
            className="w-full pl-9 pr-3 py-2 bg-[#1E2430] border border-slate-700 rounded-lg text-sm text-white"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                category === c.value
                  ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                  : "bg-[#1E2430] text-slate-300 border-slate-700 hover:border-slate-500"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-500 italic py-12">
            No FAQ entries match your search.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => {
              const open = openId === e.id;
              return (
                <div
                  key={e.id}
                  className="bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : e.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#2a3441] transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                        {categoryLabel(e.category)}
                      </p>
                      <p className="text-white font-bold">{e.question}</p>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <div
                      className="px-4 pb-4 border-t border-slate-700/50 pt-3 text-sm text-slate-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderBlogMarkdown(e.answer || "") }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-8 text-center space-y-3">
      <HelpCircle className="w-10 h-10 text-slate-600 mx-auto" />
      <p className="text-sm text-slate-300">
        We're building our FAQ! In the meantime, check the Documentation or Report a Problem.
      </p>
      <div className="flex items-center justify-center gap-2 pt-1">
        <Link to="/docs" className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-[#37F2D1] text-[#050816]">
          <BookOpen className="w-3 h-3" /> Documentation
        </Link>
        <Link to="/support/ticket" className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-700 text-slate-300">
          <AlertTriangle className="w-3 h-3" /> Report a Problem
        </Link>
      </div>
    </div>
  );
}

function categoryLabel(v) {
  return CATEGORIES.find((c) => c.value === v)?.label || v;
}
