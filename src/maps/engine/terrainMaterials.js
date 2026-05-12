/**
 * Registry of terrain materials. Keyed by material id so a Tile can
 * resolve its render-time properties from `tile.materialId`.
 *
 * The `color` field is a runtime-only extension to the TerrainMaterial
 * typedef in engine/types.js — we render flat solid colors today, but
 * a later phase will replace it with texture/sprite loading and the
 * extension will drop away.
 */

/** @type {Object<string, import("./types").TerrainMaterial & { color: string }>} */
export const TERRAIN_MATERIALS = {
  grass: {
    id: "grass",
    speedModifier: 1.0,
    footstepSound: "soft",
    concealment: "none",
    color: "#4a7c3f",
  },
  water: {
    id: "water",
    speedModifier: 0.5,
    footstepSound: "liquid",
    concealment: "none",
    color: "#2c5f7d",
  },
  dirt: {
    id: "dirt",
    speedModifier: 0.9,
    footstepSound: "soft",
    concealment: "none",
    color: "#6b5840",
  },
};

/**
 * Look up a material by id. Falls back to grass for unknown ids so a
 * stale scene with a removed material still renders something instead
 * of crashing the layer.
 * @param {string} id
 */
export function getMaterial(id) {
  return TERRAIN_MATERIALS[id] || TERRAIN_MATERIALS.grass;
}
