import React, { useMemo, useState } from "react";
import { Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * CSS-mask coloured symbol renderer. Both Thieves' Cant SVGs
 * (externally authored) and the generated Druidic SVGs are
 * transparent-background shapes; CSS `mask` lets us tint them to any
 * colour the GM picks without needing inline SVG or per-variant
 * pre-rendered assets.
 */
export function SymbolImage({ src, color = "#d4a017", size = 32, title = "", className = "" }) {
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={`inline-block ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

/**
 * Shared symbol picker used by Thieves' Cant + Druidic annotation
 * editors. Encapsulates: selected-row display, add/remove buttons,
 * modal with category tabs + text search, and a colour row with
 * preset swatches plus a custom hex input. Parents own the state —
 * this component is purely presentational.
 *
 * Props:
 *   symbols        full catalog (id, name, category, src)
 *   categories     ordered category strings (drive tab order)
 *   selected       array of { id, color } currently attached to the entry
 *   defaultColor   hex fallback when onColorChange hasn't fired yet
 *   onSelect       (symbol) => void — append a new selection
 *   onRemove       (symbolId) => void — drop a selection
 *   onColorChange  (color) => void — recolour every selected symbol
 *   colorOptions   preset swatches [{ id, value }]
 *   label          display label ("Thieves' Cant" | "Druidic")
 *   icon           emoji shown next to the label
 */
export default function SymbolPicker({
  symbols,
  categories,
  selected = [],
  defaultColor,
  onSelect,
  onRemove,
  onColorChange,
  colorOptions = [],
  label,
  icon = "",
}) {
  const [open, setOpen] = useState(false);
  const color = selected[0]?.color || defaultColor;
  const byId = useMemo(() => {
    const m = new Map();
    for (const s of symbols) m.set(s.id, s);
    return m;
  }, [symbols]);

  return (
    <div className="space-y-2">
      <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1">
        {icon && <span aria-hidden>{icon}</span>}
        {label} Symbols
      </Label>

      {/* Selected row */}
      <div className="flex items-center flex-wrap gap-2 p-2 bg-[#050816] border border-slate-700 rounded-lg min-h-[48px]">
        {selected.length === 0 ? (
          <span className="text-[11px] text-slate-500 italic px-1">
            No symbols — click Add Symbol to attach one or more.
          </span>
        ) : (
          selected.map((sel) => {
            const sym = byId.get(sel.id);
            if (!sym) return null;
            return (
              <span
                key={sel.id}
                className="inline-flex items-center gap-1 bg-[#0b1220] border border-slate-700 rounded px-2 py-1"
                title={sym.name}
              >
                <SymbolImage src={sym.src} color={sel.color || color} size={22} title={sym.name} />
                <span className="text-[10px] text-slate-300 truncate max-w-[110px]">{sym.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove?.(sel.id)}
                  className="text-slate-500 hover:text-red-400"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="ml-auto"
        >
          <Plus className="w-3 h-3 mr-1" /> Add Symbol
        </Button>
      </div>

      {/* Colour row */}
      <div className="flex items-center flex-wrap gap-2">
        <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
          Colour
        </Label>
        {colorOptions.map((opt) => {
          const active = color?.toLowerCase() === opt.value.toLowerCase();
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onColorChange?.(opt.value)}
              title={opt.id}
              className={`w-6 h-6 rounded-full border-2 transition ${
                active ? "border-white scale-110" : "border-slate-600 hover:scale-105"
              }`}
              style={{ backgroundColor: opt.value }}
            />
          );
        })}
        <input
          type="color"
          value={color || "#d4a017"}
          onChange={(e) => onColorChange?.(e.target.value)}
          className="w-8 h-8 rounded border border-slate-700 bg-[#050816] cursor-pointer"
          title="Custom colour"
        />
      </div>

      <SymbolPickerModal
        open={open}
        onClose={() => setOpen(false)}
        symbols={symbols}
        categories={categories}
        selectedIds={new Set(selected.map((s) => s.id))}
        color={color}
        onToggle={(sym) => {
          const already = selected.some((s) => s.id === sym.id);
          if (already) onRemove?.(sym.id);
          else onSelect?.(sym);
        }}
        label={label}
        icon={icon}
      />
    </div>
  );
}

function SymbolPickerModal({ open, onClose, symbols, categories, selectedIds, color, onToggle, label, icon }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return symbols.filter((s) => {
      if (activeCategory !== "all" && s.category !== activeCategory) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    });
  }, [symbols, query, activeCategory]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span aria-hidden>{icon}</span> Pick {label} Symbols
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name..."
              className="bg-[#050816] border-slate-700 text-white pl-8"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <CategoryPill label="All" active={activeCategory === "all"} onClick={() => setActiveCategory("all")} />
          {categories.map((c) => (
            <CategoryPill
              key={c}
              label={c}
              active={activeCategory === c}
              onClick={() => setActiveCategory(c)}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-12">
              No symbols match "{query}".
            </p>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filtered.map((sym) => {
                const active = selectedIds.has(sym.id);
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => onToggle(sym)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition text-left ${
                      active
                        ? "bg-[#37F2D1]/10 border-[#37F2D1]"
                        : "bg-[#0b1220] border-slate-700 hover:border-[#37F2D1]/60"
                    }`}
                  >
                    <SymbolImage src={sym.src} color={color} size={48} title={sym.name} />
                    <span className="text-[10px] text-slate-300 font-semibold text-center leading-snug">
                      {sym.name}
                    </span>
                    {active && (
                      <span className="text-[9px] text-[#37F2D1] uppercase tracking-widest font-black">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <Button onClick={onClose} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition ${
        active
          ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
          : "bg-[#0b1220] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
      }`}
    >
      {label}
    </button>
  );
}
