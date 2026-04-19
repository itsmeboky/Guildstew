/**
 * World Lore entry templates — Part 1: authoring config.
 *
 * Each template describes the structured fields the editor renders
 * into `entry.metadata`. `autoVisibility` (like the legacy
 * `forceVisibility`) pins the visibility selector when the template
 * requires it (Secret Document → GM only). `fields[]` drives the
 * template-specific section of the editor; the freeform rich-text
 * body on `entry.content` is opt-in per template via
 * `contentField: { label, placeholder }`.
 *
 * Field schema:
 *   { key, label, type, placeholder?, options?, help? }
 *
 * Types the editor renders today: text, textarea, select, image,
 * checkbox, tags (comma-separated list → string[]), number.
 *
 * `getTemplatesForCategory(categoryKey)` returns the category-specific
 * templates first followed by the global ones so the selector shows
 * what matters for the current category at the top.
 */

const TEMPLATE_SKETCH = {
  key: "sketch",
  label: "Sketch / Drawing",
  description: "Visual entry from the sketch pad.",
  imageField: { key: "sketch_url", label: "Sketch image", shape: "free" },
  captionField: { label: "Caption", placeholder: "Optional caption" },
  fields: [],
};

const GLOBAL_TEMPLATES = [
  {
    key: "freeform",
    label: "Freeform",
    description: "Blank rich text editor.",
    contentField: { label: "Content", placeholder: "Write whatever you want." },
    fields: [],
  },
  {
    key: "secret_document",
    label: "Secret Document",
    description: "GM-only classified content.",
    autoVisibility: "gm_only",
    contentField: { label: "Contents", placeholder: "The secret text." },
    fields: [
      { key: "classification", label: "Classification", type: "select",
        options: ["Confidential", "Secret", "Top Secret"] },
      { key: "who_knows", label: "Who Knows", type: "textarea",
        placeholder: "Which NPCs / factions are aware of this?" },
      { key: "how_to_discover", label: "How To Discover", type: "textarea",
        placeholder: "Clues that lead to this document." },
    ],
  },
  {
    key: "letter",
    label: "Letter / Message",
    description: "In-world correspondence.",
    contentField: { label: "Body", placeholder: "The letter's body." },
    fields: [
      { key: "from",      label: "From",      type: "text" },
      { key: "to",        label: "To",        type: "text" },
      { key: "date",      label: "Date (in-world)", type: "text" },
      { key: "signature", label: "Signature", type: "text" },
      { key: "sealed",    label: "Sealed (wax seal icon)", type: "checkbox" },
    ],
  },
  {
    key: "wanted_poster",
    label: "Wanted Poster",
    description: "Bounty notice with portrait.",
    contentField: { label: "Additional Notes", placeholder: "Optional narrative block." },
    fields: [
      { key: "portrait_url",  label: "Portrait (square, centered)", type: "image" },
      { key: "alias",         label: "Alias", type: "text" },
      { key: "dead_or_alive", label: "Dead or Alive", type: "select",
        options: ["Dead or Alive", "Alive Only", "Dead Only"] },
      { key: "crimes",        label: "Crimes", type: "textarea" },
      { key: "reward",        label: "Reward Amount", type: "text",
        placeholder: "e.g. 500 gp" },
      { key: "posted_by",     label: "Posted By", type: "text" },
    ],
  },
  TEMPLATE_SKETCH,
];

const REGIONS_TEMPLATES = [
  {
    key: "location",
    label: "Location",
    description: "Place with map, features, dangers.",
    contentField: { label: "Description",
      placeholder: "What is this place? Mood, scale, smell." },
    fields: [
      { key: "cover_url",           label: "Cover image (wide banner)", type: "image" },
      { key: "location_type",       label: "Location Type", type: "select",
        options: ["City", "Village", "Wilderness", "Dungeon", "Landmark", "Ruins", "Port", "Other"] },
      { key: "population",          label: "Population", type: "text" },
      { key: "climate",             label: "Climate", type: "text" },
      { key: "danger_level",        label: "Danger Level", type: "select",
        options: ["Safe", "Low", "Moderate", "High", "Deadly"] },
      { key: "notable_features",    label: "Notable Features", type: "textarea" },
      { key: "dangers",             label: "Dangers", type: "textarea" },
      { key: "connected_locations", label: "Connected Locations (comma-separated)", type: "text" },
    ],
  },
  {
    key: "landmark",
    label: "Landmark",
    description: "Notable point of interest.",
    contentField: { label: "Description" },
    fields: [
      { key: "image_url",    label: "Image (portrait orientation)", type: "image" },
      { key: "significance", label: "Significance", type: "textarea" },
    ],
  },
  {
    key: "map_note",
    label: "Map Note",
    description: "Quick annotation or warning.",
    contentField: { label: "Note", placeholder: "Keep it short — a single warning or hint." },
    fields: [],
  },
];

