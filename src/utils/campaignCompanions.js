/**
 * Builds the unified companion list shown in the campaign panel's
 * Companions bar.
 *
 * Companions live in three shapes:
 *   1. Rows in the `companions` table       — added via the Party panel's
 *                                              CompanionTab after creation.
 *   2. `character.companions[]` JSONB array — written by the CharacterCreator's
 *                                              CompanionPicker.
 *   3. Legacy `character.companion_name`/   — mirrored by the picker for
 *      `companion_image` columns              backward compatibility, and the
 *                                              only source on pre-picker chars.
 *
 * The campaign panel needs to render all three without showing duplicates.
 * Rule: if a character has rows in shape 1, those win for that character.
 * Otherwise fall back to shape 2; otherwise shape 3.
 */
export function buildCampaignCompanions(companionRows, players) {
  const entries = [];
  const charactersWithTableRows = new Set();

  for (const row of companionRows || []) {
    if (!row || !row.name) continue;
    const player = (players || []).find((p) => p.character?.id === row.character_id);
    entries.push({
      key: `row-${row.id}`,
      source: "table",
      character_id: row.character_id,
      character_name: player?.character?.name || null,
      owner_user_id: player?.user_id || null,
      name: row.name,
      image_url: row.image_url || null,
      profile_color_1: player?.profile_color_1 || null,
      profile_color_2: player?.profile_color_2 || null,
      approval_status: row.approval_status || "approved",
    });
    if (row.character_id) charactersWithTableRows.add(row.character_id);
  }

  for (const player of players || []) {
    const char = player?.character;
    if (!char) continue;
    if (charactersWithTableRows.has(char.id)) continue;

    const arr = Array.isArray(char.companions) ? char.companions : [];
    const named = arr.filter((c) => c && c.name);
    if (named.length > 0) {
      named.forEach((c, i) =>
        entries.push({
          key: `creator-${char.id}-${i}`,
          source: "creator",
          character_id: char.id,
          character_name: char.name,
          owner_user_id: player.user_id,
          name: c.name,
          image_url: c.image || null,
          profile_color_1: player.profile_color_1 || null,
          profile_color_2: player.profile_color_2 || null,
          approval_status: c.needs_gm_approval ? "pending" : "approved",
        }),
      );
    } else if (char.companion_name) {
      entries.push({
        key: `legacy-${char.id}`,
        source: "legacy",
        character_id: char.id,
        character_name: char.name,
        owner_user_id: player.user_id,
        name: char.companion_name,
        image_url: char.companion_image || null,
        profile_color_1: player.profile_color_1 || null,
        profile_color_2: player.profile_color_2 || null,
        approval_status: "approved",
      });
    }
  }

  return entries;
}
