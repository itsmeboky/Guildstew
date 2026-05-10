// useUserGamePacks — returns the ids of the game packs the current
// player owns. Today this is hard-wired to ['dnd5e_2014'] for
// everyone — the 2014 PHB pack ships as default. dnd5e_2024 is
// staged in the catalog as `coming_soon` and surfaces in the
// picker's upcoming section while Layer 4 fills out the 2024 data.
//
// Layer 4 commit 4 flips dnd5e_2024 to `available` and adds it to
// this list so users who own both editions get the picker
// rendering both as owned cards.
//
// When the entitlements layer ships (per-user purchases /
// subscriptions / homebrew unlock), swap the constant return for a
// per-user query against whatever table tracks ownership. The
// picker doesn't need to change.

const DEFAULT_OWNED = ["dnd5e_2014"];

export function useUserGamePacks() {
  return DEFAULT_OWNED;
}
