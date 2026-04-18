/**
 * Templates the GM can pick from when creating a new World Lore
 * entry. Each template defines a set of named fields that land in
 * `entry.metadata` — the editor renders them as labelled inputs /
 * textareas and the viewer renders them as structured rows.
 *
 * Freeform is the default: no extra fields, only the rich-text
 * content area. The structured templates keep the same dark forum
 * card aesthetic — no novelty styling.
 */
export const TEMPLATE_TYPES = [
  {
    id: "freeform",
    label: "Freeform",
    description: "Blank rich-text entry — write whatever you want.",
    fields: [],
  },
  {
    id: "location",
    label: "Location",
    description: "Structured location — description, features, dangers, connections.",
    fields: [
      { key: "description",         label: "Description",          type: "textarea", placeholder: "What is this place? Mood, scale, smell." },
      { key: "notable_features",    label: "Notable Features",     type: "textarea", placeholder: "Landmarks, NPCs of interest, lore hooks." },
      { key: "dangers",             label: "Dangers",              type: "textarea", placeholder: "Monsters, hazards, restricted areas." },
      { key: "connected_locations", label: "Connected Locations",  type: "text",     placeholder: "Comma-separated" },
    ],
  },
  {
    id: "character_dossier",
    label: "Character Dossier",
    description: "NPC dossier — portrait, role, personality, quotes.",
    fields: [
      { key: "portrait_url",  label: "Portrait URL",  type: "image" },
      { key: "role",          label: "Role / Title",  type: "text",     placeholder: "e.g. Court Wizard, Thieves' Guild boss" },
      { key: "personality",   label: "Personality",   type: "textarea", placeholder: "Traits, ideals, bonds, flaws." },
      { key: "notable_quote", label: "Notable Quote", type: "textarea", placeholder: "\"A single line that captures them.\"" },
    ],
  },
  {
    id: "historical_event",
    label: "Historical Event",
    description: "For the timeline — date, description, key figures, consequences.",
    fields: [
      { key: "year",          label: "Year / Date",     type: "text",     placeholder: "e.g. 1124 DR, Third Age" },
      { key: "era",           label: "Era",             type: "text",     placeholder: "Optional era label" },
      { key: "key_figures",   label: "Key Figures",     type: "text",     placeholder: "Comma-separated names" },
      { key: "consequences",  label: "Consequences",    type: "textarea", placeholder: "What changed as a result?" },
    ],
  },
  {
    id: "secret_document",
    label: "Secret Document",
    description: "Hidden truth, discovery conditions, and who knows — forces GM Only visibility.",
    forceVisibility: "gm_only",
    fields: [
      { key: "contents",              label: "Contents",               type: "textarea", placeholder: "The secret itself." },
      { key: "who_knows",             label: "Who Knows",              type: "text",     placeholder: "Comma-separated characters / factions" },
      { key: "how_to_discover",       label: "How Players Discover",   type: "textarea", placeholder: "Triggers, clues, DCs." },
    ],
  },
  {
    id: "letter",
    label: "Letter / Message",
    description: "From / To / Date header above a message body.",
    fields: [
      { key: "from",          label: "From",              type: "text",     placeholder: "Sender name" },
      { key: "to",            label: "To",                type: "text",     placeholder: "Recipient name" },
      { key: "date",          label: "Date",              type: "text",     placeholder: "In-world date" },
      { key: "body",          label: "Message Body",      type: "textarea", placeholder: "The letter text." },
    ],
  },
  {
    id: "wanted_poster",
    label: "Wanted Poster",
    description: "Portrait, crimes, reward, posted by — good for bounties.",
    fields: [
      { key: "portrait_url",  label: "Portrait URL",  type: "image" },
      { key: "crimes",        label: "Crimes",        type: "textarea", placeholder: "What have they done?" },
      { key: "reward",        label: "Reward",        type: "text",     placeholder: "e.g. 500 gp, dead or alive" },
      { key: "posted_by",     label: "Posted By",     type: "text",     placeholder: "Authority issuing the bounty" },
    ],
  },
];

export function templateById(id) {
  return TEMPLATE_TYPES.find((t) => t.id === id) || TEMPLATE_TYPES[0];
}
