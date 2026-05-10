// useUserGamePacks — returns the ids of the game packs the current
// player owns. Today this is hard-wired to ['dnd5e'] for everyone;
// the picker auto-skips when the list has length 1, so the only
// runtime path that uses the picker is multi-pack — which doesn't
// happen yet, but the architecture is in place.
//
// When the entitlements layer ships (per-user purchases /
// subscriptions / homebrew unlock), swap the constant return for a
// per-user query against whatever table tracks ownership. The
// picker doesn't need to change.

const DEFAULT_OWNED = ["dnd5e"];

export function useUserGamePacks() {
  return DEFAULT_OWNED;
}
