import React, { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";

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

// Per-slot emblem state factory. Centered (50, 45) on the field at
// 1.0 scale. Color matches the gold default of the rest of the
// builder so a freshly-added emblem reads on the dark fill.
export const defaultEmblemSlot = () => ({
  id: "none",
  color: "#f59e0b",
  scale: 1.0,
  x: 50,
  y: 45,
  svgData: null,
  customLabel: null,
});

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

export default function CrestBuilder({
  guildOwnerId = null,
  initialCrestData = null,
  onSaved,
  onRandomize,
}) {
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

  // Emblems — up to 4 slots. Starts with one empty slot so the
  // Emblems tab always has something to point at. `activeIdx`
  // tracks which slot the picker / sliders currently mutate.
  const [emblems, setEmblems] = useState([defaultEmblemSlot()]);
  const [activeEmblemIdx, setActiveEmblemIdx] = useState(0);

  // Mutate one slot in place. Wrapped in a stable callback so
  // children that take it as a prop don't churn on every render.
  const updateEmblem = React.useCallback((idx, updates) => {
    setEmblems((prev) => prev.map((slot, i) => (i === idx ? { ...slot, ...updates } : slot)));
  }, []);

  // Pick a built-in emblem into the active slot — fetch + parse
  // first so the slot lands with svgData ready to render. A null
  // `def` clears the active slot (the "None" filter row uses this
  // path).
  const selectEmblem = React.useCallback(async (def) => {
    if (!def) {
      setEmblems((prev) => prev.map((slot, i) => (
        i === activeEmblemIdx
          ? { ...slot, id: "none", svgData: null, customLabel: null }
          : slot
      )));
      return;
    }
    console.log("Selected emblem:", def.id, def.url);
    const data = await fetchSVGPaths(def.url);
    console.log("Fetched data:", data);
    if (!data) {
      console.error("Failed to fetch/parse SVG for", def.url);
      return;
    }
    console.log("Setting svgData with", data.elements.length, "elements");
    setEmblems((prev) => {
      const next = prev.map((slot, i) => (
        i === activeEmblemIdx
          ? { ...slot, id: def.id, svgData: data, customLabel: def.label }
          : slot
      ));
      console.log("Updated emblem slot:", activeEmblemIdx, next[activeEmblemIdx]);
      return next;
    });
  }, [activeEmblemIdx]);

  const addEmblem = React.useCallback(() => {
    setEmblems((prev) => {
      if (prev.length >= 4) return prev;
      const next = [...prev, defaultEmblemSlot()];
      setActiveEmblemIdx(next.length - 1);
      return next;
    });
  }, []);

  const removeEmblem = React.useCallback((idx) => {
    setEmblems((prev) => {
      // Always keep at least one slot — removing the last just
      // resets it to the default empty state.
      if (prev.length <= 1) {
        setActiveEmblemIdx(0);
        return [defaultEmblemSlot()];
      }
      const next = prev.filter((_, i) => i !== idx);
      setActiveEmblemIdx((cur) => Math.min(cur, next.length - 1));
      return next;
    });
  }, []);

  // Layer order — drives render z-stacking. Earlier in the array =
  // rendered first = visually behind later items. Background is
  // always at the bottom and Motto always at the top, so neither
  // appears in this list. Emblems sit between the two patterns by
  // default; the Layers tab can rearrange.
  const [layerOrder, setLayerOrder] = useState(["pattern1", "pattern2", "emblems"]);

  // Motto state. Cap at 30 chars; rendered on a ribbon at the foot
  // of the shield in the preview (only when the rendered crest is
  // big enough to read it).
  const [motto, setMotto] = useState("");
  const [mottoColor, setMottoColor] = useState("#fbbf24");

  const [randomizing, setRandomizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hadCustomEmblem, setHadCustomEmblem] = useState(false);

  // Ref to the main preview's <svg> element. Save serializes this
  // node, rasterizes it through a canvas, and uploads the result.
  const mainPreviewRef = useRef(null);

  // Randomize every panel — shield, fill, both patterns, 1–2
  // emblems (fetched + parsed in parallel), and reset the active
  // emblem index so the editor lands on slot 0. Marked async because
  // the emblem fetches need to complete before the slots reflect them.
  const handleRandomize = React.useCallback(async () => {
    setRandomizing(true);
    try {
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
      const randFloat = (min, max) => Math.random() * (max - min) + min;

      // Shield + fill
      setCustomShield(null);
      setSelectedShieldId(pick(Object.keys(SHIELDS)));
      const nextBgType = Math.random() < 0.5 ? "solid" : "gradient";
      setBackgroundType(nextBgType);
      setPrimaryColor(pick(PRESET_COLORS));
      setSecondaryColor(pick(PRESET_COLORS));

      // Patterns
      const patternIds = Object.keys(PATTERNS).filter((id) => id !== "none");
      setPattern1({ type: pick(patternIds), color: pick(PRESET_COLORS) });
      if (Math.random() < 0.5) {
        setPattern2({ type: pick(patternIds), color: pick(PRESET_COLORS) });
      } else {
        setPattern2({ type: "none", color: pick(PRESET_COLORS) });
      }

      // 1–2 emblems
      const emblemCount = randInt(1, 2);
      const picks = [];
      const used = new Set();
      while (picks.length < emblemCount) {
        const candidate = pick(EMBLEM_LIST);
        if (used.has(candidate.id)) continue;
        used.add(candidate.id);
        picks.push(candidate);
      }
      const fetched = await Promise.all(picks.map((def) => fetchSVGPaths(def.url)));
      const nextEmblems = picks.map((def, i) => ({
        id: def.id,
        color: pick(PRESET_COLORS),
        scale: parseFloat(randFloat(0.6, 1.2).toFixed(2)),
        x: randInt(30, 70),
        y: randInt(30, 60),
        svgData: fetched[i],
        customLabel: null,
      }));
      setEmblems(nextEmblems.length > 0 ? nextEmblems : [defaultEmblemSlot()]);
      setActiveEmblemIdx(0);
    } finally {
      setRandomizing(false);
    }
  }, []);

  // Hydrate state from a saved crest_data blob the very first time
  // we see one. Tracks via a ref so we don't re-hydrate (and stomp
  // user edits) if the parent re-passes the same data later.
  const hydratedRef = useRef(false);
  React.useEffect(() => {
    if (!initialCrestData || hydratedRef.current) return;
    hydratedRef.current = true;
    const d = initialCrestData;

    // Shield (custom path takes precedence over the named id).
    if (d.custom_shield && d.custom_shield.d && d.custom_shield.vb) {
      setCustomShield(d.custom_shield);
      setSelectedShieldId("custom");
    } else if (d.shield_shape && SHIELDS[d.shield_shape]) {
      setSelectedShieldId(d.shield_shape);
    }

    // Fill
    if (d.background_type) setBackgroundType(d.background_type);
    if (d.background_color_1) setPrimaryColor(d.background_color_1);
    if (d.background_color_2) setSecondaryColor(d.background_color_2);

    // Patterns
    if (d.pattern_1) setPattern1({ type: d.pattern_1, color: d.pattern_1_color || "#f59e0b" });
    if (d.pattern_2) setPattern2({ type: d.pattern_2, color: d.pattern_2_color || "#ffffff" });

    // Layer order
    if (Array.isArray(d.layer_order) && d.layer_order.length > 0) {
      setLayerOrder(d.layer_order);
    }

    // Motto
    if (typeof d.motto_text === "string") setMotto(d.motto_text);
    if (d.motto_color) setMottoColor(d.motto_color);

    // Emblems — re-hydrate. Built-in ids re-fetch from the catalog
    // url; "custom" rows can't restore svgData (we don't persist
    // the parsed shapes), so they slot in as empty + we surface a
    // notice the leader can re-upload from.
    const savedEmblems = Array.isArray(d.emblems) ? d.emblems : [];
    if (savedEmblems.length === 0) {
      setEmblems([defaultEmblemSlot()]);
    } else {
      // Seed with placeholders so the slot tabs render immediately
      // while the SVG fetches resolve in the background.
      const initial = savedEmblems.map((e) => ({
        id: e.id || "none",
        color: e.color || "#f59e0b",
        scale: typeof e.scale === "number" ? e.scale : 1.0,
        x: typeof e.x === "number" ? e.x : 50,
        y: typeof e.y === "number" ? e.y : 45,
        svgData: null,
        customLabel: e.custom_label || null,
      }));
      setEmblems(initial);
      setActiveEmblemIdx(0);

      let restoredCustom = false;
      Promise.all(initial.map(async (slot) => {
        if (!slot.id || slot.id === "none") return null;
        if (slot.id === "custom") {
          restoredCustom = true;
          return null;
        }
        const def = EMBLEM_LIST.find((x) => x.id === slot.id);
        if (!def) return null;
        return fetchSVGPaths(def.url);
      })).then((dataList) => {
        setEmblems((prev) => prev.map((slot, i) => ({
          ...slot,
          svgData: dataList[i] || slot.svgData,
        })));
        if (restoredCustom) setHadCustomEmblem(true);
      });
    }
  }, [initialCrestData]);

  // Build the serializable crest_data blob. svgData is intentionally
  // dropped from emblems — it's re-fetched on load from the URL the
  // built-in id implies (custom emblems would need a different
  // pipeline; v1 surfaces a notice and asks for re-upload).
  const buildCrestData = React.useCallback(() => ({
    shield_shape: selectedShieldId,
    custom_shield: customShield || null,
    background_type: backgroundType,
    background_color_1: primaryColor,
    background_color_2: secondaryColor,
    pattern_1: pattern1.type,
    pattern_1_color: pattern1.color,
    pattern_2: pattern2.type,
    pattern_2_color: pattern2.color,
    layer_order: layerOrder,
    emblems: emblems.map((e) => ({
      id: e.id,
      color: e.color,
      scale: e.scale,
      x: e.x,
      y: e.y,
      custom_label: e.customLabel,
    })),
    motto_text: motto,
    motto_color: mottoColor,
  }), [
    selectedShieldId, customShield,
    backgroundType, primaryColor, secondaryColor,
    pattern1, pattern2,
    layerOrder, emblems,
    motto, mottoColor,
  ]);

  const handleSave = React.useCallback(async () => {
    if (!guildOwnerId) {
      toast.error("No guild context — can't save crest.");
      return;
    }
    if (!mainPreviewRef.current) {
      toast.error("Preview not ready yet.");
      return;
    }
    setSaving(true);
    try {
      const crestData = buildCrestData();

      // Rasterize the live preview SVG into a 512px PNG. Bigger so
      // any downstream display (Hall header, profile) can downscale
      // crisply. crestSvgToPng handles the offscreen-canvas dance.
      const blob = await crestSvgToPng(mainPreviewRef.current, 512);

      const path = `guilds/${guildOwnerId}/crest.png`;
      const { error: upErr } = await supabase.storage
        .from("user-assets")
        .upload(path, blob, {
          contentType: "image/png",
          upsert: true,
          cacheControl: "0",
        });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("user-assets")
        .getPublicUrl(path);
      // Bust whatever the browser / CDN had cached so the new image
      // shows up immediately in the Hall after save.
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("guilds")
        .upsert(
          {
            owner_user_id: guildOwnerId,
            crest_data: crestData,
            crest_image_url: publicUrl,
          },
          { onConflict: "owner_user_id" },
        );
      if (dbErr) throw dbErr;

      toast.success("Guild Crest saved!");
      if (onSaved) onSaved({ crest_data: crestData, crest_image_url: publicUrl });
    } catch (err) {
      console.error("Crest save failed", err);
      toast.error(err?.message || "Failed to save crest.");
    } finally {
      setSaving(false);
    }
  }, [guildOwnerId, buildCrestData, onSaved]);

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
    emblems,
    layerOrder,
    motto,
    mottoColor,
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

          {hadCustomEmblem && (
            <div
              style={{
                marginBottom: "10px",
                padding: "8px 10px",
                borderRadius: "6px",
                fontSize: "10px",
                fontFamily: FONT_STACK,
                color: "#fbbf24",
                backgroundColor: "rgba(245,158,11,0.10)",
                border: "1px solid rgba(245,158,11,0.35)",
              }}
            >
              Custom emblems need to be re-uploaded when editing.
            </div>
          )}

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
            {activeTab === "emblems" && (
              <EmblemsTab
                emblems={emblems}
                activeEmblemIdx={activeEmblemIdx}
                onActiveEmblemIdx={setActiveEmblemIdx}
                onSelectEmblem={selectEmblem}
                onUpdateEmblem={updateEmblem}
                onAddEmblem={addEmblem}
                onRemoveEmblem={removeEmblem}
              />
            )}
            {activeTab === "layers" && (
              <LayersTab
                layerOrder={layerOrder}
                onLayerOrder={setLayerOrder}
                pattern1={pattern1}
                pattern2={pattern2}
                emblems={emblems}
                primaryColor={primaryColor}
              />
            )}
            {activeTab === "motto" && (
              <MottoTab
                motto={motto}
                onMotto={setMotto}
                mottoColor={mottoColor}
                onMottoColor={setMottoColor}
              />
            )}
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
              onClick={async () => {
                await handleRandomize();
                if (onRandomize) onRandomize();
              }}
              disabled={randomizing}
              style={{
                fontFamily: FONT_STACK,
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                padding: "10px 16px",
                borderRadius: "8px",
                cursor: randomizing ? "wait" : "pointer",
                backgroundColor: "transparent",
                border: "1px solid #f8a47c",
                color: "#f8a47c",
                opacity: randomizing ? 0.7 : 1,
                transition: "background 0.15s, opacity 0.15s",
              }}
            >
              {randomizing ? "🎲 Rolling…" : "🎲 Randomize"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                fontFamily: FONT_STACK,
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                padding: "10px 18px",
                borderRadius: "8px",
                cursor: saving ? "wait" : "pointer",
                background: "linear-gradient(135deg, #f8a47c, #e8856a)",
                border: "none",
                color: "#1E2430",
                marginLeft: "auto",
                opacity: saving ? 0.7 : 1,
                boxShadow:
                  "0 4px 14px rgba(248,164,124,0.35), 0 1px 2px rgba(0,0,0,0.4)",
                transition: "transform 0.1s, box-shadow 0.15s, opacity 0.15s",
              }}
            >
              {saving ? "Saving…" : "Save Crest"}
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
            <CrestSvg width={240} svgRef={mainPreviewRef} {...crestProps} />
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
            emblems={emblems}
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

// Shape selectors used to harvest renderable elements out of a
// parsed SVG. Kept here so each parsing pass uses the same list.
const SHAPE_SELECTOR = "path, circle, rect, polygon, polyline, ellipse, line";
const SHAPE_TAGS = new Set([
  "path", "circle", "rect", "polygon", "polyline", "ellipse", "line",
]);

/**
 * Pull shape elements out of a parsed Document, with three fallbacks
 * so namespace quirks in the source SVG can't leave us empty-handed:
 *
 *   1. Plain CSS selector (works for most files).
 *   2. Namespace-agnostic `*|tag` selectors (handles SVGs whose
 *      shapes ended up under a non-default namespace prefix).
 *   3. Manual depth-first walk of the tree matching by localName
 *      (last resort — works no matter what XML weirdness is in
 *      play).
 */
function collectShapes(doc, root) {
  let nodes = Array.from((root || doc).querySelectorAll(SHAPE_SELECTOR));
  if (nodes.length > 0) return nodes;

  // Try a namespace-agnostic selector. Some SVGs created by certain
  // editors (or hand-written with weird prefixes) put shapes in a
  // different namespace, and the plain selector skips them.
  try {
    const nsSelector = [...SHAPE_TAGS].map((t) => `*|${t}`).join(",");
    nodes = Array.from((root || doc).querySelectorAll(nsSelector));
    if (nodes.length > 0) return nodes;
  } catch { /* selector unsupported in this engine — fall through */ }

  // Manual walk. Bulletproof.
  const out = [];
  const walk = (node) => {
    if (!node) return;
    const name = (node.localName || node.nodeName || "").toLowerCase();
    if (SHAPE_TAGS.has(name)) out.push(node);
    if (node.childNodes) {
      for (const child of node.childNodes) walk(child);
    }
  };
  walk(root || doc.documentElement);
  return out;
}

export async function fetchSVGPaths(url) {
  if (svgCache[url]) return svgCache[url];
  try {
    // mode: 'cors' is the default for cross-origin fetches but we
    // pin it explicitly so the intent is documented for future
    // readers (and so a future build tool can't strip it).
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) {
      console.error("SVG fetch failed:", url, res.status, res.statusText);
      return null;
    }
    const text = await res.text();

    // Stage 1: parse as image/svg+xml (the canonical MIME for SVG).
    let doc = new DOMParser().parseFromString(text, "image/svg+xml");
    let svg = doc.querySelector("svg");
    let shapes = collectShapes(doc, svg);

    // Stage 2: if nothing came back, the strict XML parser may have
    // tripped over namespace declarations. Re-parse with the much
    // more forgiving HTML parser, which puts SVG elements in the
    // SVG namespace automatically and exposes them via the regular
    // CSS selector engine.
    if (shapes.length === 0) {
      doc = new DOMParser().parseFromString(text, "text/html");
      svg = doc.querySelector("svg");
      shapes = collectShapes(doc, svg);
    }

    const vb = svg?.getAttribute("viewBox") || "0 0 300 300";

    if (shapes.length > 0) {
      const elements = shapes.map((el) => {
        const attrs = {};
        for (const a of el.attributes) {
          // Drop the source's own coloring so our dynamic fill wins.
          if (!["fill", "stroke", "style"].includes(a.name)) {
            attrs[a.name] = a.value;
          }
        }
        return { tag: (el.localName || el.tagName).toLowerCase(), attrs };
      });
      const result = { vb, elements, isRaster: false };
      svgCache[url] = result;
      return result;
    }

    // Raster fallback. The guild emblem catalog hosts PNGs wrapped
    // in <svg><image href="data:image/png;base64,…"/></svg>, so
    // when the shape harvester finds nothing we look for an <image>
    // and capture its data URL + bounds. The renderer recolors
    // these via an <feColorMatrix> filter rather than fill/stroke
    // (since there's no vector geometry to color).
    const imageEl = (svg || doc).querySelector("image") ||
      Array.from(doc.getElementsByTagName("image"))[0] ||
      null;
    if (imageEl) {
      const href = imageEl.getAttribute("xlink:href") ||
        imageEl.getAttribute("href") ||
        imageEl.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (href) {
        const x = parseFloat(imageEl.getAttribute("x") || "0");
        const y = parseFloat(imageEl.getAttribute("y") || "0");
        const w = parseFloat(imageEl.getAttribute("width") || "300");
        const h = parseFloat(imageEl.getAttribute("height") || "300");
        const result = {
          vb,
          elements: [],
          isRaster: true,
          rasterData: { href, x, y, width: w, height: h },
        };
        svgCache[url] = result;
        return result;
      }
    }

    console.error("SVG had no recognizable elements:", url);
    return null;
  } catch (error) {
    console.error("SVG fetch failed:", url, error);
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
  // Stable filter id per instance so React reconciliation doesn't
  // churn the <filter> definition on every render.
  const reactId = React.useId();
  if (!data) return null;
  const [, , cw, ch] = vb.split(" ").map(Number);
  const [, , evw, evh] = data.vb.split(" ").map(Number);
  // x and y are 0–100 percentages of the crest dimensions.
  const px = (x / 100) * cw;
  const py = (y / 100) * ch;

  // ── Raster branch ────────────────────────────────────────────
  // The guild catalog ships PNGs wrapped in SVG. We render the
  // <image> as-is and recolor via an <feColorMatrix>: pin every
  // RGB channel to the chosen color while passing the original
  // alpha straight through, so transparent areas stay transparent
  // and the silhouette picks up the user's color.
  if (data.isRaster && data.rasterData) {
    const rd = data.rasterData;
    // Slightly larger base scale than vector (0.8 vs 0.7) — raster
    // glyphs in this catalog use more padding inside their viewBox.
    const s = scale * (cw / evw) * 0.8;
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    const filterId = `recolor-${reactId.replace(/[:]/g, "")}`;

    return (
      <g clipPath={`url(#${clipId})`}>
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values={`0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 1 0`}
            />
          </filter>
        </defs>
        <g transform={`translate(${px}, ${py}) scale(${s}) translate(${-evw / 2}, ${-evh / 2})`}>
          <image
            href={rd.href}
            xlinkHref={rd.href}
            x={rd.x}
            y={rd.y}
            width={rd.width}
            height={rd.height}
            filter={`url(#${filterId})`}
            opacity="0.92"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      </g>
    );
  }

  // ── Vector branch ────────────────────────────────────────────
  if (!data.elements || data.elements.length === 0) return null;

  // Scale factor: fit emblem viewbox into crest viewbox, then apply
  // the user's slider value on top.
  const s = scale * (cw / evw) * 0.7;

  return (
    <g
      transform={`translate(${px}, ${py}) scale(${s}) translate(${-evw / 2}, ${-evh / 2})`}
      clipPath={`url(#${clipId})`}
    >
      {data.elements.map((el, i) =>
        // React.createElement directly — bypasses any JSX
        // capitalization quirks for lowercase string tag values.
        React.createElement(el.tag, {
          key: i,
          ...el.attrs,
          fill: color,
          stroke: color,
          strokeWidth: "0.5",
          opacity: "0.92",
        }),
      )}
    </g>
  );
}

/**
 * Motto tab — picks a 30-char-or-less line that rides a black ribbon
 * across the foot of the shield in the preview. Color picker only
 * mounts once the user has actually typed something; an empty motto
 * doesn't render anything on the crest.
 */
function MottoTab({ motto, onMotto, mottoColor, onMottoColor }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
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
          Motto
        </div>
        <input
          type="text"
          value={motto}
          maxLength={30}
          placeholder="Enter motto (max 30 chars)"
          onChange={(e) => onMotto(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px solid #2a3441",
            backgroundColor: "#1E2430",
            color: "#e2e8f0",
            fontSize: "13px",
            fontFamily: FONT_STACK,
          }}
        />
        <div
          style={{
            fontSize: "8px",
            color: "#4a5568",
            marginTop: "4px",
            textAlign: "right",
            fontFamily: FONT_STACK,
          }}
        >
          {motto.length}/30
        </div>
      </div>

      {motto.length > 0 && (
        <ColorPicker
          label="Motto Color"
          value={mottoColor}
          onChange={onMottoColor}
        />
      )}
    </div>
  );
}

