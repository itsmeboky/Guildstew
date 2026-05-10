import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Sparkles, MessageSquare } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Community Highlights — recent profile posts from the current
 * user's accepted friends. Replaces the previous "Top Selling
 * Game Packs" widget at the home page bottom row.
 *
 * Data:
 *   - friends     : `friends` table, accepted friendships only
 *   - posts       : `posts` table filtered by author_id IN friend-ids
 *   - profiles    : `user_profiles` for avatar + username lookup
 *
 * Both data sources existed before this widget — no new tables.
 *
 * Click a post → opens the author's profile.
 */
export default function CommunityHighlightsCard({ user }) {
  // 1) friend ids the current user has accepted relationships with.
  //    Friendship is bidirectional in the schema (rows can list the
  //    user as either user_id or friend_id), so we union both sides.
  const { data: friendIds = [], isLoading: friendsLoading } = useQuery({
    queryKey: ["communityHighlights:friendIds", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("friends")
        .select("user_id, friend_id, status")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");
      if (error) throw error;
      const ids = new Set();
      for (const row of data || []) {
        if (row.user_id && row.user_id !== user.id) ids.add(row.user_id);
        if (row.friend_id && row.friend_id !== user.id) ids.add(row.friend_id);
      }
      return Array.from(ids);
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // 2) recent posts authored by those friends (their profile-wall
  //    posts). UserProfile / YourProfile both filter by
  //    profile_user_id; for highlights we want what FRIENDS authored
  //    on any wall, so we filter by author_id.
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["communityHighlights:posts", friendIds.join(",")],
    queryFn: async () => {
      if (friendIds.length === 0) return [];
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .in("author_id", friendIds)
        .order("created_date", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    enabled: friendIds.length > 0,
    staleTime: 30_000,
  });

  // 3) profiles for avatar + username lookup. Scope to just the
  //    authors we're rendering — no over-fetch.
  const authorIds = useMemo(
    () => Array.from(new Set(posts.map((p) => p.author_id).filter(Boolean))),
    [posts],
  );
  const { data: profiles = [] } = useQuery({
    queryKey: ["communityHighlights:profiles", authorIds.join(",")],
    queryFn: async () => {
      if (authorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", authorIds);
      if (error) throw error;
      return data || [];
    },
    enabled: authorIds.length > 0,
    staleTime: 60_000,
  });
  const profileById = useMemo(() => {
    const m = new Map();
    for (const p of profiles) m.set(p.user_id, p);
    return m;
  }, [profiles]);

  const loading = friendsLoading || (friendIds.length > 0 && postsLoading);
  const hasFriends = friendIds.length > 0;
  const hasPosts = posts.length > 0;

  return (
    <div className="col-span-5 rounded-3xl p-5 h-[320px] relative overflow-hidden">
      <div className="theme-homepage-card absolute inset-0" />
      <div className="relative z-10 h-full flex flex-col">
        <h3 className="text-xl font-bold text-white mb-3 text-center flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          Community Highlights
        </h3>

        {loading ? (
          <CommunityHighlightsSkeleton />
        ) : !hasFriends ? (
          <EmptyState
            line="No recent posts from your friends yet"
            cta="Invite some adventurers!"
            ctaTo={createPageUrl("Friends")}
          />
        ) : !hasPosts ? (
          <EmptyState
            line="Your friends haven't posted recently"
            cta="Browse the community"
            ctaTo={createPageUrl("Friends")}
          />
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {posts.map((post) => {
              const author = profileById.get(post.author_id);
              const username = author?.username || "Adventurer";
              return (
                <Link
                  key={post.id}
                  to={createPageUrl("UserProfile") + `?id=${post.author_id}`}
                  className="block bg-white/95 hover:bg-white rounded-xl px-3 py-2 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 border border-slate-300">
                      {author?.avatar_url ? (
                        <img
                          src={author.avatar_url}
                          alt=""
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                          {username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate group-hover:text-[#FF5722]">
                          {username}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatRelativeTime(post.created_date)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-snug line-clamp-2 mt-0.5">
                        {post.content || <span className="italic text-slate-400">(no content)</span>}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ line, cta, ctaTo }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
      <MessageSquare className="w-8 h-8 text-white/40 mb-2" />
      <p className="text-white/80 text-sm mb-2">{line}</p>
      {ctaTo ? (
        <Link
          to={ctaTo}
          className="text-xs font-bold text-yellow-300 hover:text-yellow-200 underline"
        >
          {cta}
        </Link>
      ) : (
        <p className="text-xs text-white/60">{cta}</p>
      )}
    </div>
  );
}

function CommunityHighlightsSkeleton() {
  return (
    <div className="flex-1 space-y-2 pr-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white/80 rounded-xl px-3 py-2 flex items-start gap-2">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * "5m ago" / "3h ago" / "2d ago" / "Mar 4" formatting. Anything
 * older than ~7 days falls back to a short date so the relative
 * label doesn't drift into "47 days ago" silliness.
 */
function formatRelativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  const diff = Date.now() - then.getTime();
  if (Number.isNaN(diff)) return "";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
