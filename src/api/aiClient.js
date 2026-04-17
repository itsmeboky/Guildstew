// ============================================================================
// AI Generation Client
// ============================================================================
// Calls the guildstew-api backend for AI-powered content generation.
// Located at src/api/aiClient.js in the main guildstew project.
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

// ── Quick Pick ───────────────────────────────────────────
// Player picks race, class, background.
// Returns 6 characters (2M, 2F, 2NB) with dating-profile bios.

/**
 * @param {Object} params
 * @param {string} params.race
 * @param {string} params.class
 * @param {string} params.background
 * @returns {Promise<{ characters: Array }>} 6 character options
 */
export async function quickPick({ race, class: charClass, background }) {
  const result = await aiRequest('generate-characters', {
    mode: 'quick_pick',
    race,
    class: charClass,
    background,
  });
  return result.data; // { characters: [...6 characters] }
}

// ── AI Generate ──────────────────────────────────────────
// Player writes a prompt. AI builds the entire character.
// Returns 1 complete character with everything chosen.

/**
 * @param {string} prompt - Freeform description of the character concept
 * @returns {Promise<Object>} Complete character sheet
 */
export async function aiGenerate(prompt) {
  const result = await aiRequest('generate-characters', {
    mode: 'ai_generate',
    prompt,
  });
  return result.data; // full character object
}

// ── Portrait Generation ──────────────────────────────────
// Generates a character portrait from a description.

/**
 * @param {Object} params
 * @param {string} params.description - What the character looks like
 * @param {string} [params.campaign_id] - For storage path
 * @param {string} [params.style_override] - Custom art style
 * @returns {Promise<{ image_url: string, prompt: string, stored: boolean }>}
 */
export async function generatePortrait({ description, campaign_id, style_override }) {
  const result = await aiRequest('generate-image', {
    subject_type: 'character',
    description,
    aspect_ratio: '1:1',
    campaign_id,
    style_override,
  });
  return result.data; // { image_url, prompt, stored }
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
