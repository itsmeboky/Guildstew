import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import * as Icons from "lucide-react";
import {
  ArrowLeft, Plus, Pin, Lock, MessageCircle, Eye, ChevronLeft, ChevronRight,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import {
  getCategoryBySlug, listThreadsInCategory, isAdminEmail,
} from "@/lib/forumsClient";
import { useAuth } from "@/lib/AuthContext";
import { CREAM } from "@/pages/Forums";
import NewThreadDialog from "@/components/forums/NewThreadDialog";

/**
 * Category view.
 *
 * Pinned threads float to the top, then latest activity. Author name
 * + avatar are resolved in one batch via user_profiles. Paginated
 * 20 rows at a time. `is_dev_only` categories restrict the New
 * Thread button to admins.
 */
export default function ForumCategory() {
  const { categorySlug } = useParams();
  const { user } = useAuth();
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const PAGE_SIZE = 20;

  const { data: category } = useQuery({
    queryKey: ["forumCategory", categorySlug],
    queryFn: () => getCategoryBySlug(categorySlug),
  });

  const { data: threadPage = { rows: [], count: 0 } } = useQuery({
    queryKey: ["forumThreads", category?.id, sort, page],
    queryFn: () => listThreadsInCategory(category.id, {
      sort, limit: PAGE_SIZE, offset: page * PAGE_SIZE,
    }),
    enabled: !!category?.id,
  });

  const authorIds = useMemo(
    () => Array.from(new Set((threadPage.rows || []).map((t) => t.author_id).filter(Boolean))),
    [threadPage.rows],
  );

  const { data: authors = [] } = useQuery({
    queryKey: ["forumThreadAuthors", authorIds.sort().join(",")],
    queryFn: async () => {
      if (authorIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username, full_name, avatar_url")
        .in("user_id", authorIds);
      return data || [];
    },
    enabled: authorIds.length > 0,
  });

  const authorOf = (id) => authors.find((a) => a.user_id === id) || null;

  const canPost = !!user?.id && (!category?.is_dev_only || isAdminEmail(user?.email));
  const totalPages = Math.max(1, Math.ceil((threadPage.count || 0) / PAGE_SIZE));

  if (!category) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: CREAM.pageBg, color: CREAM.textPrimary }}>
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-black">Category not found</h1>
          <Link to="/forums" className="inline-flex items-center gap-1 mt-4 text-sm" style={{ color: CREAM.accent }}>
            <ArrowLeft className="w-4 h-4" /> Back to Forums
          </Link>
        </div>
      </div>
    );
  }

  const Icon = Icons[category.icon] || MessageCircle;

  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM.pageBg }}>
      <div
        className="w-full px-6 py-8"
        style={{ background: `linear-gradient(135deg, ${CREAM.gradStart} 0%, ${CREAM.gradEnd} 100%)` }}
      >
        <div className="max-w-5xl mx-auto">
          <Link to="/forums" className="inline-flex items-center gap-1 text-xs mb-3" style={{ color: CREAM.textPrimary, opacity: 0.7 }}>
            <ArrowLeft className="w-3.5 h-3.5" /> All Forums
          </Link>
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: CREAM.card, color: CREAM.textPrimary }}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black" style={{ color: CREAM.textPrimary, fontFamily: "'Cream', 'Inter', sans-serif" }}>
                {category.name}
                {category.is_dev_only && (
                  <span className="ml-2 text-[10px] font-black uppercase tracking-widest rounded px-2 py-0.5 align-middle"
                    style={{ backgroundColor: CREAM.devBadge, color: "#0b1220" }}>
                    DEV-ONLY
                  </span>
                )}
              </h1>
              {category.description && (
                <p className="text-sm mt-1" style={{ color: CREAM.textPrimary, opacity: 0.85 }}>
                  {category.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1">
            {[
              { value: "latest", label: "Latest Activity" },
              { value: "newest", label: "Newest" },
              { value: "replies", label: "Most Replies" },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => { setSort(s.value); setPage(0); }}
                className="text-xs font-bold px-3 py-1.5 rounded-full border transition-colors"
                style={{
                  backgroundColor: sort === s.value ? CREAM.button : CREAM.card,
                  borderColor: CREAM.cardBorder,
                  color: CREAM.textPrimary,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {canPost && (
            <button
              onClick={() => setNewOpen(true)}
              className="inline-flex items-center gap-1 text-sm font-black px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: CREAM.accent, color: "#FFF8F3" }}
            >
              <Plus className="w-4 h-4" /> New Thread
            </button>
          )}
        </div>

        {threadPage.rows.length === 0 ? (
          <p className="text-center py-20 italic" style={{ color: CREAM.textMuted }}>
            No threads yet — be the first to post.
          </p>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: CREAM.cardBorder, backgroundColor: CREAM.card }}>
            {threadPage.rows.map((t, i) => {
              const author = authorOf(t.author_id);
              return (
                <Link
                  to={`/forums/${category.slug}/${t.slug}`}
                  key={t.id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-[#FFF3E8] transition-colors ${
                    i > 0 ? "border-t" : ""
                  }`}
                  style={{ borderColor: CREAM.cardBorder }}
                >
                  {author?.avatar_url ? (
                    <img src={author.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover object-top flex-shrink-0" />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: CREAM.gradEnd, color: CREAM.textPrimary }}
                    >
                      {(author?.username || "?")[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {t.is_pinned && <Pin className="w-3.5 h-3.5" style={{ color: CREAM.accent }} />}
                      {t.is_locked && <Lock className="w-3.5 h-3.5" style={{ color: CREAM.textMuted }} />}
                      <h3 className="font-bold truncate" style={{ color: CREAM.textPrimary }}>{t.title}</h3>
                      {t.is_dev_post && (
                        <span className="text-[9px] font-black uppercase tracking-widest rounded px-1.5 py-0.5"
                          style={{ backgroundColor: CREAM.devBadge, color: "#0b1220" }}>
                          DEV
                        </span>
                      )}
                    </div>
                    <p className="text-[11px]" style={{ color: CREAM.textMuted }}>
                      by <span className="font-semibold">{author?.username || author?.full_name || "Anonymous"}</span>
                      {" · "}
                      {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right hidden sm:block" style={{ color: CREAM.textMuted }}>
                    <p className="text-xs inline-flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {t.reply_count || 0}
                    </p>
                    <p className="text-[10px] inline-flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {t.view_count || 0}
                    </p>
                  </div>
                  <div className="text-right text-[10px] hidden md:block" style={{ color: CREAM.textMuted }}>
                    {t.last_reply_at ? (
                      <>
                        <p>Last reply</p>
                        <p className="font-semibold">{new Date(t.last_reply_at).toLocaleDateString()}</p>
                      </>
                    ) : (
                      <p>No replies</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2" style={{ color: CREAM.textPrimary }}>
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border disabled:opacity-50"
              style={{ backgroundColor: CREAM.card, borderColor: CREAM.cardBorder }}
            >
              <ChevronLeft className="w-3 h-3" /> Prev
            </button>
            <span className="text-xs" style={{ color: CREAM.textMuted }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border disabled:opacity-50"
              style={{ backgroundColor: CREAM.card, borderColor: CREAM.cardBorder }}
            >
              Next <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <NewThreadDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        category={category}
      />
    </div>
  );
}
