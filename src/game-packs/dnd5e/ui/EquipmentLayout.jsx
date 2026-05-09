import React, { useState } from 'react';
import { canEquipToSlot } from '@/game-packs/dnd5e/content/items';
import { itemIcons } from '@/game-packs/dnd5e/data/itemData';
import { safeText } from '@/utils/safeRender';

/**
 * D&D 5e Equipment Layout
 *
 * Shared slot grid + slot drag/drop UI extracted from GMPanel and
 * CampaignPlayerPanel in Phase 1.12c-i of the Combat Engine v2 rebuild.
 *
 * Renders the equipment slot grid (head/armor/gauntlets/belt/boots on the
 * left, cloak/necklace/rings/implement on the right, weapon1/weapon2/ranged
 * along the bottom) for any character. State and handlers come from the
 * parent panel via props — this component owns no state beyond per-slot
 * tooltip/drag-over UI flags inside EquipmentSlot, and mutates nothing
 * outside its own props.
 *
 * The upper-grid wrapper has `relative` positioning so callers can render
 * an absolute-positioned silhouette image (and any panel-specific overlays
 * like target-selection or a CombatDiceWindow) by passing them as children.
 *
 * Out of scope (stays in caller — see Phase 1.12c-i spec):
 *   - InventorySlot (panel-specific divergence — deferred to Phase 2)
 *   - Drop handler bodies (different state models in GM vs Player panels)
 *   - AC computation (lives in @/game-packs/dnd5e/rules/armorClass)
 */

const equipmentSlots = {
  left: [
    { id: 'head', label: 'Head Gear' },
    { id: 'armor', label: 'Armor' },
    { id: 'gauntlets', label: 'Gauntlets' },
    { id: 'belt', label: 'Belt' },
    { id: 'boots', label: 'Boots' }
  ],
  right: [
    { id: 'cloak', label: 'Cloak' },
    { id: 'necklace', label: 'Necklace' },
    { id: 'ring1', label: 'Ring 1' },
    { id: 'ring2', label: 'Ring 2' },
    { id: 'implement', label: 'Implement' }
  ],
  bottom: [
    { id: 'weapon1', label: 'Weapon 1' },
    { id: 'weapon2', label: 'Weapon 2' },
    { id: 'ranged', label: 'Ranged' }
  ]
};

function EquipmentSlot({ label, size = 'normal', item, onDrop, onDragStart, onUnequip, isValidTarget }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const slotSize = size === 'large' ? 'w-16 h-16' : 'w-14 h-14';

  const borderColor = isDragOver && isValidTarget ? 'border-[#37F2D1] bg-[#37F2D1]/20' :
                      isDragOver && !isValidTarget ? 'border-red-500 bg-red-500/20' :
                      isValidTarget ? 'border-[#37F2D1] border-dashed bg-[#37F2D1]/5' :
                      item ? 'border-[#37F2D1]/50 bg-[#111827]' :
                      'border-[#111827] hover:border-[#22c5f5]/50';

  const itemImage = item ? (
    item.image_url ||
    itemIcons[item.name] ||
    itemIcons[Object.keys(itemIcons).find(k => k.toLowerCase() === item.name?.toLowerCase())] ||
    itemIcons[Object.keys(itemIcons).find(k => item.name?.toLowerCase().includes(k.toLowerCase()))]
  ) : null;

  return (
    <div className="relative">
      <div
        draggable={!!item}
        onDragStart={() => item && onDragStart && onDragStart(item)}
        onDragOver={(e) => {
          e.preventDefault();
          if (isValidTarget !== undefined) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          onDrop && onDrop();
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onDoubleClick={() => item && onUnequip && onUnequip()}
        className={`${slotSize} rounded-xl bg-[#0b1220] border-2 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.7)] flex items-center justify-center cursor-pointer overflow-hidden ${borderColor} ${isDragOver ? 'scale-105' : ''}`}
      >
        {item && itemImage ? (
          <img src={itemImage} alt={safeText(item.name)} className="w-full h-full object-cover" />
        ) : item ? (
          <span className="text-[8px] text-center text-slate-300 px-1 line-clamp-2">{safeText(item.name)}</span>
        ) : (
          <span className="text-[8px] text-center text-slate-600 px-1 leading-tight font-medium">{label}</span>
        )}
      </div>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1E2430] text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-50 shadow-xl border border-[#37F2D1]">
          {item ? `${label}: ${safeText(item.name)} (double-click to unequip)` : label}
        </div>
      )}
    </div>
  );
}

export default function EquipmentLayout({
  equippedItems = {},
  draggedItem,
  onDragStart,
  onDropOnSlot,
  onUnequip,
  isReadOnly = false,
  children,
}) {
  // Build the per-slot prop bag without `key` — React's "key prop in
  // a spread" warning fires when key is part of the spread, so callers
  // pass key={slot.id} directly and spread the rest.
  const slotProps = (slot, extra) => ({
    label: slot.label,
    item: equippedItems[slot.id],
    onDrop: isReadOnly ? undefined : () => onDropOnSlot && onDropOnSlot(slot.id),
    onDragStart: isReadOnly ? undefined : (item) => onDragStart && onDragStart(item, slot.id),
    onUnequip: isReadOnly ? undefined : () => onUnequip && onUnequip(slot.id),
    isValidTarget: draggedItem ? canEquipToSlot(draggedItem.item, slot.id) : undefined,
    ...extra,
  });

  return (
    <>
      <div className="w-full relative flex gap-3 justify-center mb-2">
        {children}
        <div className="flex flex-col gap-3 relative z-10">
          {equipmentSlots.left.map(slot => (
            <EquipmentSlot key={slot.id} {...slotProps(slot)} />
          ))}
        </div>
        <div className="w-32 flex-shrink-0 relative z-10"></div>
        <div className="flex flex-col gap-3 relative z-10">
          {equipmentSlots.right.map(slot => (
            <EquipmentSlot key={slot.id} {...slotProps(slot)} />
          ))}
        </div>
      </div>
      <div className="w-full flex gap-3 justify-center pt-2 border-t border-[#111827]">
        {equipmentSlots.bottom.map(slot => (
          <EquipmentSlot key={slot.id} {...slotProps(slot, { size: 'large' })} />
        ))}
      </div>
    </>
  );
}
