// Shared derivation of the three mechanically-complete fields that were
// previously saved empty/wrong: armor_class, saving_throws, proficiencies.
//
// These are DERIVED (not stored step-by-step) so they recompute from
// class / race / background / attributes / inventory — all of which
// already persist — and can't go stale or be dropped by the separate
// round-trip bug. Used by BOTH buildStatsFromCharacterData (the save
// payload) and ReviewStep, so the displayed values and the saved values
// are guaranteed identical.

import {
  abilityModifier,
  calculateAC,
  unarmoredDefense,
  ARMOR_TABLE,
  CLASS_SAVING_THROWS,
  CLASS_ARMOR_PROFICIENCIES,
  CLASS_WEAPON_PROFICIENCIES,
  CLASS_TOOL_PROFICIENCIES,
  RACE_PROFICIENCIES,
} from "@/components/dnd5e/dnd5eRules";
import { getBackgroundTools } from "@/components/dnd5e/backgroundData";

// ─── Saving throws ───────────────────────────────────────────────────
// Shape: { str: true, con: true, ... } — ability key → proficient bool,
// matching the character sheet's `!!saving_throws[ability]` read. Only
// the primary class grants save proficiencies (multiclassing never adds
// any, per RAW), so this is keyed off characterData.class.
export function deriveSavingThrows(characterClass) {
  const out = {};
  for (const ability of CLASS_SAVING_THROWS[characterClass] || []) {
    out[ability] = true;
  }
  return out;
}

// ─── Proficiencies ───────────────────────────────────────────────────
// Shape: { armor: [], weapons: [], tools: [] }, aggregated across class +
// race (+ subrace) + background, deduped case-insensitively.
function dedup(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (item == null) continue;
    const key = String(item).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function raceProficiencies(race, subrace) {
  const base = RACE_PROFICIENCIES[race] || {};
  const sub = (subrace && RACE_PROFICIENCIES[subrace]) || {};
  return {
    armor: [...(base.armor || []), ...(sub.armor || [])],
    weapons: [...(base.weapons || []), ...(sub.weapons || [])],
    tools: [...(base.tools || []), ...(sub.tools || [])],
  };
}

export function deriveProficiencies(characterData = {}) {
  const cls = characterData.class;
  const armor = [];
  const weapons = [];
  const tools = [];

  // Class grants.
  for (const a of CLASS_ARMOR_PROFICIENCIES[cls] || []) armor.push(a);
  for (const w of CLASS_WEAPON_PROFICIENCIES[cls] || []) weapons.push(w);
  const classTools = CLASS_TOOL_PROFICIENCIES[cls];
  if (Array.isArray(classTools)) {
    // Choice-type class tool grants ({ type: 'choice', ... }) are a
    // player decision, not an automatic grant, so only the fixed arrays
    // are aggregated here.
    for (const t of classTools) tools.push(t);
  }

  // Racial grants (base + subrace).
  const rp = raceProficiencies(characterData.race, characterData.subrace);
  for (const a of rp.armor) armor.push(a);
  for (const w of rp.weapons) weapons.push(w);
  for (const t of rp.tools) tools.push(t);

  // Background tool grants.
  for (const t of getBackgroundTools(characterData.background) || []) tools.push(t);

  return { armor: dedup(armor), weapons: dedup(weapons), tools: dedup(tools) };
}

// ─── Armor Class ─────────────────────────────────────────────────────
// NOTE: there is no "equipped" concept in the creator — EquipmentStep
// writes only a flat `inventory` of { name } strings. AC is therefore
// inferred from inventory item names matched against ARMOR_TABLE (the
// best available signal): the highest-AC body armor present is treated
// as worn, and a "Shield" item grants +2. The formula itself is exact
// (light = full Dex, medium = Dex cap +2, heavy = flat; Barbarian/Monk
// unarmored defense when no armor). Accuracy is bounded by inventory
// data quality — see the brief's equipment-cleanup flag.
function normalizeArmorName(raw) {
  return String(raw || "").toLowerCase().trim().replace(/\s+armor$/, "").trim();
}

function matchArmorKey(rawName) {
  const norm = normalizeArmorName(rawName);
  const raw = String(rawName || "").toLowerCase().trim();
  for (const key of Object.keys(ARMOR_TABLE)) {
    const k = key.toLowerCase();
    if (k === norm || k === raw) return key;
  }
  return null;
}

function scanInventoryArmor(inventory) {
  const inv = Array.isArray(inventory) ? inventory : [];
  let bodyArmor = null;
  let hasShield = false;
  for (const item of inv) {
    const key = matchArmorKey(item?.name);
    if (!key) continue;
    const entry = ARMOR_TABLE[key];
    if (entry.type === "shield") {
      hasShield = true;
    } else if (!bodyArmor || entry.ac > bodyArmor.ac) {
      bodyArmor = { name: key, ...entry };
    }
  }
  return { bodyArmor, hasShield };
}

export function deriveArmorClass(characterData = {}) {
  const attrs = characterData.attributes || {};
  const dexMod = abilityModifier(attrs.dex ?? 10);
  const { bodyArmor, hasShield } = scanInventoryArmor(characterData.inventory);

  // Worn armor: exact armor formula (+2 for shield) via the real helper.
  if (bodyArmor) {
    return calculateAC(bodyArmor, dexMod, hasShield);
  }

  // Unarmored.
  const cls = characterData.class;
  if (cls === "Barbarian") {
    // Barbarian unarmored defense explicitly allows a shield.
    return unarmoredDefense("Barbarian", dexMod, abilityModifier(attrs.con ?? 10)) + (hasShield ? 2 : 0);
  }
  if (cls === "Monk") {
    // Monk unarmored defense requires no shield; with one it's voided.
    if (hasShield) return 10 + dexMod + 2;
    return unarmoredDefense("Monk", dexMod, abilityModifier(attrs.wis ?? 10));
  }
  return 10 + dexMod + (hasShield ? 2 : 0);
}
