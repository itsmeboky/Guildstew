import { supabase } from "@/api/supabaseClient";
import { TIERS } from "@/api/billingClient";
import { toast } from "sonner";

/**
 * Campaign lifecycle helpers — archive, unarchive, delete, and the
 * tier-limit / quota checks that gate them. Every mutation bumps the
 * correct user_profiles counters so admin + the campaign list stay in
 * sync without a full refetch.
 */

async function fetchProfile(userId) {
  const { data } = await supabase
    .from("user_profiles")
    .select("archived_campaign_count, max_archived_campaigns, storage_used_bytes, storage_limit_bytes, storage_limit_override_bytes")
    .eq("user_id", userId)
    .single();
  return data || null;
}

export function archivedCampaignLimit(profile, tier) {
  const tierData = TIERS[tier] || TIERS.free;
  return profile?.max_archived_campaigns || tierData.limits.maxArchivedCampaigns || 2;
}

export function activeCampaignLimit(tier) {
  const tierData = TIERS[tier] || TIERS.free;
  return tierData.limits.maxActiveCampaigns;
}

/**
 * Archive a campaign. Enforces the tier archive limit and bumps
 * `user_profiles.archived_campaign_count`. Returns { ok, reason? }.
 */
export async function archiveCampaign({ campaignId, userId, tier }) {
  const profile = await fetchProfile(userId);
  const limit = archivedCampaignLimit(profile, tier);
  const current = profile?.archived_campaign_count || 0;
  if (current >= limit) {
    return {
      ok: false,
      reason: `You've reached your archive limit (${limit}). Delete an archived campaign or upgrade to free a slot.`,
    };
  }

  const { error: upErr } = await supabase
    .from("campaigns")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (upErr) return { ok: false, reason: upErr.message };

  await supabase
    .from("user_profiles")
    .update({ archived_campaign_count: current + 1 })
    .eq("user_id", userId);

  return { ok: true };
}

/**
 * Restore an archived campaign. Decrements the archive counter.
 */
export async function unarchiveCampaign({ campaignId, userId }) {
  const { error: upErr } = await supabase
    .from("campaigns")
    .update({ status: "active", archived_at: null })
    .eq("id", campaignId);
  if (upErr) return { ok: false, reason: upErr.message };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("archived_campaign_count")
    .eq("user_id", userId)
    .single();
  await supabase
    .from("user_profiles")
    .update({ archived_campaign_count: Math.max(0, (profile?.archived_campaign_count || 1) - 1) })
    .eq("user_id", userId);

  return { ok: true };
}

/**
 * Hard-delete a campaign. Cascades through every campaign-scoped
 * table, detaches (does NOT delete) characters so players keep them,
 * removes storage files under
 *   user-assets/users/{gmId}/campaigns/{campaignId}/…
 * and decrements the GM's storage counter by the campaign's tracked
 * usage. If `wasArchived` is true, decrements the archive counter too.
 */
export async function deleteCampaign({ campaignId, gmUserId, wasArchived }) {
  // Cascade campaign-scoped tables. Order isn't strictly required —
  // Supabase FKs we use are not enforced — but we run them in parallel
  // so the delete still completes quickly even for large campaigns.
  const tables = [
    "world_lore_entries",
    "monsters",
    "campaign_items",
    "spells",
    "campaign_class_features",
    "campaign_conditions",
    "campaign_npcs",
    "campaign_maps",
    "campaign_log_entries",
    "campaign_updates",
    "campaign_homebrew",
    "campaign_invitations",
  ];
  await Promise.all(
    tables.map((t) =>
      supabase.from(t).delete().eq("campaign_id", campaignId).then(() => null).catch(() => null),
    ),
  );

  // Detach characters so players keep them.
  await supabase
    .from("characters")
    .update({ campaign_id: null, active_session_id: null })
    .eq("campaign_id", campaignId);

  // Remove storage objects under the campaign folder.
  const basePath = `users/${gmUserId}/campaigns/${campaignId}`;
  const subfolders = [
    "world-lore",
    "homebrew/monsters",
    "homebrew/items",
    "homebrew/spells",
    "maps",
    "session-docs",
    "sketches",
  ];
  for (const sub of subfolders) {
    try {
      const { data: files } = await supabase.storage
        .from("user-assets")
        .list(`${basePath}/${sub}`, { limit: 1000 });
      if (files?.length) {
        const paths = files.map((f) => `${basePath}/${sub}/${f.name}`);
        await supabase.storage.from("user-assets").remove(paths);
      }
    } catch (err) {
      console.warn(`storage cleanup failed for ${sub}:`, err?.message || err);
    }
  }

  // Reclaim the campaign's tracked storage against the GM's quota.
  try {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("storage_used_bytes")
      .eq("id", campaignId)
      .single();
    if (campaign?.storage_used_bytes) {
      await supabase.rpc("increment_user_storage", {
        p_user_id: gmUserId,
        p_bytes: -(campaign.storage_used_bytes || 0),
      });
    }
  } catch (err) {
    console.warn("storage counter reclaim failed:", err?.message || err);
  }

  if (wasArchived) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("archived_campaign_count")
      .eq("user_id", gmUserId)
      .single();
    await supabase
      .from("user_profiles")
      .update({ archived_campaign_count: Math.max(0, (profile?.archived_campaign_count || 1) - 1) })
      .eq("user_id", gmUserId);
  }

  const { error: delErr } = await supabase.from("campaigns").delete().eq("id", campaignId);
  if (delErr) return { ok: false, reason: delErr.message };
  return { ok: true };
}

