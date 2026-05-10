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

  // Preload the TTFs so the browser starts fetching as soon as this
  // runs, instead of waiting until CSS resolution discovers the
  // @font-face src. Crossorigin is required for preloaded fonts —
  // Supabase Storage public buckets serve with permissive CORS so
  // this matches the same-origin fetch the @font-face rule will do.
  for (const lang of LANGUAGE_FONTS) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "font";
    link.type = "font/ttf";
    link.href = `${base}/${lang}-Regular.ttf`;
    link.crossOrigin = "anonymous";
    link.setAttribute("data-language-font-preload", lang);
    document.head.appendChild(link);
  }

  // font-display: block — hide text briefly (≤3s) until the font is
  // ready, instead of swap's "render fallback now, swap later" which
  // is the FOUT we're trying to eliminate. Combined with the preload
  // above, the invisible window is short enough to not feel like a
  // load delay, and it never flashes English first.
  const style = document.createElement("style");
  style.setAttribute("data-language-fonts", "true");
  style.textContent = LANGUAGE_FONTS.map((lang) => `
    @font-face {
      font-family: 'DnD-${lang}';
      src: url('${base}/${lang}-Regular.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }
  `).join("\n");
  document.head.appendChild(style);
}