/**
 * Layers tab.
 *
 * Visualizes the render stack top-to-bottom. The Motto bar pins the
 * top, the Background bar pins the bottom, and the three reorderable
 * layers (pattern1 / pattern2 / emblems) sit in the middle. Each
 * reorderable row carries up/down arrows that swap adjacent items
 * in `layerOrder`; arrows at the boundaries dim and ignore clicks.
 *
 * Active vs inactive: a pattern row is active when its type isn't
 * "none"; the emblems row is active when at least one slot has
 * svgData. Inactive rows fade to 0.4 opacity so it's obvious which
 * slots aren't doing anything.
 */
function LayersTab({ layerOrder, onLayerOrder, pattern1, pattern2, emblems, primaryColor }) {
  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= layerOrder.length) return;
    const next = [...layerOrder];
    [next[idx], next[target]] = [next[target], next[idx]];
    onLayerOrder(next);
  };

  const populatedEmblems = emblems.filter((s) => s?.svgData).length;
  const meta = {
    pattern1: {
      label: `Pattern 1: ${PATTERNS[pattern1.type]}`,
      color: pattern1.color,
      active: pattern1.type !== "none",
    },
    pattern2: {
      label: `Pattern 2: ${PATTERNS[pattern2.type]}`,
      color: pattern2.color,
      active: pattern2.type !== "none",
    },
    emblems: {
      label: populatedEmblems ? `Emblems (${populatedEmblems})` : "Emblems",
      color: emblems.find((s) => s?.svgData)?.color || "#64748b",
      active: populatedEmblems > 0,
    },
  };

  // Render top-of-stack first (last in layerOrder = top visually).
  const reversed = [...layerOrder].slice().reverse();

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
      <FixedLayerBar label="Motto (fixed top)" borderColor="#f8a47c" />

      {reversed.map((id, ridx) => {
        const layerIdx = layerOrder.length - 1 - ridx;
        const m = meta[id];
        const canUp = layerIdx < layerOrder.length - 1;
        const canDown = layerIdx > 0;
        return (
          <div
            key={id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 8px",
              borderRadius: "6px",
              backgroundColor: m.active ? "rgba(255,255,255,0.03)" : "transparent",
              opacity: m.active ? 1 : 0.4,
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                backgroundColor: m.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "10px",
                color: "#e2e8f0",
                fontFamily: FONT_STACK,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {m.label}
            </span>
            <ArrowButton enabled={canUp}   onClick={() => move(layerIdx, +1)} dir="up" />
            <ArrowButton enabled={canDown} onClick={() => move(layerIdx, -1)} dir="down" />
          </div>
        );
      })}

      <div style={{ flex: 1 }} />
      <FixedLayerBar label="Background (fixed bottom)" borderColor={primaryColor} />
    </div>
  );
}

