/**
 * Brewery sheet modification templates.
 *
 * Sheet mods change the character-sheet structure — add tracking
 * sections, skills, or proficiency categories; remove or rename
 * existing skills. Instead of shipping a blank builder, we ship
 * pre-built templates for the subsystems the community has built
 * over and over (sanity, stress, corruption, piety, renown, hero
 * points, inventory slots, lingering injuries, ammo dice, bonds,
 * downtime, doom). The player can install a template and then
 * customize it — or start from blank.
 *
 * Schemas
 *
 *   add_sections: [
 *     {
 *       name,
 *       position — 'sidebar' | 'after_skills' | 'after_features'
 *                  | 'after_proficiencies'
 *       fields: [{ key, label, type, default, options?, formula? }]
 *     }
 *   ]
 *   add_skills:   [{ name, ability, description }]
 *   remove_skills: string[]
 *   rename_skills: { [standardSkillName]: newLabel }
 *   add_proficiency_categories: [{ name, items: string[] }]
 *
 * Field types: 'number' | 'text' | 'select' | 'toggle' | 'computed'.
 * Computed fields carry a `formula` the sheet evaluates at render
 * time (the engine is a later enhancement; v1 just stores the
 * formula string).
 */

export const SHEET_MOD_TEMPLATES = {
  // ──────────────── Psychological ────────────────
  sanity: {
    name: "Sanity Tracker",
    description: "A 7th ability score for cosmic horror campaigns. Based on the DMG optional rule (p.264). Creatures that encounter eldritch horrors make Sanity saves or gain madness.",
    category: "psychological",
    add_sections: [{
      name: "Sanity",
      position: "sidebar",
      fields: [
        { key: "sanity_score",    label: "Sanity",     type: "number", default: 10 },
        { key: "sanity_max",      label: "Max Sanity", type: "number", default: 20 },
        { key: "sanity_modifier", label: "Modifier",   type: "computed", formula: "floor((sanity_score - 10) / 2)" },
        { key: "madness_level",   label: "Madness",    type: "select",
          options: ["None", "Short-term", "Long-term", "Indefinite"], default: "None" },
      ],
    }],
  },

  stress: {
    name: "Stress & Afflictions",
    description: "Darkest Dungeon-style stress meter. Stress accumulates from horror, deprivation, and failure. At thresholds, characters gain afflictions. Based on Van Richten's Guide and Giffyglyph's Darker Dungeons.",
    category: "psychological",
    add_sections: [{
      name: "Stress",
      position: "sidebar",
      fields: [
        { key: "stress_current", label: "Stress",     type: "number", default: 0 },
        { key: "stress_max",     label: "Threshold",  type: "number", default: 10 },
        { key: "affliction",     label: "Affliction", type: "select",
          options: ["None", "Paranoid", "Hopeless", "Selfish", "Abusive", "Fearful", "Masochistic", "Irrational"], default: "None" },
        { key: "stress_penalty", label: "Roll Penalty", type: "number", default: 0 },
      ],
    }],
  },

  corruption: {
    name: "Corruption Tracker",
    description: "Numeric corruption track with transformation stages. Corruption accumulates from dark magic, cursed items, and forbidden knowledge. At thresholds, characters gain both boons and flaws. Inspired by Grim Hollow.",
    category: "psychological",
    add_sections: [{
      name: "Corruption",
      position: "sidebar",
      fields: [
        { key: "corruption_score", label: "Corruption",     type: "number", default: 0 },
        { key: "corruption_max",   label: "Corruption Max", type: "number", default: 20 },
        { key: "corruption_stage", label: "Stage",          type: "select",
          options: ["Pure", "Tainted", "Corrupted", "Consumed"], default: "Pure" },
        { key: "transformation",   label: "Transformation", type: "text", default: "" },
      ],
    }],
  },

  // ──────────────── Social ────────────────
  piety: {
    name: "Piety / Divine Favor",
    description: "Track devotion to a deity with a numeric score and tiered boons. Based on Mythic Odysseys of Theros. Boons unlock at piety thresholds.",
    category: "social",
    add_sections: [{
      name: "Piety",
      position: "after_features",
      fields: [
        { key: "deity",       label: "Deity",  type: "text",   default: "" },
        { key: "piety_score", label: "Piety",  type: "number", default: 0 },
        { key: "piety_tier",  label: "Tier",   type: "select",
          options: ["None (0)", "Devotee (3+)", "Acolyte (10+)", "Priest (25+)", "Champion (50+)"], default: "None (0)" },
      ],
    }],
  },

  renown: {
    name: "Renown / Faction Standing",
    description: "Track reputation with multiple factions. Higher renown unlocks faction-specific perks and titles. Supports multiple factions per character.",
    category: "social",
    add_sections: [{
      name: "Renown",
      position: "after_features",
      fields: [
        { key: "faction_1_name",  label: "Faction 1",  type: "text",   default: "" },
        { key: "faction_1_score", label: "Standing",   type: "number", default: 0 },
        { key: "faction_1_rank",  label: "Rank",       type: "select",
          options: ["Unknown", "Associate", "Member", "Officer", "Leader"], default: "Unknown" },
        { key: "faction_2_name",  label: "Faction 2",  type: "text",   default: "" },
        { key: "faction_2_score", label: "Standing",   type: "number", default: 0 },
        { key: "faction_2_rank",  label: "Rank",       type: "select",
          options: ["Unknown", "Associate", "Member", "Officer", "Leader"], default: "Unknown" },
        { key: "faction_3_name",  label: "Faction 3",  type: "text",   default: "" },
        { key: "faction_3_score", label: "Standing",   type: "number", default: 0 },
        { key: "faction_3_rank",  label: "Rank",       type: "select",
          options: ["Unknown", "Associate", "Member", "Officer", "Leader"], default: "Unknown" },
      ],
    }],
  },

  bonds: {
    name: "Bonds / NPC Contacts",
    description: "Track relationships with NPCs. Each bond has a name, relationship type, disposition, and notes. Useful for social intrigue campaigns.",
    category: "social",
    add_sections: [{
      name: "Bonds & Contacts",
      position: "after_features",
      fields: [
        { key: "bond_1_name",     label: "NPC Name",      type: "text",   default: "" },
        { key: "bond_1_relation", label: "Relationship",  type: "select",
          options: ["Ally", "Friend", "Contact", "Rival", "Enemy", "Romantic", "Family", "Patron"], default: "Contact" },
        { key: "bond_1_notes",    label: "Notes",         type: "text",   default: "" },
        { key: "bond_2_name",     label: "NPC Name",      type: "text",   default: "" },
        { key: "bond_2_relation", label: "Relationship",  type: "select",
          options: ["Ally", "Friend", "Contact", "Rival", "Enemy", "Romantic", "Family", "Patron"], default: "Contact" },
        { key: "bond_2_notes",    label: "Notes",         type: "text",   default: "" },
        { key: "bond_3_name",     label: "NPC Name",      type: "text",   default: "" },
        { key: "bond_3_relation", label: "Relationship",  type: "select",
          options: ["Ally", "Friend", "Contact", "Rival", "Enemy", "Romantic", "Family", "Patron"], default: "Contact" },
        { key: "bond_3_notes",    label: "Notes",         type: "text",   default: "" },
      ],
    }],
  },

  // ──────────────── Resources ────────────────
  hero_points: {
    name: "Hero / Luck Points",
    description: "Metacurrency pool that replaces binary Inspiration. Gain points through play, spend to reroll or add bonuses. Based on the DMG optional rule and Tales of the Valiant Luck Points.",
    category: "resources",
    add_sections: [{
      name: "Hero Points",
      position: "sidebar",
      fields: [
        { key: "hero_points_current", label: "Hero Points", type: "number", default: 0 },
        { key: "hero_points_max",     label: "Maximum",     type: "number", default: 5 },
        { key: "hero_points_usage",   label: "Cost to Use", type: "select",
          options: ["1 point: reroll any d20", "1 point: add 1d4", "3 points: reroll any d20"], default: "1 point: reroll any d20" },
      ],
    }],
  },

  inventory_slots: {
    name: "Slot-Based Inventory",
    description: "Replace weight-based encumbrance with inventory slots. Each item takes 1+ slots. Total slots = 10 + STR score. Simpler, more impactful than tracking pounds.",
    category: "resources",
    add_sections: [{
      name: "Inventory Slots",
      position: "after_proficiencies",
      fields: [
        { key: "slots_used",    label: "Slots Used",    type: "number", default: 0 },
        { key: "slots_max",     label: "Max Slots",     type: "number", default: 20 },
        { key: "encumbered_at", label: "Encumbered At", type: "number", default: 15 },
        { key: "slot_notes",    label: "Notes",         type: "text",   default: "" },
      ],
    }],
  },

  ammo_dice: {
    name: "Ammunition Dice",
    description: "Track ammo with usage dice instead of counting arrows. Each time you fire, roll the ammo die — on a 1-2, it downgrades (d12→d10→d8→d6→d4→depleted). From Darker Dungeons.",
    category: "resources",
    add_sections: [{
      name: "Ammunition",
      position: "sidebar",
      fields: [
        { key: "ammo_1_name", label: "Ammo Type",    type: "text",   default: "Arrows" },
        { key: "ammo_1_die",  label: "Current Die",  type: "select",
          options: ["d12 (Full)", "d10", "d8", "d6", "d4", "Depleted"], default: "d12 (Full)" },
        { key: "ammo_2_name", label: "Ammo Type 2",  type: "text",   default: "" },
        { key: "ammo_2_die",  label: "Current Die",  type: "select",
          options: ["d12 (Full)", "d10", "d8", "d6", "d4", "Depleted"], default: "d12 (Full)" },
      ],
    }],
  },

  downtime: {
    name: "Downtime Days Tracker",
    description: "Track available downtime between adventures. Spend days on training, crafting, carousing, research, or other activities.",
    category: "resources",
    add_sections: [{
      name: "Downtime",
      position: "sidebar",
      fields: [
        { key: "downtime_days",     label: "Days Available",   type: "number", default: 0 },
        { key: "downtime_activity", label: "Current Activity", type: "text",   default: "" },
        { key: "downtime_progress", label: "Progress",         type: "text",   default: "" },
      ],
    }],
  },

  // ──────────────── Combat ────────────────
  lingering_injuries: {
    name: "Lingering Injuries",
    description: "Permanent wounds from critical hits, dropping to 0 HP, or failing death saves by 5+. Injuries persist until magically healed. Based on the DMG optional rule.",
    category: "combat",
    add_sections: [{
      name: "Lingering Injuries",
      position: "after_features",
      fields: [
        { key: "injury_1",        label: "Injury 1", type: "text", default: "" },
        { key: "injury_1_effect", label: "Effect",   type: "text", default: "" },
        { key: "injury_2",        label: "Injury 2", type: "text", default: "" },
        { key: "injury_2_effect", label: "Effect",   type: "text", default: "" },
        { key: "injury_3",        label: "Injury 3", type: "text", default: "" },
        { key: "injury_3_effect", label: "Effect",   type: "text", default: "" },
      ],
    }],
  },

  doom_pool: {
    name: "Doom / Dread Pool",
    description: "GM-facing tension resource that builds over time. Doom increases on failed checks, rests in dangerous areas, and narrative triggers. GM spends doom to make bad things happen.",
    category: "combat",
    add_sections: [{
      name: "Doom",
      position: "sidebar",
      fields: [
        { key: "doom_current", label: "Doom",          type: "number", default: 0 },
        { key: "doom_max",     label: "Threshold",     type: "number", default: 10 },
        { key: "doom_effect",  label: "At Threshold",  type: "text",   default: "Something terrible happens." },
      ],
    }],
  },
};

