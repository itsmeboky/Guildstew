/**
 * Dynamic loader for the D&D language TTFs stored in Supabase Storage
 * at `campaign-assets/dnd5e/languages/<Language>-Regular.ttf`. Calling
 * `loadLanguageFonts()` injects a single <style data-language-fonts>
 * block with an @font-face per language; subsequent calls skip the
 * injection because the <style> already exists.
 *
 * Consumers reference the fonts by the prefix `DnD-<Language>`:
 *
 *   <p style={{ fontFamily: "'DnD-Elvish', serif" }}>…</p>
 *
 * Supabase Storage sets its own URLs; we build the public URL from
 * VITE_SUPABASE_URL (or the hard-coded project URL as a fallback).
 */

export const LANGUAGE_FONTS = [
  "Abyssal", "Celestial", "Common", "DeepSpeech", "Draconic",
  "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin",
  "Halfling", "Infernal", "Orc", "Primordial", "Sylvan",
  "Undercommon", "Druidic",
];

const SUPABASE_FALLBACK = "https://ktdxhsstrgwciqkvprph.supabase.co";

function fontBaseUrl() {
  const env = typeof import.meta !== "undefined" ? import.meta.env : {};
  const host = env?.VITE_SUPABASE_URL || SUPABASE_FALLBACK;
  return `${host}/storage/v1/object/public/campaign-assets/dnd5e/languages`;
}

/**
 * Map human-readable language labels ("Deep Speech", "Elvish") to the
 * font-family key suffix ("DeepSpeech", "Elvish"). The TTF filenames
 * strip spaces and use title case, so this mirrors that convention.
 */
export function languageFontKey(language) {
  if (!language) return null;
  return String(language).replace(/\s+/g, "").trim();
}

/**
 * CSS font-family string to drop on an element that should render in
 * the given fantasy language. Falls back to serif so unloaded assets
 * don't blow out the layout.
 */
export function fontFamilyFor(language) {
  const key = languageFontKey(language);
  return key ? `'DnD-${key}', serif` : "serif";
}

export function loadLanguageFonts() {
  if (typeof document === "undefined") return;
  if (document.querySelector("style[data-language-fonts]")) return;
  const base = fontBaseUrl();
  const style = document.createElement("style");
  style.setAttribute("data-language-fonts", "true");
  style.textContent = LANGUAGE_FONTS.map((lang) => `
    @font-face {
      font-family: 'DnD-${lang}';
      src: url('${base}/${lang}-Regular.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
  `).join("\n");
  document.head.appendChild(style);
}
