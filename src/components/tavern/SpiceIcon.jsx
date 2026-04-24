import React from "react";

/**
 * Spice icon — inline SVG wheat-stalk glyph.
 *
 * Emits a Lucide-style wheat sheaf: an angled stalk with three
 * pairs of leaves budding off it, plus a tassel at the top. Every
 * path is stroked with currentColor so the icon inherits its
 * surrounding text color (explicitly overridable via the `color`
 * prop).
 *
 * Shipped as an inline SVG — NOT a font ligature — so themes,
 * dyslexia fonts, and custom Google Fonts from ThemeBuilder can
 * never collapse it into the literal word "WHEAT". The public API
 * matches the old font-icon so existing call sites (nav balance,
 * pricing cards, tavern tiles, sidebar chip, admin panels…) keep
 * working with zero changes.
 *
 * Props:
 *   size      — number (px) | string — width/height (default 1em)
 *   color     — stroke color (default currentColor via style)
 *   filled    — accepted for back-compat; the Lucide path already
 *               reads at all sizes so this is a no-op hint today
 *   className — extra tailwind utilities
 *   title     — accessible label (default "Spice")
 */
export default function SpiceIcon({
  size = "1em",
  color,
  filled = false, // eslint-disable-line no-unused-vars
  className = "",
  style = {},
  title = "Spice",
  ...rest
}) {
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={dimension}
      height={dimension}
      fill="none"
      stroke={color || "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={title}
      role="img"
      className={`inline-block align-middle flex-shrink-0 ${className}`}
      style={{ color, ...style }}
      {...rest}
    >
      <title>{title}</title>
      {/* Stalk */}
      <path d="M2 22 16 8" />
      {/* Left-side leaves */}
      <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      {/* Tassel */}
      <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" />
      {/* Right-side leaves */}
      <path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
      <path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
      <path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
    </svg>
  );
}
