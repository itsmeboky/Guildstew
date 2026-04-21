/**
 * UI theme presets.
 *
 * Starting points the Theme Builder offers. Selecting one fills in
 * every color on the palette; the creator can then tweak any of
 * them.
 *
 * Color key naming mirrors the `--theme-<key>` CSS custom property
 * names so there's no translation layer between the creator, the
 * saved item, and the applied stylesheet.
 */
const BLANK = {
  pageBackground:   "#0f1219",
  cardBackground:   "#1a1f2e",
  cardBorder:       "#2a3441",
  primaryAccent:    "#37F2D1",
  secondaryAccent:  "#a855f7",
  textPrimary:      "#e2e8f0",
  textMuted:        "#94a3b8",
  navBackground:    "#f8a47c",
  homepageCards:    "#f8a47c",
  danger:           "#ef4444",
  success:          "#22c55e",
};

export const THEME_PRESETS = {
  default_dark: {
    label: "Default Dark",
    description: "The Guildstew stock look.",
    colors: { ...BLANK },
  },
  parchment_ink: {
    label: "Parchment & Ink",
    description: "Warm paper tones with inky contrast.",
    colors: {
      pageBackground:   "#f4ead5",
      cardBackground:   "#faf3e3",
      cardBorder:       "#c2a572",
      primaryAccent:    "#6b3f1d",
      secondaryAccent:  "#8b2e2e",
      textPrimary:      "#2a1d0f",
      textMuted:        "#6b5638",
      navBackground:    "#d9b97a",
      homepageCards:    "#e6c98a",
      danger:           "#8b2e2e",
      success:          "#3d6b2e",
    },
  },
  crimson_gold: {
    label: "Crimson & Gold",
    description: "Royal opulence — deep reds with gold accents.",
    colors: {
      pageBackground:   "#1a0808",
      cardBackground:   "#2a0f10",
      cardBorder:       "#7a2a2a",
      primaryAccent:    "#f5c94b",
      secondaryAccent:  "#c7354d",
      textPrimary:      "#f8e5b8",
      textMuted:        "#b38a5a",
      navBackground:    "#8b1a1a",
      homepageCards:    "#c7354d",
      danger:           "#ff5b5b",
      success:          "#b8d46b",
    },
  },
  forest: {
    label: "Forest",
    description: "Mossy greens and oak-shadow browns.",
    colors: {
      pageBackground:   "#0f1a14",
      cardBackground:   "#1a2a20",
      cardBorder:       "#3a5240",
      primaryAccent:    "#6ec56f",
      secondaryAccent:  "#b08a5c",
      textPrimary:      "#e6efe0",
      textMuted:        "#8ca492",
      navBackground:    "#3a5d3a",
      homepageCards:    "#6e8a4a",
      danger:           "#c75451",
      success:          "#6ec56f",
    },
  },
  ocean_deep: {
    label: "Ocean Deep",
    description: "Abyssal blues with bioluminescent accents.",
    colors: {
      pageBackground:   "#0a121c",
      cardBackground:   "#111a28",
      cardBorder:       "#1e3a52",
      primaryAccent:    "#37F2D1",
      secondaryAccent:  "#5e7bff",
      textPrimary:      "#d8e6f3",
      textMuted:        "#7a97b2",
      navBackground:    "#123656",
      homepageCards:    "#1e4d70",
      danger:           "#ff6b8f",
      success:          "#37F2D1",
    },
  },
  blank: {
    label: "Blank",
    description: "Start from scratch — pure black + white.",
    colors: {
      pageBackground:   "#000000",
      cardBackground:   "#111111",
      cardBorder:       "#333333",
      primaryAccent:    "#ffffff",
      secondaryAccent:  "#888888",
      textPrimary:      "#ffffff",
      textMuted:        "#cccccc",
      navBackground:    "#111111",
      homepageCards:    "#222222",
      danger:           "#ff4444",
      success:          "#44ff88",
    },
  },
};

// In builder display order. Key names match the --theme-<key>
// CSS variable names one-to-one.
export const THEME_COLOR_FIELDS = [
  { key: "pageBackground",   label: "Page Background" },
  { key: "cardBackground",   label: "Card Background" },
  { key: "cardBorder",       label: "Card Border" },
  { key: "primaryAccent",    label: "Primary Accent" },
  { key: "secondaryAccent",  label: "Secondary Accent" },
  { key: "textPrimary",      label: "Text Primary" },
  { key: "textMuted",        label: "Text Muted" },
  { key: "navBackground",    label: "Nav Background" },
  { key: "homepageCards",    label: "Homepage Cards" },
  { key: "danger",           label: "Danger / Error" },
  { key: "success",           label: "Success" },
];

export const DEFAULT_THEME = {
  type: "ui_theme",
  colors: { ...BLANK },
  fonts: { heading: "Cinzel", body: "Inter" },
  images: {
    navTexture: null,
    homepageBackground: null,
    contentCardBackground: null,
    campaignCardTexture: null,
    sidebarTexture: null,
    footerBackground: null,
  },
};
