/**
 * Test data seed — creates a complete fake campaign for combat testing.
 *
 * Usage (from the browser console while logged in as the GM account you
 * want to own the test campaign):
 *
 *   await seedTestCampaign()
 *
 * Or wipe the seed again:
 *
 *   await seedTestCampaign.cleanup()
 *
 * This does its best to create realistic-looking players + characters. If
 * Supabase RLS / FK constraints reject the fake user_profiles (because we
 * don't have service_role to create real auth users), we fall back to
 * creating only the campaign + characters so the GM can still test combat
 * via the Possess dialog and the monster queue.
 */

import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";

const SEED_TAG = "[SEED:guildstew-test]";

// Stable fake UUIDs so re-runs can find and clean up the same rows.
const FAKE_PLAYERS = [
  {
    user_id: "11111111-1111-4111-8111-111111111111",
    email: "lyra.test@guildstew.local",
    username: "lyra_test",
    profile_color_1: "#FF5722",
    profile_color_2: "#37F2D1",
    character: {
      name: "Lyra Moonwhisper",
      race: "Half-Elf",
      class: "Rogue",
      level: 5,
      attributes: { str: 10, dex: 18, con: 14, int: 13, wis: 12, cha: 15 },
      hit_points: { max: 38, current: 38, temporary: 0 },
      armor_class: 15,
      initiative: 4,
      speed: 30,
      proficiency_bonus: 3,
      passive_perception: 15,
      skills: { Stealth: true, Perception: true, Acrobatics: true, Deception: true },
      expertise: ["Stealth", "Perception"],
      saving_throws: { dex: true, int: true },
      equipment: {
        weapon1: { name: "Shortsword", damage: "1d6", category: "Melee", properties: ["Finesse", "Light"] },
        ranged: { name: "Shortbow", damage: "1d6", category: "Ranged", properties: ["Two-Handed"] },
      },
      profile_avatar_url:
        "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/lyra.png",
    },
  },
  {
    user_id: "22222222-2222-4222-8222-222222222222",
    email: "kaelen.test@guildstew.local",
    username: "kaelen_test",
    profile_color_1: "#8B5CF6",
    profile_color_2: "#22c5f5",
    character: {
      name: "Kaelen Stormborn",
      race: "Human",
      class: "Wizard",
      level: 5,
      attributes: { str: 8, dex: 14, con: 14, int: 18, wis: 13, cha: 11 },
      hit_points: { max: 30, current: 30, temporary: 0 },
      armor_class: 12,
      initiative: 2,
      speed: 30,
      proficiency_bonus: 3,
      passive_perception: 13,
      skills: { Arcana: true, Investigation: true, History: true, Insight: true },
      expertise: [],
      saving_throws: { int: true, wis: true },
      equipment: {
        weapon1: { name: "Quarterstaff", damage: "1d6", category: "Melee", properties: ["Versatile"] },
      },
      spells: [
        "Fire Bolt",
        "Mage Hand",
        "Shield",
        "Magic Missile",
        "Misty Step",
        "Scorching Ray",
        "Fireball",
        "Counterspell",
      ],
      profile_avatar_url:
        "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/kaelen.png",
    },
  },
  {
    user_id: "33333333-3333-4333-8333-333333333333",
    email: "thordak.test@guildstew.local",
    username: "thordak_test",
    profile_color_1: "#F59E0B",
    profile_color_2: "#DC2626",
    character: {
      name: "Thordak Ironhand",
      race: "Mountain Dwarf",
      class: "Fighter",
      level: 5,
      attributes: { str: 18, dex: 12, con: 16, int: 10, wis: 13, cha: 8 },
      hit_points: { max: 49, current: 49, temporary: 0 },
      armor_class: 18,
      initiative: 1,
      speed: 25,
      proficiency_bonus: 3,
      passive_perception: 11,
      skills: { Athletics: true, Intimidation: true, Survival: true },
      expertise: [],
      saving_throws: { str: true, con: true },
      equipment: {
        weapon1: { name: "Battleaxe", damage: "1d8", category: "Melee", properties: ["Versatile"] },
        weapon2: { name: "Handaxe", damage: "1d6", category: "Melee", properties: ["Light", "Thrown"] },
        ranged: { name: "Heavy Crossbow", damage: "1d10", category: "Ranged", properties: ["Heavy", "Two-Handed"] },
      },
      profile_avatar_url:
        "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/thordak.png",
    },
  },
  {
    user_id: "44444444-4444-4444-8444-444444444444",
    email: "serena.test@guildstew.local",
    username: "serena_test",
    profile_color_1: "#22c55e",
    profile_color_2: "#fde047",
    character: {
      name: "Serena Lightbringer",
      race: "Aasimar",
      class: "Cleric",
      level: 5,
      attributes: { str: 14, dex: 10, con: 14, int: 11, wis: 18, cha: 14 },
      hit_points: { max: 38, current: 38, temporary: 0 },
      armor_class: 18,
      initiative: 0,
      speed: 30,
      proficiency_bonus: 3,
      passive_perception: 14,
      skills: { Medicine: true, Religion: true, Insight: true, Persuasion: true },
      expertise: [],
      saving_throws: { wis: true, cha: true },
      equipment: {
        weapon1: { name: "Warhammer", damage: "1d8", category: "Melee", properties: ["Versatile"] },
      },
      spells: [
        "Sacred Flame",
        "Guidance",
        "Light",
        "Cure Wounds",
        "Healing Word",
        "Bless",
        "Hold Person",
        "Spiritual Weapon",
      ],
      profile_avatar_url:
        "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/serena.png",
    },
  },
];

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error("Not logged in. Log in as the GM account first, then re-run seedTestCampaign().");
  }
  return data.user;
}

