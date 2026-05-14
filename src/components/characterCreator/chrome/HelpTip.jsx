import React from "react";

export function HelpTip({ children, label }) {
  return (
    <span className="help-tip" data-tip={children} aria-label={label || "Help"} role="img">
      ?
    </span>
  );
}
