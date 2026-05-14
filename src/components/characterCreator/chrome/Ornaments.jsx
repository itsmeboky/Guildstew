import React from "react";

export function OrnateHeading({ children, color }) {
  const flourishBg = color || "var(--gold)";
  return (
    <div className="ornate-heading">
      <span className="ornate-flourish" style={{ background: flourishBg }} />
      <h3 style={{ color: "var(--text)" }}>{children}</h3>
      <span className="ornate-flourish" style={{ background: flourishBg }} />
    </div>
  );
}

export function FleurDivider() {
  return (
    <div className="fleur-divider" aria-hidden>
      <svg viewBox="0 0 22 22" fill="none">
        <path
          d="M11 2 L11 20 M2 11 L20 11 M5 5 L17 17 M17 5 L5 17"
          stroke="var(--gold-deep)"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="11" cy="11" r="2.5" fill="var(--gold)" />
        <circle cx="11" cy="11" r="4.5" fill="none" stroke="var(--gold)" strokeWidth="0.6" />
      </svg>
    </div>
  );
}

export function ScrollBracket({ side = "left", children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {side === "left" && (
        <svg width="20" height="40" viewBox="0 0 20 40" style={{ flexShrink: 0, opacity: 0.7 }} aria-hidden>
          <path d="M16 2 Q4 4 4 20 Q4 36 16 38" stroke="var(--gold)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <circle cx="6" cy="20" r="1.6" fill="var(--gold)" />
        </svg>
      )}
      <div style={{ flex: 1 }}>{children}</div>
      {side === "right" && (
        <svg width="20" height="40" viewBox="0 0 20 40" style={{ flexShrink: 0, opacity: 0.7, transform: "scaleX(-1)" }} aria-hidden>
          <path d="M16 2 Q4 4 4 20 Q4 36 16 38" stroke="var(--gold)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <circle cx="6" cy="20" r="1.6" fill="var(--gold)" />
        </svg>
      )}
    </div>
  );
}
