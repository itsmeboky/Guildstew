
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { STARTING_EQUIPMENT } from '@/components/dnd5e/dnd5eRules';

// Build a flat string array from the registry's STARTING_EQUIPMENT
// so the existing grid render keeps working. STARTING_EQUIPMENT has
// { fixed: [...], choices: [...], startingGold: { dice, multiplier } }
// per class. We combine fixed items + first option of each choice
// into a display-friendly flat list.
function getDefaultEquipment(className) {
  const entry = STARTING_EQUIPMENT[className];
  if (!entry) return [];
  const items = [...(entry.fixed || [])];
  (entry.choices || []).forEach((choice) => {
    // Each choice is an array of options — pick the first as default
    if (Array.isArray(choice) && choice.length > 0) {
      const first = Array.isArray(choice[0]) ? choice[0] : [choice[0]];
      items.push(...first);
    }
  });
  return items;
}

export default function EquipmentStep({ characterData, updateCharacterData }) {
  const classEquipment = getDefaultEquipment(characterData.class);

  const addInventoryItem = () => {
    const newItem = { name: "", quantity: 1, weight: 0, description: "" };
    updateCharacterData({
      inventory: [...(characterData.inventory || []), newItem]
    });
  };

  const removeInventoryItem = (index) => {
    const newInventory = characterData.inventory.filter((_, i) => i !== index);
    updateCharacterData({ inventory: newInventory });
  };

  const updateInventoryItem = (index, field, value) => {
    const newInventory = [...characterData.inventory];
    newInventory[index] = { ...newInventory[index], [field]: value };
    updateCharacterData({ inventory: newInventory });
  };

  const useStartingEquipment = () => {
    const inventory = classEquipment.map(item => ({
      name: item,
      quantity: 1,
      weight: 1,
      description: ""
    }));
    updateCharacterData({ inventory });
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
        <h2 className="text-2xl font-bold text-[#FFC6AA] mb-2">Equipment & Currency</h2>
        <p className="text-white">Choose your starting gear and gold</p>
      </div>

      {characterData.class && (
        <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
          <h3 className="text-lg font-bold text-white mb-3">Starting Equipment for {characterData.class}</h3>
          <ul className="space-y-1 mb-4">
            {classEquipment.map((item, idx) => (
              <li key={idx} className="text-white">• {item}</li>
            ))}
          </ul>
          <Button
            onClick={useStartingEquipment}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
          >
            Use Starting Equipment
          </Button>
        </div>
      )}

      <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Inventory</h3>
          <Button
            onClick={addInventoryItem}
            size="sm"
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {characterData.inventory?.map((item, index) => (
            <div key={index} className="bg-[#1E2430] rounded-xl p-4 border-2 border-[#2A3441]">
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5">
                  <Input
                    value={item.name}
                    onChange={(e) => updateInventoryItem(index, 'name', e.target.value)}
                    placeholder="Item name"
                    className="bg-[#2A3441] border-[#2A3441] text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateInventoryItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    placeholder="Qty"
                    className="bg-[#2A3441] border-[#2A3441] text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={item.weight}
                    onChange={(e) => updateInventoryItem(index, 'weight', parseFloat(e.target.value) || 0)}
                    placeholder="Weight"
                    className="bg-[#2A3441] border-[#2A3441] text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateInventoryItem(index, 'description', e.target.value)}
                    placeholder="Notes"
                    className="bg-[#2A3441] border-[#2A3441] text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    onClick={() => removeInventoryItem(index)}
                    size="icon"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
        <h3 className="text-lg font-bold text-white mb-4">Starting Currency</h3>
        <div className="grid grid-cols-5 gap-4">
          {['cp', 'sp', 'ep', 'gp', 'pp'].map((coin) => (
            <div key={coin}>
              <Label className="text-white mb-2 block uppercase font-bold">{coin}</Label>
              <Input
                type="number"
                min="0"
                value={characterData.currency?.[coin] || 0}
                onChange={(e) => updateCharacterData({
                  currency: { ...characterData.currency, [coin]: parseInt(e.target.value) || 0 }
                })}
                className="bg-[#1E2430] border-[#1E2430] text-white text-center placeholder:text-gray-500"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-white mt-3 bg-[#1E2430] p-2 rounded">
          CP = Copper, SP = Silver, EP = Electrum, GP = Gold, PP = Platinum
        </p>
      </div>
    </div>
  );
}
