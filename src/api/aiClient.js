import { supabase } from '@/api/supabaseClient';

/**
 * AI-assisted character generation hooks. Each function wraps a
 * Supabase Edge Function so the secret (OpenAI / replicate / etc.)
 * never reaches the browser.
 *
 * Edge Function names expected on the project:
 *   - quick-pick-characters      ({race, class, background}) →
 *       { characters: [...] }
 *   - ai-generate-character      ({prompt})                  →
 *       { character: {...} }
 *   - generate-character-portrait ({description, style?})    →
 *       { image_url }
 *
 * When an Edge Function isn't deployed yet the wrappers throw a
 * friendly error so the caller can surface a toast instead of a
 * raw stack trace.
 */

async function invokeEdge(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const msg = error.message || String(error);
    throw new Error(
      `AI service "${name}" unavailable${msg ? `: ${msg}` : ''}. ` +
      `Ask a GM to deploy the Edge Function.`,
    );
  }
  return data;
}

/**
 * Quick Pick — returns 6 candidate characters given a race + class +
 * background. The response shape:
 *   { characters: [{ name, gender, tagline, appearance, likes,
 *     dislikes, story_hook, ability_scores, alignment, ... }, …] }
 */
export async function quickPick({ race, class: klass, background, level = 1 } = {}) {
  if (!race || !klass || !background) {
    throw new Error('Pick a race, class, and background first.');
  }
  const data = await invokeEdge('quick-pick-characters', {
    race,
    class: klass,
    background,
    level,
    count: 6,
  });
  return data && Array.isArray(data.characters) ? data : { characters: [] };
}

/**
 * AI Generate — takes a freeform prompt and returns a fully built
 * character record with stats, spells, equipment, backstory, etc.
 */
export async function aiGenerate(prompt) {
  const text = (prompt || '').trim();
  if (!text) throw new Error('Describe your character first.');
  const data = await invokeEdge('ai-generate-character', { prompt: text });
  if (!data) throw new Error('The AI returned nothing. Try rephrasing.');
  // Some Edge Function revisions wrap the character under a key;
  // accept either shape so we don't break on a backend tweak.
  return data.character ? data.character : data;
}

/**
 * Portrait generation. Pass either a raw description or a specialized
 * `portrait_prompt` string. Returns { image_url }.
 */
export async function generatePortrait({ description, portrait_prompt, style, campaign_id } = {}) {
  const promptText = (portrait_prompt || description || '').trim();
  if (!promptText) throw new Error('No description provided for the portrait.');
  const data = await invokeEdge('generate-character-portrait', {
    description: promptText,
    style: style || 'fantasy portrait, centered bust, dramatic lighting',
    campaign_id: campaign_id || null,
  });
  if (!data?.image_url) throw new Error('Portrait generation returned no image.');
  return data;
}
