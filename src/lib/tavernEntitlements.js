import { supabase } from "@/api/supabaseClient";

/**
 * Tavern access helpers.
 *
 * Canonical answer to "does this user have access to this item right
 * now?". An item counts as accessible if:
 *
 *   1. the user has a personal `tavern_purchases` row for it, OR
 *   2. the user's *current* guild has a purchase row for it — and
 *      "current" is always the live `SubscriptionContext.guildOwnerId`.
 *      If the user leaves that guild, they lose access automatically
 *      because we filter by their current guild id, not by whatever
 *      guild was on the purchase row at buy time.
 *
 * All of the ownership UI across the app (Applied/Not Applied,
 * "Owned" badge, "Buy" vs "Already owned", etc.) should go through
 * these helpers instead of hand-rolling the guild filter, so the
 * "leaving a guild revokes guild purchases" rule is enforced in one
 * place.
 */

export async function listEntitlements(userId, { currentGuildId = null } = {}) {
  if (!userId) return [];

  // 1) personal purchases always count.
  const { data: personal = [] } = await supabase
    .from("tavern_purchases")
    .select("item_id, guild_id, purchased_at, price_paid")
    .eq("user_id", userId);

  const rows = (personal || []).map((p) => ({
    item_id: p.item_id,
    source: p.guild_id ? "guild" : "personal",
    guild_id: p.guild_id || null,
    purchased_at: p.purchased_at,
    price_paid: p.price_paid,
  }));

  // 2) anything any guild member bought for the current guild —
  // the buyer could be someone other than `userId`. We only surface
  // these while `userId` is still in the guild.
  if (currentGuildId) {
    const { data: guildBuys = [] } = await supabase
      .from("tavern_purchases")
      .select("item_id, guild_id, purchased_at, price_paid")
      .eq("guild_id", currentGuildId);

    const seen = new Set(rows.map((r) => r.item_id));
    for (const p of guildBuys || []) {
      if (seen.has(p.item_id)) continue;
      rows.push({
        item_id: p.item_id,
        source: "guild",
        guild_id: p.guild_id,
        purchased_at: p.purchased_at,
        price_paid: p.price_paid,
      });
      seen.add(p.item_id);
    }
  }

  // 3) creator backstop — anything this user uploaded counts as owned
  // even if the auto-grant purchase row never landed (legacy listings
  // from before the self-grant write, or RLS blocked the insert).
  const { data: mine = [] } = await supabase
    .from("tavern_items")
    .select("id, created_at")
    .eq("creator_id", userId);

  const seenIds = new Set(rows.map((r) => r.item_id));
  for (const it of mine || []) {
    if (seenIds.has(it.id)) continue;
    rows.push({
      item_id: it.id,
      source: "creator",
      guild_id: null,
      purchased_at: it.created_at,
      price_paid: 0,
    });
    seenIds.add(it.id);
  }

  return rows;
}

/**
 * Does `userId` currently have access to `itemId`?
 * Honors the "leaving a guild revokes access" rule: pass the user's
 * *current* guild id (not the one on the purchase row).
 */
export async function hasAccess(userId, itemId, { currentGuildId = null } = {}) {
  if (!userId || !itemId) return false;

  const { data: personal } = await supabase
    .from("tavern_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (personal) return true;

  // Creators always own their own listings.
  const { data: mine } = await supabase
    .from("tavern_items")
    .select("id")
    .eq("id", itemId)
    .eq("creator_id", userId)
    .maybeSingle();
  if (mine) return true;

  if (!currentGuildId) return false;

  const { data: guildPurchase } = await supabase
    .from("tavern_purchases")
    .select("id")
    .eq("guild_id", currentGuildId)
    .eq("item_id", itemId)
    .maybeSingle();

  return !!guildPurchase;
}

/**
 * Was `itemId` acquired via the guild (vs a personal purchase)? Used
 * by the UI to label "Guild-Owned" vs "Owned".
 */
export async function accessSource(userId, itemId, { currentGuildId = null } = {}) {
  if (!userId || !itemId) return null;

  const { data: personal } = await supabase
    .from("tavern_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (personal) return "personal";

  const { data: mine } = await supabase
    .from("tavern_items")
    .select("id")
    .eq("id", itemId)
    .eq("creator_id", userId)
    .maybeSingle();
  if (mine) return "creator";

  if (!currentGuildId) return null;

  const { data: guildPurchase } = await supabase
    .from("tavern_purchases")
    .select("id")
    .eq("guild_id", currentGuildId)
    .eq("item_id", itemId)
    .maybeSingle();

  return guildPurchase ? "guild" : null;
}
