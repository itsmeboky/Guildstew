import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CipherSymbol } from "@/components/shared/CipherSymbol";
import {
  THIEVES_CANT_SYMBOLS,
  CANT_DEFAULT_COLOR,
} from "@/config/thievesCantSymbols";
import {
  DRUIDIC_SYMBOLS,
  DRUIDIC_DEFAULT_COLOR,
} from "@/config/druidicSymbols";

const CIPHER_CONFIG = {
  thieves_cant: {
    catalog: THIEVES_CANT_SYMBOLS,
    color: CANT_DEFAULT_COLOR,
    title: "Thieves' Cant Cypher",
    icon: "🗡️",
    accent: "amber",
    blurb: "Cross-reference these markings against any symbols you find in the world.",
  },
  druidic: {
    catalog: DRUIDIC_SYMBOLS,
    color: DRUIDIC_DEFAULT_COLOR,
    title: "Druidic Field Guide",
    icon: "🌿",
    accent: "emerald",
    blurb: "The symbols within echo those carved into trees and stones across the wilds.",
  },
};

/**
 * Modal that displays the active campaign's symbol→meaning mapping
 * for one cipher type. Read-only; the mapping is authored on the
 * campaign side and the modal just looks it up. Same modal serves
 * both the inventory click and the nav-bar quick-access button.
 *
 * Props:
 *   open         controlled open state
 *   onClose      ()=>void
 *   cipherType   "thieves_cant" | "druidic"
 *   campaign     { language_cipher_maps: { thieves_cant: {...}, druidic: {...} } }
 */
export default function CipherModal({ open, onClose, cipherType, campaign }) {
  const [query, setQuery] = useState("");
  const cfg = CIPHER_CONFIG[cipherType];
  const mapping = campaign?.language_cipher_maps?.[cipherType] || {};

  const rows = useMemo(() => {
    if (!cfg) return [];
    const q = query.trim().toLowerCase();
    return cfg.catalog
      .map((sym) => ({ symbol: sym, meaning: mapping[sym.id] || "—" }))
      .filter(({ symbol, meaning }) => {
        if (!q) return true;
        return (
          symbol.name.toLowerCase().includes(q) ||
          String(meaning).toLowerCase().includes(q)
        );
      });
  }, [cfg, mapping, query]);

  if (!cfg) return null;

  const empty = Object.keys(mapping).length === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span aria-hidden>{cfg.icon}</span> {cfg.title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-slate-400 italic mb-3">{cfg.blurb}</p>

        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by symbol or meaning…"
            className="bg-[#050816] border-slate-700 text-white pl-8"
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {empty ? (
            <p className="text-sm text-slate-500 italic text-center py-12">
              No cypher mapping yet for this campaign. Once your GM opens
              World Lore, it will be generated automatically.
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-12">
              No symbols match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {rows.map(({ symbol, meaning }) => (
                <div
                  key={symbol.id}
                  className="bg-[#0b1220] border border-slate-700 rounded-lg p-3 flex flex-col items-center gap-1"
                >
                  <CipherSymbol
                    cipherType={cipherType}
                    symbol={symbol}
                    color={cfg.color}
                    size={48}
                  />
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    means
                  </span>
                  <span className="text-sm text-white font-bold text-center leading-snug">
                    {meaning}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
