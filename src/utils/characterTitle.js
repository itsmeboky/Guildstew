/**
 * Formats a character's display name with their active Legend title
 * suffix. Used on combat portraits, initiative, and the Adventuring
 * Party panel. Falls back to the raw name when no title is set.
 */
export function formatCharacterName(character) {
  if (!character) return "";
  const name = character.name || "Unnamed";
  const title = character.active_title?.trim?.();
  if (!title) return name;
  return `${name} ${title}`;
}
