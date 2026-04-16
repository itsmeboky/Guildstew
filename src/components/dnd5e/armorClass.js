/**
 * Compute a character's effective AC from their equipped armor + DEX.
 *
 * D&D 5e rules summary (the ones we care about here):
 *   - No armor:  AC = 10 + DEX
 *   - Light armor (Leather, Studded, Padded):   AC = armor base + DEX
 *   - Medium armor (Hide, Chain Shirt, Scale, Breastplate, Half Plate):
 *                  AC = armor base + min(DEX, 2)
 *   - Heavy armor (Ring Mail, Chain Mail, Splint, Plate):
 *                  AC = armor base (DEX ignored)
 *   - Shield:       +2 AC on top of any other armor
 *
 * The itemData entries express armor class as text ("11 + Dex modifier",
 * "13 + Dex modifier (max 2)", "16", "+2"). We parse the first integer
 * for the base AC and use the `type` field to decide which formula to
 * apply. A shield in an equipped slot always stacks on top.
 *
 * `equipped` is the map of slot → item that the GM panel keeps in
 * state. We look at `armor` (body slot), `implement` (shield slot in
 * the current layout), and any ring/off-hand slot that contains a
 * shield. Callers that use different slot names can pass a custom
 * `slotMap` to point at the right ones.
 */

import {
  abilityModifier,
  ARMOR_TABLE as REGISTRY_ARMOR_TABLE,
  unarmoredDefense as registryUnarmoredDefense,
} from '@/components/dnd5e/dnd5eRules';

const LIGHT_ARMOR = /light\s*armor/i;
const MEDIUM_ARMOR = /medium\s*armor/i;
const HEAVY_ARMOR = /heavy\s*armor/i;
const SHIELD = /shield/i;

function parseBaseAC(armorClassString, itemName) {
  // Try the textual field first ("11 + Dex modifier").
  if (armorClassString) {
    const match = String(armorClassString).match(/\d+/);
    if (match) return parseInt(match[0], 10);
  }
  // Fall back to the registry's ARMOR_TABLE if the item has a known name.
  if (itemName && REGISTRY_ARMOR_TABLE[itemName]) {
    return REGISTRY_ARMOR_TABLE[itemName].ac || 0;
  }
  return 0;
}

function parseShieldBonus(armorClassString) {
  if (!armorClassString) return 2;
  const match = String(armorClassString).match(/\+(\d+)/);
  return match ? parseInt(match[1], 10) : 2;
}

function isShieldItem(item) {
  if (!item) return false;
  const type = (item.type || "").toString();
  const category = (item.category || "").toString();
  return SHIELD.test(type) || (category === "armor" && SHIELD.test(type));
}

function armorKindFromItem(item) {
  if (!item) return null;
  const type = (item.type || "").toString();
  if (LIGHT_ARMOR.test(type)) return "light";
  if (MEDIUM_ARMOR.test(type)) return "medium";
  if (HEAVY_ARMOR.test(type)) return "heavy";
  if (SHIELD.test(type)) return "shield";
  return null;
}

/**
 * Compute effective AC for a character given their equipped items and
 * ability scores. Returns an object with the final number plus a
 * breakdown the GM panel can surface as a tooltip.
 *
 * @param {object} opts
 * @param {object} opts.equipped   - slot → item map
 * @param {number} opts.dex        - DEX ability score (10 if missing)
 * @param {number} [opts.baseAC]   - natural AC for monsters / custom
 *                                    shells (defaults to 10)
 */
export function computeArmorClass({ equipped, dex, baseAC = 10 }) {
  const dexScore = Number.isFinite(dex) ? dex : 10;
  const dexMod = abilityModifier(dexScore);

  // Collect every armor/shield item the character is wearing. We scan
  // every slot so a shield worn on an off-hand slot still counts.
  let bodyArmor = null;
  let shield = null;
  if (equipped && typeof equipped === "object") {
    for (const slotId of Object.keys(equipped)) {
      const item = equipped[slotId];
      if (!item) continue;
      const kind = armorKindFromItem(item);
      if (!kind) continue;
      if (kind === "shield") {
        shield = shield || item;
      } else if (!bodyArmor) {
        bodyArmor = item;
      }
    }
  }

  let bodyAC;
  let kind;
  const breakdown = {
    baseAC,
    dex: dexMod,
    armor: null,
    shield: null,
    total: 0,
    kind: "unarmored",
  };

  if (!bodyArmor) {
    // Unarmored — 10 + DEX (monsters can override via baseAC prop).
    bodyAC = baseAC + dexMod;
    kind = "unarmored";
  } else {
    const armorBase = parseBaseAC(bodyArmor.armorClass, bodyArmor.name);
    kind = armorKindFromItem(bodyArmor) || "light";
    breakdown.armor = { name: bodyArmor.name, base: armorBase, kind };
    if (kind === "light") {
      bodyAC = armorBase + dexMod;
    } else if (kind === "medium") {
      bodyAC = armorBase + Math.min(dexMod, 2);
    } else if (kind === "heavy") {
      bodyAC = armorBase; // DEX ignored
    } else {
      bodyAC = armorBase + dexMod;
    }
  }

  let shieldBonus = 0;
  if (shield) {
    shieldBonus = parseShieldBonus(shield.armorClass);
    breakdown.shield = { name: shield.name, bonus: shieldBonus };
  }

  const total = bodyAC + shieldBonus;
  breakdown.total = total;
  breakdown.kind = kind;
  return breakdown;
}
