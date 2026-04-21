/**
 * Canonical Supabase paths for the shared dice assets.
 *
 * The GLB shapes, the default texture (wrapped across all die types),
 * and the template texture artists paint over all live in the
 * `campaign-assets` bucket. Kept in one module so the DiceRoller,
 * DiceSkinPreview, and DiceSkinCreator agree on which URLs are
 * canonical.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ktdxhsstrgwciqkvprph.supabase.co";

export const DEFAULT_MODEL_URLS = {
  d4:  `${SUPABASE_URL}/storage/v1/object/public/campaign-assets/dice/models/d4.glb`,
  d6:  `${SUPABASE_URL}/storage/v1/object/public/campaign-assets/dice/models/d6.glb`,
  d8:  `${SUPABASE_URL}/storage/v1/object/public/campaign-assets/dice/models/d8.glb`,
  d10: `${SUPABASE_URL}/storage/v1/object/public/campaign-assets/dice/models/d10.glb`,
  d12: `${SUPABASE_URL}/storage/v1/object/public/campaign-assets/dice/models/d12.glb`,
  d20: `${SUPABASE_URL}/storage/v1/object/public/campaign-assets/dice/models/d20.glb`,
};

// Shared default texture — one PNG wraps every die shape.
export const DEFAULT_TEXTURE_URL =
  `${SUPABASE_URL}/storage/v1/object/public/campaign-assets/dice/textures/default/guildstewdice.png`;

// Template painters download and paint over.
export const TEMPLATE_TEXTURE_URL =
  `${SUPABASE_URL}/storage/v1/object/public/campaign-assets/dice/textures/templates/templatedicetexture.png`;

export const DICE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20"];
