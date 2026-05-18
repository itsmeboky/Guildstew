// useUserGamePacks — returns the ids of the game packs the current
// player owns. Both 5e editions ship by default; the picker shows
// them as separate cards so the player chooses which edition each
// character is built against.
//
// When the entitlements layer ships (per-user purchases /
// subscriptions / homebrew unlock), swap the constant return for a
// per-user query against whatever table tracks ownership.

const DEFAULT_OWNED = ["dnd5e_2014", "dnd5e_2024", "pathfinder_2e"];

export function useUserGamePacks() {
  return DEFAULT_OWNED;
}
