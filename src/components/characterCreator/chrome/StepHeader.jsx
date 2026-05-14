import React from "react";

export function StepHeader({ title, subtitle, kicker }) {
  return (
    <div style={{ marginBottom: 28, textAlign: "center", position: "relative" }}>
      {kicker && (
        <div className="label" style={{ marginBottom: 10, color: "var(--gold)" }}>
          {kicker}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginBottom: 12 }}>
        <Ornament />
        <h2
          className="display"
          style={{
            fontSize: 46,
            color: "var(--text)",
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
        <p className="italic-serif" style={{ color: "var(--text-dim)", margin: 0, fontSize: 17, letterSpacing: 0.2 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Ornament({ flipped = false }) {
  return (
    <svg width="60" height="14" viewBox="0 0 60 14" aria-hidden style={{ flexShrink: 0, transform: flipped ? "scaleX(-1)" : undefined }}>
      <path d="M0 7 L52 7" stroke="var(--gold-deep)" strokeWidth="1" />
      <circle cx="56" cy="7" r="3" fill="var(--gold)" />
      <circle cx="56" cy="7" r="5.5" fill="none" stroke="var(--gold)" strokeWidth="0.6" />
    </svg>
  );
}
