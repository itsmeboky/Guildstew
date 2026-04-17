// ============================================================================
// AI Generation Client
// ============================================================================
// Calls the guildstew-api backend for AI-powered content generation.
// Drop this in src/api/aiClient.js in the main guildstew project.
// ============================================================================

const API_BASE = import.meta.env.VITE_AI_API_URL || 'https://guildstew-api.vercel.app';

async function aiRequest(endpoint, body) {
  const response = await fetch(`${API_BASE}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `AI request failed: ${response.status}`);
  }

  return response.json();
}

// ── Individual generators ──────────────────────────────────

/**
 * Generate a D&D 5e NPC
 * @param {Object} params
 * @param {string} [params.race] - Race (e.g., "Elf", "Dwarf")
 * @param {string} [params.class] - Class (e.g., "Fighter", "Wizard")
 * @param {number} [params.level] - Character level
 * @param {string} [params.alignment] - Alignment
 * @param {string} [params.gender] - Gender
 * @param {string} [params.setting] - World setting context
 * @param {string} [params.role] - Story role (e.g., "tavern keeper", "villain")
 * @param {string} [params.campaign_context] - GM's world description
 */
export async function generateNPC(params = {}) {
  const result = await aiRequest('generate-npc', params);
  return result.data;
}

/**
 * Generate a D&D 5e Monster
 * @param {Object} params
 * @param {string} [params.cr] - Challenge Rating
 * @param {string} [params.type] - Creature type
 * @param {string} [params.environment] - Environment
 * @param {string} [params.theme] - Theme/tone
 * @param {string} [params.name_hint] - Concept or name idea
 * @param {string} [params.campaign_context] - GM's world description
 */
export async function generateMonster(params = {}) {
  const result = await aiRequest('generate-monster', params);
  return result.data;
}

/**
 * Generate a D&D 5e Magic Item
 * @param {Object} params
 * @param {string} [params.type] - Item type
 * @param {string} [params.rarity] - Rarity
 * @param {string} [params.theme] - Theme
 * @param {string} [params.for_class] - Intended class
 * @param {boolean} [params.cursed] - Should it be cursed?
 * @param {string} [params.name_hint] - Concept or name idea
 * @param {string} [params.campaign_context] - GM's world description
 */
export async function generateItem(params = {}) {
  const result = await aiRequest('generate-item', params);
  return result.data;
}

/**
 * Generate a D&D 5e Spell
 * @param {Object} params
 * @param {number} [params.level] - Spell level (0 for cantrip)
 * @param {string} [params.school] - Spell school
 * @param {string[]} [params.classes] - Available classes
 * @param {string} [params.theme] - Theme
 * @param {string} [params.effect_type] - Effect type
 * @param {string} [params.name_hint] - Concept or name idea
 * @param {string} [params.campaign_context] - GM's world description
 */
export async function generateSpell(params = {}) {
  const result = await aiRequest('generate-spell', params);
  return result.data;
}

/**
 * Generate a fantasy image
 * @param {Object} params
 * @param {string} params.description - What to generate
 * @param {string} [params.subject_type] - "character", "monster", "item", "scene"
 * @param {string} [params.aspect_ratio] - "1:1", "16:9", "9:16"
 * @param {string} [params.style_override] - Custom style instructions
 * @param {string} [params.campaign_id] - Campaign for storage path
 */
export async function generateImage(params) {
  const result = await aiRequest('generate-image', params);
  return result.data;
}

// ── Quick Create (content + portrait in one call) ────────

/**
 * Generate content AND its portrait in one call
 * @param {Object} params
 * @param {string} params.type - "npc", "monster", "item"
 * @param {Object} params.params - Generation parameters
 * @param {boolean} [params.generate_image] - Also generate portrait? (default true)
 * @param {string} [params.campaign_id] - Campaign for storage
 * @param {string} [params.style_override] - Custom art style
 */
export async function quickCreate({ type, params = {}, generate_image = true, campaign_id, style_override }) {
  const result = await aiRequest('quick-create', {
    type,
    params,
    generate_image,
    campaign_id,
    style_override,
  });
  return {
    content: result.data,
    image: result.image,
  };
}

// ── Health check ─────────────────────────────────────────

export async function checkAPIHealth() {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}
