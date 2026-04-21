import { supabase } from "@/api/supabaseClient";

/**
 * Forums client — categories, threads, replies, likes.
 *
 * All list queries sort by the indexes declared in the migration
 * (pinned then last_reply_at DESC for threads; created_at ASC for
 * replies). Writes are author-gated at the RLS layer; this file
 * just builds the SQL.
 */

export async function listCategories() {
  const { data } = await supabase
    .from("forum_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  return data || [];
}

export async function getCategoryBySlug(slug) {
  if (!slug) return null;
  const { data } = await supabase
    .from("forum_categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data || null;
}

export async function getCategoryStats(categoryIds = []) {
  if (!categoryIds.length) return [];
  const { data } = await supabase
    .from("forum_threads")
    .select("category_id, id, title, slug, last_reply_at, created_at, author_id")
    .in("category_id", categoryIds)
    .order("last_reply_at", { ascending: false, nullsFirst: false });
  return data || [];
}

export async function listThreadsInCategory(categoryId, { sort = "latest", limit = 20, offset = 0 } = {}) {
  if (!categoryId) return { rows: [], count: 0 };
  let query = supabase
    .from("forum_threads")
    .select("*", { count: "exact" })
    .eq("category_id", categoryId);

  switch (sort) {
    case "newest":
      query = query.order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
      break;
    case "replies":
      query = query.order("is_pinned", { ascending: false }).order("reply_count", { ascending: false });
      break;
    case "latest":
    default:
      query = query
        .order("is_pinned", { ascending: false })
        .order("last_reply_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      break;
  }

  const { data, count } = await query.range(offset, offset + limit - 1);
  return { rows: data || [], count: count || 0 };
}

export async function searchThreads(q, { limit = 20 } = {}) {
  const term = (q || "").trim();
  if (!term) return [];
  const { data } = await supabase
    .from("forum_threads")
    .select("id, category_id, title, slug, reply_count, last_reply_at, created_at, is_dev_post, is_pinned")
    .ilike("title", `%${term}%`)
    .order("last_reply_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  return data || [];
}

export async function getThread(categoryId, slug) {
  if (!categoryId || !slug) return null;
  const { data } = await supabase
    .from("forum_threads")
    .select("*")
    .eq("category_id", categoryId)
    .eq("slug", slug)
    .maybeSingle();
  return data || null;
}

export async function listReplies(threadId) {
  if (!threadId) return [];
  const { data } = await supabase
    .from("forum_replies")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  return data || [];
}

export async function createThread({ category_id, author_id, author_name, title, content, is_dev_post }) {
  const slug = slugify(title);
  const { data, error } = await supabase
    .from("forum_threads")
    .insert({
      category_id,
      author_id,
      title,
      slug,
      content,
      is_dev_post: !!is_dev_post,
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createReply({ thread_id, author_id, content, is_dev_reply }) {
  const { data: reply, error } = await supabase
    .from("forum_replies")
    .insert({
      thread_id,
      author_id,
      content,
      is_dev_reply: !!is_dev_reply,
    })
    .select()
    .maybeSingle();
  if (error) throw error;

  // Bump the thread's reply_count / last_reply_at so the category
  // list stays accurate without a trigger.
  const { data: thread } = await supabase
    .from("forum_threads")
    .select("reply_count")
    .eq("id", thread_id)
    .maybeSingle();
  await supabase
    .from("forum_threads")
    .update({
      reply_count: (thread?.reply_count || 0) + 1,
      last_reply_at: new Date().toISOString(),
      last_reply_by: author_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", thread_id);

  return reply;
}

export async function toggleLike(userId, replyId) {
  if (!userId || !replyId) return { liked: false };
  const { data: existing } = await supabase
    .from("forum_likes")
    .select("id")
    .eq("user_id", userId)
    .eq("reply_id", replyId)
    .maybeSingle();

  if (existing) {
    await supabase.from("forum_likes").delete().eq("id", existing.id);
    await bumpLikes(replyId, -1);
    return { liked: false };
  }
  await supabase.from("forum_likes").insert({ user_id: userId, reply_id: replyId });
  await bumpLikes(replyId, 1);
  return { liked: true };
}

async function bumpLikes(replyId, delta) {
  const { data } = await supabase
    .from("forum_replies")
    .select("likes_count")
    .eq("id", replyId)
    .maybeSingle();
  await supabase
    .from("forum_replies")
    .update({ likes_count: Math.max(0, (data?.likes_count || 0) + delta) })
    .eq("id", replyId);
}

export async function hasLiked(userId, replyIds = []) {
  if (!userId || !replyIds.length) return new Set();
  const { data } = await supabase
    .from("forum_likes")
    .select("reply_id")
    .eq("user_id", userId)
    .in("reply_id", replyIds);
  return new Set((data || []).map((r) => r.reply_id));
}

export function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "thread";
}

export function isAdminEmail(email) {
  const e = (email || "").toLowerCase();
  if (!e) return false;
  if (e === "itsmeboky@aetherianstudios.com") return true;
  return e.endsWith("@aetherianstudios.com") || e.endsWith("@guildstew.com");
}