/** Category metadata for the template gallery. */
export const SHEET_MOD_CATEGORIES = [
  { key: "psychological", label: "Psychological & Moral",  description: "Sanity, stress, corruption — internal state tracking." },
  { key: "social",        label: "Social & Reputation",    description: "Faction standing, bonds, divine favor." },
  { key: "resources",     label: "Resources & Tracking",   description: "Inventory slots, hero points, ammo, downtime." },
  { key: "combat",        label: "Combat & Consequences",  description: "Lingering injuries, doom pools." },
];

/** Skill modification presets for the secondary picker. */
export const SKILL_PRESETS = {
  blank: {
    name: "Blank",
    description: "No changes — start from scratch.",
    add_skills: [],
    remove_skills: [],
    rename_skills: {},
  },
  scifi: {
    name: "Sci-Fi / Modern",
    description: "Add Technology, Piloting, Engineering. Remove Arcana, Religion. Follows the SW5e / Esper Genesis pattern.",
    add_skills: [
      { name: "Technology",  ability: "int", description: "Operating, hacking, and understanding electronic systems." },
      { name: "Piloting",    ability: "dex", description: "Maneuvering vehicles, starships, and mechs." },
      { name: "Engineering", ability: "int", description: "Building, repairing, and modifying machines and structures." },
    ],
    remove_skills: ["Arcana", "Religion"],
    rename_skills: {},
  },
  consolidated: {
    name: "Consolidated (Fewer Skills)",
    description: "Merge redundant skills for faster play. The most common community consolidation pattern.",
    add_skills: [
      { name: "Lore",       ability: "int", description: "Combined knowledge of Arcana, History, and Religion." },
      { name: "Wilderness", ability: "wis", description: "Combined Animal Handling, Nature, and Survival." },
    ],
    remove_skills: ["Arcana", "History", "Religion", "Animal Handling", "Nature", "Survival"],
    rename_skills: {},
  },
  streamlined: {
    name: "Streamlined",
    description: "Remove the least-used skills. Performance deleted, Animal Handling folded into Nature.",
    add_skills: [],
    remove_skills: ["Performance", "Animal Handling"],
    rename_skills: {},
  },
};

