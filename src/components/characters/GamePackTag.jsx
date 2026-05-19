// Visible game-pack identifier chip. Pulls `tagAbbreviation` +
// `accentColor` from the registered pack entry and renders a small
// outlined badge with the accent color tinted at low alpha. Three
// sizes — sm for list/card thumbnails, md (default) for inline lists,
// lg for detail headers.

import React from "react";
import { getGamePack } from "@/config/gamePacks";

const SIZE_CLASSES = {
  sm: "px-1.5 py-0.5 text-[9px]",
  md: "px-2 py-0.5 text-[10px]",
  lg: "px-3 py-1 text-xs",
};

export default function GamePackTag({ packId, pack: passedPack, size = "md", className = "" }) {
  // Accept either a pre-resolved pack (avoids the extra lookup when
  // the caller already has it) or a raw packId string.
  const pack = passedPack || getGamePack(packId);
  if (!pack) return null;

  const label = pack.tagAbbreviation || pack.shortName || pack.short || pack.name;
  const accent = pack.accentColor || pack.accent || "#c2410c";

  return (
    <span
      className={`inline-flex items-center font-display tracking-[0.18em] uppercase border whitespace-nowrap ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${className}`}
      style={{
        // accent + alpha hex for soft tinted background
        backgroundColor: `${accent}22`,
        color: accent,
        borderColor: `${accent}66`,
      }}
      title={pack.name}
    >
      {label}
    </span>
  );
}
