import React, { useEffect, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Heart, Check, Pin, Lock, Eye, MessageCircle,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import {
  getCategoryBySlug, getThread, listReplies, hasLiked, toggleLike,
} from "@/lib/forumsClient";
import { useAuth } from "@/lib/AuthContext";
import { renderBlogMarkdown } from "@/lib/renderBlogMarkdown";
import { CREAM } from "@/pages/Forums";
import ReplyForm from "@/components/forums/ReplyForm";

/**
 * Thread detail — OP at the top, replies below, reply composer at
 * the bottom (unless the thread is locked). Dev posts + replies get
 * a teal left accent so they pop against the warm palette. Markdown
 * is rendered through the same helper the blog uses.
 */
export default function ForumThread() {
  const { categorySlug, threadSlug } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: category } = useQuery({
    queryKey: ["forumCategory", categorySlug],
    queryFn: () => getCategoryBySlug(categorySlug),
  });

  const { data: thread } = useQuery({
    queryKey: ["forumThread", category?.id, threadSlug],
    queryFn: () => getThread(category.id, threadSlug),
    enabled: !!category?.id && !!threadSlug,
  });

  const { data: replies = [] } = useQuery({
    queryKey: ["forumReplies", thread?.id],
    queryFn: () => listReplies(thread.id),
    enabled: !!thread?.id,
  });

  // One-shot view-count bump. The RPC runs as SECURITY DEFINER so
  // anonymous readers can bump without a write policy.
  useEffect(() => {
    if (!thread?.id) return;
    supabase.rpc("increment_forum_thread_view", { p_thread_id: thread.id }).catch(() => {});
  }, [thread?.id]);

  // Author profiles — batch-fetch for OP + every reply.
  const authorIds = useMemo(() => {
    const ids = new Set();
    if (thread?.author_id) ids.add(thread.author_id);
    for (const r of replies) if (r.author_id) ids.add(r.author_id);
    return Array.from(ids);
  }, [thread, replies]);

  const { data: authors = [] } = useQuery({
    queryKey: ["forumThreadAuthors", authorIds.sort().join(",")],
    queryFn: async () => {
      if (authorIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username, full_name, avatar_url, subscription_tier")
        .in("user_id", authorIds);
      return data || [];
    },
    enabled: authorIds.length > 0,
  });

  const authorOf = (id) => authors.find((a) => a.user_id === id) || null;

  const replyIds = replies.map((r) => r.id);
  const { data: likedSet = new Set() } = useQuery({
    queryKey: ["forumLikes", user?.id, replyIds.sort().join(",")],
    queryFn: () => hasLiked(user.id, replyIds),
    enabled: !!user?.id && replyIds.length > 0,
  });

  const likeMut = useMutation({
    mutationFn: (replyId) => toggleLike(user.id, replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forumReplies", thread?.id] });
      queryClient.invalidateQueries({ queryKey: ["forumLikes", user?.id] });
    },
    onError: () => toast.error("Could not toggle like"),
  });

  if (!category) {
    return <NotFound />;
  }
  if (category && !thread) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM.pageBg }}>
      <div
        className="w-full px-6 py-6"
        style={{ background: `linear-gradient(135deg, ${CREAM.gradStart} 0%, ${CREAM.gradEnd} 100%)` }}
      >
        <div className="max-w-3xl mx-auto">
          <Link
            to={`/forums/${category.slug}`}
            className="inline-flex items-center gap-1 text-xs"
            style={{ color: CREAM.textPrimary, opacity: 0.8 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {category.name}
          </Link>
          <h1 className="text-2xl md:text-3xl font-black mt-2 flex items-center gap-2 flex-wrap" style={{ color: CREAM.textPrimary }}>
            {thread.is_pinned && <Pin className="w-5 h-5" />}
            {thread.is_locked && <Lock className="w-5 h-5" />}
            {thread.title}
            {thread.is_dev_post && (
              <span className="text-[10px] font-black uppercase tracking-widest rounded px-2 py-0.5"
                style={{ backgroundColor: CREAM.devBadge, color: "#0b1220" }}>
                Guildstew Team
              </span>
            )}
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        <Post
          author={authorOf(thread.author_id)}
          body={thread.content}
          date={thread.created_at}
          isDev={thread.is_dev_post}
          isOP
          stats={{ replies: thread.reply_count, views: thread.view_count }}
        />

        {replies.length > 0 && (
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: CREAM.textMuted }}>
            {replies.length} repl{replies.length === 1 ? "y" : "ies"}
          </p>
        )}

        {replies.map((r) => (
          <Post
            key={r.id}
            author={authorOf(r.author_id)}
            body={r.content}
            date={r.created_at}
            isDev={r.is_dev_reply}
            isSolution={r.is_solution}
            likes={r.likes_count || 0}
            liked={likedSet.has(r.id)}
            onLike={user ? () => likeMut.mutate(r.id) : null}
          />
        ))}

        {thread.is_locked ? (
          <div
            className="rounded-lg border px-4 py-3 text-sm text-center"
            style={{ backgroundColor: CREAM.card, borderColor: CREAM.cardBorder, color: CREAM.textMuted }}
          >
            <Lock className="w-4 h-4 inline-block mr-1" />
            This thread is locked — no new replies.
          </div>
        ) : (
          user?.id ? (
            <ReplyForm thread={thread} />
          ) : (
            <div
              className="rounded-lg border px-4 py-3 text-sm text-center"
              style={{ backgroundColor: CREAM.card, borderColor: CREAM.cardBorder, color: CREAM.textMuted }}
            >
              Sign in to reply.
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Post({ author, body, date, isDev, isSolution, isOP, likes, liked, onLike, stats }) {
  return (
    <article
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: CREAM.card,
        borderColor: isDev ? CREAM.devBadge : CREAM.cardBorder,
        borderLeftWidth: isDev ? 4 : 1,
        borderLeftColor: isDev ? CREAM.devBadge : CREAM.cardBorder,
      }}
    >
      <div className="flex items-start gap-3 p-4">
        {author?.avatar_url ? (
          <img src={author.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover object-top flex-shrink-0" />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: CREAM.gradEnd, color: CREAM.textPrimary }}
          >
            {(author?.username || author?.full_name || "?")[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black" style={{ color: CREAM.textPrimary }}>
              {author?.username || author?.full_name || "Anonymous"}
            </p>
            {isDev && (
              <span className="text-[9px] font-black uppercase tracking-widest rounded px-1.5 py-0.5"
                style={{ backgroundColor: CREAM.devBadge, color: "#0b1220" }}>
                Guildstew Team
              </span>
            )}
            {isOP && (
              <span className="text-[9px] font-black uppercase tracking-widest rounded px-1.5 py-0.5 border"
                style={{ borderColor: CREAM.cardBorder, color: CREAM.textMuted }}>
                OP
              </span>
            )}
            {isSolution && (
              <span className="text-[9px] font-black uppercase tracking-widest rounded px-1.5 py-0.5 inline-flex items-center gap-0.5"
                style={{ backgroundColor: "#4ADE80", color: "#052e16" }}>
                <Check className="w-3 h-3" /> Solution
              </span>
            )}
          </div>
          <p className="text-[11px]" style={{ color: CREAM.textMuted }}>
            {date ? new Date(date).toLocaleString() : ""}
            {stats && (
              <> · <MessageCircle className="w-3 h-3 inline-block" /> {stats.replies || 0} · <Eye className="w-3 h-3 inline-block" /> {stats.views || 0}</>
            )}
          </p>
        </div>
      </div>
      <div className="px-4 pb-4">
        <article
          className="text-sm leading-relaxed"
          style={{ color: CREAM.textPrimary }}
          dangerouslySetInnerHTML={{ __html: renderBlogMarkdown(body || "") }}
        />
        {onLike !== undefined && !isOP && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: CREAM.cardBorder }}>
            <button
              type="button"
              onClick={onLike || undefined}
              disabled={!onLike}
              className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border transition-colors disabled:opacity-60"
              style={{
                backgroundColor: liked ? CREAM.accent : CREAM.card,
                borderColor: liked ? CREAM.accent : CREAM.cardBorder,
                color: liked ? "#FFF8F3" : CREAM.textPrimary,
              }}
            >
              <Heart className={`w-3 h-3 ${liked ? "fill-current" : ""}`} />
              {likes || 0}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM.pageBg, color: CREAM.textPrimary }}>
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-black">Thread not found</h1>
        <Link to="/forums" className="inline-flex items-center gap-1 mt-4 text-sm" style={{ color: CREAM.accent }}>
          <ArrowLeft className="w-4 h-4" /> Back to Forums
        </Link>
      </div>
    </div>
  );
}