/**
 * Bundle every campaign-scoped table into a JSON blob and trigger a
 * browser download. Characters are intentionally NOT included — they
 * return to the player's library instead.
 */
export async function exportCampaignData({ campaignId, campaignName }) {
  const [worldLore, monsters, items, spells, features, conditions, npcs, maps, logs] =
    await Promise.all([
      supabase.from("world_lore_entries").select("*").eq("campaign_id", campaignId),
      supabase.from("monsters").select("*").eq("campaign_id", campaignId),
      supabase.from("campaign_items").select("*").eq("campaign_id", campaignId),
      supabase.from("spells").select("*").eq("campaign_id", campaignId),
      supabase.from("campaign_class_features").select("*").eq("campaign_id", campaignId),
      supabase.from("campaign_conditions").select("*").eq("campaign_id", campaignId),
      supabase.from("campaign_npcs").select("*").eq("campaign_id", campaignId),
      supabase.from("campaign_maps").select("*").eq("campaign_id", campaignId),
      supabase.from("campaign_log_entries").select("*").eq("campaign_id", campaignId),
    ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    campaign_id: campaignId,
    campaign_name: campaignName || "",
    world_lore:        worldLore.data || [],
    homebrew_monsters: monsters.data  || [],
    homebrew_items:    items.data     || [],
    homebrew_spells:   spells.data    || [],
    homebrew_features: features.data  || [],
    custom_conditions: conditions.data || [],
    npcs:              npcs.data      || [],
    maps:              maps.data      || [],
    log_entries:       logs.data      || [],
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(campaignName || "campaign")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()}-export.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Before campaign creation — block GMs who've hit the active-campaign
 * cap. Returns { allowed, reason? }.
 */
export async function checkActiveCampaignLimit({ userId, tier }) {
  const max = activeCampaignLimit(tier);
  if (max === Infinity) return { allowed: true };

  const { count } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("game_master_id", userId)
    .neq("status", "archived");

  if ((count || 0) >= max) {
    return {
      allowed: false,
      reason: `You've reached your active campaign limit (${max}). Archive or delete a campaign, or upgrade your plan.`,
    };
  }
  return { allowed: true };
}

/**
 * Admin helper — override the user's personal storage limit. Pass
 * null to clear the override and fall back to the tier default.
 */
export async function setStorageOverride(userId, bytes) {
  const { error } = await supabase
    .from("user_profiles")
    .update({ storage_limit_override_bytes: bytes || null })
    .eq("user_id", userId);
  if (error) {
    toast.error(`Could not set override: ${error.message}`);
    return false;
  }
  toast.success(bytes ? "Storage limit override set." : "Storage override cleared — using tier default.");
  return true;
}

/**
 * Admin-only: hand-grant a subscription tier to a user. Pass `null`
 * to clear the override and fall back to whatever tier the user's
 * actual Stripe subscription (or lack thereof) resolves to. Valid
 * tier values: 'free' | 'adventurer' | 'veteran' | 'guild'. The
 * override is read by `getSubscriptionStatus` ahead of the normal
 * tier lookup so granted tiers take effect on the user's next
 * subscription-context refresh.
 */
export async function setTierOverride(userId, tier) {
  const normalized = tier || null;
  if (normalized && !["free", "adventurer", "veteran", "guild"].includes(normalized)) {
    toast.error("Invalid tier");
    return false;
  }
  const { error } = await supabase
    .from("user_profiles")
    .update({ admin_tier_override: normalized })
    .eq("user_id", userId);
  if (error) {
    toast.error(`Could not set tier: ${error.message}`);
    return false;
  }
  toast.success(
    normalized
      ? `Tier set to ${normalized}.`
      : "Tier override cleared — reverting to actual subscription.",
  );
  return true;
}
