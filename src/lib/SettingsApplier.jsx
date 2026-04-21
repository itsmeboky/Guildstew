import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { getUserSettings } from "@/lib/userSettings";
import { FONT_SIZE_PX } from "@/config/settingsDefaults";

/**
 * App-wide settings applier.
 *
 * Reads the logged-in user's settings blob and translates it into:
 *   - a `--app-font-scale` CSS variable on :root (drives compact-mode
 *     and font-size sliders),
 *   - class toggles on `<html>` — `theme-light`, `compact-mode`,
 *     `sidebar-right`, `dyslexia`, `high-contrast`, `reduced-motion`,
 *     `color-blind-<mode>`,
 *   - a one-time Google-Fonts OpenDyslexic <link> injection when the
 *     dyslexia toggle is on.
 *
 * Components react by targeting these classes / variables in their
 * own stylesheets — the actual CSS rules live in App.css. Anything
 * this applier doesn't set is left untouched so another theme layer
 * (Tavern UI theme) still owns those properties.
 *
 * Rendered invisibly from App.jsx.
 */

const CLASSES = [
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

const OPEN_DYSLEXIC_LINK_ID = "open-dyslexic-font";

export default function SettingsApplier() {
  const { user } = useAuth();

  const { data: state } = useQuery({
    queryKey: ["userSettings", user?.id],
    queryFn: () => getUserSettings(user.id),
    enabled: !!user?.id,
  });

  useEffect(() => {
    const root = document.documentElement;
    // Clean slate on every run so switching preferences doesn't
    // leave stale classes around.
    CLASSES.forEach((c) => root.classList.remove(c));
    root.style.removeProperty("--app-font-scale");

    const existingDyslexic = document.getElementById(OPEN_DYSLEXIC_LINK_ID);
    if (existingDyslexic) existingDyslexic.remove();

    if (!state) return;

    const appearance = state.settings?.appearance || {};
    const a11y = state.settings?.accessibility || {};

    // Font size → multiplier of the base 16px root font. A value
    // less than 1 (compact mode) tightens the whole scale.
    const px = FONT_SIZE_PX[appearance.fontSize] || FONT_SIZE_PX.medium;
    const compactFactor = appearance.compactMode ? 0.94 : 1;
    root.style.setProperty("--app-font-scale", String((px / 16) * compactFactor));

    if (appearance.compactMode) root.classList.add("compact-mode");
    if (appearance.sidebarPosition === "right") root.classList.add("sidebar-right");

    if (a11y.displayMode === "light") root.classList.add("theme-light");
    if (a11y.dyslexia) {
      root.classList.add("dyslexia");
      injectOpenDyslexic();
    }
    if (a11y.highContrast) root.classList.add("high-contrast");
    if (a11y.reducedMotion) root.classList.add("reduced-motion");
    if (a11y.colorBlindMode && a11y.colorBlindMode !== "off") {
      root.classList.add(`color-blind-${a11y.colorBlindMode}`);
    }
  }, [state]);

  return null;
}

function injectOpenDyslexic() {
  if (document.getElementById(OPEN_DYSLEXIC_LINK_ID)) return;
  const style = document.createElement("style");
  style.id = OPEN_DYSLEXIC_LINK_ID;
  style.textContent = `
    @font-face {
      font-family: 'OpenDyslexic';
      src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic-regular.otf') format('opentype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
}
