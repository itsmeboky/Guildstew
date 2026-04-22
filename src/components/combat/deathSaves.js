/**
 * Death-save helpers — one source of truth for the state shape and
 * the D&D 5e roll resolution rules.
 *
 * State shape written into `combat_data.order[i].deathSaves`:
 *   { successes: 0-3, failures: 0-3, stabilized: boolean, dead: boolean }
 *
 * When a combatant drops below 1 HP:
 *   - order[i].downed = true
 *   - order[i].hit_points.current = 0
 *   - order[i].deathSaves = blankDeathSaves()
 *
 * On each death saving throw:
 *   - d20 === 20  → revive to 1 HP; state resets (downed=false, saves cleared)
 *   - d20 === 1   → +2 failures
 *   - d20 >= 10   → +1 success
 *   - d20 < 10    → +1 failure
 *   - 3 successes → stabilized = true (unconscious but no longer dying)
 *   - 3 failures  → dead = true
 *
 * Damage while already at 0 HP:
 *   - regular hit → +1 failure
 *   - critical    → +2 failures
 *
 * Healing while downed clears the whole state and sets current HP to
 * the healed amount.
 */

export function blankDeathSaves() {
  return { successes: 0, failures: 0, stabilized: false, dead: false };
}

export function isDying(entry) {
  if (!entry?.downed) return false;
  const saves = entry.deathSaves;
  if (!saves) return true;
  return !saves.dead && !saves.stabilized;
}

/**
 * Clamp a freshly-built saves object and auto-promote to stabilized /
 * dead at the thresholds. Always returns a new object — never mutates.
 */
export function normalizeDeathSaves(saves) {
  const s = Math.max(0, Math.min(3, Number(saves?.successes) || 0));
  const f = Math.max(0, Math.min(3, Number(saves?.failures) || 0));
  return {
    successes: s,
    failures: f,
    stabilized: !!saves?.stabilized || (s >= 3 && f < 3),
    dead: !!saves?.dead || f >= 3,
  };
}

/**
 * Apply a d20 roll to the existing saves object. Returns:
 *   - next:       the new saves object (already clamped + promoted)
 *   - outcome:    'nat20' | 'nat1' | 'success' | 'failure'
 *   - reviveToHp: number — if non-null, set the combatant's current HP
 *                 to this value and clear the downed flag
 */
export function applyDeathSaveRoll(existing, d20) {
  const base = existing || blankDeathSaves();
  if (d20 === 20) {
    return {
      next: blankDeathSaves(),
      outcome: "nat20",
      reviveToHp: 1,
    };
  }
  if (d20 === 1) {
    return {
      next: normalizeDeathSaves({ ...base, failures: base.failures + 2 }),
      outcome: "nat1",
      reviveToHp: null,
    };
  }
  if (d20 >= 10) {
    return {
      next: normalizeDeathSaves({ ...base, successes: base.successes + 1 }),
      outcome: "success",
      reviveToHp: null,
    };
  }
  return {
    next: normalizeDeathSaves({ ...base, failures: base.failures + 1 }),
    outcome: "failure",
    reviveToHp: null,
  };
}

/**
 * Apply damage while downed. Crits count as two failures.
 */
export function applyDownedDamage(existing, { critical = false } = {}) {
  const base = existing || blankDeathSaves();
  const add = critical ? 2 : 1;
  return normalizeDeathSaves({ ...base, failures: base.failures + add });
}
