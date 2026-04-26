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

// Heraldic palette — kept in one list because Fill / Pattern1 /
// Pattern2 / future Emblem pickers all share the same swatch row.
export const PRESET_COLORS = [
  "#f59e0b", "#dc2626", "#2563eb", "#16a34a", "#7c3aed",
  "#9ca3af", "#1a1a1a", "#ffffff", "#c2410c", "#0891b2",
  "#be185d", "#4f46e5", "#059669", "#d97706", "#64748b",
];

// Public Supabase storage root. Anything we hot-link from inside
// the builder hangs off this so url assembly stays one-line.
export const SB = "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public";

// Built-in emblem catalog. Two categories of 12 each (24 total) hosted
// in the existing app-assets bucket — file names are
// `Arcane1.svg`..`Arcane12.svg` and `general1.svg`..`general12.svg`.
// Adding a new category is a one-line addition here.
export const EMBLEM_CATEGORIES = {
  arcane:  { label: "Arcane",  count: 12, prefix: "Arcane",  path: `${SB}/app-assets/guild/guildcrest` },
  general: { label: "General", count: 12, prefix: "general", path: `${SB}/app-assets/guild/guildcrest` },
};

// Flatten the category descriptors into a renderable list. Built
// once at module load — the catalog is static, so there's no need
// to recompute it per-render.
export const buildEmblemList = () => {
  const list = [];
  Object.entries(EMBLEM_CATEGORIES).forEach(([catKey, cat]) => {
    for (let i = 1; i <= cat.count; i++) {
      list.push({
        id: `${catKey}${i}`,
        label: `${cat.label} ${i}`,
        url: `${cat.path}/${cat.prefix}${i}.svg`,
        category: catKey,
      });
    }
  });
  return list;
};

export const EMBLEM_LIST = buildEmblemList();

// Pattern catalog — id → human label. Render geometry lives in
// `renderPattern` below; this map drives the picker UI and lets the
// rest of the app look up a friendly label without duplicating
// strings.
export const PATTERNS = {
  none:      "None",
  chevron:   "Chevron",
  quartered: "Quartered",
  hsplit:    "Horizontal",
  vsplit:    "Vertical",
  diagonal:  "Diagonal",
  checkered: "Checkered",
  border:    "Border",
  circle:    "Circle",
  sunburst:  "Sunburst",
  cross:     "Cross",
  saltire:   "Saltire (X)",
  paly:      "Paly (V-Stripes)",
  barry:     "Barry (H-Stripes)",
  bend:      "Bend",
  fess:      "Fess (Band)",
};