const POLITICAL_TEMPLATES = [
  {
    key: "faction_profile",
    label: "Faction Profile",
    description: "Organization dossier.",
    contentField: { label: "Description" },
    fields: [
      { key: "banner_url",      label: "Crest / Banner", type: "image" },
      { key: "alignment",       label: "Alignment", type: "select",
        options: [
          "Lawful Good", "Neutral Good", "Chaotic Good",
          "Lawful Neutral", "True Neutral", "Chaotic Neutral",
          "Lawful Evil", "Neutral Evil", "Chaotic Evil",
          "Unaligned",
        ] },
      { key: "leader",          label: "Leader Name", type: "text" },
      { key: "leader_portrait", label: "Leader Portrait (optional)", type: "image" },
      { key: "status",          label: "Status", type: "select",
        options: ["Active", "Disbanded", "Secret", "Rising"] },
      { key: "known_members",   label: "Known Members (one per line)", type: "textarea" },
      { key: "territory",       label: "Territory", type: "text" },
      { key: "goals",           label: "Goals", type: "textarea" },
    ],
  },
  {
    key: "political_decree",
    label: "Political Decree",
    description: "Official proclamation or law.",
    contentField: { label: "Decree text" },
    fields: [
      { key: "authority", label: "Authority / Issued By", type: "text" },
      { key: "date",      label: "Date (in-world)", type: "text" },
      { key: "seal",      label: "Seal description", type: "text" },
      { key: "penalties", label: "Penalties for violation", type: "textarea" },
    ],
  },
  {
    key: "treaty",
    label: "Treaty / Alliance",
    description: "Agreement between factions.",
    contentField: { label: "Terms" },
    fields: [
      { key: "party_1",       label: "Party 1 Name", type: "text" },
      { key: "party_1_crest", label: "Party 1 Crest", type: "image" },
      { key: "party_2",       label: "Party 2 Name", type: "text" },
      { key: "party_2_crest", label: "Party 2 Crest", type: "image" },
      { key: "status",        label: "Status", type: "select",
        options: ["Active", "Broken", "Pending", "Expired"] },
      { key: "date",          label: "Date signed", type: "text" },
    ],
  },
];

const RELIGIONS_TEMPLATES = [
  {
    key: "deity_profile",
    label: "Deity Profile",
    description: "God or divine entity.",
    contentField: { label: "Description" },
    fields: [
      { key: "image_url",    label: "Portrait / Icon", type: "image" },
      { key: "domains",      label: "Domains (comma-separated)", type: "tags" },
      { key: "alignment",    label: "Alignment", type: "select",
        options: [
          "Lawful Good", "Neutral Good", "Chaotic Good",
          "Lawful Neutral", "True Neutral", "Chaotic Neutral",
          "Lawful Evil", "Neutral Evil", "Chaotic Evil",
          "Unaligned",
        ] },
      { key: "commandments", label: "Commandments (one per line)", type: "textarea" },
      { key: "sects",        label: "Associated Sects (comma-separated)", type: "text" },
      { key: "symbols",      label: "Symbols", type: "text" },
    ],
  },
  {
    key: "prayer",
    label: "Prayer / Scripture",
    description: "Religious text.",
    contentField: { label: "Scripture text" },
    fields: [
      { key: "attribution", label: "Attribution", type: "text" },
      { key: "deity",       label: "Associated Deity", type: "text" },
    ],
  },
  {
    key: "holy_site",
    label: "Holy Site",
    description: "Temple, shrine, or sacred place.",
    contentField: { label: "Description" },
    fields: [
      { key: "cover_url",        label: "Cover image", type: "image" },
      { key: "deity",            label: "Associated Deity", type: "text" },
      { key: "significance",     label: "Religious Significance", type: "textarea" },
      { key: "pilgrimage_notes", label: "Pilgrimage Notes", type: "textarea" },
    ],
  },
];

