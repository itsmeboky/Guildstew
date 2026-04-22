import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { addSpice, spendSpice, spendGuildSpice } from "@/lib/spiceWallet";
import { applyDiscount, calculateCreatorEarning, UPLOAD_FEES } from "@/config/spiceConfig";

/**
 * Tavern client — list / purchase / upload / rate helpers.
 *
 * The purchase path is where the Spice splits land:
 *   1. debit the buyer's personal (or guild) Spice wallet,
 *   2. credit the creator's wallet at the creator-tier split,
 *   3. write a `tavern_purchases` row (UNIQUE on user_id + item_id so
 *      the DB itself blocks double-buys), and
 *   4. bump the item's `purchase_count`.
 *
 * Upload inserts a row and separately debits the creator's upload fee
 * if their tier has one.
 */

export async function listTavernItems({ category = "all", sort = "popular", q = "", priceMin = 0, priceMax = null } = {}) {
  let query = supabase
    .from("tavern_items")
    .select("*")
    .eq("status", "active");

  if (category && category !== "all") query = query.eq("category", category);
  if (priceMin) query = query.gte("price", priceMin);
  if (priceMax != null) query = query.lte("price", priceMax);
  if (q && q.trim()) query = query.ilike("name", `%${q.trim()}%`);

  switch (sort) {
    case "newest":     query = query.order("created_at", { ascending: false }); break;
    case "price_asc":  query = query.order("price", { ascending: true }); break;
    case "price_desc": query = query.order("price", { ascending: false }); break;
    case "rating":     query = query.order("rating_sum", { ascending: false }); break;
    case "popular":
    default:           query = query.order("purchase_count", { ascending: false }); break;
  }

  const { data } = await query;
  return data || [];
}

export async function getItem(itemId) {
  if (!itemId) return null;
  const { data } = await supabase
    .from("tavern_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  return data;
}

export async function getUserPurchases(userId) {
  if (!userId) return [];
  const { data } = await supabase
    .from("tavern_purchases")
    .select("item_id, guild_id, purchased_at, price_paid")
    .eq("user_id", userId);
  return data || [];
}

/**
 * Does `userId` own `itemId` — either via a personal purchase or via
 * a guild purchase where the user's current guild matches? Call sites
 * pass the user's current guild id so a player who left a guild
 * loses access even though the purchase row still exists.
 */
export async function userOwnsItem(userId, itemId, { guildId = null } = {}) {
  if (!userId || !itemId) return false;

  const { data: personal } = await supabase
    .from("tavern_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (personal) return true;

  if (!guildId) return false;

  const { data: guildPurchase } = await supabase
    .from("tavern_purchases")
    .select("id")
    .eq("guild_id", guildId)
    .eq("item_id", itemId)
    .maybeSingle();
  return !!guildPurchase;
}

export async function purchaseItem({ item, buyerUserId, buyerTier, guildId = null }) {
  if (!item || !buyerUserId) return { success: false, reason: "invalid" };

  const discounted = applyDiscount(item.price, buyerTier);

  let debit;
  if (guildId) {
    debit = await spendGuildSpice(guildId, discounted, `Guild purchase: ${item.name}`);
  } else {
    debit = await spendSpice(buyerUserId, discounted, "item_purchase", `Purchased ${item.name}`, item.id);
  }
  if (!debit?.success) return { success: false, reason: debit?.reason || "spend_failed" };

  // Credit the creator. Official (Guildstew) items skip the split so
  // 100% stays with the platform; everyone else uses the split they
  // locked in at listing time via `creator_tier`.
  if (!item.is_official) {
    const earning = calculateCreatorEarning(discounted, item.creator_tier);
    if (earning > 0) {
      await addSpice(
        item.creator_id,
        earning,
        "sale_earning",
        `Sale: ${item.name}`,
        item.id,
      ).catch(() => { /* non-fatal — sale still counts */ });
    }
  }

  // Record ownership. If the DB rejects (duplicate row from a
  // double-click), we've already debited but the user already owns
  // it — just return success.
  const { error: purchaseErr } = await supabase.from("tavern_purchases").insert({
    user_id: buyerUserId,
    guild_id: guildId,
    item_id: item.id,
    price_paid: discounted,
  });

  if (purchaseErr && !/duplicate|unique/i.test(purchaseErr.message || "")) {
    throw purchaseErr;
  }

  // Best-effort purchase_count bump (analytics only).
  await supabase
    .from("tavern_items")
    .update({ purchase_count: (item.purchase_count || 0) + 1 })
    .eq("id", item.id)
    .catch(() => {});

  return { success: true, pricePaid: discounted };
}

export async function uploadItem({ creatorId, creatorTier, form }) {
  if (!creatorId) return { success: false, reason: "invalid" };

  const uploadFee = UPLOAD_FEES[creatorTier] ?? UPLOAD_FEES.free;

  if (uploadFee > 0) {
    const debit = await spendSpice(
      creatorId,
      uploadFee,
      "upload_fee",
      `Upload fee: ${form.name}`,
    );
    if (!debit?.success) return { success: false, reason: debit?.reason || "insufficient_fee" };
  }

  const { data, error } = await supabase
    .from("tavern_items")
    .insert({
      creator_id: creatorId,
      creator_tier: creatorTier,
      name: form.name,
      description: form.description || "",
      category: form.category,
      tags: form.tags || [],
      price: form.price,
      preview_image_url: form.preview_image_url || null,
      preview_images: form.preview_images || [],
      file_url: form.file_url || null,
      file_data: form.file_data || {},
      status: "active",
    })
    .select()
    .maybeSingle();

  if (error) {
    // Refund the fee — don't punish the creator for a DB failure.
    if (uploadFee > 0) {
      await addSpice(creatorId, uploadFee, "refund", "Refund: failed listing upload").catch(() => {});
    }
    toast.error("Failed to list item.");
    return { success: false, reason: error.message };
  }

  // Auto-own the listing. Creators shouldn't have to buy their own
  // work to preview or apply it — a zero-price purchase row keeps
  // them in the My Collection / ownership queries that are already
  // keyed off tavern_purchases. Non-fatal: if this fails, the
  // entitlements helper has a creator_id backstop that recovers it.
  if (data?.id) {
    await supabase.from("tavern_purchases").insert({
      user_id: creatorId,
      guild_id: null,
      item_id: data.id,
      price_paid: 0,
    }).then(({ error: purchaseErr }) => {
      if (purchaseErr && !/duplicate|unique/i.test(purchaseErr.message || "")) {
        console.error("Creator self-grant", purchaseErr);
      }
    });
  }

  return { success: true, item: data };
}

export async function rateItem({ userId, itemId, rating, review = "" }) {
  if (!userId || !itemId || !rating) return { success: false };
  // Upsert so users can change their mind. Rating sum/count are
  // recomputed from scratch so edits don't double-count.
  const { error } = await supabase.from("tavern_ratings").upsert(
    { user_id: userId, item_id: itemId, rating, review },
    { onConflict: "user_id,item_id" },
  );
  if (error) return { success: false, reason: error.message };

  const { data: ratings } = await supabase
    .from("tavern_ratings")
    .select("rating")
    .eq("item_id", itemId);
  const sum = (ratings || []).reduce((a, r) => a + r.rating, 0);
  const count = (ratings || []).length;
  await supabase
    .from("tavern_items")
    .update({ rating_sum: sum, rating_count: count })
    .eq("id", itemId);

  return { success: true };
}

export async function getItemRatings(itemId) {
  if (!itemId) return [];
  const { data } = await supabase
    .from("tavern_ratings")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });
  return data || [];
}