export default function CrestBuilder({ onSave, onRandomize }) {
  const [activeTab, setActiveTab] = useState("shield");
  const [selectedShieldId, setSelectedShieldId] = useState("heater");
  const [customShield, setCustomShield] = useState(null);

  // Fill state (Step 4). Solid = single color; Gradient = top→bottom
  // linear from primary to secondary. Defaults seed a neutral
  // heraldic gold-on-blue feel so the preview looks intentional
  // before the user picks anything.
  const [backgroundType, setBackgroundType] = useState("solid");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [secondaryColor, setSecondaryColor] = useState("#1a1a1a");

  // Patterns state (Step 5). Two stackable layers, each with type
  // + color. Layer order is owned separately so the future Layers
  // tab can rearrange without touching either pattern's own state.
  const [pattern1, setPattern1] = useState({ type: "none", color: "#f59e0b" });
  const [pattern2, setPattern2] = useState({ type: "none", color: "#ffffff" });

  // Layer order — drives render z-stacking. Earlier in the array =
  // rendered first = visually behind later items. Background is
  // always at the bottom and Motto always at the top, so neither
  // appears in this list. Emblems will append to it in Task 2.
  const [layerOrder] = useState(["pattern1", "pattern2"]);

  // Resolve the active shield (built-in or user-uploaded) once so
  // every consumer (preview + future thumbnails) reads the same
  // path/viewBox without re-doing the lookup.
  const shield = selectedShieldId === "custom" && customShield
    ? customShield
    : SHIELDS[selectedShieldId] || SHIELDS.heater;

  const crestProps = {
    shield,
    backgroundType,
    primaryColor,
    secondaryColor,
    pattern1,
    pattern2,
    layerOrder,
  };

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
            {activeTab === "fill" && (
              <FillTab
                backgroundType={backgroundType}
                onBackgroundType={setBackgroundType}
                primaryColor={primaryColor}
                onPrimaryColor={setPrimaryColor}
                secondaryColor={secondaryColor}
                onSecondaryColor={setSecondaryColor}
              />
            )}
            {activeTab === "patterns" && (
              <PatternsTab
                pattern1={pattern1}
                onPattern1={setPattern1}
                pattern2={pattern2}
                onPattern2={setPattern2}
              />
            )}
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

          {/* Main preview frame */}
          <div
            style={{
              padding: "16px",
              background:
                "radial-gradient(circle, rgba(248,164,124,0.03) 0%, transparent 70%)",
              border: "1px solid #2a3441",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              filter:
                "drop-shadow(0 6px 20px rgba(0,0,0,0.5)) drop-shadow(0 0 8px rgba(248,164,124,0.06))",
            }}
          >
            <CrestSvg width={240} {...crestProps} />
          </div>

          {/* Guild label */}
          <div style={{ marginTop: "12px", textAlign: "center" }}>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: "#f8a47c",
                fontFamily: FONT_STACK,
                lineHeight: 1.1,
              }}
            >
              Your Guild Name
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "#4a5568",
                marginTop: "2px",
                fontFamily: FONT_STACK,
              }}
            >
              Est. 2026
            </div>
          </div>

          {/* Size previews — sidebar / profile / hall */}
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            {[
              { size: 40,  label: "Sidebar" },
              { size: 72,  label: "Profile" },
              { size: 105, label: "Hall" },
            ].map(({ size, label }) => (
              <div
                key={label}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
              >
                <CrestSvg width={size} {...crestProps} />
                <span
                  style={{
                    fontSize: "8px",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    fontFamily: FONT_STACK,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Layer stack */}
          <LayerStack
            layerOrder={layerOrder}
            pattern1={pattern1}
            pattern2={pattern2}
          />
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

/**
 * Fill tab — picks the shield's base coat. Starts with a Solid /
 * Gradient toggle that reuses the tab-bar's active styling so the
 * affordances feel native, then drops the primary ColorPicker
 * underneath. Secondary picker only mounts when Gradient is on
 * (linearGradient renders top→bottom in the preview SVG).
 */
function FillTab({
  backgroundType,
  onBackgroundType,
  primaryColor,
  onPrimaryColor,
  secondaryColor,
  onSecondaryColor,
}) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>
      <SegmentedToggle
        label="Background"
        options={[
          { value: "solid",    label: "Solid" },
          { value: "gradient", label: "Gradient" },
        ]}
        value={backgroundType}
        onChange={onBackgroundType}
      />

      <ColorPicker
        label={backgroundType === "gradient" ? "Primary Color" : "Color"}
        value={primaryColor}
        onChange={onPrimaryColor}
      />

      {backgroundType === "gradient" && (
        <ColorPicker
          label="Secondary Color"
          value={secondaryColor}
          onChange={onSecondaryColor}
        />
      )}
    </div>
  );
}

/**
 * Segmented two-or-more-button toggle. Re-uses the active/inactive
 * styling from the tab bar so every "pick one of these" choice in
 * the builder feels like the same control.
 */
function SegmentedToggle({ label, options, value, onChange }) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          color: "#f8a47c",
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          fontWeight: 700,
          fontFamily: FONT_STACK,
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                fontFamily: FONT_STACK,
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                fontWeight: 700,
                padding: "8px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                backgroundColor: active
                  ? "rgba(248,164,124,0.12)"
                  : "transparent",
                border: active
                  ? "1px solid rgba(248,164,124,0.5)"
                  : "1px solid rgba(255,255,255,0.06)",
                color: active ? "#f8a47c" : "#64748b",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Reusable color picker — a label, a 26x26 native color input, and
 * the 15-swatch heraldic palette. Selected swatch picks up the
 * salmon ring + soft glow. Native input is for off-palette picks;
 * its value lives outside the swatch set, so we only highlight a
 * swatch when it matches the current value exactly.
 */
function ColorPicker({ label, value, onChange }) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          color: "#f8a47c",
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          fontWeight: 700,
          fontFamily: FONT_STACK,
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "26px",
            height: "26px",
            border: "1px solid #2a3441",
            borderRadius: "4px",
            padding: 0,
            background: "transparent",
            cursor: "pointer",
          }}
        />
        {PRESET_COLORS.map((c) => {
          const selected = value?.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => onChange(c)}
              style={{
                width: "16px",
                height: "16px",
                padding: 0,
                cursor: "pointer",
                backgroundColor: c,
                border: selected
                  ? "2px solid #f8a47c"
                  : "1px solid rgba(255,255,255,0.08)",
                borderRadius: "3px",
                boxShadow: selected
                  ? "0 0 4px rgba(248,164,124,0.4)"
                  : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Patterns tab — two stacked pickers separated by a divider.
 *
 * Each picker is a wrap-row of 16 type buttons (matching the tab
 * bar's active/inactive style) plus a ColorPicker that hides when
 * the type is "None". Layer ordering is the Layers tab's job; this
 * panel only owns each layer's type + color.
 */
function PatternsTab({ pattern1, onPattern1, pattern2, onPattern2 }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
      <PatternPicker
        label="Pattern 1"
        value={pattern1}
        onChange={onPattern1}
      />
      <div style={{ borderTop: "1px solid #2a3441" }} />
      <PatternPicker
        label="Pattern 2"
        value={pattern2}
        onChange={onPattern2}
      />
      <div style={{ flex: 1 }} />
      <p
        style={{
          margin: 0,
          fontSize: "8px",
          color: "#4a5568",
          fontStyle: "italic",
          fontFamily: FONT_STACK,
        }}
      >
        Use the Layers tab to control render order.
      </p>
    </div>
  );
}

function PatternPicker({ label, value, onChange }) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          color: "#f8a47c",
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          fontWeight: 700,
          fontFamily: FONT_STACK,
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
        {Object.entries(PATTERNS).map(([id, lbl]) => {
          const active = value.type === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ ...value, type: id })}
              style={{
                fontFamily: FONT_STACK,
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 700,
                padding: "5px 8px",
                borderRadius: "6px",
                cursor: "pointer",
                backgroundColor: active
                  ? "rgba(248,164,124,0.12)"
                  : "transparent",
                border: active
                  ? "1px solid rgba(248,164,124,0.5)"
                  : "1px solid rgba(255,255,255,0.06)",
                color: active ? "#f8a47c" : "#64748b",
              }}
            >
              {lbl}
            </button>
          );
        })}
      </div>
      {value.type !== "none" && (
        <ColorPicker
          label="Color"
          value={value.color}
          onChange={(c) => onChange({ ...value, color: c })}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
//  Emblem SVG fetch + recolor pipeline
// ───────────────────────────────────────────────────────────────
//
// Emblems are recolorable because we don't drop the original file
// in via <img>. Instead we fetch the SVG text, parse out every
// shape element (path/circle/rect/etc), strip its fill / stroke /
// style attributes so the file's baked-in colors don't override
// us, and re-mount each element with our own fill + stroke. The
// original viewBox is preserved so emblems scale correctly inside
// any shield silhouette.
//
// `svgCache` is a process-wide memoization; each emblem URL is
// fetched at most once per page load.

const svgCache = {};

export async function fetchSVGPaths(url) {
  if (svgCache[url]) return svgCache[url];
  try {
    const text = await (await fetch(url)).text();
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.querySelector("svg");
    const vb = svg?.getAttribute("viewBox") || "0 0 100 100";
    const elements = Array.from(
      doc.querySelectorAll("path,circle,rect,polygon,polyline,ellipse,line"),
    ).map((el) => {
      const attrs = {};
      for (const a of el.attributes) {
        // Drop the source's own coloring so our dynamic fill wins.
        if (!["fill", "stroke", "style"].includes(a.name)) {
          attrs[a.name] = a.value;
        }
      }
      return { tag: el.tagName.toLowerCase(), attrs };
    });
    const result = { vb, elements };
    svgCache[url] = result;
    return result;
  } catch {
    return null;
  }
}

/**
 * Render a parsed-and-cached emblem onto the crest.
 *
 * The transform stack (read right-to-left) is:
 *   1. translate(-evw/2, -evh/2)  — move emblem so its own
 *                                    viewBox center sits at origin
 *   2. scale(s)                    — scale by user slider * 70% of
 *                                    the field/emblem width ratio
 *   3. translate(x%, y%)           — drop the (now centered) emblem
 *                                    at the user-picked spot inside
 *                                    the shield's coord space
 *
 * The whole group is clipped to the shield's clipPath so any part
 * of the emblem that overhangs the silhouette is hidden cleanly.
 */
export function EmblemOnCrest({ data, color, scale, x, y, clipId, vb }) {
  if (!data) return null;
  const [, , cw, ch] = vb.split(" ").map(Number);
  const [, , evw, evh] = data.vb.split(" ").map(Number);
  const s = scale * (cw / evw) * 0.7;
  return (
    <g
      transform={`translate(${(x / 100) * cw},${(y / 100) * ch}) scale(${s}) translate(${-evw / 2},${-evh / 2})`}
      clipPath={`url(#${clipId})`}
    >
      {data.elements.map((el, i) => {
        const Tag = el.tag;
        return (
          <Tag
            key={i}
            {...el.attrs}
            fill={color}
            stroke={color}
            strokeWidth="0.5"
            opacity="0.92"
          />
        );
      })}
    </g>
  );
}

/**
 * Pattern → SVG geometry. Returns a JSX fragment positioned inside
 * the shield's coordinate system (the caller is responsible for
 * mounting it inside the right <svg viewBox=…>). Every pattern is
 * clipped to the shield's silhouette via clipPath so off-edge
 * geometry never leaks outside the heraldic field.
 *
 * Args:
 *   type     — one of PATTERNS' keys
 *   color    — fill color
 *   vb       — shield viewBox string ("x y w h")
 *   clipId   — the id of a <clipPath> wrapping the shield path
 *   shieldD  — the shield path's `d` attribute (used by the
 *              `border` pattern, which strokes the shield itself)
 */
export function renderPattern(type, color, vb, clipId, shieldD) {
  if (!type || type === "none") return null;
  const [vx, vy, w, h] = vb.split(/\s+/).map(Number);
  const cx = vx + w / 2;
  const cy = vy + h / 2;
  const minDim = Math.min(w, h);
  const clip = `url(#${clipId})`;

  switch (type) {
    case "chevron": {
      // Heraldic chevron: peak at upper-center, legs sweeping down to
      // the lower corners. Band thickness ~20% of the field height.
      const apexY = vy + h * 0.4;
      const upperCornerY = vy + h * 0.6;
      const lowerCornerY = vy + h * 0.8;
      const innerApexY = vy + h * 0.6;
      const d = `M ${vx} ${upperCornerY} L ${cx} ${apexY} L ${vx + w} ${upperCornerY} L ${vx + w} ${lowerCornerY} L ${cx} ${innerApexY} L ${vx} ${lowerCornerY} Z`;
      return <path d={d} fill={color} clipPath={clip} />;
    }

    case "quartered":
      return (
        <g clipPath={clip}>
          <rect x={vx}         y={vy}         width={w / 2} height={h / 2} fill={color} />
          <rect x={vx + w / 2} y={vy + h / 2} width={w / 2} height={h / 2} fill={color} />
        </g>
      );

    case "hsplit":
      return <rect x={vx} y={vy} width={w} height={h / 2} fill={color} clipPath={clip} />;

    case "vsplit":
      return <rect x={vx + w / 2} y={vy} width={w / 2} height={h} fill={color} clipPath={clip} />;

    case "diagonal":
      // Upper-right triangle: top-left → top-right → bottom-right.
      return (
        <polygon
          points={`${vx},${vy} ${vx + w},${vy} ${vx + w},${vy + h}`}
          fill={color}
          clipPath={clip}
        />
      );

    case "checkered": {
      const cols = 5;
      const rows = 6;
      const cw = w / cols;
      const ch = h / rows;
      const cells = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c) % 2 === 0) {
            cells.push(
              <rect
                key={`${r}-${c}`}
                x={vx + c * cw}
                y={vy + r * ch}
                width={cw}
                height={ch}
                fill={color}
              />,
            );
          }
        }
      }
      return <g clipPath={clip}>{cells}</g>;
    }

    case "border":
      // Inset stroke: stroke the shield path itself with a fat width
      // and clip to the same path so only the inner half of the
      // stroke is visible — gives a clean inset ribbon.
      return (
        <path
          d={shieldD}
          fill="none"
          stroke={color}
          strokeWidth={Math.max(8, minDim * 0.08)}
          clipPath={clip}
        />
      );

    case "circle":
      return <circle cx={cx} cy={cy} r={minDim * 0.28} fill={color} clipPath={clip} />;

    case "sunburst": {
      // 12 triangular rays radiating from center. Each ray spans
      // 15° with a 15° gap, so the rays read as discrete spokes.
      const rays = [];
      const radius = Math.max(w, h);
      for (let i = 0; i < 12; i++) {
        const a1 = ((i * 30) - 7.5) * Math.PI / 180;
        const a2 = ((i * 30) + 7.5) * Math.PI / 180;
        const p1 = `${cx + radius * Math.cos(a1)},${cy + radius * Math.sin(a1)}`;
        const p2 = `${cx + radius * Math.cos(a2)},${cy + radius * Math.sin(a2)}`;
        rays.push(
          <polygon
            key={i}
            points={`${cx},${cy} ${p1} ${p2}`}
            fill={color}
          />,
        );
      }
      return <g clipPath={clip}>{rays}</g>;
    }

    case "cross": {
      const vBarW = w * 0.2;
      const hBarH = h * 0.2;
      return (
        <g clipPath={clip}>
          <rect x={cx - vBarW / 2} y={vy}         width={vBarW} height={h}     fill={color} />
          <rect x={vx}             y={cy - hBarH / 2} width={w}     height={hBarH} fill={color} />
        </g>
      );
    }

    case "saltire": {
      // Diagonal X. Strokes 12% of the smaller dimension so the
      // crossbars stay visually balanced regardless of shield ratio.
      const sw = minDim * 0.12;
      return (
        <g clipPath={clip} stroke={color} strokeWidth={sw} strokeLinecap="butt">
          <line x1={vx} y1={vy} x2={vx + w} y2={vy + h} />
          <line x1={vx + w} y1={vy} x2={vx} y2={vy + h} />
        </g>
      );
    }

    case "paly": {
      // 6 vertical stripes, alternating filled (3 fills + 3 gaps).
      const sw = w / 6;
      const stripes = [];
      for (let i = 0; i < 6; i++) {
        if (i % 2 === 0) {
          stripes.push(
            <rect key={i} x={vx + i * sw} y={vy} width={sw} height={h} fill={color} />,
          );
        }
      }
      return <g clipPath={clip}>{stripes}</g>;
    }

    case "barry": {
      // 8 horizontal stripes, alternating filled (4 fills + 4 gaps).
      const sh = h / 8;
      const stripes = [];
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0) {
          stripes.push(
            <rect key={i} x={vx} y={vy + i * sh} width={w} height={sh} fill={color} />,
          );
        }
      }
      return <g clipPath={clip}>{stripes}</g>;
    }

    case "bend": {
      // Diagonal band from upper-left to lower-right, 15% of minDim.
      const sw = minDim * 0.15;
      return (
        <line
          x1={vx}
          y1={vy}
          x2={vx + w}
          y2={vy + h}
          stroke={color}
          strokeWidth={sw}
          clipPath={clip}
        />
      );
    }

    case "fess":
      return (
        <rect
          x={vx}
          y={cy - h * 0.1}
          width={w}
          height={h * 0.2}
          fill={color}
          clipPath={clip}
        />
      );

    default:
      return null;
  }
}