async function tryInsertFakeProfiles() {
  const inserted = [];
  for (const p of FAKE_PLAYERS) {
    try {
      // Raw insert through supabase — the app's entities wrapper adds updated_at
      // which isn't helpful here.
      const { error } = await supabase.from("user_profiles").insert({
        user_id: p.user_id,
        email: p.email,
        username: p.username,
        profile_color_1: p.profile_color_1,
        profile_color_2: p.profile_color_2,
        bio: SEED_TAG,
      });
      if (error) {
        // Already exists or FK error — keep going, we'll use whatever's already there.
        console.warn(`[seed] user_profiles insert for ${p.username} skipped:`, error.message);
      } else {
        inserted.push(p.user_id);
      }
    } catch (err) {
      console.warn(`[seed] user_profiles insert for ${p.username} threw:`, err);
    }
  }
  return inserted;
}

async function createTestCampaign(gmUser) {
  const data = {
    title: "Seeded Combat Test Campaign",
    system: "Dungeons and Dragons 5e",
    description: `${SEED_TAG} Auto-generated test campaign for combat QA.`,
    cover_image_url:
      "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200&h=400&fit=crop",
    // THIS is what makes the campaign show up in the GM's Campaigns tab —
    // Campaigns.jsx filters by `game_master_id === user.id || player_ids.includes(user.id)`.
    game_master_id: gmUser.id,
    status: "active",
    player_ids: FAKE_PLAYERS.map((p) => p.user_id),
    consent_rating: "PG-13",
    is_session_active: true,
    combat_active: false,
    combat_data: null,
    loot_data: {
      items: [],
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      settings: { split_gold_evenly: true, level_up: false, random_items: false },
      is_distributed: false,
    },
  };
  const created = await base44.entities.Campaign.create(data);
  return created;
}

async function createTestCharacters(campaignId, gmUser) {
  const created = [];
  for (const p of FAKE_PLAYERS) {
    const charData = {
      ...p.character,
      campaign_id: campaignId,
      // created_by is usually set by an RLS trigger to the auth user, but we
      // can try to stash the fake player's email here so the GMPanel's
      // players/characters join logic (`c.created_by === profile.email`)
      // matches. If the trigger overwrites this, we'll just fall back to
      // possessing characters directly.
      created_by: p.email,
      notes: SEED_TAG,
    };
    try {
      const c = await base44.entities.Character.create(charData);
      created.push(c);
    } catch (err) {
      console.error(`[seed] Character create for ${p.character.name} failed:`, err);
    }
  }
  return created;
}

async function findExistingSeededCampaign() {
  try {
    // Raw query — entities.filter() only supports equality, and we want to
    // match on title to catch campaigns that have already been seeded.
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("title", "Seeded Combat Test Campaign");
    if (error) {
      console.warn("[seed] Could not look up existing seed campaign:", error.message);
      return null;
    }
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.warn("[seed] Lookup threw:", err);
    return null;
  }
}

