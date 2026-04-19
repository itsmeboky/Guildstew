import React, { useState } from "react";
import { CircleDollarSign, Package, Check, ArrowRight } from "lucide-react";
import { itemIcons } from "@/components/dnd5e/itemData";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { safeText } from "@/utils/safeRender";

export default function LootBox({ lootData, onTakeItem, onTakeCurrency, canTake, onDragStart }) {
  const items = lootData?.items || [];
  const currency = lootData?.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  const settings = lootData?.settings || {};
  const isDistributed = lootData?.is_distributed;

  if (!isDistributed) {
    return (
      <div className="bg-[#050816]/50 border border-[#111827] rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[150px]">
        <Package className="w-8 h-8 text-slate-700 mb-2" />
        <p className="text-xs text-slate-500">No loot distributed yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Currency Section */}
      <div className="bg-[#0b1220] rounded-xl p-4 border border-[#111827] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-10">
          <CircleDollarSign className="w-16 h-16 text-yellow-500" />
        </div>
        <h3 className="text-xs font-bold text-amber-400 mb-3 flex items-center gap-2">
          <CircleDollarSign className="w-3 h-3" /> Party Funds
        </h3>
        
        <div className="flex gap-4 text-sm font-mono mb-3">
          <CurrencyDisplay amount={currency.gp} label="GP" color="text-yellow-500" />
          <CurrencyDisplay amount={currency.sp} label="SP" color="text-slate-400" />
          <CurrencyDisplay amount={currency.cp} label="CP" color="text-orange-700" />
          {(currency.pp > 0 || currency.ep > 0) && (
            <>
              <CurrencyDisplay amount={currency.pp} label="PP" color="text-slate-200" />
              <CurrencyDisplay amount={currency.ep} label="EP" color="text-slate-500" />
            </>
          )}
        </div>

        <button
          onClick={() => onTakeCurrency(currency)}
          disabled={!canTake}
          className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
        >
          {settings.split_gold_evenly ? "Take My Share" : "Take All Currency"}
        </button>
      </div>

      {/* Items Grid */}
      <div className="bg-[#0b1220] rounded-xl p-4 border border-[#111827]">
        <h3 className="text-xs font-bold text-purple-400 mb-3 flex items-center gap-2">
          <Package className="w-3 h-3" /> Loot Items
        </h3>
        
        {items.length === 0 ? (
          <p className="text-[10px] text-slate-600 italic">No items left.</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            <AnimatePresence>
              {items.map((item, idx) => (
                <motion.div
                  key={item.id || idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="relative group"
                >
                  <div
                    draggable={canTake}
                    onDragStart={() => onDragStart && onDragStart(item, idx)}
                    onClick={() => canTake && onTakeItem(item, idx)}
                    className={`w-full aspect-square rounded-xl bg-[#1a1f2e] border border-[#2A3441] hover:border-[#37F2D1] hover:shadow-[0_0_15px_rgba(55,242,209,0.2)] transition-all flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing`}
                    title={`${safeText(item.name)}\nDrag to inventory or click to take`}
                  >
                    {itemIcons[item.name] ? (
                      <img src={itemIcons[item.name]} alt={safeText(item.name)} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] text-center px-1 text-slate-400 line-clamp-2">{safeText(item.name)}</span>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Check className="w-4 h-4 text-[#37F2D1]" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function CurrencyDisplay({ amount, label, color }) {
  if (!amount) return null;
  return (
    <div className="flex flex-col items-center">
      <span className={`font-bold ${color}`}>{amount}</span>
      <span className="text-[8px] text-slate-600">{label}</span>
    </div>
  );
}