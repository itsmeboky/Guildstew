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

// Built-in shield silhouettes. Path data + viewBox stay literal so
// downstream renderers (preview, save-to-PNG) can plug them straight
// into an <svg> without further normalization.
export const SHIELDS = {
  heater:  { label: "Heater",  vb: "0 0 200 240", d: "M10,10 L190,10 L190,140 Q190,220 100,235 Q10,220 10,140 Z" },
  kite:    { label: "Kite",    vb: "0 0 160 260", d: "M80,5 L155,60 L155,160 Q155,240 80,255 Q5,240 5,160 L5,60 Z" },
  round:   { label: "Round",   vb: "0 0 200 200", d: "M100,5 A95,95 0 1,1 100,195 A95,95 0 1,1 100,5 Z" },
  pointed: { label: "Pointed", vb: "0 0 200 260", d: "M100,5 L195,70 L195,170 L100,255 L5,170 L5,70 Z" },
  banner:  { label: "Banner",  vb: "0 0 200 240", d: "M10,10 L190,10 L190,200 L100,230 L10,200 Z" },
};

export default function CrestBuilder({ onSave, onRandomize }) {
  const [activeTab, setActiveTab] = useState("shield");
  const [selectedShieldId, setSelectedShieldId] = useState("heater");
  const [customShield, setCustomShield] = useState(null);

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
            {activeTab === "shield" && (
              <ShieldTab
                selectedShieldId={selectedShieldId}
                onSelectShield={setSelectedShieldId}
                customShield={customShield}
                onCustomShield={setCustomShield}
              />
            )}
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

/**
 * Shield tab — picks the silhouette every other layer is masked to.
 *
 * Renders the five built-in shapes as 60x70 thumbnail cards plus a
 * sixth dashed "Upload SVG" card. Custom uploads are parsed in the
 * browser via DOMParser; we yank the first <path>'s `d` and the
 * SVG's `viewBox` (defaulting to the heater box if the file omits
 * one). When a custom shield is active a small "Remove custom"
 * button appears so the user can drop back to the built-ins.
 */
function ShieldTab({ selectedShieldId, onSelectShield, customShield, onCustomShield }) {
  const fileInputRef = React.useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      const pathEl = doc.querySelector("path");
      if (!pathEl) {
        alert("SVG must contain a <path> element.");
        e.target.value = "";
        return;
      }
      const d = pathEl.getAttribute("d") || "";
      const vb = svgEl?.getAttribute("viewBox") || "0 0 200 240";
      const label = file.name.replace(/\.svg$/i, "") || "Custom";
      onCustomShield({ vb, d, label });
      onSelectShield("custom");
    } catch {
      alert("Couldn't read that file. Make sure it's a valid SVG.");
    }
    e.target.value = "";
  };

  const handleRemoveCustom = () => {
    onCustomShield(null);
    if (selectedShieldId === "custom") onSelectShield("heater");
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        {Object.entries(SHIELDS).map(([id, s]) => (
          <ShieldCard
            key={id}
            shield={s}
            selected={selectedShieldId === id}
            onClick={() => onSelectShield(id)}
          />
        ))}

        {customShield ? (
          <ShieldCard
            shield={customShield}
            selected={selectedShieldId === "custom"}
            onClick={() => onSelectShield("custom")}
          />
        ) : null}

        <CustomUploadCard
          inputRef={fileInputRef}
          onUpload={handleUpload}
        />
      </div>

      {customShield && (
        <button
          type="button"
          onClick={handleRemoveCustom}
          style={{
            marginTop: "10px",
            alignSelf: "flex-start",
            fontFamily: FONT_STACK,
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            padding: "6px 10px",
            borderRadius: "6px",
            cursor: "pointer",
            backgroundColor: "transparent",
            border: "1px solid #ef4444",
            color: "#ef4444",
          }}
        >
          ✕ Remove custom
        </button>
      )}

      <div style={{ flex: 1 }} />
      <p
        style={{
          margin: 0,
          fontSize: "9px",
          color: "#4a5568",
          fontStyle: "italic",
          fontFamily: FONT_STACK,
        }}
      >
        Upload .svg with a single path for a custom shield shape.
      </p>
    </div>
  );
}

function ShieldCard({ shield, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={shield.label}
      style={{
        width: "60px",
        height: "70px",
        padding: "4px",
        cursor: "pointer",
        borderRadius: "6px",
        backgroundColor: selected
          ? "rgba(248,164,124,0.08)"
          : "#1E2430",
        border: selected
          ? "2px solid #f8a47c"
          : "1px solid #2a3441",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.15s, border-color 0.15s",
        fontFamily: FONT_STACK,
      }}
    >
      <svg
        viewBox={shield.vb}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <path
          d={shield.d}
          fill="#2a3441"
          stroke="#f8a47c"
          strokeWidth={4}
          strokeOpacity={selected ? 1 : 0.4}
        />
      </svg>
    </button>
  );
}

function CustomUploadCard({ inputRef, onUpload }) {
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Upload custom SVG shield"
        style={{
          width: "60px",
          height: "70px",
          cursor: "pointer",
          borderRadius: "6px",
          backgroundColor: "transparent",
          border: "1px dashed rgba(248,164,124,0.25)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2px",
          color: "#f8a47c",
          fontFamily: FONT_STACK,
        }}
      >
        <span style={{ fontSize: "20px", lineHeight: 1, fontWeight: 300 }}>+</span>
        <span
          style={{
            fontSize: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 700,
          }}
        >
          Upload SVG
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml"
        onChange={onUpload}
        style={{ display: "none" }}
      />
    </>
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
