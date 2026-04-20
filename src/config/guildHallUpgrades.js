/**
 * Guild Hall upgrade catalog.
 *
 * 8 categories × 3 tiers = 24 upgrades. Each tier depends on the
 * previous tier in its category (`prerequisite` carries the upgrade
 * id). Costs are in gold pieces; the purchase flow deducts from
 * `guild_halls.coffers.gp`.
 *
 * `mechanical` is the structured effect data downstream systems
 * (training, rest, crafting, rumor board, legend tracker, vault)
 * will read. `effect` is the human-readable string the upgrade
 * card + active-effects summary render.
 *
 * Every upgrade carries `category` so the renderer can group them
 * without deriving it from the id. UPGRADE_CATEGORIES is the
 * canonical display order.
 */

export const UPGRADE_CATEGORIES = [
  { key: "library",          label: "Library",          icon: "📚", description: "Language and knowledge training." },
  { key: "training_grounds", label: "Training Grounds", icon: "⚔️", description: "Weapon and armor proficiency training." },
  { key: "workshop",         label: "Workshop",         icon: "🔨", description: "Tool proficiency and crafting." },
  { key: "infirmary",        label: "Infirmary",        icon: "💊", description: "Rest, recovery, and restoration." },
  { key: "tavern",           label: "Tavern",           icon: "🍺", description: "Rumors, social hub, and long rests." },
  { key: "trophy_room",      label: "Trophy Room",      icon: "🏆", description: "Legend titles and guild renown." },
  { key: "vault",            label: "Vault",            icon: "💰", description: "Shared gold + magic item storage." },
  { key: "stable",           label: "Stable",           icon: "🐴", description: "Mounts and companion animals." },
];

