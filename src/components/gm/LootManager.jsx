import React, { useState, useEffect } from "react";
import { Coins, Plus, Trash2, Dices, RefreshCw, ChevronRight, ChevronDown, Search, Package, X, User } from "lucide-react";
import { allItemsWithEnchanted, itemIcons } from "@/components/dnd5e/itemData";
import { base44 } from "@/api/base44Client";
import { logCombatEvent, logSystemEvent } from "@/utils/combatLog";

const EMPTY_CURRENCY = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

// Sum two currency objects (nulls coerced to 0). Used by Split Gold Evenly.
function addCurrency(a, b) {
  return {
    cp: (a?.cp || 0) + (b?.cp || 0),
    sp: (a?.sp || 0) + (b?.sp || 0),
    ep: (a?.ep || 0) + (b?.ep || 0),
    gp: (a?.gp || 0) + (b?.gp || 0),
    pp: (a?.pp || 0) + (b?.pp || 0),
  };
}

// Subtract b from a, clamped at zero. Used by retraction so a player
// can never end up with negative coins from a half-applied rollback.
function subtractCurrency(a, b) {
  return {
    cp: Math.max(0, (a?.cp || 0) - (b?.cp || 0)),
    sp: Math.max(0, (a?.sp || 0) - (b?.sp || 0)),
    ep: Math.max(0, (a?.ep || 0) - (b?.ep || 0)),
    gp: Math.max(0, (a?.gp || 0) - (b?.gp || 0)),
    pp: Math.max(0, (a?.pp || 0) - (b?.pp || 0)),
  };
}

// Split a pool of currency evenly among N players. Remainders stay in
// the pool (the GM can manually hand them out or re-split later).
function splitEvenly(pool, count) {
  if (count <= 0) return { perPlayer: EMPTY_CURRENCY, remainder: { ...pool } };
  const perPlayer = {};
  const remainder = {};
  for (const type of ["cp", "sp", "ep", "gp", "pp"]) {
    const total = pool?.[type] || 0;
    const each = Math.floor(total / count);
    perPlayer[type] = each;
    remainder[type] = total - each * count;
  }
  return { perPlayer, remainder };
}

