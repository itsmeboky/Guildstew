import React from "react";
import { DRUIDIC_SHAPES } from "@/config/druidicShapes";

const RENDERERS = {
  dot: ({ cx, cy, r = 2 }, key) => (
    <circle key={key} cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
  ),
  circle: ({ cx, cy, r }, key) => (
    <circle key={key} cx={cx} cy={cy} r={r} />
  ),
  line: ({ x1, y1, x2, y2 }, key) => (
    <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} />
  ),
  path: ({ d }, key) => <path key={key} d={d} />,
  poly: ({ points }, key) => <polyline key={key} points={points} />,
  polygon: ({ points }, key) => <polygon key={key} points={points} />,
};

/**
 * Inline-SVG renderer for the 30 hand-designed Druidic runes.
 * Shape data lives in src/config/druidicShapes.js; this component
 * composes one <svg> per render with stroke="currentColor", so the
 * runes inherit colour from the `color` prop (or the parent's CSS
 * `color`) without any mask trickery.
 *
 * Cant uses static SVGs via SymbolImage's CSS-mask path; Druidic
 * uses this. CipherSymbol dispatches between them.
 */
export function DruidicSymbol({ id, size = 32, color, title = "", className = "" }) {
  const ops = DRUIDIC_SHAPES[id];
  if (!ops) {
    if (typeof console !== "undefined") {
      console.warn(`Unknown druidic symbol: ${id}`);
    }
    return null;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={title || id}
      className={`inline-block ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={color ? { color } : undefined}
    >
      {title && <title>{title}</title>}
      {ops.map((op, i) => {
        const render = RENDERERS[op.type];
        if (!render) {
          if (typeof console !== "undefined") {
            console.warn(`Unknown druidic primitive type: ${op.type}`);
          }
          return null;
        }
        return render(op, i);
      })}
    </svg>
  );
}
