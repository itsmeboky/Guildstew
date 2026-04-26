import React, { useState } from "react";

/**
 * Coat-of-Arms (Guild Crest) builder shell.
 *
 * This file lays down the chrome only — the two-column layout, the
 * six-tab control bar, the fixed-height controls panel, the live
 * preview column, and the Randomize / Save action row. Tab contents
 * (Shield, Fill, Patterns, Emblems, Layers, Motto) and the live
 * SVG render arrive in later steps; each tab body is wired to a
 * named placeholder so it's obvious where to drop the panels in.
 *
 * Color + typography decisions are spec-locked:
 *   - Font everywhere: 'Cream', 'Cinzel', 'Segoe UI', sans-serif
 *   - Container background: 180deg purplish-navy gradient
 *   - Accent: #f8a47c (salmon/orange)
 *   - Borders: #2a3441
 *   - Inactive tab text: #64748b
 *   - Primary text: #e2e8f0
 */

const FONT_STACK = "'Cream', 'Cinzel', 'Segoe UI', sans-serif";

const TABS = [
  { id: "shield",   label: "Shield" },
  { id: "fill",     label: "Fill" },
  { id: "patterns", label: "Patterns" },
  { id: "emblems",  label: "Emblems" },
  { id: "layers",   label: "Layers" },
  { id: "motto",    label: "Motto" },
];

export default function CrestBuilder({ onSave, onRandomize }) {
  const [activeTab, setActiveTab] = useState("shield");

  return (
    <div
      style={{
        fontFamily: FONT_STACK,
        background:
          "linear-gradient(180deg, #100e1f 0%, #1a1730 50%, #0f0d1a 100%)",
        color: "#e2e8f0",
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid #2a3441",
        maxWidth: "940px",
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", gap: "20px" }}>
        {/* ── LEFT: controls ─────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ marginBottom: "14px" }}>
            <div
              style={{
                fontSize: "9px",
                color: "#f8a47c",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                fontWeight: 700,
              }}
            >
              Guild Crest
            </div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#f8a47c",
                margin: "4px 0 0 0",
                lineHeight: 1.1,
              }}
            >
              Coat of Arms Builder
            </h2>
          </div>

          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            {TABS.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    fontFamily: FONT_STACK,
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    fontWeight: 700,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "background 0.15s, border-color 0.15s, color 0.15s",
                    backgroundColor: isActive
                      ? "rgba(248,164,124,0.12)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(248,164,124,0.5)"
                      : "1px solid rgba(255,255,255,0.06)",
                    color: isActive ? "#f8a47c" : "#64748b",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Controls panel — FIXED HEIGHT 380px, no scroll. Tab
              content fills it in later steps; placeholders sit in
              now so the dimensions stay locked while the rest of
              the chrome lands. */}
          <div
            style={{
              height: "380px",
              backgroundColor: "rgba(30,36,48,0.5)",
              border: "1px solid #2a3441",
              borderRadius: "10px",
              padding: "14px",
              overflow: "hidden",
            }}
          >
            {activeTab === "shield"   && <TabPlaceholder label="Shield" />}
            {activeTab === "fill"     && <TabPlaceholder label="Fill" />}
            {activeTab === "patterns" && <TabPlaceholder label="Patterns" />}
            {activeTab === "emblems"  && <TabPlaceholder label="Emblems" />}
            {activeTab === "layers"   && <TabPlaceholder label="Layers" />}
            {activeTab === "motto"    && <TabPlaceholder label="Motto" />}
          </div>

          {/* Action row */}
          <div
            style={{
              marginTop: "14px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={onRandomize}
              style={{
                fontFamily: FONT_STACK,
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                padding: "10px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                backgroundColor: "transparent",
                border: "1px solid #f8a47c",
                color: "#f8a47c",
                transition: "background 0.15s",
              }}
            >
              🎲 Randomize
            </button>
            <button
              type="button"
              onClick={onSave}
              style={{
                fontFamily: FONT_STACK,
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                padding: "10px 18px",
                borderRadius: "8px",
                cursor: "pointer",
                background: "linear-gradient(135deg, #f8a47c, #e8856a)",
                border: "none",
                color: "#1E2430",
                marginLeft: "auto",
                boxShadow:
                  "0 4px 14px rgba(248,164,124,0.35), 0 1px 2px rgba(0,0,0,0.4)",
                transition: "transform 0.1s, box-shadow 0.15s",
              }}
            >
              Save Crest
            </button>
          </div>
        </div>

        {/* ── RIGHT: live preview ────────────────────────────────── */}
        <div style={{ width: "300px", flexShrink: 0 }}>
          <div
            style={{
              fontSize: "9px",
              color: "#f8a47c",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontWeight: 700,
              marginBottom: "10px",
            }}
          >
            Live Preview
          </div>
          <div
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              borderRadius: "12px",
              border: "1px solid rgba(248,164,124,0.25)",
              backgroundColor: "rgba(30,36,48,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
            }}
          >
            {/* Crest SVG renders here in a later step */}
            Crest Preview
          </div>
        </div>
      </div>
    </div>
  );
}

/** Placeholder inserted into the fixed-height controls panel until
 *  the per-tab editors land. Keeps the layout honest while the rest
 *  of the chrome is built out around it. */
function TabPlaceholder({ label }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
        fontSize: "10px",
        textTransform: "uppercase",
        letterSpacing: "0.2em",
        fontFamily: FONT_STACK,
      }}
    >
      {label} controls
    </div>
  );
}
