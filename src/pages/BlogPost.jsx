import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Calendar } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { renderBlogMarkdown } from "@/lib/renderBlogMarkdown";

/**
 * /blog/:slug detail page.
 *
 * Layout per Boky's mockup:
 *   - Header image as a full-width banner with the title overlaid
 *     on a gradient for legibility across image variations.
 *   - Body in a fixed-height scroll box so long posts don't push
 *     the page chrome out of view.
 *   - Decorative image overlapping the bottom-right of the content
 *     box as visual flair (hidden on small viewports so it doesn't
 *     crowd narrow screens).
 *
 * Image fallbacks: when header_image_url is missing the legacy
 * cover_image_url stands in; if both are missing the header
 * collapses to a gradient band and the title gets its own block.
 *
 * Pulls the post by slug, bumps `view_count` via the SECURITY DEFINER
 * RPC so anonymous readers can increment the counter without needing
 * write RLS on the table itself. Content rendering goes through
 * renderBlogMarkdown which auto-detects ReactQuill HTML output and
 * passes it through untouched (Markdown legacy posts still convert).
 */
export default function BlogPost() {
  const { slug } = useParams();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ["blogPost", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, category, summary, content, cover_image_url, header_image_url, decorative_image_url, author_name, published_at, view_count, tags, is_published")
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

  // Header image falls back to cover_image_url so legacy posts
  // (authored before the header_image_url column existed) still
  // render the right visual at the top of the page.
  const headerImage = post.header_image_url || post.cover_image_url || null;
  const decorativeImage = post.decorative_image_url || null;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* Header section — banner image with title overlay. When no
          image is set we drop to a gradient band so the title still
          gets a distinct top section instead of slamming into the
          page chrome. */}
      <div className="relative h-64 md:h-96 overflow-hidden">
        {headerImage ? (
          <img
            src={headerImage}
            alt=""
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1E2430] via-[#0b1220] to-[#050816]" />
        )}
        {/* Bottom-anchored gradient ensures the title is legible
            against any image variation. Lighter at the top so the
            image isn't washed out, darkest at the bottom where the
            title sits. */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-[#050816]" />

        <div className="absolute inset-x-0 bottom-0 px-4 md:px-8 pb-6">
          <div className="max-w-4xl mx-auto">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-[#37F2D1] mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Blog
            </Link>
            <h1
              className="text-3xl md:text-5xl font-black text-white leading-tight"
              style={{ textShadow: "0 4px 16px rgba(0,0,0,0.6)" }}
            >
              {post.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        {/* Meta row — category, date, author, views — sits between
            the header banner and the content box. */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
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

        {post.summary && (
          <p className="text-base text-slate-300 italic mb-6">{post.summary}</p>
        )}

        {/* Content section — fixed-height scroll box with the
            decorative image overlapping the bottom-right corner.
            The decorative image positions absolutely off the
            wrapper so it bleeds outside the box per the mockup;
            it's hidden on small viewports so it doesn't crowd. */}
        <div className="relative">
          <div
            className="bg-[#0b1220] border border-slate-800 rounded-2xl p-6 md:p-8 max-h-[600px] overflow-y-auto custom-scrollbar"
          >
            {post.content ? (
              <article
                className="prose prose-invert prose-headings:font-black prose-a:text-[#37F2D1] prose-img:rounded-lg max-w-none text-slate-200"
                dangerouslySetInnerHTML={{ __html: renderBlogMarkdown(post.content) }}
              />
            ) : (
              <p className="text-sm italic text-slate-500 text-center py-12">
                Coming soon…
              </p>
            )}
          </div>

          {decorativeImage && (
            <img
              src={decorativeImage}
              alt=""
              aria-hidden="true"
              className="hidden md:block pointer-events-none absolute -bottom-[72px] -right-[120px] w-44 h-44 lg:w-56 lg:h-56 object-contain z-10 drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
            />
          )}
        </div>

        {(post.tags || []).length > 0 && (
          <div className="mt-12 pt-6 border-t border-slate-800">
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
