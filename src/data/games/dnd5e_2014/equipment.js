/**
 * D&D 5e (2014) — equipment adapter.
 *
 * Sources from `docs/5e_reference/2014/5e-SRD-Equipment.json`. The
 * SRD record is preserved on `properties._raw` so consumers that
 * need the full shape (damage dice, armor class, range, etc.) can
 * reach for it without re-parsing.
 *
 * Normalised shape returned by every helper:
 *
 *   {
 *     id, name, type, category,
 *     cost, weight, description,
 *     properties: { weight, _raw },
 *     damage,           // weapons only
 *     range,            // weapons only
 *     weaponProperties, // weapons only — names lowercased
 *     armorClass,       // armor only
 *     armorCategory,    // armor only
 *     stealthDisadvantage, strMinimum,  // armor only
 *   }
 *
 * The 2014 SRD uses the singular `equipment_category`; the 2024
 * adapter mirrors this shape but reads from `equipment_categories`
 * (plural) and may add a `mastery` field on weapons.
 */

import EQUIPMENT_RAW from "../../../../docs/5e_reference/2014/5e-SRD-Equipment.json" with { type: "json" };

function formatCost(cost) {
  if (!cost || cost.quantity == null) return null;
  return `${cost.quantity} ${cost.unit}`;
}

function normaliseDesc(desc) {
  if (Array.isArray(desc)) return desc.join(" ");
  if (typeof desc === "string") return desc;
  return "";
}

function normalise(raw) {
  const cat = raw.equipment_category || {};
  const item = {
    id: raw.index,
    name: raw.name,
    type: cat.name || "Item",
    category: cat.index || "item",
    cost: formatCost(raw.cost),
    weight: Number(raw.weight) || 0,
    description: normaliseDesc(raw.desc),
    properties: {
      weight: Number(raw.weight) || 0,
      _raw: raw,
    },
  };

  if (cat.index === "weapon") {
    item.damage = raw.damage
      ? {
          dice: raw.damage.damage_dice,
          type: raw.damage.damage_type?.name,
        }
      : null;
    item.range = raw.range || null;
    item.weaponProperties = (raw.properties || []).map((p) => p.name);
    item.weaponCategory = raw.weapon_category || null;
    item.weaponRange = raw.weapon_range || null;
  } else if (cat.index === "armor") {
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

/**
 * Filter by category. Accepts either the SRD index (`weapon`,
 * `armor`, `adventuring-gear`, `tools`, `mounts-and-vehicles`) or a
 * UI-friendly synonym (`weapons`, `gear`, `tool`).
 */
export function getEquipmentByCategory(categoryKey) {
  if (!categoryKey || categoryKey === "all") return ALL;
  const key = String(categoryKey).toLowerCase();
  const aliases = {
    weapons: "weapon",
    weapon: "weapon",
    armors: "armor",
    armor: "armor",
    gear: "adventuring-gear",
    "adventuring gear": "adventuring-gear",
    "adventuring-gear": "adventuring-gear",
    tool: "tools",
    tools: "tools",
  };
  const target = aliases[key] || key;
  return ALL.filter((it) => it.category === target);
}

export function getEquipmentByName(name) {
  if (!name) return null;
  return BY_NAME.get(String(name).toLowerCase()) || null;
}

export function getEquipmentById(id) {
  if (!id) return null;
  return BY_ID.get(id) || null;
}