/** Standard SRD skill list (source for the remove / rename pickers). */
export const STANDARD_SKILLS = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
  "History", "Insight", "Intimidation", "Investigation", "Medicine",
  "Nature", "Perception", "Performance", "Persuasion", "Religion",
  "Sleight of Hand", "Stealth", "Survival",
];

/** Field-type option list for the custom-section field editor. */
export const FIELD_TYPES = ["number", "text", "select", "toggle", "computed"];

/** Position option list for the section editor. */
export const SECTION_POSITIONS = [
  { value: "sidebar",             label: "Sidebar" },
  { value: "after_skills",        label: "After Skills" },
  { value: "after_features",      label: "After Features" },
  { value: "after_proficiencies", label: "After Proficiencies" },
];

/** Ability option list for new skills. */
export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

/** Factory helpers for the form's initial state. */
export function blankSheetChanges() {
  return {
    add_sections: [],
    add_skills: [],
    remove_skills: [],
    rename_skills: {},
    add_proficiency_categories: [],
  };
}

export function blankSection() {
  return {
    name: "New Section",
    position: "sidebar",
    fields: [],
  };
}

export function blankField() {
  return {
    key: "",
    label: "",
    type: "text",
    default: "",
  };
}

export function blankSkillRow() {
  return { name: "", ability: "int", description: "" };
}

export function blankProficiencyCategory() {
  return { name: "", items: [] };
}

/** Deep-clone a template so edits to the form don't mutate the
 *  canonical template object. */
export function cloneTemplateSections(templateId) {
  const t = SHEET_MOD_TEMPLATES[templateId];
  if (!t) return [];
  return JSON.parse(JSON.stringify(t.add_sections || []));
}

export function cloneSkillPreset(presetId) {
  const p = SKILL_PRESETS[presetId];
  if (!p) return { add_skills: [], remove_skills: [], rename_skills: {} };
  return JSON.parse(JSON.stringify({
    add_skills: p.add_skills || [],
    remove_skills: p.remove_skills || [],
    rename_skills: p.rename_skills || {},
  }));
}
