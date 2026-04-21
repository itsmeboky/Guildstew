import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Calendar } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { renderBlogMarkdown } from "@/lib/renderBlogMarkdown";

/**
 * /blog/:slug detail page.
 *
 * Pulls the post by slug, bumps `view_count` via the SECURITY DEFINER
 * RPC so anonymous readers can increment the counter without needing
 * write RLS on the table itself. Markdown is rendered by a small
 * inline converter — enough for headings, bold, italic, links,
 * images, code, and lists; not a full Markdown engine.
 */
export default function BlogPost() {
  const { slug } = useParams();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ["blogPost", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, category, summary, content, cover_image_url, author_name, published_at, view_count, tags, is_published")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      return data || null;
    },
    enabled: !!slug,
  });

  // Fire the view-count increment once per post view. The RPC
  // is idempotent from the client's POV — if the slug doesn't
  // match a published post, it no-ops.
  useEffect(() => {
    if (!post?.slug) return;
    supabase.rpc("increment_blog_view", { p_slug: post.slug }).then(() => {
      /* swallow — analytics shouldn't break the render */
    }).catch(() => {});
  }, [post?.slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050816] text-slate-400 flex items-center justify-center">
        Loading…
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-black text-amber-200">404</h1>
          <p className="text-sm text-slate-400">No blog post matches that URL.</p>
          <Link to="/blog" className="inline-flex items-center gap-1 text-[#37F2D1] hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {post.cover_image_url && (
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050816]/30 to-[#050816]" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        <Link to="/blog" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-[#37F2D1] mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Blog
        </Link>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#1E2430] border border-slate-700 text-[#37F2D1]">
            {(post.category || "article").replace(/_/g, " ")}
          </span>
          {post.published_at && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar className="w-3 h-3" />
              {new Date(post.published_at).toLocaleDateString(undefined, {
                year: "numeric", month: "long", day: "numeric",
              })}
            </span>
          )}
          {post.author_name && (
            <span className="text-[11px] text-slate-500">· by {post.author_name}</span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Eye className="w-3 h-3" /> {post.view_count || 0}
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4">
          {post.title}
        </h1>

        {post.summary && (
          <p className="text-base text-slate-300 italic mb-6">{post.summary}</p>
        )}

        <article
          className="prose prose-invert prose-headings:font-black prose-a:text-[#37F2D1] prose-img:rounded-lg max-w-none text-slate-200"
          dangerouslySetInnerHTML={{ __html: renderBlogMarkdown(post.content || "") }}
        />

        {(post.tags || []).length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <span key={t} className="text-[11px] bg-[#1E2430] border border-slate-700 text-slate-400 rounded px-2 py-0.5">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
