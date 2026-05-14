import React from "react";

/**
 * New-player tip banner. Left-border accent in teal / orange / gold,
 * gradient backdrop using the same hue.
 *
 * Ported from design-reference/character-creator/ui.jsx (Primer, ~57-67).
 */
export function Primer({ title, children, color = "teal" }) {
  const palette = COLORS[color] || COLORS.teal;
  return (
    <div
      className="cc-primer"
      style={{
        borderLeftColor: palette.border,
        background: `linear-gradient(135deg, ${palette.tintBg}, transparent)`,
        borderColor: palette.borderRing,
      }}
    >
      {title && (
        <div className="cc-primer-title" style={{ color: palette.title }}>
          {title}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

// rgba alpha encoded inline (instead of color-mix) so the values stay
// usable in inline style props without needing modern CSS in every
// browser path.
const COLORS = {
  teal: {
    border: "var(--cc-teal)",
    title: "var(--cc-teal)",
    tintBg: "rgba(55, 242, 209, 0.08)",
    borderRing: "rgba(55, 242, 209, 0.25)",
  },
  orange: {
    border: "var(--cc-orange)",
    title: "var(--cc-orange-soft)",
    tintBg: "rgba(255, 122, 51, 0.10)",
    borderRing: "rgba(255, 122, 51, 0.30)",
  },
  gold: {
    border: "var(--cc-gold)",
    title: "var(--cc-gold)",
    tintBg: "rgba(212, 169, 81, 0.10)",
    borderRing: "rgba(212, 169, 81, 0.30)",
  },
};
