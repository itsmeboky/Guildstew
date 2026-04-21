/**
 * UI theme presets.
 *
 * Starting points the Theme Builder offers. Selecting one fills in
 * every color on the palette; the creator can then tweak any of
 * them. The shape matches what `applyTheme` reads off of the saved
 * tavern_item's file_data.
 */
const BLANK = {
  background:    "#0f1219",
  card:          "#1a1f2e",
  cardBorder:    "#2a3441",
  primary:       "#37F2D1",
  secondary:     "#a855f7",
  text:          "#e2e8f0",
  textMuted:     "#94a3b8",
  navBackground: "#f8a47c",
  danger:        "#ef4444",
  success:       "#22c55e",
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
      background:    "#f4ead5",
      card:          "#faf3e3",
      cardBorder:    "#c2a572",
      primary:       "#6b3f1d",
      secondary:     "#8b2e2e",
      text:          "#2a1d0f",
      textMuted:     "#6b5638",
      navBackground: "#d9b97a",
      danger:        "#8b2e2e",
      success:       "#3d6b2e",
    },
  },
  crimson_gold: {
    label: "Crimson & Gold",
    description: "Royal opulence — deep reds with gold accents.",
    colors: {
      background:    "#1a0808",
      card:          "#2a0f10",
      cardBorder:    "#7a2a2a",
      primary:       "#f5c94b",
      secondary:     "#c7354d",
      text:          "#f8e5b8",
      textMuted:     "#b38a5a",
      navBackground: "#8b1a1a",
      danger:        "#ff5b5b",
      success:       "#b8d46b",
    },
  },
  forest: {
    label: "Forest",
    description: "Mossy greens and oak-shadow browns.",
    colors: {
      background:    "#0f1a14",
      card:          "#1a2a20",
      cardBorder:    "#3a5240",
      primary:       "#6ec56f",
      secondary:     "#b08a5c",
      text:          "#e6efe0",
      textMuted:     "#8ca492",
      navBackground: "#3a5d3a",
      danger:        "#c75451",
      success:       "#6ec56f",
    },
  },
  ocean_deep: {
    label: "Ocean Deep",
    description: "Abyssal blues with bioluminescent accents.",
    colors: {
      background:    "#0a121c",
      card:          "#111a28",
      cardBorder:    "#1e3a52",
      primary:       "#37F2D1",
      secondary:     "#5e7bff",
      text:          "#d8e6f3",
      textMuted:     "#7a97b2",
      navBackground: "#123656",
      danger:        "#ff6b8f",
      success:       "#37F2D1",
    },
  },
  blank: {
    label: "Blank",
    description: "Reset to the default colors — start from scratch.",
    colors: { ...BLANK },
  },
};

export const THEME_COLOR_FIELDS = [
  { key: "background",    label: "Page Background" },
  { key: "card",          label: "Card Background" },
  { key: "cardBorder",    label: "Card Border" },
  { key: "primary",       label: "Primary Accent" },
  { key: "secondary",     label: "Secondary Accent" },
  { key: "text",          label: "Text Primary" },
  { key: "textMuted",     label: "Text Muted" },
  { key: "navBackground", label: "Nav Background" },
  { key: "danger",        label: "Danger / Error" },
  { key: "success",       label: "Success" },
];

export const DEFAULT_THEME = {
  type: "ui_theme",
  colors: { ...BLANK },
  fonts: { heading: "Cinzel", body: "Inter" },
};
