/**
 * World Lore import — readable color defaults.
 *
 * Google Docs HTML export forces default text to pure black via inline
 * `style="color:#000000"`, which is invisible on the dark `.lore-prose`
 * theme. This strips *default/black* text colors so those elements fall
 * through to the theme's CSS defaults (light body, colored headings),
 * while preserving every intentional, non-black color the author chose.
 *
 * IMPORT-ONLY: run on the wizard write path, never in normal editing or
 * the general sanitizer. Pure + dependency-free so it's unit-testable.
 *
 * Only the `color` property is touched — `background-color`, borders, and
 * all non-color styles are left exactly as-is.
 */

// 0–255 per-channel ceiling for "near-black". Checking every channel is
// below it (rather than luminance) keeps dark-but-saturated intentional
// colors — navy #000080, maroon #800000 — from being mistaken for black.
const NEAR_BLACK_MAX_CHANNEL = 40;

function parseColorToRgb(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "black") return [0, 0, 0];

  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) {
    const h = m[1];
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  }
  m = v.match(/^#([0-9a-f]{6})$/);
  if (m) {
    const h = m[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  m = v.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];

  return null; // hsl / named / unknown → treat as intentional, never strip
}

/** True for pure black and near-black greys/darks (a "default" color). */
export function isDefaultBlack(value) {
  const rgb = parseColorToRgb(value);
  if (!rgb) return false;
  return Math.max(rgb[0], rgb[1], rgb[2]) <= NEAR_BLACK_MAX_CHANNEL;
}

/**
 * Strip default/black `color` declarations from inline styles in `html`.
 * Non-black colors and all other declarations are preserved; a style
 * attribute left empty is dropped.
 */
export function normalizeImportedColors(html) {
  if (!html || typeof html !== "string") return html || "";

  // HTML attribute values can't contain a raw unescaped double quote, so
  // matching style="…" is safe even with font-family:&quot;Arial&quot;.
  return html.replace(/\sstyle="([^"]*)"/gi, (full, styleBody) => {
    const kept = [];
    for (const decl of styleBody.split(";")) {
      const trimmed = decl.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf(":");
      if (idx === -1) { kept.push(trimmed); continue; }
      const prop = trimmed.slice(0, idx).trim().toLowerCase();
      const val = trimmed.slice(idx + 1).trim();
      // Only the exact `color` property — never background-color/border-color.
      if (prop === "color" && isDefaultBlack(val)) continue;
      kept.push(`${prop}: ${val}`);
    }
    return kept.length ? ` style="${kept.join("; ")}"` : "";
  });
}
