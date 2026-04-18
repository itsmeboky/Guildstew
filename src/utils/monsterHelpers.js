/**
 * Monster data helpers. The D&D 5e API (via the seeded dnd5e_monsters
 * table) stashes most fields under a nested `stats` JSONB column, but
 * older homebrew rows occasionally store the same fields at the top
 * level. Every accessor here checks both paths so SRD + homebrew
 * render identically in the same stat block.
 *
 * Example stats shape (Adult Black Dragon):
 *   { size: "Huge", type: "dragon", alignment: "chaotic evil",
 *     armor_class: [{ type: "natural", value: 19 }],
 *     hit_points: 195, hit_dice: "17d12",
 *     speed: { walk: "40 ft.", fly: "80 ft.", swim: "40 ft." },
 *     strength: 23, dexterity: 14, ...,
 *     proficiencies: [ { value: 7, proficiency: { name: "Saving Throw: DEX" } }, ... ],
 *     damage_immunities: ["acid"], condition_immunities: [],
 *     senses: { darkvision: "120 ft.", passive_perception: 21 },
 *     challenge_rating: 14, xp: 11500,
 *     special_abilities: [...], actions: [...], legendary_actions: [...], reactions: [...] }
 */

function getStat(monster, key) {
  if (!monster) return undefined;
  return monster[key] ?? monster.stats?.[key];
}

export function getAC(monster) {
  const ac = getStat(monster, "armor_class");
  if (Array.isArray(ac)) return ac[0]?.value ?? ac[0] ?? "?";
  if (typeof ac === "number") return ac;
  if (ac) return ac;
  return getStat(monster, "ac") ?? "?";
}

export function getHP(monster) {
  const hp = getStat(monster, "hit_points") ?? getStat(monster, "hp");
  if (hp == null || hp === "") return "?";
  if (typeof hp === "object") return hp.max ?? hp.current ?? "?";
  return hp;
}

export function getHitDice(monster) {
  return getStat(monster, "hit_points_roll") || getStat(monster, "hit_dice") || "";
}

export function getCR(monster) {
  const cr = getStat(monster, "challenge_rating") ?? getStat(monster, "cr");
  return cr ?? "?";
}

export function getXP(monster) {
  const xp = getStat(monster, "xp");
  return xp ?? "";
}

const MONSTER_TYPES = [
  "Aberration", "Beast", "Celestial", "Construct", "Dragon", "Elemental",
  "Fey", "Fiend", "Giant", "Humanoid", "Monstrosity", "Ooze", "Plant", "Undead",
];