/**
 * The crest itself. Used by the main preview, the three size
 * thumbnails, and (eventually) the saved-to-PNG flattener — same
 * pipeline so what the user designs is what they get.
 *
 * Render order, bottom → top:
 *   1. Shield path filled with the background (solid color or
 *      url(#linearGradient)).
 *   2. Pattern layers in `layerOrder`, each clipped to the shield.
 *   3. Shield border stroke (rgba(248,164,124,0.25), strokeWidth 3)
 *      painted over the top so the silhouette stays crisp.
 */
function CrestSvg({
  width,
  shield,
  backgroundType,
  primaryColor,
  secondaryColor,
  pattern1,
  pattern2,
  layerOrder,
}) {
  // Stable-ish ids per CrestSvg instance so multiple previews on the
  // same page don't collide. `useId` would also work — keeping a
  // ref-counter avoids the hydration mismatch surface for now.
  const idRef = React.useRef(null);
  if (idRef.current === null) {
    idRef.current = `crest-${Math.random().toString(36).slice(2, 9)}`;
  }
  const clipId     = `${idRef.current}-clip`;
  const gradientId = `${idRef.current}-bg`;

  const fill = backgroundType === "gradient"
    ? `url(#${gradientId})`
    : primaryColor;

  const layerPattern = (id) => {
    const p = id === "pattern1" ? pattern1 : id === "pattern2" ? pattern2 : null;
    if (!p) return null;
    return (
      <React.Fragment key={id}>
        {renderPattern(p.type, p.color, shield.vb, clipId, shield.d)}
      </React.Fragment>
    );
  };

  return (
    <svg
      viewBox={shield.vb}
      width={width}
      height={width}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={shield.d} />
        </clipPath>
        {backgroundType === "gradient" && (
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
        )}
      </defs>

      {/* 1. Shield base */}
      <path d={shield.d} fill={fill} />

      {/* 2. Pattern layers — render in layerOrder so the Layers tab
            can later reorder by mutating that single array. */}
      {layerOrder.map(layerPattern)}

      {/* 3. Shield border, painted last so patterns can't bleed
            past the silhouette outline. */}
      <path
        d={shield.d}
        fill="none"
        stroke="rgba(248,164,124,0.25)"
        strokeWidth={3}
      />
    </svg>
  );
}

