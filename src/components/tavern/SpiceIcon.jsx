import React from "react";

/**
 * Spice icon — the canonical glyph for Spice balances across the app.
 *
 * Renders the Material Symbols `nutrition` (wheat-stalk) outlined
 * glyph via the Google Fonts CDN. Material Symbols aren't SVGs; the
 * font ships thousands of icons and the browser renders whichever
 * ligature we emit as text. A one-time CSS injection guarantees
 * the font loads even when nothing else on the page pulls it.
 *
 * Props:
 *   size     — number | string — CSS font-size (default inherits)
 *   color    — optional foreground color (default inherits)
 *   filled   — render the "filled" variant instead of outlined
 *   className, style — standard escape hatches
 *
 * Swap-in replacement for <Flame /> wherever a Spice amount is
 * rendered.
 */

// Inject the Material Symbols stylesheet once per page. Idempotent;
// re-running is a no-op after the first call.
const FONT_LINK_ID = "material-symbols-outlined-font";
function ensureFontLoaded() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
  document.head.appendChild(link);
}

export default function SpiceIcon({
  size = "1em",
  color,
  filled = false,
  className = "",
  style = {},
  title = "Spice",
  ...rest
}) {
  ensureFontLoaded();
  return (
    <span
      className={`material-symbols-outlined align-middle ${className}`}
      aria-label={title}
      title={title}
      style={{
        fontFamily: "'Material Symbols Outlined'",
        fontSize: typeof size === "number" ? `${size}px` : size,
        lineHeight: 1,
        color,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 500, 'GRAD' 0, 'opsz' 24`,
        userSelect: "none",
        display: "inline-block",
        ...style,
      }}
      {...rest}
    >
      wheat
    </span>
  );
}
