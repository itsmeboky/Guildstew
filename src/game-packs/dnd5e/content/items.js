export const SLOT_RESTRICTIONS = {
  head: { types: ['light armor', 'medium armor', 'heavy armor'], keywords: ['helm', 'hat', 'hood', 'crown', 'circlet', 'headband'] },
  armor: { categories: ['armor'], types: ['light armor', 'medium armor', 'heavy armor'], keywords: ['armor', 'mail', 'plate', 'breastplate', 'hide'] },
  gauntlets: { keywords: ['gloves', 'gauntlet', 'bracer'] },
  belt: { keywords: ['belt', 'girdle', 'sash'] },
  boots: { keywords: ['boots', 'shoes', 'slippers', 'greaves'] },
  cloak: { keywords: ['cloak', 'cape', 'mantle'] },
  necklace: { keywords: ['necklace', 'amulet', 'pendant', 'periapt', 'medallion'] },
  ring1: { keywords: ['ring'] },
  ring2: { keywords: ['ring'] },
  implement: { keywords: ['wand', 'rod', 'staff', 'orb', 'focus', 'holy symbol', 'arcane focus', 'druidic focus', 'instrument', 'lute', 'flute', 'drum', 'horn', 'bagpipes', 'dulcimer', 'lyre', 'viol', 'shawm'] },
  weapon1: { categories: ['weapons'], keywords: ['sword', 'axe', 'dagger', 'mace', 'hammer', 'flail', 'glaive', 'halberd', 'lance', 'maul', 'morningstar', 'pike', 'rapier', 'scimitar', 'trident', 'pick', 'whip', 'spear', 'staff', 'javelin', 'club', 'sickle', 'blade'] },
  weapon2: { categories: ['weapons'], keywords: ['shield', 'sword', 'axe', 'dagger', 'mace', 'hammer', 'flail', 'glaive', 'halberd', 'lance', 'maul', 'morningstar', 'pike', 'rapier', 'scimitar', 'trident', 'pick', 'whip', 'spear', 'staff', 'javelin', 'club', 'sickle', 'blade'] },
  ranged: { categories: ['weapons'], types: ['simple ranged weapon', 'martial ranged weapon'], keywords: ['bow', 'crossbow', 'sling', 'dart', 'javelin', 'thrown', 'blowgun', 'net'] }
};

export function canEquipToSlot(item, slotId) {
  const restrictions = SLOT_RESTRICTIONS[slotId];
  if (!restrictions) return true; // No restrictions = accept all
  
  const itemName = (item.name || '').toLowerCase();
  const itemType = (item.type || '').toLowerCase();
  const itemCategory = (item.category || '').toLowerCase();
  
  // Check categories
  if (restrictions.categories?.some(cat => itemCategory === cat)) return true;
  
  // Check types
  if (restrictions.types?.some(t => itemType.includes(t))) return true;
  
  // Check keywords in name or type
  if (restrictions.keywords?.some(kw => itemName.includes(kw) || itemType.includes(kw))) return true;
  
  // Special case: shields can go in armor slot too
  if (slotId === 'armor' && itemType.includes('shield')) return true;
  
  return false;
}