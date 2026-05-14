import React from "react";

/**
 * Bottom-of-step nav with Back / Continue buttons and an optional
 * blocked-reason label. Ported from design-reference/character-creator/ui.jsx
 * (StepNav, ~276-292).
 */
export function StepNav({
  onBack,
  onNext,
  canBack,
  canNext,
  nextLabel,
  blockedReason,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 32,
        paddingTop: 24,
        borderTop: "1px solid var(--cc-border)",
      }}
    >
      <button
        type="button"
        className="cc-btn cc-btn-ghost"
        onClick={onBack}
        disabled={!canBack}
      >
        ‹ Back
      </button>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {blockedReason && !canNext && (
          <div
            style={{
              fontSize: 13,
              color: "var(--cc-warn)",
              fontWeight: 600,
            }}
          >
            ⚠ {blockedReason}
          </div>
        )}
        <button
          type="button"
          className="cc-btn cc-btn-primary"
          onClick={onNext}
          disabled={!canNext}
        >
          {nextLabel || "Continue"} ›
        </button>
      </div>
    </div>
  );
}
