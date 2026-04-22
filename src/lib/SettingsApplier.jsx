import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { getUserSettings } from "@/lib/userSettings";
import { FONT_SIZE_PX } from "@/config/settingsDefaults";

/**
 * App-wide settings applier.
 *
 * Translates the signed-in user's settings blob into:
 *   - a `--app-font-scale` CSS variable on :root (font-size slider
 *     + compact-mode multiplier),
 *   - class toggles on `document.body`:
 *       `theme-light`       light mode (swaps color vars)
 *       `compact-mode`      denser spacing
 *       `sidebar-right`     sidebar flipped
 *       `dyslexia-mode`     OpenDyslexic font + wider spacing
 *       `high-contrast`     pure W/B, heavy borders
 *       `reduced-motion`    no animations / transitions
 *       `colorblind-<type>` SVG filter for each vision type
 *
 * The actual CSS lives in `App.css` — components just react to
 * those classes / variables. Rendered invisibly from App.jsx.
 */

const BODY_CLASSES = [
  "theme-light",
  "compact-mode",
  "sidebar-right",
  "dyslexia-mode",
  "high-contrast",
  "reduced-motion",
  "colorblind-protanopia",
  "colorblind-deuteranopia",
  "colorblind-tritanopia",
];

// Legacy classes we previously set on <html>. Removed here so they
// don't double-apply alongside the new <body> classes.
const LEGACY_HTML_CLASSES = [
  "theme-light",
  "compact-mode",
  "sidebar-right",
  "dyslexia",
  "high-contrast",
  "reduced-motion",
  "color-blind-protanopia",
  "color-blind-deuteranopia",
  "color-blind-tritanopia",
];

export default function SettingsApplier() {
  const { user } = useAuth();

  const { data: state } = useQuery({
    queryKey: ["userSettings", user?.id],
    queryFn: () => getUserSettings(user.id),
    enabled: !!user?.id,
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Clean slate.
    LEGACY_HTML_CLASSES.forEach((c) => root.classList.remove(c));
    BODY_CLASSES.forEach((c) => body.classList.remove(c));
    root.style.removeProperty("--app-font-scale");

    if (!state) return;

    const appearance = state.settings?.appearance || {};
    const a11y = state.settings?.accessibility || {};

    // Font size → multiplier of the base 16px root font. A value
    // less than 1 (compact mode) tightens the whole scale.
    const px = FONT_SIZE_PX[appearance.fontSize] || FONT_SIZE_PX.medium;
    const compactFactor = appearance.compactMode ? 0.94 : 1;
    root.style.setProperty("--app-font-scale", String((px / 16) * compactFactor));

    if (appearance.compactMode) body.classList.add("compact-mode");
    if (appearance.sidebarPosition === "right") body.classList.add("sidebar-right");

    if (a11y.displayMode === "light") body.classList.add("theme-light");
    if (a11y.dyslexia)                body.classList.add("dyslexia-mode");
    if (a11y.highContrast)            body.classList.add("high-contrast");
    if (a11y.reducedMotion)           body.classList.add("reduced-motion");
    if (a11y.colorBlindMode && a11y.colorBlindMode !== "off") {
      body.classList.add(`colorblind-${a11y.colorBlindMode}`);
    }
  }, [state]);

  return null;
}