/**
 * Render-order indicator. Top of the panel is the topmost rendered
 * layer (Motto), bottom of the panel is the back-most (Background).
 * Pattern / Emblem layers in between come from `layerOrder` and
 * dim to 0.4 opacity when their type is "None" so it's obvious
 * which slots are doing nothing.
 */
function LayerStack({ layerOrder, pattern1, pattern2 }) {
  const slotMeta = {
    pattern1: { label: `Pattern 1: ${PATTERNS[pattern1.type]}`, color: pattern1.color, active: pattern1.type !== "none" },
    pattern2: { label: `Pattern 2: ${PATTERNS[pattern2.type]}`, color: pattern2.color, active: pattern2.type !== "none" },
  };

  // Reverse so the top-of-stack (last-rendered) reads at the top of
  // the visual list. Motto sits above all patterns; Background below.
  const middle = [...layerOrder].reverse();

  const rows = [
    { key: "motto",      label: "Motto (top)", color: "#f8a47c", active: true },
    ...middle.map((id) => ({
      key: id,
      label: slotMeta[id]?.label || id,
      color: slotMeta[id]?.color || "#64748b",
      active: !!slotMeta[id]?.active,
    })),
    { key: "background", label: "Background", color: "#f8a47c", active: true },
  ];

  return (
    <div
      style={{
        marginTop: "16px",
        padding: "10px 12px",
        backgroundColor: "rgba(30,36,48,0.5)",
        border: "1px solid #2a3441",
        borderRadius: "10px",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          color: "#f8a47c",
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          fontWeight: 700,
          fontFamily: FONT_STACK,
          marginBottom: "8px",
        }}
      >
        Layer Stack
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {rows.map((r) => (
          <div
            key={r.key}
            style={{
              opacity: r.active ? 1 : 0.4,
              borderLeft: `3px solid ${r.color}`,
              paddingLeft: "8px",
              fontSize: "10px",
              color: "#e2e8f0",
              fontFamily: FONT_STACK,
              lineHeight: 1.4,
            }}
          >
            {r.label}
          </div>
        ))}
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
