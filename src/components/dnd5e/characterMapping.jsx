import {
  calculateMaxHP,
  calculateAC,
  calculateProficiencyBonus,
  getSpeed,
  calculateAbilityModifier,
} from "@/components/dnd5e/characterCalculations";

/**
 * Build a fully-derived "stats" object from CharacterCreator's characterData.
 * This is the canonical shape we can store under Character *or* CampaignNPC.stats.
 */
export function buildStatsFromCharacterData(characterData) {
  const level = parseInt(characterData.level || 1, 10);
  const attributes = characterData.attributes || {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  };

  const proficiency_bonus = calculateProficiencyBonus(level);
  const maxHP = calculateMaxHP(characterData.class, level, attributes.con);
  const armor_class = calculateAC(attributes.dex);
  const initiative = calculateAbilityModifier(attributes.dex);
  // Brewery races override SRD-lookup basics — speed, size, and
  // darkvision come from the mod schema when _brewery_race is set
  // (RaceStep copies them onto characterData under _brewery_* keys).
  const speed = characterData._brewery_speed != null
    ? characterData._brewery_speed
    : getSpeed(characterData.race);
  const size = characterData._brewery_size || characterData.size || null;
  const darkvision = characterData._brewery_darkvision != null
    ? characterData._brewery_darkvision
    : (characterData.darkvision || 0);
  const additional_speeds = characterData._brewery_additional_speeds
    || characterData.additional_speeds
    || null;

  // Passive Perception with expertise support
  const perceptionMod = calculateAbilityModifier(attributes.wis);
  const isPerceptionProficient = characterData.skills?.["Perception"] || false;
  const hasPerceptionExpertise =
    characterData.expertise?.includes("Perception") || false;

  let passive_perception = 10 + perceptionMod;
  if (hasPerceptionExpertise) {
    passive_perception += proficiency_bonus * 2;
  } else if (isPerceptionProficient) {
    passive_perception += proficiency_bonus;
  }

  return {
    // identity-ish bits
    name: characterData.name,
    race: characterData.race,
    subrace: characterData.subrace,
    class: characterData.class,
    subclass: characterData.subclass,
    background: characterData.background,
    alignment: characterData.alignment,
    level,

    // avatar / visual
    avatar_url: characterData.avatar_url || "",
    profile_avatar_url: characterData.profile_avatar_url || "",
    avatar_position: characterData.avatar_position || { x: 0, y: 0 },
    avatar_zoom: characterData.avatar_zoom || 1,
    profile_position: characterData.profile_position || { x: 0, y: 0 },
    profile_zoom: characterData.profile_zoom || 1,

    // core stats
    attributes,
    hit_points: { max: maxHP, current: maxHP, temporary: 0 },
    armor_class,
    initiative,
    speed,
    size,
    darkvision,
    additional_speeds,
    proficiency_bonus,
    passive_perception,

    // rules/mechanics
    skills: characterData.skills || {},
    saving_throws: characterData.saving_throws || {},
    languages: characterData.languages || [],
    proficiencies: characterData.proficiencies || {
      armor: [],
      weapons: [],
      tools: [],
    },
    features: characterData.features || [],
    feature_choices: characterData.feature_choices || {},
    multiclasses: characterData.multiclasses || [],
    spells: characterData.spells || { cantrips: [], level1: [] },
    equipment: characterData.equipment || { weapons: [], armor: {} },
    currency: characterData.currency || {
      cp: 0,
      sp: 0,
      ep: 0,
      gp: 0,
      pp: 0,
    },
    expertise: characterData.expertise || [],
    inventory: characterData.inventory || [],

    // fluff
    description: characterData.description || "",
    personality: characterData.personality || {
      traits: [],
      ideals: "",
      bonds: "",
      flaws: "",
    },
    appearance: characterData.appearance || {},
  };
}

/**
 * Build a CampaignNPC.create/update payload from stats + meta.
 * This keeps NPCs separate from PCs but structurally compatible.
 */
export function npcPayloadFromStats(
  stats,
  opts
) {
  // Ensure stats has the avatar urls
  if (opts.avatarUrl) {
    stats.avatar_url = opts.avatarUrl;
    stats.profile_avatar_url = opts.avatarUrl;
  }

  return {
    campaign_id: opts.campaignId,
    name: stats.name,
    description: stats.description || "",
    avatar_url: opts.avatarUrl || stats.avatar_url || stats.profile_avatar_url || "",
    stats,
    abilities: stats.features || [],
    inventory: stats.inventory || [],
    notes: "",
  };
}

/**
 * Build a Character.create payload from stats + avatar.
 * This is the PC entity.
 */
export function characterPayloadFromStats(stats, avatarUrl) {
  return {
    ...stats,
    profile_avatar_url: avatarUrl || undefined,
  };
}

/**
 * Normalize an NPC into characterData for the CharacterCreator editor.
 */
export function characterDataFromNpcForEditor(npc) {
  const stats = npc.stats || npc; // fallback for legacy

  return {
    // minimal defaults; everything else comes from stats
    name: stats.name || npc.name || "",
    race: stats.race || "",
    subrace: stats.subrace || "",
    class: stats.class || "",
    subclass: stats.subclass || "",
    background: stats.background || "",
    alignment: stats.alignment || "True Neutral",
    level: stats.level || 1,
    avatar_url: stats.avatar_url || npc.avatar_url || "",
    profile_avatar_url: stats.profile_avatar_url || npc.avatar_url || "",
    avatar_position: stats.avatar_position || { x: 0, y: 0 },
    avatar_zoom: stats.avatar_zoom || 1,
    profile_position: stats.profile_position || { x: 0, y: 0 },
    profile_zoom: stats.profile_zoom || 1,

    attributes: stats.attributes || {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    },
    skills: stats.skills || {},
    spells: stats.spells || { cantrips: [], level1: [] },
    saving_throws: stats.saving_throws || {},
    proficiencies: stats.proficiencies || { armor: [], weapons: [], tools: [] },
    languages: stats.languages || [],
    features: stats.features || [],
    feature_choices: stats.feature_choices || {},
    multiclasses: stats.multiclasses || [],
    inventory: stats.inventory || npc.inventory || [],
    equipment: stats.equipment || { weapons: [], armor: {} },
    currency: stats.currency || {
      cp: 0,
      sp: 0,
      ep: 0,
      gp: 0,
      pp: 0,
    },
    personality: stats.personality || {
      traits: [],
      ideals: "",
      bonds: "",
      flaws: "",
    },
    appearance: stats.appearance || {},
    description: stats.description || npc.description || "",
    expertise: stats.expertise || [],
  };
}

/**
 * Build a Character.create payload when copying an NPC into the Character Library.
 */
export function characterPayloadFromNpc(npc) {
  const stats = npc.stats || npc;
  return characterPayloadFromStats(stats, npc.avatar_url);
}