export const GUILD_HALL_UPGRADES = {
  // ─────────────── Library ───────────────
  basic_library: {
    id: "basic_library",
    name: "Basic Library",
    category: "library",
    tier: 1,
    cost: 100,
    prerequisite: null,
    description: "A modest collection of scrolls, primers, and language keys for self-study.",
    effect: "Training time reduced by 20%",
    mechanical: { training_time_multiplier: { language: 0.8, knowledge: 0.8 } },
  },
  scholars_archive: {
    id: "scholars_archive",
    name: "Scholar's Archive",
    category: "library",
    tier: 2,
    cost: 500,
    prerequisite: "basic_library",
    description: "Cataloged shelves and a resident sage make rare languages teachable.",
    effect: "Training time reduced by 40%, unlocks rare language training",
    mechanical: {
      training_time_multiplier: { language: 0.6, knowledge: 0.6 },
      unlocks: ["rare_languages"],
    },
  },
  grand_library: {
    id: "grand_library",
    name: "Grand Library",
    category: "library",
    tier: 3,
    cost: 2000,
    prerequisite: "scholars_archive",
    description: "A multi-floor repository. Planar tomes, loremasters, and focused study rooms.",
    effect: "Training time reduced by 60%, train two languages or tools simultaneously",
    mechanical: {
      training_time_multiplier: { language: 0.4, knowledge: 0.4 },
      parallel_training: 2,
      unlocks: ["rare_languages"],
    },
  },

  // ─────────────── Training Grounds ───────────────
  sparring_ring: {
    id: "sparring_ring",
    name: "Sparring Ring",
    category: "training_grounds",
    tier: 1,
    cost: 150,
    prerequisite: null,
    description: "Sand-floored yard with training dummies and weapon racks.",
    effect: "Weapon/armor training time reduced by 20%",
    mechanical: { training_time_multiplier: { weapon: 0.8, armor: 0.8 } },
  },
  combat_arena: {
    id: "combat_arena",
    name: "Combat Arena",
    category: "training_grounds",
    tier: 2,
    cost: 750,
    prerequisite: "sparring_ring",
    description: "Proper ring, spectator benches, and a weapon-master on retainer.",
    effect: "Training time reduced by 40%, unlocks martial weapon training",
    mechanical: {
      training_time_multiplier: { weapon: 0.6, armor: 0.6 },
      unlocks: ["martial_weapons"],
    },
  },
  war_room: {
    id: "war_room",
    name: "War Room",
    category: "training_grounds",
    tier: 3,
    cost: 3000,
    prerequisite: "combat_arena",
    description: "Tactical tables, veteran tacticians, and a hall hung with battle standards.",
    effect: "Training time reduced by 60%, train two proficiencies simultaneously",
    mechanical: {
      training_time_multiplier: { weapon: 0.4, armor: 0.4 },
      parallel_training: 2,
      unlocks: ["martial_weapons"],
    },
  },

  // ─────────────── Workshop ───────────────
  basic_workshop: {
    id: "basic_workshop",
    name: "Basic Workshop",
    category: "workshop",
    tier: 1,
    cost: 100,
    prerequisite: null,
    description: "Benches, hand tools, and a small forge — enough for apprentice work.",
    effect: "Tool training time reduced by 20%",
    mechanical: { training_time_multiplier: { tool: 0.8 } },
  },
  artisans_hall: {
    id: "artisans_hall",
    name: "Artisan's Hall",
    category: "workshop",
    tier: 2,
    cost: 500,
    prerequisite: "basic_workshop",
    description: "Dedicated bays for leather, metal, wood, and alchemy — with a stocked material room.",
    effect: "Training time reduced by 40%, crafting costs reduced by 25%",
    mechanical: {
      training_time_multiplier: { tool: 0.6 },
      crafting_cost_multiplier: 0.75,
    },
  },
  master_forge: {
    id: "master_forge",
    name: "Master Forge",
    category: "workshop",
    tier: 3,
    cost: 2000,
    prerequisite: "artisans_hall",
    description: "Enchanting circle, planar anvil, and a resident artificer.",
    effect: "Training time reduced by 60%, can craft uncommon magic items",
    mechanical: {
      training_time_multiplier: { tool: 0.4 },
      crafting_cost_multiplier: 0.75,
      unlocks: ["craft_uncommon_magic"],
    },
  },

  // ─────────────── Infirmary ───────────────
  healers_corner: {
    id: "healers_corner",
    name: "Healer's Corner",
    category: "infirmary",
    tier: 1,
    cost: 100,
    prerequisite: null,
    description: "A clean cot, bandages, herbs, and a kind hand.",
    effect: "Short rests taken here heal an extra hit die",
    mechanical: { short_rest_bonus_hit_dice: 1 },
  },
  medical_ward: {
    id: "medical_ward",
    name: "Medical Ward",
    category: "infirmary",
    tier: 2,
    cost: 500,
    prerequisite: "healers_corner",
    description: "Multiple beds, a chirurgeon, and stocked healing potions.",
    effect: "Long rests here remove 1 extra level of exhaustion",
    mechanical: { short_rest_bonus_hit_dice: 1, long_rest_exhaustion_bonus: 1 },
  },
  temple_of_restoration: {
    id: "temple_of_restoration",
    name: "Temple of Restoration",
    category: "infirmary",
    tier: 3,
    cost: 2000,
    prerequisite: "medical_ward",
    description: "Consecrated shrine tended by a cleric — prayers answered in small miracles.",
    effect: "Once per session, remove one condition without a spell",
    mechanical: {
      short_rest_bonus_hit_dice: 1,
      long_rest_exhaustion_bonus: 1,
      free_condition_removal_per_session: 1,
    },
  },

  // ─────────────── Tavern ───────────────
  common_room: {
    id: "common_room",
    name: "Common Room",
    category: "tavern",
    tier: 1,
    cost: 0,
    prerequisite: null,
    description: "Hearth, benches, and enough space for the party to sleep safe.",
    effect: "Party can take a long rest here",
    mechanical: { long_rest_allowed: true },
  },
  tavern: {
    id: "tavern",
    name: "Tavern",
    category: "tavern",
    tier: 2,
    cost: 200,
    prerequisite: "common_room",
    description: "Bar, brewer, and a traveler or two always passing through.",
    effect: "Generates 1 rumor per session for the Rumor Board",
    mechanical: { long_rest_allowed: true, rumors_per_session: 1 },
  },
  grand_tavern: {
    id: "grand_tavern",
    name: "Grand Tavern",
    category: "tavern",
    tier: 3,
    cost: 1000,
    prerequisite: "tavern",
    description: "Multi-storey common house, stage for performers, private rooms for nobles.",
    effect: "2 rumors per session, NPCs visit with side quests, +1 Persuasion in town",
    mechanical: {
      long_rest_allowed: true,
      rumors_per_session: 2,
      side_quest_visits: true,
      persuasion_in_town_bonus: 1,
    },
  },

  // ─────────────── Trophy Room ───────────────
  display_case: {
    id: "display_case",
    name: "Display Case",
    category: "trophy_room",
    tier: 1,
    cost: 100,
    prerequisite: null,
    description: "A single glass cabinet for spoils and memorabilia.",
    effect: "Legend title progress +10%",
    mechanical: { legend_progress_multiplier: 1.10 },
  },
  hall_of_heroes: {
    id: "hall_of_heroes",
    name: "Hall of Heroes",
    category: "trophy_room",
    tier: 2,
    cost: 500,
    prerequisite: "display_case",
    description: "A lined corridor of plaques and portraits commemorating past deeds.",
    effect: "Legend progress +25%, unlocks guild-exclusive titles",
    mechanical: {
      legend_progress_multiplier: 1.25,
      unlocks: ["guild_titles"],
    },
  },
  legendary_gallery: {
    id: "legendary_gallery",
    name: "Legendary Gallery",
    category: "trophy_room",
    tier: 3,
    cost: 2000,
    prerequisite: "hall_of_heroes",
    description: "A vaulted hall of relics — each trophy hums with the story that earned it.",
    effect: "Legend progress +50%, earned titles grant minor mechanical bonuses",
    mechanical: {
      legend_progress_multiplier: 1.50,
      unlocks: ["guild_titles", "title_mechanical_bonuses"],
    },
  },

  // ─────────────── Vault ───────────────
  lockbox: {
    id: "lockbox",
    name: "Lockbox",
    category: "vault",
    tier: 1,
    cost: 50,
    prerequisite: null,
    description: "A heavy iron chest with two keys and one steady guard.",
    effect: "Shared party gold storage",
    mechanical: { shared_gold_storage: true },
  },
  vault: {
    id: "vault",
    name: "Vault",
    category: "vault",
    tier: 2,
    cost: 300,
    prerequisite: "lockbox",
    description: "A basement strongroom with a ledger, a clerk, and a reputable bank contact.",
    effect: "5% interest per in-game month on stored gold",
    mechanical: {
      shared_gold_storage: true,
      monthly_interest_rate: 0.05,
    },
  },
  grand_vault: {
    id: "grand_vault",
    name: "Grand Vault",
    category: "vault",
    tier: 3,
    cost: 1500,
    prerequisite: "vault",
    description: "Warded strongroom, guild signet locks, and safe-deposit boxes for relics.",
    effect: "10% interest per month, can store magic items between sessions",
    mechanical: {
      shared_gold_storage: true,
      monthly_interest_rate: 0.10,
      magic_item_storage: true,
    },
  },

  // ─────────────── Stable ───────────────
  hitching_post: {
    id: "hitching_post",
    name: "Hitching Post",
    category: "stable",
    tier: 1,
    cost: 50,
    prerequisite: null,
    description: "A covered rail, water trough, and room for two mounts.",
    effect: "Store up to 2 mounts",
    mechanical: { mount_capacity: 2 },
  },
  stable: {
    id: "stable",
    name: "Stable",
    category: "stable",
    tier: 2,
    cost: 300,
    prerequisite: "hitching_post",
    description: "Six stalls, a tack room, and a live-in stablemaster.",
    effect: "Store up to 6 mounts; mounts heal fully on long rest",
    mechanical: { mount_capacity: 6, mounts_heal_on_long_rest: true },
  },
  grand_stable: {
    id: "grand_stable",
    name: "Grand Stable",
    category: "stable",
    tier: 3,
    cost: 1000,
    prerequisite: "stable",
    description: "Training yards, a menagerie wing, and exotic-mount quarters.",
    effect: "Mounts +10 speed; companion animals gain +1 HP per character level",
    mechanical: {
      mount_capacity: 6,
      mounts_heal_on_long_rest: true,
      mount_speed_bonus: 10,
      companion_hp_per_level: 1,
    },
  },
};

/** Ordered list of upgrades for a given category. */
export function upgradesForCategory(categoryKey) {
  return Object.values(GUILD_HALL_UPGRADES)
    .filter((u) => u.category === categoryKey)
    .sort((a, b) => a.tier - b.tier);
}

/** Whether `purchasedIds` already includes `upgrade.prerequisite`. */
export function isUpgradeAvailable(upgrade, purchasedIds = []) {
  if (!upgrade) return false;
  if (!upgrade.prerequisite) return true;
  return purchasedIds.includes(upgrade.prerequisite);
}

/** Upgrades the party already bought — resolved + ordered by category/tier. */
export function resolvePurchasedUpgrades(purchasedIds = []) {
  return purchasedIds
    .map((id) => GUILD_HALL_UPGRADES[id])
    .filter(Boolean)
    .sort((a, b) => {
      const catDelta =
        UPGRADE_CATEGORIES.findIndex((c) => c.key === a.category)
        - UPGRADE_CATEGORIES.findIndex((c) => c.key === b.category);
      if (catDelta !== 0) return catDelta;
      return a.tier - b.tier;
    });
}

/** The free Tavern Common Room that seeds on hall establishment. */
export const COMMON_ROOM_UPGRADE_ID = "common_room";
