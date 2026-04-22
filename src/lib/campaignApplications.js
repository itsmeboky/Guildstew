import { supabase } from "@/api/supabaseClient";
import { listCampaignBans } from "@/lib/campaignBans";

/**
 * Campaign application + approval pipeline client.
 *
 * One module owns every write path — submit, resubmit, accept,
 * reject character, reject player — so the state machine stays
 * consistent. Status values:
 *
 *   pending              (default, waiting on GM)
 *   accepted             (GM approved; player added to campaign)
 *   rejected_character   (GM wants the player but asked for a
 *                         different character — player can resubmit)
 *   rejected_player      (GM declined outright; terminal)
 *   auto_closed          (3 resubmissions exhausted; terminal)
 *
 * Schema note: the table carries BOTH `applicant_id` (legacy) and
 * `user_id` (new canonical). Every write path sets both so reads
 * that still filter on applicant_id keep working; reads prefer
 * user_id.
 */

export const MAX_SUBMISSIONS = 3;

/**
 * Run the campaign's active bans against a character and return the
 * list of violations. Matches the spec contract exactly.
 *
 *   const { valid, violations } = await validateCharacterForCampaign(
 *     character,
 *     campaignId,
 *   );
 */
export async function validateCharacterForCampaign(character, campaignId) {
  if (!character || !campaignId) return { valid: true, violations: [] };
  const bans = await listCampaignBans(campaignId);
  if (!bans || bans.length === 0) return { valid: true, violations: [] };

  const violations = [];
  const lc = (v) => (v == null ? "" : String(v).toLowerCase());

  for (const ban of bans) {
    const banned = lc(ban.banned_name);
    const hit = (type, name) =>
      violations.push({ type, name: ban.banned_name, reason: ban.reason });

    switch (ban.ban_type) {
      case "race":
        if (lc(character.race) === banned) hit("race", ban.banned_name);
        break;
      case "class":
        if (lc(character.class) === banned) hit("class", ban.banned_name);
        break;
      case "subclass":
        if (lc(character.subclass) === banned) hit("subclass", ban.banned_name);
        break;
      case "spell": {
        const list = Array.isArray(character.spells) ? character.spells : [];
        if (list.some((s) => lc(s?.name ?? s) === banned)) hit("spell", ban.banned_name);
        break;
      }
      case "feature": {
        const list = Array.isArray(character.features) ? character.features : [];
        if (list.some((f) => lc(f?.name ?? f) === banned)) hit("feature", ban.banned_name);
        break;
      }
      case "item": {
        const list = Array.isArray(character.equipment)
          ? character.equipment
          : Array.isArray(character.inventory)
            ? character.inventory
            : [];
        if (list.some((i) => lc(i?.name ?? i) === banned)) hit("item", ban.banned_name);
        break;
      }
      default:
        break;
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Does this campaign have any installed Brewery mods? The preview
 * screen + character picker key off this to decide which flow to
 * show the applicant.
 */
export async function isCampaignModded(campaignId) {
  if (!campaignId) return { modded: false, mods: [] };
  const { data, error } = await supabase
    .from("campaign_installed_mods")
    .select("id, mod_id, mod_type, mod_name, mod_version")
    .eq("campaign_id", campaignId);
  if (error) {
    console.warn("isCampaignModded", error.message);
    return { modded: false, mods: [] };
  }
  return { modded: (data || []).length > 0, mods: data || [] };
}

/**
 * Fetch an existing application for (campaignId, userId) or null.
 * Preferred lookup column is user_id; falls back to applicant_id for
 * legacy rows written before the schema was expanded.
 */
export async function getMyApplication(campaignId, userId) {
  if (!campaignId || !userId) return null;
  const q = await supabase
    .from("campaign_applications")
    .select("*")
    .eq("campaign_id", campaignId)
    .or(`user_id.eq.${userId},applicant_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (q.error) {
    console.error("getMyApplication", q.error);
    return null;
  }
  return q.data;
}

/**
 * Submit (or resubmit) an application. Handles both paths via an
 * upsert keyed on (campaign_id, user_id) — if a pending / rejected
 * row already exists we increment submission_count and reset the
 * status to 'pending'.
 */
export async function submitApplication({
  campaignId,
  userId,
  characterId,
  message = null,
  isModded = false,
}) {
  if (!campaignId || !userId) throw new Error("Sign in and pick a campaign first.");
  if (!characterId) throw new Error("Select a character before submitting.");

  const existing = await getMyApplication(campaignId, userId);
  if (existing?.status === "auto_closed") {
    throw new Error("This application has been closed after multiple rejections.");
  }

  const nextCount = Number(existing?.submission_count || 0) + 1;

  const payload = {
    campaign_id: campaignId,
    user_id: userId,
    applicant_id: userId, // legacy column — keep writing for back-compat
    character_id: characterId,
    message: message?.trim() || null,
    status: "pending",
    is_modded_campaign: isModded,
    ban_violations: [],
    submission_count: nextCount,
    updated_at: new Date().toISOString(),
  };

  // Prefer UPDATE when we know the row id; falls back to insert for
  // first-time submissions.
  if (existing?.id) {
    const { error } = await supabase
      .from("campaign_applications")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
    return { ...existing, ...payload };
  }

  const { data, error } = await supabase
    .from("campaign_applications")
    .insert(payload)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listPendingApplications(campaignId) {
  if (!campaignId) return [];
  const { data, error } = await supabase
    .from("campaign_applications")
    .select("*")
    .eq("campaign_id", campaignId)
    .in("status", ["pending", "rejected_character"])
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listPendingApplications", error);
    return [];
  }
  return data || [];
}

/**
 * GM accepts: add the player to campaigns.player_ids, stamp the app
 * accepted, stash the character id on the app row for the review
 * surface's history.
 */
export async function acceptApplication({ application }) {
  if (!application?.id) throw new Error("No application selected.");
  const playerId = application.user_id || application.applicant_id;

  // Read the live player_ids so we don't clobber a concurrent write.
  const { data: camp, error: readErr } = await supabase
    .from("campaigns")
    .select("player_ids, max_players")
    .eq("id", application.campaign_id)
    .maybeSingle();
  if (readErr) throw readErr;

  const ids = Array.isArray(camp?.player_ids) ? camp.player_ids : [];
  const cap = Math.min(Number(camp?.max_players) || 6, 8);
  if (!ids.includes(playerId)) {
    if (ids.length >= cap) throw new Error("Campaign is full.");
    const { error } = await supabase
      .from("campaigns")
      .update({ player_ids: [...ids, playerId] })
      .eq("id", application.campaign_id);
    if (error) throw error;
  }

  const { error: updErr } = await supabase
    .from("campaign_applications")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", application.id);
  if (updErr) throw updErr;

  // Associate the presented character with this campaign so the
  // standard GM panel sees it in its character list.
  if (application.character_id) {
    await supabase
      .from("characters")
      .update({ campaign_id: application.campaign_id })
      .eq("id", application.character_id)
      .catch(() => { /* non-fatal */ });
  }
}

export async function rejectCharacter({ application, gmMessage }) {
  if (!application?.id) throw new Error("No application selected.");
  if (!gmMessage?.trim()) throw new Error("Tell the player what to change.");
  if ((application.submission_count || 0) >= MAX_SUBMISSIONS) {
    const { error } = await supabase
      .from("campaign_applications")
      .update({
        status: "auto_closed",
        gm_message: gmMessage.trim(),
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id);
    if (error) throw error;
    return "auto_closed";
  }
  const { error } = await supabase
    .from("campaign_applications")
    .update({
      status: "rejected_character",
      gm_message: gmMessage.trim(),
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", application.id);
  if (error) throw error;
  return "rejected_character";
}

export async function rejectPlayer({ application, reason = null }) {
  if (!application?.id) throw new Error("No application selected.");
  const { error } = await supabase
    .from("campaign_applications")
    .update({
      status: "rejected_player",
      gm_message: reason?.trim() || null,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", application.id);
  if (error) throw error;
}