export function getMonsterType(monster) {
  const type = getStat(monster, "type");
  if (type && typeof type === "string") {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
  const meta = getStat(monster, "meta");
  if (meta && typeof meta === "string") {
    const metaLower = meta.toLowerCase();
    const found = MONSTER_TYPES.find((t) => metaLower.includes(t.toLowerCase()));
    if (found) return found;
  }
  return "Unknown";
}

export function getSize(monster) {
  return getStat(monster, "size") || "";
}

export function getAlignment(monster) {
  return getStat(monster, "alignment") || "";
}

export function getSpeed(monster) {
  const speed = getStat(monster, "speed");
  if (!speed) return "30 ft.";
  if (typeof speed === "string") return speed;
  return Object.entries(speed)
    .map(([type, value]) => (type === "walk" ? value : `${type} ${value}`))
    .join(", ");
}

export function getAbilityScores(monster) {
  return {
    str: getStat(monster, "strength") ?? getStat(monster, "str") ?? 10,
    dex: getStat(monster, "dexterity")  ?? getStat(monster, "dex") ?? 10,
    con: getStat(monster, "constitution") ?? getStat(monster, "con") ?? 10,
    int: getStat(monster, "intelligence") ?? getStat(monster, "int") ?? 10,
    wis: getStat(monster, "wisdom") ?? getStat(monster, "wis") ?? 10,
    cha: getStat(monster, "charisma") ?? getStat(monster, "cha") ?? 10,
  };
}

export function getAbilityMod(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return "+0";
  const mod = Math.floor((n - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function getProficiencyBonus(monster) {
  return getStat(monster, "proficiency_bonus") ?? "";
}

export function getProficiencies(monster) {
  const profs = getStat(monster, "proficiencies") || [];
  const saves = [];
  const skills = [];
  if (!Array.isArray(profs)) return { saves, skills };
  for (const p of profs) {
    const name = p?.proficiency?.name || p?.name || "";
    const value = p?.value;
    const sign = typeof value === "number" && value < 0 ? "" : "+";
    if (!name) continue;
    if (name.includes("Saving Throw")) {
      const ability = name.replace("Saving Throw: ", "");
      saves.push(`${ability} ${sign}${value}`);
    } else if (name.includes("Skill")) {
      const skill = name.replace("Skill: ", "");
      skills.push(`${skill} ${sign}${value}`);
    }
  }
  return { saves, skills };
}

export function getSenses(monster) {
  const senses = getStat(monster, "senses");
  if (!senses) return "";
  if (typeof senses === "string") return senses;
  const parts = [];
  if (senses.blindsight)         parts.push(`Blindsight ${senses.blindsight}`);
  if (senses.darkvision)         parts.push(`Darkvision ${senses.darkvision}`);
  if (senses.truesight)          parts.push(`Truesight ${senses.truesight}`);
  if (senses.tremorsense)        parts.push(`Tremorsense ${senses.tremorsense}`);
  if (senses.passive_perception) parts.push(`Passive Perception ${senses.passive_perception}`);
  return parts.join(", ");
}

export function getLanguages(monster) {
  return getStat(monster, "languages") || "—";
}

function stringify(entries) {
  if (!Array.isArray(entries)) return "";
  return entries
    .map((e) => (typeof e === "string" ? e : e?.name || ""))
    .filter(Boolean)
    .join(", ");
}

export function getDamageInfo(monster) {
  return {
    immunities:          stringify(getStat(monster, "damage_immunities")),
    resistances:         stringify(getStat(monster, "damage_resistances")),
    vulnerabilities:     stringify(getStat(monster, "damage_vulnerabilities")),
    conditionImmunities: stringify(getStat(monster, "condition_immunities")),
  };
}

export function getSpecialAbilities(monster) {
  return getStat(monster, "special_abilities") || getStat(monster, "traits") || [];
}

export function getActions(monster) {
  return getStat(monster, "actions") || [];
}

export function getLegendaryActions(monster) {
  return getStat(monster, "legendary_actions") || [];
}

export function getReactions(monster) {
  return getStat(monster, "reactions") || [];
}

export function formatUsage(usage) {
  if (!usage) return "";
  if (usage.type === "per day") return `(${usage.times}/Day)`;
  if (usage.type === "recharge on roll") {
    const min = usage.min_value;
    return min && min < 6 ? `(Recharge ${min}-6)` : `(Recharge 6)`;
  }
  if (usage.type === "recharge after rest") {
    const rests = Array.isArray(usage.rest_types) && usage.rest_types.length
      ? usage.rest_types.join(" or ")
      : "";
    return rests ? `(Recharge after ${rests} Rest)` : "(Recharge after Rest)";
  }
  return "";
}

const SUPABASE_MONSTER_PATH =
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/monsters";

export function getMonsterImageUrl(monster) {
  if (!monster) return null;
  if (monster.image_url) return monster.image_url;
  if (monster.avatar_url) return monster.avatar_url;
  const name = monster.name || getStat(monster, "name");
  if (!name) return null;
  return `${SUPABASE_MONSTER_PATH}/${encodeURIComponent(name)}.png`;
}

export function getMonsterName(monster) {
  return monster?.name || getStat(monster, "name") || "Unknown";
}

export function getDescription(monster) {
  return monster?.description || getStat(monster, "description") || "";
}

export { MONSTER_TYPES };
