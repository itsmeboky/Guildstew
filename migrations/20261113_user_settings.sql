-- User-preferences + notification blob on user_profiles.
--
-- One JSONB column per domain keeps Settings tabs decoupled from
-- individual column migrations — adding a new preference doesn't
-- require a schema change. The SettingsApplier reads this on
-- login / page load and drives the app-wide CSS variable
-- environment from it.
--
-- Shape:
--   settings = {
--     appearance:    { fontSize, sidebarPosition, compactMode, … },
--     accessibility: { displayMode, dyslexia, highContrast,
--                       colorBlindMode, reducedMotion, screenReaderHints },
--     privacy:       { profileVisibility, showOnlineFriends,
--                       showOnlineEveryone },
--     legal:         { analyticsCookies, marketingCookies },
--   }
--
--   notification_preferences = {
--     email:  { friendRequests, forumReplies, tavernSold,
--               guildActivity, newsletter },
--     inApp:  { badgeDot, sound },
--   }

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';
