import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Rocket, Sparkles } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { renderBlogMarkdown } from "@/lib/renderBlogMarkdown";

/**
 * /changelog — full version history, newest first.
 *
 * Each release shows its short description and expanded release notes
 * rendered from Markdown. Major releases get a visual emphasis.
 */
export default function Changelog() {
  const { data: versions = [] } = useQuery({
    queryKey: ["changelog"],
    queryFn: async () => {
      const { data } = await supabase
        .from("version_history")
        .select("*")
        .order("release_date", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-[#37F2D1] mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back Home
        </Link>
        <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-6">
          <Rocket className="w-7 h-7 text-amber-400" />
          Changelog
        </h1>

        {versions.length === 0 ? (
          <p className="text-center text-slate-500 italic py-20">No releases yet.</p>
        ) : (
          <div className="space-y-8">
            {versions.map((v) => (
              <section
                key={v.id}
                className={`bg-[#1E2430] border rounded-lg p-5 ${
                  v.is_major ? "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.08)]" : "border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <span className="font-mono font-black text-amber-200 text-lg">{v.version}</span>
                  <h2 className="text-lg font-bold text-white">{v.title}</h2>
                  {v.is_major && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-900/40 text-amber-300">
                      <Sparkles className="w-3 h-3" /> Major
                    </span>
                  )}
                  {v.release_date && (
                    <span className="text-[11px] text-slate-500 ml-auto">
                      {new Date(v.release_date).toLocaleDateString(undefined, {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </span>
                  )}
                </div>
                {v.description && (
                  <p className="text-sm text-slate-300 italic mb-3">{v.description}</p>
                )}
                {v.full_notes && (
                  <article
                    className="prose prose-invert prose-sm prose-a:text-[#37F2D1] max-w-none text-slate-200"
                    dangerouslySetInnerHTML={{ __html: renderBlogMarkdown(v.full_notes) }}
                  />
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
