import React from "react";

export function StepNav({ onBack, onNext, canBack, canNext, nextLabel, blockedReason }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
      <button type="button" className="btn btn-ghost" onClick={onBack} disabled={!canBack}>
        ‹ Back
      </button>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {blockedReason && !canNext && (
          <div style={{ fontSize: 13, color: "var(--warn)", fontWeight: 600 }}>
            ⚠ {blockedReason}
          </div>
        )}
        <button type="button" className="btn btn-primary" onClick={onNext} disabled={!canNext}>
          {nextLabel || "Continue"} ›
        </button>
      </div>
    </div>
  );
}
