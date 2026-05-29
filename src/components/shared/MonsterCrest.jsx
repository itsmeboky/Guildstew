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
 * Inline style that gives a type-crest SVG a stained-glass tint.
 *
 * Two background layers — a solid type-color fill on top, the crest art
 * underneath — composited with `background-blend-mode: color`. That keeps
 * the crest's own luminance/shading (its detail) while recoloring its hue to
 * the creature type, so it reads like colored glass rather than a flat
 * silhouette. A mask clips the whole thing to the crest outline so the color
 * layer doesn't fill the bounding box. The CR-band class adds the glow.
 */
export function crestMaskStyle(url, color, { size = "contain" } = {}) {
  return {
    "--crest-color": color,
    backgroundColor: "transparent",
    // First listed layer is the top layer: the solid color blends (mode
    // `color`) over the crest art below it.
    backgroundImage: `linear-gradient(${color}, ${color}), url("${url}")`,
    backgroundBlendMode: "color",
    backgroundRepeat: "no-repeat, no-repeat",
    backgroundPosition: "center, center",
    backgroundSize: `${size}, ${size}`,
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
