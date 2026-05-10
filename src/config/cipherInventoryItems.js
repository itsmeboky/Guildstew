// Cipher inventory items.
//
// Two non-removable special items are auto-granted to characters who
// carry the matching class. They're READ-ONLY UI triggers — the
// campaign's symbol→meaning mapping lives on
// campaigns.language_cipher_maps and is queried at modal-open time.
// Same item adapts to whichever campaign is active; the inventory
// row carries no mapping data of its own.
//
// Visibility rules:
//   - GM always sees the campaign mapping (they authored it).
//   - Class-eligible owner sees their personal copy via this item.
//   - Other characters see only raw symbols on entries — no decoder.
//
// Image assets live in Supabase Storage at
// campaign-assets/dnd5e/items/ alongside other SRD item art.

export const CANT_CYPHER_ID = "cant-cypher";
export const DRUIDIC_FIELD_GUIDE_ID = "druidic-field-guide";

export const CIPHER_INVENTORY_ITEMS = [
  {
    id: CANT_CYPHER_ID,
    name: "Cant Cypher",
    cipher_type: "thieves_cant",
    grant_class: "Rogue",
    image_url:
      "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/items/Cant%20Cypher.png",
    description:
      "A worn pocket book of symbols and their meanings. Cross-reference markings you find in the world to decode hidden Thieves' Cant.",
    quantity: 1,
    weight: 0,
    class_feature: true,
    removable: false,
  },
  {
    id: DRUIDIC_FIELD_GUIDE_ID,
    name: "Druidic Field Guide",
    cipher_type: "druidic",
    grant_class: "Druid",
    // Note: the public Supabase filename has a typo ("Drudic"); the
    // URL is intentionally encoded that way to match the bucket.
    image_url:
      "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/items/Drudic%20Field%20Guide.png",
    description:
      "A leaf-bound guide to the secret language of druids. The symbols within echo those carved into trees and stones across the wilds.",
    quantity: 1,
    weight: 0,
    class_feature: true,
    removable: false,
  },
];

const BY_ID = new Map(CIPHER_INVENTORY_ITEMS.map((it) => [it.id, it]));
const BY_NAME = new Map(CIPHER_INVENTORY_ITEMS.map((it) => [it.name, it]));

export function getCipherItem(idOrName) {
  return BY_ID.get(idOrName) || BY_NAME.get(idOrName) || null;
}

/**
 * True if this inventory row represents one of the cipher items —
 * either by id (new rows) or by name (legacy rows that lack ids).
 */
export function isCipherInventoryItem(item) {
  if (!item) return false;
  return Boolean(BY_ID.get(item.id) || BY_NAME.get(item.name));
}

/**
 * True if this inventory row is non-removable — covers the cipher
 * items today and any item that opts in via { removable: false } or
 * { class_feature: true } in the future.
 */
export function isLockedInventoryItem(item) {
  if (!item) return false;
  if (item.removable === false) return true;
  if (item.class_feature === true) return true;
  return isCipherInventoryItem(item);
}

const CLASS_ITEMS = {
  Rogue: getCipherItem(CANT_CYPHER_ID),
  Druid: getCipherItem(DRUIDIC_FIELD_GUIDE_ID),
};

/**
 * Returns the cipher items a character should own based on their
 * primary class + any multiclass entries. Multiclass-into-rogue OR
 * druid grants the corresponding item even if the primary class is
 * something else.
 */
export function cipherItemsForCharacter(character) {
  if (!character) return [];
  const classes = new Set();
  if (character.class) classes.add(character.class);
  if (Array.isArray(character.multiclasses)) {
    for (const mc of character.multiclasses) {
      if (mc?.class) classes.add(mc.class);
    }
  }
  const items = [];
  for (const cls of classes) {
    const item = CLASS_ITEMS[cls];
    if (item) items.push(item);
  }
  return items;
}