const HISTORY_TEMPLATES = [
  {
    key: "historical_event",
    label: "Historical Event",
    description: "Dated event in the timeline.",
    contentField: { label: "Description" },
    fields: [
      { key: "date",         label: "Date / Year", type: "text" },
      { key: "era",          label: "Era", type: "text" },
      { key: "key_figures",  label: "Key Figures (comma-separated)", type: "tags" },
      { key: "consequences", label: "Consequences", type: "textarea" },
    ],
  },
  {
    key: "era_summary",
    label: "Era Summary",
    description: "Overview of an age or period.",
    contentField: { label: "Description" },
    fields: [
      { key: "start_date",      label: "Start Date", type: "text" },
      { key: "end_date",        label: "End Date", type: "text" },
      { key: "defining_events", label: "Defining Events", type: "textarea" },
      { key: "major_figures",   label: "Major Figures (comma-separated)", type: "text" },
    ],
  },
  {
    key: "battle_report",
    label: "Battle Report",
    description: "Military engagement record.",
    contentField: { label: "Description / Account" },
    fields: [
      { key: "location",     label: "Location", type: "text" },
      { key: "date",         label: "Date", type: "text" },
      { key: "force_1",      label: "Force 1", type: "text" },
      { key: "force_2",      label: "Force 2", type: "text" },
      { key: "outcome",      label: "Outcome", type: "text" },
      { key: "casualties",   label: "Casualties", type: "text" },
      { key: "significance", label: "Significance", type: "textarea" },
    ],
  },
];

// Shared field set for the three artifact-like templates — all carry
// the same baseline magic-item stat block.
const ARTIFACT_BASE_FIELDS = [
  { key: "image_url",      label: "Item image (portrait)", type: "image" },
  { key: "rarity",         label: "Rarity", type: "select",
    options: ["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact"] },
  { key: "item_type",      label: "Item Type",
    type: "text", placeholder: "Weapon, Armor, Wondrous Item, …" },
  { key: "attunement",     label: "Requires attunement", type: "checkbox" },
  { key: "properties",     label: "Properties", type: "textarea" },
  { key: "current_holder", label: "Current Holder", type: "text" },
  { key: "origin",         label: "Origin", type: "textarea" },
];

const ARTIFACTS_TEMPLATES = [
  {
    key: "artifact_card",
    label: "Artifact Card",
    description: "Magic item with stats and lore.",
    contentField: { label: "Description / Lore" },
    fields: [...ARTIFACT_BASE_FIELDS],
  },
  {
    key: "cursed_item",
    label: "Cursed Item",
    description: "Dangerous artifact with curse details.",
    contentField: { label: "Description / Lore" },
    fields: [
      ...ARTIFACT_BASE_FIELDS,
      { key: "curse_description", label: "Curse Description", type: "textarea" },
      { key: "remove_curse",      label: "How to Remove Curse", type: "textarea" },
    ],
  },
  {
    key: "lost_relic",
    label: "Lost Relic",
    description: "Missing artifact with clues.",
    contentField: { label: "Description / Lore" },
    fields: [
      ...ARTIFACT_BASE_FIELDS,
      { key: "last_location", label: "Last Known Location", type: "text" },
      { key: "clues",         label: "Clues (one per line)", type: "textarea" },
    ],
  },
];

export const ENTRY_TEMPLATES = {
  global: GLOBAL_TEMPLATES,
  regions: REGIONS_TEMPLATES,
  political: POLITICAL_TEMPLATES,
  religions: RELIGIONS_TEMPLATES,
  history: HISTORY_TEMPLATES,
  artifacts: ARTIFACTS_TEMPLATES,
};

// Flat lookup used by renderers that only have `entry.template_type`
// and need to resolve the template definition — every template key
// lands here.
const ALL_TEMPLATES = Object.values(ENTRY_TEMPLATES).flat();
const TEMPLATES_BY_KEY = new Map(ALL_TEMPLATES.map((t) => [t.key, t]));

/**
 * Category-specific templates first, then the global set. The
 * returned array drives the selector so GMs see what matters for the
 * current category at the top.
 */
export function getTemplatesForCategory(categoryKey) {
  const specific = ENTRY_TEMPLATES[categoryKey] || [];
  return [...specific, ...ENTRY_TEMPLATES.global];
}

export function templateByKey(key) {
  return TEMPLATES_BY_KEY.get(key) || ENTRY_TEMPLATES.global[0];
}
