// useUserGamePacks — returns the ids of the game packs the current
// player owns. While 2024 is still in coming_soon (full coverage
// not yet shipped) the only owned pack is dnd5e_2014. The picker
// auto-skips when the list has length 1.
//
// When 2024 flips to available (commit 5 of the 2024 character
// creator bundle) this list extends to ['dnd5e_2014', 'dnd5e_2024']
// and the picker becomes interactive again.
//
// When the entitlements layer ships (per-user purchases /
// subscriptions / homebrew unlock), swap the constant return for a
// per-user query against whatever table tracks ownership.

const DEFAULT_OWNED = ["dnd5e_2014"];

export function useUserGamePacks() {
  return DEFAULT_OWNED;
}
