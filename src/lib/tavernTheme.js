/**
 * Tavern UI theme loader.
 *
 * Reads a theme's `file_data` (shape produced by ThemeBuilder —
 * `{ type: "ui_theme", colors: {…}, fonts: { heading, body },
 *    images: {…} }`) and writes it onto `:root` as CSS custom
 * properties.
 *
 *   colors → `--theme-<key>`           (e.g. `--theme-pageBackground`)
 *   images → `--theme-img-<key>`       (wrapped in `url(...)`)
 *   fonts  → `--theme-font-heading` / `--theme-font-body`
 *
 * Components opt in by referencing those vars in their styles — see
 * `src/App.css` for the global layer that wires them to
 * body background / card / nav / accent / fonts. Broader coverage is
 * incremental: any component still using a hardcoded color keeps its
 * old look until it's migrated to a `var(--theme-*)`.
 *
 * Font loading uses one `<link>` per font name, id-keyed so mount
 * cycles don't stack duplicate tags.
 */

const COLOR_KEYS = [
  "pageBackground",
  "cardBackground",
  "cardBorder",
  "primaryAccent",
  "secondaryAccent",
  "textPrimary",
  "textMuted",
  "navBackground",
  "homepageCards",
  "danger",
  "success",
  "bannerFadeColor",
];

// Colors whose CSS variable name doesn't follow the default
// `--theme-<key>` pattern. The homepage banner reads
// `--theme-color-bannerFade` for symmetry with `--theme-img-*`.
const COLOR_VAR_OVERRIDES = {
  bannerFadeColor: "--theme-color-bannerFade",
};

const IMAGE_KEYS = [
  "navTexture",
  "homepageBackground",
  "contentCardBackground",
  "campaignCardTexture",
  "sidebarTexture",
  "footerBackground",
];

// Legacy short keys from the pre-Part-B builder — keep the mirror so
// themes saved before the rename still apply their colors when a
// player equips them.
const LEGACY_KEY_MAP = {
  background:    "pageBackground",
  card:          "cardBackground",
  primary:       "primaryAccent",
  secondary:     "secondaryAccent",
  text:          "textPrimary",
};

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
  const colors = { ...(themeData?.colors || {}) };
  const images = themeData?.images || {};
  const fonts = themeData?.fonts || {};

  // Back-fill legacy color keys into the new names so old themes
  // (that stored `background`, `primary`, etc.) still apply.
  for (const [legacy, current] of Object.entries(LEGACY_KEY_MAP)) {
    if (colors[legacy] && !colors[current]) {
      colors[current] = colors[legacy];
    }
  }

  // Wipe whatever the last theme left behind so a color that the new
  // theme doesn't set falls back to stylesheet defaults, not a stale
  // value from the previous theme.
  clearTheme();

  for (const key of COLOR_KEYS) {
    const value = colors[key];
    if (!value) continue;
    const varName = COLOR_VAR_OVERRIDES[key] || `--theme-${key}`;
    root.style.setProperty(varName, String(value));
  }

  for (const key of IMAGE_KEYS) {
    const url = images?.[key];
    if (!url) continue;
    root.style.setProperty(`--theme-img-${key}`, `url(${url})`);
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
  for (const key of COLOR_KEYS) {
    root.style.removeProperty(COLOR_VAR_OVERRIDES[key] || `--theme-${key}`);
  }
  for (const key of IMAGE_KEYS) root.style.removeProperty(`--theme-img-${key}`);
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
