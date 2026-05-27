// Unified portrait/token URL accessors. PF2e characters created via
// the Phase 1 wizard write to `system_data.portrait_url` and
// `system_data.token_url`; older D&D 5e records use top-level
// columns (`portrait_url`, `avatar_url`, `profile_avatar_url`).
//
// These helpers paper over the split so library/sidebar/card code
// doesn't have to know which game pack the record came from. Once
// every creator writes to `system_data`, the legacy fallbacks can
// retire after a one-time migration — until then they're invisible
// glue.
//
// D&D 5e legacy field meanings (set in IdentityStep.jsx):
//   avatar_url         = the full-body PORTRAIT (PortraitPanel)
//   profile_avatar_url = the small headshot used as a TOKEN (ProfilePanel)
// The fallback ordering below preserves that mapping — earlier
// versions had them swapped, which caused the library left sidebar
// to display the big portrait in a 1:1 square slot and the right
// detail panel to display the small headshot, with the two roles
// inverted on every D&D 5e character that lacked an explicit
// system_data.{portrait,token}_url.
export function getCharacterPortraitUrl(character) {
  if (!character) return null;
  return character.system_data?.portrait_url
    || character.portrait_url
    || character.avatar_url
    || character.profile_avatar_url
    || null;
}

export function getCharacterTokenUrl(character) {
  if (!character) return null;
  return character.system_data?.token_url
    || character.token_url
    || character.profile_avatar_url
    || character.avatar_url
    || null;
}
