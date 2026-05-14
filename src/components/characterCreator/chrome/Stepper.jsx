import React from "react";

/**
 * Top-of-page step indicator for the character creator. Diamond-rotated
 * badges with a gradient progress bar underneath.
 *
 * Ported from design-reference/character-creator/ui.jsx (Stepper, ~196-248)
 * with the prototype's bare CSS variables (var(--gold), etc.) remapped to
 * Phase A's .cc- prefixed variables. Step labels mirror the existing
 * CharacterCreator.jsx STEPS array (currently 'Race' first); Phase C may
 * promote that to 'Identity' once step 1 is rebuilt.
 */
export const STEP_DEFS = [
  { id: "race", label: "Race" },
  { id: "class", label: "Class" },
  { id: "abilities", label: "Abilities" },
  { id: "features", label: "Features" },
  { id: "skills", label: "Skills" },
  { id: "spells", label: "Spells" },
  { id: "equipment", label: "Equipment" },
  { id: "review", label: "Review" },
];

export function Stepper({ current, completed = [], onClick }) {
  const total = STEP_DEFS.length;
  const progress = ((current + 1) / total) * 100;

  return (
    <div
      className="cc-panel"
      style={{ padding: "20px 24px", marginBottom: 28, position: "relative" }}
    >
      <div
        className="grid relative"
        style={{
          gridTemplateColumns: `repeat(${total}, 1fr)`,
          gap: 6,
          marginBottom: 16,
        }}
      >
        {/* Connecting line behind the badges. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 22,
            left: "5%",
            right: "5%",
            height: 1,
            background:
              "linear-gradient(90deg, var(--cc-gold-deep), var(--cc-gold), var(--cc-gold-deep))",
            opacity: 0.4,
            zIndex: 0,
          }}
        />
        {STEP_DEFS.map((step, i) => {
          const isDone = completed.includes(i);
          const isActive = i === current;
          const clickable = isDone || i <= current;
          return (
            <div
              key={step.id}
              onClick={() => clickable && onClick?.(i)}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (!clickable) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.(i);
                }
              }}
              style={{
                textAlign: "center",
                cursor: clickable ? "pointer" : "not-allowed",
                opacity: clickable ? 1 : 0.5,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  margin: "0 auto 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 16,
                  transition: "all .2s",
                  background: isActive
                    ? "radial-gradient(circle, var(--cc-orange) 0%, var(--cc-orange-deep) 100%)"
                    : isDone
                    ? "radial-gradient(circle, #1F3D38 0%, #0F1D1A 100%)"
                    : "var(--cc-bg-2)",
                  color: isActive
                    ? "white"
                    : isDone
                    ? "var(--cc-teal)"
                    : "var(--cc-text-faint)",
                  border: `2px solid ${
                    isActive
                      ? "var(--cc-gold)"
                      : isDone
                      ? "var(--cc-teal-dark)"
                      : "var(--cc-border)"
                  }`,
                  boxShadow: isActive
                    ? "0 0 0 4px rgba(255, 83, 0, 0.20), 0 0 18px var(--cc-orange-glow)"
                    : isDone
                    ? "0 0 12px rgba(55, 242, 209, 0.2)"
                    : "none",
                  transform: "rotate(45deg)",
                  fontFamily: "var(--cc-display)",
                }}
              >
                <span style={{ transform: "rotate(-45deg)" }}>
                  {isDone && !isActive ? "✓" : i + 1}
                </span>
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: isActive
                    ? "var(--cc-orange-soft)"
                    : isDone
                    ? "var(--cc-teal)"
                    : "var(--cc-text-faint)",
                }}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: "rgba(20, 12, 8, 0.6)",
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid var(--cc-border-faint)",
        }}
      >
        <div
          style={{
            height: "100%",
            background:
              "linear-gradient(90deg, var(--cc-orange-deep) 0%, var(--cc-orange) 40%, var(--cc-gold) 80%, var(--cc-teal) 100%)",
            width: `${progress}%`,
            transition: "width 0.5s ease",
            boxShadow: "0 0 12px var(--cc-orange-glow)",
          }}
        />
      </div>
    </div>
  );
}
