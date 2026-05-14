import React from "react";

export function Primer({ title, children, color }) {
  const c = color || "teal";
  const borderColor = c === "orange" ? "var(--orange)" : c === "gold" ? "var(--gold)" : "var(--teal)";
  const titleColor = c === "orange" ? "var(--orange-soft)" : c === "gold" ? "var(--gold)" : "var(--teal)";
  return (
    <div
      className="primer"
      style={{
        borderLeftColor: borderColor,
        background: `linear-gradient(135deg, ${titleColor}14, transparent)`,
        borderColor: `${titleColor}40`,
      }}
    >
      {title && (
        <div className="primer-title" style={{ color: titleColor }}>
          {title}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
