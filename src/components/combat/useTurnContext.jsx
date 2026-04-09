import React from "react";

/**
 * Shared combat turn context helper.
 *
 * @param {object} params
 * @param {object|null} params.campaign  The Campaign entity (must include combat_data)
 * @param {object|null} params.actor     The "local" actor (player's character or GM's creature)
 *
 * @returns {{
 *   order: any[],
 *   currentTurnIndex: number,
 *   active: any | null,
 *   isActorsTurn: boolean,
 *   actorIsGM: boolean,
 *   nextAllies: any[],
 *   nextEnemies: any[]
 * }}
 */
export function useTurnContext({ campaign, actor }) {
  const combatData = campaign?.combat_data;
  const order = combatData?.order || [];

  // Normalize current turn index
  let currentTurnIndex = combatData?.currentTurnIndex ?? 0;
  if (currentTurnIndex < 0 || currentTurnIndex >= order.length) {
    currentTurnIndex = 0;
  }

  const active = order[currentTurnIndex] || null;

  // Who is "GM side" vs "player side"
  const actorIsGM =
    actor?.type === "monster" || actor?.type === "npc";

  // Determine if it's this actor's turn
  const isActorsTurn = React.useMemo(() => {
    if (!actor || !active) return false;

    const activeId = active.id;
    const actorId = actor.id;
    const actorUserId = actor.user_id; 
    const uniqueId = actor.uniqueId; // monsters might have uniqueId

    const possibleIds = [
      actorId,
      uniqueId,
      actorUserId,
      actorUserId ? `player-${actorUserId}` : null,
    ].filter(Boolean);

    return possibleIds.includes(activeId);
  }, [actor, active]);

  // Build "up next" queues: allies vs enemies relative to actor's side
  const { nextAllies, nextEnemies } = React.useMemo(() => {
    const allies = [];
    const enemies = [];

    if (!order.length || active == null) {
      return { nextAllies: allies, nextEnemies: enemies };
    }

    for (let i = 1; i < order.length; i++) {
      const idx = (currentTurnIndex + i) % order.length;
      const c = order[idx];

      const isGMCombatant =
        c.type === "monster" || c.type === "npc";
      const isAlly = isGMCombatant === actorIsGM;

      // Avoid adding the actor themselves if they appear later (e.g. only 1 combatant)
      if (c.id === active.id && order.length === 1) continue; 

      if (isAlly) {
        if (allies.length < 4) allies.push(c);
      } else {
        if (enemies.length < 4) enemies.push(c);
      }
    }

    return { nextAllies: allies, nextEnemies: enemies };
  }, [order, currentTurnIndex, actorIsGM, active]);

  return {
    order,
    currentTurnIndex,
    active,
    isActorsTurn,
    actorIsGM,
    nextAllies,
    nextEnemies,
  };
}