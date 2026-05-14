import React from "react";

/**
 * Small `?` badge with a hover tooltip. Tooltip text is the children;
 * the `.cc-help-tip:hover::after` rule in character-creator.css pulls
 * it from the `data-tip` attribute.
 *
 * Ported from design-reference/character-creator/ui.jsx (~50-54).
 */
export function HelpTip({ children, label }) {
  return (
    <span
      className="cc-help-tip"
      data-tip={children}
      aria-label={label || "Help"}
      role="img"
    >
      ?
    </span>
  );
}
