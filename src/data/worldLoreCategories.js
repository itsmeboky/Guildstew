/**
 * Shared World Lore taxonomy used by Campaign World Lore + the
 * Quick Notes panel. Previously these lived inline in Layout.jsx.
 * Keeping them here means a single add / rename propagates to every
 * surface that reads them.
 */
export const WORLD_LORE_CATEGORIES = [
  { id: "cosmology",  title: "Cosmology & Origins" },
  { id: "geography",  title: "Geography & Regions" },
  { id: "cultures",   title: "Cultures & Peoples" },
  { id: "history",    title: "History & Timelines" },
  { id: "myth",       title: "Myth & Legend" },
  { id: "magic",      title: "Magic & Arcana" },
  { id: "technology", title: "Technology & Craft" },
  { id: "religions",  title: "Religions & Organizations" },
  { id: "monsters",   title: "Monster Compendium" },
  { id: "flora",      title: "Flora & Fauna" },
  { id: "artifacts",  title: "Artifacts & Relics" },
  { id: "political",  title: "Political Structure" },
  { id: "calendar",   title: "Calendar & Time" },
  { id: "misc",       title: "Guild Hall" },
];

export function worldLoreCategoryTitle(id) {
  const hit = WORLD_LORE_CATEGORIES.find((c) => c.id === id);
  return hit?.title || id;
}
