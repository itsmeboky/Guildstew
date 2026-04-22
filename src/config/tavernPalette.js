/**
 * Tavern visual palette — warm cream + orange.
 *
 * Mirrors the Forums creamsicle palette but tuned for a commerce
 * surface. Exported as a single object so every Tavern subcomponent
 * (cards, dialogs, featured rows) reads from one source of truth.
 */
export const TAVERN_PALETTE = {
  pageBg:       "#FFF8F3",   // warm cream
  card:         "#FFFFFF",
  cardBorder:   "#F0D5C0",   // warm peach
  accent:       "#f8a47c",   // salmon/orange CTA
  accentDeep:   "#D85A30",   // hover / pressed
  accentSoft:   "#f5c4a1",   // gradient pair
  textPrimary:  "#2D1B0E",   // warm brown
  textSecondary:"#8B6F5C",
  // Badges — kept for official vs featured contrast against the
  // warm palette.
  devBadge:     "#37F2D1",   // Guildstew teal (rare visual note)
  officialBg:   "#ea580c",
  featuredBg:   "#f5c94b",
};

export const TAVERN_HEADER_GRADIENT =
  `linear-gradient(135deg, ${TAVERN_PALETTE.accent} 0%, ${TAVERN_PALETTE.accentSoft} 100%)`;
