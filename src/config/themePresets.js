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
  bannerFadeColor:  "#ffffff",
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
      bannerFadeColor:  "#f4ead5",
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
      bannerFadeColor:  "#1a0808",
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
      bannerFadeColor:  "#0f1a14",
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
      bannerFadeColor:  "#0a121c",
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
      bannerFadeColor:  "#000000",
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
  { key: "success",          label: "Success" },
  {
    key: "bannerFadeColor",
    label: "Banner Fade Color",
    hint: "Color the homepage banner fades into. Default white matches the page background.",
  },
];

// Optional image overrides. Each slot names a single "opt-in" surface
// that a consuming component can pick up via `var(--theme-img-<key>)`.
// `defaultThumb` is a best-effort preview of what the built-in asset
// looks like today so a creator knows what they're replacing.
export const THEME_IMAGE_SLOTS = [
  {
    key: "navTexture",
    label: "Nav Bar Texture",
    hint: "Pattern / image behind the nav bar. Blank uses the Nav Background color.",
    defaultThumb: null,
  },
  {
    key: "homepageBackground",
    label: "Homepage Background",
    hint: "Panoramic landscape behind the homepage hero area.",
    defaultThumb: null,
  },
  {
    key: "contentCardBackground",
    label: "Content Card Background",
    hint: "Texture that renders on top of the Homepage Cards color on Newest / Top Selling / Blog tiles.",
    defaultThumb: null,
  },
  {
    key: "campaignCardTexture",
    label: "Campaign Card Texture",
    hint: "Subtle texture behind campaign cards.",
    defaultThumb: null,
  },
  {
    key: "sidebarTexture",
    label: "Sidebar Texture",
    hint: "Texture for sidebar panels.",
    defaultThumb: null,
  },
  {
    key: "footerBackground",
    label: "Footer Background",
    hint: "Footer background image.",
    defaultThumb: null,
  },
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