function FixedLayerBar({ label, borderColor }) {
  return (
    <div
      style={{
        borderLeft: `2px solid ${borderColor}`,
        backgroundColor: "rgba(248,164,124,0.05)",
        padding: "6px 10px",
        borderRadius: "0 4px 4px 0",
        fontSize: "9px",
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        fontFamily: FONT_STACK,
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
}

function ArrowButton({ enabled, onClick, dir }) {
  return (
    <button
      type="button"
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      title={dir === "up" ? "Move up" : "Move down"}
      style={{
        width: "20px",
        height: "16px",
        padding: 0,
        borderRadius: "4px",
        backgroundColor: "rgba(248,164,124,0.08)",
        border: "1px solid #2a3441",
        color: enabled ? "#f8a47c" : "#2a3441",
        cursor: enabled ? "pointer" : "default",
        fontFamily: FONT_STACK,
        fontSize: "10px",
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {dir === "up" ? "▲" : "▼"}
    </button>
  );
}

/**
 * Emblems tab.
 *
 * Layout fits the fixed-380px panel exactly: a flex column where
 * the slot-tabs row, category filter, custom-upload row, and
 * controls block all flexShrink:0, and the emblem grid in the
 * middle is the only thing that scrolls. Picker thumbnails come
 * straight from the Supabase URLs as <img> for cheap browse —
 * fetch+parse only happens when a thumbnail is actually clicked.
 */
function EmblemsTab({
  emblems,
  activeEmblemIdx,
  onActiveEmblemIdx,
  onSelectEmblem,
  onUpdateEmblem,
  onAddEmblem,
  onRemoveEmblem,
}) {
  const [category, setCategory] = useState("all");
  const fileInputRef = React.useRef(null);
  const slot = emblems[activeEmblemIdx] || emblems[0];

  const filtered = category === "all"
    ? EMBLEM_LIST
    : EMBLEM_LIST.filter((e) => e.category === category);

  const handleClear = () => {
    onUpdateEmblem(activeEmblemIdx, { id: "none", svgData: null, customLabel: null });
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const svg = doc.querySelector("svg");
      const vb = svg?.getAttribute("viewBox") || "0 0 100 100";
      const elements = Array.from(
        doc.querySelectorAll("path,circle,rect,polygon,polyline,ellipse,line"),
      ).map((el) => {
        const attrs = {};
        for (const a of el.attributes) {
          if (!["fill", "stroke", "style"].includes(a.name)) attrs[a.name] = a.value;
        }
        return { tag: el.tagName.toLowerCase(), attrs };
      });
      if (elements.length === 0) {
        alert("SVG must contain at least one shape element.");
        e.target.value = "";
        return;
      }
      onUpdateEmblem(activeEmblemIdx, {
        id: "custom",
        svgData: { vb, elements },
        customLabel: file.name,
      });
    } catch {
      alert("Couldn't read that file. Make sure it's a valid SVG.");
    }
    e.target.value = "";
  };

  return (
    <>
      <style>{`
        .crest-emblem-grid::-webkit-scrollbar { width: 6px; }
        .crest-emblem-grid::-webkit-scrollbar-track { background: #1E2430; }
        .crest-emblem-grid::-webkit-scrollbar-thumb { background: #3a4451; border-radius: 3px; }
        .crest-emblem-grid::-webkit-scrollbar-thumb:hover { background: #4a5568; }
      `}</style>

      <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Slot tabs */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", flexShrink: 0 }}>
          {emblems.map((s, i) => {
            const active = i === activeEmblemIdx;
            const label = s.customLabel
              ? s.customLabel.replace(/\.svg$/i, "")
              : s.id === "none"
                ? `Slot ${i + 1}: Empty`
                : EMBLEM_LIST.find((e) => e.id === s.id)?.label || `Slot ${i + 1}`;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onActiveEmblemIdx(i)}
                style={{
                  fontFamily: FONT_STACK,
                  fontSize: "9px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 700,
                  padding: "5px 9px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  backgroundColor: active ? "rgba(248,164,124,0.12)" : "transparent",
                  border: active
                    ? "1px solid rgba(248,164,124,0.5)"
                    : "1px solid rgba(255,255,255,0.06)",
                  color: active ? "#f8a47c" : "#64748b",
                  maxWidth: "120px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {label}
              </button>
            );
          })}
          {emblems.length < 4 && (
            <button
              type="button"
              onClick={onAddEmblem}
              title="Add emblem slot"
              style={{
                width: "26px",
                height: "26px",
                fontFamily: FONT_STACK,
                fontSize: "16px",
                lineHeight: 1,
                fontWeight: 300,
                padding: 0,
                borderRadius: "6px",
                cursor: "pointer",
                backgroundColor: "transparent",
                border: "1px dashed rgba(248,164,124,0.4)",
                color: "#f8a47c",
              }}
            >
              +
            </button>
          )}
        </div>

        {/* Category filter + None */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0,
          }}
        >
          <CategoryButton active={false} onClick={handleClear} label="None" />
          <div style={{ width: "1px", height: "16px", backgroundColor: "#2a3441" }} />
          <CategoryButton active={category === "all"}     onClick={() => setCategory("all")}     label="All" />
          <CategoryButton active={category === "arcane"}  onClick={() => setCategory("arcane")}  label="Arcane" />
          <CategoryButton active={category === "general"} onClick={() => setCategory("general")} label="General" />
        </div>

        {/* Emblem grid — only this scrolls */}
        <div
          className="crest-emblem-grid"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            border: "1px solid #2a3441",
            borderRadius: "8px",
            padding: "6px",
            backgroundColor: "#1E2430",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "4px",
            }}
          >
            {filtered.map((e) => {
              const selected = slot.id === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onSelectEmblem(e)}
                  title={e.label}
                  style={{
                    aspectRatio: "1",
                    padding: 0,
                    cursor: "pointer",
                    borderRadius: "6px",
                    backgroundColor: selected
                      ? "rgba(248,164,124,0.1)"
                      : "transparent",
                    border: selected
                      ? "2px solid #f8a47c"
                      : "1px solid #2a3441",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={e.url}
                    alt={e.label}
                    draggable={false}
                    style={{
                      width: "75%",
                      height: "75%",
                      objectFit: "contain",
                      opacity: selected ? 1 : 0.5,
                      filter: "brightness(0) invert(0.7)",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom upload row */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              fontFamily: FONT_STACK,
              fontSize: "9px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              padding: "6px 10px",
              borderRadius: "6px",
              cursor: "pointer",
              backgroundColor: "transparent",
              border: "1px dashed #f8a47c",
              color: "#f8a47c",
            }}
          >
            Upload Custom SVG
          </button>
          {slot.id === "custom" && slot.customLabel && (
            <span
              style={{
                fontSize: "10px",
                color: "#37F2D1",
                fontFamily: FONT_STACK,
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "180px",
              }}
              title={slot.customLabel}
            >
              ✓ {slot.customLabel}
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            onChange={handleUpload}
            style={{ display: "none" }}
          />
        </div>

        {/* Per-slot color + transform controls */}
        {slot.svgData && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
            <ColorPicker
              label="Emblem Color"
              value={slot.color}
              onChange={(c) => onUpdateEmblem(activeEmblemIdx, { color: c })}
            />
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <EmblemSlider
                label="Size"
                min={0.3}
                max={1.8}
                step={0.05}
                value={slot.scale}
                onChange={(v) => onUpdateEmblem(activeEmblemIdx, { scale: v })}
              />
              <EmblemSlider
                label="X"
                min={10}
                max={90}
                step={1}
                value={slot.x}
                onChange={(v) => onUpdateEmblem(activeEmblemIdx, { x: v })}
              />
              <EmblemSlider
                label="Y"
                min={10}
                max={90}
                step={1}
                value={slot.y}
                onChange={(v) => onUpdateEmblem(activeEmblemIdx, { y: v })}
              />
            </div>
            <button
              type="button"
              onClick={() => onRemoveEmblem(activeEmblemIdx)}
              style={{
                alignSelf: "flex-start",
                fontFamily: FONT_STACK,
                fontSize: "9px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                padding: "5px 9px",
                borderRadius: "6px",
                cursor: "pointer",
                backgroundColor: "transparent",
                border: "1px solid #ef4444",
                color: "#ef4444",
              }}
            >
              ✕ Remove emblem
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function CategoryButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: FONT_STACK,
        fontSize: "9px",
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        fontWeight: 700,
        padding: "5px 10px",
        borderRadius: "6px",
        cursor: "pointer",
        backgroundColor: active ? "rgba(248,164,124,0.12)" : "transparent",
        border: active
          ? "1px solid rgba(248,164,124,0.5)"
          : "1px solid rgba(255,255,255,0.06)",
        color: active ? "#f8a47c" : "#64748b",
      }}
    >
      {label}
    </button>
  );
}

function EmblemSlider({ label, min, max, step, value, onChange }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: "9px",
          color: "#f8a47c",
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          fontWeight: 700,
          fontFamily: FONT_STACK,
          marginBottom: "4px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{label}</span>
        <span style={{ color: "#64748b" }}>
          {typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(2)) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: "100%",
          accentColor: "#f8a47c",
          cursor: "pointer",
        }}
      />
    </div>
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
  emblems = [],
  layerOrder,
  motto = "",
  mottoColor = "#fbbf24",
  svgRef,
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

  const renderLayer = (id) => {
    if (id === "pattern1" || id === "pattern2") {
      const p = id === "pattern1" ? pattern1 : pattern2;
      return (
        <React.Fragment key={id}>
          {renderPattern(p.type, p.color, shield.vb, clipId, shield.d)}
        </React.Fragment>
      );
    }
    if (id === "emblems") {
      // Render every populated slot in array order so slot 0 is at
      // the bottom of the emblem stack and slot 3 at the top —
      // matches how the slot tabs read left-to-right in the editor.
      return (
        <g key={id}>
          {emblems.map((slot, i) => {
            if (!slot?.svgData || !slot.svgData.elements || slot.svgData.elements.length === 0) return null;
            return (
              <EmblemOnCrest
                key={i}
                data={slot.svgData}
                color={slot.color}
                scale={slot.scale}
                x={slot.x}
                y={slot.y}
                clipId={clipId}
                vb={shield.vb}
              />
            );
          })}
        </g>
      );
    }
    return null;
  };

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
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

      {/* 2. Composable layers (patterns + emblems) — render in
            layerOrder so the Layers tab can reorder by mutating
            that single array. */}
      {layerOrder.map(renderLayer)}

      {/* 3. Motto ribbon — anchored at the foot of the shield's
            viewBox. Skip on tiny renders (<= 80px) where the text
            would be unreadable anyway. */}
      {motto && width > 80 && (() => {
        const [vx, vy, vw, vh] = shield.vb.split(/\s+/).map(Number);
        const ribbonW = vw * 0.75;
        const ribbonH = vh * 0.08;
        const ribbonX = vx + (vw - ribbonW) / 2;
        const ribbonY = vy + vh * 0.85 - ribbonH / 2;
        const cx = vx + vw / 2;
        const cy = ribbonY + ribbonH / 2;
        const fontSize = Math.max(7, vw * 0.045);
        return (
          <g>
            <rect
              x={ribbonX}
              y={ribbonY}
              width={ribbonW}
              height={ribbonH}
              rx={4}
              fill="rgba(0,0,0,0.65)"
              stroke="rgba(248,164,124,0.2)"
              strokeWidth={0.5}
            />
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fontFamily="'Cream', 'Cinzel', serif"
              fontWeight={700}
              letterSpacing="0.1em"
              fill={mottoColor}
            >
              {motto.toUpperCase()}
            </text>
          </g>
        );
      })()}

      {/* 4. Shield border, painted last so patterns can't bleed
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
function LayerStack({ layerOrder, pattern1, pattern2, emblems = [] }) {
  const populatedEmblems = emblems.filter((s) => s?.svgData).length;
  const slotMeta = {
    pattern1: { label: `Pattern 1: ${PATTERNS[pattern1.type]}`, color: pattern1.color, active: pattern1.type !== "none" },
    pattern2: { label: `Pattern 2: ${PATTERNS[pattern2.type]}`, color: pattern2.color, active: pattern2.type !== "none" },
    emblems: {
      label: populatedEmblems
        ? `Emblems (${populatedEmblems})`
        : "Emblems",
      // Use the first populated slot's color as the indicator bar
      // so the row picks up a meaningful tint when in use.
      color: emblems.find((s) => s?.svgData)?.color || "#64748b",
      active: populatedEmblems > 0,
    },
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

/**
 * Rasterize a live <svg> node to a PNG blob.
 *
 * Outline:
 *  1. Serialize the DOM node (already mounted, fully styled, and
 *     using the user's current state).
 *  2. Wrap it in a data URL so an offscreen <img> can decode it.
 *  3. Draw the decoded image onto an N×N canvas so the caller can
 *     pick a stable export size independent of the on-screen
 *     preview width.
 *  4. canvas.toBlob() into a PNG, return as a Blob suitable for
 *     supabase.storage.upload.
 *
 * Returns null if the browser can't decode the SVG (extremely rare
 * with modern Chromium / Firefox / Safari, but the call site still
 * checks).
 */
export function crestSvgToPng(svgEl, size = 512) {
  return new Promise((resolve, reject) => {
    try {
      // Make sure the serialized output carries the SVG xmlns even
      // if the live node didn't render it explicitly.
      const clone = svgEl.cloneNode(true);
      if (!clone.getAttribute("xmlns")) {
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      const serialized = new XMLSerializer().serializeToString(clone);
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob returned null"));
        }, "image/png");
      };
      img.onerror = (e) => reject(e);
      img.src = dataUrl;
    } catch (err) {
      reject(err);
    }
  });
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
