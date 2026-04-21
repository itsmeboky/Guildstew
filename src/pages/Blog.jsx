import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Eye, Calendar, FileText } from "lucide-react";
import { supabase } from "@/api/supabaseClient";

/**
 * /blog index.
 *
 * All published posts newest-first. Featured posts float to the top.
 */
export default function Blog() {
  const { data: posts = [] } = useQuery({
    queryKey: ["blogIndex"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, category, summary, cover_image_url, published_at, view_count, is_featured")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-7 h-7 text-[#37F2D1]" />
          <h1 className="text-3xl font-black text-white">Guildstew Blog</h1>
        </div>

        {posts.length === 0 ? (
          <p className="text-center text-slate-500 italic py-20">No posts yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((p) => (
              <Link
                key={p.id}
                to={`/blog/${p.slug}`}
                className="bg-[#1E2430] border border-slate-700 hover:border-[#37F2D1]/50 rounded-lg overflow-hidden transition-colors group flex flex-col"
              >
                {p.cover_image_url && (
                  <div className="h-40 bg-[#050816] overflow-hidden">
                    <img src={p.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#050816] border border-slate-700 text-[#37F2D1]">
                      {(p.category || "article").replace(/_/g, " ")}
                    </span>
                    {p.is_featured && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500 text-amber-950">
                        Featured
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-white leading-snug group-hover:text-[#37F2D1] transition-colors line-clamp-2">
                    {p.title}
                  </h2>
                  {p.summary && (
                    <p className="text-sm text-slate-400 mt-1 line-clamp-3">{p.summary}</p>
                  )}
                  <div className="mt-auto pt-3 flex items-center gap-3 text-[11px] text-slate-500">
                    {p.published_at && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.published_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {p.view_count || 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