async function repairCampaign(campaign, gm) {
  const patch = {};
  if (!campaign.game_master_id) patch.game_master_id = gm.id;
  if (!campaign.status) patch.status = "active";
  if (!campaign.player_ids || campaign.player_ids.length === 0) {
    patch.player_ids = FAKE_PLAYERS.map((p) => p.user_id);
  }
  if (Object.keys(patch).length === 0) return campaign;
  console.log(`[seed] Repairing existing campaign ${campaign.id} with:`, patch);
  try {
    const updated = await base44.entities.Campaign.update(campaign.id, patch);
    return updated;
  } catch (err) {
    console.error("[seed] Repair failed:", err);
    return campaign;
  }
}

export async function seedTestCampaign() {
  console.log("[seed] Starting test campaign seed…");
  const gm = await getCurrentUser();
  console.log(`[seed] Running as GM: ${gm.email} (${gm.id})`);

  const profileIds = await tryInsertFakeProfiles();
  console.log(`[seed] Fake player profiles created: ${profileIds.length}/${FAKE_PLAYERS.length}`);
  if (profileIds.length === 0) {
    console.warn(
      "[seed] No fake player profiles were created (likely blocked by an auth.users FK). " +
        "You'll still be able to test combat by possessing characters via the Possess dialog."
    );
  }

  // Idempotent: if a previous run already created the campaign, repair it
  // instead of making a duplicate. This is important because earlier
  // versions of this seed forgot to set game_master_id, which left the
  // campaign invisible in the GM's Campaigns tab.
  let campaign = await findExistingSeededCampaign();
  let characters = [];
  if (campaign) {
    console.log(`[seed] Found existing seed campaign ${campaign.id}; repairing instead of creating.`);
    campaign = await repairCampaign(campaign, gm);
    // Check if it already has characters; if not, create them.
    const existing = await base44.entities.Character.filter({ campaign_id: campaign.id });
    if (!existing || existing.length === 0) {
      characters = await createTestCharacters(campaign.id, gm);
    } else {
      characters = existing;
      console.log(`[seed] Campaign already has ${existing.length} characters — skipping character create.`);
    }
  } else {
    campaign = await createTestCampaign(gm);
    console.log(`[seed] Created campaign: ${campaign.id} — ${campaign.title}`);
    characters = await createTestCharacters(campaign.id, gm);
    console.log(`[seed] Created ${characters.length} characters.`);
  }

  const url = `${window.location.origin}/gmpanel?id=${campaign.id}`;
  console.log(`[seed] ✅ Done. Open the campaign: ${url}`);

  return { campaign, characters, profilesInserted: profileIds.length };
}

seedTestCampaign.cleanup = async function cleanupTestCampaign() {
  console.log("[seed] Cleaning up seeded test data…");

  // Find seeded campaigns by title (bypasses RLS `created_by` filters by
  // matching on a non-private column).
  const { data: seeded, error: lookupErr } = await supabase
    .from("campaigns")
    .select("id, title")
    .eq("title", "Seeded Combat Test Campaign");
  if (lookupErr) {
    console.error("[seed] Lookup failed:", lookupErr.message);
    return;
  }

  for (const c of seeded || []) {
    try {
      // Delete characters in this campaign first
      const { data: chars } = await supabase
        .from("characters")
        .select("id")
        .eq("campaign_id", c.id);
      for (const ch of chars || []) {
        const { error } = await supabase.from("characters").delete().eq("id", ch.id);
        if (error) console.warn(`[seed] Delete character ${ch.id}:`, error.message);
      }
      const { error: campErr } = await supabase.from("campaigns").delete().eq("id", c.id);
      if (campErr) {
        console.error(`[seed] Failed to delete campaign ${c.id}:`, campErr.message);
      } else {
        console.log(`[seed] Deleted campaign ${c.id}`);
      }
    } catch (err) {
      console.error(`[seed] Failed to delete campaign ${c.id}:`, err);
    }
  }

  // Delete fake user_profiles
  for (const p of FAKE_PLAYERS) {
    try {
      const { error } = await supabase.from("user_profiles").delete().eq("user_id", p.user_id);
      if (error) console.warn(`[seed] Delete profile ${p.username}:`, error.message);
    } catch (err) {
      console.warn(`[seed] Delete profile ${p.username} threw:`, err);
    }
  }

  console.log("[seed] ✅ Cleanup complete.");
};

// Expose on window in dev so the user can run it from the browser console.
if (typeof window !== "undefined" && import.meta.env.DEV) {
  window.seedTestCampaign = seedTestCampaign;
}

export default seedTestCampaign;
