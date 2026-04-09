import React, { useState, useEffect } from "react";
import { Coins, Plus, Trash2, Dices, RefreshCw, ChevronRight, ChevronDown, Search, Package, X, User } from "lucide-react";
import { allItemsWithEnchanted, itemIcons } from "@/components/dnd5e/itemData";
import { base44 } from "@/api/base44Client";

export default function LootManager({ campaignId, lootData, players, onUpdateLoot }) {
  const [items, setItems] = useState(lootData?.items || []);
  const [currency, setCurrency] = useState(lootData?.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
  const [settings, setSettings] = useState(lootData?.settings || { split_gold_evenly: true, level_up: false, random_items: false });
  const [isDistributed, setIsDistributed] = useState(lootData?.is_distributed || false);
  
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [showMoneyInput, setShowMoneyInput] = useState(false);
  const [showManualDistribution, setShowManualDistribution] = useState(false);

  useEffect(() => {
    if (lootData) {
      setItems(lootData.items || []);
      setCurrency(lootData.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
      setSettings(lootData.settings || { split_gold_evenly: true, level_up: false, random_items: false });
      setIsDistributed(lootData.is_distributed || false);
    }
  }, [lootData]);

  const handleDistributeClick = () => {
    if (isDistributed) {
      handleSave(true);
      return;
    }

    // If manual distribution is needed (Split Gold OFF OR Random Items OFF with items present)
    if (!settings.split_gold_evenly || (!settings.random_items && items.length > 0)) {
      setShowManualDistribution(true);
      return; 
    }

    executeDistribution();
  };

  const executeDistribution = (manualDistribution = null) => {
    let finalItems = [...items];
    let finalCurrency = { ...currency };

    // Random Item Distribution (if ON)
    if (settings.random_items && players && players.length > 0 && items.length > 0) {
      const promises = [];
      items.forEach(item => {
        const randomPlayer = players[Math.floor(Math.random() * players.length)];
        if (randomPlayer && randomPlayer.character) {
          const char = randomPlayer.character;
          const newInventory = [...(char.inventory || []), item];
          promises.push(base44.entities.Character.update(char.id, { inventory: newInventory }));
        }
      });
      finalItems = []; 
      Promise.all(promises);
    }

    // Manual Distribution Handling
    if (manualDistribution) {
      const promises = [];
      
      // 1. Distribute Currency
      if (manualDistribution.currency) {
        Object.entries(manualDistribution.currency).forEach(([playerId, amountObj]) => {
          const player = players.find(p => p.user_id === playerId);
          if (player && player.character) {
            const char = player.character;
            const current = char.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
            const newMoney = { 
              cp: current.cp + (amountObj.cp || 0),
              sp: current.sp + (amountObj.sp || 0),
              ep: current.ep + (amountObj.ep || 0),
              gp: current.gp + (amountObj.gp || 0),
              pp: current.pp + (amountObj.pp || 0)
            };
            promises.push(base44.entities.Character.update(char.id, { currency: newMoney }));
          }
        });
        // Clear distributed currency from pool
        finalCurrency = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
      }

      // 2. Distribute Items
      if (manualDistribution.items) {
        // manualDistribution.items is map of itemId -> playerId
        const assignedItemIds = Object.keys(manualDistribution.items);
        const itemsToKeep = [];
        
        // Group items by player for fewer API calls
        const playerItems = {};

        items.forEach(item => {
          const assignedTo = manualDistribution.items[item.id];
          if (assignedTo) {
            if (!playerItems[assignedTo]) playerItems[assignedTo] = [];
            playerItems[assignedTo].push(item);
          } else {
            itemsToKeep.push(item); // Not assigned manually, keep in pool (or move to loot box)
          }
        });

        Object.entries(playerItems).forEach(([playerId, pItems]) => {
          const player = players.find(p => p.user_id === playerId);
          if (player && player.character) {
            const char = player.character;
            const newInventory = [...(char.inventory || []), ...pItems];
            promises.push(base44.entities.Character.update(char.id, { inventory: newInventory }));
          }
        });

        // Remaining items go to loot box if Random was OFF and they weren't manually assigned
        finalItems = itemsToKeep;
      }

      Promise.all(promises);
    }

    handleSave(true, finalItems, finalCurrency);
  };

  const handleSave = (distributed = isDistributed, overrideItems = items, overrideCurrency = currency) => {
    setIsDistributed(distributed);
    onUpdateLoot({
      items: overrideItems,
      currency: overrideCurrency,
      settings,
      is_distributed: distributed
    });
  };

  const addItem = (item) => {
    setItems([...items, { ...item, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const removeItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const generateRandomLoot = (cr) => {
    const randomGold = Math.floor(Math.random() * (cr * 10)) + 10;
    setCurrency(prev => ({ ...prev, gp: prev.gp + randomGold }));
    const randomItem = allItemsWithEnchanted[Math.floor(Math.random() * allItemsWithEnchanted.length)];
    addItem(randomItem);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={handleDistributeClick}
          className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
            isDistributed 
              ? "bg-green-500/20 text-green-400 border border-green-500/50" 
              : "bg-[#37F2D1] text-[#1E2430] hover:bg-[#2dd9bd]"
          }`}
        >
          {isDistributed ? "Update Distributed Loot" : "DISTRIBUTE LOOT"}
        </button>
        {isDistributed && (
          <button
            onClick={() => handleSave(false)}
            className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 text-xs font-bold"
          >
            Retract
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] flex-wrap">
        <TogglePill 
          label="Level Up After" 
          active={settings.level_up} 
          onClick={() => setSettings(s => ({...s, level_up: !s.level_up}))} 
        />
        <TogglePill 
          label="Split Gold Evenly" 
          active={settings.split_gold_evenly} 
          onClick={() => setSettings(s => ({...s, split_gold_evenly: !s.split_gold_evenly}))} 
        />
        <TogglePill 
          label="Random Distribution" 
          active={settings.random_items} 
          onClick={() => setSettings(s => ({...s, random_items: !s.random_items}))} 
        />
      </div>

      <div className="bg-[#0b1220] rounded-xl p-3 border border-[#111827]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
            <Coins className="w-3 h-3" /> Currency
          </span>
          <button 
            onClick={() => setShowMoneyInput(!showMoneyInput)}
            className="text-[10px] text-[#37F2D1] hover:underline"
          >
            {showMoneyInput ? "Done" : "Edit"}
          </button>
        </div>
        
        {showMoneyInput ? (
          <div className="grid grid-cols-5 gap-2">
            {['cp', 'sp', 'ep', 'gp', 'pp'].map(type => (
              <div key={type} className="flex flex-col items-center">
                <span className="text-[9px] text-slate-500 uppercase">{type}</span>
                <input
                  type="number"
                  value={currency[type]}
                  onChange={(e) => setCurrency({...currency, [type]: parseInt(e.target.value) || 0})}
                  className="w-full bg-[#1a1f2e] border border-[#2A3441] rounded px-1 py-0.5 text-center text-xs text-white focus:border-[#37F2D1] outline-none"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 text-xs text-slate-300">
            {currency.gp > 0 && <span><span className="text-yellow-500">{currency.gp}</span> GP</span>}
            {currency.sp > 0 && <span><span className="text-slate-400">{currency.sp}</span> SP</span>}
            {currency.cp > 0 && <span><span className="text-orange-700">{currency.cp}</span> CP</span>}
            {currency.pp > 0 && <span><span className="text-slate-200">{currency.pp}</span> PP</span>}
            {currency.ep > 0 && <span><span className="text-slate-500">{currency.ep}</span> EP</span>}
            {Object.values(currency).every(v => v === 0) && <span className="text-slate-600 italic">No currency</span>}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-purple-400 flex items-center gap-2">
            <Package className="w-3 h-3" /> Items ({items.length})
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => generateRandomLoot(5)} 
              className="text-[10px] bg-[#1a1f2e] hover:bg-[#2A3441] text-slate-300 px-2 py-1 rounded border border-[#2A3441] flex items-center gap-1"
            >
              <Dices className="w-3 h-3" /> Random
            </button>
            <button 
              onClick={() => setShowItemSelector(true)}
              className="text-[10px] bg-[#37F2D1]/10 hover:bg-[#37F2D1]/20 text-[#37F2D1] px-2 py-1 rounded border border-[#37F2D1]/30 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 max-h-[150px] overflow-y-auto custom-scrollbar">
          {items.map((item, idx) => (
            <div key={idx} className="relative group">
              <div className="w-12 h-12 rounded-lg bg-[#0b1220] border border-[#111827] flex items-center justify-center overflow-hidden" title={item.name}>
                {itemIcons[item.name] ? (
                  <img src={itemIcons[item.name]} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] text-center px-1 text-slate-400 line-clamp-2">{item.name}</span>
                )}
              </div>
              <button
                onClick={() => removeItem(idx)}
                className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-5 text-center py-4 text-[10px] text-slate-600 border border-dashed border-[#111827] rounded-lg">
              No items in loot pool
            </div>
          )}
        </div>
      </div>

      {showItemSelector && (
        <ItemSelectorModal 
          onClose={() => setShowItemSelector(false)} 
          onSelect={(item) => {
            addItem(item);
            setShowItemSelector(false);
          }} 
        />
      )}

      {showManualDistribution && (
        <ManualDistributionModal
          players={players}
          poolCurrency={currency}
          poolItems={items}
          settings={settings}
          onClose={() => setShowManualDistribution(false)}
          onConfirm={(distribution) => {
            executeDistribution(distribution);
            setShowManualDistribution(false);
          }}
        />
      )}
    </div>
  );
}

function ManualDistributionModal({ players, poolCurrency, poolItems, settings, onClose, onConfirm }) {
  const [currencyDist, setCurrencyDist] = useState({});
  const [itemDist, setItemDist] = useState({}); // { itemId: playerId }

  useEffect(() => {
    const initial = {};
    players.forEach(p => {
      initial[p.user_id] = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    });
    setCurrencyDist(initial);
  }, [players]);

  const updateCurrency = (userId, type, amount) => {
    setCurrencyDist(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [type]: parseInt(amount) || 0 }
    }));
  };

  const assignItem = (itemId, userId) => {
    setItemDist(prev => ({ ...prev, [itemId]: userId }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#050816] border border-[#111827] rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl max-h-[90vh]">
        <div className="p-4 border-b border-[#111827] flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">Manual Distribution</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Currency Distribution */}
          {!settings.split_gold_evenly && (
            <div>
              <h4 className="text-xs font-bold text-amber-400 mb-3 uppercase tracking-wide">Currency</h4>
              <div className="bg-[#0b1220] p-3 rounded-xl border border-[#111827] mb-4">
                <div className="flex gap-4 text-xs">
                  <span className="text-slate-400">Pool:</span>
                  <span className="text-orange-700 font-bold">{poolCurrency.cp} CP</span>
                  <span className="text-slate-400 font-bold">{poolCurrency.sp} SP</span>
                  <span className="text-slate-500 font-bold">{poolCurrency.ep} EP</span>
                  <span className="text-yellow-500 font-bold">{poolCurrency.gp} GP</span>
                  <span className="text-slate-200 font-bold">{poolCurrency.pp} PP</span>
                </div>
              </div>
              
              <div className="space-y-2">
                {players.map(player => (
                  <div key={player.user_id} className="flex items-center justify-between bg-[#1a1f2e] p-2 rounded-lg border border-[#2A3441]">
                    <div className="flex items-center gap-3 w-48">
                      {player.avatar_url && <img src={player.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />}
                      <span className="text-xs font-bold text-white truncate">{player.character?.name || player.username}</span>
                    </div>
                    <div className="flex gap-2">
                      {['cp', 'sp', 'ep', 'gp', 'pp'].map(type => (
                        <div key={type} className="flex flex-col items-center w-14">
                          <span className="text-[8px] text-slate-500 uppercase">{type}</span>
                          <input
                            type="number"
                            value={currencyDist[player.user_id]?.[type] || 0}
                            onChange={(e) => updateCurrency(player.user_id, type, e.target.value)}
                            className="w-full bg-[#0b1220] border border-[#2A3441] rounded px-1 py-0.5 text-center text-xs text-white focus:border-amber-500 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Item Distribution */}
          {!settings.random_items && poolItems.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-purple-400 mb-3 uppercase tracking-wide">Items</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {poolItems.map((item) => (
                  <div key={item.id} className="bg-[#1a1f2e] p-3 rounded-lg border border-[#2A3441] flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#0b1220] border border-[#111827] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {itemIcons[item.name] ? (
                        <img src={itemIcons[item.name]} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{item.rarity || 'Common'}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <select 
                        className="bg-[#0b1220] border border-[#2A3441] text-xs text-white rounded px-2 py-1 outline-none focus:border-purple-500"
                        value={itemDist[item.id] || ""}
                        onChange={(e) => assignItem(item.id, e.target.value)}
                      >
                        <option value="">Loot Box</option>
                        {players.map(p => (
                          <option key={p.user_id} value={p.user_id}>{p.character?.name || p.username}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#111827] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-[#1a1f2e]">
            Cancel
          </button>
          <button 
            onClick={() => onConfirm({ currency: currencyDist, items: itemDist })}
            className="px-6 py-2 rounded-lg bg-[#37F2D1] text-[#1E2430] hover:bg-[#2dd9bd] text-xs font-bold"
          >
            Confirm Distribution
          </button>
        </div>
      </div>
    </div>
  );
}

function TogglePill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 border transition-all ${
        active 
          ? "bg-[#37F2D1]/10 border-[#37F2D1] text-[#37F2D1]" 
          : "bg-[#050816] border-[#111827] text-slate-400 hover:bg-[#0b1220]"
      }`}
    >
      <div className={`w-2 h-2 rounded-full ${active ? "bg-[#37F2D1]" : "bg-slate-600"}`} />
      <span>{label}</span>
    </button>
  );
}

function ItemSelectorModal({ onClose, onSelect }) {
  const [search, setSearch] = useState("");
  
  const filtered = allItemsWithEnchanted.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50);

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#050816] border border-[#111827] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-[#111827] flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">Add Item to Loot</h3>
          <button onClick={onClose}><Trash2 className="w-4 h-4 text-slate-500 hover:text-white" /></button>
        </div>
        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search items..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#1a1f2e] border border-[#2A3441] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-[#37F2D1] outline-none"
            />
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {filtered.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onSelect(item)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1f2e] text-left group"
              >
                <div className="w-10 h-10 rounded bg-[#0b1220] border border-[#111827] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {itemIcons[item.name] ? (
                    <img src={itemIcons[item.name]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-5 h-5 text-slate-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-200 group-hover:text-white">{item.name}</div>
                  <div className="text-[10px] text-slate-500">{item.type} • {item.rarity || 'Common'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}