-- Active cosmetics pointer on the user profile. One JSONB column holds
-- the IDs of whichever Tavern items the user currently has applied,
-- keyed by slot. Only a single item per slot can be active at a time.
--
-- Shape:
--   {
--     theme_id:          "uuid",  -- ui_theme
--     dice_skin_id:      "uuid",
--     cursor_set_id:     "uuid",
--     profile_banner_id: "uuid",
--     sound_pack_id:     "uuid",
--     animation_id:      "uuid",
--     portrait_id:       "uuid"   -- optional: currently-selected portrait
--   }
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS active_cosmetics JSONB DEFAULT '{}';
