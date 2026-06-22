/**
 * D&D 5e (2024) — equipment adapter.
 *
 * Sources from `docs/5e_reference/2024/5e-SRD-Equipment.json`. The
 * 2024 SRD shape differs from 2014 in a few ways the adapter
 * normalises away from consumers:
 *
 *   - `equipment_categories` is plural (an array). Each item can
 *     belong to multiple categories — e.g. Alchemist's Supplies is
 *     under both `artisans-tools` and `tools`. The adapter picks
 *     the most general filter-relevant category for `category`
 *     (weapons / armor / adventuring-gear / tools) and exposes the
 *     full list on `properties._raw.equipment_categories`.
 *   - Weapons live under `weapons` (plural) plus more specific
 *     buckets (`martial-weapons`, `simple-melee-weapons`, etc.).
 *   - Weapons may carry a `mastery` property (Topple, Vex, Slow,
 *     etc.) that 2014 does not have. Surfaced on the normalised
 *     item as `mastery`.
 *   - Description is a flat string under `description`, not an
 *     array under `desc`.
 *
 * Normalised shape matches the 2014 adapter so the EquipmentStep
 * UI is edition-agnostic. See sibling `dnd5e_2014/equipment.js`.
 */

import EQUIPMENT_RAW from "../../../../../../docs/5e_reference/2024/5e-SRD-Equipment.json" with { type: "json" };

const FILTER_PREFERENCE = [
  "weapons",
  "armor",
  "adventuring-gear",
  "tools",
  "ammunition",
  "shields",
];

function formatCost(cost) {
  if (!cost || cost.quantity == null) return null;
  return `${cost.quantity} ${cost.unit}`;
}

function pickPrimaryCategory(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return { index: "item", name: "Item" };
  }
  for (const preferred of FILTER_PREFERENCE) {
    const hit = categories.find((c) => c.index === preferred);
    if (hit) return hit;
  }
  return categories[0];
}

function isWeapon(categories) {
  return (categories || []).some((c) => c.index === "weapons");
}
function isArmor(categories) {
  return (categories || []).some((c) => c.index === "armor");
}

function normalise(raw) {
  const categories = raw.equipment_categories || [];
  const primary = pickPrimaryCategory(categories);
  const item = {
    id: raw.index,
    name: raw.name,
    type: primary.name || "Item",
    category: primary.index || "item",
    cost: formatCost(raw.cost),
    weight: Number(raw.weight) || 0,
    description: typeof raw.description === "string" ? raw.description : "",
    properties: {
      weight: Number(raw.weight) || 0,
      _raw: raw,
    },
  };

  if (isWeapon(categories)) {
    item.damage = raw.damage
      ? {
          dice: raw.damage.damage_dice,
          type: raw.damage.damage_type?.name,
        }
      : null;
    item.range = raw.range || null;
    item.weaponProperties = (raw.properties || []).map((p) => p.name);
    // 2024 weapon mastery — single primary mastery per weapon. Fighters and
    // other martial classes assign masteries to the weapons they're
    // proficient with at level milestones.
    item.mastery = raw.mastery?.name || null;
  } else if (isArmor(categories)) {
    item.armorClass = raw.armor_class || null;
    item.armorCategory = raw.armor_category || null;
    item.stealthDisadvantage = !!raw.stealth_disadvantage;
    item.strMinimum = raw.str_minimum || 0;
  }
  return item;
}

const ALL = EQUIPMENT_RAW.map(normalise);
const BY_ID = new Map(ALL.map((it) => [it.id, it]));
const BY_NAME = new Map(ALL.map((it) => [it.name.toLowerCase(), it]));

export function getEquipment() {
  return ALL;
}

export function getEquipmentByCategory(categoryKey) {
  if (!categoryKey || categoryKey === "all") return ALL;
  const key = String(categoryKey).toLowerCase();
  const aliases = {
    weapon: "weapons",
    weapons: "weapons",
    armors: "armor",
    armor: "armor",
    gear: "adventuring-gear",
    "adventuring gear": "adventuring-gear",
    "adventuring-gear": "adventuring-gear",
    tool: "tools",
    tools: "tools",
  };
  const target = aliases[key] || key;
  // 2024 items can have multiple categories — match if ANY category matches,
  // not just the chosen primary. e.g. a Battleaxe's primary is `weapons`
  // but it's also under `martial-weapons` for class-proficiency lookups.
  return ALL.filter((it) =>
    (it.properties._raw.equipment_categories || []).some(
      (c) => c.index === target,
    ),
  );
}

export function getEquipmentByName(name) {
  if (!name) return null;
  return BY_NAME.get(String(name).toLowerCase()) || null;
}

export function getEquipmentById(id) {
  if (!id) return null;
  return BY_ID.get(id) || null;
}

/**
 * Returns all 2024 SRD weapons that carry a mastery property
 * (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex). 38 weapons
 * in the SRD — every weapon entry has a `mastery` field in the
 * 2024 PHB. Consumers (ClassFeaturesStep2024 Weapon Mastery picker)
 * use this to populate the choose-N-weapons UI.
 */
export function getWeaponsWithMastery() {
  return ALL.filter((item) => item.mastery && item.mastery.length > 0);
}
