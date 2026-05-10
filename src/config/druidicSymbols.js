// Druidic symbol catalog. Shapes are rendered as inline SVG by the
// <DruidicSymbol> component using the primitive ops in
// src/config/druidicShapes.js — no static assets, no Supabase upload,
// no asset pipeline. The 30 entries below are pure metadata (id,
// name, category) consumed by the picker and the entry render.

export const DRUIDIC_SYMBOLS = [
  // Navigation & Territory
  { id: 'safe-path',             name: 'Safe Path',             category: 'Navigation' },
  { id: 'danger-path',           name: 'Dangerous Path',        category: 'Navigation' },
  { id: 'water-source',          name: 'Water Source',          category: 'Navigation' },
  { id: 'shelter-ahead',         name: 'Shelter Ahead',         category: 'Navigation' },
  { id: 'sacred-ground',         name: 'Sacred Ground',         category: 'Navigation' },
  { id: 'corrupted-land',        name: 'Corrupted Land',        category: 'Navigation' },
  { id: 'fey-crossing',          name: 'Fey Crossing',          category: 'Navigation' },
  { id: 'ley-line',              name: 'Ley Line',              category: 'Navigation' },
  { id: 'migration-route',       name: 'Migration Route',       category: 'Navigation' },
  { id: 'territorial-boundary',  name: 'Territorial Boundary',  category: 'Navigation' },

  // Warnings & Information
  { id: 'predator-territory',    name: 'Predator Territory',    category: 'Warnings' },
  { id: 'poisonous-plants',      name: 'Poisonous Plants',      category: 'Warnings' },
  { id: 'healing-herbs',         name: 'Healing Herbs',         category: 'Warnings' },
  { id: 'rare-ingredient',       name: 'Rare Ingredient',       category: 'Warnings' },
  { id: 'storm-coming',          name: 'Storm Coming',          category: 'Warnings' },
  { id: 'seasonal-danger',       name: 'Seasonal Danger',       category: 'Warnings' },
  { id: 'undead-presence',       name: 'Undead Presence',       category: 'Warnings' },
  { id: 'aberration-taint',      name: 'Aberration Taint',      category: 'Warnings' },
  { id: 'wildfire-risk',         name: 'Wildfire Risk',         category: 'Warnings' },
  { id: 'flood-zone',            name: 'Flood Zone',            category: 'Warnings' },

  // Social & Community
  { id: 'druid-circle-nearby',   name: 'Druid Circle Nearby',   category: 'Community' },
  { id: 'grove-meeting',         name: 'Grove Meeting',         category: 'Community' },
  { id: 'friendly-settlement',   name: 'Friendly Settlement',   category: 'Community' },
  { id: 'hostile-settlement',    name: 'Hostile Settlement',    category: 'Community' },
  { id: 'logging-threat',        name: 'Logging Threat',        category: 'Community' },
  { id: 'mining-threat',         name: 'Mining Threat',         category: 'Community' },
  { id: 'ally-creature',         name: 'Ally Creature',         category: 'Community' },
  { id: 'beast-companion',       name: 'Beast Companion',       category: 'Community' },
  { id: 'ritual-site',           name: 'Ritual Site',           category: 'Community' },
  { id: 'ancient-tree',          name: 'Ancient Tree',          category: 'Community' },
];

export const DRUIDIC_CATEGORIES = [...new Set(DRUIDIC_SYMBOLS.map((s) => s.category))];

export const DRUIDIC_COLOR_PRESETS = [
  { id: 'emerald', value: '#10b981' },
  { id: 'forest',  value: '#166534' },
  { id: 'moss',    value: '#65a30d' },
  { id: 'bark',    value: '#78350f' },
  { id: 'dusk',    value: '#9333ea' },
  { id: 'sky',     value: '#0ea5e9' },
  { id: 'amber',   value: '#d97706' },
  { id: 'white',   value: '#f8fafc' },
];

export const DRUIDIC_DEFAULT_COLOR = '#10b981';
