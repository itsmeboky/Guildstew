/**
 * Single source of truth for inspiration-source metadata. The two
 * existing inspiration types (DM-granted standard, Bardic from a
 * Bard) consume through different paths — standard rerolls with
 * advantage, bardic adds a bonus die to total — but they share a
 * pattern: each one identifies a flag on the combatant order entry
 * to clear, an event name to emit on consume, and attribution
 * metadata for the campaign log.
 *
 * Adding a third source (Inspiring Leader, Peace cleric Emboldening
 * Bond, etc.) plugs in by adding a case here. Future authors can
 * grep for `buildInspirationConsume` to find every source-aware
 * branch in one place instead of hunting through the dice window.
 *
 * The mutation logic for each source stays hand-coded in the dice
 * window (compare-and-keep d20s vs add-bonus-die-to-total — those
 * differ enough that wrapping them in a directive runner would just
 * add indirection). What's centralized is the metadata: which flag
 * to clear, which event to emit, what attribution to log.
 *
 * @param {'standard'|'bardic'} kind  inspiration source
 * @param {{ die?: string, fromName?: string }} [source]  per-source payload
 * @returns {{ consumeFlag: string, eventType: string, logCategory: string, attribution: object }|null}
 */
export function buildInspirationConsume(kind, source = {}) {
  switch (kind) {
    case 'standard':
      return {
        consumeFlag: 'hasInspiration',
        eventType: 'inspiration_used',
        logCategory: 'buff',
        attribution: {},
      };
    case 'bardic':
      return {
        consumeFlag: 'bardicInspiration',
        eventType: 'bardic_inspiration_used',
        logCategory: 'spell',
        attribution: {
          die: source?.die,
          fromName: source?.fromName,
        },
      };
    default:
      return null;
  }
}
