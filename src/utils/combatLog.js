/**
 * Combat log helper. Writes a CampaignLogEntry row tagged as a
 * `combat_log` type with optional metadata for filtering / replay.
 *
 * Note: the existing CampaignLog component already reads from the
 * `CampaignLogEntry` entity — not `Message` as the task brief
 * suggested. We piggyback on the same table so the new combat events
 * and the existing chat messages appear in a single scrolling feed
 * without schema changes.
 *
 * Fire-and-forget. Don't block the combat UI on the write — if the
 * network call fails we log the error and keep going so a flaky
 * database never stalls a turn.
 *
 * Metadata convention:
 *   { event, category, actor?, target?, roll?, ac?, damage?, ...extra }
 *
 *   `event`    — machine-readable event slug (e.g. "attack_hit")
 *   `category` — one of: attack, damage, heal, spell, condition,
 *                death_save, turn, round, initiative, rest, misc
 *                Used by the renderer to pick the left-border color.
 */
export async function logCombatEvent(campaignId, content, metadata = {}) {
  if (!campaignId || !content) return null;
  try {
    const { base44 } = await import("@/api/base44Client");
    return await base44.entities.CampaignLogEntry.create({
      campaign_id: campaignId,
      type: "combat_log",
      content,
      metadata,
      // System-generated entries — no user attribution.
      user_id: null,
      user_name: null,
      user_avatar: null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("combatLog write failed:", err);
    return null;
  }
}

/**
 * System-level notice (round dividers, combat start/end, rest
 * notifications). Rendered as a centered, de-emphasized banner
 * instead of a chat bubble.
 */
export async function logSystemEvent(campaignId, content, metadata = {}) {
  if (!campaignId || !content) return null;
  try {
    const { base44 } = await import("@/api/base44Client");
    return await base44.entities.CampaignLogEntry.create({
      campaign_id: campaignId,
      type: "system",
      content,
      metadata,
      user_id: null,
      user_name: null,
      user_avatar: null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("combatLog system write failed:", err);
    return null;
  }
}

/** Category → tailwind left-border class map used by the renderer. */
export const COMBAT_LOG_BORDER = {
  attack: "border-l-[#FF5722]",
  damage: "border-l-[#FF5722]",
  heal: "border-l-[#22c55e]",
  spell: "border-l-[#a855f7]",
  condition: "border-l-[#f59e0b]",
  death_save: "border-l-[#991b1b]",
  turn: "border-l-[#475569]",
  round: "border-l-[#475569]",
  initiative: "border-l-[#37F2D1]",
  rest: "border-l-[#22c55e]",
  misc: "border-l-[#64748b]",
};

/** Category → emoji glyph for the log line prefix. */
export const COMBAT_LOG_GLYPH = {
  attack: "⚔️",
  damage: "💥",
  heal: "💚",
  spell: "✨",
  condition: "🌀",
  death_save: "💀",
  turn: "⏱",
  round: "⏱",
  initiative: "🎲",
  rest: "🏕",
  misc: "•",
};
