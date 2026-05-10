import React from "react";
import { SymbolImage } from "@/components/shared/SymbolPicker";
import { DruidicSymbol } from "@/components/shared/DruidicSymbol";

/**
 * Single dispatch point for cipher symbol rendering.
 *
 *   cipherType="thieves_cant" → SymbolImage (static SVG via CSS mask)
 *   cipherType="druidic"      → DruidicSymbol (inline SVG, runtime)
 *
 * Future cipher systems can pick either renderer based on whether
 * their art is hand-illustrated (mask) or geometric/runic (inline).
 *
 * Props mirror SymbolImage so it's a drop-in replacement at call
 * sites; `symbol` carries the catalog row (id, name, src? for Cant).
 */
export function CipherSymbol({
  cipherType = "thieves_cant",
  symbol,
  color,
  size = 32,
  className = "",
}) {
  if (!symbol) return null;
  if (cipherType === "druidic") {
    return (
      <DruidicSymbol
        id={symbol.id}
        size={size}
        color={color}
        title={symbol.name}
        className={className}
      />
    );
  }
  return (
    <SymbolImage
      src={symbol.src}
      color={color}
      size={size}
      title={symbol.name}
      className={className}
    />
  );
}
