import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { STARTING_EQUIPMENT } from "@/components/dnd5e/dnd5eRules";

/** STARTING_EQUIPMENT[class].choices is an array of objects like
 *  { option1: 'Mace', option2: 'Warhammer (if proficient)' } — one
 *  "choose one" per entry. Normalise to a list of option strings
 *  so the UI can render buttons. */
function optionsForChoice(choice) {
  if (!choice) return [];
  if (Array.isArray(choice)) return choice.flat().filter(Boolean);
  return Object.keys(choice)
    .filter((k) => /^option\d+$/i.test(k))
    .map((k) => choice[k])
    .filter(Boolean);
}

const ITEM_TYPE_FILTERS = [
  { value: "all",              label: "All Types" },
  { value: "weapon",           label: "Weapons" },
  { value: "armor",            label: "Armor" },
  { value: "adventuring gear", label: "Gear" },
  { value: "tool",             label: "Tools" },
];

export default function EquipmentStep({ characterData, updateCharacterData }) {
  const classKey = characterData.class;
  const entry = classKey ? STARTING_EQUIPMENT[classKey] : null;
  const fixedItems = entry?.fixed || [];
  const choices = useMemo(() => (entry?.choices || []).map(optionsForChoice), [entry]);

  const [selectedChoices, setSelectedChoices] = useState(
    Array.from({ length: choices.length }, (_, i) => (choices[i]?.[0] ?? "")),
  );

  const { data: allItems = [] } = useQuery({
    queryKey: ["srdItems"],
    queryFn: () => base44.entities.Dnd5eItem
      .list("name")
      .catch(() => []),
    staleTime: 5 * 60_000,
    initialData: [],
  });

  const [showItemBrowser, setShowItemBrowser] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("all");

  const inventory = Array.isArray(characterData.inventory) ? characterData.inventory : [];

  const addInventoryItem = () => {
    updateCharacterData({
      inventory: [...inventory, { name: "", quantity: 1, weight: 0, description: "" }],
    });
  };
  const removeInventoryItem = (index) => {
    updateCharacterData({ inventory: inventory.filter((_, i) => i !== index) });
  };
  const updateInventoryItem = (index, field, value) => {
    const next = inventory.slice();
    next[index] = { ...next[index], [field]: value };
    updateCharacterData({ inventory: next });
  };

  const addItemFromBrowser = (item) => {
    const weight = Number(item?.properties?.weight ?? item?.properties?._raw?.weight ?? 0) || 0;
    const description = typeof item?.description === "string" ? item.description.slice(0, 240) : "";
    updateCharacterData({
      inventory: [...inventory, { name: item.name, quantity: 1, weight, description }],
    });
    toast.success(`Added ${item.name}`);
  };

  const applyStartingEquipment = () => {
    const picked = selectedChoices.filter(Boolean);
    const all = [...fixedItems, ...picked];
    const items = all.map((name) => ({ name, quantity: 1, weight: 0, description: "" }));
    updateCharacterData({ inventory: [...inventory, ...items] });
    toast.success("Starting equipment added to inventory.");
  };

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    const type = itemTypeFilter;
    return (allItems || [])
      .filter((item) => {
        const nameMatch = !q || String(item.name || "").toLowerCase().includes(q);
        const itemType = String(item.type || item.category || "").toLowerCase();
        const typeMatch = type === "all" || itemType.includes(type);
        return nameMatch && typeMatch;
      })
      .slice(0, 50);
  }, [allItems, itemSearch, itemTypeFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
        <h2 className="text-2xl font-bold text-[#FFC6AA] mb-2">Equipment & Currency</h2>
        <p className="text-white">Choose your starting gear and gold.</p>
      </div>

      {classKey && entry && (
        <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430] space-y-5">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">
              Starting Equipment for {classKey}
            </h3>
            {fixedItems.length > 0 && (
              <>
                <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Included</p>
                <ul className="space-y-1 mb-4">
                  {fixedItems.map((item, idx) => (
                    <li key={idx} className="text-white">• {item}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {choices.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-widest text-slate-400">Choose One</p>
              {choices.map((opts, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-[#1E2430] rounded-lg border border-slate-700/50"
                >
                  <p className="text-xs text-slate-400 mb-2">Choice {idx + 1}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {opts.map((option) => {
                      const isSelected = selectedChoices[idx] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            const next = selectedChoices.slice();
                            next[idx] = option;
                            setSelectedChoices(next);
                          }}
                          className={`text-left px-3 py-2 rounded-lg border-2 transition-colors text-sm ${
                            isSelected
                              ? "border-[#37F2D1] bg-[#37F2D1]/10 text-white"
                              : "border-slate-700 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={applyStartingEquipment}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
          >
            Add Starting Equipment to Inventory
          </Button>

          {entry?.startingGold && (
            <p className="text-xs text-slate-400">
              Alternative starting gold: {entry.startingGold.dice} × {entry.startingGold.multiplier} gp.
            </p>
          )}
        </div>
      )}

      {/* Item browser — searches the shared dnd5e_items catalog */}
      <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-white">Browse Equipment</h3>
          <Button
            onClick={() => setShowItemBrowser(!showItemBrowser)}
            variant="outline"
            className="border-[#37F2D1]/30 text-[#37F2D1] hover:bg-[#37F2D1]/10"
          >
            {showItemBrowser ? "Hide" : "Browse Items"}
          </Button>
        </div>

        {showItemBrowser && (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search items…"
                  className="pl-7 bg-[#1E2430] border-[#2A3441] text-white"
                />
              </div>
              <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                <SelectTrigger className="w-40 bg-[#1E2430] border-[#2A3441] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPE_FILTERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1 bg-[#1E2430] rounded-lg border border-slate-700/50 divide-y divide-slate-700/30">
              {filteredItems.length === 0 ? (
                <p className="text-sm text-slate-500 italic p-4 text-center">
                  No items match these filters.
                </p>
              ) : filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItemFromBrowser(item)}
                  className="w-full flex items-center justify-between p-2 hover:bg-[#252b3d] text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.icon_url ? (
                      <img
                        src={item.icon_url}
                        alt=""
                        className="w-6 h-6 rounded object-cover flex-shrink-0"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded bg-slate-800 flex-shrink-0" />
                    )}
                    <span className="text-white text-sm truncate">{item.name}</span>
                    {item.type && (
                      <span className="text-xs text-slate-500 flex-shrink-0">{item.type}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.cost && (
                      <span className="text-xs text-slate-400">{typeof item.cost === "string" ? item.cost : ""}</span>
                    )}
                    <Plus className="w-4 h-4 text-[#37F2D1]" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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
          {inventory.map((item, index) => (
            <div key={index} className="bg-[#1E2430] rounded-xl p-4 border-2 border-[#2A3441]">
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5">
                  <Input
                    value={item.name}
                    onChange={(e) => updateInventoryItem(index, "name", e.target.value)}
                    placeholder="Item name"
                    className="bg-[#2A3441] border-[#2A3441] text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateInventoryItem(index, "quantity", parseInt(e.target.value) || 1)}
                    placeholder="Qty"
                    className="bg-[#2A3441] border-[#2A3441] text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={item.weight}
                    onChange={(e) => updateInventoryItem(index, "weight", parseFloat(e.target.value) || 0)}
                    placeholder="Weight"
                    className="bg-[#2A3441] border-[#2A3441] text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateInventoryItem(index, "description", e.target.value)}
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
          {["cp", "sp", "ep", "gp", "pp"].map((coin) => (
            <div key={coin}>
              <Label className="text-white mb-2 block uppercase font-bold">{coin}</Label>
              <Input
                type="number"
                min="0"
                value={characterData.currency?.[coin] || 0}
                onChange={(e) => updateCharacterData({
                  currency: { ...characterData.currency, [coin]: parseInt(e.target.value) || 0 },
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
