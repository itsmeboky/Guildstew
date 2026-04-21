/**
 * Default values for every user preference.
 *
 * The Settings page + `SettingsApplier` merge these with whatever the
 * user has persisted on `user_profiles.settings` + `notification_preferences`.
 * Keeping defaults in a single module means a brand-new user and a
 * cleared setting both render the same fallback.
 */

export const APPEARANCE_DEFAULTS = {
  fontSize: "medium",        // 'small' | 'medium' | 'large' | 'xlarge'
  sidebarPosition: "left",   // 'left' | 'right'
  compactMode: false,
};

export const ACCESSIBILITY_DEFAULTS = {
  displayMode: "dark",       // 'dark' | 'light'
  dyslexia: false,
  highContrast: false,
  colorBlindMode: "off",     // 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia'
  reducedMotion: false,
  screenReaderHints: false,
};

export const PRIVACY_DEFAULTS = {
  profileVisibility: "public",   // 'public' | 'friends' | 'private'
  showOnlineFriends: true,
  showOnlineEveryone: false,
};

export const LEGAL_DEFAULTS = {
  analyticsCookies: true,
  marketingCookies: false,
};

export const NOTIFICATION_DEFAULTS = {
  email: {
    friendRequests: true,
    forumReplies:   true,
    tavernSold:     true,
    guildActivity:  true,
    newsletter:     false,
  },
  inApp: {
    badgeDot: true,
    sound:    false,
  },
};

export const FONT_SIZE_PX = {
  small:  14,
  medium: 16,
  large:  18,
  xlarge: 20,
};

export function mergeSettings(stored = {}) {
  return {
    appearance:    { ...APPEARANCE_DEFAULTS,    ...(stored.appearance    || {}) },
    accessibility: { ...ACCESSIBILITY_DEFAULTS, ...(stored.accessibility || {}) },
    privacy:       { ...PRIVACY_DEFAULTS,       ...(stored.privacy       || {}) },
    legal:         { ...LEGAL_DEFAULTS,         ...(stored.legal         || {}) },
  };
}

export function mergeNotifications(stored = {}) {
  return {
    email: { ...NOTIFICATION_DEFAULTS.email, ...(stored.email || {}) },
    inApp: { ...NOTIFICATION_DEFAULTS.inApp, ...(stored.inApp || {}) },
  };
}
