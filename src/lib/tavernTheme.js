import { supabase } from "@/api/supabaseClient";

/**
 * Tavern UI theme loader.
 *
 * A theme lives in `tavern_items.file_data` with shape:
 *
 *   {
 *     type: "ui_theme",
 *     colors: {
 *       primary, background, card, cardBorder, text, textMuted,
 *       navBackground, accent2
 *     },
 *     fonts: { heading, body }    // optional
 *   }
 *
 * We write the theme's colors into CSS custom properties on :root so
 * any component that uses `var(--tavern-…)` follows along. Components
 * that still hard-code colors aren't affected — broader coverage is
 * tracked in follow-up polish. Loading a Google Font is handled by
 * dynamically injecting a <link> tag.
 *
 * The loader runs once on app load from `ThemeApplier`, and again
 * any time the user's `active_cosmetics.theme_id` changes.
 */

const TAVERN_CSS_KEYS = [
  "primary",
  "background",
  "card",
  "cardBorder",
  "text",
  "textMuted",
  "navBackground",
  "accent2",
];

let currentFontLinkIds = [];

export async function loadThemeItem(themeId) {
  if (!themeId) return null;
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

  // Clear previous tavern vars so switching themes doesn't leave
  // orphan values from the last one.
  TAVERN_CSS_KEYS.forEach((key) => root.style.removeProperty(`--tavern-${key}`));

  for (const [key, value] of Object.entries(colors)) {
    if (!value) continue;
    root.style.setProperty(`--tavern-${key}`, String(value));
  }

  // Fonts — load as Google Fonts links, keyed so re-loading doesn't
  // stack duplicate <link> elements.
  currentFontLinkIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  currentFontLinkIds = [];

  const fonts = themeData?.fonts || {};
  for (const [role, family] of Object.entries(fonts)) {
    if (!family) continue;
    const id = `tavern-font-${role}`;
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.id = id;
    document.head.appendChild(link);
    currentFontLinkIds.push(id);
    root.style.setProperty(`--tavern-font-${role}`, `"${family}", sans-serif`);
  }
}

export function clearTheme() {
  const root = document.documentElement;
  TAVERN_CSS_KEYS.forEach((key) => root.style.removeProperty(`--tavern-${key}`));
  root.style.removeProperty("--tavern-font-heading");
  root.style.removeProperty("--tavern-font-body");
  currentFontLinkIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  currentFontLinkIds = [];
}
