/**
 * Tier 3 §A — cursed item runtime helpers.
 *
 * The homebrew dialog persists a structured `curse` block on items;
 * combat / inventory / character-sheet code reads through these
 * helpers so the curse_type discriminator stays in one place.
 */

/**
 * @returns true when the item bears a curse with the cannot_unattune
 * flag set. Inventory UIs that expose an unattune button should disable
 * it (or route through Remove Curse) when this returns true.
 */
export function isUnattuneBlocked(item) {
  if (!item || typeof item !== "object") return false;
  const curse = item.curse || item.properties?.curse || null;
  if (!curse?.enabled) return false;
  return !!(curse.cannot_unattune || curse.curse_type === "cannot_unattune");
}

/**
 * @returns the dice + type to roll for recurring curse damage matching
 * a given trigger ("dawn" | "long_rest" | "short_rest" | "on_kill" |
 * "custom"), or null when the curse doesn't deal recurring damage at
 * that trigger.
 */
export function getRecurringCurseDamage(item, trigger) {
  if (!item || !trigger) return null;
  const curse = item.curse || item.properties?.curse || null;
  if (!curse?.enabled || curse.curse_type !== "recurring_damage") return null;
  if ((curse.recurring?.trigger || "dawn") !== trigger) return null;
  const dice = curse.recurring?.damage_dice;
  if (!dice) return null;
  return {
    damage_dice: dice,
    damage_type: curse.recurring.damage_type || "necrotic",
    description: curse.description || "",
  };
}

/**
 * @returns the structured stat-penalty payload, or null when the
 * curse isn't a stat penalty. Character-sheet stat calculations can
 * sum these across all attuned items.
 */
export function getCurseStatPenalty(item) {
  if (!item) return null;
  const curse = item.curse || item.properties?.curse || null;
  if (!curse?.enabled || curse.curse_type !== "stat_penalty") return null;
  return {
    ability: curse.stat_penalty?.ability || "WIS",
    amount: Number(curse.stat_penalty?.amount ?? 0),
  };
}

/**
 * @returns true when the curse should be revealed automatically given
 * an event ("on_attune" | "on_first_use"). The combat / inventory
 * layer triggers the appropriate event and uses this to decide
 * whether to surface the curse text to the player or just the GM.
 */
export function shouldRevealCurse(item, event) {
  const curse = item?.curse || item?.properties?.curse || null;
  if (!curse?.enabled) return false;
  return curse.reveal_trigger === event;
}

/**
 * @returns the structured forced-behavior payload, or null. Used by
 * the start-of-combat hook that nudges the GM to apply the behavior
 * (or roll a save if save_to_resist is set).
 */
export function getForcedBehavior(item) {
  const curse = item?.curse || item?.properties?.curse || null;
  if (!curse?.enabled || curse.curse_type !== "forced_behavior") return null;
  return {
    description: curse.forced_behavior?.description || "",
    save_to_resist: !!curse.forced_behavior?.save_to_resist,
    save_ability: curse.forced_behavior?.save_ability || "WIS",
    save_dc: Number(curse.forced_behavior?.save_dc) || 15,
  };
}

/**
 * @returns the ordered progressive stages, or [] for non-progressive
 * curses. The GM advances through these manually.
 */
export function getProgressiveStages(item) {
  const curse = item?.curse || item?.properties?.curse || null;
  if (!curse?.enabled || curse.curse_type !== "progressive") return [];
  return Array.isArray(curse.progressive?.stages) ? curse.progressive.stages : [];
}
