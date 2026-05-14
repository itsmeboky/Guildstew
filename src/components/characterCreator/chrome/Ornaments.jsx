import React from "react";

/**
 * Small decorative pieces — group port of the prototype's OrnateHeading,
 * FleurDivider, and ScrollBracket from
 * design-reference/character-creator/ui.jsx (~5-47).
 */

export function OrnateHeading({ children, color }) {
  const lineColor = color || "var(--cc-gold)";
  return (
    <div className="cc-ornate-heading">
      <span className="cc-ornate-flourish" style={{ background: lineColor }} />
      <h3 style={{ color: "var(--cc-text)" }}>{children}</h3>
      <span className="cc-ornate-flourish" style={{ background: lineColor }} />
    </div>
  );
}

export function FleurDivider() {
  return (
    <div className="cc-fleur-divider" aria-hidden>
      <svg viewBox="0 0 22 22" fill="none">
        <path
          d="M11 2 L11 20 M2 11 L20 11 M5 5 L17 17 M17 5 L5 17"
          stroke="var(--cc-gold-deep)"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="11" cy="11" r="2.5" fill="var(--cc-gold)" />
        <circle
          cx="11"
          cy="11"
          r="4.5"
          fill="none"
          stroke="var(--cc-gold)"
          strokeWidth="0.6"
        />
      </svg>
    </div>
  );
}

export function ScrollBracket({ side = "left", children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {side === "left" && <BracketSvg />}
      <div style={{ flex: 1 }}>{children}</div>
      {side === "right" && <BracketSvg flipped />}
    </div>
  );
}

function BracketSvg({ flipped = false }) {
  return (
    <svg
      width="20"
      height="40"
      viewBox="0 0 20 40"
      aria-hidden
      style={{
        flexShrink: 0,
        opacity: 0.7,
        transform: flipped ? "scaleX(-1)" : undefined,
      }}
    >
      <path
        d="M16 2 Q4 4 4 20 Q4 36 16 38"
        stroke="var(--cc-gold)"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="6" cy="20" r="1.6" fill="var(--cc-gold)" />
    </svg>
  );
}
