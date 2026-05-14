import React from "react";

/**
 * Illuminated-manuscript-style step title with flanking gold ornaments.
 * Ported from design-reference/character-creator/ui.jsx (StepHeader, ~251-273).
 */
export function StepHeader({ title, subtitle, kicker }) {
  return (
    <div style={{ marginBottom: 28, textAlign: "center", position: "relative" }}>
      {kicker && (
        <div
          className="cc-label"
          style={{ marginBottom: 10, color: "var(--cc-gold)" }}
        >
          {kicker}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          marginBottom: 12,
        }}
      >
        <Ornament />
        <h2
          className="cc-display"
          style={{
            fontSize: 46,
            color: "var(--cc-text)",
            lineHeight: 1,
            textShadow: "0 2px 12px rgba(255, 83, 0, 0.18)",
            letterSpacing: 1,
            margin: 0,
          }}
        >
          {title}
        </h2>
        <Ornament flipped />
      </div>
      {subtitle && (
        <p
          className="cc-italic-serif"
          style={{
            color: "var(--cc-text-dim)",
            margin: 0,
            fontSize: 17,
            letterSpacing: 0.2,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Ornament({ flipped = false }) {
  return (
    <svg
      width="60"
      height="14"
      viewBox="0 0 60 14"
      aria-hidden
      style={{ flexShrink: 0, transform: flipped ? "scaleX(-1)" : undefined }}
    >
      <path d="M0 7 L52 7" stroke="var(--cc-gold-deep)" strokeWidth="1" />
      <circle cx="56" cy="7" r="3" fill="var(--cc-gold)" />
      <circle cx="56" cy="7" r="5.5" fill="none" stroke="var(--cc-gold)" strokeWidth="0.6" />
    </svg>
  );
}
