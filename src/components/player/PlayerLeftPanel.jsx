import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Shield, Zap, Skull, Crosshair } from "lucide-react";
import { itemIcons } from "@/components/dnd5e/itemData";
import { spellIcons } from "@/components/dnd5e/spellData";
import { safeText } from "@/utils/safeRender";

const CLASS_ICONS = {
  "Barbarian": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a6652f2d8_Barbarian1.png",
  "Bard": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/cbe7f7dba_Bard1.png",
  "Cleric": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/15fe6ef24_Cleric1.png",
  "Druid": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/ef43c9ff2_Druid1.png",
  "Fighter": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/5e1b2cd68_Fighter1.png",
  "Monk": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/f2e85e13a_Monk1.png",
  "Paladin": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/1eb7cd2f2_Paladin1.png",
  "Ranger": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/748e5be38_Ranger1.png",
  "Rogue": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a66f2aac1_Rogue1.png",
  "Sorcerer": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/6f5b501db_Sorceror1.png",
  "Warlock": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/184c98268_Warlock1.png",
  "Wizard": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/94cfaa28a_Wizard1.png"
};

export default function PlayerLeftPanel({ character, userProfile }) {
  const [activeTab, setActiveTab] = useState("melee"); // melee, spells

  if (!character) return <div className="text-white">Loading character...</div>;

  const equipmentSlots = {
    head: character.equipment?.armor?.head || null,
    armor: character.equipment?.armor?.armor || null,
    hands: character.equipment?.armor?.hands || null,
    feet: character.equipment?.armor?.feet || null,
    ring1: character.equipment?.armor?.ring1 || null,
    ring2: character.equipment?.armor?.ring2 || null,
    neck: character.equipment?.armor?.neck || null,
    back: character.equipment?.armor?.back || null,
    mainHand: character.equipment?.weapons?.[0] || null,
    offHand: character.equipment?.weapons?.[1] || null,
    ranged: character.equipment?.weapons?.find(w => w.range) || null,
  };

  // Helper to render attacks
  const renderAttacks = () => {
    if (activeTab === "melee") {
      const weapons = character.equipment?.weapons || [];
      return (
        <div className="space-y-2">
          {weapons.map((w, i) => (
            <div key={i} className="flex items-center justify-between bg-[#111827] p-2 rounded border border-gray-700">
              <div className="flex items-center gap-2">
                {/* Weapon Icon Placeholder */}
                <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center">
                  <Crosshair className="w-4 h-4 text-gray-400" />
                </div>
                <span className="text-sm font-bold text-gray-200">{w.name}</span>
              </div>
              <span className="text-sm font-mono text-[#37F2D1]">{w.damage || "1d6"}</span>
            </div>
          ))}
          {weapons.length === 0 && <p className="text-xs text-gray-500">No weapons equipped.</p>}
        </div>
      );
    } else {
      // Spells
      const spells = character.spells?.known_spells || [];
      return (
        <div className="space-y-2">
          {spells.map((s, i) => (
            <div key={i} className="flex items-center justify-between bg-[#111827] p-2 rounded border border-gray-700">
              <div className="flex items-center gap-2">
                 {/* Spell Icon Placeholder */}
                 <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-sm font-bold text-gray-200">{s.name}</span>
              </div>
              <span className="text-sm font-mono text-purple-300">{s.damage || "?"}</span>
            </div>
          ))}
           {spells.length === 0 && <p className="text-xs text-gray-500">No spells known.</p>}
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Profile Card */}
      <div className="bg-[#050816] rounded-2xl p-4 border border-[#1e293b] shadow-lg flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#37F2D1]/10 to-transparent pointer-events-none" />
        
        <div className="relative w-24 h-24 rounded-full border-2 border-[#37F2D1] p-1 mb-3">
          <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
            {character.profile_avatar_url ? (
              <img src={character.profile_avatar_url} alt={character.name} className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">?</div>
            )}
          </div>
          {/* Class Icon Badge */}
          {CLASS_ICONS[character.class] && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#050816] rounded-full border border-[#37F2D1] p-1">
              <img src={CLASS_ICONS[character.class]} alt={character.class} className="w-full h-full object-contain" />
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold text-white">{character.name}</h2>
        <p className="text-xs text-[#37F2D1] mb-1">Level {character.level} {character.race} {character.class}</p>
        <p className="text-[10px] text-gray-400">{userProfile?.username || "Player"}</p>
        
        {/* Class Icon Large Watermark */}
        <div className="mt-4 text-[#FF5722]">
           {/* Decorative Element */}
           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-50 mx-auto">
             <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
           </svg>
        </div>

        <Button 
          className="w-full mt-4 bg-[#FF5722] hover:bg-[#FF6B3D] text-white font-bold"
          onClick={() => {
            // Logic to roll initiative - typically sends a message to chat or updates character
            // For now, just visual feedback or log
            const roll = Math.floor(Math.random() * 20) + 1;
            // Maybe emit to log if possible, or just toast
            // In a real app, we'd mutate the campaign log here
          }}
        >
          Roll Initiative
        </Button>
      </div>

      {/* Attacks Box */}
      <div className="bg-[#050816] rounded-2xl border border-[#1e293b] shadow-lg overflow-hidden">
        <div className="flex border-b border-[#1e293b]">
          <button 
            onClick={() => setActiveTab("melee")}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === "melee" ? "bg-[#1E2430] text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            Melee
          </button>
          <button 
            onClick={() => setActiveTab("spells")}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === "spells" ? "bg-[#1E2430] text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            Spells
          </button>
        </div>
        <div className="p-3 min-h-[150px]">
          {renderAttacks()}
        </div>
      </div>

      {/* Equipment Layout */}
      <div className="bg-[#050816] rounded-2xl border border-[#1e293b] shadow-lg p-4 relative">
        <h3 className="text-[10px] uppercase tracking-widest text-gray-500 mb-4 text-center">Equipment</h3>
        
        <div className="relative h-64 w-full">
           {/* Silhouette */}
           <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
             <img src="https://static.wixstatic.com/media/5cdfd8_95e7b63afc9a444e97bbadc37e59b154~mv2.png" alt="Silhouette" className="h-full object-contain" />
           </div>

           {/* Slots - Positioned Absolutely roughly matching the silhouette */}
           {/* Left Side */}
           <EquipSlot item={equipmentSlots.head} label="Head" className="absolute top-0 left-2" />
           <EquipSlot item={equipmentSlots.armor} label="Armor" className="absolute top-16 left-2" />
           <EquipSlot item={equipmentSlots.hands} label="Hands" className="absolute top-32 left-2" />
           <EquipSlot item={equipmentSlots.feet} label="Feet" className="absolute bottom-0 left-2" />

           {/* Right Side */}
           <EquipSlot item={equipmentSlots.neck} label="Neck" className="absolute top-0 right-2" />
           <EquipSlot item={equipmentSlots.back} label="Back" className="absolute top-16 right-2" />
           <EquipSlot item={equipmentSlots.ring1} label="Ring" className="absolute top-32 right-2" />
           <EquipSlot item={equipmentSlots.ring2} label="Ring" className="absolute bottom-0 right-2" />

           {/* Bottom/Weapons */}
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2">
             <EquipSlot item={equipmentSlots.mainHand} label="Main" />
             <EquipSlot item={equipmentSlots.offHand} label="Off" />
           </div>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="bg-[#050816] rounded-2xl border border-[#1e293b] shadow-lg p-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[10px] uppercase tracking-widest text-gray-500">Inventory</h3>
          <span className="text-[10px] text-gray-600">
            {character.inventory?.length || 0} items
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: 18 }).map((_, i) => {
            const item = character.inventory?.[i];
            return (
              <div key={i} className="aspect-square bg-[#111827] rounded border border-gray-800 flex items-center justify-center overflow-hidden relative group" title={safeText(item?.name)}>
                {item ? (
                  <>
                    {item.image_url ? (
                      <img src={item.image_url} alt={safeText(item.name)} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] text-gray-400">{safeText(item.name).slice(0, 2)}</span>
                    )}
                    {item.quantity > 1 && (
                      <span className="absolute bottom-0 right-0 text-[8px] bg-black/70 text-white px-1 rounded-tl">{safeText(item.quantity)}</span>
                    )}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EquipSlot({ item, label, className }) {
  return (
    <div className={`w-10 h-10 bg-[#111827] border border-gray-700 rounded flex items-center justify-center relative group ${className}`}>
      {item ? (
        <img src={item.image_url || itemIcons[item.name]} alt={item.name} className="w-full h-full object-cover rounded" />
      ) : (
        <span className="text-[8px] text-gray-600 uppercase">{label}</span>
      )}
      {item && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
          {item.name}
        </div>
      )}
    </div>
  );
}