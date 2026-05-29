import React from "react";
import {
  isCrestUrl,
  getCrestCrBand,
  getMonsterCrestType,
  getMonsterPortrait,
  getCombatantPortrait,
  crestTypeFromUrl,
  MONSTER_TYPE_COLORS,
} from "@/utils/monsterPortrait";

/**
 * Inline style that tints a type-crest SVG to its creature-type color.
 *
 * An <img>/background-image shows the SVG's own colors, so the only way to
 * recolor it is to use the SVG as a CSS mask and fill the element with a
 * solid background-color. The element then reads as a flat type-colored
 * silhouette; the CR-band class adds a drop-shadow glow that traces it.
 */
export function crestMaskStyle(url, color, { size = "contain" } = {}) {
  return {
    "--crest-color": color,
    backgroundColor: color,
    backgroundImage: "none",
    WebkitMaskImage: `url("${url}")`,
    maskImage: `url("${url}")`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: size,
    maskSize: size,
  };
}

/**
 * A creature-type crest, tinted to its type color with a CR-banded glow.
 * Fills its parent (pass sizing via className). `combat` selects the
 * combat-side resolver so built combatants (type === 'monster', real type
 * under stats.type) tint correctly.
 */
export default function MonsterCrest({
  monster,
  combat = false,
  src,
  className = "",
  title = "",
  maskSize = "contain",
}) {
  const url =
    src || (combat ? getCombatantPortrait(monster) : getMonsterPortrait(monster));
  // Prefer the type baked into the crest filename so the tint always matches
  // the rendered silhouette, even when `monster` carries no resolvable type.
  const color = MONSTER_TYPE_COLORS[crestTypeFromUrl(url) || getMonsterCrestType(monster)];
  const cr = monster?.challenge_rating ?? monster?.stats?.challenge_rating;
  const band = getCrestCrBand(cr);
  return (
    <div
      role="img"
      aria-label={title}
      className={`${className} monster-crest crest-${band}`}
      style={crestMaskStyle(url, color, { size: maskSize })}
    />
  );
}

// Re-export so callers can branch crest-vs-portrait from one import.
export { isCrestUrl };
