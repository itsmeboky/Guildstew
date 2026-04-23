import React from "react";

/**
 * Spice icon — inline SVG wheat-stalk glyph.
 *
 * The previous implementation pulled the icon from the Google
 * Material Symbols icon-font and emitted the ligature text `wheat`,
 * which was vulnerable to every font override we ship: dyslexia mode
 * swaps the body font, user themes load custom Google Fonts, and the
 * OpenDyslexic + several ThemeBuilder presets simply don't have the
 * Material Symbols PUA ligatures. When the font can't resolve the
 * ligature the literal word `wheat` renders instead of the glyph.
 *
 * Switching to an inline SVG makes the icon impervious to every font
 * mechanism — no more `WHEAT` text leaking when a theme swaps the
 * global font.
 *
 * Props are a superset of the old font-icon API so existing call
 * sites don't need to change:
 *   size      — number (px) | string — width/height
 *   color     — stroke / fill color (default `currentColor`)
 *   filled    — render the filled variant instead of outlined
 *   className — extra tailwind utilities
 *   title     — accessible label (default "Spice")
 */
export default function SpiceIcon({
  size = "1em",
  color,
  filled = false,
  className = "",
  style = {},
  title = "Spice",
  ...rest
}) {
  const dimension = typeof size === "number" ? `${size}px` : size;

  // Wheat-stalk outline: one vertical stalk with three pairs of
  // leaves arcing out diagonally. The outlined variant is a tidy
  // polygon; the filled variant thickens the leaves and stalk.
  const outlined = (
    <g fill="none" stroke={color || "currentColor"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Central stalk */}
      <path d="M12 4v17" />
      {/* Top pair of leaves */}
      <path d="M12 8c-1.6-0.8-3.1-0.8-4.3 0.2 0.6 1.4 2 2.3 3.7 2.3" />
      <path d="M12 8c1.6-0.8 3.1-0.8 4.3 0.2-0.6 1.4-2 2.3-3.7 2.3" />
      {/* Middle pair */}
      <path d="M12 13c-1.6-0.8-3.1-0.8-4.3 0.2 0.6 1.4 2 2.3 3.7 2.3" />
      <path d="M12 13c1.6-0.8 3.1-0.8 4.3 0.2-0.6 1.4-2 2.3-3.7 2.3" />
      {/* Bottom pair */}
      <path d="M12 18c-1.6-0.8-3.1-0.8-4.3 0.2 0.6 1.4 2 2.3 3.7 2.3" />
      <path d="M12 18c1.6-0.8 3.1-0.8 4.3 0.2-0.6 1.4-2 2.3-3.7 2.3" />
    </g>
  );

  const filledArt = (
    <g fill={color || "currentColor"}>
      <rect x="11.25" y="4" width="1.5" height="17" rx="0.75" />
      {/* Three pairs of teardrop leaves; mirror across the stalk. */}
      {[8, 13, 18].map((cy) => (
        <g key={cy}>
          <path d={`M12 ${cy}c-1.7-0.9-3.3-0.8-4.6 0.3 0.6 1.5 2.2 2.4 4 2.3 0.4-0.01 0.6-0.4 0.6-0.8V${cy}z`} />
          <path d={`M12 ${cy}c1.7-0.9 3.3-0.8 4.6 0.3-0.6 1.5-2.2 2.4-4 2.3-0.4-0.01-0.6-0.4-0.6-0.8V${cy}z`} />
        </g>
      ))}
    </g>
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={dimension}
      height={dimension}
      aria-label={title}
      role="img"
      className={`inline-block align-middle flex-shrink-0 ${className}`}
      style={{ color, ...style }}
      {...rest}
    >
      <title>{title}</title>
      {filled ? filledArt : outlined}
    </svg>
  );
}
