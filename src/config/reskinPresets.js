/**
 * Brewery reskin presets.
 *
 * Reskin mods rename game terminology without touching any math.
 * Each preset ships a community-standard rename package the player
 * can install with one click and customize from there. Five
 * starting points: blank canvas, sci-fi, horror, grimdark, and
 * heroic. The player can change, add, or remove any rename after
 * loading a preset — the preset is a starting point, not a locked
 * template.
 *
 * Schema for `renames`:
 *   abilities    — { [abilityKey]: { name, abbreviation } }
 *                  abilityKey is lowercase 3-letter (str / dex / con / int / wis / cha).
 *   terms        — { [originalLabel]: replacementLabel }
 *   damage_types — { [lowercaseDamageType]: replacementLabel }
 *   conditions   — { [conditionName]: replacementLabel }
 *
 * Modded mods that don't carry a category just keep the original
 * label — getDisplayName falls through to the source key.
 */

export const RESKIN_PRESETS = {
  blank: {
    name: "Blank Reskin",
    description: "Start from scratch. Rename anything you want.",
    renames: { abilities: {}, terms: {}, damage_types: {}, conditions: {} },
  },

  scifi: {
    name: "Sci-Fi / Space Opera",
    description: "Renames for science fiction settings. Spells become tech powers, damage types become energy classifications.",
    renames: {
      abilities: {},
      terms: {
        "Hit Points": "Hull Integrity",
        "Armor Class": "Defense Rating",
        "Hit Dice": "Repair Dice",
        "Spell Slots": "Power Cells",
        "Cantrip": "Basic Program",
        "Death Saves": "System Failure Checks",
        "Short Rest": "Quick Recharge",
        "Long Rest": "Full Recharge",
        "Proficiency Bonus": "Training Bonus",
      },
      damage_types: {
        "bludgeoning": "kinetic",
        "piercing": "kinetic",
        "slashing": "kinetic",
        "fire": "plasma",
        "lightning": "electric",
        "thunder": "sonic",
        "cold": "cryo",
        "force": "gravitic",
        "radiant": "photon",
        "necrotic": "radiation",
        "psychic": "neural",
        "acid": "corrosive",
      },
      conditions: {},
    },
  },

  horror: {
    name: "Horror / Gothic",
    description: "Renames for horror and gothic settings. Emphasizes dread, trauma, and psychological states.",
    renames: {
      abilities: {
        wis: { name: "Willpower", abbreviation: "WIL" },
      },
      terms: {
        "Hit Points": "Vitality",
        "Death Saves": "Fate Checks",
        "Inspiration": "Resolve",
        "Short Rest": "Respite",
        "Long Rest": "Recovery",
      },
      damage_types: {
        "necrotic": "shadow",
        "radiant": "holy",
        "psychic": "dread",
      },
      conditions: {
        "Frightened": "Shaken",
        "Charmed": "Dominated",
        "Stunned": "Dazed",
      },
    },
  },

  grimdark: {
    name: "Grimdark / Low Fantasy",
    description: "Renames for gritty, survival-focused campaigns. HP becomes wounds, rests become recovery periods.",
    renames: {
      abilities: {
        str: { name: "Might",   abbreviation: "MIG" },
        dex: { name: "Finesse", abbreviation: "FIN" },
        con: { name: "Vigor",   abbreviation: "VIG" },
        int: { name: "Reason",  abbreviation: "REA" },
        wis: { name: "Insight", abbreviation: "INS" },
        cha: { name: "Bearing", abbreviation: "BEA" },
      },
      terms: {
        "Hit Points": "Wounds",
        "Hit Dice": "Recovery Dice",
        "Armor Class": "Defense",
        "Death Saves": "Fate Checks",
        "Proficiency Bonus": "Training Bonus",
        "Short Rest": "Breather",
        "Long Rest": "Full Rest",
        "Cantrip": "Minor Spell",
        "Spell Slots": "Arcane Reserves",
      },
      damage_types: {
        "radiant": "holy",
        "necrotic": "blight",
      },
      conditions: {
        "Frightened": "Broken",
      },
    },
  },

  heroic: {
    name: "Heroic / Mythic",
    description: "Renames for high-fantasy, demigod-tier campaigns. Emphasizes grandeur and divine power.",
    renames: {
      abilities: {
        str: { name: "Prowess",  abbreviation: "PRW" },
        cha: { name: "Presence", abbreviation: "PRE" },
      },
      terms: {
        "Hit Points": "Resolve",
        "Death Saves": "Defiance Checks",
        "Inspiration": "Divine Favor",
        "Spell Slots": "Invocations",
      },
      damage_types: {},
      conditions: {},
    },
  },
};

/** Renameable terms in the base game, in display order for the form. */
export const RENAMEABLE_TERMS = [
  "Hit Points", "Armor Class", "Proficiency Bonus", "Hit Dice",
  "Spell Slots", "Cantrip", "Death Saves", "Initiative",
  "Short Rest", "Long Rest", "Inspiration",
  "Experience Points", "Spell Save DC", "Attack Bonus",
];

/** Standard 5e conditions. */
export const STANDARD_CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened",
  "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified",
  "Poisoned", "Prone", "Restrained", "Stunned",
];

/** Canonical damage type list. Lowercase is the storage key; the
 *  rename value is what the UI displays. */
export const DAMAGE_TYPES = [
  "acid", "bludgeoning", "cold", "fire", "force", "lightning",
  "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder",
];

/** Ability keys + canonical labels for the rename form. */
export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
export const ABILITY_LABELS = {
  str: { name: "Strength",     abbreviation: "STR" },
  dex: { name: "Dexterity",    abbreviation: "DEX" },
  con: { name: "Constitution", abbreviation: "CON" },
  int: { name: "Intelligence", abbreviation: "INT" },
  wis: { name: "Wisdom",       abbreviation: "WIS" },
  cha: { name: "Charisma",     abbreviation: "CHA" },
};

/**
 * Trim empty / no-op rename entries from a renames blob so the
 * saved metadata only carries actual changes. Pure function — safe
 * to call on the in-progress form state at save time.
 */
export function compactRenames(renames) {
  const out = {
    abilities: {},
    terms: {},
    damage_types: {},
    conditions: {},
  };
  for (const [k, v] of Object.entries(renames?.abilities || {})) {
    const name = (v?.name || "").trim();
    const abbr = (v?.abbreviation || "").trim();
    if (!name && !abbr) continue;
    out.abilities[k] = {};
    if (name) out.abilities[k].name = name;
    if (abbr) out.abilities[k].abbreviation = abbr;
  }
  for (const [k, v] of Object.entries(renames?.terms || {})) {
    const t = (v || "").trim();
    if (t) out.terms[k] = t;
  }
  for (const [k, v] of Object.entries(renames?.damage_types || {})) {
    const t = (v || "").trim();
    if (t) out.damage_types[k] = t;
  }
  for (const [k, v] of Object.entries(renames?.conditions || {})) {
    const t = (v || "").trim();
    if (t) out.conditions[k] = t;
  }
  return out;
}

/** Factory for an empty renames blob shaped for the form. */
export function blankRenames() {
  return { abilities: {}, terms: {}, damage_types: {}, conditions: {} };
}
