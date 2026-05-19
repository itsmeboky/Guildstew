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

// PF2e records nest one level deeper than D&D's flat shape: the
// creator's draft has a `data.system_data` sub-object holding
// portrait/token/allies/enemies, then the parent persists the entire
// draft as `character.system_data`. So the saved record's actual
// path to a PF2e portrait is `character.system_data.system_data.portrait_url`
// — checked here as a fallback after the flat one-level path.
export function getCharacterPortraitUrl(character) {
  if (!character) return null;
  return character.system_data?.portrait_url
    || character.system_data?.system_data?.portrait_url
    || character.portrait_url
    || character.profile_avatar_url
    || character.avatar_url
    || null;
}

export function getCharacterTokenUrl(character) {
  if (!character) return null;
  return character.system_data?.token_url
    || character.system_data?.system_data?.token_url
    || character.token_url
    || character.avatar_url
    || character.profile_avatar_url
    || null;
}
