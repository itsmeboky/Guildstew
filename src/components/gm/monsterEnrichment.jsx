import { allItemsWithEnchanted, itemIcons } from "@/components/dnd5e/itemData";
import { canEquipToSlot } from "./equipmentRules";

export function enrichMonster(monster) {
  // Deep copy to avoid mutating original if needed, though usually we want a new object
  const enriched = { ...monster };
  
  // Initialize inventory and equipped if missing
  if (!enriched.inventory) enriched.inventory = [];
  if (!enriched.equipped) enriched.equipped = {};

  // Look for actions in both root and stats object
  const actions = enriched.actions || enriched.stats?.actions || [];
  const foundItems = [];

  // Helper to find item by fuzzy name match
  const findItem = (name) => {
    if (!name) return null;
    // Clean up the name: remove punctuation, extra spaces, lowercase
    const cleanName = name.replace(/[.,;:]/g, '').trim().toLowerCase();
    
    // 1. Exact match
    let item = allItemsWithEnchanted.find(i => i.name.toLowerCase() === cleanName);
    if (item) return item;
    
    // 2. Starts with match
    const startsWithMatches = allItemsWithEnchanted.filter(i => cleanName.startsWith(i.name.toLowerCase()));
    if (startsWithMatches.length > 0) {
      return startsWithMatches.sort((a, b) => b.name.length - a.name.length)[0];
    }

    // 3. Includes match
    const includesMatches = allItemsWithEnchanted.filter(i => cleanName.includes(i.name.toLowerCase()));
    if (includesMatches.length > 0) {
      return includesMatches.sort((a, b) => b.name.length - a.name.length)[0];
    }
    
    return null;
  };

  // Extract from actions
  actions.forEach(action => {
    // Handle both object actions and string actions if any
    const actionName = typeof action === 'string' ? action : action?.name;
    if (!actionName) return;

    const item = findItem(actionName);
    if (item) {
      // Use a default image if icon is missing, but prefer itemIcons
      const imageUrl = itemIcons[item.name] || item.image_url || 'https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/2bbbf582f_2.png'; // fallback club/generic icon
      foundItems.push({ ...item, image_url: imageUrl, quantity: 1 });
    }
  });

  // Let's try to parse string representation if possible
  let acString = "";
  if (typeof enriched.armor_class === 'string') acString = enriched.armor_class;
  else if (enriched.stats?.armor_class && typeof enriched.stats.armor_class === 'string') acString = enriched.stats.armor_class;
  else if (Array.isArray(enriched.armor_class)) {
      enriched.armor_class.forEach(ac => {
          if (ac.armor) {
              ac.armor.forEach(a => {
                  const item = findItem(a.name);
                  if (item) foundItems.push({ ...item, image_url: itemIcons[item.name], quantity: 1 });
              });
          }
      });
  }

  if (acString) {
      // Regex to find content in parens e.g. "15 (leather armor, shield)"
      const match = acString.match(/\(([^)]+)\)/);
      if (match) {
          const parts = match[1].split(',').map(s => s.trim());
          parts.forEach(part => {
              const item = findItem(part);
              if (item) foundItems.push({ ...item, image_url: itemIcons[item.name], quantity: 1 });
          });
      }
  }

  // --- New Logic: Parse Spells and Level from Traits ---
  // Include 'abilities' array which is common for CampaignNPC entities
  const traits = [
    ...(enriched.special_abilities || []),
    ...(enriched.stats?.special_abilities || []),
    ...(enriched.traits || []),
    ...(enriched.stats?.traits || []),
    ...(enriched.abilities || []),
    ...(enriched.stats?.abilities || [])
  ];

  // 1. Try to find Spellcasting or Innate Spellcasting
  const spellcastingTrait = traits.find(t => {
    const name = (t.name || "").toLowerCase();
    return name.includes("spellcasting");
  });

  if (spellcastingTrait) {
    const desc = spellcastingTrait.desc || spellcastingTrait.description || "";

    // A. Parse Level if missing (Prioritize this even if CR exists, as 'Level ?' indicates user wants level)
    // Allow "9th-level", "9th level", "Level 9" (though regex below focuses on Xth-level pattern common in 5e)
    // Modified to be optional ordinal and allow space or dash
    const levelMatch = desc.match(/(\d+)(?:st|nd|rd|th)?[\s-]level spellcaster/i);
    if (levelMatch) {
        enriched.level = parseInt(levelMatch[1]);
        // Ensure stats object exists to populate level there too as fallback
        if (!enriched.stats) enriched.stats = {};
        enriched.stats.level = parseInt(levelMatch[1]);
    }

    // B. Parse Spells if missing
    if ((!enriched.spells || enriched.spells.length === 0) && desc) {
        const extractedSpells = [];
        
        // Handle various delimiters: newlines, semicolons, or just period-separated sentences
        const segments = desc.split(/\n|;|(?<=\.)\s/);
        
        segments.forEach(segment => {
            if (segment.includes(':')) {
                // Split by the first colon only
                const colonIndex = segment.indexOf(':');
                const header = segment.substring(0, colonIndex);
                const list = segment.substring(colonIndex + 1);
                
                // Check if header looks like a spell level indicator (e.g., "Cantrips", "1st level", "At will")
                // or just treat any colon-separated list as potential spells if we are in a Spellcasting trait
                
                const potentialSpells = list.split(',').map(s => s.trim());
                potentialSpells.forEach(s => {
                    // Clean up spell name
                    // Remove parenthetical notes like "(self only)" or "(3 slots)"
                    // Remove trailing periods
                    // Remove leading/trailing whitespace
                    let cleanName = s.replace(/\([^)]*\)/g, '').replace(/\.$/, '').trim();
                    
                    // Skip empty or too short
                    if (cleanName.length < 2) return;
                    
                    // Skip if it looks like "X slots" or similar metadata that might have been caught
                    if (/^\d+\s+slots?$/.test(cleanName)) return;

                    // Capitalize
                    cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                    
                    // Avoid duplicates
                    if (!extractedSpells.includes(cleanName)) {
                        extractedSpells.push(cleanName);
                    }
                });
            }
        });
        
        if (extractedSpells.length > 0) {
            enriched.spells = extractedSpells;
        }
    }
  }

  // Auto-equip found items
  const newEquipped = { ...enriched.equipped };
  const newInventory = [...enriched.inventory];

  foundItems.forEach(item => {
      // Try to equip
      let equipped = false;
      
      // Logic for slots
      const tryEquip = (slotId) => {
          if (!newEquipped[slotId] && canEquipToSlot(item, slotId)) {
              newEquipped[slotId] = item;
              return true;
          }
          return false;
      };

      if (item.category === 'armor') {
          if (item.type.toLowerCase().includes('shield')) {
              // Prefer weapon2 for shield, but if taken try armor slot?
              // SLOT_RESTRICTIONS for weapon2 accepts shield.
              // SLOT_RESTRICTIONS for armor accepts shield special case.
              if (!tryEquip('weapon2')) {
                  tryEquip('armor');
              }
              equipped = true;
          } else {
              equipped = tryEquip('armor');
          }
      } else if (item.category === 'weapons') {
          if (item.type.toLowerCase().includes('ranged')) {
              equipped = tryEquip('ranged');
          } else {
              // Melee
              if (!tryEquip('weapon1')) {
                  tryEquip('weapon2');
              }
              equipped = true;
          }
      }

      // If not equipped, add to inventory (if not already there)
      // Since we want to separate equipped from inventory, items in equipped should NOT be in inventory
      // Items not equipped go to inventory
      const isEquipped = Object.values(newEquipped).some(eq => eq.name === item.name);
      
      if (!isEquipped) {
          // Check if already in inventory
          const existing = newInventory.find(i => i.name === item.name);
          if (!existing) {
              newInventory.push(item);
          }
      }
  });

  enriched.inventory = newInventory;
  enriched.equipped = newEquipped;

  return enriched;
}