// Human-readable currency summary, skipping zero coin types.
function formatCurrencyDelta(currency) {
  const parts = [];
  for (const type of ["pp", "gp", "ep", "sp", "cp"]) {
    const v = currency?.[type] || 0;
    if (v > 0) parts.push(`${v} ${type.toUpperCase()}`);
  }
  return parts.length > 0 ? parts.join(", ") : "0";
}

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

  // Audit of what was handed to each player on the last successful
  // distribution. Used by Retract to subtract the right amounts / pull
  // the right items back without a schema migration. Shape:
  //   { [playerUserId]: { charId, currency, items: [itemObj, ...] } }
  const executeDistribution = (manualDistribution = null) => {
    let finalItems = [...items];
    let finalCurrency = { ...currency };
    const audit = {}; // per-player delta for retraction

    const noteForPlayer = (playerId, char) => {
      if (!audit[playerId]) {
        audit[playerId] = {
          charId: char?.id,
          charName: char?.name,
          currency: { ...EMPTY_CURRENCY },
          items: [],
        };
      }
      return audit[playerId];
    };

    const promises = [];

    // --- Split Gold Evenly (toggle ON) --------------------------------
    // Divide the pool equally among eligible players. Remainders stay
    // in the pool so the GM can hand them out manually.
    if (settings.split_gold_evenly && players?.length > 0) {
      const { perPlayer, remainder } = splitEvenly(finalCurrency, players.length);
      const anyCoins = Object.values(perPlayer).some((v) => v > 0);
      if (anyCoins) {
        players.forEach((player) => {
          if (!player?.character) return;
          const char = player.character;
          const entry = noteForPlayer(player.user_id, char);
          entry.currency = addCurrency(entry.currency, perPlayer);
          const newMoney = addCurrency(char.currency || EMPTY_CURRENCY, perPlayer);
          promises.push(base44.entities.Character.update(char.id, { currency: newMoney }));
        });
        finalCurrency = remainder;
      }
    }

    // --- Random Item Distribution (toggle ON) -------------------------
    if (settings.random_items && players?.length > 0 && finalItems.length > 0) {
      finalItems.forEach((item) => {
        const randomPlayer = players[Math.floor(Math.random() * players.length)];
        if (!randomPlayer?.character) return;
        const char = randomPlayer.character;
        const entry = noteForPlayer(randomPlayer.user_id, char);
        entry.items.push(item);
        const newInventory = [...(char.inventory || []), item];
        promises.push(base44.entities.Character.update(char.id, { inventory: newInventory }));
      });
      finalItems = [];
    }

    // --- Manual Distribution (GM-assigned from the modal) -------------
    if (manualDistribution) {
      // 1. Currency
      if (manualDistribution.currency) {
        Object.entries(manualDistribution.currency).forEach(([playerId, amountObj]) => {
          const player = players.find((p) => p.user_id === playerId);
          if (!player?.character) return;
          const char = player.character;
          const entry = noteForPlayer(playerId, char);
          entry.currency = addCurrency(entry.currency, amountObj);
          const newMoney = addCurrency(char.currency || EMPTY_CURRENCY, amountObj);
          promises.push(base44.entities.Character.update(char.id, { currency: newMoney }));
        });
        finalCurrency = EMPTY_CURRENCY;
      }

      // 2. Items
      if (manualDistribution.items) {
        const itemsToKeep = [];
        const playerItems = {};
        finalItems.forEach((item) => {
          const assignedTo = manualDistribution.items[item.id];
          if (assignedTo) {
            if (!playerItems[assignedTo]) playerItems[assignedTo] = [];
            playerItems[assignedTo].push(item);
          } else {
            itemsToKeep.push(item);
          }
        });
        Object.entries(playerItems).forEach(([playerId, pItems]) => {
          const player = players.find((p) => p.user_id === playerId);
          if (!player?.character) return;
          const char = player.character;
          const entry = noteForPlayer(playerId, char);
          entry.items.push(...pItems);
          const newInventory = [...(char.inventory || []), ...pItems];
          promises.push(base44.entities.Character.update(char.id, { inventory: newInventory }));
        });
        finalItems = itemsToKeep;
      }
    }

    Promise.all(promises).catch((err) => {
      console.error("Loot distribution write failed:", err);
    });

    // Campaign log — one banner + per-player rollup line. Fire-and-
    // forget, same convention as the combat event helpers.
    if (campaignId) {
      logSystemEvent(campaignId, "Loot distributed to the party.", {
        kind: "loot_distributed",
      });
      Object.entries(audit).forEach(([playerId, entry]) => {
        const itemNames = entry.items.map((i) => i.name).filter(Boolean);
        if (itemNames.length > 0) {
          logCombatEvent(
            campaignId,
            `${entry.charName || "Player"} received ${itemNames.join(", ")}.`,
            {
              event: "loot_items",
              category: "rest",
              target: entry.charName,
              items: itemNames,
            },
          );
        }
        const coinSummary = formatCurrencyDelta(entry.currency);
        if (coinSummary !== "0") {
          logCombatEvent(
            campaignId,
            `${entry.charName || "Player"} received ${coinSummary}.`,
            {
              event: "loot_currency",
              category: "rest",
              target: entry.charName,
              currency: entry.currency,
            },
          );
        }
      });
    }

    handleSave(true, finalItems, finalCurrency, audit);
  };

  // Retract the last distribution. Reverses every character update
  // recorded in lootData.last_distribution, toasts the players' return
  // to their pre-loot state, and flips the distributed flag back off.
  const retractDistribution = () => {
    const snapshot = lootData?.last_distribution;
    if (!snapshot || typeof snapshot !== "object") {
      // No audit to reverse — degrade to just flipping the flag (best
      // effort) so a pre-existing distribution can still be cleared.
      handleSave(false);
      return;
    }

    const promises = [];
    let refundedItems = [...items];
    let refundedCurrency = { ...currency };

    Object.entries(snapshot).forEach(([playerId, entry]) => {
      if (!entry?.charId) return;
      const player = players?.find((p) => p.user_id === playerId);
      const char = player?.character;
      if (!char) return;

      // Rewind currency.
      if (entry.currency) {
        const rolledBack = subtractCurrency(char.currency || EMPTY_CURRENCY, entry.currency);
        promises.push(base44.entities.Character.update(char.id, { currency: rolledBack }));
        refundedCurrency = addCurrency(refundedCurrency, entry.currency);
      }

      // Rewind items. Pull each distributed item by id (unique key
      // assigned on add) from the player's inventory and drop it back
      // into the loot pool.
      if (entry.items?.length > 0) {
        const removedIds = new Set(entry.items.map((i) => i.id));
        const currentInv = char.inventory || [];
        const newInv = currentInv.filter((i) => !removedIds.has(i.id));
        promises.push(base44.entities.Character.update(char.id, { inventory: newInv }));
        refundedItems = [...refundedItems, ...entry.items];
      }
    });

    Promise.all(promises).catch((err) => {
      console.error("Loot retraction write failed:", err);
    });

    if (campaignId) {
      logSystemEvent(campaignId, "Loot retracted. Items and currency returned to the pool.", {
        kind: "loot_retracted",
      });
    }

    handleSave(false, refundedItems, refundedCurrency, null);
  };

  const handleSave = (
    distributed = isDistributed,
    overrideItems = items,
    overrideCurrency = currency,
    overrideAudit,
  ) => {
    setIsDistributed(distributed);
    setItems(overrideItems);
    setCurrency(overrideCurrency);
    onUpdateLoot({
      items: overrideItems,
      currency: overrideCurrency,
      settings,
      is_distributed: distributed,
      // Persist the audit so Retract survives a page reload. `undefined`
      // means "don't touch" (used by settings-only saves); null means
      // "clear it" (Retract).
      ...(overrideAudit === undefined
        ? {}
        : { last_distribution: overrideAudit }),
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
            onClick={retractDistribution}
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