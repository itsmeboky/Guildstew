/**
 * Tavern UI theme loader.
 *
 * Reads a theme's `file_data` (shape produced by ThemeBuilder —
 * `{ type: "ui_theme", colors: {…}, fonts: { heading, body } }`) and
 * writes it onto `:root` as CSS custom properties.
 *
 *   colors → `--theme-<key>`        (e.g. `--theme-background`)
 *   fonts  → `--theme-font-heading` / `--theme-font-body`
 *
 * Components opt in by referencing those vars in their styles — see
 * `src/styles/theme-layer.css` for the small global layer that wires
 * them to page background / card / accent / nav. Broader coverage is
 * incremental: any component still using a hardcoded color keeps its
 * old look until it's migrated to a `var(--theme-*)`.
 *
 * Font loading uses one `<link>` per font name, id-keyed so mount
 * cycles don't stack duplicate tags.
 */

const COLOR_KEYS = [
  "background",
  "card",
  "cardBorder",
  "primary",
  "secondary",
  "text",
  "textMuted",
  "navBackground",
  "danger",
  "success",
];

// Legacy keys — kept so existing themes that were saved under the
// Part 3 `--tavern-*` prefix (pre-builder shipping) still apply.
const LEGACY_KEYS = [
  "primary",
  "background",
  "card",
  "cardBorder",
  "text",
  "textMuted",
  "navBackground",
  "accent2",
];

let loadedFontIds = [];

export async function loadThemeItem(themeId) {
  if (!themeId) return null;
  const { supabase } = await import("@/api/supabaseClient");
  const { data } = await supabase
    .from("tavern_items")
    .select("id, name, category, file_data")
    .eq("id", themeId)
    .maybeSingle();
  if (!data || data.category !== "ui_theme") return null;
  return data;
}

export function applyTheme(themeData) {
  const root = document.documentElement;
  const colors = themeData?.colors || {};
  const fonts = themeData?.fonts || {};

  // Wipe whatever the last theme left behind so a color that the new
  // theme doesn't set falls back to stylesheet defaults, not a stale
  // value from the previous theme.
  clearTheme();

  for (const key of COLOR_KEYS) {
    const value = colors[key];
    if (!value) continue;
    root.style.setProperty(`--theme-${key}`, String(value));
  }

  // Legacy mirror for anyone still reading the `--tavern-*` vars.
  for (const key of LEGACY_KEYS) {
    const value = colors[key];
    if (!value) continue;
    root.style.setProperty(`--tavern-${key}`, String(value));
  }

  if (fonts.heading) {
    injectFont("theme-font-heading", fonts.heading, "wght@400;700");
    root.style.setProperty("--theme-font-heading", `'${fonts.heading}', serif`);
  }
  if (fonts.body) {
    injectFont("theme-font-body", fonts.body, "wght@300;400;500;600;700");
    root.style.setProperty("--theme-font-body", `'${fonts.body}', sans-serif`);
  }
}

export function clearTheme() {
  const root = document.documentElement;
  for (const key of COLOR_KEYS) root.style.removeProperty(`--theme-${key}`);
  for (const key of LEGACY_KEYS) root.style.removeProperty(`--tavern-${key}`);
  root.style.removeProperty("--theme-font-heading");
  root.style.removeProperty("--theme-font-body");
  for (const id of loadedFontIds) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
  loadedFontIds = [];
}

function injectFont(id, family, weights) {
  if (!family) return;
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.id = id;
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(String(family).replace(/ /g, "+"))}:${weights}&display=swap`;
  document.head.appendChild(link);
  loadedFontIds.push(id);
}
