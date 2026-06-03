import React from "react";

// Must mirror the STEPS array in CharacterCreator.jsx — the indicator
// keys its highlight/click off the same indices.
export const STEP_DEFS = [
  { id: "identity", label: "Identity" },
  { id: "class", label: "Class & Path" },
  { id: "abilities", label: "Abilities" },
  { id: "spells", label: "Spells" },
  { id: "features", label: "Features" },
  { id: "skills", label: "Skills" },
  { id: "equipment", label: "Equipment" },
  { id: "review", label: "Review" },
];

export function Stepper({ current, completed = [], onClick }) {
  return (
    <div className="panel" style={{ padding: "20px 24px", marginBottom: 28, position: "relative" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${STEP_DEFS.length}, 1fr)`, gap: 6, marginBottom: 16, position: "relative" }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 22,
            left: "5%",
            right: "5%",
            height: 1,
            background: "linear-gradient(90deg, var(--gold-deep), var(--gold), var(--gold-deep))",
            opacity: 0.4,
            zIndex: 0,
          }}
        />
        {STEP_DEFS.map((s, i) => {
          const isDone = completed.includes(i);
          const isActive = i === current;
          const clickable = isDone || i < current || i === current;
          return (
            <div
              key={s.id}
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
              style={{ textAlign: "center", cursor: clickable ? "pointer" : "not-allowed", opacity: clickable ? 1 : 0.5, position: "relative", zIndex: 1 }}
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
                    ? "radial-gradient(circle, var(--orange) 0%, var(--orange-deep) 100%)"
                    : isDone
                    ? "radial-gradient(circle, #1F3D38 0%, #0F1D1A 100%)"
                    : "var(--bg-2)",
                  color: isActive ? "white" : isDone ? "var(--teal)" : "var(--text-faint)",
                  border: `2px solid ${isActive ? "var(--gold)" : isDone ? "var(--teal-dark)" : "var(--border)"}`,
                  boxShadow: isActive
                    ? "0 0 0 4px rgba(255,83,0,0.20), 0 0 18px var(--orange-glow)"
                    : isDone
                    ? "0 0 12px rgba(55, 242, 209, 0.2)"
                    : "none",
                  transform: "rotate(45deg)",
                  fontFamily: "var(--display)",
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
                  color: isActive ? "var(--orange-soft)" : isDone ? "var(--teal)" : "var(--text-faint)",
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 4, background: "rgba(20, 12, 8, 0.6)", borderRadius: 2, overflow: "hidden", border: "1px solid var(--border-faint)" }}>
        <div
          style={{
            height: "100%",
            background: "linear-gradient(90deg, var(--orange-deep) 0%, var(--orange) 40%, var(--gold) 80%, var(--teal) 100%)",
            width: `${((current + 1) / STEP_DEFS.length) * 100}%`,
            transition: "width 0.5s ease",
            boxShadow: "0 0 12px var(--orange-glow)",
          }}
        />
      </div>
    </div>
  );
}
