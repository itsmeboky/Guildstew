/**
 * Single source of truth for the encounter-update shape per `data.type`
 * emitted from the dice window's onRoll callbacks.
 *
 * Both panels' onRoll handlers (CampaignPlayerPanel and GMPanel) used
 * to branch on data.type and build matching `updates` objects in
 * parallel. Adding event types or fields to one without the other
 * caused silent drift — the `state` passthrough hotfix had to land
 * twice in this session because the player-side branch was updated
 * first and the GM-side missed it. Consolidating into one helper
 * means future event types are added in one place and propagate to
 * both consumers automatically.
 *
 * Returns null when no matching branch — caller skips the write.
 *
 * @param {{ type: string, roll?: any, value?: number, detail?: any, state?: string|null }} data
 * @returns {object|null}
 */
export function buildEncounterUpdate(data) {
  switch (data?.type) {
    case 'attack_result':
      return { phase: 'attack_result', attackRoll: data.roll, state: data.state || null };
    case 'damage':
      return { phase: 'damage_result', damageRoll: { total: data.value, ...data.detail }, state: data.state || null };
    case 'rolling_attack':
      return { phase: 'rolling_attack', state: data.state || null };
    case 'rolling_damage':
      return { phase: 'rolling_damage', state: data.state || null };
    default:
      return null;
  }
}
