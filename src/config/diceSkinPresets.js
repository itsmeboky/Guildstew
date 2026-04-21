/**
 * Dice skin material presets.
 *
 * Quick-pick material recipes for the Dice Skin Creator. Picking one
 * writes `metalness` + `roughness` into the skin's file_data so the
 * material that the dice roller builds has the right look. The
 * creator can still drag the sliders afterward — if they do, the
 * preset selector falls back to "Custom".
 */
export const MATERIAL_PRESETS = {
  matte: {
    label: "Matte",
    metalness: 0.1,
    roughness: 0.8,
    description: "Flat, non-reflective finish like clay or wood.",
  },
  metallic: {
    label: "Metallic",
    metalness: 0.9,
    roughness: 0.2,
    description: "Shiny metal like steel or chrome.",
  },
  glass: {
    label: "Glass",
    metalness: 0.1,
    roughness: 0.05,
    description: "Smooth, translucent-looking finish.",
  },
  stone: {
    label: "Stone",
    metalness: 0.0,
    roughness: 0.9,
    description: "Rough, natural stone texture.",
  },
  bone: {
    label: "Bone",
    metalness: 0.05,
    roughness: 0.6,
    description: "Slightly glossy organic material.",
  },
  crystal: {
    label: "Crystal",
    metalness: 0.3,
    roughness: 0.1,
    description: "Gemstone-like with subtle reflections.",
  },
  iridescent: {
    label: "Iridescent",
    metalness: 0.7,
    roughness: 0.3,
    description: "Color-shifting metallic sheen. The default Guildstew style.",
  },
  obsidian: {
    label: "Obsidian",
    metalness: 0.5,
    roughness: 0.15,
    description: "Deep black volcanic glass.",
  },
};

export const MATERIAL_PRESET_LIST = Object.entries(MATERIAL_PRESETS).map(
  ([value, data]) => ({ value, ...data }),
);

/**
 * Match metalness + roughness back to a preset name. Used by the
 * creator's "Custom" indicator — if the sliders happen to land on a
 * preset's values, re-select that preset name.
 */
export function matchPreset(metalness, roughness, { epsilon = 0.02 } = {}) {
  const entries = Object.entries(MATERIAL_PRESETS);
  for (const [value, data] of entries) {
    if (
      Math.abs(data.metalness - metalness) < epsilon &&
      Math.abs(data.roughness - roughness) < epsilon
    ) {
      return value;
    }
  }
  return null;
}

/**
 * Default skin values — mirror of the dice roller's stock look so the
 * Creator starts from the same baseline players see out of the box.
 */
export const DEFAULT_DICE_SKIN = {
  type: "dice_skin",
  baseColor: "#1a0a2e",
  numberColor: "#37F2D1",
  edgeColor: null,

  metalness: MATERIAL_PRESETS.iridescent.metalness,
  roughness: MATERIAL_PRESETS.iridescent.roughness,
  materialPreset: "iridescent",

  primaryLight: "#37F2D1",
  secondaryLight: "#8B5CF6",

  glowEnabled: false,
  glowColor: "#37F2D1",

  customTextureUrl: null,

  critSuccessColor: "#FFD700",
  critFailColor: "#DC2626",
};
